'use client';

import { Card, CardContent } from "@/components/ui/card";
import { useMemo } from "react";
import { Zap, Power, Cpu, DollarSign } from 'lucide-react';
import { cn } from "@/lib/utils";
import type { MinerState, MinerConfig } from "@/lib/types";
import { useIsMobile } from '@/hooks/use-mobile';

const Stat = ({ icon: Icon, label, value, unit, small }: { icon: React.ElementType, label: string, value: string, unit: string, small?: boolean }) => (
  <div className={cn("flex items-center gap-2", { "flex-col text-center": small })}>
    <Icon className={cn("h-6 w-6 text-muted-foreground", { "h-4 w-4": small })} />
    <div>
      <p className={cn("text-xl font-bold text-primary", { "text-sm": small })}>{value}</p>
      <p className={cn("text-xs text-muted-foreground", { "text-xs": small })}>{label} {unit && `(${unit})`}</p>
    </div>
  </div>
);

interface PowerSettings {
  electricityRate: number;
  currency: string;
  showPowerCost: boolean;
  showEfficiency: boolean;
}

interface GlobalStatsProps {
  minerStates: Record<string, MinerState>;
  miners: MinerConfig[];
  powerSettings?: PowerSettings;
}

export function GlobalStats({ minerStates, miners, powerSettings }: GlobalStatsProps) {
  const isMobile = useIsMobile();
  const { totalHashrate, totalPower, efficiency, hashrateUnit, totalMiners, dailyCost } = useMemo(() => {
    let totalHashrateGhs = 0;
    let totalPower = 0;
    let onlineMiners = 0;

    Object.values(minerStates).forEach(state => {
      if (state.info) {
        onlineMiners++;
        totalHashrateGhs += state.info.hashRate || 0;
        totalPower += state.info.power || 0;
      }
    });

    const hashrateInThs = totalHashrateGhs / 1000;
    const efficiencyValue = hashrateInThs > 0 ? totalPower / hashrateInThs : 0;

    const displayHashrate = totalHashrateGhs >= 1000 ? hashrateInThs : totalHashrateGhs;
    const displayUnit = totalHashrateGhs >= 1000 ? 'TH/s' : 'GH/s';

    // Calculate daily cost
    const kWhPerDay = (totalPower / 1000) * 24;
    const dailyCostValue = powerSettings?.showPowerCost
      ? kWhPerDay * (powerSettings.electricityRate || 0)
      : null;

    return {
      totalHashrate: displayHashrate,
      totalPower,
      efficiency: efficiencyValue,
      hashrateUnit: displayUnit,
      totalMiners: onlineMiners,
      dailyCost: dailyCostValue
    };
  }, [minerStates, powerSettings]);

  if (isMobile) {
    return (
      <Card className={cn("shadow-inner shadow-black/20")} style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--foreground)/.1) 2px, hsl(var(--foreground)/.1) 4px)', borderColor: 'hsl(var(--primary))' }}>
        <CardContent className="flex justify-around p-2">
          <Stat small icon={Cpu} label="Miners" value={`${totalMiners}/${miners.length}`} unit="" />
          <Stat small icon={Zap} label="Hashrate" value={totalHashrate.toFixed(2)} unit={hashrateUnit} />
          <Stat small icon={Power} label="Power" value={totalPower.toFixed(2)} unit="W" />
          {dailyCost !== null ? (
            <Stat small icon={DollarSign} label="Daily" value={dailyCost.toFixed(2)} unit={`${powerSettings?.currency || '$'}/day`} />
          ) : (
            <Stat small icon={Zap} label="Efficiency" value={efficiency.toFixed(2)} unit="J/TH" />
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("shadow-inner shadow-black/20")} style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--foreground)/.1) 2px, hsl(var(--foreground)/.1) 4px)', borderColor: 'hsl(var(--primary))' }}>
      <CardContent className={cn("grid gap-4 p-6", dailyCost !== null ? "grid-cols-1 md:grid-cols-5" : "grid-cols-1 md:grid-cols-4")}>
        <Stat icon={Cpu} label="Miners Online" value={`${totalMiners}/${miners.length}`} unit="" />
        <Stat icon={Zap} label="Total Hashrate" value={totalHashrate.toFixed(2)} unit={hashrateUnit} />
        <Stat icon={Power} label="Total Power" value={totalPower.toFixed(2)} unit="W" />
        <Stat icon={Zap} label="Efficiency" value={efficiency.toFixed(2)} unit="J/TH" />
        {dailyCost !== null && (
          <Stat icon={DollarSign} label="Daily Cost" value={dailyCost.toFixed(2)} unit={`${powerSettings?.currency || '$'}/day`} />
        )}
      </CardContent>
    </Card>
  );
}
