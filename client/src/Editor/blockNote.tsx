import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
// Default styles for the mantine editor
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useCallback } from "react";
import debounce from "lodash.debounce";
import { useStore } from "../store/store";
import { updateNoteById, updateNoteSync } from "../IndexDB/db";
import autoSync from "../utils/autoSync";
import { useAuthContext } from "../Context/AuthContext";
import type { Note } from "../store/store";

export default function MyEditor() {
  const { id, notes, setNotes } = useStore();
  const { userId } = useAuthContext();

  if (!id) {
    return <div>Select a note</div>;
  }

  const currentNote = notes.find((n) => n.id === id);

  if (!currentNote) {
    return <div>Loading...</div>;
  }

  return (
    <EditorInstance
      key={id}
      noteId={id}
      note={currentNote}
      userId={userId}
      setNotes={setNotes}
    />
  );
}

function EditorInstance({
  noteId,
  note,
  userId,
  setNotes,
}: {
  noteId: string;
  note: Note;
  userId: string;
  setNotes: any;
}) {
  const editor = useCreateBlockNote({
    initialContent: note.note_data ? note.note_data : undefined,
  });

  const syncToCloud = useCallback(
    debounce(() => {
      autoSync(userId);
    }, 3000),
    [userId]
  );

  const saveContent = useCallback(
    debounce((id: string, updatedData: any, contentStr: string, updatedTitle: string) => {
      updateNoteById(id, { title: updatedTitle, content: contentStr, note_data: updatedData });
      updateNoteSync(id, false);
      syncToCloud();
    }, 500),
    [syncToCloud]
  );

  return (
    <div className="h-full w-full" style={{ display: "flex", flexDirection: "column" }}>
      <BlockNoteView
        editor={editor}
        theme="dark"
        style={{ height: "100%", width: "100%", backgroundColor: "transparent" }}
        onChange={() => {
          const updatedData = editor.document;
          
          // Generate string representation for the content field if needed
          const contentStr = "{}";

          setNotes((prevNotes: Note[]) => prevNotes.map((n: Note) =>
            n.id === noteId ? { ...n, content: contentStr, note_data: updatedData } : n
          ));
          saveContent(noteId, updatedData, contentStr, note.title);
        }}
      />
    </div>
  );
}
