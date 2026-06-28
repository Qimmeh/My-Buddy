import React, { useRef, useEffect } from 'react';

interface InputTrayProps {
  isVisible: boolean;
  onSubmit: (text: string) => void;
  onClose: () => void;
}

export function InputTray({ isVisible, onSubmit, onClose }: InputTrayProps) {
  const [input, setInput] = React.useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSubmit(input.trim());
      setInput('');
    }
  };

  return (
    <div 
      className="input-tray-container"
      style={{
        position: 'absolute',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '90%',
        backgroundColor: 'rgba(10, 5, 20, 0.9)',
        border: '1px solid var(--neon-purple)',
        borderRadius: '12px',
        padding: '10px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
        zIndex: 20,
        WebkitAppRegion: 'no-drag',
        animation: 'slide-up 0.2s ease-out'
      } as React.CSSProperties}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Talk to Shogun..."
          style={{
            flex: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: 'none',
            outline: 'none',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '0.95rem'
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
          }}
        />
        <button 
          type="submit"
          style={{
            backgroundColor: 'var(--neon-purple)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            padding: '0 12px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
