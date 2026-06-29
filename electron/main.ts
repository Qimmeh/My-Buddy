import { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, screen, nativeImage } from 'electron'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { startRamGuard } from './ramGuard.js'
import { startAiService } from './aiService.js'
import { saveSpotifyConfig, authenticateSpotify, loadSpotifyConfig } from './spotifyService.js'

loadSpotifyConfig()

app.commandLine.appendSwitch('disable-backgrounding-occluded-windows', 'true')
app.commandLine.appendSwitch('disable-renderer-backgrounding', 'true')
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion')

const __dirname = dirname(fileURLToPath(import.meta.url))
const preload = join(__dirname, 'preload.js')

let win = null
let tray = null

// Physics state
let px = 0, py = 0
let vx = 2, vy = 1.5
const SIZE = 45
let currentMode = 'avatar'
let lastSendState = ''
let isGrabbed = false

function sendState(state) {
  if (win && !win.isDestroyed() && lastSendState !== state) {
    lastSendState = state
    win.webContents.send('ai-state-change', state)
  }
}

function startPhysicsLoop() {
  setInterval(() => {
    try {
      if (!win || win.isDestroyed() || currentMode !== 'avatar' || isGrabbed) return

      const display = screen.getPrimaryDisplay()
      const wa = display.workArea
      if (!wa || !wa.width || !wa.height) return

      // Move the buddy
      px += vx
      py += vy

      // Bounce off edges - simple and direct
      // Right edge
      if (px + SIZE >= wa.x + wa.width) {
        px = wa.x + wa.width - SIZE
        vx = -(1.5 + Math.random() * 1.5)
      }
      // Left edge
      else if (px <= wa.x) {
        px = wa.x
        vx = 1.5 + Math.random() * 1.5
      }
      // Bottom edge
      if (py + SIZE >= wa.y + wa.height) {
        py = wa.y + wa.height - SIZE
        vy = -(1.0 + Math.random() * 1.0)
      }
      // Top edge
      else if (py <= wa.y) {
        py = wa.y
        vy = 1.0 + Math.random() * 1.0
      }

      // Hard safety clamp - never let position escape bounds
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
    webPreferences: { preload, nodeIntegration: true, contextIsolation: true, backgroundThrottling: false },
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
  tray.setToolTip('Zi Feng Buddy')
  tray.on('click', () => toggleWindow())
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Quit', click: () => { app.exit() } }
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
    if (wasDragged) {
      // When thrown, add upward velocity and let gravity pull it down
      vx = Math.max(-20, Math.min(20, _dragVx))
      vy = _dragVy - 5  // upward impulse
    }
  }
})

ipcMain.on('set-ignore-mouse-events', (_event, ignore, options) => {
  if (win && !win.isDestroyed()) {
    if (options) win.setIgnoreMouseEvents(ignore, options)
    else win.setIgnoreMouseEvents(ignore)
  }
})

app.whenReady().then(() => {
  createWindow()
  createTray()
  if (win) {
    const display = screen.getPrimaryDisplay()
    const { workArea } = display
    px = Math.round(workArea.x + workArea.width / 2 - SIZE / 2)
    py = Math.round(workArea.y + workArea.height / 2 - SIZE / 2)
    win.setBounds({ x: px, y: py, width: SIZE, height: SIZE })
    win.setAlwaysOnTop(true, 'screen-saver')
  }
  startPhysicsLoop()
  win?.show()
  globalShortcut.register('CommandOrControl+Shift+Space', () => toggleWindow())
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('will-quit', () => { globalShortcut.unregisterAll() })

ipcMain.on('quit-app', () => { app.exit() })
ipcMain.on('save-spotify-config', (_event, id, secret) => { saveSpotifyConfig(id, secret) })
ipcMain.handle('get-spotify-config', async () => { return loadSpotifyConfig() })
ipcMain.on('authenticate-spotify', (event) => {
  const w = BrowserWindow.fromWebContents(event.sender)
  if (w) authenticateSpotify(w).catch(console.error)
})
