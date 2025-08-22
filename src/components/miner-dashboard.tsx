

'use client';

import { useLocalStorage } from '@/hooks/use-local-storage';
import { AddMinerDialog } from '@/components/add-miner-dialog';
import { MinerCard } from '@/components/miner-card';
import { GlobalStats } from '@/components/global-stats';
import { Axe, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, useCallback, useRef } from 'react';
import type { MinerState, MinerInfo, MinerDataPoint, MinerConfig } from '@/lib/types';
import { ThemeSwitcher } from './theme-switcher';
import { GlitchText } from './glitch-text';


const ANIMATION_DURATION = 700; // Must match CSS animation duration
const FETCH_INTERVAL = 15000; // 15 seconds
const MAX_HISTORY_LENGTH = 360; // Keep 90 minutes of history (360 * 15s)

export function MinerDashboard() {
  const [miners, setMiners] = useLocalStorage<MinerConfig[]>('miners', []);
  
  const [isMounted, setIsMounted] = useState(false);
  const [removingMiners, setRemovingMiners] = useState<string[]>([]);
  const { toast } = useToast();
  const [minerStates, setMinerStates] = useState<Record<string, MinerState>>({});
  const prevMinerStates = useRef<Record<string, MinerState>>({});

  useEffect(() => {
    prevMinerStates.current = minerStates;
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchMinerData = useCallback(async (ip: string) => {
    const url = `/api/miner/${ip}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Proxy returned status ${response.status}`);
        }

        const info: MinerInfo = await response.json();
        
        // The API provides the hashrate in GH/s (Gigahashes per second).
        const hashrateInGhs = info.hashRate ? info.hashRate : 0;
        const infoInGhs = { ...info, hashRate: hashrateInGhs };



        

        // Read current state from localStorage to preserve history
        const existingStateJson = localStorage.getItem(`minerState_${ip}`);
        const existingState: MinerState = existingStateJson ? JSON.parse(existingStateJson) : { history: [] };

        const updatedMinerState: MinerState = {
            loading: false,
            error: null,
            info: infoInGhs,
            history: [...(existingState.history || []), {
                time: Date.now(),
                hashrate: hashrateInGhs, 
                temperature: info.temp ?? 0,
                voltage: info.coreVoltage ? info.coreVoltage / 10 : 0, // Assuming coreVoltage is in tenths of mV
                power: info.power,
                frequency: info.frequency,
            }].slice(-MAX_HISTORY_LENGTH),
        };

        localStorage.setItem(`minerState_${ip}`, JSON.stringify(updatedMinerState));
        
        // Dispatch a custom event to notify MinerDashboard of the update
        window.dispatchEvent(new CustomEvent('minerStateUpdated', { detail: { ip, state: updatedMinerState } }));

    } catch (error: any) {
        const existingStateJson = localStorage.getItem(`minerState_${ip}`);
        const existingState: MinerState = existingStateJson ? JSON.parse(existingStateJson) : { history: [] };

        const updatedMinerState: MinerState = {
            ...existingState,
            loading: false,
            error: error.message || `Failed to fetch data from miner ${ip}.`,
        };
        localStorage.setItem(`minerState_${ip}`, JSON.stringify(updatedMinerState));
        window.dispatchEvent(new CustomEvent('minerStateUpdated', { detail: { ip, state: updatedMinerState } }));
    }
  }, []);

  useEffect(() => {
    const loadInitialMinerStates = () => {
      const initialStates: Record<string, MinerState> = {};
      miners.forEach(m => {
        const storedState = localStorage.getItem(`minerState_${m.ip}`);
        if (storedState) {
          initialStates[m.ip] = JSON.parse(storedState);
        } else {
          initialStates[m.ip] = { loading: true, error: null, info: null, history: [] };
        }
      });
      setMinerStates(initialStates);
    };

    const handleMinerStateUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ ip: string; state: MinerState }>;
      setMinerStates(prev => ({
        ...prev,
        [customEvent.detail.ip]: customEvent.detail.state,
      }));
    };

    loadInitialMinerStates();
    window.addEventListener('minerStateUpdated', handleMinerStateUpdate);

    return () => {
      window.removeEventListener('minerStateUpdated', handleMinerStateUpdate);
    };
  }, [miners]); // Depend on miners to re-load states if miners array changes

  // Fetch data for all miners at regular intervals
  useEffect(() => {
    if (miners.length === 0) return;

    miners.forEach(m => {
        fetchMinerData(m.ip);
    });

    const intervalId = setInterval(() => {
        miners.forEach(m => {
            fetchMinerData(m.ip);
        });
    }, FETCH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [miners, fetchMinerData]);


  useEffect(() => {
    Object.keys(minerStates).forEach(ip => {
      const currentState = minerStates[ip];
      const prevState = prevMinerStates.current[ip];

      if (!prevState) return;

      const minerName = miners.find(m => m.ip === ip)?.name || ip;

      if (prevState.error && !currentState.error) {
        toast({
          title: `Miner ${minerName} is back online!`,
          description: 'Successfully reconnected and fetching data.',
        });
      }
      else if (currentState.error && prevState.error !== currentState.error) {
        toast({
          variant: 'destructive',
          title: `Error with miner ${minerName}`,
          description: currentState.error,
        });
      }
    });
  }, [minerStates, toast, miners]);


  const handleAddMiner = (minerConfig: MinerConfig) => {
    if (miners.some(m => m.ip === minerConfig.ip)) {
      toast({
        variant: "default",
        title: "Miner Already Exists",
        description: `The miner with IP address ${minerConfig.ip} is already in your list.`,
      })
      return;
    }
    setMiners([...miners, minerConfig]);
    fetchMinerData(minerConfig.ip);
  };

  const handleRemoveMiner = (ip: string) => {
    setRemovingMiners(prev => [...prev, ip]);
    // Removed setTimeout to make state update immediate
    setMiners(prevMiners => prevMiners.filter((miner) => miner.ip !== ip));
    setRemovingMiners(prev => prev.filter(id => id !== ip));
    localStorage.removeItem(`minerState_${ip}`);
  };

  return (
    <div className="container py-8 w-full">
       <header className="sticky top-0 z-10 w-full border-b-2 border-primary bg-transparent mb-6 relative">
        <div className="container flex h-16 items-center">
          <div className="flex items-center gap-2">
            <Axe className="h-6 w-6 text-primary" />
            <h1 className="text-2d font-bold tracking-tight">
              <GlitchText probability={0.2}>AxeOS Live!</GlitchText>
            </h1>
          </div>
          <div className="flex-grow flex justify-center">
             <GlobalStats minerStates={minerStates} isMounted={isMounted} />
          </div>
          <div className="flex items-center justify-end gap-2">
            <AddMinerDialog onAddMiner={handleAddMiner}>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Miner
              </Button>
            </AddMinerDialog>
            <ThemeSwitcher />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-green-500" />
      </header>

      {isMounted && miners.length > 0 ? (
        <div className="grid justify-center gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 items-start">
          {miners.map((minerConfig) => (
              <MinerCard
                key={minerConfig.ip}
                minerConfig={minerConfig}
                onRemove={handleRemoveMiner}
                isRemoving={removingMiners.includes(minerConfig.ip)}
                state={minerStates[minerConfig.ip] || { loading: true, error: null, info: null, history: [] }}
              />
            ))}
        </div>
      ) : isMounted && (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)] text-center rounded-lg border-2 border-dashed p-8">
          <Axe className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No Miners Configured</h2>
          <p className="text-muted-foreground mb-4">Click "Add Miner" to start monitoring your devices.</p>
          <AddMinerDialog onAddMiner={handleAddMiner}>
            <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Miner
            </Button>
          </AddMinerDialog>
        </div>
      )}
    </div>
  );
}

    
