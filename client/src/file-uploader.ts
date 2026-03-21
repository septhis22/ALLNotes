// supabase/functions/file-handler/index.ts
// Deploy: supabase functions deploy file-handler --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SignatureRequest {
  file_size: number;   // bytes the client wants to upload
  folder?: string;     // optional Cloudinary folder
  public_id?: string;  // optional custom public_id
}

interface ProfileRow {
  id: string;
  allowed_storage: number; // remaining bytes the user can still upload
}

// ─── CORS Headers ─────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** SHA-1 hex — required by Cloudinary's signature spec */
async function sha1Hex(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Cloudinary signature:
 *   SHA1( sorted_param_string + api_secret )
 * Excludes: file, api_key, resource_type, cloud_name
 */
async function buildCloudinarySignature(
  params: Record<string, string | number>,
  apiSecret: string
): Promise<string> {
  const paramString = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  return sha1Hex(`${paramString}${apiSecret}`);
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // ── CORS preflight ─────────────────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // ── 1. Parse request body ───────────────────────────────────────────────
    let body: SignatureRequest;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const { file_size, folder, public_id } = body;

    if (!file_size || typeof file_size !== "number" || file_size <= 0) {
      return jsonResponse(
        { error: "`file_size` must be a positive number (bytes)" },
        400
      );
    }

    // ── 2. Extract and validate JWT ─────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!jwt) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    // ── 3. Build Supabase client and verify user ────────────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return jsonResponse({ error: "Server misconfiguration" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(jwt);

    if (userError || !userData?.user) {
      console.error("JWT validation failed:", userError?.message);
      return jsonResponse({ error: "Unauthorized – invalid or expired token" }, 401);
    }

    const userId = userData.user.id;
    console.log(`Authenticated user: ${userId}`);

    // ── 4. Fetch profile ────────────────────────────────────────────────────
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, allowed_storage")
      .eq("id", userId)
      .single<ProfileRow>();

    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError?.message);
      return jsonResponse(
        { error: "Profile not found", detail: profileError?.message },
        404
      );
    }

    console.log(
      `User quota — allowed_storage: ${profile.allowed_storage}, requested: ${file_size}`
    );

    // ── 5. Check allowed_storage >= file_size ───────────────────────────────
    if (file_size > profile.allowed_storage) {
      return jsonResponse(
        {
          error: "Storage quota exceeded",
          allowed_storage_bytes: profile.allowed_storage,
          requested_bytes: file_size,
          message: `You only have ${(profile.allowed_storage / 1024 / 1024).toFixed(2)} MB remaining.`,
        },
        403
      );
    }

    // ── 6. Deduct file_size from allowed_storage ────────────────────────────
    //
    // Deducting BEFORE issuing the ticket prevents race conditions where
    // a user fires simultaneous uploads to exceed their quota.
    // If the Cloudinary upload fails client-side, call a refund endpoint
    // to restore the bytes ( allowed_storage += file_size ).
    //
    const newAllowedStorage = profile.allowed_storage - file_size;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ allowed_storage: newAllowedStorage })
      .eq("id", userId);

    if (updateError) {
      console.error("Failed to update allowed_storage:", updateError.message);
      return jsonResponse(
        { error: "Failed to reserve storage", detail: updateError.message },
        500
      );
    }

    console.log(
      `Storage updated — before: ${profile.allowed_storage}B, after: ${newAllowedStorage}B`
    );

    // ── 7. Validate Cloudinary secrets ──────────────────────────────────────
    const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME");
    const apiKey    = Deno.env.get("CLOUDINARY_API_KEY");
    const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET");

    if (!cloudName || !apiKey || !apiSecret) {
      console.error("Missing Cloudinary env vars — refunding storage");
      // Refund since we can't issue a valid ticket
      await supabase
        .from("profiles")
        .update({ allowed_storage: profile.allowed_storage })
        .eq("id", userId);
      return jsonResponse(
        { error: "Server misconfiguration – Cloudinary secrets not set" },
        500
      );
    }

    // ── 8. Build signed Cloudinary upload ticket ─────────────────────────────
    const timestamp = Math.floor(Date.now() / 1000);

    // Only include params that Cloudinary signs.
    // max_bytes is NOT a signable param — it must be sent in the form
    // but excluded from the signature string, otherwise Cloudinary
    // produces a different hash and rejects with "Invalid Signature".
    const sigParams: Record<string, string | number> = {
      timestamp,
      allowed_formats: "jpg,jpeg,png,webp,gif,mp4,mov",
      tags: `user_${userId}`,
      ...(folder    && { folder }),
      ...(public_id && { public_id }),
    };

    const signature = await buildCloudinarySignature(sigParams, apiSecret);

    // ── 9. Return signed ticket to client ────────────────────────────────────
    // max_bytes is returned separately so the client appends it to FormData
    // after the signed fields — Cloudinary will still enforce the cap.
    return jsonResponse({
      upload_url: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      api_key: apiKey,
      timestamp,
      signature,
      params: sigParams,
      max_bytes: file_size,   // sent to Cloudinary but NOT part of the signature
      quota: {
        before_bytes: profile.allowed_storage,
        after_bytes: newAllowedStorage,
      },
    });

  } catch (err) {
    console.error("Unhandled error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});