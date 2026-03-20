import { useEffect, useMemo, useState, useRef } from 'react';
import userIcon from '/user_icon.png';
import { useNavigate } from 'react-router-dom';
import { getSupabase } from '../../lib/supabase';
import { useAuthContext } from '../../Context/AuthContext';
import { useVerifyUser } from '../../utils/verifyUser';
import useUpdateProfile from '../../utils/useUserUpdateProfile';
import type { Note } from '../../store/store';
import { useStore } from '../../store/store';
import { updateNoteById, updateNoteSync } from '../../IndexDB/db';
import autoSync from '../../utils/autoSync';

export const Navbar = () => {
  const { userD, userId, setUserId } = useAuthContext();
  const { id, notes, setNotes } = useStore();
  const navigate = useNavigate();
  const verifyUser = useVerifyUser();
  const updateProfile = useUpdateProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const currentNote = notes.find((n) => n.id === id);
  // Strip any lingering HTML tags if they exist from older implementations (e.g. <h2>Untitled</h2>)
  const displayTitle = useMemo(() => {
    if (!currentNote?.title) return "Notes";
    const plainText = currentNote.title.replace(/<[^>]+>/g, "");
    return plainText.trim() || "Untitled Note";
  }, [currentNote?.title]);

  const handleDoubleClick = () => {
    if (id && currentNote) {
      setEditTitle(displayTitle === "Notes" ? "" : displayTitle);
      setIsEditing(true);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  };

  const handleTitleSubmit = () => {
    setIsEditing(false);
    if (!id || !currentNote) return;

    const newTitle = editTitle.trim() || "Untitled Note";

    if (newTitle !== displayTitle) {
      setNotes((prev: Note[]) => prev.map((n: Note) => 
        n.id === id ? { ...n, title: newTitle } : n
      ));
      
      updateNoteById(id, { title: newTitle });
      updateNoteSync(id, false);
      autoSync(userId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  useEffect(()=>{
    if(userD.userName==="Guest"){
      updateProfile();
    }
    if(userId==="Guest"){
      (async()=>{
        const _uid = await verifyUser();
      setUserId(_uid ?? "Guest");
      })
    }
    console.log("Form navbar: ",userId,userD);
  },[]);

  const handleLogin=()=>{
    navigate('/login');
  }


  const handleProfile=()=>{
    navigate('/profile');
  }

    const handleLogOut=async()=>{
    const { error } = await getSupabase().auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
    } else {
      // Optionally refresh the page or invalidate the cache
      navigate('/');
      window.location.reload();

    }
  }

  return (
    <div className="bg-transparent flex items-center justify-between px-6 py-2 relative z-50 transition-colors gap-4">
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={handleKeyDown}
            className="text-xl font-medium text-white py-1 px-2 border border-[#3f3f3f] bg-[#2f2f2f] rounded outline-none focus:border-emerald-500 w-full max-w-2xl"
          />
        ) : (
          <h2 
            className="text-xl font-medium text-gray-200 py-2 cursor-pointer transition-colors hover:text-white select-none truncate"
            onDoubleClick={handleDoubleClick}
            title={displayTitle}
          >
            {displayTitle}
          </h2>
        )}
      </div>

      {/* User Icon with Dropdown */}
      <div className="relative group shrink-0">
        <img
          src={userIcon}
          alt="User icon"
          className="w-8 h-8 rounded-full cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
        />

        
        <div className="absolute right-0 mt-2 w-40 bg-[#2f2f2f] border border-[#3f3f3f] rounded-md shadow-xl opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-200 z-50">
          <ul className="py-1 text-sm text-gray-200">
            { userId!=="Guest" &&
            <li className="px-4 py-2 hover:bg-[#3f3f3f] cursor-pointer" onClick={handleProfile}>Profile</li>}
            { userId!=="Guest" &&
            <li className="px-4 py-2 hover:bg-[#3f3f3f] cursor-pointer" onClick={handleLogOut}>Logout</li>}
            <li className="px-4 py-2 hover:bg-[#3f3f3f] cursor-pointer" onClick={handleLogin}>Login</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
