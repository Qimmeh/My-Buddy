import React, { useEffect, useState } from 'react';
import idleImg from '../assets/Idle.png';
import activeImg from '../assets/active.png';
import readyImg from '../assets/thinking.png';
import thinkingImg from '../assets/veryactive.png';
import walkLeftImg from '../assets/walking_left.png';
import walkRightImg from '../assets/walking_right.png';
import pausedImg from '../assets/paused.png';
import angryDizzyImg from '../assets/angry_dizzy.png';

interface BuddyAvatarProps {
  state: 'idle' | 'active' | 'ready' | 'thinking' | 'walking-left' | 'walking-right' | 'paused' | 'dizzy';
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  isBouncing: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerMove?: (e: React.PointerEvent) => void;
  onPointerUp?: (e: React.PointerEvent) => void;
}

export function BuddyAvatar({ state, onClick, onContextMenu, isBouncing, onPointerDown, onPointerMove, onPointerUp }: BuddyAvatarProps) {
  const [avatarConfig, setAvatarConfig] = useState<Record<string, string>>({});
  const [animFrame, setAnimFrame] = useState(0);

  // Load avatar config
  useEffect(() => {
    if (window.electronAPI.getAvatarConfig) {
      window.electronAPI.getAvatarConfig().then(setAvatarConfig).catch(console.error);
      window.electronAPI.onAvatarConfigUpdated(setAvatarConfig);
    }
  }, []);

  // Animation loop for walking
  useEffect(() => {
    if (state === 'walking-left' || state === 'walking-right') {
      const interval = setInterval(() => {
        setAnimFrame(f => (f === 0 ? 1 : 0));
      }, 250); // 250ms per frame
      return () => clearInterval(interval);
    } else {
      setAnimFrame(0);
    }
  }, [state]);

  // Determine current image
  let finalState = state as string;
  if (state === 'walking-left' && animFrame === 1) finalState = 'walking-left-2';
  if (state === 'walking-right' && animFrame === 1) finalState = 'walking-right-2';

  // Some states have aliases for the defaults
  const defaults: Record<string, string> = {
    'idle': idleImg,
    'active': activeImg,
    'ready': readyImg,
    'thinking': thinkingImg,
    'walking-left': walkLeftImg,
    'walking-left-2': walkLeftImg, // fallback to normal walk if no frame 2
    'walking-right': walkRightImg,
    'walking-right-2': walkRightImg, // fallback to normal walk if no frame 2
    'paused': pausedImg,
    'dizzy': angryDizzyImg,
    'very-active': thinkingImg // fallback if very active not set
  };

  const currentImage = avatarConfig[finalState] ? `file://${avatarConfig[finalState]}` : defaults[finalState] || idleImg;

  return (
    <div 
      className={`buddy-avatar-container ${isBouncing ? 'bounce-once' : ''}`}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        cursor: 'pointer',
        width: '45px',
        height: '45px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        position: 'relative',
        WebkitAppRegion: 'no-drag'
      } as React.CSSProperties}
    >
      <img 
        src={currentImage} 
        alt="Buddy Avatar" 
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          filter: 'drop-shadow(0px 0px 3px rgba(180, 80, 255, 0.5))'
        }}
        draggable="false"
      />
    </div>
  );
}
