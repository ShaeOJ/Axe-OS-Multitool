import type { MinerConfig } from '@/lib/types';
import { defaultTunerSettings } from '@/lib/default-settings';
import fs from 'fs';
import path from 'path';

interface AppState {
  miners: MinerConfig[];
}

const MINERS_FILE = path.join(process.cwd(), 'miners.json');

const loadMiners = (): MinerConfig[] => {
  try {
    if (fs.existsSync(MINERS_FILE)) {
      const data = fs.readFileSync(MINERS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading miners from file:', error);
  }
  return [];
};

const saveMiners = (miners: MinerConfig[]) => {
  try {
    fs.writeFileSync(MINERS_FILE, JSON.stringify(miners, null, 2));
  } catch (error) {
    console.error('Error saving miners to file:', error);
  }
};

const state: AppState = {
  miners: loadMiners(),
};

export const getMiners = () => state.miners;

export const addMiner = (miner: Omit<MinerConfig, 'tunerSettings'>) => {
  if (!state.miners.find(m => m.ip === miner.ip)) {
    state.miners.push({ ...miner, tunerSettings: defaultTunerSettings });
    saveMiners(state.miners);
  }
};

export const removeMiner = (ip: string) => {
  state.miners = state.miners.filter(m => m.ip !== ip);
  saveMiners(state.miners);
};

export const updateMiner = (miner: MinerConfig) => {
  const index = state.miners.findIndex(m => m.ip === miner.ip);
  if (index !== -1) {
    state.miners[index] = { ...state.miners[index], ...miner };
    saveMiners(state.miners);
  }
};
