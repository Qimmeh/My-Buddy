import { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, screen, nativeImage } from 'electron'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { promises as fs } from 'node:fs'
import { startRamGuard } from './ramGuard.js'
import { startAiService } from './aiService.js'
import { saveSpotifyConfig, authenticateSpotify, loadSpotifyConfig, isSpotifyPlaying } from './spotifyService.js'
import { getAvatarConfig, selectAndCopyAvatarImage, resetAvatarImage, saveGeneratedAvatarSet } from './avatarService.js'
import { createBundle, installBundle, listBundles, canUploadBundle, deleteBundle } from './avatarMarketplace.js'
import { getCharacterConfig, saveCharacterConfig } from './characterConfig.js'

loadSpotifyConfig()

app.commandLine.appendSwitch('disable-backgrounding-occluded-windows', 'true')
app.commandLine.appendSwitch('disable-renderer-backgrounding', 'true')
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion')

const __dirname = dirname(fileURLToPath(import.meta.url))
const preload = join(__dirname, 'preload.js')

let win = null
let tray = null

// User name
let userName = 'User'
const USER_NAME_PATH = join(app.getPath('userData'), 'user-name.json')

// Physics state
let px = 0, py = 0
let vx = 2, vy = 1.5
let targetX = 0, targetY = 0
let idleFrames = 0
const SIZE = 45
let currentMode = 'avatar'
let lastSendState = ''
let isGrabbed = false

// Alive behaviors
let microActionTimer = 0
let moodTimer = 0
let lastInteractionTime = Date.now()
let mood = 'neutral'
let mouseNearby = false
let proactiveTimer = 0
let greetingTimer = 0
let hasGreeted = false
let wasMusicPlaying = false

const proactiveMessages = [
  "*stretches*",
  "*wonders what you're doing*",
  "*hums a little tune*",
  "*looks around curiously*",
  "*feeling cozy today*",
  "*zzz... oh! was I sleeping?*",
  "*checks the time*",
  "*thinks about going for a walk*",
  "*notices you looking*",
  "*smiles*",
  "*daydreams*",
  "*plays with a stray pixel*",
  "*watches the cursor curiously*",
  "*feels a breeze*",
  "*notices something interesting*",
  "*happily wiggles*",
]

function sendMicroAction(action) {
  if (win && !win.isDestroyed()) {
    win.webContents.send('micro-action', action)
  }
}

function sendState(state) {
  if (win && !win.isDestroyed() && lastSendState !== state) {
    lastSendState = state
    win.webContents.send('ai-state-change', state)
  }
}

async function loadUserName() {
  try {
    const data = await fs.readFile(USER_NAME_PATH, 'utf-8')
    const parsed = JSON.parse(data)
    if (parsed.name) userName = parsed.name
  } catch { /* file doesn't exist yet */ }
}

async function saveUserName(name: string) {
  userName = name
  try {
    await fs.writeFile(USER_NAME_PATH, JSON.stringify({ name }))
  } catch (err) {
    console.error('Failed to save user name:', err)
  }
  // Update tray tooltip
  if (tray && !tray.isDestroyed()) {
    tray.setToolTip(userName + ' Buddy')
  }
}

function pickNewTarget(wa) {
  const margin = SIZE * 2
  let tx, ty, attempts = 0
  do {
    tx = wa.x + margin + Math.random() * (wa.width - margin * 2)
    ty = wa.y + margin + Math.random() * (wa.height - margin * 2)
    attempts++
  } while (Math.hypot(tx - px, ty - py) < 300 && attempts < 20)
  targetX = tx
  targetY = ty
  idleFrames = 0
}

