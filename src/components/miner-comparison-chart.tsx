'use client';

import { useState, useMemo, useCallback, memo, useRef, useEffect } from 'react';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import type { MinerDataPoint, MinerConfig, MinerState } from '@/lib/types';
import { CartesianGrid, Line, LineChart, XAxis, YAxis, Bar, BarChart, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type CompareMetric = 'hashrate' | 'temperature' | 'power' | 'efficiency';
type ViewMode = 'snapshot' | 'timeline';

interface MinerComparisonChartProps {
  miners: MinerConfig[];
  minerStates: Record<string, MinerState>;
  // Controlled props for state persistence
  selectedMiners?: string[];
  onSelectedMinersChange?: (miners: string[]) => void;
  compareMetric?: CompareMetric;
  onCompareMetricChange?: (metric: CompareMetric) => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

// Generate distinct colors for each miner
const MINER_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(210, 76%, 60%)',
  'hsl(280, 76%, 60%)',
  'hsl(30, 76%, 60%)',
  'hsl(180, 76%, 60%)',
  'hsl(330, 76%, 60%)',
];

export const MinerComparisonChart = memo(function MinerComparisonChart({
  miners,
  minerStates,
  selectedMiners: controlledSelectedMiners,
  onSelectedMinersChange,
  compareMetric: controlledCompareMetric,
  onCompareMetricChange,
  viewMode: controlledViewMode,
  onViewModeChange,
}: MinerComparisonChartProps) {
  // Use internal state for uncontrolled mode
  const [internalSelectedMiners, setInternalSelectedMiners] = useState<string[]>(() => {
    return miners.slice(0, Math.min(3, miners.length)).map(m => m.ip);
  });
  const [internalCompareMetric, setInternalCompareMetric] = useState<CompareMetric>('hashrate');
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>('snapshot');

  // Use controlled state if provided, otherwise use internal state
  const selectedMiners = controlledSelectedMiners ?? internalSelectedMiners;
  const setSelectedMiners = onSelectedMinersChange ?? setInternalSelectedMiners;
  const compareMetric = controlledCompareMetric ?? internalCompareMetric;
  const setCompareMetric = onCompareMetricChange ?? setInternalCompareMetric;
  const viewMode = controlledViewMode ?? internalViewMode;
  const setViewMode = onViewModeChange ?? setInternalViewMode;

  // Track if this is the initial render to only animate once
  const hasAnimatedRef = useRef(false);
  const isAnimationActive = !hasAnimatedRef.current;

  useEffect(() => {
    // After first render, disable future animations
    if (!hasAnimatedRef.current) {
      const timer = setTimeout(() => {
        hasAnimatedRef.current = true;
      }, 350);
      return () => clearTimeout(timer);
    }
  }, []);

  // Filter out any selected miners that no longer exist (in case miners are removed)
  const validSelectedMiners = useMemo(() => {
    if (selectedMiners.length === 0) return [];
    const minerIps = new Set(miners.map(m => m.ip));
    return selectedMiners.filter(ip => minerIps.has(ip));
  }, [selectedMiners, miners]);

  // Early return if no miners
  if (!miners || miners.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-muted-foreground border rounded-lg">
        No miners available for comparison
      </div>
    );
  }

  // Generate chart config dynamically based on selected miners
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    validSelectedMiners.forEach((ip, index) => {
      const miner = miners.find(m => m.ip === ip);
      config[ip] = {
        label: miner?.name || ip,
        color: miner?.accentColor || MINER_COLORS[index % MINER_COLORS.length],
      };
    });
    return config;
  }, [validSelectedMiners, miners]);

  // Merge histories for time-series comparison - optimized
  const timeSeriesData = useMemo(() => {
    if (validSelectedMiners.length === 0) return [];

    // Use the first miner's history as the time base to avoid expensive Set operations
    const firstMinerHistory = minerStates[validSelectedMiners[0]]?.history;
    if (!firstMinerHistory || firstMinerHistory.length === 0) return [];

    // Limit to last 100 points for performance
    const limitedHistory = firstMinerHistory.slice(-100);

    // Build data array using first miner's timestamps
    return limitedHistory.map(basePoint => {
      const time = basePoint.time;
      const dataPoint: Record<string, number | undefined> = { time };

      validSelectedMiners.forEach(ip => {
        const state = minerStates[ip];
        if (!state?.history) return;

        // For the first miner, use the exact point
        // For others, find closest within 2 minutes using binary search approximation
        let point: typeof basePoint | undefined;
        if (ip === validSelectedMiners[0]) {
          point = basePoint;
        } else {
          // Simple linear search on limited data is fast enough
          point = state.history.find(p => Math.abs(p.time - time) < 120000);
        }

        if (point) {
          switch (compareMetric) {
            case 'hashrate':
              dataPoint[ip] = point.hashrate;
              break;
            case 'temperature':
              dataPoint[ip] = point.temperature;
              break;
            case 'power':
              dataPoint[ip] = point.power;
              break;
            case 'efficiency':
              if (point.power && point.hashrate > 0) {
                dataPoint[ip] = point.power / (point.hashrate / 1000);
              }
              break;
          }
        }
      });

      return dataPoint;
    });
  }, [validSelectedMiners, minerStates, compareMetric]);

  // Current snapshot comparison data for bar chart
  const snapshotData = useMemo(() => {
    return validSelectedMiners.map(ip => {
      const miner = miners.find(m => m.ip === ip);
      const state = minerStates[ip];
      const info = state?.info;

      let value = 0;
      switch (compareMetric) {
        case 'hashrate':
          value = info?.hashRate || 0;
          break;
        case 'temperature':
          value = info?.temp || 0;
          break;
        case 'power':
          value = info?.power || 0;
          break;
        case 'efficiency':
          if (info?.power && info?.hashRate && info.hashRate > 0) {
            value = info.power / (info.hashRate / 1000); // J/TH
          }
          break;
      }

      return {
        name: miner?.name || ip,
        ip,
        value,
        color: miner?.accentColor || MINER_COLORS[validSelectedMiners.indexOf(ip) % MINER_COLORS.length],
      };
    });
  }, [validSelectedMiners, miners, minerStates, compareMetric]);

  // Toggle miner selection - memoized to prevent re-renders
  const toggleMiner = useCallback((ip: string) => {
    const currentSelection = selectedMiners;
    let newSelection: string[];
    if (currentSelection.includes(ip)) {
      newSelection = currentSelection.filter(m => m !== ip);
    } else if (currentSelection.length >= 5) {
      newSelection = [...currentSelection.slice(1), ip]; // Remove oldest, add new
    } else {
      newSelection = [...currentSelection, ip];
    }
    setSelectedMiners(newSelection);
  }, [selectedMiners, setSelectedMiners]);

  const getMetricLabel = () => {
    switch (compareMetric) {
      case 'hashrate': return 'GH/s';
      case 'temperature': return '°C';
      case 'power': return 'W';
      case 'efficiency': return 'J/TH';
    }
  };

  const formatValue = (value: number) => {
    switch (compareMetric) {
      case 'hashrate':
        if (value >= 1000) return `${(value / 1000).toFixed(2)} TH/s`;
        return `${value.toFixed(0)} GH/s`;
      case 'temperature':
        return `${value.toFixed(1)}°C`;
      case 'power':
        return `${value.toFixed(1)}W`;
      case 'efficiency':
        return `${value.toFixed(1)} J/TH`;
      default:
        return value.toFixed(2);
    }
  };

  return (
    <div className="space-y-4">
      {/* Miner Selection */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Select miners to compare (max 5):</p>
        <div className="flex flex-wrap gap-2">
          {miners.map(miner => (
            <Badge
              key={miner.ip}
              variant={selectedMiners.includes(miner.ip) ? 'default' : 'outline'}
              className="cursor-pointer transition-all"
              style={{
                backgroundColor: selectedMiners.includes(miner.ip) ? miner.accentColor : undefined,
                borderColor: miner.accentColor,
              }}
              onClick={() => toggleMiner(miner.ip)}
            >
              {miner.name || miner.ip}
            </Badge>
          ))}
        </div>
      </div>

      {/* Metric Selection */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">Compare by:</span>
        <Select value={compareMetric} onValueChange={(v) => setCompareMetric(v as CompareMetric)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hashrate">Hashrate</SelectItem>
            <SelectItem value="temperature">Temperature</SelectItem>
            <SelectItem value="power">Power</SelectItem>
            <SelectItem value="efficiency">Efficiency (J/TH)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {validSelectedMiners.length > 0 ? (
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-full">
          <TabsList>
            <TabsTrigger value="snapshot">Current Snapshot</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="snapshot" className="mt-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={snapshotData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.2)" />
                  <XAxis type="number" tickFormatter={(v) => formatValue(v)} />
                  <YAxis type="category" dataKey="name" width={90} />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-2 shadow-lg">
                            <p className="font-medium">{data.name}</p>
                            <p className="text-sm text-muted-foreground">{formatValue(data.value)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill="currentColor"
                    radius={[0, 4, 4, 0]}
                    isAnimationActive={false}
                    // @ts-ignore - recharts types don't include this but it works
                    shape={(props: any) => {
                      const { x, y, width, height, payload } = props;
                      return (
                        <rect
                          x={x}
                          y={y}
                          width={width}
                          height={height}
                          fill={payload.color}
                          rx={4}
                          ry={4}
                        />
                      );
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
              <LineChart
                data={timeSeriesData}
                margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
              >
                <CartesianGrid vertical={false} stroke="hsl(var(--border) / 0.2)" />
                <XAxis
                  dataKey="time"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => {
                    if (!value || typeof value !== 'number') return '';
                    try {
                      return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    } catch {
                      return '';
                    }
                  }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickCount={6}
                  label={{ value: getMetricLabel(), angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value: number) => {
                    if (compareMetric === 'hashrate' && value >= 1000) {
                      return (value / 1000).toFixed(1);
                    }
                    return value.toFixed(0);
                  }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      indicator="line"
                      labelFormatter={(value) => {
                        if (!value || typeof value !== 'number') return '';
                        try {
                          return new Date(value).toLocaleTimeString();
                        } catch {
                          return '';
                        }
                      }}
                      formatter={(value, name) => [formatValue(value as number), chartConfig[name as string]?.label || name]}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />

                {validSelectedMiners.map((ip, index) => {
                  const color = miners.find(m => m.ip === ip)?.accentColor || MINER_COLORS[index % MINER_COLORS.length];
                  return (
                    <Line
                      key={ip}
                      dataKey={ip}
                      name={ip}
                      type="monotone"
                      stroke={color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                      isAnimationActive={isAnimationActive}
                      animationDuration={300}
                      animationEasing="ease-out"
                    />
                  );
                })}
              </LineChart>
            </ChartContainer>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          Select at least one miner to compare
        </div>
      )}
    </div>
  );
});
