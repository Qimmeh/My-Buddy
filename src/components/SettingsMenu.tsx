import React, { useState, useEffect } from 'react';
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

export function SettingsMenu({ isVisible, onClose, onTrayIconUpdate }: SettingsMenuProps) {
  const [memoryInput, setMemoryInput] = useState('');
  const [spotifyId, setSpotifyId] = useState('');
  const [spotifySecret, setSpotifySecret] = useState('');
  const [memoryStore, setMemoryStore] = useState<MemoryStore | null>(null);
  const [activeMemoryTab, setActiveMemoryTab] = useState<MemoryTab>(null);
  const [playlistName, setPlaylistName] = useState('');
  const [playlistUri, setPlaylistUri] = useState('');
  const [avatarConfig, setAvatarConfig] = useState<Record<string, string>>({});
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewAutoPlay, setPreviewAutoPlay] = useState(false);
  const [marketplaceBundles, setMarketplaceBundles] = useState<any[]>([]);
 const [marketplaceLoading, setMarketplaceLoading] = useState(false);
 const avatarStates = ['idle', 'active', 'very-active', 'ready', 'thinking', 'walking-left', 'walking-left-2', 'walking-right', 'walking-right-2', 'paused', 'dizzy', 'blink', 'glance-left', 'glance-right', 'look-around'];
  const [userName, setUserName] = useState('');
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

  // Load marketplace bundles when view opens
  useEffect(() => {
    if (currentView !== 'marketplace' || !window.electronAPI.listBundles) return;
    setMarketplaceLoading(true);
    window.electronAPI.listBundles().then(setMarketplaceBundles).catch(console.error).finally(() => setMarketplaceLoading(false));
  }, [currentView]);

  // Auto-play preview
  useEffect(() => {
    if (!previewAutoPlay) return;
    const interval = setInterval(() => {
      setPreviewIndex(i => (i + 1) % avatarStates.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [previewAutoPlay]);

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
        window.electronAPI.getAvatarConfig().then((config) => {
          setAvatarConfig(config);
          if (config['idle']) {
            onTrayIconUpdate?.(config['idle']);
          }
        }).catch(console.error);
        window.electronAPI.onAvatarConfigUpdated((config) => {
          setAvatarConfig(config);
          // Update tray icon when idle avatar changes
          if (config['idle']) {
            onTrayIconUpdate?.(config['idle']);
          }
        });
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
              background: '#1a1a2e',
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

          {/* ==== Avatar Marketplace ==== */}
          <div>
            <strong>Marketplace</strong>
            <p style={{ margin: '4px 0 8px 0', fontSize: '0.75rem', color: '#ccc' }}>
              Share or download avatar bundles!
            </p>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={async () => {
                  const name = 'Bundle ' + new Date().toLocaleDateString();
                  const result = await window.electronAPI.createBundle(name, 'User', '');
                  if (result.success) {
                    alert('Bundle "' + name + '" uploaded to marketplace!');
                    if (currentView === 'marketplace') {
                      window.electronAPI.listBundles().then(setMarketplaceBundles);
                    }
                  } else {
                    alert(result.error === 'DUPLICATE_BUNDLE' ? 'This exact avatar set is already bundled. Modify some images first!' : 'Error: ' + result.error);
                  }
                }}
                style={{ ...btnStyle, flex: 1, fontSize: '0.7rem', background: 'rgba(50, 200, 100, 0.8)' }}
              >
                Upload to Marketplace
              </button>
              <button
                onClick={() => { setCurrentView('marketplace'); }}
                style={{ ...btnStyle, flex: 1, fontSize: '0.7rem', background: 'rgba(50, 150, 255, 0.8)' }}
              >
                Open Marketplace
              </button>
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

          <hr style={sectionDivider} />

                  </div>
      )}

      {currentView === 'marketplace' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <button onClick={() => setCurrentView('avatar')} style={{ ...btnStyle, background: 'rgba(255,255,255,0.1)' }}>
              &larr; Back
            </button>
            <span style={{ fontSize: '0.75rem', color: '#888' }}>Avatar Marketplace</span>
          </div>

          <hr style={sectionDivider} />

          {marketplaceLoading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#888', fontSize: '0.85rem' }}>
              Loading bundles...
            </div>
          ) : marketplaceBundles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#888', fontSize: '0.85rem' }}>
              No bundles available.<br />Create one from the Avatar Settings!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {marketplaceBundles.map(bundle => (
                <div key={bundle.id} style={{
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '8px',
                  padding: '10px',
                  border: '1px solid rgba(180,38,255,0.2)'
                }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{bundle.name}</div>
                  <div style={{ fontSize: '0.7rem', color: '#aaa', marginTop: '2px' }}>
                    by {bundle.author} &middot; v{bundle.version}
                  </div>
                  {bundle.description && (
                    <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '2px' }}>{bundle.description}</div>
                  )}
                  <button
                    onClick={async () => {
                      try {
                        const config = await window.electronAPI.installBundle(bundle.id);
                        if (config) {
                          alert('Bundle "' + bundle.name + '" installed!');
                        }
                      } catch (e) {
                        alert('Install failed: ' + (e.message || 'unknown error'));
                      }
                    }}
                    style={{ ...btnStyle, marginTop: '6px', fontSize: '0.7rem', padding: '3px 10px' }}
                  >
                    Install
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
