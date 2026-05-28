// blockNote.tsx

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useCallback, useRef } from "react";
import debounce from "lodash.debounce";
import { useStore } from "../store/store";
import { updateNoteById, updateNoteSync } from "../IndexDB/db";
import autoSync from "../utils/autoSync";
import { useAuthContext } from "../Context/AuthContext";
import { uploadFileToCloudinary } from "../utils/uploadFile";
import { deleteCloudinaryFile } from "../utils/deleteCloudinaryFile";
import type { Note } from "../store/store";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extracts up to the specified number of words from the BlockNote blocks
 * to generate an automatic title.
 */
function extractTitleFromBlocks(blocks: any[], maxWords: number = 5): string {
  // Only use the first block (first line) for the title
  for (const block of blocks) {
    if (!block.content) continue;

    let text = "";
    if (Array.isArray(block.content)) {
      for (const inline of block.content) {
        if (inline.type === "text" && inline.text) {
          text += inline.text + " ";
        }
      }
    } else if (typeof block.content === "string") {
      text = block.content;
    }

    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length > 0) {
      return words.slice(0, maxWords).join(" ");
    }
  }

  return "Untitled Note";
}

/**
 * Recursively walks BlockNote blocks and returns a Set of all
 * Cloudinary image/video/file URLs present in the document.
 */
function extractCloudinaryUrls(blocks: any[]): Set<string> {
  const urls = new Set<string>();
  for (const block of blocks) {
    if (
      block.props?.url &&
      typeof block.props.url === "string" &&
      block.props.url.includes("res.cloudinary.com")
    ) {
      urls.add(block.props.url);
    }
    if (block.children?.length) {
      for (const url of extractCloudinaryUrls(block.children)) {
        urls.add(url);
      }
    }
  }
  return urls;
}

import EmptyNoteState from "../Pages/EmptyNoteState";

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function MyEditor() {
  const { id, notes, setNotes } = useStore();
  const { userId } = useAuthContext();

  if (!id) return <EmptyNoteState />;

  const currentNote = notes.find((n) => n.id === id);
  if (!currentNote) return <div>Loading...</div>;

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

// ─── Editor instance ──────────────────────────────────────────────────────────

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
  //
  // urlsRef  — Set of Cloudinary URLs currently in the document.
  //            Used to diff and detect deletions.
  //
  // sizeMap  — Map<url, bytes> kept separately and NEVER cleared.
  //            Survives even after a URL leaves the document so we
  //            always know the original file size to refund.
  //            Populated at upload time with the real File.size.
  //
  const urlsRef  = useRef<Set<string>>(
    note.note_data ? extractCloudinaryUrls(note.note_data) : new Set()
  );
  const sizeMap  = useRef<Map<string, number>>(new Map());

  const editor = useCreateBlockNote({
    initialContent: note.note_data ?? undefined,

    uploadFile: async (file: File) => {
      try {
        const url = await uploadFileToCloudinary(file, {
          folder: `user_${userId}/notes`,
          noteId: noteId,
        });

        // ── Store the real file size against this URL ──────────────────────
        // This is the ground truth — file.size is always accurate.
        sizeMap.current.set(url, file.size);
        urlsRef.current.add(url);

        return url;
      } catch (error) {
        throw error;
      }
    },
  });

  // ── Media deletion detector ─────────────────────────────────────────────────
  const detectAndDeleteRemovedImages = useCallback(
    debounce((currentBlocks: any[]) => {
      const currentUrls = extractCloudinaryUrls(currentBlocks);
      const previousUrls = urlsRef.current;

      for (const url of previousUrls) {
        if (!currentUrls.has(url)) {
          // URL disappeared from the document → user deleted the media

          // Look up the file size from our persistent sizeMap
          const fileSize = sizeMap.current.get(url) ?? 0;

          if (fileSize === 0) {}

          // Delete from Cloudinary + refund storage
          deleteCloudinaryFile(url); // size looked up server-side from cloudinary_files
        }
      }

      // Update tracked URLs to current state
      urlsRef.current = currentUrls;
    }, 800),
    []
  );

  // ── Save + sync ─────────────────────────────────────────────────────────────
  const syncToCloud = useCallback(
    debounce(() => { autoSync(userId); }, 3000),
    [userId]
  );

  const saveContent = useCallback(
    debounce((id: string, data: any, title: string) => {
      updateNoteById(id, { title, note_data: data });
      updateNoteSync(id, false);
      syncToCloud();
    }, 500),
    [syncToCloud]
  );

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden relative flex flex-col items-center bg-[#191919]">
      <div className="w-full max-w-[900px] mx-auto pt-15 pb-20 px-6 flex-1">
        <BlockNoteView
          editor={editor}
          theme="dark"
          className="min-h-full w-full bg-transparent"
          onChange={() => {
            const updatedData = editor.document;
            const newTitle = extractTitleFromBlocks(updatedData, 5);

            setNotes((prev: Note[]) =>
              prev.map((n: Note) =>
                n.id === noteId
                  ? { ...n, content: "{}", note_data: updatedData, title: newTitle }
                  : n
              )
            );

            saveContent(noteId, updatedData, newTitle);
            detectAndDeleteRemovedImages(updatedData);
          }}
        />
      </div>
    </div>
  );
}