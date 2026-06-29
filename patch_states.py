import os

# === App.tsx ===
path = r'C:\projects\My-Buddy\src\App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add new states to the type union
old = "useState<'idle' | 'active' | 'ready' | 'thinking' | 'walking-left' | 'walking-right' | 'paused' | 'dizzy'>"
new = "useState<'idle' | 'active' | 'ready' | 'thinking' | 'walking-left' | 'walking-right' | 'paused' | 'dizzy' | 'blink' | 'glance-left' | 'glance-right' | 'look-around'>"
content = content.replace(old, new)

# Update the micro-action handler
old = """        if (action === 'blink' || action === 'glance-left' || action === 'glance-right' || action === 'look-around') {
          setState('paused');
          setTimeout(() => setState(s => s === 'paused' ? 'ready' : s), 300);
        }"""
new = """        if (action === 'blink') {
          setState('blink');
          setTimeout(() => { setState(s => s === 'blink' ? 'ready' : s); }, 200);
        } else if (action === 'glance-left') {
          setState('glance-left');
          setTimeout(() => { setState(s => s === 'glance-left' ? 'ready' : s); }, 400);
        } else if (action === 'glance-right') {
          setState('glance-right');
          setTimeout(() => { setState(s => s === 'glance-right' ? 'ready' : s); }, 400);
        } else if (action === 'look-around') {
          setState('glance-left');
          setTimeout(() => {
            setState('glance-right');
            setTimeout(() => { setState(s => s === 'glance-right' ? 'ready' : s); }, 400);
          }, 400);
        }"""
content = content.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('App.tsx done')

# === BuddyAvatar.tsx === Add default sprite mappings for new states
path2 = r'C:\projects\My-Buddy\src\components\BuddyAvatar.tsx'
with open(path2, 'r', encoding='utf-8') as f2:
    content2 = f2.read()

# Update the defaults record to include new state placeholders
old = """  const defaults: Record<string, string> = {
    'idle': idleImg,
    'active': activeImg,
    'ready': readyImg,
    'thinking': thinkingImg,
    'walking-left': walkLeftImg,
    'walking-left-2': walkLeftImg,
    'walking-right': walkRightImg,
    'walking-right-2': walkRightImg,
    'paused': pausedImg,
    'dizzy': angryDizzyImg,
    'very-active': thinkingImg
  };"""
new = """  const defaults: Record<string, string> = {
    'idle': idleImg,
    'active': activeImg,
    'ready': readyImg,
    'thinking': thinkingImg,
    'walking-left': walkLeftImg,
    'walking-left-2': walkLeftImg,
    'walking-right': walkRightImg,
    'walking-right-2': walkRightImg,
    'paused': pausedImg,
    'dizzy': angryDizzyImg,
    'very-active': thinkingImg,
    // Placeholder sprites - replace with custom images
    'blink': activeImg,
    'glance-left': walkLeftImg,
    'glance-right': walkRightImg,
    'look-around': pausedImg
  };"""
content2 = content2.replace(old, new)

# Also update the type check for walking animation to include glance
old2 = "if (state === 'walking-left' || state === 'walking-right')"
new2 = "if (state === 'walking-left' || state === 'walking-right' || state === 'glance-left' || state === 'glance-right')"
content2 = content2.replace(old2, new2)

with open(path2, 'w', encoding='utf-8') as f2:
    f2.write(content2)
print('BuddyAvatar.tsx done')

# === SettingsMenu.tsx === Add new states to avatar gallery
path3 = r'C:\projects\My-Buddy\src\components\SettingsMenu.tsx'
with open(path3, 'r', encoding='utf-8') as f3:
    content3 = f3.read()

# Update avatarStates array
old3 = "const avatarStates = ['idle', 'active', 'very-active', 'ready', 'thinking', 'walking-left', 'walking-left-2', 'walking-right', 'walking-right-2', 'paused', 'dizzy'];"
new3 = "const avatarStates = ['idle', 'active', 'very-active', 'ready', 'thinking', 'walking-left', 'walking-left-2', 'walking-right', 'walking-right-2', 'paused', 'dizzy', 'blink', 'glance-left', 'glance-right', 'look-around'];"
content3 = content3.replace(old3, new3)

# Add defaults for the new states in SettingsMenu
old3 = "    'very-active': thinkingImg\n  };"
new3 = """    'very-active': thinkingImg,
    'blink': activeImg,
    'glance-left': walkLeftImg,
    'glance-right': walkRightImg,
    'look-around': pausedImg
  };"""
content3 = content3.replace(old3, new3)

with open(path3, 'w', encoding='utf-8') as f3:
    f3.write(content3)
print('SettingsMenu.tsx done')

print('All done!')