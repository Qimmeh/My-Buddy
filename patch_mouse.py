import os

# === BuddyAvatar.tsx - Add mouse handlers back ===
path = r'C:\projects\My-Buddy\src\components\BuddyAvatar.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = """      className={`buddy-avatar-container ${isBouncing ? 'bounce-once' : ''}`}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}"""

new = """      className={`buddy-avatar-container ${isBouncing ? 'bounce-once' : ''}`}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}"""

content = content.replace(old, new)
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('BuddyAvatar.tsx - mouse handlers added')