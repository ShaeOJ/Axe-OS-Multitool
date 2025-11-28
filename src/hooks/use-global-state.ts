import { useState, useEffect, useCallback } from 'react';
import type { MinerConfig, AutoTunerSettings } from '@/lib/types';
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

  const restoreMiners = useCallback((newMiners: MinerConfig[]) => {
    try {
      setMiners(newMiners);
    } catch (error) {
      console.error('Error restoring miners:', error);
      toast({
        variant: "destructive",
        title: "Error restoring miners",
        description: error instanceof Error ? error.message : "Could not restore miners.",
      });
    }
  }, [toast]);

  // Bulk update multiple miners at once
  const bulkUpdateMiners = useCallback((ips: string[], updates: Partial<MinerConfig>) => {
    try {
      setMiners((prevMiners) =>
        prevMiners.map((m) =>
          ips.includes(m.ip) ? { ...m, ...updates } : m
        )
      );
      toast({
        title: "Miners updated",
        description: `Updated ${ips.length} miner(s).`,
      });
    } catch (error) {
      console.error('Error bulk updating miners:', error);
      toast({
        variant: "destructive",
        title: "Error updating miners",
        description: error instanceof Error ? error.message : "Could not update miners.",
      });
    }
  }, [toast]);

  // Bulk update tuner settings
  const bulkUpdateTunerSettings = useCallback((ips: string[], settings: Partial<AutoTunerSettings>) => {
    try {
      setMiners((prevMiners) =>
        prevMiners.map((m) =>
          ips.includes(m.ip)
            ? { ...m, tunerSettings: { ...m.tunerSettings, ...settings } }
            : m
        )
      );
      toast({
        title: "Settings updated",
        description: `Updated settings for ${ips.length} miner(s).`,
      });
    } catch (error) {
      console.error('Error bulk updating tuner settings:', error);
      toast({
        variant: "destructive",
        title: "Error updating settings",
        description: error instanceof Error ? error.message : "Could not update settings.",
      });
    }
  }, [toast]);

  // Assign miners to a group
  const assignMinersToGroup = useCallback((ips: string[], groupId: string | undefined) => {
    try {
      setMiners((prevMiners) =>
        prevMiners.map((m) =>
          ips.includes(m.ip) ? { ...m, groupId } : m
        )
      );
    } catch (error) {
      console.error('Error assigning miners to group:', error);
      toast({
        variant: "destructive",
        title: "Error assigning group",
        description: error instanceof Error ? error.message : "Could not assign group.",
      });
    }
  }, [toast]);

  // Reorder miners (for drag and drop)
  const reorderMiners = useCallback((startIndex: number, endIndex: number) => {
    try {
      setMiners((prevMiners) => {
        const result = Array.from(prevMiners);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        // Update sortOrder for all miners
        return result.map((m, index) => ({ ...m, sortOrder: index }));
      });
    } catch (error) {
      console.error('Error reordering miners:', error);
    }
  }, []);

  return {
    miners,
    addMiner,
    removeMiner,
    updateMiner,
    restoreMiners,
    bulkUpdateMiners,
    bulkUpdateTunerSettings,
    assignMinersToGroup,
    reorderMiners,
  };
};
