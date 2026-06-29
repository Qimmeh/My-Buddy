import os
path = r'C:\projects\My-Buddy\electron\main.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = """ipcMain.on('navigate-to-point', (_event, x, y) => {
  if (currentMode !== 'avatar') return;
  targetX = x;
  targetY = y;
  targetX = Math.max(wa.x + SIZE, Math.min(targetX, wa.x + wa.width - SIZE));
  targetY = Math.max(wa.y + SIZE, Math.min(targetY, wa.y + wa.height - SIZE));
  idleFrames = 0;
})"""

new = """ipcMain.on('navigate-to-point', (_event, x, y) => {
  if (currentMode !== 'avatar') return;
  const display = screen.getPrimaryDisplay()
  const area = display.workArea
  targetX = Math.max(area.x + SIZE, Math.min(x, area.x + area.width - SIZE));
  targetY = Math.max(area.y + SIZE, Math.min(y, area.y + area.height - SIZE));
  idleFrames = 0;
})"""

content = content.replace(old, new)
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed')