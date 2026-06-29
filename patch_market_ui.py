import os

path = r'C:\projects\My-Buddy\src\components\SettingsMenu.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = """          </div>

        </div>
      )}"""

new = """          </div>

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
                  const name = prompt('Bundle name:');
                  if (!name) return;
                  const author = prompt('Author name:') || 'Anonymous';
                  const desc = prompt('Short description:') || '';
                  const result = await window.electronAPI.createBundle(name, author, desc);
                  if (result.success) {
                    alert('Bundle "' + name + '" created and uploaded to marketplace!');
                  } else {
                    alert(result.error === 'DUPLICATE_BUNDLE' ? 'This exact avatar set is already bundled. Modify some images first!' : 'Error: ' + result.error);
                  }
                }}
                style={{ ...btnStyle, flex: 1, fontSize: '0.7rem', background: 'rgba(50, 200, 100, 0.8)' }}
              >
                Upload to Marketplace
              </button>
              <button
                onClick={async () => {
                  const bundles = await window.electronAPI.listBundles();
                  if (!bundles || bundles.length === 0) {
                    alert('No bundles available in the marketplace.');
                    return;
                  }
                  const list = bundles.map((b, i) => (i + 1) + '. ' + b.name + ' by ' + b.author + (b.description ? ' - ' + b.description : '')).join('\n');
                  const choice = prompt('Available bundles:\n' + list + '\n\nEnter the number to install:');
                  if (!choice) return;
                  const idx = parseInt(choice) - 1;
                  if (idx >= 0 && idx < bundles.length) {
                    try {
                      const config = await window.electronAPI.installBundle(bundles[idx].id);
                      if (config) {
                        alert('Bundle "' + bundles[idx].name + '" installed!');
                      }
                    } catch (e) {
                      alert('Install failed: ' + e.message);
                    }
                  }
                }}
                style={{ ...btnStyle, flex: 1, fontSize: '0.7rem', background: 'rgba(50, 150, 255, 0.8)' }}
              >
                Open Marketplace
              </button>
            </div>
          </div>

        </div>
      )}"""

content = content.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('SettingsMenu.tsx updated')