import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';
import { createRequire } from 'module';
import type * as YTypes from 'yjs';
import { getSupabase } from './lib/supabase.js';
import { sharedNoteRepository,noteCollaboratorsRepository } from './repositories/index.js';
import { authUserAndNotePermission } from './middleware/authUser.js'; 
import type { NoteRow } from './repositories/index.js';




const require = createRequire(import.meta.url);
const Y = require('yjs');

// @ts-ignore
import utils from 'y-websocket/bin/utils';
const { setupWSConnection, setPersistence } = utils;

const PORT: number = Number(process.env.PORT) || 1234;

// ─── Supabase client ──────────────────────────────────────────────────────────
const supabase = getSupabase();


// ─── Debounce helper ──────────────────────────────────────────────────────────
function debounce<T extends (...args: any[]) => void>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  return (...args: Parameters<T>) => {
    const key = String(args[0]);
    const existing = timers.get(key);
    if (existing) clearTimeout(existing);
    timers.set(
      key,
      setTimeout(() => {
        timers.delete(key);
        fn(...args);
      }, ms)
    );
  };
}

// ─── Database helpers ─────────────────────────────────────────────────────────

/**
 * docName is the shared_note UUID (used as the Yjs room name).
 * Fetches the `content` bytea column from shared_notes and returns it
 * as a Uint8Array, or null if the row has no saved content yet.
 */
async function loadFromDatabase(docName: string): Promise<Uint8Array | null> {
  try {
    const rows: NoteRow[] = await sharedNoteRepository.fetchNoteData(docName);

    if (!rows.length || !rows[0].content) {
      console.log(`[DB] No existing content for "${docName}" — starting fresh`);
      return null;
    }

    const content = rows[0].content;

    // Supabase returns bytea as a \x-prefixed hex string e.g. "\\x0a1b2c..."
    const hex: string =
      typeof content === 'string'
        ? content.replace(/^\\x/, '')
        : Buffer.from(content).toString('hex');

    const bytes = new Uint8Array(
      hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );

    console.log(`[DB] Loaded ${bytes.byteLength} bytes for "${docName}"`);
    return bytes;

  } catch (err: any) {
    console.error(`[DB] Load error for "${docName}":`, err.message);
    return null;
  }
}

async function saveToDatabase(docName: string, snapshot: Uint8Array): Promise<void> {
  try {
    // Convert Uint8Array → hex string with \x prefix so Supabase
    // stores it correctly as bytea  (same format it returns on read)
    const hexContent =
      '\\x' + Buffer.from(snapshot).toString('hex');

    await sharedNoteRepository.updateNotedata(docName, hexContent);

    console.log(`[DB] Saved ${snapshot.byteLength} bytes for "${docName}"`);

  } catch (err: any) {
    console.error(`[DB] Save error for "${docName}":`, err.message);
  }
}

// Debounced version — fires 3 s after the last update burst for a given doc
const debouncedSave = debounce(
  (docName: string, snapshot: Uint8Array) => {
    saveToDatabase(docName, snapshot);   // fire-and-forget; errors logged inside
  },
  3000
);

// ─── HTTP server ──────────────────────────────────────────────────────────────
const server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', port: PORT }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Yjs TS Server Operational');
});

// ─── WebSocket server ─────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server });

wss.on('connection', (conn: WebSocket, req: http.IncomingMessage) => {
  console.log(`[WS] Incoming connection request URL: ${req.url}`);
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const room = url.pathname.slice(1) || '(default)';

  // ── Buffer incoming messages during async auth ──────────────────────────
  // The client sends sync-step-1 immediately on open, but setupWSConnection
  // (which registers the real 'message' listener) only runs after async auth.
  // Without buffering, those early messages are silently dropped by Node's
  // EventEmitter, breaking the Yjs sync handshake and leaving the client
  // stuck on "Synchronizing document…".
  const earlyMessages: Buffer[] = [];
  const bufferHandler = (data: Buffer) => { earlyMessages.push(data); };
  conn.on('message', bufferHandler);

  // Mock NextFunction: Called by the middleware if authentication & authorization succeed
  const next = () => {
    // Remove the temporary buffer listener before setupWSConnection adds its own
    conn.off('message', bufferHandler);

    setupWSConnection(conn, req);

    // Replay any messages the client sent while we were authenticating
    for (const msg of earlyMessages) {
      conn.emit('message', msg);
    }

    console.log(`[WS] Client connected → room: "${room}"  (total: ${wss.clients.size})`);

    conn.on('close', () => {
      console.log(`[WS] Client left → room: "${room}"  (total: ${wss.clients.size})`);
    });

    conn.on('error', (err: Error) => {
      console.error(`[WS] Socket error in room "${room}":`, err.message);
    });
  };

  // Mock Response: Called by the middleware if authentication & authorization fail
  const res: any = {
    status: (code: number) => ({
      json: (data: any) => {
        console.log(`[WS] Auth failed with status ${code}:`, data);
        conn.off('message', bufferHandler); // stop buffering on a doomed connection
        conn.close(1008, data.error || 'Authentication Failed');
      }
    })
  };

  // Adapter to bind necessary query/params for the middleware
  // y-websocket passes the URL pattern: `ws://localhost:1234/some-room?token=123...`
  const token = url.searchParams.get('token');
  
  // Isolate just the room name (since the room string might actually carry ?token inside the path if not cleanly resolved from searchParams)
  let cleanRoomName = room;
  if (cleanRoomName.includes('?')) {
    cleanRoomName = cleanRoomName.split('?')[0];
  }

  const mockReq: any = Object.assign(req, {
    query: { 
      noteId: cleanRoomName, 
      token: token
    },
    params: {},
    body: {}
  });

  // Execute imported middleware
  authUserAndNotePermission(mockReq, res, next);
});

// ─── Persistence pipeline ─────────────────────────────────────────────────────
setPersistence({
  bindState: async (docName: string, ydoc: YTypes.Doc): Promise<void> => {
    console.log(`[DB] Loading document: "${docName}"`);

    const persisted = await loadFromDatabase(docName);
    if (persisted) {
      Y.applyUpdate(ydoc, persisted);
    }

    ydoc.on('update', (_update: Uint8Array) => {
      const snapshot = Y.encodeStateAsUpdate(ydoc);
      debouncedSave(docName, snapshot);
    });
  },

  writeState: async (docName: string, ydoc: YTypes.Doc): Promise<void> => {
    console.log(`[DB] Final flush for: "${docName}"`);
    const fullState = Y.encodeStateAsUpdate(ydoc);
    await saveToDatabase(docName, fullState);   // await here — no debounce on shutdown
  },
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
function shutdown(signal: string) {
  console.log(`\n[SERVER] ${signal} received — closing…`);
  wss.close(() => {
    server.close(() => {
      console.log('[SERVER] Shutdown complete.');
      process.exit(0);
    });
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ─── Start ────────────────────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Yjs WebSocket Server running on http://:${PORT}`);
  console.log(`   Health check → http://localhost:${PORT}/health`);
});