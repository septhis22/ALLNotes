import { useEffect, useMemo } from 'react';
import userIcon from '/user_icon.png';
import { useNavigate } from 'react-router-dom';
import { getSupabase } from '../../lib/supabase';
import { useAuthContext } from '../../Context/AuthContext';
import { useVerifyUser } from '../../utils/verifyUser';
import useUpdateProfile from '../../utils/useUserUpdateProfile';
import { useStore } from '../../store/store';

export const Navbar = () => {
  const { userD, userId, setUserId } = useAuthContext();
  const { id, notes } = useStore();
  const navigate = useNavigate();
  const verifyUser = useVerifyUser();
  const updateProfile = useUpdateProfile();

  const currentNote = notes.find((n) => n.id === id);
  // Strip any lingering HTML tags if they exist from older implementations (e.g. <h2>Untitled</h2>)
  const displayTitle = useMemo(() => {
    if (!currentNote?.title) return "Notes";
    const plainText = currentNote.title.replace(/<[^>]+>/g, "");
    return plainText.trim() || "Untitled Note";
  }, [currentNote?.title]);

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
      navigate('/');
      window.location.reload();
    }
  }

  return (
    <div className="bg-transparent flex items-center justify-between px-6 py-2 relative z-50 transition-colors gap-4">
      <div className="flex-1 min-w-0">
        <h2 
          className="text-xl font-medium text-gray-200 py-2 transition-colors hover:text-white select-none truncate"
          title={displayTitle}
        >
          {displayTitle}
        </h2>
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
