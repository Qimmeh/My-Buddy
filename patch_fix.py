import os
path = r'C:\projects\My-Buddy\electron\main.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "Math.random() > 0.5 and 'glance-left' or 'glance-right'",
    "Math.random() > 0.5 ? 'glance-left' : 'glance-right'"
)
content = content.replace('hour >= 22 or hour < 7', 'hour >= 22 || hour < 7')
content = content.replace(
    'Math.abs(x) < 100 and Math.abs(y) < 100',
    'Math.abs(x) < 100 && Math.abs(y) < 100'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed')