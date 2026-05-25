import { EmailSearchBar } from '../../component/Input/emailSerachBar';
import { Users } from 'lucide-react';

interface CollabSidebarProps {
  noteId?: string;
  activeUsersCount?: number;
}

export const CollabSidebar = ({ noteId, activeUsersCount = 1 }: CollabSidebarProps) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-4">
        <h2 className="text-lg font-semibold text-white">Collaboration</h2>
        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/20">
          <Users size={14} />
          <span>{activeUsersCount} Online</span>
        </div>
      </div>
      <EmailSearchBar noteId={noteId} />
    </div>
  )
}
