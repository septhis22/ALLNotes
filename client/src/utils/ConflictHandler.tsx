import axios from "axios";
import { addNote, getAllNotes, updateNoteById } from "../IndexDB/db";
import autoSync from "./autoSync";
import getAuthToken from "./getToken";

interface noteInterface {
  userId: string;
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  synced: boolean;
}

export const syncNotes = async (userId: string,setIsLoading:React.Dispatch<React.SetStateAction<boolean>>) => {
  const notesFromOffline = await getAllNotes(userId);
  let notesFromOnline: any;
  const token = getAuthToken();
  
  try {
    notesFromOnline = await axios.get("http://localhost:8080/getAllNotes", {
     headers : {'Authorization': `Bearer ${token}`}
  });
    console.log("the notes from online", notesFromOnline.data);
  } catch (e) {
    console.log("error", e);
    return; // Exit if we can't get online notes
  }

  // Convert online notes array to a map for easier lookup
  const onlineNotesMap = new Map();
  if (notesFromOnline.data && Array.isArray(notesFromOnline.data)) {
    notesFromOnline.data.forEach((note: noteInterface) => {
      onlineNotesMap.set(note.id, note);
    });
  }

  // Sync existing offline notes
  for (const offlineNote of notesFromOffline) {
    const onlineNote = onlineNotesMap.get(offlineNote.id);
    
    if (onlineNote) {
      // Compare timestamps to determine which version is newer
      const offlineTime = new Date(offlineNote.updatedAt).getTime();
      const onlineTime = new Date(onlineNote.updatedat).getTime();
      console.log("offlineTime: ",offlineTime);
      console.log("Online Time: ",onlineTime);
      
      if (offlineTime > onlineTime) {
        // Local version is newer - mark as unsynced so it gets uploaded
        offlineNote.synced = false;
        // await updateNoteById(offlineNote.id,  offlineNote.title, offlineNote.content);
      } else if (onlineTime > offlineTime) {
        // Online version is newer - update local copy
        console.log("the route was hit",onlineNote.content);
        let content = onlineNote.content;
        let title = onlineNote.title;
        await updateNoteById(offlineNote.id, {title, content});
      }
      // If timestamps are equal, no action needed
      
      // Remove from map so we know we've processed it
      onlineNotesMap.delete(offlineNote.id);
    } else {
      // Note exists offline but not online - mark as unsynced for upload
      offlineNote.synced = false;
      // await updateNoteById(offlineNote.id,{offlineNote.title, offlineNote.content});
    }
  }

  // Add notes that exist online but not offline
  for (const [id, onlineNote] of onlineNotesMap) {
    const newNote: noteInterface = {
      userId:userId,
      id: onlineNote.id,
      title: onlineNote.title,
      content: onlineNote.content,
      updatedAt: onlineNote.updatedat,
      synced: true
    };
    console.log("this was hit");
    await addNote(newNote);
  }

  // Trigger auto sync to upload any unsynced changes
  autoSync(userId);
  setIsLoading(false)
};