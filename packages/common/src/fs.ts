import fs from 'node:fs';
import path from 'node:path';

import { merge } from 'es-toolkit';

import { SHARED_DATA_PATH } from './constants';
import type { Settings } from './types';

export function getSharedDataPath(basePath: string) {
  return path.join(basePath, SHARED_DATA_PATH);
}

export function ensureSharedDataPath(basePath: string) {
  const sharedDataPath = getSharedDataPath(basePath);

  if (!fs.existsSync(sharedDataPath)) {
    fs.mkdirSync(sharedDataPath, { recursive: true });
  }

  return sharedDataPath;
}

export function getSettingsPath(basePath: string) {
  return path.join(getSharedDataPath(basePath), 'settings.json');
}

export function loadSettings(basePath: string) {
  const settingsPath = getSettingsPath(basePath);
  if (!fs.existsSync(settingsPath)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(settingsPath, 'utf-8')) as Settings;
}

export function saveSettings(basePath: string, settings: Partial<Settings>) {
  const existingSettings = loadSettings(basePath);
  const newSettings = merge(existingSettings, settings);
  fs.writeFileSync(getSettingsPath(basePath), JSON.stringify(newSettings, null, 2));
}

export function getCachePath(basePath: string) {
  return path.join(getSharedDataPath(basePath), 'cache');
}

export function resetCache(basePath: string) {
  fs.rmSync(getCachePath(basePath), { recursive: true, force: true });
}
