import { getSupabase } from '../lib/supabase.ts';

export interface SharedNoteRow {
  id: string;
  owner_id: string;
  title: string;
  content?: any;
  created_at: string;
  updated_at: string;
}

export interface NoteCollaboratorRow {
  note_id: string;
  user_id: string;
  permission: string[];
  content?: any;
}

export const SharedNotesRepository = {

  async createNewSharedNote(userId: string, title?: string): Promise<SharedNoteRow | null> {
    const finalTitle = title?.trim() || 'Untitled';
    const { data, error } = await getSupabase()
      .from('shared_notes')
      .insert({
        owner_id: userId,
        title: finalTitle,
      })
      .select('*')
      .single();

    if (error) throw error;
    
    return data as SharedNoteRow | null;
  },


  async fetchSharedNotes(userId: string): Promise<SharedNoteRow[]> {
    const { data, error } = await getSupabase()
      .from('shared_notes')
      .select('*')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    

    return (data as SharedNoteRow[]) || [];
  },

  async fetchCollaboratorNotes(userId: string): Promise<SharedNoteRow[]> {
    const { data, error } = await getSupabase()
      .from('shared_notes')
      .select('*, note_collaborators!inner(*)')
      .eq('note_collaborators.user_id', userId)
      .neq('owner_id', userId)
      .contains('note_collaborators.permission', ['r', 'w'])
      .order('updated_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []).map((note: any) => {
      const { note_collaborators, ...noteData } = note;
      return noteData as SharedNoteRow;
    });
  },

  async fetchById(id: string): Promise<SharedNoteRow | null> {
    const { data, error } = await getSupabase()
      .from('shared_notes')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return (data as SharedNoteRow | null) ?? null;
  }
};
