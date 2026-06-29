import os
path = r'C:\projects\My-Buddy\src\App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = """        } else if (action === 'look-around') {
          setState('look-around');
          animationLock.current = 'look-around';
          setTimeout(() => {
            setState('glance-left');
            animationLock.current = null;
            setTimeout(() => { setState('ready'); }, 400);
          }, 300);"""

new = """        } else if (action === 'look-around') {
          setState('look-around');
          animationLock.current = 'look-around';
          setTimeout(() => {
            setState('glance-left');
            animationLock.current = 'look-around';
            setTimeout(() => {
              animationLock.current = null;
              setState('ready');
            }, 400);
          }, 300);"""

content = content.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('look-around fixed')