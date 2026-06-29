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

// Physics & State
let px = 0, py = 0;
let vx = 2, vy = 1.5;
let isGrabbed = false;
let isThrown = false;
let isRespawning = false;
let isPaused = false;
let currentMode: 'avatar' | 'full' = 'avatar';
let lastSendState = '';

function sendState(state: string) {
  if (win && !win.isDestroyed() && lastSendState !== state) {
    lastSendState = state;
    win.webContents.send('ai-state-change', state);
  }
}

let respawnEdge: 'top' | 'bottom' | 'left' | 'right' = 'top';

function startPhysicsLoop() {
  // Reset back to 60 FPS to prevent Chromium tile memory limit exceeded crashes!
  const fps = 60;
  const frameTime = 1000 / fps;
  
  // Use integer or very consistent velocities to prevent rounding stutters!
  vx = 1; 
  vy = 1;

  setInterval(() => {
    if (!win || win.isDestroyed() || currentMode === 'full' || isGrabbed || isRespawning) return;

    // Wait for React to be fully mounted if needed, but since we setBounds to 45x45 on boot, it's safe!
    // Support multiple monitors by calculating the global desktop bounds!
    const displays = screen.getAllDisplays();
    let minX = 0, minY = 0, maxX = 0, maxY = 0;
    if (displays.length > 0) {
      minX = Math.min(...displays.map(d => d.workArea.x));
      minY = Math.min(...displays.map(d => d.workArea.y));
      maxX = Math.max(...displays.map(d => d.workArea.x + d.workArea.width));
      maxY = Math.max(...displays.map(d => d.workArea.y + d.workArea.height));
    }
    const bounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    const w = 45, h = 45;

    if (!isPaused && !isThrown) {
      // Normal walking
      px += vx;
      py += vy;

      // Bounce logic with RANDOMIZED directions!
      if (px <= bounds.x) {
        px = bounds.x;
        vx = Math.abs(vx) || 1;
        vy = (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.4);
        console.log(`[BOUNCE] Left edge hit at px:${px}, bounds.x:${bounds.x}`);
      } else if (px + w >= bounds.x + bounds.width) {
        px = bounds.x + bounds.width - w;
        vx = -(Math.abs(vx) || 1);
        vy = (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.4);
        console.log(`[BOUNCE] Right edge hit at px:${px+w}, bounds.right:${bounds.x + bounds.width}`);
      }

      if (py <= bounds.y) {
        py = bounds.y;
        vy = Math.abs(vy) || 1;
        vx = (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.4);
        console.log(`[BOUNCE] Top edge hit at py:${py}, bounds.y:${bounds.y}`);
      } else if (py + h >= bounds.y + bounds.height) {
        py = bounds.y + bounds.height - h;
        vy = -(Math.abs(vy) || 1);
        vx = (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.4);
        console.log(`[BOUNCE] Bottom edge hit at py:${py+h}, bounds.bottom:${bounds.y + bounds.height}`);
      }

      sendState(vx > 0 ? 'walking-right' : 'walking-left');
    } else if (isThrown) {
      // Physics Throwing
      px += vx;
      py += vy;
      vy += 0.5; // Gravity
      
      // Friction
      vx *= 0.98;
      
      // Check Out of Bounds for respawn
      let outOfBounds = false;
      if (px + w < bounds.x) { outOfBounds = true; respawnEdge = 'left'; }
      else if (px > bounds.x + bounds.width) { outOfBounds = true; respawnEdge = 'right'; }
      else if (py + h < bounds.y) { outOfBounds = true; respawnEdge = 'top'; }
      else if (py > bounds.y + bounds.height + 50) { outOfBounds = true; respawnEdge = 'bottom'; }
      
      if (outOfBounds) {
        isThrown = false;
        isRespawning = true;
        win.hide();
        setTimeout(() => {
          // Respawn at the edge it was thrown out of
          if (respawnEdge === 'left') {
             px = bounds.x - w;
             py = bounds.y + bounds.height / 3;
             vx = 8; vy = -5;
          } else if (respawnEdge === 'right') {
             px = bounds.x + bounds.width;
             py = bounds.y + bounds.height / 3;
             vx = -8; vy = -5;
          } else if (respawnEdge === 'top') {
             px = bounds.x + bounds.width / 2;
             py = bounds.y - h;
             vx = 0; vy = 5;
          } else {
             px = bounds.x + bounds.width / 2;
             py = bounds.y + bounds.height;
             vx = 0; vy = -15; // Shoot up!
          }
          isRespawning = false;
          isThrown = true;
          sendState('dizzy');
          win?.show();
        }, 3000);
      } else {
        // Did we hit the bottom while thrown? Only bounce if moving DOWN (vy > 0)!
        if (py + h >= bounds.y + bounds.height && vy > 0) {
           py = bounds.y + bounds.height - h;
           vy = -vy * 0.6; // bounce
           if (Math.abs(vy) < 2) { 
              // Landed
              isThrown = false;
              vy = 1;
              vx = (vx > 0 ? 1 : -1);
           }
        }
        sendState('dizzy');
      }
    }

    win.setPosition(Math.round(px), Math.round(py));
  }, frameTime);

  // Random pausing
  setInterval(() => {
    if (currentMode === 'avatar' && !isGrabbed && !isThrown && !isRespawning) {
      isPaused = true;
      sendState('paused');
      setTimeout(() => {
        isPaused = false;
        vx = (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.4);
        vy = (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.4);
      }, 3000 + Math.random() * 4000);
    }
  }, 10000 + Math.random() * 10000);
}

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

ipcMain.on('resize-window', (_event, mode: 'avatar' | 'full') => {
  if (!win || win.isDestroyed()) return
  currentMode = mode;
  
  const display = screen.getPrimaryDisplay()
  const { workArea } = display
  
  if (mode === 'avatar') {
    win.setBounds({ x: Math.round(px), y: Math.round(py), width: 45, height: 45 })
    isThrown = false;
    isGrabbed = false;
  } else {
    // When full, place window around the avatar's current position to prevent jumping
    // We want the avatar to remain exactly where it is on screen.
    // Avatar is at px, py. In full mode, avatar is at bottom center.
    // Center is width/2 = 150. Left edge is 150 - 22.5 = 127.5 inside the window.
    // So window X = px - 127.5
    // Window Y = py - (400 - 45) = py - 355
    let fx = Math.round(px - 127.5);
    let fy = Math.round(py - 355);
    
    // Clamp to screen bounds so chat bubble isn't off screen
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
    win?.setBounds({ x: Math.round(px), y: Math.round(py), width: 45, height: 45 });
  }
})

ipcMain.on('end-drag', (_event, dragVx: number, dragVy: number) => {
  if (currentMode === 'avatar' && isGrabbed) {
    isGrabbed = false;
    if (Math.abs(dragVx) > 5 || Math.abs(dragVy) > 5) {
      isThrown = true;
      vx = dragVx;
      vy = dragVy;
    }
  }
})

app.whenReady().then(() => {
  createWindow()
  createTray()
  
  // Set initial bounds to avatar mode
  if (win) {
    const display = screen.getPrimaryDisplay()
    const { workArea } = display
    px = Math.round(workArea.x + workArea.width / 2)
    py = Math.round(workArea.y + workArea.height / 2) // Spawn in center!
    win.setBounds({ x: px, y: py, width: 45, height: 45 })
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
