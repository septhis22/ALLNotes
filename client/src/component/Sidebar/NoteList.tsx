import { useEffect, useCallback, useState } from 'react';
import { useAuthContext } from '../../Context/AuthContext';
import { useStore, type Note } from '../../store/store';
import { getAllNotes, addNote } from '../../IndexDB/db';
import { v4 as uuidv4 } from 'uuid';
import { useVerifyUser } from '../../utils/verifyUser';
import { syncNotes } from '../../utils/ConflictHandler';
import { notesRepository } from '../../repositories';

export const NoteList = () => {



  const [, setSyncLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { userId, setUserId } = useAuthContext();
  const { id, setId, notes, setNotes } = useStore();
  
  // ✅ CORRECT: Use the custom hook properly
  const verifyUser = useVerifyUser();

  const formatTitle = (content: string): string => {
    const plainText = content.replace(/<[^>]+>/g, '');
    return plainText || 'Untitled';
  };

  const fetchNotes = useCallback(async () => {
    try {
      const allNotes = await getAllNotes(userId);
      // Back-compat: older notes may not have `type` yet
      setNotes(allNotes.map((n) => ({ ...n, type: n.type ?? 'note' })));
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  }, [setNotes, userId]); // Removed syncLoading from dependencies

  useEffect(()=>{
    const Allsync=async()=>{
      console.log('Starting sync for user:', userId);
      if(userId && userId!=="Guest"){
       setSyncLoading(true);
       await syncNotes(userId,setSyncLoading);
       // Fetch notes immediately after sync completes
       fetchNotes();
      }
    }
    if (!isLoading) {
      Allsync();
    }
  },[userId, isLoading, fetchNotes]);

  // ✅ FIXED: Proper user verification flow
  useEffect(() => {
    const initializeUser = async () => {
      try {
        setIsLoading(true);
        
        // Only verify if user is Guest or not set
        if (userId === "Guest" || !userId) {
          const verifiedUserId = await verifyUser();
          if (verifiedUserId && verifiedUserId !== "Guest") {
            console.log('User verified:', verifiedUserId);
            // setUserId is handled inside verifyUser hook
          } else {
            console.log('No valid user found, staying as Guest');
            setUserId("Guest");
          }
        }
      } catch (error) {
        console.error('Error during user verification:', error);
        setUserId("Guest");
      } finally {
        setIsLoading(false);
      }
    };

    initializeUser();
  }, [verifyUser, userId, setUserId]); // ✅ FIXED: Added missing dependencies

  // ✅ FIXED: Fetch notes after loading is complete and userId is set
  useEffect(() => {
    if (!isLoading && userId) {
      console.log('Fetching notes for user:', userId);
      // For disconnected/Guest users or initial local load before sync finishes
      fetchNotes();
    }
  }, [isLoading, userId, fetchNotes]); // ✅ FIXED: Better dependencies

  const handleNewNote = async (e: React.FormEvent) => {
    e.preventDefault();

    const newNote: Note = {
      userId: userId,
      id: uuidv4(),
      type: 'note',
      title: '<h2>Untitled</h2>',
      updatedat: new Date().toISOString(),
      synced: userId !== "Guest", // Only synced if not a guest
    };

    try {
      // Always add the note locally first
      await addNote(newNote);
      setNotes((prevNotes: Note[]) => [...prevNotes, newNote]);
      
      // Select the new note automatically
      setId(newNote.id);

      // Only sync to cloud if user is authenticated
      if (userId !== "Guest") {
        await notesRepository.createWithOwner({
          id: newNote.id,
          type: newNote.type,
          title: newNote.title,
          note_data: newNote.note_data,
          updatedat: newNote.updatedat,
        });

        // Update the note as synced
        setNotes((prevNotes: Note[]) => 
          prevNotes.map(note => 
            note.id === newNote.id ? { ...note, synced: true } : note
          )
        );
      }
    } catch (err) {
      console.error('Error creating new note:', err);
      
      // If cloud sync failed, mark as unsynced
      setNotes((prevNotes: Note[]) => 
        prevNotes.map(note => 
          note.id === newNote.id ? { ...note, synced: false } : note
        )
      );
      
      // Still refresh notes from local storage
      await fetchNotes();
    }
  };

  if(isLoading){
    return <div>
      <p>Currently loading</p>
    </div>
  }

  return (
    <aside className="w-64 h-screen bg-stone-50 border-r border-stone-200 p-4 flex flex-col shadow-sm">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-stone-800 tracking-tight">All Notes</h1>
        <p className="text-sm text-stone-500 mt-1">{notes.length} notes</p>
      </div>

      {/* New Note Button */}
      <button
        onClick={handleNewNote}
        className="bg-amber-600 hover:bg-amber-700 text-white py-2.5 px-4 rounded-lg mb-6 transition-colors font-medium text-sm flex items-center gap-2 shadow-sm"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
        New Note
      </button>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="text-center text-stone-500 mt-8">
            <p className="text-sm">No notes yet</p>
            <p className="text-xs mt-1">Create your first note</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {notes.map((note) => (
              <li
                key={note.id}
                onClick={() => setId(note.id)}
                className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
                  id === note.id
                    ? 'bg-amber-50 border-amber-200 text-amber-900 shadow-sm'
                    : 'hover:bg-stone-100 border-transparent text-stone-700 hover:border-stone-200'
                }`}
              >
                <div className="font-medium text-sm mb-1 line-clamp-2">
                  {formatTitle(note.title)}
                </div>
                <div className="text-xs text-stone-500 flex items-center gap-2">
                  <span>{new Date(note.updatedat).toLocaleDateString()}</span>
                  {!note.synced && (
                    <span className="inline-flex items-center" title="Not synced to cloud">
                      <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-stone-200">
        <div className="text-xs text-stone-500 flex items-center justify-between">
          <span>User: {userId === "Guest" ? "Guest" : "Logged in"}</span>
          {userId === "Guest" && (
            <span className="text-orange-600 font-medium">Offline</span>
          )}
        </div>
      </div>
    </aside>
  );
};

export default NoteList;
