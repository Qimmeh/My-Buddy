import { app, BrowserWindow } from 'electron';
import * as http from 'node:http';
import * as fs from 'node:fs';
import { join } from 'node:path';
import { exec } from 'node:child_process';

const REDIRECT_URI = 'http://127.0.0.1:8888/callback';
const TOKEN_FILE = join(app.getPath('userData'), 'spotify_tokens.json');
const CONFIG_FILE = join(app.getPath('userData'), 'spotify_config.json');

let clientId = '';
let clientSecret = '';
let accessToken = '';
let refreshToken = '';
let tokenExpirationTime = 0;

export function loadSpotifyConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      clientId = data.clientId || '';
      clientSecret = data.clientSecret || '';
    } catch (e) {
      console.error('Failed to load Spotify config', e);
    }
  }
  return { clientId, clientSecret };
}

export function saveSpotifyConfig(id: string, secret: string) {
  clientId = id;
  clientSecret = secret;
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ clientId, clientSecret }));
}

function loadTokens() {
  if (fs.existsSync(TOKEN_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
      accessToken = data.access_token;
      refreshToken = data.refresh_token;
      tokenExpirationTime = data.expiration_time;
    } catch (e) {
      console.error('Failed to load Spotify tokens', e);
    }
  }
}

function saveTokens(data: any) {
  accessToken = data.access_token;
  if (data.refresh_token) refreshToken = data.refresh_token;
  // Expire 1 minute early for safety
  tokenExpirationTime = Date.now() + (data.expires_in - 60) * 1000;
  
  fs.writeFileSync(TOKEN_FILE, JSON.stringify({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiration_time: tokenExpirationTime
  }));
}

export async function getValidToken(): Promise<string | null> {
  if (!clientId || !clientSecret) return null;
  if (!accessToken || !refreshToken) return null;
  
  if (Date.now() > tokenExpirationTime) {
    // Refresh token
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    try {
      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authHeader}`
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      });
      if (res.ok) {
        const data = await res.json();
        saveTokens(data);
      } else {
        return null;
      }
    } catch (e) {
      console.error('Token refresh failed', e);
      return null;
    }
  }
  return accessToken;
}

export function authenticateSpotify(_win: BrowserWindow) {
  return new Promise<void>((resolve, reject) => {
    if (!clientId || !clientSecret) {
      reject('No Spotify credentials configured');
      return;
    }
    const scope = encodeURIComponent('user-read-playback-state user-modify-playback-state');
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scope}`;
    
    // Start temporary local server to catch the callback
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code');
        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>Spotify authenticated successfully!</h1><p>You can close this window now.</p><script>window.close()</script>');
          
          server.close();
          
          // Exchange code for token
          const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
          try {
            const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${authHeader}`
              },
              body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI
              })
            });
            if (tokenRes.ok) {
              const data = await tokenRes.json();
              saveTokens(data);
              resolve();
            } else {
              reject('Failed to exchange code');
            }
          } catch (e) {
            reject(e);
          }
        } else {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Failed to authenticate');
          server.close();
          reject('No code in callback');
        }
      }
    });

    server.listen(8888, () => {
      console.log('Listening for Spotify callback on port 8888');
      // Open the browser
      exec(`start "" "${authUrl}"`);
    });
  });
}

export async function playSpotifyQuery(query: string, win: BrowserWindow): Promise<{name: string, artist: string, uri: string} | null> {
  let token = await getValidToken();
  if (!token) {
    try {
      await authenticateSpotify(win);
      token = await getValidToken();
    } catch (e) {
      console.error('Failed to auth Spotify during play', e);
      return null;
    }
  }

  if (!token) return null;

  // Search for the track or playlist
  try {
    const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track,playlist&limit=1`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (searchRes.ok) {
      const data: any = await searchRes.json();
      let uriToPlay = null;
      let name = '';
      let artist = '';
      
      if (data.playlists && data.playlists.items.length > 0 && query.toLowerCase().includes('playlist')) {
        uriToPlay = data.playlists.items[0].uri;
        name = data.playlists.items[0].name;
        artist = data.playlists.items[0].owner.display_name;
      } else if (data.tracks && data.tracks.items.length > 0) {
        uriToPlay = data.tracks.items[0].uri;
        name = data.tracks.items[0].name;
        artist = data.tracks.items[0].artists[0].name;
      }
      
      if (uriToPlay) {
        // We have a URI, now send Play command
        let playRes = await fetch('https://api.spotify.com/v1/me/player/play', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            context_uri: uriToPlay.includes('playlist') ? uriToPlay : undefined,
            uris: uriToPlay.includes('track') ? [uriToPlay] : undefined
          })
        });

        if (playRes.status === 404) {
          // No active device found! Let's try to find an available device and wake it up
          const devicesRes = await fetch('https://api.spotify.com/v1/me/player/devices', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (devicesRes.ok) {
            const devicesData: any = await devicesRes.json();
            if (devicesData.devices && devicesData.devices.length > 0) {
              const targetDevice = devicesData.devices[0].id;
              playRes = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${targetDevice}`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  context_uri: uriToPlay.includes('playlist') ? uriToPlay : undefined,
                  uris: uriToPlay.includes('track') ? [uriToPlay] : undefined
                })
              });
            }
          }
        }

        if (!playRes.ok) {
          const errText = await playRes.text();
          console.error(`Spotify Play failed: ${playRes.status} ${errText}`);
          // Fallback to opening it in the desktop app and simulating Enter if API playback fails (e.g. no active device or premium)
          const psScript = `
            $wshell = New-Object -ComObject wscript.shell
            Start-Process "${uriToPlay}"
            Start-Sleep -Seconds 2
            $wshell.AppActivate("Spotify")
            Start-Sleep -Milliseconds 500
            $wshell.SendKeys("{ENTER}")
          `;
          exec(`powershell -Command "${psScript.replace(/\n/g, ';')}"`);
        }
        
        return { name, artist, uri: uriToPlay };
      } else {
        // Fallback: just open search
        exec(`start "" "spotify:search:${encodeURIComponent(query)}"`);
      }
    }
  } catch (e) {
    console.error('Spotify search/play error', e);
  }
  return null;
}

let lastPlayingTrackId = '';

export function startSpotifyPoller(_win: BrowserWindow, triggerComment: (message: string) => void) {
  loadTokens();
  
  setInterval(async () => {
    const token = await getValidToken();
    if (!token) return; // Silent return if not authenticated

    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.status === 200) {
        const data: any = await res.json();
        if (data && data.item && data.is_playing) {
          const trackId = data.item.id;
          const trackName = data.item.name;
          const artistName = data.item.artists[0]?.name || 'Unknown Artist';
          
          if (trackId && trackId !== lastPlayingTrackId) {
            lastPlayingTrackId = trackId;
            
            // Only trigger if it's not the very first load
            if (lastPlayingTrackId !== '') {
               // 30% chance to spontaneously react to the new song
               if (Math.random() < 0.3) {
                 triggerComment(`You are Zi Feng's Desktop Companion. He is now listening to the song "${trackName}" by "${artistName}" on Spotify. Give a very short, 1-sentence spontaneous reaction or comment about this song. Keep it cute and casual.`);
               }
            }
          }
        }
      }
    } catch (e) {
      // Ignore polling errors
    }
  }, 10000);
}
