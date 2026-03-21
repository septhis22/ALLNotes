// src/utils/deleteCloudinaryFile.ts

import { getSupabase } from "../lib/supabase";

const DELETE_FUNCTION_URL =
  "https://aybmxfhcfyulttbvhive.supabase.co/functions/v1/cloudinary-delete";

/**
 * Deletes a file from Cloudinary and refunds the storage quota.
 *
 * @param url       Cloudinary secure_url to delete
 * @param file_size bytes to refund back to allowed_storage
 */
export async function deleteCloudinaryFile(
  url: string,
  file_size: number
): Promise<void> {
  try {
    const supabase = getSupabase();

    // Always get a fresh session
    await supabase.auth.getUser();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      console.warn("[cloudinary-delete] No active session — skipping delete");
      return;
    }

    console.log("[cloudinary-delete] Calling delete for:", url, "file_size:", file_size);

    const res = await fetch(DELETE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        url,
        file_size: Number(file_size), // ensure it's a number, never string/undefined
      }),
    });

    const rawBody = await res.text();
    console.log("[cloudinary-delete] Response status:", res.status);
    console.log("[cloudinary-delete] Response body:", rawBody);

    const data = JSON.parse(rawBody);

    if (!res.ok) {
      console.warn("[cloudinary-delete] Failed:", data);
    } else {
      console.log(
        "[cloudinary-delete] Success:",
        data.public_id,
        "| result:", data.result,
        "| file_size_received:", data.file_size_received
      );
    }
  } catch (err) {
    // Never crash the editor over a deletion failure
    console.warn("[cloudinary-delete] Unexpected error:", err);
  }
}