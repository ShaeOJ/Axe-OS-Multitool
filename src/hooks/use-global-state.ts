import { useState, useEffect, useCallback } from 'react';
import type { MinerConfig } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { defaultTunerSettings } from '@/lib/default-settings';

const STORAGE_KEY = 'axeos-live-miners';

// Local storage helper functions
const loadMinersFromStorage = (): MinerConfig[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading miners from storage:', error);
    return [];
  }
};

const saveMinersToStorage = (miners: MinerConfig[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(miners));
  } catch (error) {
    console.error('Error saving miners to storage:', error);
  }
};

export const useGlobalState = () => {
  const { toast } = useToast();
  const [miners, setMiners] = useState<MinerConfig[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize state from localStorage on mount
  useEffect(() => {
    const loadedMiners = loadMinersFromStorage();
    setMiners(loadedMiners);
    setIsInitialized(true);
  }, []);

  // Save to localStorage whenever miners change (after initialization)
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
