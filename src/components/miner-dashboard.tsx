'use client';

import { useGlobalState } from '@/hooks/use-global-state';
import { AddMinerDialog } from '@/components/add-miner-dialog';
import { MinerCard } from '@/components/miner-card';
import { GlobalStats } from '@/components/global-stats';
import { Axe, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import type { MinerState, MinerInfo, MinerConfig, MinerGroup } from '@/lib/types';
import { ThemeSwitcher } from './theme-switcher';
import { GlitchText } from './glitch-text';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  getMinerData,
  restartMiner,
  openAnalyticsWindow,
  sendAnalyticsData,
  listenForAnalyticsRequests,
  sendToolsData,
  listenForToolsRequests,
  listenForRestoreBackup,
} from '@/lib/tauri-api';
import { getExpectedHashrate } from '@/lib/device-specs';
import { ToolsMenu } from '@/components/tools-menu';
import { useAppSettings } from '@/hooks/use-app-settings';
import { useAlertMonitor } from '@/hooks/use-alert-monitor';
import { useDashboardSettings } from '@/hooks/use-dashboard-settings';
import { BulkActionsBar } from '@/components/bulk-actions-bar';
import { DashboardControls } from '@/components/dashboard-controls';
import { GroupManager, GroupBadge } from '@/components/group-manager';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { BarChart3 } from 'lucide-react';
import { useMinerHistory } from '@/hooks/use-miner-history';
import { requestNotificationPermission } from '@/lib/tauri-api';

const FETCH_INTERVAL = 15000; // 15 seconds
const MAX_HISTORY_LENGTH = 1440; // Keep 6 hours of history in memory (1440 * 15s)

