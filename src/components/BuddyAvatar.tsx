import { useState, useEffect } from 'react';
import idleImg from '../assets/Idle.png';
import activeImg from '../assets/active.png';
import readyImg from '../assets/veryactive.png';
import thinkingImg from '../assets/thinking.png';

interface BuddyAvatarProps {
  state: 1 | 2 | 3 | 4;
  onClick: () => void;
  isBouncing: boolean;
}

export function BuddyAvatar({ state, onClick, isBouncing }: BuddyAvatarProps) {
  const [currentImage, setCurrentImage] = useState(idleImg);

  useEffect(() => {
    switch (state) {
      case 1:
        setCurrentImage(idleImg);
        break;
      case 2:
        setCurrentImage(activeImg);
        break;
      case 3:
        setCurrentImage(readyImg);
        break;
      case 4:
        setCurrentImage(thinkingImg);
        break;
      default:
        setCurrentImage(idleImg);
    }
  }, [state]);

  return (
    <div 
      className={`buddy-avatar-container ${isBouncing ? 'bounce-once' : ''}`}
      onClick={onClick}
      style={{
        cursor: 'pointer',
        width: '45px',
        height: '45px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        position: 'relative',
        WebkitAppRegion: 'no-drag' // Make sure we can click it
      } as React.CSSProperties}
    >
      <img 
        src={currentImage} 
        alt="Buddy Avatar" 
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          filter: 'drop-shadow(0px 0px 3px rgba(180, 80, 255, 0.5))' // Adjusted shadow intensity
        }}
        draggable="false"
      />
    </div>
  );
}