function startPhysicsLoop() {
  setInterval(() => {
    try {
      if (!win || win.isDestroyed() || currentMode !== 'avatar' || isGrabbed) return

      const display = screen.getPrimaryDisplay()
      const wa = display.workArea
      if (!wa || !wa.width || !wa.height) return

      // Lazily pick first target
      if (targetX === 0 && targetY === 0) pickNewTarget(wa)

      // --- Waypoint steering ---
      const dx = targetX - px
      const dy = targetY - py
      const dist = Math.hypot(dx, dy)

     if (dist < 3) {
       // Arrived — idle for a bit, then pick a new destination
       vx = 0
       vy = 0
       idleFrames++
       if (idleFrames > 1800) pickNewTarget(wa)
          microActionTimer++
          if (microActionTimer > 200 + Math.random() * 300) {
            microActionTimer = 0
            const r = Math.random()
            if (r < 0.25) sendMicroAction('blink')
            else if (r < 0.5) sendMicroAction(Math.random() > 0.5 ? 'glance-left' : 'glance-right')
            else if (r < 0.75) sendMicroAction('look-around')
            else sendMicroAction('bounce')
          }
      } else {
        // Walk toward target with organic speed
        // Mood-based speed
        let baseSpeed = 0.8
        if (mood === 'bouncy') baseSpeed = 1.5 + Math.random() * 0.5
        else if (mood === 'happy') baseSpeed = 1.0 + Math.random() * 0.4
        else if (mood === 'sleepy') baseSpeed = 0.5 + Math.random() * 0.3
        else baseSpeed = 0.8 + Math.random() * 0.4
        if (mouseNearby) baseSpeed *= 1.3
        const speed = baseSpeed
        vx = (dx / dist) * speed
        vy = (dy / dist) * speed + 0.15
        if (Math.random() < 0.002) sendMicroAction('bounce')
      }

      // Integrate position
      px += vx
      py += vy

      // Bounce off edges — on hit, reflect and pick a new target
      // Right edge
      if (px + SIZE >= wa.x + wa.width) {
        px = wa.x + wa.width - SIZE
        vx = -(1.5 + Math.random() * 1.5)
        pickNewTarget(wa)
      }
      // Left edge
      else if (px <= wa.x) {
        px = wa.x
        vx = 1.5 + Math.random() * 1.5
        pickNewTarget(wa)
      }
      // Bottom edge
      if (py + SIZE >= wa.y + wa.height) {
        py = wa.y + wa.height - SIZE
        vy = -(1.0 + Math.random() * 1.0)
        pickNewTarget(wa)
      }
      // Top edge
      else if (py <= wa.y) {
        py = wa.y
        vy = 1.0 + Math.random() * 1.0
        pickNewTarget(wa)
      }

     // Attention-seeking when ignored
     if (mood === 'sleepy' && dist < 3 && Math.random() < 0.0005) {
       sendMicroAction('bounce');
     }

      // Music awareness - boost mood when Spotify is playing
      const musicPlaying = isSpotifyPlaying()
      if (musicPlaying && !wasMusicPlaying) {
        // Music just started! React with a bounce
        sendMicroAction('bounce')
        lastInteractionTime = Date.now()
        if (win && !win.isDestroyed()) {
          const reactions = ["*bops to the beat*", "*music makes me happy*", "*starts dancing*", "*feeling the rhythm*"]
          win.webContents.send('proactive-message', reactions[Math.floor(Math.random() * reactions.length)])
        }
      } else if (!musicPlaying && wasMusicPlaying) {
        // Music stopped
        hasGreeted = false
      }
      wasMusicPlaying = musicPlaying

     // Mood system
      moodTimer++
      if (moodTimer > 600) {
        moodTimer = 0
        const elapsed = Date.now() - lastInteractionTime
        if (musicPlaying) { mood = 'bouncy'; return }
        if (elapsed < 30000) mood = 'bouncy'
        else if (elapsed < 120000) mood = 'happy'
        else if (elapsed < 300000) mood = 'neutral'
        else mood = 'sleepy'
        const hour = new Date().getHours()
        if (hour >= 22 || hour < 7) mood = 'sleepy'
        else if (hour >= 6 && hour < 12) { if (mood !== 'sleepy') mood = 'happy' }
        else if (hour >= 17 && hour < 22) { if (mood === 'neutral') mood = 'sleepy' }
      }

      // Proactive messages - every 60-120 seconds when idle and not in full mode
      if (currentMode === 'avatar' && dist < 3 && mood !== 'sleepy') {
        proactiveTimer++
        if (proactiveTimer > 3600 + Math.random() * 3600) {
          proactiveTimer = 0
          sendMicroAction('bounce')
          const msg = proactiveMessages[Math.floor(Math.random() * proactiveMessages.length)]
          if (win && !win.isDestroyed()) {
            win.webContents.send('proactive-message', msg)
          }
        }
      }

      // Greeting on return - after >5 min away, greet when mouse appears
      if (mouseNearby) {
        const awayTime = Date.now() - lastInteractionTime
        if (awayTime > 300000 && !hasGreeted) {
          hasGreeted = true
          sendMicroAction('bounce')
          const greetings = ["Welcome back!", "There you are!", "You're back!", "Hello again!", "Was wondering where you went!"]
          const msg = greetings[Math.floor(Math.random() * greetings.length)]
          if (win && !win.isDestroyed()) {
            win.webContents.send('proactive-message', msg)
          }
        }
      } else {
        hasGreeted = false
      }

      // Hard safety clamp
      px = Math.max(wa.x, Math.min(px, wa.x + wa.width - SIZE))
      py = Math.max(wa.y, Math.min(py, wa.y + wa.height - SIZE))

      // Send state
      if (vx > 0) sendState('walking-right')
      else if (vx < 0) sendState('walking-left')
      else sendState('idle')

      // Single source of truth: setBounds for position AND size together
      win.setBounds({ x: Math.round(px), y: Math.round(py), width: SIZE, height: SIZE })
    } catch (_) {}
  }, 1000 / 60)
}

