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

export function CharacterEditor() {
  const [characterName, setCharacterName] = useState('Raiden Shogun');
  const [characterTips, setCharacterTips] = useState('from Genshin Impact');
  const [personalityPrompt, setPersonalityPrompt] = useState('You are a specialized, evolving system AI. Your personality is sleek, helpful, and tech-savvy.');
  const [themeColor, setThemeColor] = useState('#b026ff');

  const [avatarConfig, setAvatarConfig] = useState<Record<string, string>>({});
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewAutoPlay, setPreviewAutoPlay] = useState(false);
  const [marketplaceBundles, setMarketplaceBundles] = useState<any[]>([]);
  const [marketplaceLoading, setMarketplaceLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadBundleName, setUploadBundleName] = useState('My Custom Avatar');
  const [uploadBundleDescription, setUploadBundleDescription] = useState('');
  const [downloadingBundles, setDownloadingBundles] = useState<Record<string, boolean>>({});
  const [selectedBundle, setSelectedBundle] = useState<any>(null);
  
  const avatarStates = ['idle', 'active', 'very-active', 'ready', 'thinking', 'walking-left', 'walking-left-2', 'walking-right', 'walking-right-2', 'paused', 'dizzy', 'blink', 'glance-left', 'glance-right', 'look-around'];
  
  const defaults: Record<string, string> = {
    'idle': idleImg, 'active': activeImg, 'very-active': veryActiveImg, 'ready': readyImg, 'thinking': thinkingImg,
    'walking-left': walkLeftImg, 'walking-left-2': walkLeft2Img, 'walking-right': walkRightImg, 'walking-right-2': walkRight2Img,
    'paused': pausedImg, 'dizzy': dizzyImg, 'blink': blinkImg, 'glance-left': glanceLeftImg, 'glance-right': glanceRightImg, 'look-around': lookAroundImg
  };

  const [currentView, setCurrentView] = useState<'editor' | 'marketplace'>('editor');

  useEffect(() => {
    // Load config
    if (window.electronAPI.getCharacterConfig) {
      window.electronAPI.getCharacterConfig().then((config: any) => {
        if (config) {
          setCharacterName(config.characterName || 'Raiden Shogun');
          setCharacterTips(config.characterTips || 'from Genshin Impact');
          setPersonalityPrompt(config.personalityPrompt || 'You are a specialized, evolving system AI. Your personality is sleek, helpful, and tech-savvy.');
          setThemeColor(config.themeColor || '#b026ff');
          document.documentElement.style.setProperty('--theme-color', config.themeColor || '#b026ff');
        }
      }).catch(console.error);
    }

    if (window.electronAPI.getAvatarConfig) {
      window.electronAPI.getAvatarConfig().then((config: any) => {
        setAvatarConfig(config);
      }).catch(console.error);
      
      window.electronAPI.onAvatarConfigUpdated((config: any) => {
        setAvatarConfig(config);
      });
    }
  }, []);

  // Auto-save character config
  useEffect(() => {
    const timer = setTimeout(() => {
      if (window.electronAPI.saveCharacterConfig) {
        window.electronAPI.saveCharacterConfig({
          characterName,
          characterTips,
          personalityPrompt,
          themeColor
        });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [characterName, characterTips, personalityPrompt, themeColor]);

  useEffect(() => {
    if (currentView !== 'marketplace' || !window.electronAPI.listBundles) return;
    setMarketplaceLoading(true);
    window.electronAPI.listBundles().then((bundles: any) => {
      setMarketplaceBundles(bundles);
    }).catch(console.error).finally(() => setMarketplaceLoading(false));
  }, [currentView]);

  useEffect(() => {
    if (!previewAutoPlay) return;
    const interval = setInterval(() => {
      setPreviewIndex(i => (i + 1) % avatarStates.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [previewAutoPlay]);

  const handleSaveConfig = () => {
    alert('Character profiles are now auto-saved instantly!');
  };

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
        }).then((config: any) => {
          if (config) setAvatarConfig(config);
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const btnStyle: React.CSSProperties = {
    background: 'var(--theme-color)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 'bold',
    transition: 'background 0.2s',
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid var(--theme-color)',
    borderRadius: '8px',
    padding: '8px 12px',
    color: '#fff',
    fontSize: '0.9rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box'
  };

  const sectionStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
    border: '1px solid var(--glass-border)'
  };

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      height: '100vh',
      background: 'var(--theme-bg-gradient)',
      color: '#fff',
      padding: '24px',
      overflowY: 'auto',
      position: 'relative',
      boxSizing: 'border-box'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ color: 'var(--theme-color)', marginBottom: '24px' }}>Edit Character</h1>

        {currentView === 'editor' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Left Column: Personality & Basics */}
            <div>
              <div style={sectionStyle}>
                <h2 style={{ fontSize: '1.2rem', marginTop: 0, marginBottom: '16px' }}>Personality & Identity</h2>
                
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: '#ccc' }}>Character Name</label>
                  <input 
                    style={inputStyle} 
                    value={characterName} 
                    onChange={e => setCharacterName(e.target.value)} 
                    placeholder="e.g. Raiden Shogun"
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: '#ccc' }}>Character Tips (Context for AI)</label>
                  <input 
                    style={inputStyle} 
                    value={characterTips} 
                    onChange={e => setCharacterTips(e.target.value)} 
                    placeholder="e.g. from Genshin Impact"
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: '#ccc' }}>Personality Prompt</label>
                  <textarea 
                    style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }} 
                    value={personalityPrompt} 
                    onChange={e => setPersonalityPrompt(e.target.value)} 
                    placeholder="Describe how the character acts, speaks, and their mood..."
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: '#ccc' }}>Theme Color</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input 
                      type="color" 
                      value={themeColor} 
                      onChange={e => {
                        setThemeColor(e.target.value);
                        document.documentElement.style.setProperty('--theme-color', e.target.value);
                      }}
                      style={{ cursor: 'pointer', width: '40px', height: '40px', padding: '0', border: 'none', borderRadius: '4px', background: 'transparent' }}
                    />
                    <span style={{ fontSize: '0.9rem' }}>{themeColor}</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Right Column: Avatar Settings */}
            <div>
              <div style={sectionStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Avatar Animations</h2>
                  <button onClick={() => setCurrentView('marketplace')} style={{ ...btnStyle, fontSize: '0.75rem', padding: '4px 10px', background: 'rgba(50, 150, 255, 0.8)' }}>Open Marketplace</button>
                </div>

                {/* Live Preview */}
                <div style={{
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '12px',
                  padding: '12px',
                  textAlign: 'center',
                  border: '1px solid var(--glass-border)',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    width: '100px',
                    height: '100px',
                    margin: '0 auto 12px auto',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--glass-border)'
                  }}>
                    <img
                      src={avatarConfig[avatarStates[previewIndex]] ? 'file://' + avatarConfig[avatarStates[previewIndex]] : (defaults[avatarStates[previewIndex]] || idleImg)}
                      alt={avatarStates[previewIndex]}
                      style={{ maxWidth: '80px', maxHeight: '80px', objectFit: 'contain' }}
                    />
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--theme-color)', textTransform: 'capitalize' }}>
                    {avatarStates[previewIndex].replace(/-/g, ' ')}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                    <button onClick={() => setPreviewIndex(i => (i - 1 + avatarStates.length) % avatarStates.length)} style={{ ...btnStyle, padding: '4px 12px', background: 'rgba(255,255,255,0.1)' }}>&larr;</button>
                    <span style={{ fontSize: '0.8rem', color: '#888', minWidth: '40px' }}>{previewIndex + 1}/{avatarStates.length}</span>
                    <button onClick={() => setPreviewIndex(i => (i + 1) % avatarStates.length)} style={{ ...btnStyle, padding: '4px 12px', background: 'rgba(255,255,255,0.1)' }}>&rarr;</button>
                    <button
                      onClick={() => setPreviewAutoPlay(!previewAutoPlay)}
                      style={{ ...btnStyle, padding: '4px 12px', background: previewAutoPlay ? 'var(--theme-color)' : 'rgba(255,255,255,0.1)' }}
                    >
                      {previewAutoPlay ? 'Stop' : 'Auto Play'}
                    </button>
                  </div>
                </div>

                {/* Smart Walking Generator */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.85rem', marginBottom: '8px', color: '#ccc' }}>Smart Walking Generator</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <label style={{ ...btnStyle, textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', flex: 1, fontSize: '0.8rem' }}>
                      Upload LEFT-facing
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                        if (e.target.files && e.target.files[0]) generateWalkingSet(e.target.files[0], false);
                        e.target.value = '';
                      }} />
                    </label>
                    <label style={{ ...btnStyle, textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', flex: 1, fontSize: '0.8rem' }}>
                      Upload RIGHT-facing
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                        if (e.target.files && e.target.files[0]) generateWalkingSet(e.target.files[0], true);
                        e.target.value = '';
                      }} />
                    </label>
                  </div>
                </div>

                {/* State Gallery */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }} className="scrollable-menu">
                  {avatarStates.map(state => {
                    const imgSrc = avatarConfig[state] ? 'file://' + avatarConfig[state] : defaults[state] || idleImg;
                    return (
                      <div key={state} style={{
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: '8px',
                        padding: '8px',
                        textAlign: 'center',
                        border: previewIndex === avatarStates.indexOf(state) ? '1px solid var(--theme-color)' : '1px solid var(--glass-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <img
                          src={imgSrc}
                          alt={state}
                          style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '4px', cursor: 'pointer', marginBottom: '4px' }}
                          onClick={() => setPreviewIndex(avatarStates.indexOf(state))}
                        />
                        <div style={{ fontSize: '0.65rem', color: '#ccc', textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                          {state.replace(/-/g, ' ')}
                        </div>
                        <div style={{ display: 'flex', gap: '4px', width: '100%', marginTop: '4px' }}>
                          <button
                            onClick={() => window.electronAPI.selectAvatarImage(state)}
                            style={{ ...btnStyle, fontSize: '0.6rem', padding: '2px', flex: 1 }}
                          >Set</button>
                          {avatarConfig[state] && (
                            <button
                              onClick={() => window.electronAPI.resetAvatarImage(state)}
                              style={{ ...btnStyle, fontSize: '0.6rem', padding: '2px', background: 'rgba(255, 50, 50, 0.4)' }}
                            >X</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'marketplace' && (
          <div style={sectionStyle}>
            <div style={{ 
              background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px 24px',
              border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' 
            }}>
              <button onClick={() => setCurrentView('editor')} style={{ ...btnStyle, background: 'rgba(255,255,255,0.1)' }}>
                &larr; Back to Editor
              </button>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Avatar Marketplace</h2>
              <button
                onClick={() => {
                  setUploadBundleName('My Custom Avatar');
                  setShowUploadModal(true);
                }}
                style={{ ...btnStyle, background: 'rgba(50, 200, 100, 0.8)' }}
              >
                Upload Current Avatar
              </button>
            </div>

            {marketplaceLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>Loading bundles...</div>
            ) : marketplaceBundles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>No bundles available. Upload one!</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
                {marketplaceBundles.map(bundle => (
                  <div key={bundle.id} onClick={() => setSelectedBundle(bundle)} style={{
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid var(--glass-border)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}>
                    {bundle.thumbnailUrl && (
                      <img src={bundle.thumbnailUrl} alt={bundle.name} style={{ width: '100%', height: '120px', objectFit: 'contain', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '12px' }} />
                    )}
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {bundle.name}
                      {bundle.isCloud ? (
                        <span style={{ fontSize: '0.7rem', background: '#3b82f6', padding: '2px 6px', borderRadius: '4px' }}>Cloud</span>
                      ) : (
                        <span style={{ fontSize: '0.7rem', background: '#10b981', padding: '2px 6px', borderRadius: '4px' }}>Installed</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '8px' }}>
                      by {bundle.author} &middot; {bundle.createdAt ? new Date(bundle.createdAt).toLocaleDateString() : 'Unknown Date'}
                    </div>
                    {bundle.description && (
                      <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '12px' }}>{bundle.description}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Details Modal */}
            {selectedBundle && (
              <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
              }} onClick={() => setSelectedBundle(null)}>
                <div style={{
                  background: '#1a1a24', border: '1px solid var(--glass-border)', borderRadius: '12px',
                  padding: '24px', width: '80%', maxWidth: '800px', maxHeight: '90vh',
                  display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto'
                }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h2 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {selectedBundle.name}
                        {selectedBundle.isCloud ? (
                          <span style={{ fontSize: '0.8rem', background: '#3b82f6', padding: '4px 8px', borderRadius: '4px' }}>Cloud Bundle</span>
                        ) : (
                          <span style={{ fontSize: '0.8rem', background: '#10b981', padding: '4px 8px', borderRadius: '4px' }}>Installed</span>
                        )}
                      </h2>
                      <div style={{ color: '#aaa', fontSize: '0.9rem' }}>by {selectedBundle.author}</div>
                    </div>
                    <button onClick={() => setSelectedBundle(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                  </div>
                  
                  {selectedBundle.description && (
                    <div style={{ color: '#ddd' }}>{selectedBundle.description}</div>
                  )}

                  <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '16px' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#aaa' }}>Animations</h3>
                    <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
                      {Object.keys(selectedBundle.imageUrls || {}).map(state => (
                        <div key={state} style={{ minWidth: '100px', textAlign: 'center' }}>
                          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '8px', marginBottom: '8px' }}>
                            <img src={selectedBundle.imageUrls[state]} alt={state} style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#888' }}>{state}</div>
                        </div>
                      ))}
                      {(!selectedBundle.imageUrls || Object.keys(selectedBundle.imageUrls).length === 0) && (
                        <div style={{ color: '#888', fontStyle: 'italic' }}>No animations included.</div>
                      )}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#aaa' }}>Configuration Setup</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '4px' }}>Character Name</div>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px' }}>{selectedBundle.characterName || 'N/A'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '4px' }}>Theme Color</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px' }}>
                          <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: selectedBundle.themeColor || '#b026ff' }} />
                          {selectedBundle.themeColor || 'N/A'}
                        </div>
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '4px' }}>Tooltips</div>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px' }}>{selectedBundle.characterTips || 'N/A'}</div>
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '4px' }}>Personality Prompt</div>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px', whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto' }}>
                          {selectedBundle.personalityPrompt || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                    <button
                      disabled={downloadingBundles[selectedBundle.id]}
                      onClick={async () => {
                        setDownloadingBundles(prev => ({ ...prev, [selectedBundle.id]: true }));
                        try {
                          const config = await window.electronAPI.installBundle(selectedBundle.id);
                          if (config) {
                            alert('Bundle "' + selectedBundle.name + '" installed! Please check the avatar settings.');
                            if (window.electronAPI.getCharacterConfig) {
                              const charConfig = await window.electronAPI.getCharacterConfig();
                              if (charConfig) {
                                setCharacterName(charConfig.characterName || 'Raiden Shogun');
                                setCharacterTips(charConfig.characterTips || 'from Genshin Impact');
                                setPersonalityPrompt(charConfig.personalityPrompt || 'You are a specialized, evolving system AI. Your personality is sleek, helpful, and tech-savvy.');
                                setThemeColor(charConfig.themeColor || '#b026ff');
                                document.documentElement.style.setProperty('--theme-color', charConfig.themeColor || '#b026ff');
                              }
                            }
                          }
                        } catch (e: any) {
                          alert('Install failed: ' + (e.message || 'unknown error'));
                        } finally {
                          setDownloadingBundles(prev => ({ ...prev, [selectedBundle.id]: false }));
                          setSelectedBundle(null);
                        }
                      }}
                      style={{ ...btnStyle, flex: 1, background: 'var(--theme-color)', opacity: downloadingBundles[selectedBundle.id] ? 0.7 : 1, fontSize: '1.1rem', padding: '12px' }}
                    >
                      {downloadingBundles[selectedBundle.id] ? 'Downloading...' : 'Install Bundle'}
                    </button>
                    
                    {!selectedBundle.isCloud && window.electronAPI.deleteBundle && (
                      <button
                        onClick={async () => {
                          if (confirm('Delete this bundle from your local PC?')) {
                            try {
                              const success = await window.electronAPI.deleteBundle(selectedBundle.id);
                              if (success) {
                                setSelectedBundle(null);
                                setMarketplaceBundles(prev => prev.filter(b => b.id !== selectedBundle.id));
                              }
                            } catch (e: any) {
                              alert('Delete failed: ' + e.message);
                            }
                          }
                        }}
                        style={{ ...btnStyle, background: 'rgba(255, 50, 50, 0.8)', padding: '12px' }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== Upload Modal ===== */}
      {showUploadModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--theme-color, #b026ff)',
            padding: '24px', borderRadius: '16px', width: '300px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)'
          }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Upload Bundle</h3>
            <input
              type="text"
              value={uploadBundleName}
              onChange={e => setUploadBundleName(e.target.value)}
              style={inputStyle}
              placeholder="Bundle Name"
            />
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button
                style={{ ...btnStyle, flex: 1, background: 'rgba(255,255,255,0.1)' }}
                onClick={() => setShowUploadModal(false)}
              >
                Cancel
              </button>
              <button
                style={{ ...btnStyle, flex: 1, background: 'rgba(50, 200, 100, 0.8)' }}
                onClick={async () => {
                  setShowUploadModal(false);
                  const result = await window.electronAPI.createBundle(uploadBundleName, 'User', '');
                  if (result.success) {
                    alert('Bundle "' + uploadBundleName + '" uploaded to marketplace!');
                    window.electronAPI.listBundles().then(setMarketplaceBundles);
                  } else {
                    alert(result.error === 'DUPLICATE_BUNDLE' ? 'This exact avatar set is already bundled. Modify some images first!' : 'Error: ' + result.error);
                  }
                }}
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
