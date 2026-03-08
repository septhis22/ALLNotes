import { create } from 'zustand';

export interface Note {
  [x: string]: string | number | Date;
  synced: any;
  updatedat: string | number | Date;
  id: string;
  title: string;
  content: string;
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
  setNotes: (notes: Note[]) => void;
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
  setNotes: (notes: Note[]) => set({ notes }),
  setUserId: (userId: string) => set({ userId }),
  setUserD: (userD: UserDetails) => set({ userD }),
}));
