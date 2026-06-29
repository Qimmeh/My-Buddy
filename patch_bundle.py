import os

path = r'C:\projects\My-Buddy\src\App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix: all micro-action timeouts should reset to 'idle', not 'ready'
content = content.replace(
    "setTimeout(() => {\n            animationLock.current = null;\n            setState('ready');\n          }, 200);",
    "setTimeout(() => {\n            animationLock.current = null;\n            setState('idle');\n          }, 200);"
)

content = content.replace(
    "setTimeout(() => {\n            animationLock.current = null;\n            setState('ready');\n          }, 400);",
    "setTimeout(() => {\n            animationLock.current = null;\n            setState('idle');\n          }, 400);"
)

# Fix look-around final setState too
content = content.replace(
    "setState('ready');\n            }, 400);\n          }, 300);",
    "setState('idle');\n            }, 400);\n          }, 300);"
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed idle state bug')

# === Add pet interaction ===
# Modify handlePointerUp in App.tsx to detect long press

# Read current content again
path = r'C:\projects\My-Buddy\src\App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add long press detection to pointerDown
old = """  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.target instanceof Element) {
      e.target.setPointerCapture(e.pointerId);
    }
    dragInfo.current = {"""
new = """  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.target instanceof Element) {
      e.target.setPointerCapture(e.pointerId);
    }
    // Start pet timer (cancelled if moved more than 5px)
    const petTimer = setTimeout(() => {
      if (!dragInfo.current.isDragged) {
        setIsBouncing(true);
        setState('active');
        setTimeout(() => {
          setIsBouncing(false);
          setState('idle');
        }, 600);
      }
    }, 400);
    dragInfo.current.petTimer = petTimer;
    dragInfo.current = {"""
content = content.replace(old, new)

# Add petTimer to dragInfo init and clear it on pointerUp
old = """  const handlePointerUp = (_e: React.PointerEvent) => {
    setIsDragging(false);
    if (window.electronAPI.endDrag) {"""
new = """  const handlePointerUp = (_e: React.PointerEvent) => {
    setIsDragging(false);
    if (dragInfo.current.petTimer) clearTimeout(dragInfo.current.petTimer);
    if (window.electronAPI.endDrag) {"""
content = content.replace(old, new)

# Add petTimer to dragInfo init type
old = "  const dragInfo = useRef({ startX: 0, startY: 0, isDragged: false, lastX: 0, lastY: 0, lastTime: 0, vx: 0, vy: 0 });"
new = "  const dragInfo = useRef({ startX: 0, startY: 0, isDragged: false, lastX: 0, lastY: 0, lastTime: 0, vx: 0, vy: 0, petTimer: null as any });"
content = content.replace(old, new)

# Also need petTimer in the reset inside handlePointerDown
old = "    dragInfo.current.petTimer = petTimer;\n    dragInfo.current = {"
# Whoops, that's wrong. Let me fix the order.
content = content.replace(
    "dragInfo.current.petTimer = petTimer;\n    dragInfo.current = {",
    "dragInfo.current.petTimer = petTimer;\n"
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Added pet interaction')