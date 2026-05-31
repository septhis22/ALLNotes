import { File, Plus, Search, Trash2, Pencil, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthContext } from "../../Context/AuthContext";
import { InputTheTitle } from "../Input/inputTheTitle";
import { getAllNotes } from "../../IndexDB/db";
import { useStore } from "../../store/store";
import { createNewNote } from "../../createNewNote";
import { syncNotes } from "../../utils/ConflictHandler";
import { useVerifyUser } from "../../utils/verifyUser";
import { SharedNotesRepository } from "../../repositories/shared_notes.repositories";
import { noteCollaboratorsRepository } from "../../repositories";
import { deleteNoteCloud } from "../../utils/deleteNote";
import { deleteNoteById } from "../../IndexDB/db";
import { useNavigate } from 'react-router-dom';
import { getSupabase } from '../../lib/supabase';
import useUpdateProfile from '../../utils/useUserUpdateProfile';
import userIcon from '/user_icon.png';
import { profilesRepository } from "../../repositories";






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

// ── Read-only section label (no add button) ────────────────────────────────────
function SectionLabel({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 px-3 mt-5 mb-1">
      {icon}
      <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-gray-400">
        {label}
      </span>
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
  onDelete?: (e: React.MouseEvent) => void;
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

      {hovered && onDelete && (
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
  const { notes, setNotes, setId, sharedNotes, setSharedNotes, allSharedGroups, setAllSharedGroups } = useStore();
  const [, setSyncLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { userId, setUserId, userD } = useAuthContext();


  const [showTitleInput, setShowTitleInput] = useState(false);
  const [pendingNodeId, setPendingNodeId] = useState<string | null>(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    if (userD?.userName === "Guest") updateProfile();
  }, [userD?.userName, updateProfile]);

  const handleLogOut = async () => {
    const { error } = await getSupabase().auth.signOut();
    if (error) {} else {
      navigate('/');
      window.location.reload();
    }
  };

  const fetchNotes = useCallback(async () => {
    try {
      const allNotes = await getAllNotes(userId);
      setNotes(allNotes.map(n => ({ ...n })));
      if (userId && userId !== "Guest") {
        try {
          const groups = await noteCollaboratorsRepository.getAllSharedNote(userId);
          setAllSharedGroups(groups);
        } catch (err) {}
      }
    } catch (error) {}
  }, [setNotes, userId]);

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
      } catch (error) {}
    }
    setPendingNodeId(null);
  };

  const handleTitleClose = () => {
    setShowTitleInput(false);
    setPendingNodeId(null);
  };

  const handleNameUpdate = async () => {
    if (!userId || userId === "Guest") {
      setIsEditingName(false);
      return;
    }
    if (!editName.trim() || editName === userD?.userName) {
      setIsEditingName(false);
      return;
    }
    try {
      await profilesRepository.updateCurrentUserName(editName);
      updateProfile();
    } catch (error) {}
    setIsEditingName(false);
  };

  const filteredPrivate = useMemo(
    () => notes.filter(n => n.title?.toLowerCase().includes(search.toLowerCase())),
    [notes, search]
  );
  // Split allSharedGroups into my notes vs others' notes based on email
  const myEmail = userD?.email?.toLowerCase() || '';

  const filteredMyShared = useMemo(() => {
    const myGroup = allSharedGroups.find(g => g.owner_email.toLowerCase() === myEmail);
    if (!myGroup) return [];
    if (!search) return myGroup.notes;
    const q = search.toLowerCase();
    return myGroup.notes.filter(n => n.title?.toLowerCase().includes(q));
  }, [allSharedGroups, myEmail, search]);

  const filteredByOthers = useMemo(() => {
    return allSharedGroups
      .filter(group => group.owner_email.toLowerCase() !== myEmail)
      .map(group => {
        if (!search) return group;
        const q = search.toLowerCase();
        return { ...group, notes: group.notes.filter(n => n.title?.toLowerCase().includes(q)) };
      })
      .filter(group => group.notes.length > 0);
  }, [allSharedGroups, myEmail, search]);

  const handleSelect = (id: string, isShared: boolean) => {
    setSelectedId(id);
    if (isShared) {
      setId(`shared:${id}`);
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

        {/* Shared notes (my own) */}
        <SectionHeader label="Shared Notes" onAdd={() => handleAddNote("shared")} />
        {filteredMyShared.length === 0 ? (
          <p className="text-[12px] text-gray-500 px-3 py-1 m-0">
            No shared notes
          </p>
        ) : (
          filteredMyShared.map(note => (
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

        {/* Shared by others */}
        <SectionLabel label="Shared By Others" icon={<Users size={11} className="text-gray-400" />} />
        {filteredByOthers.length === 0 ? (
          <p className="text-[12px] text-gray-500 px-3 py-1 m-0">
            No notes shared with you
          </p>
        ) : (
          filteredByOthers.map(group => (
            <div key={group.owner_email} className="mb-2">
              {/* Owner name sub-header */}
              <div className="flex items-center gap-1.5 px-4 pt-2 pb-0.5">
                <span className="w-[6px] h-[6px] rounded-full bg-cyan-500/60 shrink-0" />
                <span className="text-[11px] font-medium text-cyan-400/80 tracking-wide">
                  {group.owner_name || group.owner_email}
                </span>
              </div>
              {/* Notes under this owner */}
              {group.notes.map(note => (
                <NoteRow
                  key={note.id}
                  id={note.id}
                  title={note.title}
                  isSelected={selectedId === note.id}
                  isShared={true}
                  onClick={() => handleSelect(note.id, true)}
                />
              ))}
            </div>
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
          {!isEditingName ? (
            <div className="flex items-center gap-1">
              <p className="m-0 text-[13px] font-medium text-gray-200 whitespace-nowrap overflow-hidden text-ellipsis leading-[1.3]">
                {userD?.userName ?? "Guest"}
              </p>
              {userId !== "Guest" && (
                <button
                  onClick={() => {
                    setEditName(userD?.userName ?? "");
                    setIsEditingName(true);
                  }}
                  className="bg-transparent border-none cursor-pointer p-0 text-gray-500 hover:text-white shrink-0 flex items-center"
                >
                  <Pencil size={11} />
                </button>
              )}
            </div>
          ) : (
            <input
              autoFocus
              className="w-full bg-[#181818] text-white text-[13px] border border-[#2a2a2a] rounded px-1 outline-none mb-1 font-inherit"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleNameUpdate}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNameUpdate();
                if (e.key === "Escape") setIsEditingName(false);
              }}
            />
          )}
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