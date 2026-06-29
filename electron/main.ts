import { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, screen, nativeImage, Rectangle } from 'electron'
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

// Physics & State
let px = 0, py = 0
let vx = 2, vy = 1.5
let isGrabbed = false
let isThrown = false
let isPaused = false
let isRespawning = false
let currentMode: 'avatar' | 'full' = 'avatar'
let lastSendState = ''
const AVATAR_SIZE = 45

function sendState(state: string) {
  if (win && !win.isDestroyed() && lastSendState !== state) {
    lastSendState = state;
    win.webContents.send('ai-state-change', state);
  }
}

function startPhysicsLoop() {
  setInterval(() => {
    try {
      if (!win || win.isDestroyed() || currentMode === 'full' || isGrabbed || isRespawning) return;
      
      // Validate and fix NaN/infinite positions and velocities
      if (!isFinite(px)) px = 0;
      if (!isFinite(py)) py = 0;
      if (!isFinite(vx)) vx = 0;
      if (!isFinite(vy)) vy = 0;
      
      let w;
      try {
        const display = screen.getDisplayNearestPoint({ x: Math.round(px), y: Math.round(py) });
        w = display.workArea;
      } catch (e) {
        const display = screen.getPrimaryDisplay();
        w = display.workArea;
      }
      // Guard: if workArea is invalid, use primary display bounds
      if (!w || !isFinite(w.x) || !isFinite(w.y) || !isFinite(w.width) || !isFinite(w.height) || w.width <= 0 || w.height <= 0) {
        try {
          const pd = screen.getPrimaryDisplay();
          w = pd.workArea;
        } catch (e2) {}
        if (!w || !isFinite(w.x) || !isFinite(w.y) || !isFinite(w.width) || !isFinite(w.height) || w.width <= 0 || w.height <= 0) {
          win.setPosition(Math.round(px), Math.round(py));
          return;
        }
      }
      
      if (isThrown) {
        try {
          vy += 0.5;
          vx *= 0.98;
          px += vx;
          py += vy;

          if (py + AVATAR_SIZE >= w.y + w.height) {
            py = w.y + w.height - AVATAR_SIZE;
            vy = -vy * 0.6;
            if (Math.abs(vy) < 2) {
              vy = 0;
              vx = 0;
              isThrown = false;
              sendState('dizzy');
              setTimeout(() => {
                if (!isThrown && !isGrabbed && !isRespawning) {
                  vx = (Math.random() > 0.5 ? 1 : -1) * (1.5 + Math.random());
                  vy = (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.4);
                  if (!isFinite(vx)) vx = 1.5;
                  if (!isFinite(vy)) vy = 0.8;
                }
              }, 1500);
              win.setPosition(Math.round(px), Math.round(py));
              return;
            }
          }

          if (px <= w.x) {
            px = w.x;
            vx = -vx * 0.6;
          } else if (px + AVATAR_SIZE >= w.x + w.width) {
            px = w.x + w.width - AVATAR_SIZE;
            vx = -vx * 0.6;
          }
          if (py <= w.y) {
            py = w.y;
            vy = -vy * 0.6;
          }

          if (px < w.x - AVATAR_SIZE || px > w.x + w.width ||
              py < w.y - AVATAR_SIZE || py > w.y + w.height) {
            startRespawn(w);
            return;
          }

          sendState('dizzy');
          win.setPosition(Math.round(px), Math.round(py));
        } catch (e) {
          win.setPosition(Math.round(px), Math.round(py));
        }
        return;
      }

      px += vx;
      py += vy;
      if (!isFinite(px)) px = 0;
      if (!isFinite(py)) py = 0;

      let bounced = false;
      if (px <= w.x) {
        px = w.x;
        vx = -vx;
        bounced = true;
      } else if (px + AVATAR_SIZE >= w.x + w.width) {
        px = w.x + w.width - AVATAR_SIZE;
        vx = -vx;
        bounced = true;
      }
      if (py <= w.y) {
        py = w.y;
        vy = -vy;
        bounced = true;
      } else if (py + AVATAR_SIZE >= w.y + w.height) {
        py = w.y + w.height - AVATAR_SIZE;
        vy = -vy;
        bounced = true;
      }

      if (bounced) {
        vx = (vx > 0 ? 1 : -1) * (1.5 + Math.random() * 1.0);
        vy = (vy > 0 ? 1 : -1) * (0.8 + Math.random() * 0.4);
        if (!isFinite(vx)) vx = (Math.random() > 0.5 ? 1 : -1) * 1.5;
        if (!isFinite(vy)) vy = (Math.random() > 0.5 ? 1 : -1) * 0.8;
      }

      if (vx > 0.5) {
        sendState('walking-right');
      } else if (vx < -0.5) {
        sendState('walking-left');
      } else {
        sendState('idle');
      }

      win.setPosition(Math.round(px), Math.round(py));
    } catch (e) {
    }
  }, 1000 / 60);
}
function startRespawn(workArea: Rectangle) {
  isRespawning = true
  isThrown = false
  win?.hide()

  if (py < workArea.y) {
    py = workArea.y - AVATAR_SIZE
    vy = 15
  } else if (py > workArea.y + workArea.height) {
    py = workArea.y + workArea.height
    vy = -15
  } else {
    vy = 0
  }
  if (px < workArea.x) {
    px = workArea.x - AVATAR_SIZE
    vx = 15
  } else if (px > workArea.x + workArea.width) {
    px = workArea.x + workArea.width
    vx = -15
  } else {
    vx = 0
  }

  setTimeout(() => {
    isRespawning = false
    isThrown = true
    if (win && !win.isDestroyed()) {
      win.setPosition(Math.round(px), Math.round(py))
      win.show()
      sendState('dizzy')
    }
  }, 3000)
}

