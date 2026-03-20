import { getSupabase } from './lib/supabase';

const testSupabaseConnection = async () => {
  console.log('🔍 Testing Supabase Connection...\n');

  try {
    // Test 1: Check if client is configured
    console.log('1. Checking Supabase client configuration...');
    
    // We can't easily check the raw config since it's now internal to getSupabase,
    // but we can try to get the client.
    const client = getSupabase();
    console.log('✅ Supabase client initialized');

    // Test 2: Check current auth session
    console.log('2. Checking current auth session...');
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session check failed:', sessionError.message);
      return false;
    }
    
    if (session) {
      console.log('✅ User is authenticated');
      console.log('   User ID:', session.user.id);
      console.log('   Email:', session.user.email);
    } else {
      console.log('ℹ️  No active session (user not logged in)');
    }
    console.log('');

    // Test 3: Try to fetch profiles table
    console.log('3. Testing profiles table access...');
    const { error: profileError } = await client
      .from('profiles')
      .select('*')
      .limit(1);

    if (profileError) {
      console.log('⚠️  Profiles table:', profileError.message);
    } else {
      console.log('✅ Profiles table accessible');
    }
    console.log('');

    // Test 4: Try to fetch notes table
    console.log('4. Testing notes table access...');
    const { error: notesError } = await client
      .from('notes')
      .select('*')
      .limit(1);

    if (notesError) {
      console.log('⚠️  Notes table:', notesError.message);
    } else {
      console.log('✅ Notes table accessible');
    }
    console.log('');

    // Test 5: Try to fetch note_collaborators table
    console.log('5. Testing note_collaborators table access...');
    const { error: collabError } = await client
      .from('note_collaborators')
      .select('*')
      .limit(1);

    if (collabError) {
      console.log('⚠️  note_collaborators table:', collabError.message);
    } else {
      console.log('✅ note_collaborators table accessible');
    }

    console.log('\n🎉 Supabase connection test complete!');
    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
};

// Export for use in app
export { testSupabaseConnection };

// Auto-run if imported directly
if (typeof window !== 'undefined') {
  (window as any).testSupabaseConnection = testSupabaseConnection;
}
