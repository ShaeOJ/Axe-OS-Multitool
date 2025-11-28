'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bitcoin,
  TrendingUp,
  TrendingDown,
  Zap,
  DollarSign,
  Calculator,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Coins,
} from 'lucide-react';
import type { MinerConfig, MinerState } from '@/lib/types';
import {
  CryptoSymbol,
  CryptoPrice,
  fetchAllPrices,
  calculateDailyCoins,
  calculateProfitability,
  getNetworkDefaults,
  formatCryptoAmount,
  formatUSD,
} from '@/lib/crypto-prices';

interface ProfitabilityDashboardProps {
  miners: MinerConfig[];
  minerStates: Record<string, MinerState>;
  electricityRate?: number;
}

// Estimated network hashrates (TH/s) - should be fetched from APIs in production
const ESTIMATED_NETWORK_HASHRATE: Record<CryptoSymbol, number> = {
  BTC: 650_000_000, // ~650 EH/s
  BCH: 5_000_000,   // ~5 EH/s
  BTC2: 100_000,    // Varies - placeholder
};

export function ProfitabilityDashboard({
  miners,
  minerStates,
  electricityRate = 0.10,
}: ProfitabilityDashboardProps) {
  const [prices, setPrices] = useState<Record<CryptoSymbol, CryptoPrice | null>>({
    BTC: null,
    BCH: null,
    BTC2: null,
  });
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoSymbol>('BTC');
  const [customElectricityRate, setCustomElectricityRate] = useState(electricityRate);
  const [poolFee, setPoolFee] = useState(1); // 1% default
  const [customNetworkHashrate, setCustomNetworkHashrate] = useState<string>('');

  // Fetch prices on mount and every 5 minutes
  useEffect(() => {
    let isMounted = true;
    let initialTimeout: NodeJS.Timeout | null = null;
    let interval: NodeJS.Timeout | null = null;

    const fetchPricesAsync = async () => {
      if (!isMounted) return;
      setIsLoadingPrices(true);
      setPriceError(null);
      try {
        const newPrices = await fetchAllPrices();
        if (isMounted) {
          setPrices(newPrices);
        }
      } catch (error) {
        console.error('Failed to fetch prices:', error);
        if (isMounted) {
          setPriceError('Unable to fetch prices. Using manual input.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingPrices(false);
        }
      }
    };

    // Small delay before fetching to let dialog settle
    initialTimeout = setTimeout(fetchPricesAsync, 1000);
    interval = setInterval(fetchPricesAsync, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      if (initialTimeout) clearTimeout(initialTimeout);
      if (interval) clearInterval(interval);
    };
  }, []);

  const handleRefreshPrices = useCallback(async () => {
    setIsLoadingPrices(true);
    try {
      const newPrices = await fetchAllPrices();
      setPrices(newPrices);
    } catch (error) {
      console.error('Failed to fetch prices:', error);
    } finally {
      setIsLoadingPrices(false);
    }
  }, []);

  // Calculate total hashrate and power across all miners
  const totals = useMemo(() => {
    let totalHashrateGHs = 0;
    let totalPowerWatts = 0;
    let onlineMiners = 0;

    miners.forEach(miner => {
      const state = minerStates[miner.ip];
      if (state?.info && !state.error) {
        totalHashrateGHs += state.info.hashRate || 0;
        totalPowerWatts += state.info.power || 0;
        onlineMiners++;
      }
    });

    return {
      hashrate: totalHashrateGHs,
      power: totalPowerWatts,
      onlineMiners,
    };
  }, [miners, minerStates]);

  // Calculate profitability for selected crypto
  const profitability = useMemo(() => {
    const networkDefaults = getNetworkDefaults(selectedCrypto);
    const networkHashrate = customNetworkHashrate
      ? parseFloat(customNetworkHashrate)
      : ESTIMATED_NETWORK_HASHRATE[selectedCrypto];
    const price = prices[selectedCrypto]?.price || 0;

    const dailyCoins = calculateDailyCoins(
      totals.hashrate,
      networkHashrate,
      networkDefaults.blockReward || 0,
      networkDefaults.blocksPerDay || 144,
      poolFee
    );

    return {
      ...calculateProfitability(
        totals.hashrate,
        totals.power,
        customElectricityRate,
        price,
        dailyCoins
      ),
      dailyCoins,
      networkHashrate,
    };
  }, [selectedCrypto, totals, prices, customElectricityRate, poolFee, customNetworkHashrate]);

  const currentPrice = prices[selectedCrypto];
  const isProfitable = profitability.dailyProfit > 0;

  return (
    <div className="space-y-6">
      {/* Header with price overview */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Profitability Dashboard</h2>
          <p className="text-muted-foreground">Real-time mining profitability analysis</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshPrices}
          disabled={isLoadingPrices}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingPrices ? 'animate-spin' : ''}`} />
          Refresh Prices
        </Button>
      </div>

      {/* Crypto Price Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['BTC', 'BCH', 'BTC2'] as CryptoSymbol[]).map(symbol => {
          const price = prices[symbol];
          const isSelected = selectedCrypto === symbol;
          return (
            <Card
              key={symbol}
              className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
              onClick={() => setSelectedCrypto(symbol)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bitcoin className="h-5 w-5" />
                    <CardTitle className="text-lg">{symbol}</CardTitle>
                  </div>
                  {isSelected && <Badge>Selected</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                {price ? (
                  <div className="space-y-1">
                    <p className="text-2xl font-bold">{formatUSD(price.price)}</p>
                    <div className="flex items-center gap-1 text-sm">
                      {price.change24h >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className={price.change24h >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {price.change24h >= 0 ? '+' : ''}{price.change24h.toFixed(2)}%
                      </span>
                      <span className="text-muted-foreground">24h</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Loading...</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Settings
            </CardTitle>
            <CardDescription>Adjust calculation parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Electricity Rate ($/kWh)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={customElectricityRate}
                onChange={(e) => setCustomElectricityRate(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label>Pool Fee (%)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={poolFee}
                onChange={(e) => setPoolFee(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label>Network Hashrate (TH/s)</Label>
              <Input
                type="text"
                placeholder={ESTIMATED_NETWORK_HASHRATE[selectedCrypto].toLocaleString()}
                value={customNetworkHashrate}
                onChange={(e) => setCustomNetworkHashrate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for estimated value
              </p>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Your Hashrate:</span>
                <span className="font-medium">
                  {totals.hashrate >= 1000
                    ? `${(totals.hashrate / 1000).toFixed(2)} TH/s`
                    : `${totals.hashrate.toFixed(0)} GH/s`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Power:</span>
                <span className="font-medium">{totals.power.toFixed(0)}W</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Online Miners:</span>
                <span className="font-medium">{totals.onlineMiners} / {miners.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profitability Overview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  {selectedCrypto} Profitability
                </CardTitle>
                <CardDescription>
                  Based on current prices and your hashrate
                </CardDescription>
              </div>
              <Badge variant={isProfitable ? 'default' : 'destructive'} className="text-lg px-3 py-1">
                {isProfitable ? (
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                ) : (
                  <AlertTriangle className="h-4 w-4 mr-1" />
                )}
                {isProfitable ? 'Profitable' : 'Unprofitable'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="daily">
              <TabsList className="mb-4">
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="yearly">Yearly</TabsTrigger>
              </TabsList>

              <TabsContent value="daily" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Coins className="h-4 w-4" />
                      <span className="text-sm">Daily Coins</span>
                    </div>
                    <p className="text-xl font-bold">
                      {formatCryptoAmount(profitability.dailyCoins, selectedCrypto)} {selectedCrypto}
                    </p>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm">Revenue</span>
                    </div>
                    <p className="text-xl font-bold text-green-500">
                      {formatUSD(profitability.dailyRevenue)}
                    </p>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Zap className="h-4 w-4" />
                      <span className="text-sm">Power Cost</span>
                    </div>
                    <p className="text-xl font-bold text-red-500">
                      -{formatUSD(profitability.dailyPowerCost)}
                    </p>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-sm">Net Profit</span>
                    </div>
                    <p className={`text-xl font-bold ${profitability.dailyProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {profitability.dailyProfit >= 0 ? '+' : ''}{formatUSD(profitability.dailyProfit)}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="monthly" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Coins className="h-4 w-4" />
                      <span className="text-sm">Monthly Coins</span>
                    </div>
                    <p className="text-xl font-bold">
                      {formatCryptoAmount(profitability.dailyCoins * 30, selectedCrypto)} {selectedCrypto}
                    </p>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm">Revenue</span>
                    </div>
                    <p className="text-xl font-bold text-green-500">
                      {formatUSD(profitability.dailyRevenue * 30)}
                    </p>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Zap className="h-4 w-4" />
                      <span className="text-sm">Power Cost</span>
                    </div>
                    <p className="text-xl font-bold text-red-500">
                      -{formatUSD(profitability.dailyPowerCost * 30)}
                    </p>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-sm">Net Profit</span>
                    </div>
                    <p className={`text-xl font-bold ${profitability.monthlyProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {profitability.monthlyProfit >= 0 ? '+' : ''}{formatUSD(profitability.monthlyProfit)}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="yearly" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Coins className="h-4 w-4" />
                      <span className="text-sm">Yearly Coins</span>
                    </div>
                    <p className="text-xl font-bold">
                      {formatCryptoAmount(profitability.dailyCoins * 365, selectedCrypto)} {selectedCrypto}
                    </p>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm">Revenue</span>
                    </div>
                    <p className="text-xl font-bold text-green-500">
                      {formatUSD(profitability.dailyRevenue * 365)}
                    </p>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Zap className="h-4 w-4" />
                      <span className="text-sm">Power Cost</span>
                    </div>
                    <p className="text-xl font-bold text-red-500">
                      -{formatUSD(profitability.dailyPowerCost * 365)}
                    </p>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-sm">Net Profit</span>
                    </div>
                    <p className={`text-xl font-bold ${profitability.yearlyProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {profitability.yearlyProfit >= 0 ? '+' : ''}{formatUSD(profitability.yearlyProfit)}
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <Separator className="my-4" />

            {/* Break-even analysis */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted/30 rounded-lg p-4 border">
                <p className="text-sm text-muted-foreground mb-1">Break-even Price</p>
                <p className="text-lg font-bold">
                  {formatUSD(profitability.breakEvenPrice)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedCrypto} price needed to cover electricity costs
                </p>
              </div>

              <div className="bg-muted/30 rounded-lg p-4 border">
                <p className="text-sm text-muted-foreground mb-1">Efficiency</p>
                <p className="text-lg font-bold">
                  {totals.power > 0 && totals.hashrate > 0
                    ? `${(totals.power / (totals.hashrate / 1000)).toFixed(1)} J/TH`
                    : 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Joules per Terahash
                </p>
              </div>

              <div className="bg-muted/30 rounded-lg p-4 border">
                <p className="text-sm text-muted-foreground mb-1">Network Share</p>
                <p className="text-lg font-bold">
                  {profitability.networkHashrate > 0
                    ? `${((totals.hashrate / 1000 / profitability.networkHashrate) * 100).toExponential(2)}%`
                    : 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your share of network hashrate
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
