'use client';

import { useState, useMemo, memo } from 'react';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import type { MinerDataPoint } from '@/lib/types';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

type MetricKey = 'hashrate' | 'temperature' | 'power' | 'voltage' | 'frequency';

interface AdvancedChartProps {
  history: MinerDataPoint[];
  showPower?: boolean;
  showVoltage?: boolean;
  showFrequency?: boolean;
  accentColor?: string;
  // Controlled props for state persistence
  visibleMetrics?: MetricKey[];
  onVisibleMetricsChange?: (metrics: MetricKey[]) => void;
}

const chartConfig = {
  hashrate: {
    label: 'Hashrate',
    color: 'hsl(220, 90%, 60%)', // Blue
  },
  temperature: {
    label: 'Temperature',
    color: 'hsl(0, 90%, 60%)', // Red
  },
  averageHashrate: {
    label: 'Avg Hashrate',
    color: 'hsl(45, 90%, 55%)', // Yellow/Orange
  },
  power: {
    label: 'Power',
    color: 'hsl(280, 80%, 60%)', // Purple
  },
  voltage: {
    label: 'Core Voltage',
    color: 'hsl(180, 80%, 50%)', // Cyan
  },
  frequency: {
    label: 'Frequency',
    color: 'hsl(142, 76%, 36%)', // Green
  },
} satisfies ChartConfig;

