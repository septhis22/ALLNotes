import { getSupabase } from '../lib/supabase.ts';

export interface NoteRow {
  id: string;
  title: string;
  updatedat: string;
  owner: string;
  note_data?: any;
}

export interface CreateNoteInput {
  id: string;
  title: string;
  updatedat: string;
  note_data?: any;
}

export interface UpdateNoteInput {
  id: string;
  title: string;
  updatedat: string;
  note_data?: any;
}

const getCurrentUserId = async (): Promise<string> => {
  const { data, error } = await getSupabase().auth.getUser();
  if (error || !data.user?.id) {
    throw new Error(error?.message ?? 'User not authenticated');
  }
  return data.user.id;
};

export const notesRepository = {
  async fetchOwnedNotes(): Promise<NoteRow[]> {
    const userId = await getCurrentUserId();
    const { data, error } = await getSupabase()
      .from('notes')
      .select('*')
      .eq('owner', userId)
      .order('updatedat', { ascending: true });

    if (error) throw error;
    return (data ?? []) as NoteRow[];
  },

  async fetchById(id: string): Promise<NoteRow | null> {
    const { data, error } = await getSupabase()
      .from('notes')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return (data as NoteRow | null) ?? null;
  },

  async createWithOwner(input: CreateNoteInput): Promise<NoteRow> {
    const owner = await getCurrentUserId();

    const { data, error } = await getSupabase()
      .from('notes')
      .insert([
        {
          id: input.id,
          title: input.title,
          updatedat: input.updatedat,
          note_data: input.note_data,
          owner,
        },
      ])
      .select('*')
      .single();

    if (error) throw error;

    return data as NoteRow;
  },

  async updateOwned(input: UpdateNoteInput): Promise<NoteRow | null> {
    const owner = await getCurrentUserId();
    const { data, error } = await getSupabase()
      .from('notes')
      .update({
        title: input.title,
        updatedat: input.updatedat,
        note_data: input.note_data,
      })
      .eq('id', input.id)
      .eq('owner', owner)
      .select('*')
      .maybeSingle();

    if (error) throw error;
    return (data as NoteRow | null) ?? null;
  },
};
