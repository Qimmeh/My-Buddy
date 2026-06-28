import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { startRamGuard } from './ramGuard.js'
import { startReactivityEngine } from './reactivityEngine.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const preload = join(__dirname, 'preload.js')

let win: BrowserWindow | null = null

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: true,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    // win.webContents.openDevTools({ mode: 'detach' }) // Uncomment for debugging
  } else {
    win.loadFile(join(__dirname, '../dist/index.html'))
  }

  // Prevent window from closing, just hide it
  win.on('close', (e) => {
    e.preventDefault()
    win?.hide()
  })

  // Start background services
  startRamGuard(win)
  startReactivityEngine(win)
}

app.whenReady().then(() => {
  createWindow()

  // Register global shortcut
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    if (win) {
      if (win.isVisible() && win.isFocused()) {
        win.hide()
      } else {
        win.show()
        win.focus()
      }
    }
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

// Basic IPC to trigger quit manually
ipcMain.on('quit-app', () => {
  app.exit()
})
