import { useEffect, useState } from "react";
import CollaborativeEditor from "../../Editor/collabEditor";
import { CollabSidebar } from "./collabSidebar";
import { getSupabase } from "../../lib/supabase";

const CollaborationPage = () => {
  // Read roomId synchronously from the URL to avoid an initial "default" WS connection
  const [roomId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("id") || "default";
  });

  const [token, setToken] = useState<string | null>(null);
  const [tokenLoaded, setTokenLoaded] = useState(false);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data: { session } } = await getSupabase().auth.getSession();
        setToken(session?.access_token ?? null);
      } catch (err) {
        console.error("Failed to get auth session:", err);
        setToken(null);
      } finally {
        setTokenLoaded(true);
      }
    };
    fetchToken();
  }, []);

  const wsUrl = `ws://localhost:1234`;

  return (
    <div className="flex h-screen w-screen bg-[#191919] text-gray-200 overflow-hidden">
      <aside className="h-full w-[280px] shrink-0 overflow-y-auto overflow-x-hidden bg-[#202020] border-r border-[#2d2d2d] sm:w-[320px]">
        <div className="h-full py-4 pr-2 pl-2">
          <CollabSidebar/>
        </div>
      </aside>

      <div className="flex flex-col flex-1 overflow-hidden bg-[#191919]">
        {/* <Navbar /> */}
        <main className="flex-1 overflow-hidden relative">
          {tokenLoaded ? (
            <CollaborativeEditor room={roomId} serverUrl={wsUrl} token={token || undefined} />
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>
              Loading session...
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default CollaborationPage;

