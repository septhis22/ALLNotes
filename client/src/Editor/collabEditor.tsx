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
 * onStatusChange={(status) => console.log(status)}
 * onDocUpdate={(update) => console.log('bytes:', update.byteLength)}
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

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

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

const STATUS_STYLES: Record<ConnectionStatus, { dot: string; label: string; bg: string }> = {
  idle:         { dot: '#94a3b8', label: 'offline',      bg: 'rgba(148,163,184,0.1)' },
  connecting:   { dot: '#f59e0b', label: 'connecting…',  bg: 'rgba(245,158,11,0.1)'  },
  connected:    { dot: '#10b981', label: 'live',         bg: 'rgba(16,185,129,0.1)'  },
  disconnected: { dot: '#94a3b8', label: 'disconnected', bg: 'rgba(148,163,184,0.1)' },
  error:        { dot: '#ef4444', label: 'error',        bg: 'rgba(239,68,68,0.1)'   },
};

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, room }: { status: ConnectionStatus; room: string }) {
  const s = STATUS_STYLES[status];
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px 3px 8px',
        borderRadius: 99,
        background: s.bg,
        fontSize: 11,
        fontFamily: 'ui-monospace, "Cascadia Code", monospace',
        color: s.dot,
        userSelect: 'none',
        letterSpacing: '0.03em',
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: s.dot,
          flexShrink: 0,
          animation: status === 'connecting' ? 'ce-pulse 1s ease-in-out infinite' : 'none',
          boxShadow: status === 'connected' ? `0 0 5px ${s.dot}` : 'none',
        }}
      />
      {room !== 'default' && (
        <span style={{ opacity: 0.6 }}>{room} ·&nbsp;</span>
      )}
      {s.label}
    </div>
  );
}

// ─── CSS injection ────────────────────────────────────────────────────────────

let cssInjected = false;
function injectStyles() {
  if (cssInjected || typeof document === 'undefined') return;
  cssInjected = true;
  const el = document.createElement('style');
  el.dataset.id = 'collaborative-editor';
  el.textContent = `
    @keyframes ce-pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.35; }
    }
    .ce-wrapper {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      min-height: 300px;
    }
    .ce-toolbar {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding: 6px 12px;
      border-bottom: 1px solid var(--ce-border, #e2e8f0);
      flex-shrink: 0;
    }
    .ce-editor-area {
      flex: 1;
      overflow-y: auto;
    }
    .ce-editor-area .bn-editor {
      min-height: 100%;
    }
    .ce-wrapper[data-theme="dark"] .ce-toolbar {
      border-bottom-color: var(--ce-border-dark, #1e293b);
    }
  `;
  document.head.appendChild(el);
}

// ─── 1. Inner Editor Component ────────────────────────────────────────────────

interface EditorUIProps extends CollaborativeEditorProps {
  yjsEnv: { doc: Y.Doc; provider: WebsocketProvider; userConfig: any } | null;
}

function EditorUI({
  yjsEnv,
  room = 'default',
  className = '',
  onStatusChange,
  onDocUpdate,
  style,
  showStatus = true,
  theme = 'light',
  serverUrl
}: EditorUIProps) {
  const [status, setStatus] = useState<ConnectionStatus>(yjsEnv ? 'connecting' : 'idle');
  const [isSynced, setIsSynced] = useState(false);

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

    provider.on('status', handleStatus);
    provider.on('sync', handleSync);
    provider.on('connection-error', handleError);
    doc.on('update', handleUpdate);

    // Initial state checks
    if (provider.wsconnected) setStatusWithCallback('connected');
    if (provider.synced) setIsSynced(true);

    return () => {
      provider.off('status', handleStatus);
      provider.off('sync', handleSync);
      provider.off('connection-error', handleError);
      doc.off('update', handleUpdate);
    };
  }, [yjsEnv, setStatusWithCallback, onDocUpdate]);

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
  });

  return (
    <div
      className={`ce-wrapper ${className}`}
      data-theme={theme}
      style={{
        ...style,
        background: theme === 'dark' ? '#0f172a' : '#ffffff',
      }}
    >
      {showStatus && serverUrl && (
        <div className="ce-toolbar">
          <StatusBadge status={status} room={room} />
        </div>
      )}
      <div className="ce-editor-area">
        {isSynced || !serverUrl ? (
          <BlockNoteView editor={editor} theme={theme} />
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>
            Synchronizing document...
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 2. Outer Loader Component ────────────────────────────────────────────────

const CollaborativeEditor: React.FC<CollaborativeEditorProps> = (props) => {
  const { serverUrl , room, token, userName, userColor } = props;
  
  const [yjsEnv, setYjsEnv] = useState<{ doc: Y.Doc; provider: WebsocketProvider; userConfig: any } | null>(null);
  const colorRef = useRef(userColor ?? randomColor());

  useEffect(() => {
    injectStyles();

    if (!serverUrl) {
      setYjsEnv(null);
      return;
    }

    const doc = new Y.Doc();
    
    // Use y-websocket's built-in `params` option to pass the token as a query parameter.
    // The WebsocketProvider's `url` getter appends these as `?token=XYZ` to the final URL.
    const urlBase = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
    
    const wsParams: Record<string, string> = {};
    if (token) {
      wsParams.token = token;
    }

    const provider = new WebsocketProvider(urlBase, room ?? 'default', doc, {
      connect: true,
      params: wsParams,
    });

    const userConfig = {
      name: userName ?? `User ${Math.floor(Math.random() * 1000)}`,
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
    return <div style={{ padding: 20, textAlign: 'center', opacity: 0.5 }}>Connecting...</div>;
  }

  return <EditorUI {...props} yjsEnv={yjsEnv} />;
};

export default CollaborativeEditor;