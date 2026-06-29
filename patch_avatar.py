import re, os

path = r'C:\projects\My-Buddy\src\components\SettingsMenu.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = """      {currentView === 'avatar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>"""

start_idx = content.find(start_marker)
if start_idx == -1:
    print("ERROR: Could not find start marker")
    exit(1)

end_search = "        </div>\n      )}"
end_idx = content.rfind(end_search, start_idx)
if end_idx == -1:
    print("ERROR: Could not find end marker")
    exit(1)
end_idx += len(end_search)

old_section = content[start_idx:end_idx]
print(f"Found avatar section: {len(old_section)} chars")

new_section = """      {currentView === 'avatar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <button onClick={() => setCurrentView('main')} style={{ ...btnStyle, background: 'rgba(255,255,255,0.1)' }}>
              &larr; Back
            </button>
          </div>

          {/* ==== Live Preview ==== */}
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '12px',
            padding: '12px',
            textAlign: 'center',
            border: '1px solid rgba(180,38,255,0.3)'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 8px auto',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <img
                src={avatarConfig[avatarStates[previewIndex]]
                  ? 'file://' + avatarConfig[avatarStates[previewIndex]]
                  : (defaults[avatarStates[previewIndex]] || idleImg)}
                alt={avatarStates[previewIndex]}
                style={{ maxWidth: '70px', maxHeight: '70px', objectFit: 'contain' }}
              />
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '6px', color: 'var(--neon-purple)' }}>
              {avatarStates[previewIndex].replace(/-/g, ' ')}
            </div>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
              <button onClick={() => setPreviewIndex(i => (i - 1 + avatarStates.length) % avatarStates.length)} style={{ ...btnStyle, fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(255,255,255,0.1)' }}>&larr;</button>
              <span style={{ fontSize: '0.7rem', color: '#888' }}>{previewIndex + 1}/{avatarStates.length}</span>
              <button onClick={() => setPreviewIndex(i => (i + 1) % avatarStates.length)} style={{ ...btnStyle, fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(255,255,255,0.1)' }}>&rarr;</button>
              <button
                onClick={() => setPreviewAutoPlay(!previewAutoPlay)}
                style={{ ...btnStyle, fontSize: '0.65rem', padding: '2px 8px', background: previewAutoPlay ? 'rgba(180,38,255,0.6)' : 'rgba(255,255,255,0.1)' }}
              >
                {previewAutoPlay ? 'Stop' : 'Auto'}
              </button>
            </div>
            <div style={{ fontSize: '0.65rem', color: '#888', marginTop: '6px' }}>
              Click "Set" below to change an image
            </div>
          </div>

          <hr style={sectionDivider} />

          {/* ==== State Gallery ==== */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <strong>State Images</strong>
              <span style={{ fontSize: '0.65rem', color: '#888' }}>Set &amp; Reset each state</span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px'
            }}>
              {avatarStates.map(state => {
                const imgSrc = avatarConfig[state]
                  ? 'file://' + avatarConfig[state]
                  : defaults[state] || idleImg;
                return (
                  <div key={state} style={{
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '8px',
                    padding: '6px',
                    textAlign: 'center',
                    border: previewIndex === avatarStates.indexOf(state) ? '1px solid var(--neon-purple)' : '1px solid transparent'
                  }}>
                    <img
                      src={imgSrc}
                      alt={state}
                      style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '4px', cursor: 'pointer' }}
                      onClick={() => setPreviewIndex(avatarStates.indexOf(state))}
                    />
                    <div style={{ fontSize: '0.6rem', color: '#ccc', marginTop: '2px', textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {state.replace(/-/g, ' ')}
                    </div>
                    <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', marginTop: '4px' }}>
                      <button
                        onClick={() => window.electronAPI.selectAvatarImage(state)}
                        style={{ ...btnStyle, fontSize: '0.55rem', padding: '1px 5px' }}
                      >Set</button>
                      {avatarConfig[state] && (
                        <button
                          onClick={() => window.electronAPI.resetAvatarImage(state)}
                          style={{ ...btnStyle, fontSize: '0.55rem', padding: '1px 5px', background: 'rgba(255, 50, 50, 0.4)' }}
                        >X</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <hr style={sectionDivider} />

          {/* ==== Smart Walking Generator ==== */}
          <div>
            <strong>Smart Walking Generator</strong>
            <p style={{ margin: '4px 0 8px 0', fontSize: '0.75rem', color: '#ccc' }}>
              Upload one image. We'll auto-generate the bounce animation (frame 2) and mirror it for the opposite direction!
            </p>
            <div style={{ display: 'flex', gap: '6px' }}>
              <label style={{ ...btnStyle, textAlign: 'center', cursor: 'pointer', background: 'rgba(50, 150, 255, 0.8)', flex: 1, fontSize: '0.7rem' }}>
                LEFT-facing
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                  if (e.target.files && e.target.files[0]) generateWalkingSet(e.target.files[0], false);
                  e.target.value = '';
                }} />
              </label>
              <label style={{ ...btnStyle, textAlign: 'center', cursor: 'pointer', background: 'rgba(50, 150, 255, 0.8)', flex: 1, fontSize: '0.7rem' }}>
                RIGHT-facing
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                  if (e.target.files && e.target.files[0]) generateWalkingSet(e.target.files[0], true);
                  e.target.value = '';
                }} />
              </label>
            </div>
          </div>

        </div>
      )}"""

content = content.replace(old_section, new_section)

# Add preview state variables after avatarConfig
state_insert_marker = "const [avatarConfig, setAvatarConfig] = useState<Record<string, string>>({});"
state_insert_target = state_insert_marker + "\n" + """  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewAutoPlay, setPreviewAutoPlay] = useState(false);
  const avatarStates = ['idle', 'active', 'very-active', 'ready', 'thinking', 'walking-left', 'walking-left-2', 'walking-right', 'walking-right-2', 'paused', 'dizzy'];
  const defaults: Record<string, string> = {
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
content = content.replace(state_insert_marker, state_insert_target)

# Add image imports if missing
import_marker = "import React, { useState } from 'react';"
import_new = """import React, { useState, useEffect } from 'react';
import idleImg from '../assets/Idle.png';
import activeImg from '../assets/active.png';
import readyImg from '../assets/thinking.png';
import thinkingImg from '../assets/veryactive.png';
import walkLeftImg from '../assets/walking_left.png';
import walkRightImg from '../assets/walking_right.png';
import pausedImg from '../assets/paused.png';
import angryDizzyImg from '../assets/angry_dizzy.png';"""
if "import idleImg" not in content:
    content = content.replace(import_marker, import_new)

# Add auto-play useEffect
effect_marker = "  React.useEffect(() => {"
auto_play_effect = """  // Auto-play preview
  useEffect(() => {
    if (!previewAutoPlay) return;
    const interval = setInterval(() => {
      setPreviewIndex(i => (i + 1) % avatarStates.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [previewAutoPlay]);

"""
content = content.replace(effect_marker, auto_play_effect + effect_marker)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("SettingsMenu avatar section updated!")