# My-Buddy — your desktop companion

A living, breathing desktop buddy that wanders your screen, talks to you, remembers what you love, and keeps you company — powered by local AI, built with Electron and React.

My-Buddy is a system-tray pet that lives on your desktop. It walks around with its own physics engine, comments on what you're doing, plays music from Spotify on command, and remembers facts, songs, and playlists across sessions.

Built for Windows, running entirely on your machine through Ollama.

---

## Features

**Autonomous Desktop Pet** — Walks around your screen with organic physics, steering toward random waypoints, bouncing off edges, and drifting to a stop. Drag to pick her up, flick to throw her across the monitor. Mood system changes her speed and behavior based on how recently you've interacted.

**Local AI Companion** — Chat through a pop-up bubble. Powered by Ollama running fully offline. She reacts to what you're doing and makes spontaneous remarks.

**Persistent Memory** — She remembers. Facts you tell her, songs you play on Spotify, playlists you save — all persisted to disk and recalled naturally in conversation.

**Spotify Integration** — "Play some chill vibes" and she'll search Spotify, queue the track, and remember what you listened to. Full OAuth flow built in. Music awareness: she bops to the beat when music starts.

**RAM Guard** — Playing games? My-Buddy automatically unloads Ollama to free RAM, and wakes up when you close the game. Zero configuration needed.

**Customizable Avatar** — Every state (idle, walking, thinking, talking, dizzy) has its own image. Upload custom sprites individually or use the Smart Walking Generator to create full animation sets. Bundle and share your avatar with the built-in Marketplace.

**Avatar Marketplace** — Create, upload, and install avatar bundles. Bundle your entire sprite set, upload it to share, and install bundles made by others.

**Proactive Messages** — She doesn't just wait for you to talk. She stretches, hums, notices you, and sends random messages every minute or two. Greets you when you come back after being away.

**Always-on System Tray** — Lives in the tray. Click the tray icon to show or hide her. Ctrl+Shift+Space toggles visibility.

---

## Getting Started

### Quick Install (End User)

