import { supabase } from '../lib/supabase';

export interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
}

const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error(error?.message ?? 'User not authenticated');
  }
  return data.user;
};

export const profilesRepository = {
  async fetchCurrent(): Promise<ProfileRow | null> {
    const user = await getCurrentUser();

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;
    return (data as ProfileRow | null) ?? null;
  },

  async updateCurrentUserName(userName: string): Promise<ProfileRow | null> {
    const user = await getCurrentUser();

    const { data, error } = await supabase
      .from('profiles')
      .update({ full_name: userName.trim() })
      .eq('id', user.id)
      .select('id, email, full_name')
      .maybeSingle();

    if (error) throw error;
    return (data as ProfileRow | null) ?? null;
  },

  async addOrUpdateName(name: string): Promise<ProfileRow | null> {
    const user = await getCurrentUser();

    const { data, error } = await supabase
      .from('profiles')
      .update({
        email: user.email ?? '',
        full_name: name.trim(),
      })
      .eq('id', user.id)
      .select('id, email, full_name')
      .maybeSingle();

    if (error) throw error;
    return (data as ProfileRow | null) ?? null;
  },
};
