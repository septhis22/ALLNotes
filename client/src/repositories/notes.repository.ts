import { supabase } from '../lib/supabase';

export interface NoteRow {
  id: string;
  title: string;
  content: string;
  updatedat: string;
  owner: string;
}

export interface CreateNoteInput {
  id: string;
  title: string;
  content: string;
  updatedat: string;
}

export interface UpdateNoteInput {
  id: string;
  title: string;
  content: string;
  updatedat: string;
}

const getCurrentUserId = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.id) {
    throw new Error(error?.message ?? 'User not authenticated');
  }
  return data.user.id;
};

export const notesRepository = {
  async fetchOwnedNotes(): Promise<NoteRow[]> {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('owner', userId)
      .order('updatedat', { ascending: true });

    if (error) throw error;
    return (data ?? []) as NoteRow[];
  },

  async fetchById(id: string): Promise<NoteRow | null> {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return (data as NoteRow | null) ?? null;
  },

  async createWithOwner(input: CreateNoteInput): Promise<NoteRow> {
    const owner = await getCurrentUserId();

    const { data, error } = await supabase
      .from('notes')
      .insert([
        {
          id: input.id,
          title: input.title,
          content: input.content,
          updatedat: input.updatedat,
          owner,
        },
      ])
      .select('*')
      .single();

    if (error) throw error;

    const { error: collaboratorError } = await supabase
      .from('note_collaborators')
      .insert([
        {
          note_id: input.id,
          user_id: owner,
          permission: ['w', 'r'],
        },
      ]);

    if (collaboratorError) throw collaboratorError;
    return data as NoteRow;
  },

  async updateOwned(input: UpdateNoteInput): Promise<NoteRow | null> {
    const owner = await getCurrentUserId();
    const { data, error } = await supabase
      .from('notes')
      .update({
        title: input.title,
        content: input.content,
        updatedat: input.updatedat,
      })
      .eq('id', input.id)
      .eq('owner', owner)
      .select('*')
      .maybeSingle();

    if (error) throw error;
    return (data as NoteRow | null) ?? null;
  },
};
