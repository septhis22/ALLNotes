import { noteCollaboratorsRepository } from "../repositories/index.ts";
import { getSupabase } from "../lib/supabase.ts";
import * as fs from 'fs';
import * as path from 'path';

// --- Manual .env loader for Node.js ---
const loadEnv = () => {
  if (typeof process !== 'undefined') {
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            process.env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
          }
        });
        console.log('📝 Loaded credentials from .env');
      } else {
        console.warn('⚠️ No .env file found at:', envPath);
      }
    } catch (err) {
      console.warn('⚠️ Failed to manually load .env:', err);
    }
  }
};

loadEnv();

const TEST_EMAIL = "user@example.com";
const TEST_NOTE_ID = "ec5c408c-4ded-468e-90a6-4d5a5594b593";

const runCollabTest = async () => {
  console.group("🧪 Collaboration Feature Diagnostic");
  console.log(`Target Note: ${TEST_NOTE_ID}`);
  console.log(`Target User: ${TEST_EMAIL}`);

  try {
    const supabase = getSupabase();
    
    // 0. Pre-check: Current user status
    console.log("Step 0: Checking current auth status...");
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error(`Not authenticated: ${authError?.message || "No user session"}`);
    }
    console.log(`✅ Authenticated as: ${user.email} (${user.id})`);

    // 1. Attempt to add the collaborator
    console.log("Step 1: Adding collaborator via repository...");
    const result = await noteCollaboratorsRepository.addCollaboratorByEmail(TEST_NOTE_ID, TEST_EMAIL);
    console.log("✅ Step 1 Success:", result);

    // 2. Verify the addition
    console.log("Step 2: Verifying in collaborators list...");
    const allCollabs = await noteCollaboratorsRepository.getCollaboratorsForOwnedNotes();
    
    const isPresent = allCollabs.some(
      c => c.note_id === TEST_NOTE_ID && c.user_id === result.user_id
    );

    if (isPresent) {
      console.log("✅ Step 2 Success: User confirmed in database list.");
    } else {
      console.warn("⚠️ Step 2 Warning: API reported success, but user is missing from the fetched list.");
    }

  } catch (error: any) {
    console.error("❌ Test Failed:", error.message || error);
  } finally {
    console.groupEnd();
  }
};

// Execute
runCollabTest();

if (typeof window !== 'undefined') {
  (window as any).runCollabTest = runCollabTest;
}
