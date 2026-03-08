// db.ts

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Bump version if you add new indices
    const request = indexedDB.open("MyNotesDB", 2);

    request.onerror = () => reject("Failed to open DB");
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      let store: IDBObjectStore;
      if (!db.objectStoreNames.contains("notes")) {
        // Use keyPath: "id" (string UUIDs)
        store = db.createObjectStore("notes", { keyPath: "id" });
      } else {
        store = request.transaction!.objectStore("notes");
      }
      // Ensure both indices exist
      if (!store.indexNames.contains("synced")) {
        store.createIndex("synced", "synced", { unique: false });
      }
      if (!store.indexNames.contains("userId")) {
        store.createIndex("userId", "userId", { unique: false });
      }
    };
  });
}

export async function addNote(note: {
  userId: string;
  id: string;
  title: string;
  content: string;
  updatedat: string;
  synced: boolean;
}) {
  const db = await openDB();
  const tx = db.transaction("notes", "readwrite");
  const store = tx.objectStore("notes");
  // Always ensure synced is boolean
  note.synced = !!note.synced;
  store.add(note);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function getAllNotes(userId: string): Promise<any[]> {
  const db = await openDB();
  const tx = db.transaction("notes", "readonly");
  const store = tx.objectStore("notes");

  if (store.indexNames.contains("userId")) {
    const index = store.index("userId");
    return new Promise((resolve, reject) => {
      const request = index.getAll(userId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject("Failed to fetch notes");
    });
  } else {
    // Fallback: get all and filter
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const allNotes = request.result;
        resolve(allNotes.filter((note: any) => note.userId === userId));
      };
      request.onerror = () => reject("Failed to fetch notes");
    });
  }
}

export async function updateNoteById(
id: string, updatedFields: { title?: string; content?: string; }) {
  const db = await openDB();
  const tx = db.transaction("notes", "readwrite");
  const store = tx.objectStore("notes");

  const getRequest = store.get(id);

  return new Promise<void>((resolve, reject) => {
    getRequest.onsuccess = () => {
      const note = getRequest.result;

      if (!note) {
        reject(new Error("Note not found (id: " + id + ")"));
        return;
      }

      // Update the fields
      if (updatedFields.title !== undefined) note.title = updatedFields.title;
      if (updatedFields.content !== undefined) note.content = updatedFields.content;
      note.updatedat = new Date().toISOString();
      note.synced = false;

      const putRequest = store.put(note);

      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(new Error("Failed to update note"));
    };

    getRequest.onerror = () => reject(new Error("Failed to fetch note"));
  });
}

export async function updateNoteSync(id: string, synced: boolean) {
  const db = await openDB();
  const tx = db.transaction("notes", "readwrite");
  const store = tx.objectStore("notes");

  const getRequest = store.get(id);

  return new Promise<void>((resolve, reject) => {
    getRequest.onsuccess = () => {
      const note = getRequest.result;

      if (!note) {
        reject(new Error("Note not found"));
        return;
      }

      note.synced = !!synced;

      const putRequest = store.put(note);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(new Error("Failed to update note"));
    };
    getRequest.onerror = () => reject(new Error("Failed to fetch note"));
  });
}

export async function getUnsyncedNotes(userId:string): Promise<any[]> {
  const db = await openDB();
  const tx = db.transaction("notes", "readonly");
  const store = tx.objectStore("notes");

  if (store.indexNames.contains("synced")) {
    const index = store.index("synced");
    try {
      const keyRange = IDBKeyRange.only(false);
      return await new Promise((resolve, reject) => {
        const request = index.getAll(keyRange);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject("Failed to fetch unsynced notes");
      });
    } catch (e) {
      // Fallback: get all and filter
      const allNotes = await new Promise<any[]>((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject("Failed to fetch notes");
      });
      return allNotes.filter(note => note.synced === false && note.userId=== userId);
    }
  } else {
    // Fallback: get all and filter
    const allNotes = await new Promise<any[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject("Failed to fetch notes");
    });
    return allNotes.filter(note => note.synced === false);
  }
}



export async function deleteAllUserNotes(userId:string): Promise<any>{
  const db = await openDB();
  const tx = db.transaction("notes","readwrite");
  const store = tx.objectStore("notes");

  if(store.indexNames.contains("userId")){
    const index = store.index("userId");
    return new Promise((resolve, reject) => {
      const allNotesRequest = index.getAll(userId);
      allNotesRequest.onsuccess = async () => {
        const notes = allNotesRequest.result;
        try {
          for (const note of notes) {
            await new Promise<void>((res, rej) => {
              const deleteRequest = store.delete(note.id);
              deleteRequest.onsuccess = () => res();
              deleteRequest.onerror = () => rej(deleteRequest.error);
            });
          }
          resolve(true);
        } catch (err) {
          reject(err);
        }
      };
      allNotesRequest.onerror = () => reject(allNotesRequest.error);
    });
  }
  
}
