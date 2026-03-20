import { v4 as uuidv4 } from 'uuid';
import type { Note } from '../store/store';
import { notesRepository } from '../repositories';
import { addNote } from '../IndexDB/db';

export const createNewNote = async (
  type: string,
  userId: string,
  setNotes: (updater: (prevNotes: Note[]) => Note[]) => void,
  setId: (id: string) => void
) => {
  const newNote: Note = {
    userId: userId,
    id: uuidv4(),
    type: type,
    title: '<h2>Untitled</h2>',
    content: '<p>Change Meee!!!!!!</p>',
    updatedat: new Date().toISOString(),
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
        type: newNote.type,
        title: newNote.title,
        content: newNote.content,
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
};