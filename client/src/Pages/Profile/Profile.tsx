import { useEffect, useState, useCallback } from 'react'
import { useAuthContext } from '../../Context/AuthContext';
import { useStore } from '../../store/store';
import { useVerifyUser } from '../../utils/verifyUser';
import Navbar from '../../component/Navbar/Navbar';
import { getAllNotes } from '../../IndexDB/db';
import { noteCollaboratorsRepository, profilesRepository } from '../../repositories';

// Type definitions
interface CollaborationEntry {
  note_id: string;
  user_id: string;
}

interface GroupedNoteData {
  note_id: string;
  user_ids: string[];
}

export const Profile: React.FC = () => {
    const { setUserD, userD, userId, setUserId } = useAuthContext();
    const { notes, setNotes } = useStore();
    const [groupedData, setGroupedData] = useState<GroupedNoteData[]>([]);
    const [removeIds, setRemoveIds] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [, setError] = useState<string | null>(null);
    const [processingRemoval, setProcessingRemoval] = useState<boolean>(false);
    const [, setNoteIds] = useState<CollaborationEntry[]>([]);
    
    // Username change states
    const [newUsername, setNewUsername] = useState<string>('');
    const [isEditingUsername, setIsEditingUsername] = useState<boolean>(false);
    const [usernameLoading, setUsernameLoading] = useState<boolean>(false);


    const fetchNotes = useCallback(async () => {
        try {
          const allNotes = await getAllNotes(userId);
          setNotes(allNotes);
        } catch (error) {
          console.error('Error fetching notes:', error);
        }
      }, [setNotes, userId]);
    
    const verifyUser = useVerifyUser();
    console.log("nnotes",notes);
    useEffect(() => {
        if (userId === "Guest") {
            setLoading(true);
            (async () => {
                const _uid = await verifyUser();
                setUserId(_uid ?? "Guest");
            })();
        }
        fetchNotes();
        setLoading(false);
    }, [userId, setUserId, verifyUser]);

    // Function to group user IDs by note ID


    

    const groupUsersByNote = useCallback((data: CollaborationEntry[]): GroupedNoteData[] => {
        if (!Array.isArray(data) || data.length === 0) {
            return [];
        }
        
        const grouped: Record<string, string[]> = {};
        
        data.forEach((entry: CollaborationEntry) => {
            if (!entry || typeof entry !== 'object' || !entry.note_id || !entry.user_id) {
                return;
            }
            
            if (!grouped[entry.note_id]) {
                grouped[entry.note_id] = [];
            }
            grouped[entry.note_id].push(entry.user_id);
        });

        return Object.keys(grouped).map((noteId: string) => ({
            note_id: noteId,
            user_ids: grouped[noteId]
        }));
    }, []);

    // Fetch collaboration data
    const fetchCollaborationData = useCallback(async (): Promise<void> => {
        try {
            setLoading(true);
            setError(null);
            const response = await noteCollaboratorsRepository.getCollaboratorsForOwnedNotes();
            
            let collaborationData: CollaborationEntry[] = [];
            
            if (Array.isArray(response)) {
                collaborationData = response.map((entry) => ({
                    note_id: entry.note_id,
                    user_id: entry.user_id,
                }));
            }
            
            const validData = collaborationData.filter((entry: any) => 
                entry && typeof entry === 'object' && entry.note_id && entry.user_id
            );
            
            setNoteIds(validData);
            const grouped: GroupedNoteData[] = groupUsersByNote(validData);
            setGroupedData(grouped);
            
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [groupUsersByNote]);

    // Handle user removal from a specific note
    const handleRemoveUser = async (noteId: string, userIdToRemove: string): Promise<void> => {
        const removalKey = `${noteId}-${userIdToRemove}`;
        
        try {
            setProcessingRemoval(true);
            setRemoveIds(prev => [...prev, removalKey]);

            await noteCollaboratorsRepository.removeCollaborators(noteId, [userIdToRemove]);

            setNoteIds(prev => prev.filter(entry => 
                !(entry.note_id === noteId && entry.user_id === userIdToRemove)
            ));
            
            setGroupedData(prev => 
                prev.map(noteGroup => {
                    if (noteGroup.note_id === noteId) {
                        return {
                            ...noteGroup,
                            user_ids: noteGroup.user_ids.filter(id => id !== userIdToRemove)
                        };
                    }
                    return noteGroup;
                }).filter(noteGroup => noteGroup.user_ids.length > 0)
            );

            setRemoveIds(prev => prev.filter(id => id !== removalKey));
            
        } catch (err) {
            console.error("Error removing user:", err);
            const errorMessage = err instanceof Error ? err.message : "Failed to remove user from collaboration";
            setError(errorMessage);
            setRemoveIds(prev => prev.filter(id => id !== removalKey));
        } finally {
            setProcessingRemoval(false);
        }
    };

    // Delete all users from collaboration
    const deleteUsersFromCollab = async (note_id:string,user_ids:string[]): Promise<void> => {
        console.log("data: ", note_id, user_ids);
        // Remove the current user from the list of user_ids to avoid removing yourself
        const filteredUserIds = user_ids.filter(uid => uid !== userId);
        if (!window.confirm("Are you sure you want to remove all collaborators?")) {
            return;
        }

        try {
            setLoading(true);
            setError(null);

            await noteCollaboratorsRepository.removeCollaborators(note_id, filteredUserIds);

            setNoteIds([]);
            setGroupedData([]);
            setRemoveIds([]);
            
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to delete users from collaboration";
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Handle username change
    const handleUsernameChange = async (): Promise<void> => {
        if (!newUsername.trim() || newUsername === userD.userName) {
            setIsEditingUsername(false);
            setNewUsername('');
            return;
        }

        try {
            setUsernameLoading(true);
            await profilesRepository.updateCurrentUserName(newUsername);
            const email = userD.email;
            setUserD({userName:newUsername,email:email});
            setIsEditingUsername(false);
            setNewUsername('');
        } catch (err) {
            setError("Failed to update username");
        } finally {
            setUsernameLoading(false);
        }
    };

    useEffect(() => {
        fetchCollaborationData();
    }, [fetchCollaborationData]);

    if (loading && groupedData.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading your profile...</p>
                </div>
            </div>
        );
    }

    return (
        <>
        <Navbar/>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Profile Header */}
                <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-8 border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                                Profile Dashboard
                            </h1>
                            <p className="text-gray-600">Manage your account and collaborations</p>
                        </div>
                        <div className="hidden sm:block">
                            <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                                <span className="text-2xl text-white font-bold">
                                    {userD.userName.charAt(0).toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Username Section */}
                    <div className="bg-gray-50 rounded-xl p-4 sm:p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Username
                        </h3>
                        
                        {!isEditingUsername ? (
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex items-center space-x-3">
                                    <span className="text-xl font-semibold text-gray-800 bg-white px-4 py-2 rounded-lg border">
                                        {userD.userName}
                                    </span>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        Active
                                    </span>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsEditingUsername(true);
                                        setNewUsername(userD.userName);
                                    }}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                                >
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit Username
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                    type="text"
                                    value={newUsername}
                                    onChange={(e) => setNewUsername(e.target.value)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                                    placeholder="Enter new username"
                                    disabled={usernameLoading}
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleUsernameChange}
                                        disabled={usernameLoading || !newUsername.trim()}
                                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {usernameLoading ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsEditingUsername(false);
                                            setNewUsername('');
                                        }}
                                        className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            Email
                        </h3>
                        <span className="text-xl font-semibold text-gray-800 bg-white px-4 py-2 rounded-lg border">
                            {userD.email}
                        </span>
                    </div>
                </div>

                {/* Error Message */}
                {/* Collaborations Section */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
                    <div className="p-6 sm:p-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                                <svg className="w-6 h-6 mr-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                Note Collaborations
                            </h2>
                            {groupedData.length > 0 && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                                    {groupedData.length} {groupedData.length === 1 ? 'Note' : 'Notes'}
                                </span>
                            )}
                        </div>

                        {groupedData.length === 0 ? (
                            <div className="text-center py-12">
                                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No collaborations found</h3>
                                <p className="text-gray-500">You don't have any collaborative notes yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {groupedData.map((noteGroup: GroupedNoteData) => (
                                    <div key={noteGroup.note_id} className="bg-gray-50 rounded-xl p-6 transition-all hover:shadow-md">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                                            <div>
                                            <h4 className="text-lg font-semibold text-gray-900 font-mono bg-white px-3 py-1 rounded-lg inline-block mb-2">
                                                {(() => {
                                                    const foundNote = notes.find(note => note.id === noteGroup.note_id);
                                                    return foundNote ? foundNote.title : `Note #${noteGroup.note_id}`;
                                                })()}
                                            </h4>
                                                <p className="text-sm text-gray-600 flex items-center">
                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                    </svg>
                                                    {noteGroup.user_ids.length - 1} Collaborators
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            {noteGroup.user_ids.map((user_id: string, userIndex: number) => {
                                                const removalKey = `${noteGroup.note_id}-${user_id}`;
                                                const isRemoving = removeIds.includes(removalKey);
                                                
                                                if (user_id === userId) return null;
                                                
                                                return (
                                                    <div key={userIndex} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                                                        <div className="flex items-center space-x-3">
                                                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                                                <span className="text-sm text-white font-semibold">
                                                                    {user_id.charAt(0).toUpperCase()}
                                                                </span>
                                                            </div>
                                                            <span className="font-medium text-gray-900">{user_id}</span>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemoveUser(noteGroup.note_id, user_id)}
                                                            disabled={isRemoving || processingRemoval}
                                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                        >
                                                            {isRemoving ? (
                                                                <>
                                                                    <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-red-700" fill="none" viewBox="0 0 24 24">
                                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                    </svg>
                                                                    Removing...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                    Remove
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {noteGroup.user_ids.length > 2 && (
                                            <div className="mt-4 pt-4 border-t border-gray-200">
                                                <button
                                                    onClick={()=>{deleteUsersFromCollab(noteGroup.note_id,noteGroup.user_ids)}}
                                                    disabled={loading || processingRemoval}
                                                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    {loading ? (
                                                        <>
                                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-700" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            Processing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                            Remove All Collaborators
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
        </>
    );
};

export default Profile;
