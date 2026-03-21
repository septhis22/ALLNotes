import { addNote, getAllNotes } from "../IndexDB/db";
import autoSync from "./autoSync";
import { notesRepository } from "../repositories";
import { type Note } from "../store/store";

export const syncNotes = async (userId: string,setIsLoading:React.Dispatch<React.SetStateAction<boolean>>) => {
  const notesFromOffline = await getAllNotes(userId);
  let notesFromOnline: any;
  
  try {
    notesFromOnline = await notesRepository.fetchOwnedNotes();
    console.log("the notes from online", notesFromOnline);
  } catch (e) {
    console.log("error", e);
    return; // Exit if we can't get online notes
  }

  // Convert online notes array to a map for easier lookup
  const onlineNotesMap = new Map();
  if (notesFromOnline && Array.isArray(notesFromOnline)) {
    notesFromOnline.forEach((note: any) => {
      onlineNotesMap.set(note.id, note);
    });
  }

  // Sync existing offline notes
  for (const offlineNote of notesFromOffline) {
    const onlineNote = onlineNotesMap.get(offlineNote.id);
    
    if (onlineNote) {
      // Compare timestamps to determine which version is newer
      const offlineTime = new Date(offlineNote.updatedat).getTime();
      const onlineTime = new Date(onlineNote.updatedat).getTime();
      console.log("offlineTime: ",offlineTime);
      console.log("Online Time: ",onlineTime);
      
      if (offlineTime > onlineTime) {
        // Local version is newer - mark as unsynced so it gets uploaded
        offlineNote.synced = false;
        await addNote(offlineNote);
      } else if (onlineTime > offlineTime) {
        // Online version is newer - update local copy
        console.log("the route was hit",onlineNote.note_data);
        const upgradedNote: Note = {
          userId: userId,
          id: onlineNote.id,
          type: onlineNote.type ?? "note",
          title: onlineNote.title,
          note_data: onlineNote.note_data,
          updatedat: onlineNote.updatedat,
          synced: true
        };
        await addNote(upgradedNote);
      }
      // If timestamps are equal, no action needed
      
      // Remove from map so we know we've processed it
      onlineNotesMap.delete(offlineNote.id);
    } else {
      // Note exists offline but not online - mark as unsynced for upload
      offlineNote.synced = false;
      await addNote(offlineNote);
    }
  }

  // Add notes that exist online but not offline
  for (const [, onlineNote] of onlineNotesMap) {
    const newNote: Note = {
      userId:userId,
      id: onlineNote.id,
      type: onlineNote.type ?? "note",
      title: onlineNote.title,
      note_data: onlineNote.note_data,
      updatedat: onlineNote.updatedat,
      synced: true
    };
    console.log("this was hit");
    await addNote(newNote);
  }

  // Trigger auto sync to upload any unsynced changes
  autoSync(userId);
  setIsLoading(false)
};
