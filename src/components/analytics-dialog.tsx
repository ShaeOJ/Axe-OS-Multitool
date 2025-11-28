'use client';

import { useState, useEffect, Component, ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  GitCompare,
  DollarSign,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import type { MinerConfig, MinerState } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AdvancedChart } from './advanced-chart';
import { MinerComparisonChart } from './miner-comparison-chart';
import { ProfitabilityDashboard } from './profitability-dashboard';

// Error boundary to catch rendering errors in child components
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Analytics component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground border rounded-lg p-4">
          <AlertCircle className="h-8 w-8 mb-2 text-destructive" />
          <p className="text-center">Something went wrong loading this component.</p>
          <p className="text-sm text-center mt-1">{this.state.error?.message}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

function LoadingPlaceholder({ text }: { text: string }) {
  return (
    <div className="h-[400px] flex items-center justify-center text-muted-foreground">
      {text}
    </div>
  );
}

interface AnalyticsDialogProps {
  miners: MinerConfig[];
  minerStates: Record<string, MinerState>;
  electricityRate?: number;
}

export function AnalyticsDialog({
  miners,
  minerStates,
  electricityRate = 0.10,
}: AnalyticsDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedMinerIp, setSelectedMinerIp] = useState<string>('');
  const [activeTab, setActiveTab] = useState('profitability');

  // Update selected miner when miners change or dialog opens
  useEffect(() => {
    if (open && miners.length > 0 && !selectedMinerIp) {
      setSelectedMinerIp(miners[0].ip);
    }
  }, [open, miners, selectedMinerIp]);

  const selectedMiner = miners.find(m => m.ip === selectedMinerIp);
  const selectedMinerState = selectedMinerIp ? minerStates[selectedMinerIp] : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <BarChart3 className="h-4 w-4 mr-2" />
          Analytics
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Mining Analytics
          </DialogTitle>
          <DialogDescription>
            Advanced charts, miner comparison, and profitability analysis
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profitability" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Profitability</span>
            </TabsTrigger>
            <TabsTrigger value="charts" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Advanced Charts</span>
            </TabsTrigger>
            <TabsTrigger value="compare" className="flex items-center gap-2">
              <GitCompare className="h-4 w-4" />
              <span className="hidden sm:inline">Compare Miners</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 mt-4 overflow-auto">
            {activeTab === 'profitability' && (
              <ErrorBoundary>
                <ProfitabilityDashboard
                  miners={miners}
                  minerStates={minerStates}
                  electricityRate={electricityRate}
                />
              </ErrorBoundary>
            )}

            {activeTab === 'charts' && (
              <div className="space-y-4">
                {/* Miner selector */}
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">Select Miner:</span>
                  <Select value={selectedMinerIp} onValueChange={setSelectedMinerIp}>
                    <SelectTrigger className="w-[250px]">
                      <SelectValue placeholder="Select a miner" />
                    </SelectTrigger>
                    <SelectContent>
                      {miners.map(miner => (
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

                <ErrorBoundary>
                  {selectedMinerState?.history && selectedMinerState.history.length > 1 ? (
                    <AdvancedChart
                      history={selectedMinerState.history}
                      showPower
                      showVoltage
                      showFrequency
                      accentColor={selectedMiner?.accentColor}
                    />
                  ) : (
                    <div className="h-[400px] flex items-center justify-center text-muted-foreground border rounded-lg">
                      {miners.length === 0
                        ? 'Add miners to view charts'
                        : selectedMinerIp
                          ? 'Not enough data to display chart. Please wait for more data points.'
                          : 'Select a miner to view its chart'}
                    </div>
                  )}
                </ErrorBoundary>
              </div>
            )}

            {activeTab === 'compare' && (
              <ErrorBoundary>
                {miners.length > 1 ? (
                  <MinerComparisonChart
                    miners={miners}
                    minerStates={minerStates}
                  />
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground border rounded-lg">
                    {miners.length === 0 ? 'Add miners to compare them' : 'Add more miners to compare them'}
                  </div>
                )}
              </ErrorBoundary>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
