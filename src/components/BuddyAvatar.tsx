import React, { useEffect, useState } from 'react';
import idleImg from '../assets/idle_v2.png';
import activeImg from '../assets/active.png';
import veryActiveImg from '../assets/very_active.png';
import readyImg from '../assets/ready.png';
import thinkingImg from '../assets/thinking.png';
import walkLeftImg from '../assets/walking_left.png';
import walkLeft2Img from '../assets/walking_left_2.png';
import walkRightImg from '../assets/walking_right_v2.png';
import walkRight2Img from '../assets/walking_right_2_v3.png';
import pausedImg from '../assets/paused.png';
import dizzyImg from '../assets/dizzy.png';
import blinkImg from '../assets/blink.png';
import glanceLeftImg from '../assets/glance_left.png';
import glanceRightImg from '../assets/glance_right.png';
import lookAroundImg from '../assets/look_around.png';

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
  const [isHovered, setIsHovered] = useState(false);
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
    'very-active': veryActiveImg,
    'ready': readyImg,
    'thinking': thinkingImg,
    'walking-left': walkLeftImg,
    'walking-left-2': walkLeft2Img,
    'walking-right': walkRightImg,
    'walking-right-2': walkRight2Img,
    'paused': pausedImg,
    'dizzy': dizzyImg,
    'blink': blinkImg,
    'glance-left': glanceLeftImg,
    'glance-right': glanceRightImg,
    'look-around': lookAroundImg
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
      {isHovered && (
          <div style={{
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
          </div>
        )}
      <img 
        src={currentImage} 
        alt="Buddy Avatar" 
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          filter: isHovered 
            ? 'drop-shadow(0px 0px 8px rgba(180, 80, 255, 0.9)) brightness(1.15)' 
            : 'drop-shadow(0px 0px 3px rgba(180, 80, 255, 0.5))',
          transition: 'transform 0.3s ease, filter 0.2s ease'
        }}
        draggable="false"
      />
    </div>
  );
}
