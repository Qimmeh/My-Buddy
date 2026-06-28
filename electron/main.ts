import { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, screen, nativeImage } from 'electron'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { startRamGuard } from './ramGuard.js'
import { startAiService } from './aiService.js'
import { saveSpotifyConfig, authenticateSpotify, loadSpotifyConfig } from './spotifyService.js'

// Load spotify config on boot
loadSpotifyConfig()

app.commandLine.appendSwitch('disable-backgrounding-occluded-windows', 'true')
app.commandLine.appendSwitch('disable-renderer-backgrounding', 'true')
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion')

const __dirname = dirname(fileURLToPath(import.meta.url))
const preload = join(__dirname, 'preload.js')

let win: BrowserWindow | null = null
let tray: Tray | null = null

function createWindow() {
  win = new BrowserWindow({
    width: 300,
    height: 400,
    show: false,
    frame: false,
    transparent: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: true,
      backgroundThrottling: false
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(join(__dirname, '../dist/index.html'))
  }

  // Prevent window from closing
  win.on('close', (e) => {
    e.preventDefault()
    win?.hide()
  })

  // Start background services
  startRamGuard(win)
  startAiService(win)
}

function createTray() {
  // Use the generated icon from public/icon.png
  let iconPath = join(__dirname, '../public/icon.png')
  if (!process.env.VITE_DEV_SERVER_URL) {
      iconPath = join(__dirname, '../dist/icon.png')
  }
  
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 24, height: 24 })
  tray = new Tray(icon)
  
  tray.setToolTip('Zi Feng Buddy')
  
  tray.on('click', () => {
    toggleWindow()
  })

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Quit', click: () => { app.exit() } }
  ])
  tray.on('right-click', () => {
    tray?.popUpContextMenu(contextMenu)
  })
}

function toggleWindow() {
  if (!win) return

  if (win.isVisible()) {
    win.hide()
  } else {
    // Show in avatar mode by default, the renderer will resize if chat is open
    win.show()
  }
}

ipcMain.on('resize-window', (event, mode: 'avatar' | 'full') => {
  if (!win || win.isDestroyed()) return
  const display = screen.getPrimaryDisplay()
  const bounds = display.bounds
  
  const { workArea } = display
  
  if (mode === 'avatar') {
    const x = Math.round(workArea.x + 148)
    const y = Math.round(workArea.y + workArea.height - 45)
    win.setBounds({ x, y, width: 45, height: 45 })
  } else {
    const x = Math.round(workArea.x + 20)
    const y = Math.round(workArea.y + workArea.height - 400)
    win.setBounds({ x, y, width: 300, height: 400 })
  }
})

app.whenReady().then(() => {
  createWindow()
  createTray()
  
  // Set initial bounds to avatar mode
  if (win) {
    const display = screen.getPrimaryDisplay()
    const { workArea } = display
    const x = Math.round(workArea.x + 148)
    const y = Math.round(workArea.y + workArea.height - 45)
    win.setBounds({ x, y, width: 45, height: 45 })
    win.setAlwaysOnTop(true, 'screen-saver')
  }
  
  win?.show()

  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    toggleWindow()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

ipcMain.on('quit-app', () => {
  app.exit()
})

ipcMain.on('save-spotify-config', (event, id: string, secret: string) => {
  saveSpotifyConfig(id, secret)
})

ipcMain.handle('get-spotify-config', async () => {
  return loadSpotifyConfig()
})

ipcMain.on('authenticate-spotify', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    authenticateSpotify(win).catch(console.error)
  }
})