function createWindow() {
  win = new BrowserWindow({
    width: SIZE,
    height: SIZE,
    show: false,
    frame: false,
    transparent: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    minWidth: 0,
    minHeight: 0,
    webPreferences: { preload, nodeIntegration: true, contextIsolation: true, backgroundThrottling: false, webSecurity: false },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(join(__dirname, '../dist/index.html'))
  }

  win.on('close', (e) => {
    e.preventDefault()
    win?.hide()
  })

  startRamGuard(win)
  startAiService(win)
}

function createTray() {
  let iconPath = join(__dirname, '../public/icon.png')
  if (!process.env.VITE_DEV_SERVER_URL) iconPath = join(__dirname, '../dist/icon.png')
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 24, height: 24 })
  tray = new Tray(icon)
    tray.setToolTip(userName + ' Buddy')
  tray.on('click', () => toggleWindow())
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Set Name...', click: () => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('set-user-name-prompt')
      }
    }},
    { type: 'separator' },
    { label: 'Quit', click: () => { app.quit() } }
  ])
  tray.on('right-click', () => tray?.popUpContextMenu(contextMenu))
}

function toggleWindow() {
  if (!win) return
  if (win.isVisible()) { win.hide() }
  else { win.show() }
}

ipcMain.on('resize-window', (_event, mode) => {
  if (!win || win.isDestroyed()) return
  currentMode = mode
  if (mode === 'avatar') {
    isGrabbed = false
    lastInteractionTime = Date.now()
    const display = screen.getPrimaryDisplay()
    pickNewTarget(display.workArea)
    // Physics loop handles position/size on next tick
  } else {
    const display = screen.getDisplayNearestPoint({ x: Math.round(px), y: Math.round(py) })
    const { workArea } = display
    let fx = Math.round(px - 127.5)
    let fy = Math.round(py - 355)
    if (fx < workArea.x) fx = workArea.x
    if (fx + 300 > workArea.x + workArea.width) fx = workArea.x + workArea.width - 300
    if (fy < workArea.y) fy = workArea.y
    win.setBounds({ x: fx, y: fy, width: 300, height: 400 })
    sendState('ready')
  }
})

