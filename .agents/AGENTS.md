# My-Buddy Project Rules

1. **Buddy Context**: You are working on "My-Buddy", an Electron+React app where the user's desktop buddy (Raiden Shogun) lives.
2. **Electron IPC**: The main process (`electron/main.ts`) handles window sizing, physics, and background polling (Spotify, RAM guard, active window). The React renderer (`src/App.tsx`) handles the UI and user interaction (dragging, clicking).
3. **Avatar States**: The Buddy has states like `idle`, `active`, `ready`, `thinking`, `walking-left`, `walking-right`, `paused`, and `dizzy`. Update the state via `win.webContents.send('ai-state-change', state)` from the main process.
4. **RAM Guard**: Always be mindful that the Ollama process can be killed to save RAM when the user plays games. Do not assume Ollama is always active.
5. **Window Resizing**: Never change the avatar window size to be larger than 45x45 when in `avatar` mode, or the physics boundary logic will glitch out and the avatar will drift off-screen.

6. **Generating Character Bundles**: When generating new character bundles for the Cloud Marketplace (My-Buddy-Marketplace repository), you must generate transparent images using the generate_image tool for every required state (idle, active, thinking, walking-left, etc.). Make sure to create the manifest.json properly and append to index.json. Bundles should be thoroughly configured with characterName, 	hemeColor, characterTips, and a personalityPrompt.

7. **Character Bundles Animation**: When generating character bundles, ALWAYS read uddyim.md for the exact required animation behaviors and image states. Do NOT use fake programmatic animations (stretching/skewing). You must generate distinct poses.

