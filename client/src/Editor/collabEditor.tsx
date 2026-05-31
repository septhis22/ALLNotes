/**
 * CollaborativeEditor.tsx
 *
 * A self-contained BlockNote collaborative editor component.
 * Wraps BlockNote + Yjs + y-websocket into a single droppable component.
 *
 * USAGE:
 * ──────
 * import CollaborativeEditor from './CollaborativeEditor';
 *
 * // Minimal — connects to ws://localhost:1234, room "default"
 * <CollaborativeEditor />
 *
 * // Full props
 * <CollaborativeEditor
 * serverUrl="ws://127.0.0.1:1234"
 * room="my-document"
 * userName="Alice"
 * userColor="#f97316"
 * className="my-editor"
 * />
 */

'use client';

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  type CSSProperties,
} from 'react';

// ─── BlockNote & Yjs ─────────────────────────────────────────────────────────

import { BlockNoteView } from '@blocknote/mantine';
import { useCreateBlockNote } from '@blocknote/react';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { uploadSharedImage } from '../utils/collabUtils/sharedImageUpload';
import { deleteSharedImage } from '../utils/collabUtils/sharedImageDelete';
import { TelemetryMonitor } from '../telemetry/TelemetryMonitor';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'auth-failed';

export interface CollaborativeEditorProps {
  serverUrl?: string;
  room?: string;
  token?: string;
  userName?: string;
  userColor?: string;
  placeholder?: string;
  className?: string;
  onStatusChange?: (status: ConnectionStatus) => void;
  onDocUpdate?: (update: Uint8Array) => void;
  onAwarenessChange?: (count: number) => void;
  style?: CSSProperties;
  showStatus?: boolean;
  theme?: 'light' | 'dark';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RANDOM_COLORS = [
  '#f97316', '#06b6d4', '#8b5cf6',
  '#ec4899', '#10b981', '#f59e0b',
];

function randomColor(): string {
  return RANDOM_COLORS[Math.floor(Math.random() * RANDOM_COLORS.length)];
}

function extractCloudinaryUrls(blocks: any[]): Set<string> {
  const urls = new Set<string>();
  for (const block of blocks) {
    if (
      block.type === 'image' &&
      block.props?.url &&
      typeof block.props.url === 'string' &&
      block.props.url.includes('res.cloudinary.com')
    ) {
      urls.add(block.props.url);
    }
    if (block.children?.length) {
      for (const url of extractCloudinaryUrls(block.children)) {
        urls.add(url);
      }
    }
  }
  return urls;
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { dotClass: string; label: string; badgeClass: string }
> = {
  idle:          { dotClass: 'bg-slate-500',                    label: 'offline',      badgeClass: 'bg-slate-500/10 text-slate-400' },
  connecting:    { dotClass: 'bg-amber-400 animate-pulse',      label: 'connecting…',  badgeClass: 'bg-amber-400/10 text-amber-400' },
  connected:     { dotClass: 'bg-emerald-400 shadow-[0_0_5px_#34d399]', label: 'live', badgeClass: 'bg-emerald-400/10 text-emerald-400' },
  disconnected:  { dotClass: 'bg-slate-500',                    label: 'disconnected', badgeClass: 'bg-slate-500/10 text-slate-400' },
  error:         { dotClass: 'bg-red-500',                      label: 'error',        badgeClass: 'bg-red-500/10 text-red-400' },
  'auth-failed': { dotClass: 'bg-red-500',                      label: 'auth failed',  badgeClass: 'bg-red-500/10 text-red-400' },
};

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, room }: { status: ConnectionStatus; room: string }) {
  const s = STATUS_CONFIG[status];
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono tracking-wide select-none ${s.badgeClass}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dotClass}`} />
      {room !== 'default' && (
        <span className="opacity-60">{room} ·&nbsp;</span>
      )}
      {s.label}
    </div>
  );
}

// ─── Inner Editor Component ───────────────────────────────────────────────────

interface EditorUIProps extends CollaborativeEditorProps {
  yjsEnv: { doc: Y.Doc; provider: WebsocketProvider; userConfig: any } | null;
}

function EditorUI({
  yjsEnv,
  room = 'default',
  className = '',
  onStatusChange,
  onDocUpdate,
  onAwarenessChange,
  style,
  showStatus = true,
  theme = 'dark',
  serverUrl,
}: EditorUIProps) {
  const [status, setStatus] = useState<ConnectionStatus>(yjsEnv ? 'connecting' : 'idle');
  const [isSynced, setIsSynced] = useState(false);

  const localUploadsRef = useRef<Set<string>>(new Set());
  const knownUrlsRef = useRef<Set<string> | null>(null);

  const setStatusWithCallback = useCallback(
    (s: ConnectionStatus) => {
      setStatus(s);
      onStatusChange?.(s);
    },
    [onStatusChange]
  );

  useEffect(() => {
    if (!yjsEnv) return;
    const { doc, provider } = yjsEnv;

    const handleStatus = ({ status: s }: { status: string }) => {
      if (s === 'connected') setStatusWithCallback('connected');
      if (s === 'disconnected') setStatusWithCallback('disconnected');
    };

    const handleSync = (synced: boolean) => {
      if (synced) setIsSynced(true);
    };

    const handleError = () => setStatusWithCallback('error');
    const handleUpdate = (update: Uint8Array) => onDocUpdate?.(update);

    const handleAwarenessChange = () => {
      onAwarenessChange?.(provider.awareness.getStates().size);
    };

    provider.on('status', handleStatus);
    provider.on('sync', handleSync);
    provider.on('connection-error', handleError);
    doc.on('update', handleUpdate);
    provider.awareness.on('change', handleAwarenessChange);

    const handleConnectionClose = (event: CloseEvent | null) => {
      if (event && event.code === 1008) {
        provider.disconnect();
        setStatusWithCallback('auth-failed');
      }
    };
    provider.on('connection-close', handleConnectionClose);

    if (provider.wsconnected) setStatusWithCallback('connected');
    if (provider.synced) setIsSynced(true);
    handleAwarenessChange();

    return () => {
      provider.off('status', handleStatus);
      provider.off('sync', handleSync);
      provider.off('connection-error', handleError);
      provider.off('connection-close', handleConnectionClose);
      doc.off('update', handleUpdate);
      provider.awareness.off('change', handleAwarenessChange);
    };
  }, [yjsEnv, setStatusWithCallback, onDocUpdate, onAwarenessChange]);

  const editor = useCreateBlockNote({
    ...(yjsEnv
      ? {
          collaboration: {
            provider: yjsEnv.provider,
            fragment: yjsEnv.doc.getXmlFragment('document-store'),
            user: yjsEnv.userConfig,
          },
        }
      : {}),
    uploadFile: async (file: File) => {
      try {
        const url = await uploadSharedImage(file, room);
        localUploadsRef.current.add(url);
        return url;
      } catch (error) {
        throw error;
      }
    },
  });

  const handleDocChange = useCallback(() => {
    if (!editor) return;
    const currentUrls = extractCloudinaryUrls(editor.document);

    if (knownUrlsRef.current === null) {
      knownUrlsRef.current = currentUrls;
      return;
    }

    for (const url of knownUrlsRef.current) {
      if (!currentUrls.has(url) && localUploadsRef.current.has(url)) {
        deleteSharedImage(url, room);
        localUploadsRef.current.delete(url);
      }
    }

    knownUrlsRef.current = currentUrls;
  }, [editor]);

  return (
    <div
      className={`flex flex-col w-full h-full min-h-screen bg-[#111111] ${className}`}
      data-theme={theme}
      style={style}
    >
      {/* Toolbar / status bar */}
      {showStatus && serverUrl && (
        <div className="flex items-center justify-end px-4 py-2 border-b border-[#222222] bg-[#111111] flex-shrink-0">
          <StatusBadge status={status} room={room} />
        </div>
      )}

      {/* Editor scroll area */}
      <div className="flex-1 overflow-y-auto bg-[#111111]">
        <div className="w-full max-w-[900px] mx-auto pt-16 pb-24 px-8">
          {isSynced || !serverUrl ? (
            <BlockNoteView
              editor={editor}
              theme={theme}
              onChange={handleDocChange}
            />
          ) : (
            <div className="flex items-center justify-center p-8 text-[#555555] text-sm">
              Synchronizing document…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Outer Loader Component ───────────────────────────────────────────────────

const CollaborativeEditor: React.FC<CollaborativeEditorProps> = (props) => {
  const { serverUrl, room, token, userName, userColor } = props;

  const [yjsEnv, setYjsEnv] = useState<{
    doc: Y.Doc;
    provider: WebsocketProvider;
    userConfig: any;
  } | null>(null);

  const colorRef = useRef(userColor ?? randomColor());

  useEffect(() => {
    if (!serverUrl) {
      setYjsEnv(null);
      return;
    }

    const doc = new Y.Doc();

    const urlBase = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;

    const wsParams: Record<string, string> = {};
    if (token) {
      wsParams.token = token;
    }

    const provider = new WebsocketProvider(urlBase, room ?? 'default', doc, {
      connect: true,
      params: wsParams,
    });

    const parsedUrl = new URL(urlBase);
    const isSecure = parsedUrl.protocol === 'wss:' || parsedUrl.protocol === 'https:';
    const httpProtocol = isSecure ? 'https:' : 'http:';
    const backendHttp = parsedUrl.port
      ? `${httpProtocol}//${parsedUrl.hostname}:${parsedUrl.port}`
      : `${httpProtocol}//${parsedUrl.hostname}`;
    const clientId = provider.awareness.clientID.toString();
    const telemetry = new TelemetryMonitor(clientId, backendHttp);

    doc.on('update', (update: Uint8Array, origin: any) => {
      if (origin !== provider) {
        telemetry.logSent(update);
      } else {
        telemetry.logReceived(update);
      }
    });

    // If the DB returned "user" (no full_name set), make it distinguishable
    // by appending a random 3-digit number. Otherwise use the real name.
    const resolvedName = userName ?? 'user';
    const displayName =
      resolvedName.toLowerCase() === 'user'
        ? `User ${Math.floor(100 + Math.random() * 900)}`
        : resolvedName;

    const userConfig = {
      name: displayName,
      color: colorRef.current,
    };

    provider.awareness.setLocalStateField('user', userConfig);

    setYjsEnv({ doc, provider, userConfig });

    return () => {
      provider.disconnect();
      doc.destroy();
    };
  }, [serverUrl, room, token, userName]);

  if (serverUrl && !yjsEnv) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#111111] text-[#555555] text-sm">
        Connecting…
      </div>
    );
  }

  return <EditorUI {...props} yjsEnv={yjsEnv} />;
};

export default CollaborativeEditor;