export const AdvancedChart = memo(function AdvancedChart({
  history,
  showPower = true,
  showVoltage = false,
  showFrequency = false,
  visibleMetrics: controlledVisibleMetrics,
  onVisibleMetricsChange,
}: AdvancedChartProps) {
  // Use controlled state if provided, otherwise use internal state
  const [internalVisibleMetrics, setInternalVisibleMetrics] = useState<MetricKey[]>(['hashrate', 'temperature']);

  const visibleMetrics = controlledVisibleMetrics ?? internalVisibleMetrics;
  const setVisibleMetrics = onVisibleMetricsChange ?? setInternalVisibleMetrics;

  // Early return if no data
  if (!history || history.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-muted-foreground border rounded-lg">
        No data available
      </div>
    );
  }

  // Calculate hashrate domain and unit
  const { hashrateUnit, minHashrate, maxHashrate } = useMemo(() => {
    const hashrates = history.map(p => p.hashrate || 0).filter(h => h > 0);
    if (hashrates.length === 0) return { hashrateUnit: 'GH/s', minHashrate: 0, maxHashrate: 100 };

    const min = Math.min(...hashrates);
    const max = Math.max(...hashrates);
    const unit = max >= 1000 ? 'TH/s' : 'GH/s';

    // Add 5% padding
    const padding = (max - min) * 0.05 || 10;
    return {
      hashrateUnit: unit,
      minHashrate: Math.max(0, min - padding),
      maxHashrate: max + padding
    };
  }, [history]);

  const chartData = useMemo(() => {
    if (history.length === 0) return [];
    const hashrates = history.map(p => p.hashrate || 0);
    const avgHashrate = hashrates.reduce((a, b) => a + b, 0) / hashrates.length;

    return history.map(point => ({
      ...point,
      averageHashrate: avgHashrate,
      voltageDisplay: point.voltage || 0,
    }));
  }, [history]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;

    const hashrates = chartData.map(d => d.hashrate || 0);
    const temps = chartData.map(d => d.temperature || 0);
    const powers = chartData.map(d => d.power).filter((p): p is number => p !== undefined && p > 0);

    return {
      avgHashrate: hashrates.reduce((a, b) => a + b, 0) / hashrates.length,
      maxHashrate: Math.max(...hashrates),
      minHashrate: Math.min(...hashrates),
      avgTemp: temps.reduce((a, b) => a + b, 0) / temps.length,
      maxTemp: Math.max(...temps),
      avgPower: powers.length > 0 ? powers.reduce((a, b) => a + b, 0) / powers.length : null,
    };
  }, [chartData]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Metric toggles */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Metrics:</span>
          <ToggleGroup type="multiple" value={visibleMetrics} onValueChange={(v) => setVisibleMetrics(v as MetricKey[])}>
            <ToggleGroupItem value="hashrate" size="sm" className="text-xs">
              Hashrate
            </ToggleGroupItem>
            <ToggleGroupItem value="temperature" size="sm" className="text-xs">
              Temp
            </ToggleGroupItem>
            {showPower && (
              <ToggleGroupItem value="power" size="sm" className="text-xs">
                Power
              </ToggleGroupItem>
            )}
            {showVoltage && (
              <ToggleGroupItem value="voltage" size="sm" className="text-xs">
                Voltage
              </ToggleGroupItem>
            )}
            {showFrequency && (
              <ToggleGroupItem value="frequency" size="sm" className="text-xs">
                Freq
              </ToggleGroupItem>
            )}
          </ToggleGroup>
        </div>
      </div>

      {/* Statistics bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          <div className="bg-muted/50 rounded p-2">
            <p className="text-muted-foreground">Avg Hashrate</p>
            <p className="font-semibold">
              {hashrateUnit === 'TH/s' ? (stats.avgHashrate / 1000).toFixed(2) : stats.avgHashrate.toFixed(0)} {hashrateUnit}
            </p>
          </div>
          <div className="bg-muted/50 rounded p-2">
            <p className="text-muted-foreground">Max Hashrate</p>
            <p className="font-semibold">
              {hashrateUnit === 'TH/s' ? (stats.maxHashrate / 1000).toFixed(2) : stats.maxHashrate.toFixed(0)} {hashrateUnit}
            </p>
          </div>
          <div className="bg-muted/50 rounded p-2">
            <p className="text-muted-foreground">Avg Temp</p>
            <p className="font-semibold">{stats.avgTemp.toFixed(1)}°C</p>
          </div>
          <div className="bg-muted/50 rounded p-2">
            <p className="text-muted-foreground">Max Temp</p>
            <p className="font-semibold">{stats.maxTemp.toFixed(1)}°C</p>
          </div>
          {stats.avgPower && (
            <div className="bg-muted/50 rounded p-2">
              <p className="text-muted-foreground">Avg Power</p>
              <p className="font-semibold">{stats.avgPower.toFixed(1)}W</p>
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      <ChartContainer config={chartConfig} className="h-[400px] w-full">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
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

          {/* Left Y-Axis (hashrate) - always present */}
          <YAxis
            yAxisId="left"
            stroke="var(--color-hashrate)"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickCount={6}
            label={{ value: hashrateUnit, angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', dy: 40 }}
            domain={[minHashrate, maxHashrate]}
            tickFormatter={(value: number) => {
              if (hashrateUnit === 'TH/s') {
                return (value / 1000).toFixed(1);
              }
              return value.toFixed(0);
            }}
          />

          {/* Right Y-Axis (temperature) - always present */}
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="var(--color-temperature)"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickCount={6}
            label={{ value: '°C', angle: -90, position: 'insideRight', fill: 'hsl(var(--muted-foreground))', dx: -10, dy: 10 }}
            domain={[0, 100]}
          />

          <ChartTooltip
            cursor={true}
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
                formatter={(value, name) => {
                  const val = value as number;
                  if (name === 'hashrate' || name === 'averageHashrate') {
                    if (val >= 1000) {
                      return [`${(val / 1000).toFixed(2)} TH/s`, chartConfig[name as keyof typeof chartConfig]?.label || name];
                    }
                    return [`${val.toFixed(2)} GH/s`, chartConfig[name as keyof typeof chartConfig]?.label || name];
                  }
                  if (name === 'temperature') return [`${val.toFixed(1)}°C`, 'Temperature'];
                  if (name === 'power') return [`${val.toFixed(1)}W`, 'Power'];
                  if (name === 'voltageDisplay') return [`${val.toFixed(0)}mV`, 'Core Voltage'];
                  if (name === 'frequency') return [`${val.toFixed(0)}MHz`, 'Frequency'];
                  return [value, name];
                }}
              />
            }
          />

          <ChartLegend content={<ChartLegendContent />} />

          {/* Hashrate lines - use strokeWidth to show/hide */}
          <Line
            yAxisId="left"
            dataKey="hashrate"
            name="hashrate"
            type="monotone"
            stroke="var(--color-hashrate)"
            strokeWidth={visibleMetrics.includes('hashrate') ? 2 : 0}
            dot={false}
            activeDot={visibleMetrics.includes('hashrate') ? { r: 4 } : false}
            animationDuration={300}
            animationEasing="ease-out"
          />
          <Line
            yAxisId="left"
            dataKey="averageHashrate"
            name="averageHashrate"
            type="monotone"
            stroke="var(--color-averageHashrate)"
            strokeWidth={visibleMetrics.includes('hashrate') ? 1.5 : 0}
            dot={false}
            strokeDasharray="5 5"
            animationDuration={300}
            animationEasing="ease-out"
          />

          {/* Temperature line */}
          <Line
            yAxisId="right"
            dataKey="temperature"
            name="temperature"
            type="monotone"
            stroke="var(--color-temperature)"
            strokeWidth={visibleMetrics.includes('temperature') ? 2 : 0}
            dot={false}
            activeDot={visibleMetrics.includes('temperature') ? { r: 4 } : false}
            animationDuration={300}
            animationEasing="ease-out"
          />

          {/* Power line */}
          <Line
            yAxisId="right"
            dataKey="power"
            name="power"
            type="monotone"
            stroke="var(--color-power)"
            strokeWidth={visibleMetrics.includes('power') ? 2 : 0}
            dot={false}
            activeDot={visibleMetrics.includes('power') ? { r: 4 } : false}
            animationDuration={300}
            animationEasing="ease-out"
          />

          {/* Voltage line */}
          <Line
            yAxisId="left"
            dataKey="voltageDisplay"
            name="voltageDisplay"
            type="monotone"
            stroke="var(--color-voltage)"
            strokeWidth={visibleMetrics.includes('voltage') ? 2 : 0}
            dot={false}
            activeDot={visibleMetrics.includes('voltage') ? { r: 4 } : false}
            animationDuration={300}
            animationEasing="ease-out"
          />

          {/* Frequency line */}
          <Line
            yAxisId="left"
            dataKey="frequency"
            name="frequency"
            type="monotone"
            stroke="var(--color-frequency)"
            strokeWidth={visibleMetrics.includes('frequency') ? 2 : 0}
            dot={false}
            activeDot={visibleMetrics.includes('frequency') ? { r: 4 } : false}
            animationDuration={300}
            animationEasing="ease-out"
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
});
