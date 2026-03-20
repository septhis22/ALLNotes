import React, { useLayoutEffect, useRef, useState, useEffect } from 'react';
import * as Y from 'yjs';
import { QuillBinding } from 'y-quill';
import Quill from 'quill';
import QuillCursors from 'quill-cursors';
import 'quill/dist/quill.snow.css';
import { WebsocketProvider } from "y-websocket";
import { useSearchParams } from 'react-router-dom';
import LoginInCollab from '../Login/lgoin_in_collab';
import { Users, Circle, Save, Wifi, WifiOff } from 'lucide-react';
import { noteCollaboratorsRepository, notesRepository } from '../../repositories';
import { getSupabase } from '../../lib/supabase';


Quill.register('modules/cursors', QuillCursors);


interface CollaborativeEditorProps {
  roomName?: string;
  placeholder?: string;
  userName?: string;
  userColor?: string;
}

const _modules = {
  toolbar: [
    ['bold', 'italic', 'underline', 'strike'],
    ['blockquote', 'code-block'],
    [{ header: 1 }, { header: 2 }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ script: 'sub' }, { script: 'super' }],
    [{ indent: '-1' }, { indent: '+1' }],
    [{ direction: 'rtl' }],
    [{ size: ['small', false, 'large', 'huge'] }],
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ color: [] }, { background: [] }],
    [{ font: [] }],
    [{ align: [] }],
    ['clean']
  ],
  cursors: true,
};

