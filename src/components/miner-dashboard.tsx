

'use client';

import { useGlobalState } from '@/hooks/use-global-state';
import { AddMinerDialog } from '@/components/add-miner-dialog';
import { MinerCard } from '@/components/miner-card';
import { GlobalStats } from '@/components/global-stats';
import { Axe, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, useCallback, useRef } from 'react';
import type { MinerState, MinerInfo, MinerConfig } from '@/lib/types';
import { ThemeSwitcher } from './theme-switcher';
import { GlitchText } from './glitch-text';
import { useIsMobile } from '@/hooks/use-mobile';

const FETCH_INTERVAL = 15000; // 15 seconds
const MAX_HISTORY_LENGTH = 360; // Keep 90 minutes of history (360 * 15s)

export function MinerDashboard() {
  const { miners, addMiner, removeMiner, updateMiner } = useGlobalState();
  const [isMounted, setIsMounted] = useState(false);
  const [removingMiners, setRemovingMiners] = useState<string[]>([]);
  const { toast } = useToast();
  const [minerStates, setMinerStates] = useState<Record<string, MinerState>>({});
  const prevMinerStates = useRef<Record<string, MinerState>>({});
  const isMobile = useIsMobile();
  const [isAddMinerDialogOpen, setIsAddMinerDialogOpen] = useState(false);

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

        // It seems the voltage is reported in V, not mV. Let's convert it.
        if (info.coreVoltage && info.coreVoltage < 100) { // Heuristic: if value is small, it's in V.
            info.coreVoltage = parseFloat((info.coreVoltage * 1000).toFixed(0));
        }

        const hashrateInGhs = info.hashRate ? info.hashRate : 0;
        const infoInGhs = { ...info, hashRate: hashrateInGhs };

        setMinerStates(prev => {
          const existingState = prev[ip] || { history: [] };
          const newHistory = [...(existingState.history || []), {
            time: Date.now(),
            hashrate: hashrateInGhs,
            temperature: info.temp ?? 0,
            voltage: info.coreVoltage,
            power: info.power,
            frequency: info.frequency,
          }].slice(-MAX_HISTORY_LENGTH);

          return {
            ...prev,
            [ip]: {
              loading: false,
              error: null,
              info: infoInGhs,
              history: newHistory,
            },
          };
        });

    } catch (error: any) {
        setMinerStates(prev => ({
          ...prev,
          [ip]: {
            ...prev[ip],
            loading: false,
            error: error.message || `Failed to fetch data from miner ${ip}.`,
          },
        }));
    }
  }, []);

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
    addMiner(minerConfig);
  };

  const handleRemoveMiner = (ip: string) => {
    setRemovingMiners(prev => [...prev, ip]);
    removeMiner(ip);
    setRemovingMiners(prev => prev.filter(id => id !== ip));
  };

  const DesktopHeader = () => (
    <header className="sticky top-0 z-10 w-full border-b-2 border-primary bg-transparent mb-6 relative">
      <div className="container flex h-16 items-center">
        <div className="flex items-center gap-2">
          <Axe className="h-6 w-6 text-primary" />
          <h1 className="text-2d font-bold tracking-tight">
            <GlitchText probability={0.2}>AxeOS Live!</GlitchText>
          </h1>
        </div>
        <div className="flex-grow flex justify-center">
           {isMounted && <GlobalStats minerStates={minerStates} miners={miners} />}
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button onClick={() => setIsAddMinerDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Miner
          </Button>
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );

  const MobileHeader = () => (
    <header className="sticky top-0 z-10 w-full border-b-2 border-primary bg-transparent mb-6 relative">
      <div className="container flex flex-col items-center py-2">
        <div className="flex justify-between w-full mb-2">
          <div className="flex items-center gap-2">
            <Axe className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-bold tracking-tight">
              <GlitchText probability={0.2}>AxeOS Live!</GlitchText>
            </h1>
          </div>
          <ThemeSwitcher />
        </div>
        <div className="w-full mb-2">
          {isMounted && <GlobalStats minerStates={minerStates} miners={miners} />}
        </div>
        <Button className="w-full" onClick={() => setIsAddMinerDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Miner
        </Button>
      </div>
    </header>
  );

  return (
    <div className="container py-8 w-full">
      <AddMinerDialog onAddMiner={handleAddMiner} isOpen={isAddMinerDialogOpen} onOpenChange={setIsAddMinerDialogOpen}>
        <></>
      </AddMinerDialog>
      {isMounted && (isMobile ? <MobileHeader /> : <DesktopHeader />)}

      {isMounted && miners.length > 0 ? (
        <div className="grid justify-center gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 items-start">
          {miners.map((minerConfig) => (
              <MinerCard
                key={minerConfig.ip}
                minerConfig={minerConfig}
                onRemove={handleRemoveMiner}
                isRemoving={removingMiners.includes(minerConfig.ip)}
                state={minerStates[minerConfig.ip] || { loading: true, error: null, info: null, history: [] }}
                updateMiner={updateMiner}
              />
            ))}
        </div>
      ) : isMounted && (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)] text-center rounded-lg border-2 border-dashed p-8">
          <Axe className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No Miners Configured</h2>
          <p className="text-muted-foreground mb-4">Click "Add Miner" to start monitoring your devices.</p>
          <Button onClick={() => setIsAddMinerDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Miner
          </Button>
        </div>
      )}
    </div>
  );
}

    
