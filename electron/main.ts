import { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, screen, nativeImage } from 'electron'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { startRamGuard } from './ramGuard.js'
import { startAiService } from './aiService.js'

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
    positionWindow()
    win.show()
    // It's a buddy widget, we don't necessarily want it to steal focus from what you're doing
    // unless you interact with it. So we don't win.focus() on toggle, just show it.
  }
}

function positionWindow() {
  if (!win) return
  
  const display = screen.getPrimaryDisplay()
  const winBounds = win.getBounds()

  // Calculate position: bottom left, above the taskbar
  const x = display.workArea.x
  const y = display.workArea.y + display.workArea.height - winBounds.height

  win.setPosition(x, y, false)
}

app.whenReady().then(() => {
  createWindow()
  createTray()

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
