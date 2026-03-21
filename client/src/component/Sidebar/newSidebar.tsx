import { File, Folder, FolderOpen, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthContext } from "../../Context/AuthContext";
import { getAllNotes } from "../../IndexDB/db";
import { useStore, type Note } from "../../store/store";
import { createNewNote } from "../../util/createNewNote";
import { syncNotes } from "../../utils/ConflictHandler";
import { useVerifyUser } from "../../utils/verifyUser";

type TreeNode = {
  id: string;
  name: string;
  type: "folder" | "file";
  children?: TreeNode[];
};




const notesToFiles = (notes: Note[], noteType: string): TreeNode[] =>
  notes
    .filter((note) => (note.type ?? "note") === noteType)
    .map((note) => ({
      id: note.id,
      name: note.title,
      type: "file" as const,
    }));

type TreeItemProps = {
  node: TreeNode;
  depth?: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onButtonClick?: (nodeId: string) => void;
};

function TreeItem({ node, depth = 0, selectedId, onSelect, onButtonClick }: TreeItemProps) {
  
  const [open, setOpen] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const isSelected = selectedId === node.id;
  


  if (node.type === "file") {
    return (
      <li className="relative mt-1">
        {depth > 0 && (
          <span className="absolute -left-[11px] top-[14px] w-[11px] h-px bg-[#3f3f3f]" />
        )}
        <div
          onClick={() => onSelect(node.id)}
          className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-sm h-7 transition-colors select-none
            ${isSelected
              ? "bg-[#333333] text-white font-medium"
              : "text-white hover:bg-[#333333]"
            }`}
        >
          <File className="w-4 h-4 text-gray-300 shrink-0" />
          {node.name}
        </div>
      </li>
    );
  }

  return (
    <li className="relative mt-1">
      {depth > 0 && (
        <span className="absolute -left-[11px] top-[14px] w-[11px] h-px bg-[#3f3f3f]" />
      )}
      <div
        className="flex items-center justify-between group px-2 py-1 rounded text-sm h-7 text-white hover:bg-[#333333] transition-colors"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 cursor-pointer select-none flex-1"
        >
          {open
            ? <FolderOpen className="w-4 h-4 text-white shrink-0" />
            : <Folder className="w-4 h-4 text-gray-300 shrink-0" />
          }
          {node.name}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onButtonClick?.(node.id);
          }}
          className={`p-1 rounded hover:bg-[#3f3f3f] transition-colors ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
          title="Add item"
        >
          <Plus className="w-4 h-4 text-gray-300" />
        </button>
      </div>

      <div
        className={`grid transition-all duration-300 ease-in-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <ul className="overflow-hidden ml-[11px] pl-[11px] border-l border-[#3f3f3f]">
          {node.children?.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onButtonClick={onButtonClick}
            />
          ))}
        </ul>
      </div>
    </li>
  );
}






export default function NewSidebar() {
  const verifyUser = useVerifyUser();
  const [selectedId, setSelectedId] = useState<string | null>("button");
  const { notes, setNotes, setId } = useStore();
  const [, setSyncLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { userId, setUserId } = useAuthContext();



  const fetchNotes = useCallback(async () => {
    try {
      const allNotes = await getAllNotes(userId);
      setNotes(allNotes.map((n) => ({ ...n, type: n.type ?? "note" })));
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
  }, [setNotes, userId]);

  useEffect(() => {
    const initializeUser = async () => {
      try {
        setIsLoading(true);
        if (userId === "Guest" || !userId) {
          const verifiedUserId = await verifyUser();
          if (verifiedUserId && verifiedUserId !== "Guest") {
            console.log("User verified:", verifiedUserId);
          } else {
            console.log("No valid user found, staying as Guest");
            setUserId("Guest");
          }
        }
      } catch (error) {
        console.error("Error during user verification:", error);
        setUserId("Guest");
      } finally {
        setIsLoading(false);
      }
    };

    initializeUser();
  }, [verifyUser, userId, setUserId]);

  useEffect(() => {
    if (!isLoading && userId) {
      console.log("Fetching notes for user:", userId);
      fetchNotes();
    }
  }, [isLoading, userId, fetchNotes]);

  useEffect(()=>{
    const Allsync=async()=>{
      console.log('Starting sync for user:', userId);
      if(userId && userId!=="Guest"){
       setSyncLoading(true);
       await syncNotes(userId,setSyncLoading);
       // Fetch notes immediately after sync completes
       fetchNotes();
      }
    }
    if (!isLoading) {
      Allsync();
    }
  },[userId, isLoading, fetchNotes]);



  const handleButtonClick = useCallback(
    (nodeId: string) => {
      createNewNote(
        nodeId === "private" ? "private" : "shared",
        userId,
        setNotes,
        setId
      );
    },
    [userId, setNotes, setId]
  );
  
  

  const privateTree = useMemo<TreeNode[]>(
    () => [
      {
        id: "private",
        name: "Private Files",
        type: "folder",
        children: notesToFiles(notes, "private"),
      },
    ],
    [notes]
  );

  const sharedTree = useMemo<TreeNode[]>(
    () => [
      {
        id: "shared",
        name: "Shared",
        type: "folder",
        children: notesToFiles(notes, "shared"),
      },
    ],
    [notes]
  );

  return (
    <div className="w-full  p-6 bg-transparent shadow-none text-white">
      <ul className="list-none p-0 m-0">
        {privateTree.map((node) => (
          <TreeItem
            key={node.id}
            node={node}
            depth={0}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              if (id !== "private" && id !== "shared") {
                setId(id);
              }
            }}
            onButtonClick={handleButtonClick}
          />
        ))}
      </ul>
      <></>
      <ul className="list-none p-0 m-0">
        {sharedTree.map((node) => (
          <TreeItem
            key={node.id}
            node={node}
            depth={0}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              if (id !== "private" && id !== "shared") {
                setId(id);
              }
            }}
            onButtonClick={handleButtonClick}
          />
        ))}
      </ul>
    </div>
  );
}
