import os

# === App.tsx - Actually remove facingLeft ===
path = r'C:\projects\My-Buddy\src\App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and remove the facingLeft block - use a more targeted approach
old = """  const [facingLeft, setFacingLeft] = useState(false);

  // Send mouse position to main process
  useEffect(() => {
    const handleMouseMove = (e) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      if (window.electronAPI.sendMousePosition) {
        window.electronAPI.sendMousePosition(dx, dy);
      }
      setFacingLeft(dx < 0);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const [isDragging, setIsDragging] = useState(false);"""

new = """  const [isDragging, setIsDragging] = useState(false);"""

if old in content:
    content = content.replace(old, new)
    print("facingLeft removed!")
else:
    print("Could not find facingLeft block - checking what's there...")
    import re
    # Find the actual lines
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'facingLeft' in line:
            print(f"  Line {i+1}: {line.strip()}")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

# === BuddyAvatar.tsx - Fix tooltip to be inside the avatar ===
path2 = r'C:\projects\My-Buddy\src\components\BuddyAvatar.tsx'
with open(path2, 'r', encoding='utf-8') as f2:
    content2 = f2.read()

old2 = """          <div style={{
            position: 'absolute',
            bottom: '-24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(10,5,20,0.85)',
            border: '1px solid var(--neon-purple)',
            borderRadius: '8px',
            padding: '2px 8px',
            fontSize: '0.65rem',
            color: '#fff',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            animation: 'fade-in 0.15s ease-out',
            zIndex: 50
          }}>
            {state.replace(/-/g, ' ')} {isHovered ? '\u2764\ufe0f' : ''}
          </div>"""

new2 = """          <div style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            background: 'rgba(10,5,20,0.8)',
            borderBottomLeftRadius: '8px',
            borderBottomRightRadius: '8px',
            padding: '1px 6px',
            fontSize: '0.5rem',
            color: 'var(--neon-purple)',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            pointerEvents: 'none',
            zIndex: 50
          }}>
            {state.replace(/-/g, ' ')}
          </div>"""

if old2 in content2:
    content2 = content2.replace(old2, new2)
    print("Tooltip position fixed!")
else:
    print("Could not find tooltip - trying bottom variant...")
    # Maybe it's still using bottom
    old2b = """          <div style={{
            position: 'absolute',
            bottom: '-24px',
            left: '50%',
            transform: 'translateX(-50%)',"""
    if old2b in content2:
        print("  Found bottom variant")
    else:
        print("  Checking what's there:")
        import re
        lines2 = content2.split('\n')
        for i, line in enumerate(lines2):
            if 'isHovered &&' in line or 'bottom:' in line or '-24px' in line:
                print(f"  Line {i+1}: {line.strip()}")

with open(path2, 'w', encoding='utf-8') as f2:
    f2.write(content2)

print('Done!')