'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { listen, emit } from '@tauri-apps/api/event';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  GitCompare,
  DollarSign,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AdvancedChart } from '@/components/advanced-chart';
import { MinerComparisonChart } from '@/components/miner-comparison-chart';
import { ProfitabilityDashboard } from '@/components/profitability-dashboard';
import type { MinerConfig, MinerState } from '@/lib/types';

type MetricKey = 'hashrate' | 'temperature' | 'power' | 'voltage' | 'frequency';
type CompareMetric = 'hashrate' | 'temperature' | 'power' | 'efficiency';

interface AnalyticsData {
  miners: MinerConfig[];
  minerStates: Record<string, MinerState>;
  electricityRate: number;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [activeTab, setActiveTab] = useState('profitability');
  const [selectedMinerIp, setSelectedMinerIp] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const initialMinerSetRef = useRef(false);

  // Lifted state for AdvancedChart - persists across data updates
  const [chartVisibleMetrics, setChartVisibleMetrics] = useState<MetricKey[]>(['hashrate', 'temperature']);

  // Lifted state for MinerComparisonChart - persists across data updates
  const [comparisonSelectedMiners, setComparisonSelectedMiners] = useState<string[]>([]);
  const [comparisonMetric, setComparisonMetric] = useState<CompareMetric>('hashrate');
  const comparisonInitializedRef = useRef(false);

  // Request data from main window
  const requestData = useCallback(async () => {
    try {
      await emit('analytics-request-data');
    } catch (error) {
      console.error('Failed to request data:', error);
    }
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let interval: NodeJS.Timeout | undefined;

    const setup = async () => {
      // Listen for data updates from main window
      unlisten = await listen<AnalyticsData>('analytics-data-update', (event) => {
        setData(event.payload);
        setIsConnected(true);

        // Set initial selected miner only once (for Charts tab)
        if (!initialMinerSetRef.current && event.payload.miners.length > 0) {
          setSelectedMinerIp(event.payload.miners[0].ip);
          initialMinerSetRef.current = true;
        }

        // Set initial comparison miners only once (for Compare tab)
        if (!comparisonInitializedRef.current && event.payload.miners.length > 0) {
          const initialMiners = event.payload.miners
            .slice(0, Math.min(3, event.payload.miners.length))
            .map(m => m.ip);
          setComparisonSelectedMiners(initialMiners);
          comparisonInitializedRef.current = true;
        }
      });

      // Request initial data
      await requestData();

      // Set up periodic data requests (every 5 seconds)
      interval = setInterval(requestData, 5000);
    };

    setup();

    return () => {
      unlisten?.();
      if (interval) clearInterval(interval);
    };
  }, [requestData]);


  const selectedMiner = data?.miners.find(m => m.ip === selectedMinerIp);
  const selectedMinerState = selectedMinerIp ? data?.minerStates[selectedMinerIp] : null;

  // Keep track of last valid history to prevent blinking during updates
  const lastValidHistoryRef = useRef<MinerState['history']>([]);
  const lastMinerIpRef = useRef<string>('');

  // Update the ref when we have valid history data
  const currentHistory = selectedMinerState?.history;

  // Clear history cache if we switched miners
  if (selectedMinerIp !== lastMinerIpRef.current) {
    lastMinerIpRef.current = selectedMinerIp;
    lastValidHistoryRef.current = currentHistory || [];
  } else if (currentHistory && currentHistory.length > 0) {
    // Same miner - update cache with new data
    lastValidHistoryRef.current = currentHistory;
  }

  // Use current history if available, otherwise fall back to last valid (for same miner)
  const stableHistory = (currentHistory && currentHistory.length > 0)
    ? currentHistory
    : lastValidHistoryRef.current;

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Connecting to main window...</p>
          <Button variant="outline" onClick={requestData}>
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Mining Analytics</h1>
              <p className="text-sm text-muted-foreground">
                Advanced charts, miner comparison, and profitability analysis
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-muted-foreground">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="profitability" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Profitability
            </TabsTrigger>
            <TabsTrigger value="charts" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Charts
            </TabsTrigger>
            <TabsTrigger value="compare" className="flex items-center gap-2">
              <GitCompare className="h-4 w-4" />
              Compare
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profitability" className="space-y-4">
            <ProfitabilityDashboard
              miners={data.miners}
              minerStates={data.minerStates}
              electricityRate={data.electricityRate}
            />
          </TabsContent>

          <TabsContent value="charts" className="space-y-4">
            {/* Miner selector */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Select Miner:</span>
              <Select value={selectedMinerIp} onValueChange={setSelectedMinerIp}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select a miner" />
                </SelectTrigger>
                <SelectContent>
                  {data.miners.map(miner => (
                    <SelectItem key={miner.ip} value={miner.ip}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: miner.accentColor }}
                        />
                        {miner.name || miner.ip}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {stableHistory.length > 1 ? (
              <AdvancedChart
                history={stableHistory}
                showPower
                showVoltage
                showFrequency
                accentColor={selectedMiner?.accentColor}
                visibleMetrics={chartVisibleMetrics}
                onVisibleMetricsChange={setChartVisibleMetrics}
              />
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground border rounded-lg">
                {data.miners.length === 0
                  ? 'Add miners to view charts'
                  : selectedMinerIp
                    ? 'Not enough data to display chart. Please wait for more data points.'
                    : 'Select a miner to view its chart'}
              </div>
            )}
          </TabsContent>

          <TabsContent value="compare" className="space-y-4">
            {data.miners.length > 1 ? (
              <MinerComparisonChart
                miners={data.miners}
                minerStates={data.minerStates}
                selectedMiners={comparisonSelectedMiners}
                onSelectedMinersChange={setComparisonSelectedMiners}
                compareMetric={comparisonMetric}
                onCompareMetricChange={setComparisonMetric}
              />
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground border rounded-lg">
                {data.miners.length === 0 ? 'Add miners to compare them' : 'Add more miners to compare them'}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
