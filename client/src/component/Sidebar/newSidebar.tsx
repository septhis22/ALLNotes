import { File, Folder, FolderOpen, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthContext } from "../../Context/AuthContext";
import { getAllNotes } from "../../IndexDB/db";
import { useStore, type Note } from "../../store/store";
import { createNewNote } from "../../util/createNewNote";


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
          <span className="absolute -left-[11px] top-[14px] w-[11px] h-px bg-zinc-200" />
        )}
        <div
          onClick={() => onSelect(node.id)}
          className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-sm h-7 transition-colors select-none
            ${isSelected
              ? "bg-zinc-100 text-zinc-900 font-medium"
              : "text-zinc-900 hover:bg-zinc-100"
            }`}
        >
          <File className="w-4 h-4 text-zinc-500 shrink-0" />
          {node.name}
        </div>
      </li>
    );
  }

  return (
    <li className="relative mt-1">
      {depth > 0 && (
        <span className="absolute -left-[11px] top-[14px] w-[11px] h-px bg-zinc-200" />
      )}
      <div
        className="flex items-center justify-between group px-2 py-1 rounded text-sm h-7 text-zinc-900 hover:bg-zinc-100 transition-colors"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 cursor-pointer select-none flex-1"
        >
          {open
            ? <FolderOpen className="w-4 h-4 text-zinc-900 shrink-0" />
            : <Folder className="w-4 h-4 text-zinc-500 shrink-0" />
          }
          {node.name}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onButtonClick?.(node.id);
          }}
          className={`p-1 rounded hover:bg-zinc-200 transition-colors ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
          title="Add item"
        >
          <Plus className="w-4 h-4 text-zinc-600" />
        </button>
      </div>

      <div
        className={`grid transition-all duration-300 ease-in-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <ul className="overflow-hidden ml-[11px] pl-[11px] border-l border-zinc-200">
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
  const [selectedId, setSelectedId] = useState<string | null>("button");
  const { userId } = useAuthContext();
  const { notes, setNotes, setId } = useStore();

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



  const fetchNotes = useCallback(async () => {
    try {
      const allNotes = await getAllNotes(userId);
      setNotes(allNotes.map((n) => ({ ...n, type: n.type ?? "note" })));
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
  }, [setNotes, userId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

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
    <div className="w-80 border border-zinc-200 rounded-lg p-6 bg-white shadow-sm">
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
