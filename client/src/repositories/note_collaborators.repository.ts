import { useStore } from '../store/store';

import { getSupabase } from '../lib/supabase.ts';
export interface NoteCollaboratorRow {
  note_id: string;
  user_id: string;
  permission: string[];
}

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


export interface CollabResponse{
  email: string;
  status : boolean;
}

async function getCurrentUserId(): Promise<string> {
  const userId = useStore.getState().userId;
  if (!userId || userId === 'Guest' || userId === '') {
    const { data, error } = await getSupabase().auth.getUser();
    if (error || !data.user?.id) {
      throw new Error(error?.message ?? 'User not authenticated');
    }
    return data.user.id;
  }
  return userId;
}

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

  async addCollaboratorByEmail(noteId: string, email: string[]) {

    const {data,error} = await getSupabase().rpc('add_user_email_collab',{
      target_emails:email,
      note_id_input:noteId
    });
    
    if(error) throw error;

    const results = data as CollabResponse[];

    results.forEach((res) => {
        if (res.status) {
          console.log(`✅ ${res.email} was added!`);
        } else {
          console.warn(`❌ Could not add ${res.email}`);
        }
      });

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

  /**
   * Fetches all shared_notes where the current user is a collaborator (but not the owner).
   * Joins with profiles to get the owner's display name.
   */
  async getAllSharedNote(currentUserId: string): Promise<OwnerNoteGroup[]> {
    const { data, error } = await getSupabase()
        .rpc('get_grouped_shared_notes', { target_user_id: currentUserId });

    if (error) {
        console.error("Error fetching grouped notes:", error);
        throw error;
    }

    return data as OwnerNoteGroup[];
}
};
