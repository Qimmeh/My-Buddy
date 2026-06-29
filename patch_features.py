import os

# === BuddyAvatar.tsx - Tooltip on hover ===
path = r'C:\projects\My-Buddy\src\components\BuddyAvatar.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add tooltip div after the img, inside the container div
old = """      <img 
        src={currentImage} 
        alt="Buddy Avatar" 
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          transform: facingLeft ? 'scaleX(-1)' : 'none',
          filter: 'drop-shadow(0px 0px 3px rgba(180, 80, 255, 0.5))',
          transition: 'transform 0.3s ease, filter 0.3s ease'
        }}
        draggable="false"
      />"""

new = """      {isHovered && (
          <div style={{
            position: 'absolute',
            top: '-24px',
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
            {state.replace(/-/g, ' ')} {isHovered ? '❤️' : ''}
          </div>
        )}
      <img 
        src={currentImage} 
        alt="Buddy Avatar" 
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          transform: facingLeft ? 'scaleX(-1)' : 'none',
          filter: isHovered 
            ? 'drop-shadow(0px 0px 8px rgba(180, 80, 255, 0.9)) brightness(1.15)' 
            : 'drop-shadow(0px 0px 3px rgba(180, 80, 255, 0.5))',
          transition: 'transform 0.3s ease, filter 0.2s ease'
        }}
        draggable="false"
      />"""

content = content.replace(old, new)

# Change hover glow to CSS-in-JS since we removed the CSS class approach
old = """      className={`buddy-avatar-container ${isBouncing ? 'bounce-once' : ''} ${isHovered ? 'buddy-hovered' : ''}`}"""
new = """      className={`buddy-avatar-container ${isBouncing ? 'bounce-once' : ''}`}"""
content = content.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('BuddyAvatar.tsx - tooltip added')

# === main.ts - Attention-seeking ===
path2 = r'C:\projects\My-Buddy\electron\main.ts'
with open(path2, 'r', encoding='utf-8') as f2:
    content2 = f2.read()

# Add attention-seeking after mood system update
old2 = """      // Mood system
      moodTimer++
      if (moodTimer > 600) {
        moodTimer = 0
        const elapsed = Date.now() - lastInteractionTime"""
new2 = """      // Attention-seeking when ignored
      if (mood === 'sleepy' && dist < 3 && Math.random() < 0.0005) {
        sendMicroAction('bounce');
      }

      // Mood system
      moodTimer++
      if (moodTimer > 600) {
        moodTimer = 0
        const elapsed = Date.now() - lastInteractionTime"""
content2 = content2.replace(old2, new2)

with open(path2, 'w', encoding='utf-8') as f2:
    f2.write(content2)
print('main.ts - attention-seeking added')

print('All done!')