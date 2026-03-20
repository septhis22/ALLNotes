import { useEffect } from "react";
// import { NoteEditor } from "../../component/Input/TextInput";
import MyEditor from "../../Editor/blockNote";
import NoteList from "../../component/Sidebar/NoteList";
import Navbar from "../../component/Navbar/Navbar";
import useUpdateProfile from "../../utils/useUserUpdateProfile";
import { useAuthContext } from "../../Context/AuthContext";

export const Home = () => {
  const updateProfile = useUpdateProfile();
  const { userId } = useAuthContext();

  useEffect(() => {
    if (userId && userId !== "Guest") {
      console.log("🏠 Home: Ensuring profile exists for user:", userId);
      updateProfile();
    }
  }, [userId, updateProfile]);

  return (

    <>
    <><Navbar /><div className="flex h-screen">
        <aside className="w-64 bg-gray-900 text-white p-4 ">
          <NoteList />
        </aside>

        <main className="flex-1 p-6 bg-white overflow-visible">
          <MyEditor />
        </main>
      </div></>
    </>
  );
};

export default Home;
