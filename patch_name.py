import os
root = r'C:\projects\My-Buddy\src\components'
sm_path = os.path.join(root, 'SettingsMenu.tsx')
with open(sm_path, 'r', encoding='utf-8') as f:
    sm = f.read()

old = ("      {currentView === 'main' && (\n"
       "        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>\n"
       "\n"
       "        {/* ===== Memory Overview ===== */}")

new = ("      {currentView === 'main' && (\n"
       "        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>\n"
       "\n"
       "        {/* ===== Buddy Name ===== */}\n"
       "        <div>\n"
       "          <strong>Buddy Name</strong>\n"
       "          <p style={{ margin: '4px 0 8px 0', fontSize: '0.8rem', color: '#ccc' }}>\n"
       "            Set a name for your buddy companion.\n"
       "          </p>\n"
       "          <input\n"
       "            type=\"text\"\n"
       "            value={buddyName}\n"
       "            onChange={(e) => onBuddyNameChange(e.target.value)}\n"
       "            placeholder=\"Enter a name...\"\n"
       "            style={{\n"
       "              background: 'rgba(0,0,0,0.3)',\n"
       "              border: '1px solid var(--neon-purple)',\n"
       "              borderRadius: '8px',\n"
       "              padding: '4px 8px',\n"
       "              color: '#fff',\n"
       "              fontSize: '0.8rem',\n"
       "              outline: 'none',\n"
       "              width: '100%',\n"
       "              boxSizing: 'border-box'\n"
       "            }}\n"
       "          />\n"
       "        </div>\n"
       "\n"
       "        <hr style={sectionDivider} />\n"
       "\n"
       "        {/* ===== Memory Overview ===== */}")

sm = sm.replace(old, new)
with open(sm_path, 'w', encoding='utf-8') as f:
    f.write(sm)
print('SettingsMenu.tsx done')