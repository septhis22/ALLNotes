import { useCallback } from "react";
import { useAuthContext } from "../Context/AuthContext";
import { getSupabase } from "../lib/supabase.ts";
import { useStore } from "../store/store";

const useUpdateProfile = () => {
    const { setUserD } = useAuthContext();

    const updateProfile = useCallback(async (): Promise<any> => {
        // Store-first: check if we already have a valid userId
        const storeUserId = useStore.getState().userId;
        let userId: string;
        let userEmail: string;

        if (storeUserId && storeUserId !== 'Guest' && storeUserId !== '') {
            userId = storeUserId;
            userEmail = useStore.getState().userD.email;
        } else {
            const { data: { user } } = await getSupabase().auth.getUser();
            if (!user) return { error: 'No user authenticated' };
            userId = user.id;
            userEmail = user.email ?? '';
            useStore.getState().setUserId(userId);
        }

        try {
            // Use upsert to ensure profile exists
            const { data: profile, error: upsertError } = await getSupabase()
                .from('profiles')
                .upsert({
                    id: userId,
                    email: userEmail,
                    // Keep existing full_name if it exists, otherwise use email as default
                }, { onConflict: 'id' })
                .select('id, email, full_name')
                .single();

            if (upsertError) throw upsertError;

            if (profile) {
                const temp = { 
                    userName: profile.full_name || profile.email || "User",
                    email: profile.email 
                };
                setUserD(temp);
                useStore.getState().setUserD(temp);
                return { success: true, data: temp };
            }
        } catch (error) {
            return { error: error instanceof Error ? error.message : String(error) };
        }
        
        return { success: true, message: 'Profile ensured' };
    }, [setUserD]);
    
    return updateProfile;
};

export default useUpdateProfile;
