import React, { useState, useEffect } from 'react';

interface MemoryStore {
  songPlays: Record<string, { name: string; artist: string; uri: string; count: number }>;
  playlists: Array<{ name: string; uri: string }>;
  facts: string[];
}

interface SettingsMenuProps {
  isVisible: boolean;
  onClose: () => void;
  onTrayIconUpdate?: (url: string) => void;
}

type MemoryTab = 'songs' | 'playlists' | 'facts' | null;

export function SettingsMenu({ isVisible, onClose, onTrayIconUpdate }: SettingsMenuProps) {
  const [memoryInput, setMemoryInput] = useState('');
  const [spotifyId, setSpotifyId] = useState('');
  const [spotifySecret, setSpotifySecret] = useState('');
  const [memoryStore, setMemoryStore] = useState<MemoryStore | null>(null);
  const [activeMemoryTab, setActiveMemoryTab] = useState<MemoryTab>(null);
  const [playlistName, setPlaylistName] = useState('');
  const [playlistUri, setPlaylistUri] = useState('');
  const [userName, setUserName] = useState('');
  const [currentView, setCurrentView] = useState<'main'>('main');

  React.useEffect(() => {
    if (isVisible) {
      // Load Spotify config
      if (window.electronAPI.getSpotifyConfig) {
        window.electronAPI.getSpotifyConfig().then((config) => {
          if (config.clientId) setSpotifyId(config.clientId);
          if (config.clientSecret) setSpotifySecret(config.clientSecret);
        }).catch(console.error);
      }
      // Load memory store
      if (window.electronAPI.getMemoryStore) {
        window.electronAPI.getMemoryStore().then(setMemoryStore).catch(console.error);
      }

      // Load user name
      if (window.electronAPI.getUserName) {
        window.electronAPI.getUserName().then(setUserName).catch(console.error);
      }
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const handleAddMemory = () => {
    if (memoryInput.trim() !== '') {
      window.electronAPI.addManualMemory(memoryInput);
      setMemoryInput('');
      // Refresh store
      window.electronAPI.getMemoryStore().then(setMemoryStore).catch(console.error);
    }
  };

  const handleSavePlaylist = () => {
    if (playlistName.trim() && playlistUri.trim()) {
      window.electronAPI.savePlaylistMemory(playlistName.trim(), playlistUri.trim()).then(() => {
        setPlaylistName('');
        setPlaylistUri('');
        window.electronAPI.getMemoryStore().then(setMemoryStore).catch(console.error);
      });
    }
  };

  const sortedSongs = memoryStore
    ? Object.values(memoryStore.songPlays).sort((a, b) => b.count - a.count)
    : [];

  const totalPlays = memoryStore
    ? Object.values(memoryStore.songPlays).reduce((sum, s) => sum + s.count, 0)
    : 0;

  const btnStyle: React.CSSProperties = {
    background: 'var(--theme-color)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '4px 12px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 'bold'
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--glass-border)',
    borderRadius: '8px',
    padding: '4px 8px',
    color: '#fff',
    fontSize: '0.8rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box'
  };

  const sectionDivider: React.CSSProperties = {
    border: 'none',
    border: '1px solid var(--glass-border)',
    margin: '10px 0'
  };

  return (
    <div
      className="scrollable-menu"
      style={{
        position: 'absolute',
        bottom: '55px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--theme-bg-glass)',
        border: '1px solid var(--theme-color)',
        borderRadius: '16px',
        padding: '16px',
        width: '280px',
        maxHeight: '320px',
        overflowY: 'auto',
        color: '#fff',
        fontSize: '0.9rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        zIndex: 30,
        WebkitAppRegion: 'no-drag',
        animation: 'fade-in 0.2s ease-out'
      } as React.CSSProperties}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--theme-color)' }}>Buddy Settings</h3>
        <button 
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '1.2rem', padding: 0 }}
        >
          &times;
        </button>
      </div>

      {currentView === 'main' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

       {/* ===== Memory Overview ===== */}
        {/* Your Name */}
        <div>
          <strong style={{ fontSize: '0.85rem' }}>Your Name</strong>
          <input
            value={userName}
            onChange={(e) => {
              setUserName(e.target.value);
              if (window.electronAPI.setUserName) {
                window.electronAPI.setUserName(e.target.value || 'Buddy');
              }
            }}
            placeholder="Enter your name..."
            style={{
              width: '100%',
              marginTop: '4px',
              padding: '6px 8px',
              borderRadius: '6px',
              border: '1px solid #333',
              background: 'var(--theme-color)',
              color: '#e0e0ff',
              fontSize: '0.8rem',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div>
          <strong>Memory Overview</strong>
          <p style={{ margin: '4px 0 6px 0', fontSize: '0.8rem', color: '#ccc' }}>
            I remember across sessions. Just say "remember that..." or add it below!
          </p>
          {memoryStore && (
            <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
              <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--theme-color)' }}>{sortedSongs.length}</div>
                <div style={{ fontSize: '0.65rem', color: '#aaa' }}>Songs</div>
              </div>
              <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--theme-color)' }}>{totalPlays}</div>
                <div style={{ fontSize: '0.65rem', color: '#aaa' }}>Total Plays</div>
              </div>
              <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--theme-color)' }}>{memoryStore.playlists.length}</div>
                <div style={{ fontSize: '0.65rem', color: '#aaa' }}>Playlists</div>
              </div>
            </div>
          )}

          {/* Memory detail toggle buttons */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
            {(['songs', 'playlists', 'facts'] as MemoryTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveMemoryTab(activeMemoryTab === tab ? null : tab)}
                style={{
                  ...btnStyle,
                  background: activeMemoryTab === tab ? 'rgba(180, 38, 255, 0.6)' : 'rgba(180, 38, 255, 0.25)',
                  padding: '3px 10px',
                  fontSize: '0.7rem',
                  flex: 1
                }}
              >
                {tab === 'songs' ? 'Songs (' + sortedSongs.length + ')' : tab === 'playlists' ? 'Playlists (' + (memoryStore ? memoryStore.playlists.length : 0) + ')' : 'Facts (' + (memoryStore ? memoryStore.facts.length : 0) + ')'}
              </button>
            ))}
          </div>

          {/* Songs detail */}
          {activeMemoryTab === 'songs' && sortedSongs.length > 0 && (
            <div style={{ maxHeight: '100px', overflowY: 'auto', marginBottom: '4px' }}>
              {sortedSongs.slice(0, 20).map((s, i) => (
                <div key={s.uri} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 4px', background: i % 2 === 0 ? 'rgba(0,0,0,0.15)' : 'transparent', borderRadius: '4px', fontSize: '0.75rem' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {s.name} <span style={{ color: '#999' }}>{s.artist}</span>
                  </span>
                  <span style={{ color: 'var(--theme-color)', fontWeight: 'bold', marginLeft: '6px', whiteSpace: 'nowrap' }}>
                    x{s.count}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Playlists detail */}
          {activeMemoryTab === 'playlists' && (
            <div>
              {memoryStore && memoryStore.playlists.length > 0 && (
                <div style={{ maxHeight: '60px', overflowY: 'auto', marginBottom: '6px' }}>
                  {memoryStore.playlists.map((p, i) => (
                    <div key={p.uri + i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 4px', fontSize: '0.75rem' }}>
                      <span>{p.name}</span>
                      <span style={{ color: '#888', fontSize: '0.65rem', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }}>{p.uri}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Add playlist form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <input
                  type="text"
                  value={playlistName}
                  onChange={(e) => setPlaylistName(e.target.value)}
                  placeholder="Playlist name (e.g. Chill Vibes)"
                  style={inputStyle}
                />
                <input
                  type="text"
                  value={playlistUri}
                  onChange={(e) => setPlaylistUri(e.target.value)}
                  placeholder="URL or URI (e.g. spotify:playlist:abc)"
                  style={inputStyle}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSavePlaylist(); }}
                />
                <button onClick={handleSavePlaylist} style={{ ...btnStyle, width: '100%' }}>
                  Save Playlist
                </button>
              </div>
            </div>
          )}

          {/* Facts detail */}
          {activeMemoryTab === 'facts' && memoryStore && (
            <div style={{ maxHeight: '80px', overflowY: 'auto', marginBottom: '4px' }}>
              {memoryStore.facts.length === 0 ? (
                <div style={{ fontSize: '0.75rem', color: '#888' }}>No facts yet. Tell me something to remember!</div>
              ) : (
                memoryStore.facts.map((f, i) => (
                  <div key={i} style={{ padding: '2px 4px', fontSize: '0.75rem', color: '#ccc' }}>- {f}</div>
                ))
              )}
            </div>
          )}

          {/* Memory input */}
          <div style={{ display: 'flex', gap: '8px', marginTop: activeMemoryTab ? '4px' : '0' }}>
            <input 
              type="text" 
              value={memoryInput}
              onChange={(e) => setMemoryInput(e.target.value)}
              placeholder="I love spicy food..."
              style={{ ...inputStyle, flex: 1 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddMemory();
              }}
            />
            <button onClick={handleAddMemory} style={btnStyle}>Add</button>
          </div>
        </div>

        <hr style={sectionDivider} />

        {/* ===== Spotify Config ===== */}
        <div>
          <strong>Spotify Connection</strong>
          <p style={{ margin: '4px 0 8px 0', fontSize: '0.8rem', color: '#ccc' }}>
            Enter your Spotify Developer credentials to enable music playback:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <input 
              type="password" 
              placeholder="Client ID"
              value={spotifyId}
              onChange={(e) => setSpotifyId(e.target.value)}
              style={inputStyle}
            />
            <input 
              type="password" 
              placeholder="Client Secret"
              value={spotifySecret}
              onChange={(e) => setSpotifySecret(e.target.value)}
              style={inputStyle}
            />
            <button 
              onClick={() => {
                if (spotifyId && spotifySecret) {
                  window.electronAPI.saveSpotifyConfig(spotifyId, spotifySecret);
                  window.electronAPI.authenticateSpotify();
                }
              }}
              style={{ ...btnStyle, width: '100%' }}
            >
              Connect to Spotify
            </button>
          </div>
        </div>

        <hr style={sectionDivider} />

        {/* ===== Character Settings Button ===== */}
        <div>
          <strong>Character Profile</strong>
          <p style={{ margin: '4px 0 8px 0', fontSize: '0.8rem', color: '#ccc' }}>
            Customize your buddy's name, personality, and avatar.
          </p>
          <button 
            onClick={() => window.electronAPI.openCharacterEditor()}
            style={{ ...btnStyle, width: '100%', padding: '8px' }}
          >
            Edit Character
          </button>
        </div>

        <hr style={sectionDivider} />

        {/* ===== Engine Info ===== */}
        <div>
          <strong>Local AI Engine</strong>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#ccc' }}>
            Powered by Ollama + Llama 3. Runs entirely on your machine.
          </p>
        </div>
      </div>
      )}


    </div>
  );
}
