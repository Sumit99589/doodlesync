# Doodle Sync

A real-time collaborative drawing canvas web application. Create or join rooms protected by password-based encryption, draw, write text, and chat with team members in real-time. There is no signup or registration required — the first user to enter a room sets its password.

---

## Key Features

### 1. Collaborative Drawing Engine
- **Rich Vector Tools**: Draw Rectangles, Ellipses, Arrows, Freehand Pen strokes (smoothed using Chaikin's corner-cutting algorithm), and Text elements.
- **Select, Drag & Move**: Click and grab any drawing element to move it around the canvas in real-time.
- **Eraser Tool**: Intuitively delete individual vector elements.
- **Undo / Redo**: Global document undo/redo timeline built on top of Yjs transaction managers.
- **Infinite Canvas Navigation**:
  - Zoom in/out via Ctrl + scroll (minimum 10% to maximum 1000%).
  - Pan around using middle-click drag or Spacebar + drag.
  - Zoom controls panel cleanly positioned in the bottom-left corner.

### 2. Multi-User Presence & Sync
- **Live Vector Sync**: Zero-latency conflict-free merging of shapes and paths using CRDTs.
- **Remote Cursors**: See where other users are pointing in real-time with custom color cursor overlays and names.
- **Presence Bar**: Online user avatars and live count indicators visible in the top-right corner.

### 3. Real-Time In-Room Chat
- **Integrated Sidebar Panel**: Collapsible 280px chat drawer on the right side of the canvas.
- **Unread Notification Badge**: A blue floating trigger button in the bottom-right corner with a white chat icon. Shows a red unread count badge when the chat drawer is closed.
- **Visual Message Bubble Distinctions**:
  - Your own messages are right-aligned with a subtle 15% opacity background matching your unique cursor color.
  - Others' messages are left-aligned with a dark translucent background.
- **Auto-Grow Textarea**: Standard textarea that grows dynamically up to 3 lines before scrolling.
- **Character Constraint**: Supports up to 500 characters. Displays a visual character counter when typing exceeds 400 characters, turning red at the limit.
- **Scroll Lock**: Automatically scrolls to the bottom on new messages *only* if the user is already scrolled to the bottom (reading history is never interrupted).

### 4. Database Persistence & Security
- **Hashed Room Access**: Join or create rooms by room name + password. The server hashes passwords using `bcrypt` and performs secure validation before signing JWT session tokens.
- **State Serialization**: Saves the complete Yjs CRDT document structure as a byte-array binary blob (`BYTEA`) in PostgreSQL, ensuring no drawings or chat history are lost.
- **Smart Debouncing**: Tracks "dirty" states in memory and flushes changes to the database every 5 seconds or immediately when the last user exits the room.
- **Graceful Shutdown**: Intercepts `SIGINT` / `SIGTERM` signals on the server to flush all active in-memory room states to PostgreSQL before shutting down.

---

## Technology Stack

### Frontend
- **React (Vite)**: Component-based modular UI.
- **Zustand**: Fast and lightweight client-side state management for transient values (selected elements, zoom scale, panels).
- **Yjs**: High-performance CRDT framework for collaborative editing.
- **y-protocols**: Standard protocols for WebSocket sync and user awareness.
- **Tailwind CSS v4**: Utility-first CSS compiling with modern custom variables.
- **HTML5 Canvas 2D API**: Vector graphics rendering pipeline.

### Backend
- **Node.js + Express**: Core REST APIs and static file routing.
- **Socket.io (WebSockets)**: Real-time bi-directional message routing.
- **pg (node-postgres)**: PostgreSQL client connection pool.
- **bcryptjs**: Password hashing (1 round for fast checks).
- **jsonwebtoken (JWT)**: Secure connection upgrade handshakes.

### Database
- **PostgreSQL**: Relational database storage.

---

## Project Structure

```
d:\draw\
├── docker-compose.yml          # Configures PostgreSQL container
├── README.md                   # Project documentation
└── server/
│   ├── .env                    # Environment credentials
│   ├── index.js                # WebSocket + HTTP server setup
│   ├── db.js                   # pg Pool client setup
│   ├── rooms.js                # Room registration & JWT token signatures
│   ├── setup-db.js             # Table creation script
│   └── persistence.js          # In-memory Y.Doc caching & DB binary serialization
└── client/
    ├── vite.config.js          # Vite config & API/Collab reverse proxy
    ├── index.html              # HTML shell & SEO meta elements
    └── src/
        ├── main.jsx            # Entry point
        ├── App.jsx             # Authentication router (JoinRoom ↔ Canvas)
        ├── constants.js        # Config parameters & helper libraries
        ├── index.css           # Styling directives & layout variables
        ├── store/
        │   ├── canvasStore.js  # Zustand state for active tool, styles, zoom/pan
        │   ├── chatStore.js    # Zustand state for chat toggles & unread seen metrics
        │   └── roomStore.js    # Zustand state for identity, room auth & presence
        ├── lib/
        │   ├── yjs.js          # CRDT Doc, Socket connections, and Awareness bindings
        │   ├── elements.js     # Vector creation, bounding boxes, & scale-adjusted hit testing
        │   ├── renderer.js     # Render loop, grids, shapes, and selection box drawings
        │   └── smoothPath.js   # Chaikin's corner-cutting stroke smoothing
        ├── hooks/
        │   └── useYjsSync.js   # Bridges Yjs arrays/awareness events to Zustand stores
        └── components/
            ├── JoinRoom.jsx    # Glassmorphic secure room enter panel
            ├── Canvas.jsx      # Canvas canvas lifecycle and keyboard handlers
            ├── Toolbar.jsx     # Side floating tool list
            ├── TopBar.jsx      # Vector stroke, fill, width, and opacity controls
            ├── PresenceBar.jsx # Avatar listing of online users
            ├── CursorOverlay.jsx # Remote SVG cursor overlays
            └── ChatPanel.jsx   # Real-time chat panel & floating toggle badge
```

---

## Quick Start Setup

### Prerequisites
- **Node.js** (v18 or higher recommended)
- **Docker** (optional, for simple DB startup)

---

### Step 1: Database Setup

#### Option A: Docker (Recommended)
Launch a pre-configured PostgreSQL container:
```bash
docker compose up -d
```
This runs PostgreSQL on `localhost:5432` with the database `canvas_db`.

#### Option B: Manual PostgreSQL
Create a database named `canvas_db` on your local PostgreSQL server:
```sql
CREATE DATABASE canvas_db;
```

---

### Step 2: Configure & Start Server

1. Navigate to the `server` directory:
   ```bash
   cd server
   ```
2. Create your `.env` configuration file:
   ```bash
   cp .env.example .env
   ```
3. *(Optional)* Modify `.env` variables if your database login differs:
   - `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/canvas_db`
   - `JWT_SECRET=your_jwt_secret`
4. Install backend dependencies:
   ```bash
   npm install
   ```
5. Initialize the database table schema:
   ```bash
   node setup-db.js
   ```
6. Start the server:
   ```bash
   node index.js
   ```
   The API server will listen on `http://localhost:3001` and expose WebSockets at `/collab`.

---

### Step 3: Start Client

1. Open a new terminal and navigate to the `client` directory:
   ```bash
   cd client
   ```
2. Install client-side dependencies:
   ```bash
   npm install
   ```
3. Start the Vite dev server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## How Synchronization Works Under the Hood

### 1. The Yjs CRDT Synchronization Protocol
Instead of routing individual stroke points manually, the canvas uses a shared Yjs `Y.Doc` document. Inside the document:
- `ydoc.getArray('elements')` holds vector elements.
- `ydoc.getArray('chat')` holds message structures.

When a client joins:
1. The client connects to `ws://localhost:5173/collab` (proxied by Vite to the Express backend).
2. The server authenticates the JWT session handshake.
3. The client sends `syncStep1` (its current state vector) to request updates.
4. The server responds with `syncStep2` (the missing updates) and sends its own `syncStep1` to align vectors.
5. Once aligned, any local transaction applied to the document (e.g., drawing shapes or sending chat messages) triggers the `ydoc.on('update')` listener, encoding only the changes and routing them to the server.
6. The server receives the update (setting the websocket client as the transaction origin) and broadcasts it to all other connections in the room.

### 2. Tab Isolation via Session Storage
User names and session identifiers are stored inside `sessionStorage`. This isolates user identities between different browser tabs in the same browser, allowing developers to test multi-user collaborative drawing and chat side-by-side on a single screen without overlapping identities.

---

## Database Schema

The database table `rooms` is initialized with the following structure:
```sql
CREATE TABLE IF NOT EXISTS rooms (
    id VARCHAR(255) PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    ydoc_state BYTEA, -- Holds the complete binary serialized Yjs document
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
When room state changes, Yjs updates are serialized to byte arrays (`Y.encodeStateAsUpdate`) and stored inside the `ydoc_state` column.
