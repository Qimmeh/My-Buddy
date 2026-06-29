import React, { useState } from 'react';

interface MemoryStore {
  songPlays: Record<string, { name: string; artist: string; uri: string; count: number }>;
  playlists: Array<{ name: string; uri: string }>;
  facts: string[];
}

interface SettingsMenuProps {
  isVisible: boolean;
  onClose: () => void;
}

type MemoryTab = 'songs' | 'playlists' | 'facts' | null;

export function SettingsMenu({ isVisible, onClose }: SettingsMenuProps) {
  const [memoryInput, setMemoryInput] = useState('');
  const [spotifyId, setSpotifyId] = useState('');
  const [spotifySecret, setSpotifySecret] = useState('');
  const [memoryStore, setMemoryStore] = useState<MemoryStore | null>(null);
  const [activeMemoryTab, setActiveMemoryTab] = useState<MemoryTab>(null);
  const [playlistName, setPlaylistName] = useState('');
  const [playlistUri, setPlaylistUri] = useState('');
  const [avatarConfig, setAvatarConfig] = useState<Record<string, string>>({});
  const [currentView, setCurrentView] = useState<'main' | 'avatar'>('main');

  const generateWalkingSet = (file: File, isRightFacing: boolean) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const generateFrame = (mirror: boolean, squish: boolean) => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.save();
          if (mirror) {
            ctx.scale(-1, 1);
            ctx.translate(-canvas.width, 0);
          }
          if (squish) {
            ctx.translate(0, canvas.height * 0.05); // move down 5%
            ctx.scale(1, 0.95);
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          ctx.restore();
          return canvas.toDataURL('image/png');
        };

        const left1 = generateFrame(isRightFacing, false);
        const left2 = generateFrame(isRightFacing, true);
        const right1 = generateFrame(!isRightFacing, false);
        const right2 = generateFrame(!isRightFacing, true);

        window.electronAPI.saveGeneratedAvatarSet({
          'walking-left': left1,
          'walking-left-2': left2,
          'walking-right': right1,
          'walking-right-2': right2
        }).then(config => {
          if (config) setAvatarConfig(config);
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

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
      // Load avatar config
      if (window.electronAPI.getAvatarConfig) {
        window.electronAPI.getAvatarConfig().then(setAvatarConfig).catch(console.error);
        window.electronAPI.onAvatarConfigUpdated((config) => {
          setAvatarConfig(config);
        });
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
    background: 'var(--neon-purple)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '4px 12px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 'bold'
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid var(--neon-purple)',
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
    borderTop: '1px solid rgba(255,255,255,0.08)',
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
        backgroundColor: 'rgba(20, 10, 30, 0.95)',
        border: '1px solid var(--neon-purple)',
        borderRadius: '16px',
        padding: '16px',
        width: '280px',
        maxHeight: '320px',
        overflowY: 'auto',
        color: '#fff',
        fontSize: '0.9rem',
        boxShadow: '0 4px 15px rgba(180, 38, 255, 0.4)',
        zIndex: 30,
        WebkitAppRegion: 'no-drag',
        animation: 'fade-in 0.2s ease-out'
      } as React.CSSProperties}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--neon-purple)' }}>Buddy Settings</h3>
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
        <div>
          <strong>Memory Overview</strong>
          <p style={{ margin: '4px 0 6px 0', fontSize: '0.8rem', color: '#ccc' }}>
            I remember across sessions. Just say "remember that..." or add it below!
          </p>
          {memoryStore && (
            <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
              <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--neon-purple)' }}>{sortedSongs.length}</div>
                <div style={{ fontSize: '0.65rem', color: '#aaa' }}>Songs</div>
              </div>
              <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--neon-purple)' }}>{totalPlays}</div>
                <div style={{ fontSize: '0.65rem', color: '#aaa' }}>Total Plays</div>
              </div>
              <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--neon-purple)' }}>{memoryStore.playlists.length}</div>
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
                  <span style={{ color: 'var(--neon-purple)', fontWeight: 'bold', marginLeft: '6px', whiteSpace: 'nowrap' }}>
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

        {/* ===== Avatar Settings Button ===== */}
        <div>
          <strong>Avatar Settings</strong>
          <p style={{ margin: '4px 0 8px 0', fontSize: '0.8rem', color: '#ccc' }}>
            Customize your buddy's appearance and animations.
          </p>
          <button 
            onClick={() => setCurrentView('avatar')}
            style={{ ...btnStyle, width: '100%', padding: '8px' }}
          >
            Edit Avatar
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

      {currentView === 'avatar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={() => setCurrentView('main')} style={{ ...btnStyle, alignSelf: 'flex-start', background: 'rgba(255,255,255,0.1)' }}>
            &larr; Back
          </button>
          
          <div>
            <strong>Smart Walking Generator</strong>
            <p style={{ margin: '4px 0 8px 0', fontSize: '0.75rem', color: '#ccc' }}>
              Upload one image. We'll automatically generate the bounce animation (frame 2) and mirror it for the opposite direction!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ ...btnStyle, textAlign: 'center', cursor: 'pointer', background: 'rgba(50, 150, 255, 0.8)' }}>
                Generate from LEFT-facing image
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                  if (e.target.files && e.target.files[0]) generateWalkingSet(e.target.files[0], false);
                  e.target.value = '';
                }} />
              </label>
              <label style={{ ...btnStyle, textAlign: 'center', cursor: 'pointer', background: 'rgba(50, 150, 255, 0.8)' }}>
                Generate from RIGHT-facing image
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                  if (e.target.files && e.target.files[0]) generateWalkingSet(e.target.files[0], true);
                  e.target.value = '';
                }} />
              </label>
            </div>
          </div>

          <hr style={sectionDivider} />

          <div>
            <strong>Manual Config</strong>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
              {[
                'idle', 'active', 'very-active', 'ready', 'thinking', 
                'walking-left', 'walking-left-2', 'walking-right', 'walking-right-2',
                'paused', 'dizzy'
              ].map(state => (
                <div key={state} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>{state.replace(/-/g, ' ')}</span>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {avatarConfig[state] && (
                      <img 
                        src={`file://${avatarConfig[state]}`} 
                        alt={state} 
                        style={{ width: '20px', height: '20px', objectFit: 'contain', borderRadius: '4px' }} 
                      />
                    )}
                    <button 
                      onClick={() => window.electronAPI.selectAvatarImage(state)}
                      style={{ ...btnStyle, fontSize: '0.65rem', padding: '2px 6px' }}
                    >
                      Set
                    </button>
                    {avatarConfig[state] && (
                      <button 
                        onClick={() => window.electronAPI.resetAvatarImage(state)}
                        style={{ ...btnStyle, fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(255, 50, 50, 0.4)' }}
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