const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  roomName: propRoomName,
  placeholder = 'Start collaborating...',
  userName: propUserName,
  userColor = 'blue',
}) => {
  const [participants, setParticipants] = useState<string[]>([]);
  const [content, setContent] = useState<string>("");
  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [searchParams] = useSearchParams();
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string>("anonymous");
  
  // Get params from URL or use props as fallback
  const roomName = searchParams.get("id") ?? propRoomName ?? 'default-room';

  // Helper function to get user color based on name
  const getUserColor = (name: string) => {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };


  // Function to log Quill content
  const logQuillContent = (source = 'unknown') => {
    if (quillRef.current) {
      const htmlContent = quillRef.current.root.innerHTML;
      // const textContent = quillRef.current.getText();
      // const delta = quillRef.current.getContents();
      setContent(htmlContent);
    } else {
      console.log(`Quill not initialized yet (${source})`);
    }
  };

  console.log("Component render - isVerified:", isVerified);
  console.log("Component render - roomName:", roomName);
  console.log("Component render - userName:", userId);

  // Permission check function
  useEffect(() => {
    console.log("Permission useEffect triggered");
    const checkPermission = async () => {
      console.log("Starting permission check...");
      try {
        const { data: authData } = await getSupabase().auth.getUser();
        if (authData.user?.id) {
          setUserId(authData.user.id);
        }

        const per = await noteCollaboratorsRepository.getPermissionForCurrentUser(roomName);
        console.log("Extracted permissions:", per);
        
        if (per.includes("r") && per.includes("w")) {
          console.log("User has read and write permissions - setting verified to true");
          setIsVerified(true);
        } else {
          console.log("User lacks required permissions - setting verified to false");
          setIsVerified(false);
        }
      } catch (err) {
        console.error("Permission check failed:", err);
        setIsVerified(false);
      }
    };
    
    setIsVerified(null); // Show loading on param change
    checkPermission();
  }, [roomName, userId, searchParams, propUserName, setUserId]);

  // Editor initialization
  useLayoutEffect(() => {
    console.log("useLayoutEffect triggered - isVerified:", isVerified);
    
    // Don't initialize if not verified or still checking
    if (!isVerified || !editorRef.current ) {
      console.log("Not verified or editorRef null, skipping editor initialization");
      return;
    }

    console.log("Starting editor initialization");

    let isMounted = true;
    let binding: any = null;
    let _provider: WebsocketProvider | null = null;
    let ydoc: Y.Doc | null = null;

    const initializeEditor = () => {
      try {
        console.log("Creating Yjs document");
        // 1. Create Yjs document
        ydoc = new Y.Doc();

        console.log("Creating WebSocket provider");
        // 2. Create WebSocket provider
        _provider = new WebsocketProvider('ws://localhost:1234', roomName, ydoc);

        console.log("Getting shared text type");
        // 3. Get shared text type
        const ytext = ydoc.getText('quill');

        console.log("Initializing Quill editor");
        // 4. Initialize Quill editor
        const quill = new Quill(editorRef.current!, {
          theme: 'snow',
          modules: _modules,
          placeholder,
        });

        // Set the ref immediately
        quillRef.current = quill;
        
        
        // Log initial state (will likely be empty)
        logQuillContent('after-quill-init');

        console.log("Creating QuillBinding");
        binding = new QuillBinding(ytext, quill, _provider.awareness);

        console.log("Quill initialized successfully");

        // Add event listeners for content changes
        quill.on('text-change', (delta, oldDelta, source) => {
          void delta;
          void oldDelta;
          console.log('Text changed, source:', source);
          logQuillContent('text-change');
        });

        // Listen for when collaborative content is loaded
        ytext.observe((event) => {
          console.log('Yjs text observed change:', event);
          // Use setTimeout to ensure DOM is updated
          setTimeout(() => {
            logQuillContent('yjs-text-change');
          }, 0);
          
        });

        // setQuillContent();

        const updateParticipants = () => {
          if (!_provider?.awareness) return;
          
          const states = _provider.awareness.getStates();
          const userNames = Array.from(states.values())
            .map(state => state.user?.name)
            .filter((name): name is string => !!name && name.trim() !== '');
          
          console.log('Updating participants:', userNames);
          setParticipants(userNames);
        };

        // Listen for provider sync events
        _provider.on('sync', (isSynced: boolean) => {
          console.log('Provider sync status:', isSynced);
          
          if (isSynced) {
            setTimeout(() => {
              updateParticipants();
              logQuillContent('provider-synced');
            }, 100); // Small delay to ensure content is loaded
          }
        });

        console.log("Setting user awareness");
        // 6. Set user awareness
        _provider.awareness.setLocalStateField('user', {
          name: userId,
          color: userColor,
        });

        const awarenessChangeHandler = () => {
          updateParticipants();
        }
        _provider.awareness.on('change', awarenessChangeHandler);

        if (isMounted) {
          console.log("Setting provider and connection state");
          setProvider(_provider);
          setIsConnected(_provider.wsconnected);
        }

        // Listen for connection status
        const handleStatus = () => {
          console.log("Connection status changed:", _provider?.wsconnected);
          if (isMounted) setIsConnected(_provider?.wsconnected || false);
        };
        _provider.on('status', handleStatus);

        // Log content after a delay to catch any initial sync
        setTimeout(() => {
          logQuillContent('delayed-after-init');
        }, 1000);

        setTimeout(()=>{
          updateParticipants();
        },500);

        console.log("Editor initialization complete");
      } catch (error) {
        console.error("Error during editor initialization:", error);
      }
    };

    initializeEditor();
    
    // Cleanup
    return () => {
      console.log("Cleanup triggered");
      isMounted = false;
      if (binding) binding.destroy();
      if (_provider) _provider.destroy();
      if (ydoc) ydoc.destroy();
      if (editorRef.current) {
        while (editorRef.current.firstChild) {
          editorRef.current.removeChild(editorRef.current.firstChild);
        }
      }
    };
  }, [roomName, userId, isVerified, userColor, placeholder, propUserName]);

  // Toggle connection
  const toggleConnection = () => {
    if (!provider) return;
    if (provider.wsconnected) {
      provider.disconnect();
    } else {
      provider.connect();
    }
    setIsConnected(provider.wsconnected);
  };

  // Debug function to manually log content
  const debugLogContent = async() => {
    try{
      await notesRepository.updateOwned({
        id: roomName,
        type: "note",
        title: "for now exp",
        content: content,
        updatedat: new Date().toISOString()
      });
    }catch{
      alert("you are not the owner of the file!!!");
    }
  };

  // Loading state
  if (isVerified === null) {
    console.log("Rendering loading state");
    return (
      <div className="flex h-screen bg-gray-100">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-8">
            <div className="text-lg">Checking permissions...</div>
          </div>
        </div>
      </div>
    );
  }
  
  // Access denied state
  if (!isVerified) {
    console.log("Rendering denied state");
    return (
      <div>
        <LoginInCollab setUserId={setUserId}/>
      </div>
    );
  }

  console.log("Rendering main editor component");

  // Main editor component with sidebar
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Sidebar - People List */}
      <div className="w-80 bg-white border-r border-gray-300 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-800">Collaborators</h2>
            <span className="ml-auto bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
              {participants.length} online
            </span>
          </div>
        </div>
        
        {/* People List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {participants.length > 0 ? (
              participants.map((participant, index) => (
                <div 
                  key={`${participant}-${index}`} 
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="relative">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm"
                      style={{ backgroundColor: getUserColor(participant) }}
                    >
                      {participant.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    <Circle className="absolute -bottom-1 -right-1 w-4 h-4 text-green-500 fill-green-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{participant}</p>
                    <p className="text-sm text-gray-500">Online</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No participants connected</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Connection Status */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
              <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <span className="text-gray-500">Room: {roomName}</span>
          </div>
        </div>
      </div>

      {/* Right Side - Editor */}
      <div className="flex-1 flex flex-col">
        {/* Editor Header */}
        <div className="bg-white border-b border-gray-300 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-800">Collaborative Editor</h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">User: {userId}</span>
              <div className="flex gap-2">
                <button
                  onClick={debugLogContent}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
                <button
                  onClick={toggleConnection}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isConnected ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                  } text-white`}
                >
                  {isConnected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Editor Content */}
        <div className="flex-1 p-6 bg-white overflow-auto">
          <div className="border rounded-lg overflow-hidden shadow-sm h-full">
            <div ref={editorRef} className="h-full bg-white" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollaborativeEditor;
