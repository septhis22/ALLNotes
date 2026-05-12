import { create } from 'zustand';

export interface Note {
  userId: string;
  id: string;
  title: string;
  updatedat: string;
  synced: boolean;
  note_data?: any;
}

export interface sharedNote{
  id:string;
  owner:string;
  title:string;
  updatedat:string;
  content?:any;
  createdat:string;
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
  allowed_storage: number;
  sharedNotes: sharedNote[];

  // Actions
  setId: (id: string) => void
  setNotes: (notes: Note[] | ((prevNotes: Note[]) => Note[])) => void;
  setUserId: (userId: string) => void;
  setUserD: (userD: UserDetails) => void;
  setAllowedStorage: (allowed_storage: number) => void;
  setSharedNotes: (sharedNotes: sharedNote[] | ((prevSharedNotes: sharedNote[]) => sharedNote[])) => void;
}

export const useStore = create<GlobalStore>((set) => ({
  // Initial state
  id: '',
  notes: [],
  userId: 'Guest',
  userD: { userName: 'Guest', email: '' },
  allowed_storage: 0,
  sharedNotes: [],
  // Actions
  setId: (id: string) => set({ id }),
  setNotes: (notesOrFn: Note[] | ((prevNotes: Note[]) => Note[])) => 
    set((state) => ({ 
      notes: typeof notesOrFn === 'function' ? notesOrFn(state.notes) : notesOrFn 
    })),
  setUserId: (userId: string) => set({ userId }),
  setUserD: (userD: UserDetails) => set({ userD }),
  setAllowedStorage: (allowed_storage: number) => set({ allowed_storage }),
  setSharedNotes:(sharedNotesOrFn: sharedNote[] | ((prevSharedNotes: sharedNote[]) => sharedNote[])) =>
    set((state) => ({ 
      sharedNotes: typeof sharedNotesOrFn === 'function' ? sharedNotesOrFn(state.sharedNotes) : sharedNotesOrFn 
    })),
}));
