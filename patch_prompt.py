path = r'C:\projects\My-Buddy\src\components\SettingsMenu.tsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "const name = prompt('Bundle name:');" in line:
        lines[i] = "                  const name = 'Bundle ' + new Date().toLocaleDateString();\n"
    elif "const author = prompt('Author name:') || 'Anonymous';" in line:
        lines[i] = "                  const author = 'User';\n"
    elif "const desc = prompt('Short description:') || '';" in line:
        lines[i] = "                  const desc = '';\n"
    elif "const listStr = bundles.map((b, i) => (i + 1) + '\\u002e ' + b.name + ' by ' + b.author).join(' | ');" in line:
        lines[i] = ''
    elif "const choice = prompt('Available bundles: ' + listStr + '  |  Enter the number to install:');" in line:
        lines[i] = ''
    elif lines[i].strip() == "if (!choice) return;":
        lines[i] = '                  const idx = 0;\n'

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print('Fixed')