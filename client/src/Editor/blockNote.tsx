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
 * Recursively walks BlockNote blocks and returns a Set of all
 * Cloudinary image URLs present in the document.
 */
function extractCloudinaryUrls(blocks: any[]): Set<string> {
  const urls = new Set<string>();
  for (const block of blocks) {
    if (
      block.type === "image" &&
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

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function MyEditor() {
  const { id, notes, setNotes } = useStore();
  const { userId } = useAuthContext();

  if (!id) return <div>Select a note</div>;

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
      console.log("[upload] Starting:", file.name, file.size, "bytes");
      try {
        const url = await uploadFileToCloudinary(file, {
          folder: `user_${userId}/notes`,
        });

        // ── Store the real file size against this URL ──────────────────────
        // This is the ground truth — file.size is always accurate.
        sizeMap.current.set(url, file.size);
        urlsRef.current.add(url);

        console.log("[upload] Done:", url, "| size stored:", file.size);
        return url;
      } catch (error) {
        console.error("[upload] Failed:", error);
        throw error;
      }
    },
  });

  // ── Image deletion detector ─────────────────────────────────────────────────
  const detectAndDeleteRemovedImages = useCallback(
    debounce((currentBlocks: any[]) => {
      const currentUrls = extractCloudinaryUrls(currentBlocks);
      const previousUrls = urlsRef.current;

      for (const url of previousUrls) {
        if (!currentUrls.has(url)) {
          // URL disappeared from the document → user deleted the image

          // Look up the file size from our persistent sizeMap
          const fileSize = sizeMap.current.get(url) ?? 0;

          console.log(
            "[image-delete] Detected removal:",
            url,
            "| file_size from sizeMap:", fileSize
          );

          if (fileSize === 0) {
            console.warn(
              "[image-delete] WARNING: file_size is 0 — refund will be skipped by edge function.",
              "This means the image was not uploaded in this session.",
              "Consider storing file sizes in your DB alongside the URL."
            );
          }

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
    <div
      className="h-full w-full overflow-y-auto overflow-x-hidden relative"
      style={{ display: "flex", flexDirection: "column" }}
    >
      <BlockNoteView
        editor={editor}
        theme="dark"
        style={{ minHeight: "100%", width: "100%", backgroundColor: "transparent" }}
        onChange={() => {
          const updatedData = editor.document;

          setNotes((prev: Note[]) =>
            prev.map((n: Note) =>
              n.id === noteId
                ? { ...n, content: "{}", note_data: updatedData }
                : n
            )
          );

          saveContent(noteId, updatedData, note.title);
          detectAndDeleteRemovedImages(updatedData);
        }}
      />
    </div>
  );
}