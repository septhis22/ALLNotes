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
      } else {}
    } catch (err) {}
  }
};

loadEnv();

const TEST_EMAIL = "user@example.com";
const TEST_NOTE_ID = "ec5c408c-4ded-468e-90a6-4d5a5594b593";

const runCollabTest = async () => {
  try {
    const supabase = getSupabase();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error(`Not authenticated: ${authError?.message || "No user session"}`);
    }
    const result = await noteCollaboratorsRepository.addCollaboratorByEmail(TEST_NOTE_ID, TEST_EMAIL);
    const allCollabs = await noteCollaboratorsRepository.getCollaboratorsForOwnedNotes();

    const isPresent = allCollabs.some(
      c => c.note_id === TEST_NOTE_ID && c.user_id === result.user_id
    );

    if (isPresent) {} else {}
  } catch (error: any) {} finally {}
};

// Execute
runCollabTest();

if (typeof window !== 'undefined') {
  (window as any).runCollabTest = runCollabTest;
}
