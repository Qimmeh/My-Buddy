import os

path = r'C:\projects\My-Buddy\src\components\SettingsMenu.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add state variables after previewAutoPlay
old = "  const [previewAutoPlay, setPreviewAutoPlay] = useState(false);\n  const avatarStates"
new = "  const [previewAutoPlay, setPreviewAutoPlay] = useState(false);\n  const [marketplaceBundles, setMarketplaceBundles] = useState<any[]>([]);\n  const [marketplaceLoading, setMarketplaceLoading] = useState(false);\n  const avatarStates"
content = content.replace(old, new)

# 2. Add load effect after auto-play effect
old = "  // Auto-play preview\n  useEffect(() => {\n    if (!previewAutoPlay) return;"
new = """  // Load marketplace bundles when view opens
  useEffect(() => {
    if (currentView !== 'marketplace' || !window.electronAPI.listBundles) return;
    setMarketplaceLoading(true);
    window.electronAPI.listBundles().then(setMarketplaceBundles).catch(console.error).finally(() => setMarketplaceLoading(false));
  }, [currentView]);

  // Auto-play preview
  useEffect(() => {
    if (!previewAutoPlay) return;"""
content = content.replace(old, new)

# 3. Replace marketplace buttons section
old_market = '          {/* ==== Avatar Marketplace ==== */}'
end_market = '                Open Marketplace\n              </button>\n            </div>\n          </div>'

start = content.find(old_market)
end = content.find(end_market, start)
if start != -1 and end != -1:
    end += len(end_market)
    
    new_market = """          {/* ==== Avatar Marketplace ==== */}
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
                    alert('Bundle \"' + name + '\" uploaded to marketplace!');
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
          </div>"""
    
    content = content[:start] + new_market + content[end:]
    print('Marketplace buttons updated')
else:
    print('Could not find marketplace section')

# 4. Insert marketplace view before closing
old_end = """                  </div>
      )}
    </div>
  );
}"""

new_end = """                  </div>
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
                          alert('Bundle \"' + bundle.name + '\" installed!');
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
}"""

content = content.replace(old_end, new_end)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('SettingsMenu.tsx fully updated!')