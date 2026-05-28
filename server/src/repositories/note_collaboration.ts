import { getSupabase } from "../lib/supabase.js";

export interface NestedNote {
    id: string;
    title: string;
    content: string; // or Uint8Array/string based on your bytea handling
    created_at: string;
    updated_at: string;
}

export interface OwnerNoteGroup {
    owner_name: string;
    owner_email: string;
    notes: NestedNote[];
}

export const noteCollaboratorsRepository = {

    async getAllSharedNote(currentUserId: string): Promise<OwnerNoteGroup[]> {
        const { data, error } = await getSupabase()
            .rpc('get_grouped_shared_notes', { target_user_id: currentUserId });

        if (error) {
            throw error;
        }

        return data as OwnerNoteGroup[];
    },

    async VerifyUser(noteId: string, userId: string): Promise<boolean> {
        const { data, error } = await getSupabase()
            .from('note_collaborators')
            .select('permission')
            .eq('note_id', noteId)
            .eq('user_id', userId)
            .maybeSingle(); // Returns an object or null
        
        if (error) throw error;
        
        // Corrected: Just check if data exists
        if (!data) return false; 
        
        return true;
    }
}
