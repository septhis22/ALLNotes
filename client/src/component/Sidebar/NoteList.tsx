import React, { useEffect, useCallback, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/store';
import { getAllNotes, addNote } from '../../IndexDB/db';
import { v4 as uuidv4 } from 'uuid';
import getAuthToken from '../../utils/getToken';
import { useVerifyUser } from '../../utils/verifyUser';
import { syncNotes } from '../../utils/ConflictHandler';


interface Notes {
  userId: string;
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  synced: boolean;
}

export const NoteList = () => {



  const[syncLoading ,setSyncLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(true);
  const { userId, id, setId, notes, setNotes, setUserId } = useStore();
  
  // ✅ CORRECT: Use the custom hook properly
  const verifyUser = useVerifyUser();

  const formatTitle = (content: string): string => {
    const plainText = content.replace(/<[^>]+>/g, '');
    return plainText || 'Untitled';
  };

  const fetchNotes = useCallback(async () => {
    try {
      const allNotes = await getAllNotes(userId);
      setNotes(allNotes);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  }, [setNotes, userId,syncLoading]);

  useEffect(()=>{
    const Allsync=async()=>{
      if(userId!=="Guest"){
       await syncNotes(userId,setSyncLoading);
      }
    }
    Allsync();
  },[userId,setUserId,isLoading]);

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
      fetchNotes();
    }
  }, [isLoading, userId, fetchNotes]); // ✅ FIXED: Better dependencies

  const handleNewNote = async (e: React.FormEvent) => {
    e.preventDefault();

    const newNote: Notes = {
      userId: userId,
      id: uuidv4(),
      title: '<h2>Untitled</h2>',
      content: '<p>Change Meee!!!!!!</p>',
      updatedAt: new Date().toISOString(),
      synced: userId !== "Guest", // Only synced if not a guest
    };

    try {
      // Always add the note locally first
      await addNote(newNote);
      setNotes((prevNotes) => [...prevNotes, newNote]);

      // Only sync to cloud if user is authenticated
      if (userId !== "Guest") {
        const token = getAuthToken();
        if (token) {
          await axios.post('http://localhost:8080/add_notes', {
            userId: newNote.userId,
            id: newNote.id,
            title: newNote.title,
            content: newNote.content,
            updated_at: newNote.updatedAt,
          }, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          // Update the note as synced
          setNotes(prevNotes => 
            prevNotes.map(note => 
              note.id === newNote.id ? { ...note, synced: true } : note
            )
          );
        }
      }
    } catch (err) {
      console.error('Error creating new note:', err);
      
      // If cloud sync failed, mark as unsynced
      setNotes(prevNotes => 
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