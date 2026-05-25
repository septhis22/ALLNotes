// src/utils/collabUtils/sharedImageUpload.ts

import { getSupabase } from "../../lib/supabase";

const SHARED_UPLOAD_URL =
  "https://aybmxfhcfyulttbvhive.supabase.co/functions/v1/shared-image-upload";

interface SharedUploadOptions {
  /** Optional folder path. Defaults to `shared-notes/<note_id>` on the server. */
  folder?: string;
  /** Optional custom Cloudinary public_id. */
  public_id?: string;
}

interface SharedUploadResponse {
  upload_url: string;
  api_key: string;
  timestamp: number;
  signature: string;
  params: Record<string, string | number>;
  max_bytes: number;
  notification_url: string;
  quota: {
    allowed_storage_bytes: number;
  };
}

/**
 * Uploads an image to Cloudinary via the shared-image-upload edge function.
 *
 * Flow:
 *   1. Obtain a fresh Supabase session token.
 *   2. POST to the edge function with `note_id`, `file_size`, and optional
 *      `folder` / `public_id`. The edge function returns a signed upload ticket.
 *   3. Upload the file directly to Cloudinary using the signed ticket.
 *   4. Return the Cloudinary `secure_url`.
 *
 * @param file     - The File object to upload.
 * @param noteId   - UUID of the shared note this image belongs to.
 * @param options  - Optional folder and public_id overrides.
 * @returns The Cloudinary secure URL of the uploaded image.
 */
export async function uploadSharedImage(
  file: File,
  noteId: string,
  options?: SharedUploadOptions
): Promise<string> {
  // ── 1. Get a fresh, validated session ────────────────────────────────────
  const supabase = getSupabase();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    throw new Error("You must be logged in to upload files.");
  }
  const userId = userData.user.id;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Could not retrieve access token. Please log in again.");
  }

  // ── 2. Request a signed upload ticket from the edge function ─────────────
  let ticket: SharedUploadResponse;

  try {
    const res = await fetch(SHARED_UPLOAD_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        note_id: noteId,
        file_size: file.size,
        folder: options?.folder,
        public_id: options?.public_id,
      }),
    });

    const rawBody = await res.text();

    if (!res.ok) {
      console.error(`[shared-image-upload] ${res.status}:`, rawBody);

      let parsed: { error?: string } = {};
      try {
        parsed = JSON.parse(rawBody);
      } catch {
        /* not JSON */
      }

      const friendly: Record<number, string> = {
        401: "Session expired – please log out and log in again.",
        403: "Upload rejected – you don't have permission or quota is full.",
        404: "Shared note not found. It may have been deleted.",
        500: "Server error – please try again later.",
      };

      throw new Error(
        friendly[res.status] ?? parsed.error ?? `Unexpected error (${res.status})`
      );
    }

    ticket = JSON.parse(rawBody) as SharedUploadResponse;
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error("Network error while requesting shared upload ticket.");
  }

  // ── 3. Upload directly to Cloudinary using the signed ticket ─────────────
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

  // Unsigned fields — append after signed fields
  const tags = noteId ? `user_${userId},note_${noteId}` : `user_${userId}`;
  formData.append("tags", tags);

  if (ticket.max_bytes) {
    formData.append("max_bytes", String(ticket.max_bytes));
  }
  if (ticket.notification_url) {
    formData.append("notification_url", ticket.notification_url);
  }

  const cloudinaryRes = await fetch(ticket.upload_url, {
    method: "POST",
    body: formData,
  });

  if (!cloudinaryRes.ok) {
    const errData = await cloudinaryRes.json().catch(() => ({}));
    console.error("[shared-image-upload] Cloudinary upload failed:", errData);
    throw new Error(
      errData?.error?.message ?? `Cloudinary upload failed (${cloudinaryRes.status})`
    );
  }

  const cloudinaryData = await cloudinaryRes.json();

  // ── 4. Return the secure CDN URL ─────────────────────────────────────────
  console.log("[shared-image-upload] Success:", cloudinaryData.secure_url);
  return cloudinaryData.secure_url as string;
}
