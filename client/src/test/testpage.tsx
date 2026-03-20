import NewSidebar from '../component/Sidebar/newSidebar';
import MyEditor from '../Editor/blockNote';
import Navbar from '../component/Navbar/Navbar';

const Testpage = () => {
  return (
    <div className="flex h-screen w-screen bg-[#191919] text-gray-200 overflow-hidden">
      <aside className="h-full w-[280px] shrink-0 overflow-y-auto overflow-x-hidden bg-[#202020] border-r border-[#2d2d2d] sm:w-[320px]">
        <div className="h-full py-4 pr-2 pl-2">
          <NewSidebar />
        </div>
      </aside>

      <div className="flex flex-col flex-1 overflow-hidden bg-[#191919]">
        <Navbar />
        <main className="flex-1 overflow-hidden relative">
           <MyEditor/>
        </main>
      </div>
    </div>
  )
}

export default Testpage;