ipcMain.on('drag-window', (_event, dx, dy) => {
  if (currentMode === 'avatar') {
    isGrabbed = true
    px += dx; py += dy
    win?.setBounds({ x: Math.round(px), y: Math.round(py), width: SIZE, height: SIZE })
  }
})

ipcMain.on('end-drag', (_event, _dragVx, _dragVy, wasDragged) => {
  if (currentMode === 'avatar') {
    isGrabbed = false
    lastInteractionTime = Date.now()
    if (wasDragged) {
      // When thrown, add upward velocity and let gravity pull it down
      vx = Math.max(-20, Math.min(20, _dragVx))
      vy = _dragVy - 5  // upward impulse
      // Project target far in throw direction
      const display = screen.getPrimaryDisplay()
      const wa = display.workArea
      targetX = Math.max(wa.x + SIZE, Math.min(wa.x + wa.width - SIZE, px + vx * 30))
      targetY = Math.max(wa.y + SIZE, Math.min(wa.y + wa.height - SIZE, py + vy * 30))
      idleFrames = 0
    }
  }
})

ipcMain.on('set-ignore-mouse-events', (_event, ignore, options) => {
  if (win && !win.isDestroyed()) {
    if (options) win.setIgnoreMouseEvents(ignore, options)
    else win.setIgnoreMouseEvents(ignore)
  }
})

ipcMain.on('mouse-position', (_event, x, y) => {
  mouseNearby = Math.abs(x) < 100 && Math.abs(y) < 100
  if (mouseNearby) lastInteractionTime = Date.now()
})

ipcMain.on('navigate-to-point', (_event, x, y) => {
  if (currentMode !== 'avatar') return;
  const display = screen.getPrimaryDisplay()
  const area = display.workArea
  targetX = Math.max(area.x + SIZE, Math.min(x, area.x + area.width - SIZE));
  targetY = Math.max(area.y + SIZE, Math.min(y, area.y + area.height - SIZE));
  idleFrames = 0;
})

