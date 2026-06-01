# 📝 ALLNotes — Collaborative Note-Taking App

A full-stack, real-time collaborative note-taking application built with **React**, **Supabase**, **Yjs**, and **BlockNote**. Supports private offline-first notes with cloud sync, shared collaborative documents with live cursors, image uploads via Cloudinary, and granular permission-based access control.

---

## ✨ Features

### Private Notes
- **Offline-first editing** — Notes are stored in IndexedDB and work without internet
- **Auto-sync to cloud** — Unsynced notes are automatically pushed to Supabase when online
- **Conflict resolution** — Timestamp-based merge strategy handles offline edits vs cloud changes
- **Rich block editor** — Powered by [BlockNote](https://blocknotejs.org/) with headings, lists, images, code blocks, and more

### Shared / Collaborative Notes
- **Real-time collaboration** — Multiple users edit simultaneously via Yjs + WebSocket
- **Live cursors & awareness** — See who's editing and where in the document
- **Persistent sync** — Document state is saved as bytea in Supabase and restored on reconnect
- **Permission system** — Owner + collaborator model with email-based invitations
- **Read-only preview** — Shared notes render in a preview mode before entering the live editor

### Media & Storage
- **Cloudinary image uploads** — Signed upload tickets via Supabase Edge Functions
- **Storage quota tracking** — Per-user storage limits enforced server-side
- **Auto-cleanup** — Deleted images are detected and removed from Cloudinary automatically

### Auth & User Management
- **Supabase Auth** — Email/password sign-up with email verification
- **Profile management** — Editable display name, synced across the app
- **Protected routes** — Guest users are redirected to login for private features
- **Session continuity** — "Continue as [name]" on the login page for returning users

---

## 🏗️ Architecture

```
ALLNotes/
├── client/          → React + Vite frontend (deployed on Vercel)
├── server/          → Node.js WebSocket server for Yjs sync (deployed on Render)
└── README.md
```

### High-Level Data Flow

```
┌─────────────┐       WebSocket (Yjs)       ┌──────────────┐
│   Client A   │◄──────────────────────────►│  Yjs Server   │
│  (BlockNote) │                            │  (Node + WS)  │
└──────┬───────┘                            └──────┬────────┘
       │                                           │
       │  Supabase REST API                        │  Supabase DB
       │  (auth, notes CRUD,                       │  (persistence,
       │   edge functions)                         │   auth verification)
       │                                           │
       ▼                                           ▼
┌──────────────────────────────────────────────────────────┐
│                     Supabase                             │
│  ┌──────────┐  ┌────────────┐  ┌───────────────────┐    │
│  │   Auth   │  │   Tables   │  │  Edge Functions   │    │
│  │          │  │  - notes   │  │  - file-handler   │    │
│  │          │  │  - shared  │  │  - cloudinary-del │    │
│  │          │  │  - profiles│  │  - delete-note    │    │
│  │          │  │  - collabs │  │  - cloudinary-wh  │    │
│  └──────────┘  └────────────┘  └───────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- A **Supabase** project (free tier works)
- A **Cloudinary** account (for image uploads)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ALLNotes.git
cd ALLNotes
```

### 2. Install Dependencies

```bash
# Client
cd client
npm install

# Server
cd ../server
npm install
```

### 3. Configure Environment Variables

Create `.env` files in both `client/` and `server/` directories:

#### `client/.env`

```env
# Supabase project URL
VITE_supabaseurl=https://your-project-id.supabase.co

# Supabase anon (public) key
VITE_annonkey=eyJhbG...your-anon-key

# WebSocket server URL (local dev or production)
VITE_SERVER_URL=ws://localhost:1234
```

#### `server/.env`

```env
# Supabase project URL
supabaseurl=https://your-project-id.supabase.co

# Supabase anon key (used for client-side auth verification)
annonkey=eyJhbG...your-anon-key

# Supabase JWT secret (used to verify WebSocket tokens)
secret=sb_secret_your_jwt_secret_here
```

> **Where to find these values:**
> - **Supabase URL & Anon Key** → Supabase Dashboard → Settings → API
> - **JWT Secret** → Supabase Dashboard → Settings → API → JWT Settings
> - **VITE_SERVER_URL** → `ws://localhost:1234` for local dev, or your deployed server URL (e.g., `wss://allnotes.onrender.com`)

### 4. Start Development Servers

Open **two terminals**:

```bash
# Terminal 1 — WebSocket + Yjs server
cd server
npm run dev
```

```bash
# Terminal 2 — React frontend
cd client
npm run dev
```

The client runs on `http://localhost:5173` and the server on `ws://localhost:1234`.

---

## 🗄️ Database Schema

The following tables are required in your Supabase project:

### `profiles`
| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` (PK) | References `auth.users.id` |
| `email` | `text` | User's email |
| `full_name` | `text` | Display name |
| `allowed_storage` | `bigint` | Storage quota in bytes |

### `notes` (private notes)
| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` (PK) | Note ID |
| `owner` | `uuid` (FK) | References `profiles.id` |
| `title` | `text` | Auto-generated from first line |
| `note_data` | `jsonb` | BlockNote document JSON |
| `updatedat` | `timestamptz` | Last modified timestamp |

### `shared_notes` (collaborative notes)
| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` (PK) | Note ID (also used as Yjs room name) |
| `owner_id` | `uuid` (FK) | References `profiles.id` |
| `title` | `text` | Note title |
| `content` | `bytea` | Yjs document state (binary) |
| `created_at` | `timestamptz` | Creation timestamp |
| `updated_at` | `timestamptz` | Last modified timestamp |

### `note_collaborators`
| Column | Type | Description |
|--------|------|-------------|
| `note_id` | `uuid` (FK) | References `shared_notes.id` |
| `user_id` | `uuid` (FK) | References `profiles.id` |
| `permission` | `text[]` | Array of permissions, e.g. `['r', 'w']` |

### Supabase RPC Functions

- **`get_grouped_shared_notes(target_user_id uuid)`** — Returns all shared notes grouped by owner (name + email + notes array)
- **`add_user_email_collab(target_emails text[], note_id_input uuid)`** — Adds collaborators by email, returns success/failure per email
- **`get_profile_status(email_input text)`** — Checks if a profile exists for a given email

### Supabase Edge Functions

| Function | Purpose |
|----------|---------|
| `file-handler` | Issues signed Cloudinary upload tickets with quota enforcement |
| `cloudinary-delete` | Deletes a file from Cloudinary and refunds storage quota |
| `cloudinary-webhook` | Receives Cloudinary upload notifications to record actual file sizes |
| `delete-note` | Deletes a note (private or shared) and its associated Cloudinary assets |

---

## 📁 Project Structure

### Client (`client/src/`)

```
src/
├── Context/
│   └── AuthContext.tsx          # Auth provider — manages session, user, profile
├── Editor/
│   ├── blockNote.tsx            # Private note editor (BlockNote + IndexedDB)
│   ├── collabEditor.tsx         # Collaborative editor (BlockNote + Yjs + WebSocket)
│   └── previewText.tsx          # Read-only shared note previewer
├── IndexDB/
│   └── db.tsx                   # IndexedDB CRUD for offline notes
├── Pages/
│   ├── Home/Home.tsx            # Main dashboard — sidebar + editor
│   ├── Login/Login.tsx          # Login page with "Continue as" support
│   ├── SignUp/                  # Registration + email verification
│   └── CollaboratioPage/       # Collaborative editing page with sidebar
├── component/
│   ├── Sidebar/newSidebar.tsx   # Main sidebar — private, shared, and others' notes
│   └── Input/                   # Reusable input components
├── repositories/
│   ├── notes.repository.ts      # Private notes CRUD (Supabase)
│   ├── shared_notes.repositories.ts  # Shared notes CRUD
│   ├── note_collaborators.repository.ts  # Collaborator management
│   └── profiles.repository.ts  # User profile operations
├── store/
│   └── store.ts                 # Zustand global state (userId, notes, shared groups)
├── utils/
│   ├── autoSync.tsx             # Background sync of unsynced notes
│   ├── ConflictHandler.tsx      # Offline ↔ online merge logic
│   ├── uploadFile.ts            # Cloudinary signed upload flow
│   ├── deleteCloudinaryFile.ts  # Cloudinary file deletion
│   ├── deleteNote.ts            # Cloud note deletion via edge function
│   ├── verifyUser.tsx           # Auth verification hook
│   └── collabUtils/             # Shared image upload/delete utilities
├── lib/
│   └── supabase.ts              # Lazy-loaded Supabase client singleton
├── auth/
│   └── protectedRoute.tsx       # Route guard for authenticated users
└── telemetry/
    └── TelemetryMonitor.ts      # Client-side sync telemetry
```

### Server (`server/src/`)

```
src/
├── index.ts                     # HTTP + WebSocket server, Yjs persistence pipeline
├── lib/
│   └── supabase.ts              # Server-side Supabase client
├── middleware/
│   └── authUser.ts              # JWT auth + note permission middleware
├── repositories/
│   └── index.ts                 # Supabase queries (shared notes, collaborators)
└── telemetry/
    └── TelemetryAggregator.ts   # Server-side sync metrics
```

---

## 🔧 Key Technical Details

### Offline-First Sync Strategy
1. Notes are **always saved to IndexedDB first** (instant save)
2. A debounced `autoSync` pushes unsynced notes to Supabase every 3 seconds
3. On page load, `ConflictHandler` compares timestamps:
   - **Local newer** → Push to cloud
   - **Cloud newer** → Pull to local
   - **Equal** → No action

### Yjs Collaboration Pipeline
1. Client connects via WebSocket with a JWT token in the query string
2. Server middleware verifies the token and checks note permissions
3. Early messages are **buffered** during async auth to prevent sync handshake failures
4. Document state is persisted to `shared_notes.content` (bytea) with debounced saves
5. A **size guard** prevents empty snapshots from overwriting real content during page refresh

### State Management
- **Zustand store** — Centralized `userId`, `userD`, `notes`, `allSharedGroups`
- **Store-first pattern** — Repositories read `userId` from the store before calling `auth.getUser()`, eliminating redundant backend calls
- **AuthContext** syncs all auth state to both React state and the Zustand store

---

## 🚢 Deployment

### Client → Vercel
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- SPA routing handled via `vercel.json` rewrites

### Server → Render (or any Node.js host)
- Build: `npm run build`
- Start: `npm start` (runs `node dist/index.js`)
- Requires WebSocket support
- Environment variables must be configured in the hosting dashboard

### Production Environment Variables

For production, update:
```env
# client/.env
VITE_SERVER_URL=wss://your-server-domain.onrender.com

# server/.env (set via hosting dashboard)
supabaseurl=https://your-project-id.supabase.co
annonkey=your-anon-key
secret=your-jwt-secret
```

---

## 📄 License

This project is for personal/educational use.