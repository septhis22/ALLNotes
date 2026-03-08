import { useCallback } from "react";
import { useAuthContext } from "../Context/AuthContext";
import { profilesRepository } from "../repositories";

const useUpdateProfile = () => {
    const { userD, setUserD } = useAuthContext();
    
    const updateProfile = useCallback(async (): Promise<any> => {
        if (userD.userName === "Guest") {
            try {
                const profile = await profilesRepository.fetchCurrent();
                
                if (profile) {
                    const temp = { 
                        userName: profile.full_name || profile.email,
                        email: profile.email 
                    };
                    console.log("From the update profile hook",temp);
                    setUserD(temp);
                    return { success: true, data: temp };
                } else {
                    return { error: 'Profile not found' };
                }
            } catch (error) {
                console.error('Error updating profile:', error);

                return { error: error instanceof Error ? error.message : String(error) };
            }
        }
        
        return { success: true, message: 'No update needed' };
    }, [userD, setUserD]);
    
    return updateProfile;
};

export default useUpdateProfile;
