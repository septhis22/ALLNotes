import { getSupabase } from '../lib/supabase.ts';
import { useStore } from '../store/store';

export interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
}

const getCurrentUser = async () => {
  const store = useStore.getState();
  if (store.userId && store.userId !== 'Guest' && store.userId !== '') {
    return { id: store.userId, email: store.userD.email } as { id: string; email?: string };
  }
  // Fallback: fetch from auth (cold start / race condition)
  const { data, error } = await getSupabase().auth.getUser();
  if (error || !data.user) {
    throw new Error(error?.message ?? 'User not authenticated');
  }
  useStore.getState().setUserId(data.user.id);
  return data.user;
};

export const profilesRepository = {
  async fetchCurrentUserName(): Promise<string> {
    const user = await getCurrentUser();

    const { data, error } = await getSupabase()
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data || !data.full_name) return 'user';
    return data.full_name;
  },

  async fetchCurrent(): Promise<ProfileRow | null> {
    const user = await getCurrentUser();

    const { data, error } = await getSupabase()
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;
    return (data as ProfileRow | null) ?? null;
  },

  async updateCurrentUserName(userName: string): Promise<ProfileRow | null> {
    const user = await getCurrentUser();

    const { data, error } = await getSupabase()
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

    const { data, error } = await getSupabase()
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email ?? '',
        full_name: name.trim(),
      })
      .select('id, email, full_name')
      .maybeSingle();

    if (error) throw error;
    return (data as ProfileRow | null) ?? null;
  },


  async checkProfileStatus (email:string) : Promise<Boolean |  null> {
    
    const {data,error} = await getSupabase().rpc('get_profile_status',{
      email_input: email
    });

    if(error){
      return false;
    }

    return data;
  }
};
