import { v4 as uuidv4 } from 'uuid';
import type { Note } from './store/store';
import { notesRepository } from './repositories';
import { addNote } from './IndexDB/db';

export const createNewNote = async (
  userId: string,
  setNotes: (updater: (prevNotes: Note[]) => Note[]) => void,
  setId: (id: string) => void
) => {
  const newNote: Note = {
    userId: userId,
    id: uuidv4(),
    title: 'Untitled Note',
    updatedat: new Date().toISOString(),
    note_data: [
      {
        type: "heading",
        props: { level: 1 },
        content: "Untitled"
      }
    ],
    synced: userId !== 'Guest', // Only synced if not a guest
  };

  try {
    // Always add the note locally first
    await addNote(newNote);
    setNotes((prevNotes: Note[]) => [...prevNotes, newNote]);

    // Select the new note automatically
    setId(newNote.id);

    // Only sync to cloud if user is authenticated
    if (userId !== 'Guest') {
      await notesRepository.createWithOwner({
        id: newNote.id,
        title: newNote.title,
        note_data: newNote.note_data,
        updatedat: newNote.updatedat,
      });

      // Update the note as synced
      setNotes((prevNotes: Note[]) =>
        prevNotes.map((note) =>
          note.id === newNote.id ? { ...note, synced: true } : note
        )
      );
    }
  } catch (err) {
    console.error('Error creating new note:', err);

    // If cloud sync failed, mark as unsynced
    setNotes((prevNotes: Note[]) =>
      prevNotes.map((note) =>
        note.id === newNote.id ? { ...note, synced: false } : note
      )
    );
  }
  return newNote.id;
};