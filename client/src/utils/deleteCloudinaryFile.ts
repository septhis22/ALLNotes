// src/utils/deleteCloudinaryFile.ts

import { getSupabase } from "../lib/supabase";

const DELETE_FUNCTION_URL =
  "https://aybmxfhcfyulttbvhive.supabase.co/functions/v1/cloudinary-delete";

/**
 * Deletes a file from Cloudinary via the edge function.
 * The edge function looks up the real file size from cloudinary_files table
 * and refunds it back to allowed_storage — no file_size needed from client.
 */
export async function deleteCloudinaryFile(url: string): Promise<void> {
  try {
    const supabase = getSupabase();

    await supabase.auth.getUser(); // force token refresh
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      console.warn("[cloudinary-delete] No active session — skipping");
      return;
    }

    console.log("[cloudinary-delete] Deleting:", url);

    const res = await fetch(DELETE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ url }),  // only URL — server reads size from DB
    });

    const rawBody = await res.text();
    console.log("[cloudinary-delete] Status:", res.status, "Body:", rawBody);

    const data = JSON.parse(rawBody);
    if (!res.ok) {
      console.warn("[cloudinary-delete] Failed:", data);
    } else {
      console.log(
        "[cloudinary-delete] Deleted:", data.public_id,
        "| result:", data.result,
        "| bytes_refunded:", data.bytes_refunded
      );
    }
  } catch (err) {
    console.warn("[cloudinary-delete] Error:", err);
  }
}