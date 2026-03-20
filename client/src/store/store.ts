import { create } from 'zustand';

export interface Note {
  userId: string;
  id: string;
  type: string;
  title: string;
  content: string;
  updatedat: string;
  synced: boolean;
  note_data?: any;
}

export interface UserDetails {
  userName: string;
  email: string;
}

interface GlobalStore {
  // State
  id: string;
  notes: Note[];
  userId: string;
  userD: UserDetails;

  // Actions
  setId: (id: string) => void;
  setNotes: (notes: Note[] | ((prevNotes: Note[]) => Note[])) => void;
  setUserId: (userId: string) => void;
  setUserD: (userD: UserDetails) => void;
}

export const useStore = create<GlobalStore>((set) => ({
  // Initial state
  id: '',
  notes: [],
  userId: 'Guest',
  userD: { userName: 'Guest', email: '' },

  // Actions
  setId: (id: string) => set({ id }),
  setNotes: (notesOrFn: Note[] | ((prevNotes: Note[]) => Note[])) => 
    set((state) => ({ 
      notes: typeof notesOrFn === 'function' ? notesOrFn(state.notes) : notesOrFn 
    })),
  setUserId: (userId: string) => set({ userId }),
  setUserD: (userD: UserDetails) => set({ userD }),
}));
