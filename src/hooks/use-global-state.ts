import { useState, useEffect, useCallback } from 'react';
import type { MinerConfig } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { defaultTunerSettings } from '@/lib/default-settings';
import { Store } from '@tauri-apps/plugin-store';

const STORAGE_KEY = 'axeos-live-miners';

// Check if we're running in Tauri environment
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

// Initialize store instance (will be lazy-loaded)
let store: Store | null = null;

const getStore = async () => {
  if (!isTauri()) return null;
  if (!store) {
    store = await Store.load('miners.json');
  }
  return store;
};

// Storage helper functions that work with both Tauri Store and localStorage
const loadMinersFromStorage = async (): Promise<MinerConfig[]> => {
  if (typeof window === 'undefined') return [];

  try {
    if (isTauri()) {
      const storeInstance = await getStore();
      if (storeInstance) {
        const stored = await storeInstance.get<MinerConfig[]>(STORAGE_KEY);
        return stored ?? [];
      }
    }

    // Fallback to localStorage for development/browser
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading miners from storage:', error);
    return [];
  }
};

const saveMinersToStorage = async (miners: MinerConfig[]): Promise<void> => {
  if (typeof window === 'undefined') return;

  try {
    if (isTauri()) {
      const storeInstance = await getStore();
      if (storeInstance) {
        await storeInstance.set(STORAGE_KEY, miners);
        await storeInstance.save();
        return;
      }
    }

    // Fallback to localStorage for development/browser
    localStorage.setItem(STORAGE_KEY, JSON.stringify(miners));
  } catch (error) {
    console.error('Error saving miners to storage:', error);
  }
};

export const useGlobalState = () => {
  const { toast } = useToast();
  const [miners, setMiners] = useState<MinerConfig[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize state from storage on mount
  useEffect(() => {
    const loadMiners = async () => {
      const loadedMiners = await loadMinersFromStorage();
      setMiners(loadedMiners);
      setIsInitialized(true);
    };

    loadMiners();
  }, []);

  // Save to storage whenever miners change (after initialization)
  useEffect(() => {
    if (isInitialized) {
      saveMinersToStorage(miners);
    }
  }, [miners, isInitialized]);

  const addMiner = useCallback((miner: Omit<MinerConfig, 'tunerSettings'>) => {
    try {
      setMiners((prevMiners) => {
        if (prevMiners.some((m) => m.ip === miner.ip)) {
          return prevMiners; // Already exists
        }
        return [...prevMiners, { ...miner, tunerSettings: defaultTunerSettings }];
      });
    } catch (error) {
      console.error('Error adding miner:', error);
      toast({
        variant: "destructive",
        title: "Error adding miner",
        description: error instanceof Error ? error.message : "Could not add miner.",
      });
    }
  }, [toast]);

  const removeMiner = useCallback((ip: string) => {
    try {
      setMiners((prevMiners) => prevMiners.filter((m) => m.ip !== ip));
    } catch (error) {
      console.error('Error removing miner:', error);
      toast({
        variant: "destructive",
        title: "Error removing miner",
        description: error instanceof Error ? error.message : "Could not remove miner.",
      });
    }
  }, [toast]);

  const updateMiner = useCallback((miner: Partial<MinerConfig> & { ip: string }) => {
    try {
      setMiners((prevMiners) =>
        prevMiners.map((m) =>
          m.ip === miner.ip ? { ...m, ...miner } : m
        )
      );
    } catch (error) {
      console.error('Error updating miner:', error);
      toast({
        variant: "destructive",
        title: "Error updating miner",
        description: error instanceof Error ? error.message : "Could not update miner.",
      });
    }
  }, [toast]);

  return { miners, addMiner, removeMiner, updateMiner };
};
