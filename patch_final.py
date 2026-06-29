import os

# === BuddyAvatar.tsx - Tooltip below ===
path = r'C:\projects\My-Buddy\src\components\BuddyAvatar.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "top: '-24px',\n            left: '50%',\n            transform: 'translateX(-50%)',",
    "bottom: '-24px',\n            left: '50%',\n            transform: 'translateX(-50%)',"
)
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Tooltip below fixed')

# === preload.ts - Add navigateToPoint ===
path2 = r'C:\projects\My-Buddy\electron\preload.ts'
with open(path2, 'r', encoding='utf-8') as f2:
    content2 = f2.read()

old2 = "  sendMousePosition: (x: number, y: number) => ipcRenderer.send('mouse-position', x, y),\n  onMicroAction: (callback: (action: string) => void) =>"
new2 = "  sendMousePosition: (x: number, y: number) => ipcRenderer.send('mouse-position', x, y),\n  navigateToPoint: (x: number, y: number) => ipcRenderer.send('navigate-to-point', x, y),\n  onMicroAction: (callback: (action: string) => void) =>"
content2 = content2.replace(old2, new2)
with open(path2, 'w', encoding='utf-8') as f2:
    f2.write(content2)
print('preload.ts - navigateToPoint added')

# === main.ts - Add navigate-to-point handler ===
path3 = r'C:\projects\My-Buddy\electron\main.ts'
with open(path3, 'r', encoding='utf-8') as f3:
    content3 = f3.read()

old3 = "ipcMain.on('mouse-position', (_event, x, y) => {\n  mouseNearby = Math.abs(x) < 100 and Math.abs(y) < 100\n  if (mouseNearby) lastInteractionTime = Date.now()\n})"

old3_js = "ipcMain.on('mouse-position', (_event, x, y) => {\n  mouseNearby = Math.abs(x) < 100 && Math.abs(y) < 100\n  if (mouseNearby) lastInteractionTime = Date.now()\n})"

new3 = old3_js + "\n\nipcMain.on('navigate-to-point', (_event, x, y) => {\n  if (currentMode !== 'avatar') return;\n  targetX = x;\n  targetY = y;\n  targetX = Math.max(wa.x + SIZE, Math.min(targetX, wa.x + wa.width - SIZE));\n  targetY = Math.max(wa.y + SIZE, Math.min(targetY, wa.y + wa.height - SIZE));\n  idleFrames = 0;\n})"

content3 = content3.replace(old3, new3)
if old3_js != old3 and old3_js in content3:
    content3 = content3.replace(old3_js, new3)

with open(path3, 'w', encoding='utf-8') as f3:
    f3.write(content3)
print('main.ts - navigate-to-point added')

# === App.tsx - Add Alt+click handler ===
path4 = r'C:\projects\My-Buddy\src\App.tsx'
with open(path4, 'r', encoding='utf-8') as f4:
    content4 = f4.read()

# Add Alt+click handler after the existing effects
old4 = """  // Listen for micro-actions (blink, glance, bounce, etc.)
  useEffect(() => {"""
new4 = """  // Alt+Click to navigate buddy to a point
  useEffect(() => {
    const handleAltClick = (e: MouseEvent) => {
      if (e.altKey && window.electronAPI.navigateToPoint) {
        window.electronAPI.navigateToPoint(e.screenX, e.screenY);
      }
    };
    window.addEventListener('click', handleAltClick);
    return () => window.removeEventListener('click', handleAltClick);
  }, []);

  // Listen for micro-actions (blink, glance, bounce, etc.)
  useEffect(() => {"""
content4 = content4.replace(old4, new4)

with open(path4, 'w', encoding='utf-8') as f4:
    f4.write(content4)
print('App.tsx - Alt+click handler added')

print('All done!')