with open(r'C:\projects\My-Buddy\src\components\SettingsMenu.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix broken lines 590-594 (0-indexed 589-593)
lines[589] = "                  const listStr = bundles.map((b, i) => (i + 1) + '\\u002e ' + b.name + ' by ' + b.author).join(' | ');\n"
lines[590] = "                  const choice = prompt('Available bundles: ' + listStr + '  |  Enter the number to install:');\n"
# Remove orphaned lines 591-594 by replacing with empty
lines[591] = "                  // removed\n"
lines[592] = "                  // removed\n"
lines[593] = "                  // removed\n"
# But wait, line 595 should be the continuation. Let me check
# Line 595 is the 'if' statement, keep it.

with open(r'C:\projects\My-Buddy\src\components\SettingsMenu.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print('Fixed')