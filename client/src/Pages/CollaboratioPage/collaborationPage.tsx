import { useEffect, useState } from "react";
import CollaborativeEditor from "../../Editor/collabEditor";
import { CollabSidebar } from "./collabSidebar";
import { getSupabase } from "../../lib/supabase";
import { profilesRepository } from "../../repositories";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

interface ConnectedUser {
  name: string;
  color?: string;
}

const CollaborationPage = () => {
  const [userName, setUserName] = useState<string | undefined>(undefined);
  const [roomId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("id") || "default";
  });

  const [token, setToken] = useState<string | null>(null);
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        const [{ data: { session } }, name] = await Promise.all([
          getSupabase().auth.getSession(),
          profilesRepository.fetchCurrentUserName(),
        ]);
        setToken(session?.access_token ?? null);
        setUserName(name);
      } catch (err) {
        console.error("Failed to initialize session:", err);
        setToken(null);
      } finally {
        setTokenLoaded(true);
      }
    };
    init();
  }, []);

  // Track awareness (connected users) from Yjs provider
  useEffect(() => {
    if (!tokenLoaded || !token) return;

    const doc = new Y.Doc();
    const wsUrl = "ws://localhost:1234";
    const wsParams: Record<string, string> = token ? { token } : {};

    const provider = new WebsocketProvider(wsUrl, roomId, doc, {
      connect: true,
      params: wsParams,
    });

    const updateUsers = () => {
      const states = Array.from(provider.awareness.getStates().values()) as any[];
      const users: ConnectedUser[] = states
        .map((s) => ({ name: s.user?.name, color: s.user?.color }))
        .filter((u) => Boolean(u.name));
      setConnectedUsers(users);
    };

    provider.awareness.on("change", updateUsers);
    provider.on("sync", updateUsers);

    return () => {
      provider.awareness.off("change", updateUsers);
      provider.disconnect();
      doc.destroy();
    };
  }, [tokenLoaded, token, roomId]);

  const wsUrl = "ws://localhost:1234";

  return (
    <div className="flex h-screen w-screen bg-[#111111] text-gray-200 overflow-hidden">

      {/* Left vertical sidebar */}
      <aside className="h-full w-[180px] shrink-0 bg-[#141414] border-r border-[#222222]">
        <CollabSidebar
          noteId={roomId}
          connectedUsers={connectedUsers}
        />
      </aside>

      {/* Editor — fills remaining space */}
      <main className="flex-1 overflow-hidden">
        {tokenLoaded ? (
          <CollaborativeEditor
            room={roomId}
            serverUrl={wsUrl}
            token={token || undefined}
            userName={userName}
            theme="dark"
            showStatus={false}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-[#555555] text-sm">
            Loading session…
          </div>
        )}
      </main>

    </div>
  );
};

export default CollaborationPage;