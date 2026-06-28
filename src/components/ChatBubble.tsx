import React from 'react';

interface ChatBubbleProps {
  message: string;
  isVisible: boolean;
  onClick: () => void;
  isThinking: boolean;
}

export function ChatBubble({ message, isVisible, onClick, isThinking }: ChatBubbleProps) {
  if (!isVisible) return null;

  return (
    <div 
      className="chat-bubble-container"
      onClick={onClick}
      style={{
        position: 'absolute',
        bottom: '160px', // Right above the avatar
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(20, 10, 30, 0.85)',
        border: '1px solid var(--neon-purple)',
        borderRadius: '16px',
        padding: '12px 16px',
        maxWidth: '250px',
        width: 'max-content',
        color: '#fff',
        fontSize: '0.95rem',
        boxShadow: '0 4px 15px rgba(180, 38, 255, 0.4)',
        cursor: 'pointer',
        WebkitAppRegion: 'no-drag',
        animation: 'fade-in 0.3s ease-out',
        zIndex: 10,
      } as React.CSSProperties}
    >
      <div style={{ position: 'relative' }}>
        {isThinking ? (
          <span className="thinking-dots">hmmm....</span>
        ) : (
          <span>{message}</span>
        )}
        {/* The little tail for the bubble */}
        <div style={{
          position: 'absolute',
          bottom: '-18px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '0',
          height: '0',
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: '10px solid var(--neon-purple)',
        }} />
      </div>
    </div>
  );
}
