import { useCallback } from "react";
import { useAuthContext } from "../Context/AuthContext";
import { getSupabase } from "../lib/supabase.ts";

const useUpdateProfile = () => {
    const { setUserD } = useAuthContext();

    const updateProfile = useCallback(async (): Promise<any> => {
        const { data: { user } } = await getSupabase().auth.getUser();
        if (!user) return { error: 'No user authenticated' };

        try {
            // Use upsert to ensure profile exists
            const { data: profile, error: upsertError } = await getSupabase()
                .from('profiles')
                .upsert({
                    id: user.id,
                    email: user.email ?? '',
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
                console.log("From the update profile hook", temp);
                setUserD(temp);
                return { success: true, data: temp };
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            return { error: error instanceof Error ? error.message : String(error) };
        }
        
        return { success: true, message: 'Profile ensured' };
    }, [setUserD]);
    
    return updateProfile;
};

export default useUpdateProfile;
