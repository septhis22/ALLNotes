import NewSidebar from '../component/Sidebar/newSidebar';
import MyEditor from '../Editor/blockNote';
import Navbar from '../component/Navbar/Navbar';

const Testpage = () => {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <aside className="h-full w-[280px] shrink-0 overflow-y-auto overflow-x-hidden border-r border-stone-200 bg-stone-50 sm:w-[320px]">
          <div className="h-full p-4">
            <NewSidebar />
          </div>
        </aside>

        <main className="h-full flex-1 overflow-hidden bg-white">
           <MyEditor/>
        </main>
      </div>
    </div>
  )
}

export default Testpage;
