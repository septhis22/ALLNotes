import { supabase } from './lib/supabase';

const testSupabaseConnection = async () => {
  console.log('🔍 Testing Supabase Connection...\n');

  try {
  // Test 1: Check if client is configured
  console.log('1. Checking Supabase client configuration...');
  const supabaseUrl = import.meta.env.VITE_supabaseurl;
  const supabaseAnonKey = import.meta.env.VITE_annonkey;
  
  console.log('   URL:', supabaseUrl || 'MISSING');
  console.log('   Key:', supabaseAnonKey ? 'Set (' + supabaseAnonKey.substring(0, 20) + '...)' : 'MISSING');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase environment variables not set!');
    return false;
  }
  console.log('✅ Supabase client configured correctly\n');

    // Test 2: Check current auth session
    console.log('2. Checking current auth session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
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
    const { data: profileData, error: profileError } = await supabase
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
    const { data: notesData, error: notesError } = await supabase
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
    const { data: collabData, error: collabError } = await supabase
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
testSupabaseConnection();
