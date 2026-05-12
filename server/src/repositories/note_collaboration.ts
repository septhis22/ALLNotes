import { getSupabase } from "../lib/supabase.js";

export const noteCollaboratorsRepository = {
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
