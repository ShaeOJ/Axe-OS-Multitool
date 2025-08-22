'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { MinerState } from '@/lib/types';
import { Zap, HeartPulse, Activity } from 'lucide-react';
import { GlitchText } from './glitch-text';

interface GlobalStatsProps {
  minerStates: Record<string, MinerState>;
  isMounted: boolean;
}

const StatCard = ({ icon: Icon, label, value, unit }: { icon: React.ElementType, label: string, value: string, unit: string }) => (
  <div className="flex items-center gap-3">
    <Icon className="h-5 w-5 text-muted-foreground" />
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-base font-semibold">
                <GlitchText probability={0.2}>{value}</GlitchText>
        <span className="text-xs font-normal text-muted-foreground"> {unit}</span>
      </p>
    </div>
  </div>
);

export function GlobalStats({ minerStates, isMounted }: GlobalStatsProps) {
  const { totalHashrate, totalPower, efficiency, hashrateUnit } = useMemo(() => {
    if (!isMounted) {
      return {
        totalHashrate: 0,
        totalPower: 0,
        efficiency: 0,
        hashrateUnit: 'GH/s',
      };
    }

    let totalHashrateGhs = 0;
    let totalPower = 0;

    Object.values(minerStates).forEach(state => {
      if (state.info && !state.error) {
        // state.info.hashRate is already in GH/s
        totalHashrateGhs += state.info.hashRate || 0;
        totalPower += state.info.power || 0;
      }
    });
    
    const hashrateInThs = totalHashrateGhs / 1000;
    const efficiencyValue = hashrateInThs > 0 ? totalPower / hashrateInThs : 0;

    const displayHashrate = totalHashrateGhs >= 1000 ? hashrateInThs : totalHashrateGhs;
    const displayUnit = totalHashrateGhs >= 1000 ? 'TH/s' : 'GH/s';


    return {
      totalHashrate: displayHashrate,
      totalPower,
      efficiency: efficiencyValue,
      hashrateUnit: displayUnit,
    };
  }, [minerStates]);

  return (
    <Card className="hidden lg:block bg-background/50 border-0 shadow-none">
      <CardContent className="flex items-center gap-6 p-2">
        <StatCard 
            icon={Zap}
            label="Total Hashrate"
            value={totalHashrate.toFixed(2)}
            unit={hashrateUnit}
        />
        <StatCard 
            icon={HeartPulse}
            label="Total Power"
            value={totalPower.toFixed(2)}
            unit="W"
        />
        <StatCard 
            icon={Activity}
            label="Efficiency"
            value={efficiency.toFixed(2)}
            unit="J/TH"
        />
      </CardContent>
    </Card>
  );
}
