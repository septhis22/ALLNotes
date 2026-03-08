import React, { createContext, useContext, useEffect, useState } from "react";
import type { JSX, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

// ── Types ──────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  email: string;
  company_name?: string;        // was full_name — matches your profiles table
  wallet_address?: string;      // added
  avatar_url?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

// ── Context ────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Provider ───────────────────────────────────────────────
export const AuthProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, company_name, wallet_address, avatar_url") // removed full_name, added company_name + wallet_address
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Failed to fetch profile:", error.message);
      return null;
    }

    return data as UserProfile;
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const prof = await fetchProfile(session.user.id);
        setProfile(prof);

      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          const prof = await fetchProfile(session.user.id);
          setProfile(prof);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

    // Use React.createElement instead of JSX to comply with 'erasableSyntaxOnly'
    return React.createElement(
      AuthContext.Provider,
      {
        value: { session, user, profile, loading, isAuthenticated: !!session, signOut }
      },
      children
    );
  };


// ── Hook ───────────────────────────────────────────────────
export const useAuthContext = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used inside <AuthProvider>");
  return ctx;
};