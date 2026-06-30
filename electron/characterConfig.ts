import { app } from 'electron';
import * as fs from 'node:fs';
import { join } from 'node:path';

export interface CharacterConfig {
  characterName: string;
  characterTips: string;
  personalityPrompt: string;
  themeColor: string;
}

const DEFAULT_CONFIG: CharacterConfig = {
  characterName: 'Raiden Shogun',
  characterTips: 'from Genshin Impact',
  personalityPrompt: 'You are a specialized, evolving system AI. Your personality is sleek, helpful, and tech-savvy.',
  themeColor: '#b026ff'
};

function getConfigPath() {
  return join(app.getPath('userData'), 'character_config.json');
}

export function getCharacterConfig(): CharacterConfig {
  const configPath = getConfigPath();
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(data) as Partial<CharacterConfig>;
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch (err) {
    console.error('Failed to read character config', err);
  }
  return { ...DEFAULT_CONFIG };
}

export function saveCharacterConfig(config: CharacterConfig): void {
  const configPath = getConfigPath();
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (err) {
    console.error('Failed to save character config', err);
  }
}
