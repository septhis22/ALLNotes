// src/utils/collabUtils/sharedImageDelete.ts

import { getSupabase } from "../../lib/supabase";

const SHARED_DELETE_URL =
  "https://aybmxfhcfyulttbvhive.supabase.co/functions/v1/shared-image-delete";

/**
 * Deletes a shared-note image from Cloudinary via the shared-image-delete
 * edge function.
 *
 * The edge function handles:
 *   - Verifying the caller has access to the shared note.
 *   - Deleting the asset from Cloudinary.
 *   - Refunding storage quota back to the note owner.
 *
 * @param url    - The Cloudinary `secure_url` of the image to delete.
 * @param noteId - UUID of the shared note the image belongs to.
 */
export async function deleteSharedImage(
  url: string,
  noteId: string
): Promise<void> {
  try {
    const supabase = getSupabase();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      console.warn("[shared-image-delete] No active session — skipping");
      return;
    }

    console.log("[shared-image-delete] Deleting:", url, "| noteId:", noteId);

    const res = await fetch(SHARED_DELETE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ url, note_id: noteId }),
    });

    const rawBody = await res.text();
    console.log("[shared-image-delete] Status:", res.status, "Body:", rawBody);

    const data = JSON.parse(rawBody);
    if (!res.ok) {
      console.warn("[shared-image-delete] Failed:", data);
    } else {
      console.log(
        "[shared-image-delete] Deleted:", data.public_id,
        "| result:", data.result,
        "| bytes_refunded:", data.bytes_refunded
      );
    }
  } catch (err) {
    console.warn("[shared-image-delete] Error:", err);
  }
}
