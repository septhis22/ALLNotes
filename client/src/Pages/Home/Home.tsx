import { useEffect, useState } from 'react';
import NewSidebar from '../../component/Sidebar/newSidebar';
import MyEditor from '../../Editor/blockNote';
import ReadOnlyEditor from '../../Editor/previewText';
import { useStore } from '../../store/store';
import { SharedNotesRepository } from '../../repositories/shared_notes.repositories';

/**
 * Convert a hex-encoded bytea string (e.g. "\\x0a1b2c...")
 * into a Uint8Array that Yjs can consume.
 */
function hexToUint8Array(hex: string): Uint8Array {
  const clean = hex.replace(/^\\\\x/, '').replace(/^\\x/, '');
  const bytes = clean.match(/.{1,2}/g);
  if (!bytes) return new Uint8Array();
  return new Uint8Array(bytes.map(b => parseInt(b, 16)));
}

const Testpage = () => {
  const { id, allSharedGroups, sharedNotes } = useStore();
  const isShared = id.startsWith('shared:');
  const sharedNoteId = isShared ? id.slice('shared:'.length) : null;

  const [sharedContent, setSharedContent] = useState<Uint8Array | null>(null);
  const [loadingShared, setLoadingShared] = useState(false);

  // Fetch the shared note content when a shared note is selected
  useEffect(() => {
    if (!sharedNoteId) {
      setSharedContent(null);
      return;
    }

    // Try to find the content in the global state first
    let cachedContent: any = null;
    
    // Check if it's my shared note
    const mySharedNote = sharedNotes.find(n => n.id === sharedNoteId);
    if (mySharedNote?.content) cachedContent = mySharedNote.content;

    // Check if it's in shared by others
    if (!cachedContent) {
      for (const group of allSharedGroups) {
        const matchingNote = group.notes.find(n => n.id === sharedNoteId);
        if (matchingNote?.content) {
          cachedContent = matchingNote.content;
          break;
        }
      }
    }

    // Use cached content immediately if available
    if (cachedContent) {
      const bytes = typeof cachedContent === 'string'
        ? hexToUint8Array(cachedContent)
        : new Uint8Array(cachedContent);
      setSharedContent(bytes);
    } else {
      setSharedContent(null);
    }

    let cancelled = false;
    setLoadingShared(!cachedContent);

    // Then try fetching it from DB to get latest
    SharedNotesRepository.fetchById(sharedNoteId).then(note => {
      if (cancelled) return;
      if (note?.content) {
        const bytes = typeof note.content === 'string'
          ? hexToUint8Array(note.content)
          : new Uint8Array(note.content);
        setSharedContent(bytes);
      } else if (!cachedContent) {
        setSharedContent(null);
      }
    }).catch(err => {
      if (!cancelled) console.error('Failed to load shared note:', err);
    }).finally(() => {
      if (!cancelled) setLoadingShared(false);
    });

    return () => { cancelled = true; };
  }, [sharedNoteId]);

  return (
    <div className="flex h-screen w-screen bg-[#191919] text-gray-200 overflow-hidden">
      <aside className="h-full w-[280px] shrink-0 overflow-y-auto overflow-x-hidden bg-[#202020] border-r border-[#2d2d2d] sm:w-[320px]">
        <div className="h-full py-4 pr-2 pl-2">
          <NewSidebar />
        </div>
      </aside>

      <div className="flex flex-col flex-1 overflow-hidden bg-[#191919]">
        <main className="flex-1 overflow-hidden relative">
          {isShared ? (
            // Shared note → read-only preview
            loadingShared ? (
              <div className="flex items-center justify-center h-full text-[#555555] text-sm">
                Loading preview…
              </div>
            ) : sharedContent ? (
              <ReadOnlyEditor
                key={sharedNoteId}
                data={sharedContent}
                editUrl={`/shared?id=${sharedNoteId}`}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <p className="text-[#555555] text-sm">No content to preview yet</p>
                <button
                  onClick={() => window.open(`/shared?id=${sharedNoteId}`, '_blank', 'noopener,noreferrer')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg border text-sm font-medium transition-all duration-150
                    bg-[#6366f1]/10 border-[#6366f1]/30 text-[#818cf8] hover:bg-[#6366f1]/20 hover:border-[#6366f1]/50"
                >
                  Open in Collaborative Editor
                </button>
              </div>
            )
          ) : (
            // Private note → full editor
            <MyEditor />
          )}
        </main>
      </div>
    </div>
  );
};

export default Testpage;
