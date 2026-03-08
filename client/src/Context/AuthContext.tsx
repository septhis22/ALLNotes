import React, { createContext, useContext, useEffect, useState } from "react";
import type { JSX, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

// ── Types ──────────────────────────────────────────────────
export interface UserProfile {
  userName: string;
  email: string;
}

export interface UserDetails {
  userName: string;
  email: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  userId: string;
  setUserId: React.Dispatch<React.SetStateAction<string>>;
  userD: UserDetails;
  setUserD: React.Dispatch<React.SetStateAction<UserDetails>>;
  loading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

// ── Context ────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Provider ───────────────────────────────────────────────
export const AuthProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userId, setUserId] = useState<string>("Guest");
  const [userD, setUserD] = useState<UserDetails>({ userName: "Guest", email: "" });
  const [loading, setLoading] = useState(true);

  const getUserName = (authUser: User | null, authProfile: UserProfile | null): string => {
    const metadata = authUser?.user_metadata as { userName?: string; full_name?: string; name?: string } | undefined;
    return authProfile?.userName ?? metadata?.userName ?? metadata?.full_name ?? metadata?.name ?? "Guest";
  };

  const buildUserDetails = (authUser: User | null, authProfile: UserProfile | null): UserDetails => ({
    userName: getUserName(authUser, authProfile),
    email: authProfile?.email ?? authUser?.email ?? "",
  });

  const applyAuthState = async (newSession: Session | null) => {
    setSession(newSession);

    const authUser = newSession?.user ?? null;
    setUser(authUser);

    if (!authUser) {
      setProfile(null);
      setUserId("Guest");
      setUserD({ userName: "Guest", email: "" });
      setLoading(false);
      return;
    }

    try {
      const fetchedProfile = await fetchProfile(authUser.id);
      setProfile(fetchedProfile);
      setUserId(authUser.id);
      setUserD(buildUserDetails(authUser, fetchedProfile));
    } catch (err) {
      console.error("Error in applyAuthState:", err);
      setUserId(authUser.id);
      setUserD({ userName: authUser.email?.split('@')[0] || "User", email: authUser.email || "" });
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", userId)
        .single();

      if (error) {
        console.warn("Profile fetch error (may not exist yet):", error.message);
        // Return null - user might not have a profile yet
        return null;
      }

      return {
        userName: data?.full_name ?? "Guest",
        email: data?.email ?? "",
      };
    } catch (err) {
      console.error("Profile fetch exception:", err);
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      console.log('🔐 Initializing auth...');
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (error) {
          console.error('Session error:', error);
        }
        
        console.log('📋 Session check result:', session ? 'Found' : 'None');
        
        // Handle session
        const authUser = session?.user ?? null;
        setUser(authUser);
        setSession(session);

        if (authUser) {
          setUserId(authUser.id);
          // Try to fetch profile
          try {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("email, full_name")
              .eq("id", authUser.id)
              .single();
            
            const profile = profileData ? {
              userName: profileData.full_name ?? "Guest",
              email: profileData.email ?? ""
            } : null;
            
            setProfile(profile);
            setUserD({
              userName: profile?.userName ?? authUser.email?.split('@')[0] ?? "User",
              email: profile?.email ?? authUser.email ?? ""
            });
          } catch (profileErr) {
            console.warn('Profile fetch failed:', profileErr);
            setUserD({ 
              userName: authUser.email?.split('@')[0] ?? "User", 
              email: authUser.email ?? "" 
            });
          }
        } else {
          setUserId("Guest");
          setUserD({ userName: "Guest", email: "" });
        }
        
        setLoading(false);
        console.log('✅ Auth initialized, loading set to false');
        
      } catch (err) {
        console.error('Auth init error:', err);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log('🔄 Auth state changed:', _event);
        if (!isMounted) return;
        
        const authUser = session?.user ?? null;
        setUser(authUser);
        setSession(session);
        
        if (authUser) {
          setUserId(authUser.id);
          setUserD({ 
            userName: authUser.email?.split('@')[0] ?? "User", 
            email: authUser.email ?? "" 
          });
        } else {
          setUserId("Guest");
          setUserD({ userName: "Guest", email: "" });
        }
        
        // IMPORTANT: Set loading to false when auth state changes
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

    // Use React.createElement instead of JSX to comply with 'erasableSyntaxOnly'
    return React.createElement(
      AuthContext.Provider,
      {
        value: {
          session,
          user,
          profile,
          userId,
          setUserId,
          userD,
          setUserD,
          loading,
          isAuthenticated: !!user,
          signOut,
        }
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
