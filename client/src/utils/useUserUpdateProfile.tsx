import { useCallback } from "react";
import getAuthToken from "./getToken";
import { useStore } from "../store/store";
import axios from "axios";

const useUpdateProfile = () => {
    const { userD, setUserD } = useStore();
    
    const updateProfile = useCallback(async (): Promise<any> => {
        const token = getAuthToken();
        
        if (!token) {
            console.warn('No authentication token found');
            return { error: 'No authentication token' };
        }
        
        if (userD.userName === "Guest") {
            try {
                const response = await axios.get('http://localhost:8080/getProfile', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response && response.data && response.data.success) {
                    // Access user data from the nested structure
                    const userData = response.data.user;
                    const temp = { 
                        userName: userData.full_name || userData.email, // Fallback to email if no full_name
                        email: userData.email 
                    };
                    console.log("From the update profile hook",temp);
                    setUserD(temp);
                    return { success: true, data: temp };
                } else {
                    return { error: 'Invalid response structure' };
                }
            } catch (error) {
                console.error('Error updating profile:', error);
                
                // Handle different error types
                if (axios.isAxiosError(error)) {
                    const errorMessage = error.response?.data?.error || error.message;
                    return { error: errorMessage };
                }
                
                return { error: error instanceof Error ? error.message : String(error) };
            }
        }
        
        return { success: true, message: 'No update needed' };
    }, [userD, setUserD]);
    
    return updateProfile;
};

export default useUpdateProfile;
