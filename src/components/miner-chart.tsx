
'use client';

import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { MinerDataPoint } from '@/lib/types';
import { CartesianGrid, Line, LineChart, XAxis, YAxis, Text } from 'recharts';
import { useMemo } from 'react';

interface MinerChartProps {
  history: MinerDataPoint[];
}

const chartConfig = {
  hashrate: {
    label: 'Hashrate',
    color: 'hsl(var(--chart-1))',
  },
  temperature: {
    label: 'Temperature',
    color: 'hsl(var(--chart-2))',
  },
  averageHashrate: {
    label: 'Avg Hashrate',
    color: 'hsl(var(--chart-3))',
  },
} satisfies ChartConfig;

export function MinerChart({ history }: MinerChartProps) {
  const hashrateUnit = useMemo(() => {
    const maxHashrate = Math.max(...history.map(p => p.hashrate));
    if (maxHashrate >= 1000) {
      return 'TH/s';
    }
    return 'GH/s';
  }, [history]);

  const chartData = useMemo(() => {
    if (history.length === 0) return [];
    const totalHashrate = history.reduce((sum, p) => sum + p.hashrate, 0);
    const avgHashrate = totalHashrate / history.length;

    return history.map(point => ({
      ...point,
      averageHashrate: avgHashrate,
    }));
  }, [history]);

  return (
    <ChartContainer config={chartConfig} className="h-full w-full">
      <LineChart
        data={chartData}
        margin={{
          top: 5,
          right: 20,
          left: 20,
          bottom: 20,
        }}
      >
        <CartesianGrid vertical={false} stroke="hsl(var(--border) / 0.2)" />
        <XAxis
          dataKey="time"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        />
        <YAxis
            yAxisId="left"
            stroke="var(--color-hashrate)"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickCount={6}
            label={{ value: hashrateUnit, angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', dy: 40 }}
            domain={['dataMin - 10', 'dataMax + 10']}
            tickFormatter={(value: number) => {
                if (hashrateUnit === 'TH/s') {
                    return (value / 1000).toFixed(1);
                }
                return value.toFixed(0);
            }}
         />
        <YAxis
            yAxisId="right"
            orientation="right"
            stroke="var(--color-temperature)"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickCount={6}
            label={{ value: '°C', angle: -90, position: 'insideRight', fill: 'hsl(var(--muted-foreground))', dx: -10, dy:10 }}
            domain={[0, 100]}
        />
        <Text x={500} y={30} textAnchor="end" fill="var(--color-averageHashrate)">
          Average Hashrate (Yellow Dotted Line)
        </Text>
        <ChartTooltip
          cursor={true}
          content={
            <ChartTooltipContent 
              indicator="line" 
              formatter={(value, name) => {
                const val = value as number;
                if (name === 'hashrate' || name === 'averageHashrate') {
                    if (val >= 1000) {
                        return [`${(val / 1000).toFixed(2)}`, 'TH/s'];
                    }
                    return [`${val.toFixed(2)}`, 'GH/s'];
                }
                if (name === 'temperature') return [`${val.toFixed(1)}`, '°C'];
                return [value, name];
              }}
            />
          }
        />
        <Line
          yAxisId="left"
          dataKey="hashrate"
          name="hashrate"
          type="monotone"
          stroke="var(--color-hashrate)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          yAxisId="left"
          dataKey="averageHashrate"
          name="averageHashrate"
          type="monotone"
          stroke="var(--color-averageHashrate)"
          strokeWidth={2}
          dot={false}
          strokeDasharray="5 5"
        />
        <Line
          yAxisId="right"
          dataKey="temperature"
          name="temperature"
          type="monotone"
          stroke="var(--color-temperature)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
