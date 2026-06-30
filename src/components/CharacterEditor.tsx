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

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

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
            ctx.translate(0, canvas.height * 0.05);
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

  return (
    <div className="w-full h-full flex flex-col">
      <div className="max-w-4xl mx-auto w-full pb-10">

        <Tabs value={currentView} onValueChange={(v: string) => setCurrentView(v as 'editor' | 'marketplace')} className="flex flex-col h-full">
          <TabsList className="mb-6 grid w-full grid-cols-2 bg-black/40 text-white/70">
            <TabsTrigger value="editor" className="data-[state=active]:bg-primary/50 data-[state=active]:text-white">Profile Editor</TabsTrigger>
            <TabsTrigger value="marketplace" className="data-[state=active]:bg-primary/50 data-[state=active]:text-white">Avatar Marketplace</TabsTrigger>
          </TabsList>

          <TabsContent value="editor">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personality & Basics */}
              <Card className="bg-black/20 border-white/10 backdrop-blur-md text-white">
                <CardHeader>
                  <CardTitle>Personality & Identity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="charName" className="text-white/70">Character Name</Label>
                    <Input id="charName" className="bg-black/30 border-white/20 focus-visible:ring-primary text-white" value={characterName} onChange={e => setCharacterName(e.target.value)} placeholder="e.g. Raiden Shogun" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="charTips" className="text-white/70">Character Tips (Context)</Label>
                    <Input id="charTips" className="bg-black/30 border-white/20 focus-visible:ring-primary text-white" value={characterTips} onChange={e => setCharacterTips(e.target.value)} placeholder="e.g. from Genshin Impact" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="charPrompt" className="text-white/70">Personality Prompt</Label>
                    <Textarea id="charPrompt" className="bg-black/30 border-white/20 focus-visible:ring-primary min-h-[120px] text-white" value={personalityPrompt} onChange={e => setPersonalityPrompt(e.target.value)} placeholder="Describe how the character acts..." />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white/70">Theme Color</Label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="color" 
                        value={themeColor} 
                        onChange={e => {
                          setThemeColor(e.target.value);
                          document.documentElement.style.setProperty('--theme-color', e.target.value);
                        }}
                        className="w-10 h-10 p-0 border-0 rounded cursor-pointer bg-transparent"
                      />
                      <span className="text-sm font-medium">{themeColor}</span>
                    </div>
                  </div>

                  <Button 
                    className="w-full mt-4 bg-primary hover:bg-primary/90 text-white" 
                    onClick={async () => {
                      if (window.electronAPI.saveCharacterConfig) {
                        try {
                          await window.electronAPI.saveCharacterConfig({
                            characterName,
                            characterTips,
                            personalityPrompt,
                            themeColor
                          });
                          alert('Profile saved successfully! The character personality has been updated.');
                        } catch (e: any) {
                          alert('Failed to save profile: ' + e.message);
                        }
                      }
                    }}
                  >
                    Save Profile
                  </Button>
                </CardContent>
              </Card>

              {/* Avatar Settings */}
              <Card className="bg-black/20 border-white/10 backdrop-blur-md text-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle>Avatar Animations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Live Preview */}
                  <div className="bg-black/30 rounded-xl p-4 text-center border border-white/10">
                    <div className="w-24 h-24 mx-auto mb-3 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                      <img
                        src={avatarConfig[avatarStates[previewIndex]] ? 'file://' + avatarConfig[avatarStates[previewIndex]] : (defaults[avatarStates[previewIndex]] || idleImg)}
                        alt={avatarStates[previewIndex]}
                        className="max-w-[80px] max-h-[80px] object-contain"
                      />
                    </div>
                    <div className="text-sm font-bold mb-2 capitalize" style={{ color: 'var(--theme-color)' }}>
                      {avatarStates[previewIndex].replace(/-/g, ' ')}
                    </div>
                    <div className="flex gap-2 justify-center items-center">
                      <Button variant="secondary" size="sm" onClick={() => setPreviewIndex(i => (i - 1 + avatarStates.length) % avatarStates.length)}>&larr;</Button>
                      <span className="text-xs text-white/50 min-w-[40px]">{previewIndex + 1}/{avatarStates.length}</span>
                      <Button variant="secondary" size="sm" onClick={() => setPreviewIndex(i => (i + 1) % avatarStates.length)}>&rarr;</Button>
                      <Button variant={previewAutoPlay ? "default" : "secondary"} size="sm" onClick={() => setPreviewAutoPlay(!previewAutoPlay)}>
                        {previewAutoPlay ? 'Stop' : 'Auto Play'}
                      </Button>
                    </div>
                  </div>

                  {/* Smart Walking Generator */}
                  <div className="space-y-2">
                    <Label className="text-white/70">Smart Walking Generator</Label>
                    <div className="flex gap-2">
                      <Button variant="secondary" className="flex-1 text-xs relative overflow-hidden" asChild>
                        <label className="cursor-pointer">
                          Upload LEFT
                          <input type="file" accept="image/*" className="hidden" onChange={e => {
                            if (e.target.files && e.target.files[0]) generateWalkingSet(e.target.files[0], false);
                            e.target.value = '';
                          }} />
                        </label>
                      </Button>
                      <Button variant="secondary" className="flex-1 text-xs relative overflow-hidden" asChild>
                        <label className="cursor-pointer">
                          Upload RIGHT
                          <input type="file" accept="image/*" className="hidden" onChange={e => {
                            if (e.target.files && e.target.files[0]) generateWalkingSet(e.target.files[0], true);
                            e.target.value = '';
                          }} />
                        </label>
                      </Button>
                    </div>
                  </div>

                  {/* State Gallery */}
                  <ScrollArea className="h-64 pr-4 border border-white/10 rounded-md bg-black/20 p-2">
                    <div className="grid grid-cols-3 gap-2">
                      {avatarStates.map(state => {
                        const imgSrc = avatarConfig[state] ? 'file://' + avatarConfig[state] : defaults[state] || idleImg;
                        return (
                          <div key={state} className={`bg-black/30 rounded-lg p-2 text-center flex flex-col items-center justify-between border ${previewIndex === avatarStates.indexOf(state) ? 'border-primary' : 'border-white/5'}`}>
                            <img
                              src={imgSrc}
                              alt={state}
                              className="w-10 h-10 object-contain rounded cursor-pointer mb-1"
                              onClick={() => setPreviewIndex(avatarStates.indexOf(state))}
                            />
                            <div className="text-[0.6rem] text-white/70 capitalize whitespace-nowrap overflow-hidden text-ellipsis w-full">
                              {state.replace(/-/g, ' ')}
                            </div>
                            <div className="flex gap-1 w-full mt-1">
                              <Button size="sm" variant="default" className="h-6 text-[0.55rem] px-1 flex-1" onClick={() => window.electronAPI.selectAvatarImage(state)}>Set</Button>
                              {avatarConfig[state] && (
                                <Button size="sm" variant="destructive" className="h-6 text-[0.55rem] px-1" onClick={() => window.electronAPI.resetAvatarImage(state)}>X</Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="marketplace">
            <Card className="bg-black/20 border-white/10 backdrop-blur-md text-white min-h-[500px]">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Marketplace</CardTitle>
                  <CardDescription className="text-white/60">Discover and install community avatars</CardDescription>
                </div>
                <Button variant="default" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => {
                  setUploadBundleName('My Custom Avatar');
                  setShowUploadModal(true);
                }}>
                  Upload Current Avatar
                </Button>
              </CardHeader>
              <CardContent>
                {marketplaceLoading ? (
                  <div className="text-center p-10 text-white/50">Loading bundles...</div>
                ) : marketplaceBundles.length === 0 ? (
                  <div className="text-center p-10 text-white/50">No bundles available. Upload one!</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {marketplaceBundles.map(bundle => (
                      <Card key={bundle.id} className="bg-black/30 border-white/10 cursor-pointer hover:-translate-y-1 hover:shadow-lg hover:shadow-black/50 transition-all text-white" onClick={() => setSelectedBundle(bundle)}>
                        <CardContent className="p-4">
                          {bundle.thumbnailUrl && (
                            <img src={bundle.thumbnailUrl} alt={bundle.name} className="w-full h-24 object-contain bg-white/5 rounded-md mb-3" />
                          )}
                          <div className="font-bold text-lg mb-1 flex justify-between items-center">
                            <span className="truncate">{bundle.name}</span>
                            {bundle.isCloud ? (
                              <span className="text-[0.65rem] bg-blue-500 px-2 py-0.5 rounded text-white">Cloud</span>
                            ) : (
                              <span className="text-[0.65rem] bg-emerald-500 px-2 py-0.5 rounded text-white">Installed</span>
                            )}
                          </div>
                          <div className="text-xs text-white/50 mb-2">by {bundle.author} &middot; {bundle.createdAt ? new Date(bundle.createdAt).toLocaleDateString() : 'Unknown'}</div>
                          {bundle.description && <div className="text-xs text-white/70 line-clamp-2">{bundle.description}</div>}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Details Dialog */}
      <Dialog open={!!selectedBundle} onOpenChange={(open) => !open && setSelectedBundle(null)}>
        <DialogContent className="bg-black/90 text-white border-white/20 sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          {selectedBundle && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-xl">
                  {selectedBundle.name}
                  {selectedBundle.isCloud ? (
                    <span className="text-xs bg-blue-500 px-2 py-1 rounded">Cloud</span>
                  ) : (
                    <span className="text-xs bg-emerald-500 px-2 py-1 rounded">Installed</span>
                  )}
                </DialogTitle>
                <DialogDescription className="text-white/60">by {selectedBundle.author}</DialogDescription>
              </DialogHeader>
              
              <ScrollArea className="max-h-[50vh] pr-4">
                {selectedBundle.description && <div className="text-white/80 my-2">{selectedBundle.description}</div>}
                
                <div className="bg-white/5 rounded-lg p-4 mb-4 border border-white/10 mt-2">
                  <h3 className="text-sm text-white/50 mb-3 font-medium">Animations</h3>
                  <ScrollArea className="w-full whitespace-nowrap pb-4" orientation="horizontal">
                    <div className="flex w-max space-x-4">
                      {Object.keys(selectedBundle.imageUrls || {}).map(state => (
                        <div key={state} className="text-center w-20">
                          <div className="bg-black/40 rounded-lg p-2 mb-2 border border-white/5">
                            <img src={selectedBundle.imageUrls[state]} alt={state} className="w-16 h-16 object-contain" />
                          </div>
                          <div className="text-[0.65rem] text-white/50 capitalize truncate">{state.replace(/-/g, ' ')}</div>
                        </div>
                      ))}
                      {(!selectedBundle.imageUrls || Object.keys(selectedBundle.imageUrls).length === 0) && (
                        <div className="text-white/40 italic text-sm">No animations included.</div>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                <div className="bg-white/5 rounded-lg p-4 mb-4 border border-white/10">
                  <h3 className="text-sm text-white/50 mb-3 font-medium">Configuration Profile</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-white/50 mb-1">Character Name</div>
                      <div className="bg-black/40 p-2 rounded text-sm truncate">{selectedBundle.characterName || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/50 mb-1">Theme Color</div>
                      <div className="flex items-center gap-2 bg-black/40 p-2 rounded text-sm truncate">
                        <div className="w-4 h-4 rounded-full" style={{ background: selectedBundle.themeColor || '#b026ff' }} />
                        {selectedBundle.themeColor || 'N/A'}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-white/50 mb-1">Tooltips</div>
                      <div className="bg-black/40 p-2 rounded text-sm">{selectedBundle.characterTips || 'N/A'}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-white/50 mb-1">Personality Prompt</div>
                      <div className="h-24 bg-black/40 p-2 rounded text-sm whitespace-pre-wrap overflow-y-auto">
                        {selectedBundle.personalityPrompt || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
                {!selectedBundle.isCloud && window.electronAPI.deleteBundle && (
                  <Button
                    variant="destructive"
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
                  >
                    Delete Bundle
                  </Button>
                )}
                <Button
                  className="flex-1"
                  disabled={downloadingBundles[selectedBundle.id]}
                  onClick={async () => {
                    setDownloadingBundles(prev => ({ ...prev, [selectedBundle.id]: true }));
                    try {
                      const config = await window.electronAPI.installBundle(selectedBundle.id);
                      if (config) {
                        alert('Bundle "' + selectedBundle.name + '" installed!');
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
                >
                  {downloadingBundles[selectedBundle.id] ? 'Downloading...' : 'Install Bundle'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="bg-black/90 text-white border-white/20 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Upload Bundle</DialogTitle>
            <DialogDescription className="text-white/60">Publish your custom avatar set to the community marketplace.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Bundle Name</Label>
              <Input
                value={uploadBundleName}
                onChange={e => setUploadBundleName(e.target.value)}
                className="bg-black/40 border-white/20 text-white"
                placeholder="e.g. Chill Lo-Fi Avatar"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowUploadModal(false)}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={async () => {
              setShowUploadModal(false);
              const result = await window.electronAPI.createBundle(uploadBundleName, 'User', '');
              if (result.success) {
                alert('Bundle "' + uploadBundleName + '" uploaded to marketplace!');
                window.electronAPI.listBundles().then(setMarketplaceBundles);
              } else {
                alert(result.error === 'DUPLICATE_BUNDLE' ? 'This exact avatar set is already bundled. Modify some images first!' : 'Error: ' + result.error);
              }
            }}>
              Upload to Marketplace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