app.whenReady().then(async () => {
  await loadUserName()
  createWindow()
  createTray()
  if (win) {
    const display = screen.getPrimaryDisplay()
    const { workArea } = display
    px = Math.round(workArea.x + workArea.width / 2 - SIZE / 2)
    py = Math.round(workArea.y + workArea.height / 2 - SIZE / 2)
    pickNewTarget(workArea)
    win.setBounds({ x: px, y: py, width: SIZE, height: SIZE })
    win.setAlwaysOnTop(true, 'screen-saver')
  }
  startPhysicsLoop()
  win?.show()
  globalShortcut.register('CommandOrControl+Shift+Space', () => toggleWindow())
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('will-quit', () => { tray?.destroy(); globalShortcut.unregisterAll() })

ipcMain.on('quit-app', () => { app.quit() })
ipcMain.on('save-spotify-config', (_event, id, secret) => { saveSpotifyConfig(id, secret) })
ipcMain.handle('get-spotify-config', async () => { return loadSpotifyConfig() })
ipcMain.on('authenticate-spotify', (event) => {
  const w = BrowserWindow.fromWebContents(event.sender)
  if (w) authenticateSpotify(w).catch(console.error)
})

// Character Editor IPCs
let characterEditorWin: BrowserWindow | null = null;
ipcMain.on('open-character-editor', () => {
  if (characterEditorWin && !characterEditorWin.isDestroyed()) {
    characterEditorWin.focus();
    return;
  }
  
  characterEditorWin = new BrowserWindow({
    width: 600,
    height: 700,
    show: true,
    autoHideMenuBar: true,
    webPreferences: { preload, nodeIntegration: true, contextIsolation: true, webSecurity: false },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    characterEditorWin.loadURL(process.env.VITE_DEV_SERVER_URL + '?window=character-editor');
  } else {
    characterEditorWin.loadFile(join(__dirname, '../dist/index.html'), { search: 'window=character-editor' });
  }

  characterEditorWin.on('closed', () => {
    characterEditorWin = null;
  });
});

ipcMain.handle('get-character-config', async () => {
  return getCharacterConfig();
});

ipcMain.handle('save-character-config', async (_event, config) => {
  saveCharacterConfig(config);
  // Broadcast update to all windows
  BrowserWindow.getAllWindows().forEach(w => {
    if (!w.isDestroyed()) w.webContents.send('character-config-updated', config);
  });
  return true;
});

// Avatar IPCs
ipcMain.handle('get-avatar-config', async () => {
  return await getAvatarConfig()
})

ipcMain.handle('select-avatar-image', async (event, state) => {
  const w = BrowserWindow.fromWebContents(event.sender)
  if (w) {
    const config = await selectAndCopyAvatarImage(w, state)
    if (config) {
      w.webContents.send('avatar-config-updated', config)
    }
    return config
  }
  return null
})

// Marketplace IPCs
ipcMain.handle('create-bundle', async (_event, name, author, description) => {
  const config = await getAvatarConfig()
  const charConfig = getCharacterConfig()
  try {
    const manifest = await createBundle(name, author, description, config, charConfig)
    return { success: true, manifest }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
})

ipcMain.handle('install-bundle', async (_event, bundleId) => {
  const config = await getAvatarConfig()
  const { newConfig, manifest } = await installBundle(bundleId, config)
  
  // Also apply character configuration if bundled
  if (manifest.characterName || manifest.themeColor || manifest.personalityPrompt || manifest.characterTips) {
    const charConfig = getCharacterConfig()
    if (manifest.characterName) charConfig.characterName = manifest.characterName;
    if (manifest.themeColor) charConfig.themeColor = manifest.themeColor;
    if (manifest.personalityPrompt) charConfig.personalityPrompt = manifest.personalityPrompt;
    if (manifest.characterTips) charConfig.characterTips = manifest.characterTips;
    saveCharacterConfig(charConfig);
    BrowserWindow.getAllWindows().forEach(w => {
      if (!w.isDestroyed()) w.webContents.send('character-config-updated', charConfig);
    });
  }

  const { join } = await import('node:path')
  const { promises: fs } = await import('node:fs')
  const CONFIG_PATH = join(app.getPath('userData'), 'avatar-config.json')
  await fs.writeFile(CONFIG_PATH, JSON.stringify(newConfig, null, 2))

  BrowserWindow.getAllWindows().forEach(w => {
    if (!w.isDestroyed()) w.webContents.send('avatar-config-updated', newConfig)
  })

  return newConfig
})

ipcMain.handle('list-bundles', async () => {
 return await listBundles()
})

ipcMain.handle('delete-bundle', async (_event, bundleId) => {
  await deleteBundle(bundleId)
  return { success: true }
})

// User name IPCs
ipcMain.handle('get-user-name', async () => {
  return userName
})

ipcMain.handle('set-user-name', async (_event, name) => {
  await saveUserName(name)
  return { success: true }
})

ipcMain.on('update-tray-icon', async (_event, imagePath) => {
  if (!tray || tray.isDestroyed()) return
  try {
    const icon = nativeImage.createFromPath(imagePath).resize({ width: 24, height: 24 })
    tray.setImage(icon)
  } catch {
    // Fall back to default icon if custom one fails
    const iconPath = join(__dirname, '../dist/icon.png')
    try {
      const icon = nativeImage.createFromPath(iconPath).resize({ width: 24, height: 24 })
      tray.setImage(icon)
    } catch {}
  }
})

ipcMain.handle('reset-avatar-image', async (event, state) => {
  const w = BrowserWindow.fromWebContents(event.sender)
  if (w) {
    const config = await resetAvatarImage(state)
    w.webContents.send('avatar-config-updated', config)
    return config
  }
  return null
})

ipcMain.handle('save-generated-avatar-set', async (event, images) => {
  const w = BrowserWindow.fromWebContents(event.sender)
  if (w) {
    const config = await saveGeneratedAvatarSet(images)
    w.webContents.send('avatar-config-updated', config)
    return config
  }
  return null
})
