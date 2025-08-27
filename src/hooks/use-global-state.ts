import { useState, useEffect, useCallback } from 'react';
import type { MinerConfig } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export const useGlobalState = () => {
  const { toast } = useToast();
  const [miners, setMiners] = useState<MinerConfig[]>([]);

  const fetchState = useCallback(async () => {
    try {
      const response = await fetch('/api/state');
      const data = await response.json();
      setMiners(data.miners);
    } catch (error) {
      console.error('Error fetching state:', error);
      toast({
        variant: "destructive",
        title: "Error fetching state",
        description: "Could not fetch miner state from the server.",
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [fetchState]);

  const addMiner = async (miner: Omit<MinerConfig, 'tunerSettings'>) => {
    try {
      await fetch(`/api/miners/${miner.ip}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(miner),
      });
      fetchState();
    } catch (error) {
      console.error('Error adding miner:', error);
    }
  };

  const removeMiner = async (ip: string) => {
    try {
      await fetch(`/api/miners/${ip}`, {
        method: 'DELETE',
      });
      fetchState();
    } catch (error) {
      console.error('Error removing miner:', error);
    }
  };

  const updateMiner = async (miner: Partial<MinerConfig> & { ip: string }) => {
    try {
      await fetch(`/api/miners/${miner.ip}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(miner),
      });
      fetchState();
    } catch (error) {
      console.error('Error updating miner:', error);
    }
  };

  return { miners, addMiner, removeMiner, updateMiner };
};
