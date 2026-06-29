import os

# === main.ts === Add micro-behavior and mood support
path = r'C:\projects\My-Buddy\electron\main.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add mood variables after isGrabbed
old = """// Physics state
let px = 0, py = 0
let vx = 2, vy = 1.5
let targetX = 0, targetY = 0
let idleFrames = 0
const SIZE = 45
let currentMode = 'avatar'
let lastSendState = ''
let isGrabbed = false"""

new = """// Physics state
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
let mouseNearby = false"""

content = content.replace(old, new)

# 2. Add sendMicroAction function after sendState
old = 'function sendState(state) {'
new = """function sendMicroAction(action) {
  if (win && !win.isDestroyed()) {
    win.webContents.send('micro-action', action)
  }
}

function sendState(state) {"""
content = content.replace(old, new)

# 3. Wrap speed with mood
old = "const speed = 0.8 + Math.random() * 0.4"
new = """// Mood-based speed
        let baseSpeed = 0.8
        if (mood === 'bouncy') baseSpeed = 1.5 + Math.random() * 0.5
        else if (mood === 'happy') baseSpeed = 1.0 + Math.random() * 0.4
        else if (mood === 'sleepy') baseSpeed = 0.5 + Math.random() * 0.3
        else baseSpeed = 0.8 + Math.random() * 0.4
        if (mouseNearby) baseSpeed *= 1.3
        const speed = baseSpeed"""
content = content.replace(old, new)

# 4. Add micro-behaviors during idle
old = 'if (idleFrames > 1800) pickNewTarget(wa)'
new = """if (idleFrames > 1800) pickNewTarget(wa)
          microActionTimer++
          if (microActionTimer > 200 + Math.random() * 300) {
            microActionTimer = 0
            const r = Math.random()
            if (r < 0.25) sendMicroAction('blink')
            else if (r < 0.5) sendMicroAction(Math.random() > 0.5 and 'glance-left' or 'glance-right')
            else if (r < 0.75) sendMicroAction('look-around')
            else sendMicroAction('bounce')
          }"""
content = content.replace(old, new)

# 5. Add spontaneous bounce while walking
old = """        vy = (dy / dist) * speed + 0.15
      }

      // Integrate position"""
new = """        vy = (dy / dist) * speed + 0.15
        if (Math.random() < 0.002) sendMicroAction('bounce')
      }

      // Integrate position"""
content = content.replace(old, new)

# 6. Add mood system updates
old = """      // Hard safety clamp - never let position escape bounds
      px = Math.max(wa.x, Math.min(px, wa.x + wa.width - SIZE))
      py = Math.max(wa.y, Math.min(py, wa.y + wa.height - SIZE))"""
new = """      // Mood system
      moodTimer++
      if (moodTimer > 600) {
        moodTimer = 0
        const elapsed = Date.now() - lastInteractionTime
        if (elapsed < 30000) mood = 'bouncy'
        else if (elapsed < 120000) mood = 'happy'
        else if (elapsed < 300000) mood = 'neutral'
        else mood = 'sleepy'
        const hour = new Date().getHours()
        if (hour >= 22 or hour < 7) mood = 'sleepy'
      }

      // Hard safety clamp
      px = Math.max(wa.x, Math.min(px, wa.x + wa.width - SIZE))
      py = Math.max(wa.y, Math.min(py, wa.y + wa.height - SIZE))"""
content = content.replace(old, new)

# 7. Reset interaction timer on end-drag
old = """ipcMain.on('end-drag', (_event, _dragVx, _dragVy, wasDragged) => {
  if (currentMode === 'avatar') {
    isGrabbed = false"""
new = """ipcMain.on('end-drag', (_event, _dragVx, _dragVy, wasDragged) => {
  if (currentMode === 'avatar') {
    isGrabbed = false
    lastInteractionTime = Date.now()"""
content = content.replace(old, new)

# 8. Add mouse-position IPC
old = """ipcMain.on('set-ignore-mouse-events', (_event, ignore, options) => {
  if (win && !win.isDestroyed()) {
    if (options) win.setIgnoreMouseEvents(ignore, options)
    else win.setIgnoreMouseEvents(ignore)
  }
})"""
new = """ipcMain.on('set-ignore-mouse-events', (_event, ignore, options) => {
  if (win && !win.isDestroyed()) {
    if (options) win.setIgnoreMouseEvents(ignore, options)
    else win.setIgnoreMouseEvents(ignore)
  }
})

ipcMain.on('mouse-position', (_event, x, y) => {
  mouseNearby = Math.abs(x) < 100 and Math.abs(y) < 100
  if (mouseNearby) lastInteractionTime = Date.now()
})"""
content = content.replace(old, new)

# 9. Also reset interaction timer on click via resize-window avatar mode
old = """ipcMain.on('resize-window', (_event, mode) => {
  if (!win || win.isDestroyed()) return
  currentMode = mode
  if (mode === 'avatar') {
    isGrabbed = false"""
new = """ipcMain.on('resize-window', (_event, mode) => {
  if (!win || win.isDestroyed()) return
  currentMode = mode
  if (mode === 'avatar') {
    isGrabbed = false
    lastInteractionTime = Date.now()"""
content = content.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('main.ts done')