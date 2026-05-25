import { getSupabase } from "../lib/supabase";

interface DeleteNoteParams {
  note_id: string;
  note_type: "private" | "shared";
}

const DELETE_NOTE_FUNCTION_URL = "https://aybmxfhcfyulttbvhive.supabase.co/functions/v1/delete-note";

export async function deleteNoteCloud(params: DeleteNoteParams): Promise<void> {
  const supabase = getSupabase();

  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("No active session — please log in to delete this note.");
  }

  const response = await fetch(DELETE_NOTE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(params),
  });

  const rawBody = await response.text();

  if (!response.ok) {
    console.error(`[delete-note] Error (${response.status}):`, rawBody);
    let errorMsg = `Server error (${response.status})`;
    try {
      const parsed = JSON.parse(rawBody);
      if (parsed.error) errorMsg = parsed.error;
    } catch {
      // Ignored
    }
    throw new Error(errorMsg);
  }

  console.log(`[delete-note] Success:`, rawBody);
}
