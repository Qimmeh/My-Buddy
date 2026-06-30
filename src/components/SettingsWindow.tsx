import React, { useState, useEffect } from 'react';
import BorderGlow from './BorderGlow';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { CharacterEditor } from './CharacterEditor';
import { SettingsMenu } from './SettingsMenu';
import { Settings, User, HardDrive, Share2, X } from 'lucide-react';

export function SettingsWindow() {
  const [activeTab, setActiveTab] = useState('settings');
  const [memoryInput, setMemoryInput] = useState('');
  const [spotifyId, setSpotifyId] = useState('');
  const [spotifySecret, setSpotifySecret] = useState('');
  const [memoryStore, setMemoryStore] = useState<any>(null);
  const [activeMemoryTab, setActiveMemoryTab] = useState<string | null>(null);
  const [playlistName, setPlaylistName] = useState('');
  const [playlistUri, setPlaylistUri] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    // Parse URL params for default tab
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }

    // Listen for navigation requests from main process
    if (window.electronAPI.onNavigateSettingsTab) {
      window.electronAPI.onNavigateSettingsTab((tab: string) => {
        setActiveTab(tab);
      });
    }

    // Load initial data
    if (window.electronAPI.getSpotifyConfig) {
      window.electronAPI.getSpotifyConfig().then((config: any) => {
        if (config.clientId) setSpotifyId(config.clientId);
        if (config.clientSecret) setSpotifySecret(config.clientSecret);
      }).catch(console.error);
    }
    if (window.electronAPI.getMemoryStore) {
      window.electronAPI.getMemoryStore().then(setMemoryStore).catch(console.error);
    }
    if (window.electronAPI.getUserName) {
      window.electronAPI.getUserName().then(setUserName).catch(console.error);
    }
  }, []);

  const handleAddMemory = () => {
    if (memoryInput.trim() !== '') {
      window.electronAPI.addManualMemory(memoryInput);
      setMemoryInput('');
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

  const sortedSongs = memoryStore ? Object.values(memoryStore.songPlays).sort((a: any, b: any) => b.count - a.count) : [];
  const totalPlays = memoryStore ? Object.values(memoryStore.songPlays).reduce((sum: number, s: any) => sum + s.count, 0) : 0;

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--glass-border, rgba(255,255,255,0.2))',
    borderRadius: '8px',
    padding: '8px 12px',
    color: '#fff',
    fontSize: '0.9rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box'
  };

  return (
    <div className="w-screen h-screen p-4 flex items-center justify-center overflow-hidden transparent-app-region">
      <BorderGlow
        edgeSensitivity={30}
        glowColor="var(--theme-color, #b026ff)"
        backgroundColor="rgba(15, 15, 20, 0.85)"
        borderRadius={16}
        glowRadius={40}
        glowIntensity={1.0}
        coneSpread={25}
        animated={false}
        className="w-full h-full flex flex-col"
        style={{
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          WebkitAppRegion: 'no-drag'
        } as React.CSSProperties}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/10" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
          <h2 className="text-xl font-bold" style={{ color: 'var(--theme-color)' }}>
            Buddy Integrations & Settings
          </h2>
          <button 
            onClick={() => window.close()}
            className="text-gray-400 hover:text-white transition-colors"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-black/40 text-white/70">
              <TabsTrigger value="settings" className="data-[state=active]:bg-primary/50 flex items-center gap-2"><Settings size={16}/> General</TabsTrigger>
              <TabsTrigger value="character" className="data-[state=active]:bg-primary/50 flex items-center gap-2"><User size={16}/> Buddy Profile</TabsTrigger>
              <TabsTrigger value="memory" className="data-[state=active]:bg-primary/50 flex items-center gap-2"><HardDrive size={16}/> Memory & Music</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto pr-2 pb-10">
              <TabsContent value="settings" className="h-full mt-0">
                <div className="max-w-3xl mx-auto space-y-8">
                  <div className="p-6 rounded-xl bg-black/20 border border-white/10 backdrop-blur-md">
                    <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--theme-color)' }}>General Settings</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">Your Name</label>
                        <input
                          value={userName}
                          onChange={(e) => {
                            setUserName(e.target.value);
                            if (window.electronAPI.setUserName) {
                              window.electronAPI.setUserName(e.target.value || 'Buddy');
                            }
                          }}
                          placeholder="Enter your name..."
                          style={inputStyle}
                        />
                        <p className="text-xs text-gray-400 mt-1">This is how your Buddy will refer to you.</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-xl bg-black/20 border border-white/10 backdrop-blur-md">
                    <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--theme-color)' }}>Engine Info</h3>
                    <p className="text-gray-300">
                      Powered by Ollama + Llama 3. Runs entirely on your machine.
                    </p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="character" className="h-full mt-0">
                <CharacterEditor />
              </TabsContent>
              
              <TabsContent value="memory" className="h-full mt-0">
                <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Memory Overview */}
                  <div className="p-6 rounded-xl bg-black/20 border border-white/10 backdrop-blur-md flex flex-col">
                    <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--theme-color)' }}>Memory Overview</h3>
                    <p className="text-sm text-gray-400 mb-6">
                      I remember across sessions. Just say "remember that..." or add it below!
                    </p>
                    
                    {memoryStore && (
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-black/30 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold" style={{ color: 'var(--theme-color)' }}>{sortedSongs.length}</div>
                          <div className="text-xs text-gray-400">Songs</div>
                        </div>
                        <div className="bg-black/30 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold" style={{ color: 'var(--theme-color)' }}>{totalPlays}</div>
                          <div className="text-xs text-gray-400">Total Plays</div>
                        </div>
                        <div className="bg-black/30 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold" style={{ color: 'var(--theme-color)' }}>{memoryStore.playlists.length}</div>
                          <div className="text-xs text-gray-400">Playlists</div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 mb-4">
                      {['songs', 'playlists', 'facts'].map(tab => (
                        <button
                          key={tab}
                          onClick={() => setActiveMemoryTab(activeMemoryTab === tab ? null : tab)}
                          className="glass-button flex-1 py-2 text-sm capitalize"
                        >
                          {tab} ({tab === 'songs' ? sortedSongs.length : tab === 'playlists' ? (memoryStore?.playlists.length || 0) : (memoryStore?.facts.length || 0)})
                        </button>
                      ))}
                    </div>

                    {/* Details View */}
                    <div className="flex-1 bg-black/20 rounded-lg p-4 min-h-[150px] mb-4 overflow-y-auto">
                      {activeMemoryTab === 'songs' && sortedSongs.length > 0 && (
                        <div className="space-y-2">
                          {sortedSongs.slice(0, 50).map((s: any, i: number) => (
                            <div key={s.uri} className="flex justify-between items-center p-2 rounded text-sm bg-white/5">
                              <span className="truncate flex-1">
                                {s.name} <span className="text-gray-500">{s.artist}</span>
                              </span>
                              <span className="font-bold ml-4" style={{ color: 'var(--theme-color)' }}>x{s.count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {activeMemoryTab === 'playlists' && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            {(memoryStore?.playlists || []).map((p: any, i: number) => (
                              <div key={p.uri + i} className="flex justify-between items-center p-2 rounded text-sm bg-white/5">
                                <span>{p.name}</span>
                                <span className="text-gray-500 text-xs truncate max-w-[150px]">{p.uri}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex flex-col gap-2 pt-4 border-t border-white/10">
                            <input type="text" value={playlistName} onChange={(e) => setPlaylistName(e.target.value)} placeholder="Playlist name (e.g. Chill Vibes)" style={inputStyle} />
                            <input type="text" value={playlistUri} onChange={(e) => setPlaylistUri(e.target.value)} placeholder="URL or URI" style={inputStyle} onKeyDown={(e) => { if (e.key === 'Enter') handleSavePlaylist(); }} />
                            <button onClick={handleSavePlaylist} className="glass-button py-2 w-full mt-2">Save Playlist</button>
                          </div>
                        </div>
                      )}

                      {activeMemoryTab === 'facts' && memoryStore && (
                        <div className="space-y-2">
                          {memoryStore.facts.length === 0 ? (
                            <div className="text-sm text-gray-500">No facts yet.</div>
                          ) : (
                            memoryStore.facts.map((f: string, i: number) => (
                              <div key={i} className="text-sm text-gray-300 p-2 rounded bg-white/5">- {f}</div>
                            ))
                          )}
                        </div>
                      )}
                      
                      {!activeMemoryTab && (
                        <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                          Select a category above to view details
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={memoryInput}
                        onChange={(e) => setMemoryInput(e.target.value)}
                        placeholder="I love spicy food..."
                        style={inputStyle}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddMemory(); }}
                      />
                      <button onClick={handleAddMemory} className="glass-button px-6">Add</button>
                    </div>
                  </div>

                  {/* Spotify Config */}
                  <div className="p-6 rounded-xl bg-black/20 border border-white/10 backdrop-blur-md">
                    <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--theme-color)' }}>Spotify Connection</h3>
                    <p className="text-sm text-gray-400 mb-6">
                      Enter your Spotify Developer credentials to enable music playback integration.
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">Client ID</label>
                        <input 
                          type="password" 
                          placeholder="Client ID"
                          value={spotifyId}
                          onChange={(e) => setSpotifyId(e.target.value)}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">Client Secret</label>
                        <input 
                          type="password" 
                          placeholder="Client Secret"
                          value={spotifySecret}
                          onChange={(e) => setSpotifySecret(e.target.value)}
                          style={inputStyle}
                        />
                      </div>
                      <button 
                        onClick={() => {
                          if (spotifyId && spotifySecret) {
                            window.electronAPI.saveSpotifyConfig(spotifyId, spotifySecret);
                            window.electronAPI.authenticateSpotify();
                          }
                        }}
                        className="glass-button w-full py-3 mt-4"
                      >
                        Connect to Spotify
                      </button>
                    </div>
                  </div>

                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </BorderGlow>
    </div>
  );
}
