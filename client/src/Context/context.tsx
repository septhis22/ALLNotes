import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { type Note } from '../store/store';

interface userDetails{
  userName:string;
  email:string;
}

// Define the shape of your context
interface GlobalContextType {
  id: string;
  setId: React.Dispatch<React.SetStateAction<string>>;
  notes:Note[];
  setNotes:React.Dispatch<React.SetStateAction<Note[]>>;
  userId:string;
  setUserId:React.Dispatch<React.SetStateAction<string>>;
  userD:userDetails;
  setUserD:React.Dispatch<React.SetStateAction<userDetails>>
}

// Create the context with a default value
export const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

// Create a provider component
interface GlobalContextProviderProps {
  children: ReactNode;
}

export const GlobalContextProvider: React.FC<GlobalContextProviderProps> = ({ children }) => {
  const [id, setId] = useState<string>("");
  const [notes,setNotes] = useState<Note[]>([]);
  const[userId,setUserId] = useState<string>("Guest"); // later change that to null 
  const [userD,setUserD] = useState<userDetails>({userName:"Guest",email:""})

  const value = {
    id,
    setId,
    notes,
    setNotes,
    userId,
    setUserId,
    userD,
    setUserD
  };

  return (
    <GlobalContext.Provider value={value}>
      {children}
    </GlobalContext.Provider>
  );
};

// Custom hook to use the context
export const useGlobalContext = (): GlobalContextType => {
  const context = useContext(GlobalContext);
  
  if (context === undefined) {
    throw new Error('useGlobalContext must be used within a GlobalContextProvider');
  }
  
  return context;
};