Download the latest installer from the [Releases](https://github.com/your-username/my-buddy/releases) page and run it. The app will install and you can launch it from the Start Menu or desktop shortcut.

### For Development

#### Prerequisites

- Node.js 22+
- Ollama with llama3 pulled (`ollama pull llama3`)
- (Optional) Spotify Developer app credentials for music features

#### Install and Run

```sh
git clone https://github.com/your-username/my-buddy.git
cd my-buddy
npm install
npm run dev
```

This starts the Vite dev server and launches the Electron window. Your buddy appears centered on screen, ready to explore.

#### Build for Distribution

```sh
npm run build
```

This runs Vite (building both the React app and Electron main process) then packages everything into an NSIS installer via electron-builder. The installer is output to `dist_app/`.

> **Note:** If you encounter file lock errors during the build, see [Build Troubleshooting](#build-troubleshooting).

---

## User Guide

### Basic Usage

| Action | How |
|--------|-----|
| **Talk to her** | Click on the buddy. A speech bubble appears. Click it again to open the chat input. Type your message and press Enter. |
| **Drag her around** | Click and hold anywhere on the buddy, then drag. Release to throw her — she'll arc through the air and land. |
| **Open settings** | Right-click the buddy. The settings menu appears with three tabs. |
| **Set your name** | Right-click → Settings → type your name in the "Your Name" field. The tray tooltip updates immediately. |
| **Close chat / settings** | Press Escape. |

### Tray Icon

- **Left-click tray icon** — Toggle buddy visibility (show/hide)
- **Right-click tray icon** — Context menu with Set Name and Quit options
- **Tray tooltip** — Shows your configured name (default: "Buddy")

### Settings Menu

Right-click the buddy to open settings. Three views:

**Main** — Your name, memory overview (songs, playlists, facts), Spotify credentials, manual memory input.

**Edit Avatar** — Upload custom images for each avatar state. The gallery preview lets you cycle through all states. Use the Smart Walking Generator to auto-create walking sprites from a single image.

**Marketplace** — Browse and install avatar bundles uploaded by others. Upload your own avatar set as a bundle to share.

### Memory

The buddy remembers things across sessions. Say "remember that my favorite color is blue" in chat, and she'll save it as a fact. All memories (songs played, playlists saved, facts told) are shown in the settings menu.

### Spotify

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/)
2. Create an app, note the Client ID and Client Secret
3. Right-click the buddy → Settings → enter both credentials
4. Click Connect — a browser window opens for OAuth
5. Once connected, you can say "play some chill vibes" or "play [song name]"

---

## Architecture

```
my-buddy/
├── electron/                   # Main process (Electron)
│   ├── main.ts                 # Window creation, physics loop, tray, IPC
│   ├── preload.ts              # Context bridge — exposes renderer API
│   ├── aiService.ts            # Ollama chat, memory persistence, tool parsing
│   ├── spotifyService.ts       # OAuth, search, playback, song polling
│   ├── activeWindow.ts         # Win32 foreground window detection
│   ├── ramGuard.ts             # Game detection → Ollama unload
│   ├── avatarService.ts        # Custom avatar image management
│   └── avatarMarketplace.ts    # Bundle creation, install, listing
├── src/                        # Renderer (React)
│   ├── App.tsx                 # State machine, drag handling, layout
│   ├── index.css               # Neon theme, animations, scrollbars
│   ├── components/
│   │   ├── BuddyAvatar.tsx     # Image selector by state, walk animation
│   │   ├── ChatBubble.tsx      # Speech bubble with thinking animation
│   │   ├── InputTray.tsx       # Chat input with auto-focus
│   │   └── SettingsMenu.tsx    # Memory, Spotify, avatar editor, marketplace
│   └── assets/                 # Default avatar sprites
├── public/
│   └── icon.png                # Tray icon (default idle avatar)
└── .gitignore
```

### Key Design Decisions

**Physics in the main process.** The 60fps update loop runs in the Electron main process and drives `BrowserWindow.setBounds()` directly. This keeps the animation smooth and decoupled from React's render cycle.

**Structured memory over chat history.** Instead of stuffing everything into the LLM context window, the AI service maintains a typed memory store with song plays, playlists, and freeform facts. The system prompt is rebuilt with only relevant context on each request.

**Fallback-first Spotify.** The player tries the Web API first, then falls back to launching the Spotify URI in the desktop app and simulating Enter via PowerShell. Music works even without a premium account or active device.

**RAM-aware by design.** The RAM Guard unloads Ollama's model when games are detected. The physics loop handles it silently. The avatar window is 45x45 pixels — minimal footprint.

### Physics Engine

- Waypoint-based walking: she picks random targets and walks toward them
- Mood-based speed: bouncy (fastest) → happy → neutral → sleepy (slowest)
- Edge bouncing: she bounces off screen edges and picks a new target
- Throw physics: drag and release sends her arcing through the air
- Micro-actions while idle: blinks, glances, looks around, random bounces
- Music awareness: bops to the beat when Spotify starts playing

### Mood System

| Condition | Mood |
|-----------|------|
| Spotify playing | Bouncy |
| Interacted < 30s ago | Bouncy |
| 30s–2 min ago | Happy |
| 2–5 min ago | Neutral |
| > 5 min ago | Sleepy |
| 10pm–7am | Sleepy |
| 6am–12pm | Happy |

### Avatar States

| State | Description |
|-------|-------------|
| idle | Standing still |
| active | Engaged, listening |
| very-active | Excited |
| ready | Awake and attentive |
| thinking | Processing a response |
| walking-left / walking-right | Walking with 2-frame animation |
| paused | Inactive or hidden |
| dizzy | Stunned or overloaded |
| blink | Quick eye blink |
| glance-left / glance-right | Glances to the side |
| look-around | Looks around curiously |

### IPC Channels (Renderer → Main)

| Channel | Purpose |
|---------|---------|
| send-to-ollama | Chat message, get AI response |
| resize-window | Toggle avatar mode or full UI |
| drag-window / end-drag | Move window, throw on release |
| save-spotify-config | Store Spotify developer credentials |
| get-avatar-config | Load custom avatar image paths |
| select-avatar-image | File picker for avatar state |
| save-generated-avatar-set | Save auto-generated sprite set |
| get-user-name / set-user-name | User's display name |
| update-tray-icon | Update tray icon to match idle avatar |
| create-bundle / install-bundle / list-bundles | Avatar marketplace |

### System Prompt Tools (Ollama)

The LLM emits structured tool calls in its response text:

- `[TOOL:SPOTIFY:query]` — search and play on Spotify
- `[TOOL:SPOTIFY_URI:spotify:xxx]` — play a known URI from memory
- `[TOOL:REMEMBER:fact]` — save a fact to long-term memory
- `[TOOL:SAVE_PLAYLIST:name|uri]` — remember a playlist

### User Data Locations

| Data | Location |
|------|----------|
| Chat memory, songs, facts | `%APPDATA%\My-Buddy\memory_box.json` |
| Spotify credentials | `%APPDATA%\My-Buddy\spotify_*.json` |
| Custom avatar images | `%APPDATA%\My-Buddy\avatars\` |
| Avatar config | `%APPDATA%\My-Buddy\avatar-config.json` |
| User name | `%APPDATA%\My-Buddy\user-name.json` |
| Marketplace bundles | `%APPDATA%\My-Buddy\bundles\` |

To reset the app to factory defaults, delete the `%APPDATA%\My-Buddy\` folder while the app is closed.

---

## Configuration

**Your Name:** Right-click the buddy → Settings → type your name in the "Your Name" field. The tray tooltip updates immediately. Default: "Buddy".

**Spotify:** Open the settings menu (right-click the avatar), enter your Client ID and Client Secret from the Spotify Developer Dashboard, then click Connect. A browser window opens for OAuth.

**Avatar:** Same settings menu, then Edit Avatar. Upload images per state, or use the Smart Walking Generator to create full walk cycles from a single sprite. Use the Marketplace to browse and install bundles.

**Model:** Currently defaults to `llama3`. Edit `MODEL_NAME` in `electron/aiService.ts` and `electron/ramGuard.ts` to switch models.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+Shift+Space | Toggle buddy visibility |
| Escape | Close chat input or settings |
| Alt+Click | Navigate buddy to cursor position |

---

## Development

```sh
npm run dev       # Start dev server + Electron
npm run lint      # oxlint
npm run build     # Vite build + electron-builder
```

The app uses two TypeScript configs (`tsconfig.app.json` for the renderer, `tsconfig.node.json` for the main process).

### Build Troubleshooting

If `npm run build` fails with `EBUSY` or `EPERM` errors about locked files:

1. Close the My-Buddy app if it's running
2. Delete the `dist_app/` folder manually
3. Try building again

If the error persists, build to a temp directory instead:

```sh
npx vite build
npx electron-builder --win nsis --config.directories.output="%TEMP%\my-buddy-build" --config.electronDist=node_modules/electron/dist
```

---

## License

MIT
