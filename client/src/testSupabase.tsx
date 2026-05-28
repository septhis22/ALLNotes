import { getSupabase } from './lib/supabase';

const testSupabaseConnection = async () => {
  try {
    // We can't easily check the raw config since it's now internal to getSupabase,
    // but we can try to get the client.
    const client = getSupabase();
    const { data: { session }, error: sessionError } = await client.auth.getSession();

    if (sessionError) {
      return false;
    }

    if (session) {} else {}
    const { error: profileError } = await client
      .from('profiles')
      .select('*')
      .limit(1);

    if (profileError) {} else {}
    const { error: notesError } = await client
      .from('notes')
      .select('*')
      .limit(1);

    if (notesError) {} else {}
    const { error: collabError } = await client
      .from('note_collaborators')
      .select('*')
      .limit(1);

    if (collabError) {} else {}

    return true;
  } catch (error) {
    return false;
  }
};

// Export for use in app
export { testSupabaseConnection };

// Auto-run if imported directly
if (typeof window !== 'undefined') {
  (window as any).testSupabaseConnection = testSupabaseConnection;
}
