import { File, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthContext } from "../../Context/AuthContext";
import { InputTheTitle } from "../Input/inputTheTitle";
import { getAllNotes } from "../../IndexDB/db";
import { useStore, type Note } from "../../store/store";
import { createNewNote } from "../../createNewNote";
import { syncNotes } from "../../utils/ConflictHandler";
import { useVerifyUser } from "../../utils/verifyUser";
import { SharedNotesRepository } from "../../repositories/shared_notes.repositories";
import { deleteNoteCloud } from "../../utils/deleteNote";
import { deleteNoteById } from "../../IndexDB/db";
import { useNavigate } from 'react-router-dom';
import { getSupabase } from '../../lib/supabase';
import useUpdateProfile from '../../utils/useUserUpdateProfile';
import userIcon from '/user_icon.png';

const fetchSharedNote = async (userId: string, setSharedNotes: any) => {
  try {
    const ownedSharedNotes = await SharedNotesRepository.fetchSharedNotes(userId);
    const collabNotes = await SharedNotesRepository.fetchCollaboratorNotes(userId);
    const allSharedNotes = [...ownedSharedNotes, ...collabNotes].map(note => ({
      id: note.id,
      owner: note.owner_id,
      title: note.title,
      updatedat: note.updated_at,
      content: note.content,
      createdat: note.created_at
    }));
    setSharedNotes(allSharedNotes);
  } catch (error) {
    console.error("Error fetching shared notes:", error);
  }
};

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ label, onAdd }: { label: string; onAdd: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="flex items-center justify-between px-3 mt-5 mb-1 first:mt-0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-gray-400">
        {label}
      </span>
      <button
        onClick={onAdd}
        className={`bg-transparent border-none cursor-pointer px-1 py-0.5 rounded flex items-center text-gray-400 transition-opacity duration-150 ${hovered ? "opacity-100" : "opacity-0"}`}
        title={`Add to ${label}`}
      >
        <Plus size={13} />
      </button>
    </div>
  );
}

