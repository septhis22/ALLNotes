import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';
import { createRequire } from 'module';
import type * as YTypes from 'yjs';
import { getSupabase } from './lib/supabase.js';
import { sharedNoteRepository,noteCollaboratorsRepository } from './repositories/index.js';
import { authUserAndNotePermission } from './middleware/authUser.js'; 
import type { NoteRow } from './repositories/index.js';




import { TelemetryAggregator } from './telemetry/TelemetryAggregator.js';

const require = createRequire(import.meta.url);
const Y = require('yjs');

// @ts-ignore
import utils from 'y-websocket/bin/utils';
const { setupWSConnection, setPersistence } = utils;

const PORT: number = Number(process.env.PORT) || 1234;

// ─── Telemetry Engine ─────────────────────────────────────────────────────────
const telemetry = new TelemetryAggregator();

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

    return bytes;
  } catch (err: any) {
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
  } catch (err: any) {}
}

// ─── Guard against saving empty docs during initial load ──────────────────────
// When a single user refreshes, y-websocket destroys the old doc and creates a
// new empty one. `bindState` is async but NOT awaited by y-websocket's `getYDoc`,
// so the client's empty sync-step arrives before the DB content is loaded.
// We track which docs are still loading so we can suppress premature saves.
const docsCurrentlyLoading = new Set<string>();

// Track the last known DB size per doc so we never overwrite a populated doc
// with an effectively-empty one (Yjs empty doc encodes as ~2-4 bytes).
const lastKnownDbSize = new Map<string, number>();

// Debounced version — fires 3 s after the last update burst for a given doc
const debouncedSave = debounce(
  (docName: string, snapshot: Uint8Array) => {
    // Don't save while we're still loading this doc from DB
    if (docsCurrentlyLoading.has(docName)) {
      return;
    }

    // Safety: don't overwrite a doc that had real content with an empty snapshot
    const prevSize = lastKnownDbSize.get(docName) ?? 0;
    if (prevSize > 100 && snapshot.byteLength <= 4) {
      return;
    }

    lastKnownDbSize.set(docName, snapshot.byteLength);
    saveToDatabase(docName, snapshot);   // fire-and-forget; errors logged inside
  },
  3000
);

// ─── HTTP server ──────────────────────────────────────────────────────────────
const server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', port: PORT }));
    return;
  }

  if (req.url === '/telemetry' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        telemetry.logReport(payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid payload' }));
      }
    });
    return;
  }
  
  if (req.url === '/telemetry/stats' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(telemetry.getDashboardStats()));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Yjs TS Server Operational');
});

// ─── WebSocket server ─────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server });

wss.on('connection', (conn: WebSocket, req: http.IncomingMessage) => {
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

    conn.on('close', () => {});

    conn.on('error', (err: Error) => {});
  };

  // Mock Response: Called by the middleware if authentication & authorization fail
  const res: any = {
    status: (code: number) => ({
      json: (data: any) => {
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
    // Mark this doc as "loading" so the debounced save won't persist an
    // empty merge that the sync handshake may produce before we finish.
    docsCurrentlyLoading.add(docName);

    try {
      const persisted = await loadFromDatabase(docName);
      if (persisted) {
        // Remember the real content size before applying
        lastKnownDbSize.set(docName, persisted.byteLength);
        Y.applyUpdate(ydoc, persisted);
      }
    } finally {
      // Always clear the loading flag so future saves proceed normally
      docsCurrentlyLoading.delete(docName);
    }

    ydoc.on('update', (_update: Uint8Array) => {
      const snapshot = Y.encodeStateAsUpdate(ydoc);
      debouncedSave(docName, snapshot);
    });
  },

  writeState: async (docName: string, ydoc: YTypes.Doc): Promise<void> => {
    const fullState = Y.encodeStateAsUpdate(ydoc);

    // Safety: don't overwrite a populated doc with an empty one on disconnect
    const prevSize = lastKnownDbSize.get(docName) ?? 0;
    if (prevSize > 100 && fullState.byteLength <= 4) {
      return;
    }

    lastKnownDbSize.set(docName, fullState.byteLength);
    await saveToDatabase(docName, fullState);   // await here — no debounce on shutdown
  },
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
function shutdown(signal: string) {
  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ─── Start ────────────────────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {});