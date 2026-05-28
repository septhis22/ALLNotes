import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { EmailSearchBar } from '../../component/Input/emailSerachBar';

interface ConnectedUser {
  name: string;
  color?: string;
}

interface CollabSidebarProps {
  noteId?: string;
  connectedUsers?: ConnectedUser[];
}

export const CollabSidebar = ({
  noteId,
  connectedUsers = [],
}: CollabSidebarProps) => {
  const [showAddUser, setShowAddUser] = useState(false);

  return (
    <div className="relative flex flex-col items-center gap-3 py-4 px-2 h-full">

      {/* User pills — vertical stack */}
      <div className="flex flex-col items-center gap-2 w-full">
        {connectedUsers.map((user, i) => (
          <div
            key={i}
            className="flex items-center gap-2 w-full px-3 py-2 bg-[#1e1e1e]/80 backdrop-blur-sm border border-[#2a2a2a] rounded-xl"
            title={user.name}
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: user.color ?? '#6366f1' }}
            />
            <span className="text-[13px] text-[#d4d4d4] font-medium truncate">
              {user.name}
            </span>
          </div>
        ))}

        {connectedUsers.length === 0 && (
          <p className="text-[11px] text-[#444444] text-center leading-relaxed px-1">
            No collaborators
          </p>
        )}
      </div>

      {/* Divider */}
      {connectedUsers.length > 0 && (
        <div className="w-full h-px bg-[#2a2a2a]" />
      )}

      {/* Add user button */}
      <button
        onClick={() => setShowAddUser((v) => !v)}
        className={`flex items-center justify-center w-full py-2 rounded-xl border transition-colors text-sm font-medium gap-1.5
          ${showAddUser
            ? 'bg-[#2a2a2a] border-[#3a3a3a] text-white'
            : 'bg-[#1e1e1e]/80 border-[#2a2a2a] text-[#666666] hover:text-white hover:border-[#3a3a3a] hover:bg-[#252525]'
          }`}
        title="Add collaborator"
      >
        <Plus size={15} />
      </button>

      {/* Add user dropdown — pops to the right */}
      {showAddUser && (
        <div className="absolute left-full top-0 ml-3 z-50 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 shadow-xl shadow-black/40 w-[260px]">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#555555]">
              Invite by email
            </p>
            <button
              onClick={() => setShowAddUser(false)}
              className="text-[#555555] hover:text-white transition-colors"
            >
              <X size={13} />
            </button>
          </div>
          <EmailSearchBar noteId={noteId} />
        </div>
      )}
    </div>
  );
};