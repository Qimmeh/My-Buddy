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
  const [currentImage, setCurrentImage] = useState(idleImg);

  useEffect(() => {
    switch (state) {
      case 'idle': setCurrentImage(idleImg); break;
      case 'active': setCurrentImage(activeImg); break;
      case 'ready': setCurrentImage(readyImg); break;
      case 'thinking': setCurrentImage(thinkingImg); break;
      case 'walking-left': setCurrentImage(walkLeftImg); break;
      case 'walking-right': setCurrentImage(walkRightImg); break;
      case 'paused': setCurrentImage(pausedImg); break;
      case 'dizzy': setCurrentImage(angryDizzyImg); break;
      default: setCurrentImage(idleImg);
    }
  }, [state]);

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