// ── Single note row ────────────────────────────────────────────────────────────
function NoteRow({
  title,
  isSelected,
  isShared,
  onClick,
  onDelete,
}: {
  id: string;
  title: string;
  isSelected: boolean;
  isShared: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group flex items-center gap-[9px] w-full px-3 py-1.5 border-none rounded-lg text-left mb-[1px] transition-colors duration-150 box-border relative ${isSelected ? "bg-[#232323]" : hovered ? "bg-[#1a1a1a]" : "bg-transparent"}`}
    >
      <button onClick={onClick} className="flex-1 flex items-center gap-[9px] bg-transparent border-none outline-none cursor-pointer overflow-hidden p-0">
        <File
          size={14}
          className={`shrink-0 transition-colors duration-150 ${isSelected ? (isShared ? "text-pink-400" : "text-purple-400") : "text-gray-500"}`}
        />
        <span
          className={`text-[13px] whitespace-nowrap overflow-hidden text-ellipsis flex-1 text-left transition-colors duration-150 font-inherit ${isSelected ? "font-medium text-white" : hovered ? "text-gray-300" : "text-gray-400"}`}
        >
          {title || "Untitled"}
        </span>
      </button>

      {hovered && (
        <button
          onClick={onDelete}
          className="bg-transparent border-none cursor-pointer p-1 text-gray-500 hover:text-red-400 transition-colors"
          title="Delete note"
        >
          <Trash2 size={13} />
        </button>
      )}

      {(!hovered && isSelected) && (
        <span
          className={`w-[5px] h-[5px] rounded-full shrink-0 transition-colors duration-150 ${isShared ? "bg-pink-400" : "bg-purple-400"}`}
        />
      )}
    </div>
  );
}

// ── Main sidebar ───────────────────────────────────────────────────────────────
export default function NewSidebar() {
  const verifyUser = useVerifyUser();
  const updateProfile = useUpdateProfile();
  const navigate = useNavigate();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { notes, setNotes, setId, sharedNotes, setSharedNotes } = useStore();
  const [, setSyncLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { userId, setUserId, userD } = useAuthContext();

  const [showTitleInput, setShowTitleInput] = useState(false);
  const [pendingNodeId, setPendingNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (userD?.userName === "Guest") updateProfile();
  }, [userD?.userName, updateProfile]);

  const handleLogOut = async () => {
    const { error } = await getSupabase().auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
    } else {
      navigate('/');
      window.location.reload();
    }
  };

  const fetchNotes = useCallback(async () => {
    try {
      const allNotes = await getAllNotes(userId);
      setNotes(allNotes.map(n => ({ ...n })));
      if (userId && userId !== "Guest") {
        await fetchSharedNote(userId, setSharedNotes);
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
  }, [setNotes, userId, setSharedNotes]);

  useEffect(() => {
    const initializeUser = async () => {
      try {
        setIsLoading(true);
        if (userId === "Guest" || !userId) {
          const verifiedUserId = await verifyUser();
          if (!verifiedUserId || verifiedUserId === "Guest") setUserId("Guest");
        }
      } catch {
        setUserId("Guest");
      } finally {
        setIsLoading(false);
      }
    };
    initializeUser();
  }, [verifyUser, userId, setUserId]);

  useEffect(() => {
    if (!isLoading && userId) fetchNotes();
  }, [isLoading, userId, fetchNotes]);

  useEffect(() => {
    const Allsync = async () => {
      if (userId && userId !== "Guest") {
        setSyncLoading(true);
        await syncNotes(userId, setSyncLoading);
        fetchNotes();
      }
    };
    if (!isLoading) Allsync();
  }, [userId, isLoading, fetchNotes]);

  const handleAddNote = useCallback(
    (section?: string) => {
      if (section === "shared") {
        setPendingNodeId("shared");
        setShowTitleInput(true);
      } else {
        createNewNote(userId, setNotes, setId);
      }
    },
    [userId, setNotes, setId]
  );

  const handleTitleSubmit = async (title: string) => {
    setShowTitleInput(false);
    if (pendingNodeId === "shared") {
      try {
        const newNote = await SharedNotesRepository.createNewSharedNote(userId, title);
        if (newNote) {
          setSharedNotes((prev: any) => [
            ...prev,
            {
              id: newNote.id,
              owner: newNote.owner_id,
              title: newNote.title,
              updatedat: newNote.updated_at,
              content: newNote.content,
              createdat: newNote.created_at,
            },
          ]);
        }
      } catch (error) {
        console.error("Error creating shared note:", error);
      }
    }
    setPendingNodeId(null);
  };

  const handleTitleClose = () => {
    setShowTitleInput(false);
    setPendingNodeId(null);
  };

  const filteredPrivate = useMemo(
    () => notes.filter(n => n.title?.toLowerCase().includes(search.toLowerCase())),
    [notes, search]
  );
  const filteredShared = useMemo(
    () => sharedNotes.filter(n => n.title?.toLowerCase().includes(search.toLowerCase())),
    [sharedNotes, search]
  );

  const handleSelect = (id: string, isShared: boolean) => {
    setSelectedId(id);
    if (isShared) {
      window.open(`/shared?id=${id}`, "_blank");
    } else {
      setId(id);
    }
  };

  const handleDelete = async (e: React.MouseEvent, noteId: string, isShared: boolean) => {
    e.stopPropagation();
    
    // Save previous state for rollback
    const prevNotes = [...notes];
    const prevSharedNotes = [...sharedNotes];
    
    // Optimistic UI updates
    if (isShared) {
      setSharedNotes(sharedNotes.filter(n => n.id !== noteId));
    } else {
      setNotes(notes.filter(n => n.id !== noteId));
      if (selectedId === noteId) setId("");
      // Local delete
      try { await deleteNoteById(noteId); } catch {}
    }

    // Call Cloud deletion edge function
    try {
      await deleteNoteCloud({ note_id: noteId, note_type: isShared ? "shared" : "private" });
    } catch (err) {
      console.error("Deletion failed, reverting:", err);
      // Rollback UI
      if (isShared) {
        setSharedNotes(prevSharedNotes);
      } else {
        setNotes(prevNotes);
        // We'd have to re-add to indexdb technically, but since sync happens
        // it may pull it down or the user can refresh
      }
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-transparent text-white overflow-hidden py-4 px-2 box-border">
      {/* ── Search bar ── */}
      <div className="flex items-center gap-2 bg-[#181818] border border-[#2a2a2a] rounded-[9px] py-[7px] px-[11px] mb-2 shrink-0">
        <Search size={13} className="text-gray-400 shrink-0" />
        <input
          type="text"
          placeholder="Search notes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-[12.5px] text-gray-200 flex-1 font-inherit placeholder-gray-500"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="bg-transparent border-none cursor-pointer text-gray-400 p-0 text-base leading-none flex items-center hover:text-white"
          >
            ×
          </button>
        )}
      </div>

      {/* ── Note lists ── */}
      <div className="flex-1 overflow-y-auto pr-[2px]">
        {/* Private notes */}
        <SectionHeader label="Private Notes" onAdd={() => handleAddNote("private")} />
        {filteredPrivate.length === 0 ? (
          <p className="text-[12px] text-gray-500 px-3 py-1 m-0">
            No notes yet
          </p>
        ) : (
          filteredPrivate.map(note => (
            <NoteRow
              key={note.id}
              id={note.id}
              title={note.title}
              isSelected={selectedId === note.id}
              isShared={false}
              onClick={() => handleSelect(note.id, false)}
              onDelete={(e) => handleDelete(e, note.id, false)}
            />
          ))
        )}

        {/* Shared notes */}
        <SectionHeader label="Shared Notes" onAdd={() => handleAddNote("shared")} />
        {filteredShared.length === 0 ? (
          <p className="text-[12px] text-gray-500 px-3 py-1 m-0">
            No shared notes
          </p>
        ) : (
          filteredShared.map(note => (
            <NoteRow
              key={note.id}
              id={note.id}
              title={note.title}
              isSelected={selectedId === note.id}
              isShared={true}
              onClick={() => handleSelect(note.id, true)}
              onDelete={(e) => handleDelete(e, note.id, true)}
            />
          ))
        )}
      </div>

      {/* ── Title input modal ── */}
      {showTitleInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <InputTheTitle onSubmit={handleTitleSubmit} onClose={handleTitleClose} />
        </div>
      )}

      {/* ── Footer ── */}
      <div className="mt-auto pt-3 border-t border-[#222] flex items-center gap-[10px] shrink-0">
        {/* Avatar */}
        <img
          src={userIcon}
          alt="User icon"
          onClick={() => navigate(userId === "Guest" ? '/login' : '/profile')}
          className="w-8 h-8 rounded-full cursor-pointer opacity-85 shrink-0 border border-[#2a2a2a] object-cover"
        />

        {/* Name + email */}
        <div className="flex-1 min-w-0">
          <p className="m-0 text-[13px] font-medium text-gray-200 whitespace-nowrap overflow-hidden text-ellipsis leading-[1.3]">
            {userD?.userName ?? "Guest"}
          </p>
          <p className="m-0 text-[11px] text-gray-400 whitespace-nowrap overflow-hidden text-ellipsis leading-[1.3]">
            {userId === "Guest" ? "Not signed in" : (userD?.email ?? "")}
          </p>
        </div>

        {/* Logout / Login */}
        {userId !== "Guest" ? (
          <button
            onClick={handleLogOut}
            className="shrink-0 px-3 py-[5px] rounded-lg text-xs font-medium cursor-pointer bg-[#1c1010] text-red-400 border border-[#3a1a1a] font-inherit"
          >
            Logout
          </button>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="shrink-0 px-3 py-[5px] rounded-lg text-xs font-medium cursor-pointer bg-[#101520] text-blue-400 border border-[#1a2a40] font-inherit"
          >
            Login
          </button>
        )}
      </div>
    </div>
  );
}