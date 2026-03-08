import React, { useCallback, useRef, useEffect, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import debounce from "lodash.debounce";
import { useStore } from "../../store/store";
import { updateNoteById, updateNoteSync } from "../../IndexDB/db";
import autoSync from "../../utils/autoSync";
import Collabdropdown from "../dropdown/Collabdropdown";
import type{ Note } from "../../store/store";


export const NoteEditor = () => {
  const [showAddCollab, setShowAddCollab] = useState<boolean>(false);
  const [content, setContent] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState(false);
  const { userId, id, notes, setNotes } = useStore();

  // Quill modules and formats
  const modules = {
    toolbar: [
      ["bold", "italic", "underline", "strike"],
      ["blockquote", "code-block"],
      [{ header: 1 }, { header: 2 }],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ script: "sub" }, { script: "super" }],
      [{ indent: "-1" }, { indent: "+1" }],
      [{ direction: "rtl" }],
      [{ size: ["small", false, "large", "huge"] }],
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      [{ color: [] }, { background: [] }],
      [{ font: [] }],
      [{ align: [] }],
      ["clean"],
    ]
  };

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "blockquote",
    "code-block",
    "list",
    "bullet",
    "link",
    "image",
  ];

  // Share button handler (stub)
  const handleShareNote = () => {
    setShowAddCollab(!showAddCollab);
  };

  // Generate a title from content
  const generateTitleFromContent = (content: string): string => {
    const match = content.match(/<h[1-2][^>]*>(.*?)<\/h[1-2]>/i);
    if (match && match[1]) return match[1].trim();
    const plainText = content.replace(/<[^>]+>/g, "");
    const words = plainText.trim().split(/\s+/);
    return words.slice(0, 10).join(" ") + (words.length > 10 ? "..." : "");
  };

  // Debounced cloud sync
  const syncToCloud = useCallback(
    debounce(() => {
      autoSync(userId);
    }, 3000),
    []
  );

  // Debounced local save
  const saveContent = useCallback(
    debounce((id: string, content: string, title: string) => {
      updateNoteById(id, { title, content });
      updateNoteSync(id, false);
    }, 200),
    []
  );

  // Handle editor changes
  const handleChange = (value: string) => {
    syncToCloud();
    setContent(value);
    const title = generateTitleFromContent(value ?? "");
    setNotes(notes.map((note: Note) =>
      note.id === id ? { ...note, title, content: value ?? "" } : note
    ));
    saveContent(id, value ?? "", title);
  };

  // Manual sync button
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await autoSync(userId);
      setTimeout(() => setIsSyncing(false), 1000);
    } catch (error) {
      console.error("Sync failed:", error);
      setIsSyncing(false);
    }
  };

  // Update content when id or notes change
  useEffect(() => {
    setContent(notes.find((n) => n.id === id)?.content || "");
  }, [id, notes, saveContent]);

  // Guard: only render when id and notes are available
  if (!id || !notes) {
    return <div>Loading...</div>;
  }

  return (
    <div className="w-full h-screen overflow-y-auto bg-stone-50">
      {/* Custom buttons */}
      <div className="bg-stone-100 border-b border-stone-200 p-3 flex justify-end gap-2 shadow-sm">
        
        {/* Wrap button and dropdown in relative container */}
        <div className="relative">
          <button
            onClick={handleShareNote}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M18,16.08C17.24,16.08 16.56,16.38 16.04,16.85L8.91,12.7C8.96,12.47 9,12.24 9,12C9,11.76 8.96,11.53 8.91,11.3L15.96,7.19C16.5,7.69 17.21,8 18,8A3,3 0 0,0 21,5A3,3 0 0,0 18,2A3,3 0 0,0 15,5C15,5.24 15.04,5.47 15.09,5.7L8.04,9.81C7.5,9.31 6.79,9 6,9A3,3 0 0,0 3,12A3,3 0 0,0 6,15C6.79,15 7.5,14.69 8.04,14.19L15.16,18.34C15.11,18.55 15.08,18.77 15.08,19C15.08,20.61 16.39,21.91 18,21.91C19.61,21.91 20.92,20.61 20.92,19A2.92,2.92 0 0,0 18,16.08Z"/>
            </svg>
            Start Collab
          </button>
          
          {/* Dropdown positioned relative to button */}
          {showAddCollab && (
            <Collabdropdown onClose={() => { setShowAddCollab(false) }} />
          )}
        </div>
        
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-md text-sm font-medium transition-colors"
        >
          {isSyncing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Syncing...
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                <path d="M12,19L8,15H10.5V12H13.5V15H16L12,19Z"/>
              </svg>
              Save to Cloud
            </>
          )}
        </button>
      </div>
  
      {/* Quill Editor Container */}
      <div className="p-6">
        <div className="quill-custom max-w-4xl mx-auto">
          <ReactQuill
            value={content || ""}
            onChange={handleChange}
            modules={modules}
            formats={formats}
            theme="snow"
            placeholder="Start collaborating..."
            style={{ 
              height: "calc(100vh - 180px)",
              backgroundColor: "#fefdfb"
            }}
          />
        </div>
      </div>
    </div>
  );
  
  
  

};
