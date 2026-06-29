 # My-Buddy — your desktop companion
 
 A living, breathing desktop buddy that wanders your screen, talks to you, remembers what you love, and keeps you company — powered by local AI, built with Electron and React.
 
 My-Buddy is a system-tray pet that lives on your desktop. It walks around with its own physics engine, comments on what you are doing, plays music from Spotify on command, and remembers facts, songs, and playlists across sessions.
 
 Built for Windows (with Electron), running entirely on your machine through Ollama.
 
 ## Features
 
 **Autonomous Desktop Pet** — Walks around your screen with organic physics, steering toward random waypoints, bouncing off edges, and drifting to a stop. Drag to pick her up, flick to throw her across the monitor.
 
 **Local AI Companion** — Chat through a pop-up bubble. Powered by Ollama + Llama 3 running fully offline. She reacts to what you are doing, comments on apps you open, and makes spontaneous remarks about songs you play.
 
 **Persistent Memory** — She remembers. Facts you tell her, songs you play on Spotify, playlists you save — all persisted to disk and recalled naturally in conversation.
 
 **Spotify Integration** — "Play some chill vibes" and she will search Spotify, queue the track, and remember what you listened to. Full OAuth flow built in. Falls back to the desktop app if the API cannot reach a device.
 
 **RAM Guard** — Playing Valorant or Minecraft? My-Buddy automatically unloads Ollama to free RAM, and wakes up when you close the game. Zero configuration needed.
 
 **Customizable Avatar** — Every state (idle, walking, thinking, talking, dizzy) has its own image. Upload custom sprites individually or use the Smart Walking Generator to create full animation sets from a single image.
 
 **Always-on System Tray** — Lives in the tray. Ctrl+Shift+Space toggles visibility. Click the tray icon to show or hide her. She stays out of your way.
 
 ## Tech Stack
 
 | Layer | What |
 |---|---|
 | Desktop | Electron 42, frameless transparent window, system tray |
 | UI | React 19, TypeScript, CSS animations |
 | AI | Ollama API (llama3), structured memory store |
 | Music | Spotify Web API with OAuth PKCE |
 | Build | Vite 8, esbuild, electron-builder |
 | Physics | Custom 60fps loop with waypoint steering, velocity, edge collision |
 
 ## Getting Started
 
 ### Prerequisites
 
 - Node.js 22+
 - Ollama with llama3 pulled (`ollama pull llama3`)
 - (Optional) Spotify Developer app credentials for music features
 
 ### Install and Run
 
 ```sh
 git clone https://github.com/your-username/my-buddy.git
 cd my-buddy
 npm install
 npm run dev
 ```
 
 This starts the Vite dev server and launches the Electron window. Your buddy appears centered on screen, ready to explore.
 
 ### Build for Distribution
 
 ```sh
 npm run build
 ```
 
 Produces a distributable Electron app via electron-builder.
 
 ## Architecture
 
 ```
 my-buddy/
 ├── electron/                   # Main process (Electron)
 │   ├── main.ts                 # Window creation, physics loop, tray, IPC
 │   ├── preload.ts              # Context bridge :exposes renderer API
 │   ├── aiService.ts            # Ollama chat, memory persistence, tool parsing
 │   ├── spotifyService.ts       # OAuth, search, playback, song polling
 │   ├── activeWindow.ts         # Win32 foreground window detection
 │   ├── ramGuard.ts             # Game detection → Ollama unload
 │   └── avatarService.ts        # Custom avatar image management
 ├── src/                        # Renderer (React)
 │   ├── App.tsx                 # State machine, drag handling, layout
 │   ├── index.css               # Neon theme, animations, scrollbars
 │   ├── components/
 │   │   ├── BuddyAvatar.tsx     # Image selector by state, walk animation
 │   │   ├── ChatBubble.tsx      # Speech bubble with thinking animation
 │   │   ├── InputTray.tsx       # Chat input with auto-focus
 │   │   └── SettingsMenu.tsx     # Memory, Spotify, avatar editor
 │   └── assets/                 # Default avatar sprites
 └── .agents/                    # Codex agent development config
 ```
 
 ### Key Design Decisions
 
 **Physics in the main process.** The 60fps update loop runs in the Electron main process and drives `BrowserWindow.setBounds()` directly. This keeps the animation smooth and decoupled from React's render cycle.
 
 **Structured memory over chat history.** Instead of stuffing everything into the LLM context window, the AI service maintains a typed memory store with song plays, playlists, and freeform facts. The system prompt is rebuilt with only relevant context on each request.
 
 **Fallback-first Spotify.** The player tries the Web API first, then falls back to launching the Spotify URI in the desktop app and simulating Enter via PowerShell. Music works even without a premium account or active device.
 
 **RAM-aware by design.** The RAM Guard unloads Ollama's model when games are detected. The physics loop catches silently. The avatar window is 45x45 pixels — minimal footprint.
 
 ### Avatar States
 
 | State | Description |
 |---|---|
 | idle | Standing still |
 | active | Engaged, listening |
 | ready | Awake and attentive |
 | thinking | Processing a response |
 | walking-left / walking-right | Walking with 2-frame animation |
 | paused | Inactive or hidden |
 | dizzy | Stunned or overloaded |
 
 ### IPC Channels (Renderer → Main)
 
 | Channel | Purpose |
 |---|---|
 | send-to-ollama | Chat message, get AI response |
 | resize-window | Toggle avatar mode or full UI |
 | drag-window / end-drag | Move window, throw on release |
 | save-spotify-config | Store Spotify developer credentials |
 | select-avatar-image | File picker for avatar state |
 | save-generated-avatar-set | Save auto-generated sprite set |
 
 ### System Prompt Tools (Ollama)
 
 The LLM emits structured tool calls in its response text:
 
 - `[TOOL:SPOTIFY:query]` — search and play on Spotify
 - `[TOOL:SPOTIFY_URI:spotify:xxx]` — play a known URI from memory
 - `[TOOL:REMEMBER:fact]` — save a fact to long-term memory
 - `[TOOL:SAVE_PLAYLIST:name|uri]` — remember a playlist
 
 ## Configuration
 
 **Spotify:** Open the settings menu (right-click the avatar), enter your Client ID and Client Secret from the Spotify Developer Dashboard, then click Connect. A browser window opens for OAuth.
 
 **Avatar:** Same settings menu, then Edit Avatar. Upload images per state, or use the Smart Walking Generator to create full walk cycles from a single sprite.
 
 **Model:** Currently hardcoded to `llama3`. Edit `MODEL_NAME` in `electron/aiService.ts` and `electron/ramGuard.ts` to switch models.
 
 ## Keyboard Shortcuts
 
 | Shortcut | Action |
 |---|---|
 | Ctrl+Shift+Space | Toggle buddy visibility |
 | Escape | Close chat input or settings |
 
 ## Development
 
 ```sh
 npm run dev       # Start dev server + Electron
 npm run lint      # oxlint
 npm run build     # TypeScript check + Vite build + electron-builder
 ```
 
 The app uses two TypeScript configs (`tsconfig.app.json` for the renderer, `tsconfig.node.json` for the main process), both checked during build.
 
 ## License
 
 MIT
