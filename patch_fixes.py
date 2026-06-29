import os

path = r'C:\projects\My-Buddy\src\App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the entire facingLeft + mouse tracking block
old = "  const [facingLeft, setFacingLeft] = useState(false);\n\n  // Send mouse position to main process\n  useEffect(() => {\n    const handleMouseMove = (e) => {\n      const cx = window.innerWidth / 2;\n      const cy = window.innerHeight / 2;\n      const dx = e.clientX - cx;\n      const dy = e.clientY - cy;\n      if (window.electronAPI.sendMousePosition) {\n        window.electronAPI.sendMousePosition(dx, dy);\n      }\n      setFacingLeft(dx < 0);\n    };\n    window.addEventListener('mousemove', handleMouseMove);\n    return () => window.removeEventListener('mousemove', handleMouseMove);\n  }, []);\n\n  const [isDragging, setIsDragging] = useState(false);"
new = "  const [isDragging, setIsDragging] = useState(false);"
content = content.replace(old, new)

# Fix pet timer - keep the timer in the new object
old2 = "    const petTimer = setTimeout(() => {\n      if (!dragInfo.current.isDragged) {\n        setIsBouncing(true);\n        setState('active');\n        setTimeout(() => {\n          setIsBouncing(false);\n          setState('idle');\n        }, 600);\n      }\n    }, 400);\n    dragInfo.current.petTimer = petTimer;\n    dragInfo.current = {"
new2 = "    const petTimerId = setTimeout(() => {\n      if (!dragInfo.current.isDragged) {\n        setIsBouncing(true);\n        setState('active');\n        setTimeout(() => {\n          setIsBouncing(false);\n          setState('idle');\n        }, 600);\n      }\n    }, 400);\n    dragInfo.current = {"
content = content.replace(old2, new2)

# Add petTimer to the object
content = content.replace(
    "dragInfo.current = {\n      startX: e.screenX, \n      startY: e.screenY, \n      isDragged: false,",
    "dragInfo.current = {\n      startX: e.screenX, \n      startY: e.screenY, \n      isDragged: false,\n      petTimer: petTimerId,"
)

# Remove facingLeft from BuddyAvatar props
content = content.replace("        facingLeft={facingLeft}\n        state={state}", "        state={state}")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('App.tsx fixed')

# === BuddyAvatar.tsx - Remove facingLeft ===
path2 = r'C:\projects\My-Buddy\src\components\BuddyAvatar.tsx'
with open(path2, 'r', encoding='utf-8') as f2:
    content2 = f2.read()

# Remove facingLeft from interface
content2 = content2.replace("  facingLeft?: boolean;\n  state:", "  state:")

# Remove facingLeft from destructuring
content2 = content2.replace(
    "onPointerUp, facingLeft }: BuddyAvatarProps",
    "onPointerUp }: BuddyAvatarProps"
)

# Remove facingLeft CSS transform
content2 = content2.replace(
    "transform: facingLeft ? 'scaleX(-1)' : 'none',\n          ",
    ""
)

with open(path2, 'w', encoding='utf-8') as f2:
    f2.write(content2)
print('BuddyAvatar.tsx fixed')

print('All done!')