// src/lib/uploadFile.ts

import { getSupabase } from "../lib/supabase";

interface UploadOptions {
  folder?: string;
  public_id?: string;
}

interface CloudinaryTicket {
  upload_url: string;
  api_key: string;
  timestamp: number;
  signature: string;
  params: Record<string, string | number>;
  max_bytes: number;  // not signed — appended separately to FormData
  quota: {
    before_bytes: number;
    after_bytes: number;
  };
}

const EDGE_FUNCTION_URL =
  "https://aybmxfhcfyulttbvhive.supabase.co/functions/v1/file-handler";

export async function uploadFileToCloudinary(
  file: File,
  options?: UploadOptions
): Promise<string> {
  // ── 1. Get a fresh, validated session ──────────────────────────────────────
  //
  // getSession() can return a cached/stale token from localStorage.
  // We call getUser() first to force-refresh, then grab the session.
  //
  const supabase = getSupabase();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    throw new Error("You must be logged in to upload files.");
  }

  // After getUser() the session is guaranteed to be fresh
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Could not retrieve access token. Please log in again.");
  }

  // ── 2. Request a signed upload ticket from the edge function ───────────────
  let ticket: CloudinaryTicket;

  try {
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        file_size: file.size,
        folder: options?.folder,
        public_id: options?.public_id,
      }),
    });

    // Always read the body as text first so we can log it on failure
    const rawBody = await res.text();

    if (!res.ok) {
      console.error(`[file-handler] ${res.status}:`, rawBody);

      let parsed: { error?: string } = {};
      try { parsed = JSON.parse(rawBody); } catch { /* not JSON */ }

      const friendly: Record<number, string> = {
        401: "Session expired – please log out and log in again.",
        403: "Upload rejected – your storage quota is full.",
        404: "Your profile was not found. Contact support.",
        500: "Server error – Cloudinary secrets may not be configured.",
      };

      throw new Error(
        friendly[res.status] ?? parsed.error ?? `Unexpected error (${res.status})`
      );
    }

    ticket = JSON.parse(rawBody) as CloudinaryTicket;
  } catch (err) {
    // Re-throw with context if it isn't already our custom error
    if (err instanceof Error) throw err;
    throw new Error("Network error while requesting upload ticket.");
  }

  // ── 3. Upload directly to Cloudinary using the signed ticket ───────────────
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", ticket.api_key);
  formData.append("timestamp", String(ticket.timestamp));
  formData.append("signature", ticket.signature);

  // Attach every signed param (skip timestamp — already appended above)
  for (const [key, value] of Object.entries(ticket.params)) {
    if (key !== "timestamp") {
      formData.append(key, String(value));
    }
  }

  // max_bytes is NOT part of the signature but Cloudinary still enforces it.
  // Must be appended AFTER all signed fields.
  if (ticket.max_bytes) {
    formData.append("max_bytes", String(ticket.max_bytes));
  }

  const cloudinaryRes = await fetch(ticket.upload_url, {
    method: "POST",
    body: formData,
  });

  if (!cloudinaryRes.ok) {
    const errData = await cloudinaryRes.json().catch(() => ({}));
    console.error("[Cloudinary] Upload failed:", errData);
    throw new Error(
      errData?.error?.message ?? `Cloudinary upload failed (${cloudinaryRes.status})`
    );
  }

  const cloudinaryData = await cloudinaryRes.json();

  // ── 4. Return the secure CDN URL ───────────────────────────────────────────
  return cloudinaryData.secure_url as string;
}