import { getSupabase } from '../lib/supabase.ts';

export interface NoteCollaboratorRow {
  note_id: string;
  user_id: string;
  permission: string[];
}

const getCurrentUserId = async (): Promise<string> => {
  const { data, error } = await getSupabase().auth.getUser();
  if (error || !data.user?.id) {
    throw new Error(error?.message ?? 'User not authenticated');
  }
  return data.user.id;
};

export const noteCollaboratorsRepository = {
  async getPermissionForCurrentUser(noteId: string): Promise<string[]> {
    const userId = await getCurrentUserId();

    const { data, error } = await getSupabase()
      .from('note_collaborators')
      .select('permission')
      .eq('note_id', noteId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    const permission = (data as { permission?: string[] } | null)?.permission;
    return Array.isArray(permission) ? permission : [];
  },

  async addCollaboratorByEmail(noteId: string, email: string): Promise<{ note_id: string; user_id: string }> {
    const ownerId = await getCurrentUserId();

    // 1. Verify note ownership
    const { data: noteData, error: noteError } = await getSupabase()
      .from('notes')
      .select('id')
      .eq('id', noteId)
      .eq('owner', ownerId)
      .maybeSingle();

    if (noteError) throw noteError;
    
    if (!noteData) {
      throw new Error('You do not own this note');
    }

    // 2. Find target user in profiles table
    console.log(`🔍 Searching for user by email: ${email}`);
    
    // Diagnostic: Try to see if ANY profiles are visible
    const { data: allVisible, error: diagError } = await getSupabase()
      .from('profiles')
      .select('email')
      .limit(5);
    
    if (diagError) {
      console.warn("⚠️ Diagnostic: Could not even query profiles table:", diagError.message);
    } else {
      console.log(`📊 Diagnostic: Found ${allVisible?.length || 0} visible profiles.`, 
        allVisible?.length ? `Emails: ${allVisible.map(p => p.email).join(', ')}` : "None visible.");
    }

    const { data: profileData, error: profileError } = await getSupabase()
      .from('profiles')
      .select('id, email')
      .ilike('email', email.trim())
      .maybeSingle();

    if (profileError) {
      console.error("❌ Profile search error:", profileError);
      throw profileError;
    }
    
    console.log("👤 Profile search result:", profileData);

    const targetUserId = profileData?.id;
    if (!targetUserId) {
      throw new Error(`User not found with email: ${email}. Ensure they have logged in at least once.`);
    }

    // 3. Add to collaborators table
    const { data: insertData, error: insertError } = await getSupabase()
      .from('note_collaborators')
      .insert([
        {
          note_id: noteId,
          user_id: targetUserId,
          permission: ['w', 'r'],
        },
      ])
      .select('note_id, user_id')
      .single();

    if (insertError) {
      if (insertError.code === '23505') { // Unique constraint violation
        throw new Error('Collaborator already added');
      }
      throw insertError;
    }
    
    return insertData as { note_id: string; user_id: string };
  },

  async getCollaboratorsForOwnedNotes(): Promise<NoteCollaboratorRow[]> {
    const ownerId = await getCurrentUserId();

    const { data: ownedNotes, error: ownedNotesError } = await getSupabase()
      .from('notes')
      .select('id')
      .eq('owner', ownerId);

    if (ownedNotesError) throw ownedNotesError;
    const noteIds = (ownedNotes ?? []).map((row) => (row as { id: string }).id);

    if (noteIds.length === 0) {
      return [];
    }

    const { data, error } = await getSupabase()
      .from('note_collaborators')
      .select('note_id, user_id, permission')
      .in('note_id', noteIds);

    if (error) throw error;
    return (data ?? []) as NoteCollaboratorRow[];
  },

  async removeCollaborators(noteId: string, removeIds: string[]): Promise<number> {
    const ownerId = await getCurrentUserId();

    const { data: noteData, error: noteError } = await getSupabase()
      .from('notes')
      .select('id')
      .eq('id', noteId)
      .eq('owner', ownerId)
      .maybeSingle();

    if (noteError) throw noteError;
    if (!noteData) {
      throw new Error('You are not authorized to modify collaborators on this note');
    }

    const { data, error } = await getSupabase()
      .from('note_collaborators')
      .delete()
      .eq('note_id', noteId)
      .in('user_id', removeIds)
      .select('user_id');

    if (error) throw error;
    return (data ?? []).length;
  },
};
