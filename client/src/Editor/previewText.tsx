'use client';

import { useMemo } from 'react';
import { BlockNoteView } from '@blocknote/mantine';
import { useCreateBlockNote } from '@blocknote/react';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import * as Y from 'yjs';
import { Pencil, FileText } from 'lucide-react';

function toUint8Array(data: Uint8Array | string): Uint8Array {
  if (data instanceof Uint8Array) return data;
  const hex = data.startsWith('\\x') ? data.slice(2) : data;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

const makeProvider = (doc: Y.Doc) => ({
  awareness: {
    getStates: () => new Map(),
    setLocalStateField: () => {},
    getLocalState: () => ({}),
    on: () => {},
    off: () => {},
    doc,
  },
});

/**
 * Check whether a Yjs XmlFragment is "empty" — i.e. it has no child
 * elements, or every child is an empty paragraph with no text content.
 */
function isFragmentEmpty(fragment: Y.XmlFragment): boolean {
  if (fragment.length === 0) return true;

  // Walk every top-level XML element in the fragment
  for (let i = 0; i < fragment.length; i++) {
    const child = fragment.get(i);
    // If it's a text node with content, not empty
    if (child instanceof Y.XmlText) {
      if (child.toString().trim().length > 0) return false;
    }
    // If it's an element, check if it has any text content
    if (child instanceof Y.XmlElement) {
      if (child.toString().trim().length > 0) return false;
    }
  }
  return true;
}

interface ReadOnlyEditorProps {
  data: Uint8Array | string;
  editUrl?: string;
  onEdit?: () => void;
}

function ReadOnlyEditorInner({ doc, fragment, editUrl, onEdit, isEmpty }: {
  doc: Y.Doc;
  fragment: Y.XmlFragment;
  editUrl?: string;
  onEdit?: () => void;
  isEmpty: boolean;
}) {
  const editor = useCreateBlockNote({
    collaboration: {
      provider: makeProvider(doc) as any,
      fragment,
      user: { name: '', color: 'transparent' },
    },
  });

  const handleEdit = () => {
    if (editUrl) window.open(editUrl, '_blank', 'noopener,noreferrer');
    onEdit?.();
  };

  // ── Empty document state ──────────────────────────────────────────────────
  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full min-h-screen bg-[#191919]">
        <div className="flex flex-col items-center gap-4">
          <FileText size={36} className="text-[#333]" />
          <p className="text-[#555] text-sm tracking-wide">
            Note is currently empty, click on edit to open the editor.
          </p>
          <button
            onClick={handleEdit}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border text-[13px] font-medium transition-all duration-150 bg-[#6366f1]/10 border-[#6366f1]/30 text-[#818cf8] hover:bg-[#6366f1]/20 hover:border-[#6366f1]/50"
          >
            <Pencil size={13} />
            Edit
          </button>
        </div>
      </div>
    );
  }

  // ── Normal preview ────────────────────────────────────────────────────────
  return (
    <div className="relative flex flex-col w-full min-h-screen bg-[#191919]">

      {/* ── Floating Edit button — fixed top-right, no navbar ── */}
      <button
        onClick={handleEdit}
        className="fixed top-4 right-5 z-50 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-[13px] font-medium transition-all duration-150 bg-[#1a1a1a]/80 backdrop-blur-sm border-[#2a2a2a] text-[#818cf8] hover:bg-[#6366f1]/20 hover:border-[#6366f1]/50 shadow-lg"
      >
        <Pencil size={13} />
        Edit
      </button>

      {/* ── Editor content — mirrors main page layout ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-[900px] mx-auto pt-16 pb-24 px-8">
          <BlockNoteView
            editor={editor}
            theme="dark"
            editable={false}
          />
        </div>
      </div>

    </div>
  );
}

export const ReadOnlyEditor = ({ data, editUrl, onEdit }: ReadOnlyEditorProps) => {
  const { doc, fragment, snapshotKey, isEmpty } = useMemo(() => {
    const d = new Y.Doc();
    const bytes = toUint8Array(data);
    Y.applyUpdate(d, bytes);
    const frag = d.getXmlFragment('document-store');
    return {
      doc: d,
      fragment: frag,
      snapshotKey: crypto.randomUUID(),
      isEmpty: isFragmentEmpty(frag),
    };
  }, [data]);

  return (
    <ReadOnlyEditorInner
      key={snapshotKey}
      doc={doc}
      fragment={fragment}
      editUrl={editUrl}
      onEdit={onEdit}
      isEmpty={isEmpty}
    />
  );
};

export default ReadOnlyEditor;