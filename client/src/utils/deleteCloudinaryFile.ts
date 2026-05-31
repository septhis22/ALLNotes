// src/utils/deleteCloudinaryFile.ts

import { getSupabase } from "../lib/supabase";

const DELETE_FUNCTION_URL =
  `${import.meta.env.VITE_supabaseurl}/functions/v1/cloudinary-delete`;

/**
 * Deletes a file from Cloudinary via the edge function.
 * The edge function looks up the real file size from cloudinary_files table
 * and refunds it back to allowed_storage — no file_size needed from client.
 */
export async function deleteCloudinaryFile(url: string): Promise<void> {
  try {
    const supabase = getSupabase();

    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return;
    }

    const res = await fetch(DELETE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ url }),  // only URL — server reads size from DB
    });

    const rawBody = await res.text();

    JSON.parse(rawBody); // parse but ignore data to ensure it's valid JSON if needed
    if (!res.ok) {} else {}
  } catch (err) {
    1
  }
}