function createWindow() {
  win = new BrowserWindow({
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    show: false,
    frame: false,
    transparent: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    minWidth: 0,
    minHeight: 0,
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
    win.show()
    isRespawning = false
  }
}

ipcMain.on('resize-window', (_event, mode: 'avatar' | 'full') => {
  if (!win || win.isDestroyed()) return
  currentMode = mode;
  
  const display = screen.getDisplayNearestPoint({ x: Math.round(px), y: Math.round(py) });
  const { workArea } = display
  
  if (mode === 'avatar') {
    win.setBounds({ x: Math.round(px), y: Math.round(py), width: AVATAR_SIZE, height: AVATAR_SIZE })
    isThrown = false;
    isGrabbed = false;
  } else {
    let fx = Math.round(px - 127.5);
    let fy = Math.round(py - 355);
    
    if (fx < workArea.x) fx = workArea.x;
    if (fx + 300 > workArea.x + workArea.width) fx = workArea.x + workArea.width - 300;
    if (fy < workArea.y) fy = workArea.y;
    
    win.setBounds({ x: fx, y: fy, width: 300, height: 400 })
    sendState('ready');
  }
})

ipcMain.on('drag-window', (_event, dx: number, dy: number) => {
  if (currentMode === 'avatar') {
    isGrabbed = true;
    isThrown = false;
    px += dx;
    py += dy;
    win?.setBounds({ x: Math.round(px), y: Math.round(py), width: AVATAR_SIZE, height: AVATAR_SIZE });
  }
})

ipcMain.on('end-drag', (_event, dragVx: number, dragVy: number, wasDragged: boolean = true) => {
  if (currentMode === 'avatar' && isGrabbed) {
    isGrabbed = false;
    if (wasDragged) {
      isThrown = true;
      vx = dragVx;
      vy = dragVy;
    }
  }
})

ipcMain.on('set-ignore-mouse-events', (_event, ignore: boolean, options?: { forward: boolean }) => {
  if (win && !win.isDestroyed()) {
    if (options) {
      win.setIgnoreMouseEvents(ignore, options);
    } else {
      win.setIgnoreMouseEvents(ignore);
    }
  }
})

app.whenReady().then(() => {
  createWindow()
  createTray()
  
  if (win) {
    const display = screen.getPrimaryDisplay()
    const { workArea } = display
    px = Math.round(workArea.x + workArea.width / 2)
    py = Math.round(workArea.y + workArea.height * 0.3)
    win.setBounds({ x: px, y: py, width: AVATAR_SIZE, height: AVATAR_SIZE })
    win.setAlwaysOnTop(true, 'screen-saver')
  }
  
  startPhysicsLoop();
  
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

ipcMain.on('save-spotify-config', (_event, id: string, secret: string) => {
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