export function MinerDashboard() {
  const {
    miners,
    addMiner,
    removeMiner,
    updateMiner,
    restoreMiners,
    bulkUpdateTunerSettings,
    assignMinersToGroup,
    reorderMiners,
  } = useGlobalState();
  const [isMounted, setIsMounted] = useState(false);
  const [removingMiners, setRemovingMiners] = useState<string[]>([]);
  const { toast } = useToast();
  const [minerStates, setMinerStates] = useState<Record<string, MinerState>>({});
  const prevMinerStates = useRef<Record<string, MinerState>>({});
  const isMobile = useIsMobile();
  const [isAddMinerDialogOpen, setIsAddMinerDialogOpen] = useState(false);

  // Selection mode for bulk actions
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMiners, setSelectedMiners] = useState<string[]>([]);

  // App settings (alerts, power tracking)
  const {
    alertSettings,
    powerSettings,
    updateAlertSettings,
    updatePowerSettings,
    resetToDefaults,
  } = useAppSettings();

  // Dashboard settings (groups, layout)
  const {
    groups,
    addGroup,
    updateGroup,
    deleteGroup,
    toggleGroupCollapsed,
    layout,
    updateLayout,
  } = useDashboardSettings();

  // Alert monitoring
  useAlertMonitor(miners, minerStates, alertSettings);

  // Database history persistence
  const minerIps = useMemo(() => miners.map(m => m.ip), [miners]);
  const { loadHistoricalData, saveHistory, clearMinerHistory } = useMinerHistory(minerIps, {
    hoursToLoad: 6, // Load 6 hours of history on startup
    daysToKeep: 7,  // Keep 7 days in database
  });
  const historyLoadedRef = useRef(false);

  useEffect(() => {
    prevMinerStates.current = minerStates;
  });

  useEffect(() => {
    setIsMounted(true);
    // Request notification permission on app start
    requestNotificationPermission();
  }, []);

  // Load historical data from database on startup
  useEffect(() => {
    if (historyLoadedRef.current || miners.length === 0) return;

    const loadHistory = async () => {
      const historicalData = await loadHistoricalData();

      if (Object.keys(historicalData).length > 0) {
        setMinerStates(prev => {
          const updated = { ...prev };
          for (const [ip, history] of Object.entries(historicalData)) {
            if (history.length > 0) {
              updated[ip] = {
                ...updated[ip],
                loading: updated[ip]?.loading ?? true,
                error: updated[ip]?.error ?? null,
                info: updated[ip]?.info ?? null,
                history: history,
              };
            }
          }
          return updated;
        });
        console.log('[Dashboard] Loaded historical data for', Object.keys(historicalData).length, 'miners');
      }

      historyLoadedRef.current = true;
    };

    loadHistory();
  }, [miners.length, loadHistoricalData]);

  // Analytics window communication
  const handleOpenAnalytics = useCallback(async () => {
    await openAnalyticsWindow();
    // Send initial data
    await sendAnalyticsData({
      miners,
      minerStates,
      electricityRate: powerSettings?.electricityRate || 0.10,
    });
  }, [miners, minerStates, powerSettings?.electricityRate]);

  // Listen for analytics data requests and send updates
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      unlisten = await listenForAnalyticsRequests(async () => {
        await sendAnalyticsData({
          miners,
          minerStates,
          electricityRate: powerSettings?.electricityRate || 0.10,
        });
      });
    };

    setupListener();

    return () => {
      unlisten?.();
    };
  }, [miners, minerStates, powerSettings?.electricityRate]);

  // Listen for tools window data requests and send updates
  useEffect(() => {
    let unlistenRequest: (() => void) | undefined;
    let unlistenRestore: (() => void) | undefined;

    const setupListeners = async () => {
      unlistenRequest = await listenForToolsRequests(async () => {
        await sendToolsData({
          miners,
          minerStates,
        });
      });

      unlistenRestore = await listenForRestoreBackup((restoredMiners) => {
        restoreMiners(restoredMiners);
      });
    };

    setupListeners();

    return () => {
      unlistenRequest?.();
      unlistenRestore?.();
    };
  }, [miners, minerStates, restoreMiners]);

  const fetchMinerData = useCallback(async (ip: string) => {
    try {
      const info: MinerInfo = await getMinerData(ip);

      // It seems the voltage is reported in V, not mV. Let's convert it.
      if (info.coreVoltage && info.coreVoltage < 100) {
        info.coreVoltage = parseFloat((info.coreVoltage * 1000).toFixed(0));
      }

      // If device doesn't report expectedHashrate, try to estimate from device specs
      if (!info.expectedHashrate && info.ASICModel) {
        const estimatedHashrate = getExpectedHashrate(info.ASICModel);
        if (estimatedHashrate) {
          info.estimatedExpectedHashrate = estimatedHashrate;
          info.isEstimatedHashrate = true;
        }
      }

      const hashrateInGhs = info.hashRate ? info.hashRate : 0;
      // Include all properties from info, including estimatedExpectedHashrate
      const infoInGhs: MinerInfo = {
        ...info,
        hashRate: hashrateInGhs,
        estimatedExpectedHashrate: info.estimatedExpectedHashrate,
        isEstimatedHashrate: info.isEstimatedHashrate,
      };

      // Create the data point
      const dataPoint = {
        time: Date.now(),
        hashrate: hashrateInGhs,
        temperature: info.temp ?? 0,
        voltage: info.coreVoltage,
        power: info.power,
        frequency: info.frequency,
      };

      // Save to database (async, don't await)
      saveHistory(ip, dataPoint);

      setMinerStates(prev => {
        const existingState = prev[ip] || { history: [] };
        const newHistory = [...(existingState.history || []), dataPoint].slice(-MAX_HISTORY_LENGTH);

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
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to fetch data from miner ${ip}.`;
      setMinerStates(prev => ({
        ...prev,
        [ip]: {
          ...prev[ip],
          loading: false,
          error: message,
        },
      }));
    }
  }, [saveHistory]);

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
      } else if (currentState.error && prevState.error !== currentState.error) {
        toast({
          variant: 'destructive',
          title: `Error with miner ${minerName}`,
          description: currentState.error,
        });
      }
    });
  }, [minerStates, toast, miners]);

  const handleAddMiner = (minerConfig: Omit<MinerConfig, 'tunerSettings'>) => {
    if (miners.some(m => m.ip === minerConfig.ip)) {
      toast({
        variant: "default",
        title: "Miner Already Exists",
        description: `The miner with IP address ${minerConfig.ip} is already in your list.`,
      });
      return;
    }
    addMiner(minerConfig);
  };

  // Handle adding discovered miners from network scan (with color customization)
  const handleAddDiscoveredMiners = (discoveredMiners: { ip: string; name: string; accentColor: string }[]) => {
    if (!discoveredMiners || discoveredMiners.length === 0) {
      return;
    }

    let addedCount = 0;
    for (const miner of discoveredMiners) {
      if (!miner?.ip) continue;
      if (!miners.some(m => m.ip === miner.ip)) {
        addMiner({
          ip: miner.ip,
          name: miner.name || miner.ip,
          accentColor: miner.accentColor || 'hsl(var(--miner-green))'
        });
        addedCount++;
      }
    }

    if (addedCount > 0) {
      toast({
        title: `Added ${addedCount} miner(s)`,
        description: 'Miners have been added to your dashboard.',
      });
    }
  };

  const handleRemoveMiner = (ip: string) => {
    setRemovingMiners(prev => [...prev, ip]);
    removeMiner(ip);
    // Clear history from database when miner is removed
    clearMinerHistory(ip);
    setRemovingMiners(prev => prev.filter(id => id !== ip));
  };

  // Selection handlers
  const toggleSelection = (ip: string) => {
    setSelectedMiners(prev =>
      prev.includes(ip) ? prev.filter(i => i !== ip) : [...prev, ip]
    );
  };

  const selectAll = () => {
    setSelectedMiners(miners.map(m => m.ip));
  };

  const deselectAll = () => {
    setSelectedMiners([]);
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedMiners([]);
  };

  // Bulk actions
  const handleBulkRestartMiners = async (ips: string[]) => {
    for (const ip of ips) {
      try {
        await restartMiner(ip);
      } catch (error) {
        console.error(`Failed to restart miner ${ip}:`, error);
      }
    }
    toast({
      title: 'Restart initiated',
      description: `Sent restart command to ${ips.length} miner(s).`,
    });
    exitSelectionMode();
  };

  // Sort and filter miners
  const sortedMiners = useMemo(() => {
    let filtered = [...miners];

    // Filter offline miners if needed
    if (!layout.showOfflineMiners) {
      filtered = filtered.filter(m => {
        const state = minerStates[m.ip];
        return state?.info && !state.error;
      });
    }

    // Sort miners
    filtered.sort((a, b) => {
      const stateA = minerStates[a.ip];
      const stateB = minerStates[b.ip];

      let valueA: number | string = 0;
      let valueB: number | string = 0;

      switch (layout.sortBy) {
        case 'name':
          valueA = (a.name || a.ip).toLowerCase();
          valueB = (b.name || b.ip).toLowerCase();
          break;
        case 'hashrate':
          valueA = stateA?.info?.hashRate || 0;
          valueB = stateB?.info?.hashRate || 0;
          break;
        case 'temperature':
          valueA = stateA?.info?.temp || 0;
          valueB = stateB?.info?.temp || 0;
          break;
        case 'power':
          valueA = stateA?.info?.power || 0;
          valueB = stateB?.info?.power || 0;
          break;
        case 'custom':
          valueA = a.sortOrder ?? 999;
          valueB = b.sortOrder ?? 999;
          break;
      }

      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return layout.sortDirection === 'asc'
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }

      return layout.sortDirection === 'asc'
        ? (valueA as number) - (valueB as number)
        : (valueB as number) - (valueA as number);
    });

    return filtered;
  }, [miners, minerStates, layout.showOfflineMiners, layout.sortBy, layout.sortDirection]);

  // Group miners if needed
  const groupedMiners = useMemo(() => {
    if (layout.groupBy === 'none') {
      return { ungrouped: sortedMiners };
    }

    if (layout.groupBy === 'group') {
      const grouped: Record<string, MinerConfig[]> = { ungrouped: [] };
      groups.forEach(g => {
        grouped[g.id] = [];
      });

      sortedMiners.forEach(m => {
        if (m.groupId && grouped[m.groupId]) {
          grouped[m.groupId].push(m);
        } else {
          grouped.ungrouped.push(m);
        }
      });

      return grouped;
    }

    if (layout.groupBy === 'status') {
      const online: MinerConfig[] = [];
      const offline: MinerConfig[] = [];

      sortedMiners.forEach(m => {
        const state = minerStates[m.ip];
        if (state?.error || !state?.info) {
          offline.push(m);
        } else {
          online.push(m);
        }
      });

      return { online, offline };
    }

    return { ungrouped: sortedMiners };
  }, [sortedMiners, layout.groupBy, groups, minerStates]);

  // Card size class
  const cardSizeClass = useMemo(() => {
    switch (layout.cardSize) {
      case 'compact':
        return 'sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4';
      case 'expanded':
        return 'sm:grid-cols-1 lg:grid-cols-1 xl:grid-cols-2';
      default:
        return 'sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3';
    }
  }, [layout.cardSize]);

  const getGroupById = (id: string): MinerGroup | undefined => {
    return groups.find(g => g.id === id);
  };

  const DesktopHeader = () => (
    <header className="sticky top-0 z-10 w-full border-b-2 border-primary bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mb-6 relative">
      <div className="container flex h-16 items-center px-4 md:px-6 lg:px-8">
        {/* Left section: Logo and action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Axe className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold tracking-tight hidden sm:block">
            <GlitchText probability={0.2}>Live!</GlitchText>
          </h1>
        </div>
        <div className="flex items-center gap-2 ml-2 md:ml-4 shrink-0">
          <Button size="sm" onClick={() => setIsAddMinerDialogOpen(true)}>
            <Plus className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Add Miner</span>
          </Button>
        </div>
        {/* Center section: Global Stats */}
        <div className="flex-grow flex justify-center min-w-0 px-2">
          {isMounted && <GlobalStats minerStates={minerStates} miners={miners} powerSettings={powerSettings} />}
        </div>
        {/* Right section: Analytics, Settings, Theme */}
        <div className="flex items-center justify-end gap-1 md:gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleOpenAnalytics}>
            <BarChart3 className="h-4 w-4 md:mr-2" />
            <span className="hidden lg:inline">Analytics</span>
          </Button>
          <ToolsMenu />
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );

  const MobileHeader = () => (
    <header className="sticky top-0 z-10 w-full border-b-2 border-primary bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mb-6 relative">
      <div className="container flex flex-col items-center px-4 py-3">
        <div className="flex justify-between w-full mb-2">
          <div className="flex items-center gap-2">
            <Axe className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-bold tracking-tight">
              <GlitchText probability={0.2}>Live!</GlitchText>
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={handleOpenAnalytics}>
              <BarChart3 className="h-4 w-4" />
            </Button>
            <ToolsMenu />
            <ThemeSwitcher />
          </div>
        </div>
        <div className="w-full mb-2">
          {isMounted && <GlobalStats minerStates={minerStates} miners={miners} powerSettings={powerSettings} />}
        </div>
        <div className="flex w-full">
          <Button className="flex-1" size="sm" onClick={() => setIsAddMinerDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Miner
          </Button>
        </div>
      </div>
    </header>
  );

  const renderMinerCard = (minerConfig: MinerConfig) => (
    <div key={minerConfig.ip} className="relative">
      {selectionMode && (
        <div
          className="absolute top-2 left-2 z-20 cursor-pointer"
          onClick={() => toggleSelection(minerConfig.ip)}
        >
          <Checkbox
            checked={selectedMiners.includes(minerConfig.ip)}
            className="h-5 w-5 bg-background"
          />
        </div>
      )}
      <div
        className={cn(
          selectionMode && 'cursor-pointer',
          selectionMode && selectedMiners.includes(minerConfig.ip) && 'ring-2 ring-primary rounded-lg'
        )}
        onClick={selectionMode ? () => toggleSelection(minerConfig.ip) : undefined}
      >
        <MinerCard
          minerConfig={minerConfig}
          onRemove={handleRemoveMiner}
          isRemoving={removingMiners.includes(minerConfig.ip)}
          state={minerStates[minerConfig.ip] || { loading: true, error: null, info: null, history: [] }}
          updateMiner={updateMiner}
          powerSettings={powerSettings}
          cardSize={layout.cardSize}
          group={getGroupById(minerConfig.groupId || '')}
        />
      </div>
    </div>
  );

  const renderGroupSection = (groupId: string, groupMiners: MinerConfig[]) => {
    if (groupMiners.length === 0) return null;

    const group = getGroupById(groupId);
    const isCollapsed = group?.collapsed;

    if (groupId === 'ungrouped') {
      return (
        <div key="ungrouped" className={cn("grid justify-center gap-6", cardSizeClass, "items-start")}>
          {groupMiners.map(renderMinerCard)}
        </div>
      );
    }

    if (groupId === 'online' || groupId === 'offline') {
      return (
        <div key={groupId} className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <div className={cn(
              "w-3 h-3 rounded-full",
              groupId === 'online' ? "bg-green-500" : "bg-red-500"
            )} />
            {groupId === 'online' ? 'Online' : 'Offline'} ({groupMiners.length})
          </h3>
          <div className={cn("grid justify-center gap-6", cardSizeClass, "items-start")}>
            {groupMiners.map(renderMinerCard)}
          </div>
        </div>
      );
    }

    return (
      <div key={groupId} className="space-y-4">
        <button
          className="flex items-center gap-2 text-lg font-semibold hover:opacity-80"
          onClick={() => toggleGroupCollapsed(groupId)}
        >
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: group?.color }}
          />
          {group?.name || 'Unknown Group'} ({groupMiners.length})
          <span className="text-muted-foreground text-sm">
            {isCollapsed ? '▶' : '▼'}
          </span>
        </button>
        {!isCollapsed && (
          <div className={cn("grid justify-center gap-6", cardSizeClass, "items-start")}>
            {groupMiners.map(renderMinerCard)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container py-8 w-full">
      <AddMinerDialog
        onAddMiner={handleAddMiner}
        onAddMiners={handleAddDiscoveredMiners}
        existingMinerIps={miners.map(m => m.ip)}
        isOpen={isAddMinerDialogOpen}
        onOpenChange={setIsAddMinerDialogOpen}
      />
      {isMounted && (isMobile ? <MobileHeader /> : <DesktopHeader />)}

      {isMounted && miners.length > 0 ? (
        <div className="space-y-6">
          {/* Dashboard Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <DashboardControls
              layout={layout}
              onUpdateLayout={updateLayout}
              selectionMode={selectionMode}
              onToggleSelectionMode={() => setSelectionMode(!selectionMode)}
              selectedCount={selectedMiners.length}
            />
            <GroupManager
              groups={groups}
              miners={miners}
              onAddGroup={addGroup}
              onUpdateGroup={updateGroup}
              onDeleteGroup={deleteGroup}
              onAssignMinerToGroup={(ip, groupId) => assignMinersToGroup([ip], groupId)}
            />
          </div>

          {/* Miner Cards */}
          {layout.groupBy === 'none' ? (
            <div className={cn("grid justify-center gap-6", cardSizeClass, "items-start")}>
              {sortedMiners.map(renderMinerCard)}
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedMiners).map(([groupId, groupMiners]) =>
                renderGroupSection(groupId, groupMiners)
              )}
            </div>
          )}
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

      {/* Bulk Actions Bar */}
      {selectionMode && (
        <BulkActionsBar
          selectedMiners={selectedMiners}
          miners={miners}
          groups={groups}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
          onApplySettings={bulkUpdateTunerSettings}
          onAssignGroup={assignMinersToGroup}
          onRestartMiners={handleBulkRestartMiners}
          onClose={exitSelectionMode}
        />
      )}
    </div>
  );
}
