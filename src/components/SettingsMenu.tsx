import React, { useState } from 'react';

interface SettingsMenuProps {
  isVisible: boolean;
  onClose: () => void;
}

export function SettingsMenu({ isVisible, onClose }: SettingsMenuProps) {
  const [memoryInput, setMemoryInput] = useState('');
  const [spotifyId, setSpotifyId] = useState('');
  const [spotifySecret, setSpotifySecret] = useState('');

  React.useEffect(() => {
    if (isVisible && window.electronAPI.getSpotifyConfig) {
      window.electronAPI.getSpotifyConfig().then((config) => {
        if (config.clientId) setSpotifyId(config.clientId);
        if (config.clientSecret) setSpotifySecret(config.clientSecret);
      }).catch(console.error);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const handleAddMemory = () => {
    if (memoryInput.trim() !== '') {
      window.electronAPI.addManualMemory(memoryInput);
      setMemoryInput('');
    }
  };

  return (
    <div
      className="scrollable-menu"
      style={{
        position: 'absolute',
        bottom: '55px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(20, 10, 30, 0.95)',
        border: '1px solid var(--neon-purple)',
        borderRadius: '16px',
        padding: '16px',
        width: '260px',
        maxHeight: '280px',
        overflowY: 'auto',
        color: '#fff',
        fontSize: '0.9rem',
        boxShadow: '0 4px 15px rgba(180, 38, 255, 0.4)',
        zIndex: 30,
        WebkitAppRegion: 'no-drag',
        animation: 'fade-in 0.2s ease-out'
      } as React.CSSProperties}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--neon-purple)' }}>Buddy Settings</h3>
        <button 
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '1.2rem', padding: 0 }}
        >
          &times;
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <strong>🧠 Memory Box</strong>
          <p style={{ margin: '4px 0 8px 0', fontSize: '0.8rem', color: '#ccc' }}>
            I remember facts you tell me across sessions. Just say "remember that..." or add one manually below!
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              value={memoryInput}
              onChange={(e) => setMemoryInput(e.target.value)}
              placeholder="e.g. I love spicy food"
              style={{
                flex: 1,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--neon-purple)',
                borderRadius: '8px',
                padding: '4px 8px',
                color: '#fff',
                fontSize: '0.8rem',
                outline: 'none'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddMemory();
              }}
            />
            <button 
              onClick={handleAddMemory}
              style={{
                background: 'var(--neon-purple)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '4px 12px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 'bold'
              }}
            >
              Add
            </button>
          </div>
        </div>
        
        <div>
          <strong>🎵 Spotify Auto-Play</strong>
          <p style={{ margin: '4px 0 8px 0', fontSize: '0.8rem', color: '#ccc' }}>
            To enable music playback, enter your Spotify Developer credentials:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input 
              type="password" 
              placeholder="Client ID"
              id="spotify-id"
              value={spotifyId}
              onChange={(e) => setSpotifyId(e.target.value)}
              style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--neon-purple)',
                borderRadius: '8px',
                padding: '4px 8px',
                color: '#fff',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            />
            <input 
              type="password" 
              placeholder="Client Secret"
              id="spotify-secret"
              value={spotifySecret}
              onChange={(e) => setSpotifySecret(e.target.value)}
              style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--neon-purple)',
                borderRadius: '8px',
                padding: '4px 8px',
                color: '#fff',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            />
            <button 
              onClick={() => {
                if (spotifyId && spotifySecret) {
                  window.electronAPI.saveSpotifyConfig(spotifyId, spotifySecret);
                  window.electronAPI.authenticateSpotify();
                }
              }}
              style={{
                background: 'var(--neon-purple)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '6px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 'bold'
              }}
            >
              Connect to Spotify
            </button>
          </div>
        </div>

        <div>
          <strong>🤖 LLaMA 3 Engine</strong>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#ccc' }}>
            Powered completely locally by your GPU using Ollama. Fast and private!
          </p>
        </div>
      </div>
    </div>
  );
}
