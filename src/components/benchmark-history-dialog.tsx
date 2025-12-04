'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  History,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Clock,
  Award,
  ChevronRight,
  BarChart3,
  Thermometer,
} from 'lucide-react';
import type { BenchmarkHistoryEntry } from '@/lib/types';
import {
  getMinerBenchmarkHistory,
  deleteBenchmarkFromHistory,
  clearMinerBenchmarkHistory,
  formatHistoryEntry,
  compareBenchmarks,
} from '@/lib/benchmark-history';

interface BenchmarkHistoryDialogProps {
  minerIp: string;
  minerName: string;
  onSelectBenchmark?: (entry: BenchmarkHistoryEntry) => void;
  trigger?: React.ReactNode;
}

export function BenchmarkHistoryDialog({
  minerIp,
  minerName,
  onSelectBenchmark,
  trigger,
}: BenchmarkHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<BenchmarkHistoryEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<BenchmarkHistoryEntry | null>(null);
  const [compareEntry, setCompareEntry] = useState<BenchmarkHistoryEntry | null>(null);
  const [loading, setLoading] = useState(false);

  // Load history when dialog opens
  useEffect(() => {
    if (open) {
      loadHistory();
    }
  }, [open, minerIp]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const entries = await getMinerBenchmarkHistory(minerIp);
      setHistory(entries);
      // Auto-select the most recent entry
      if (entries.length > 0 && !selectedEntry) {
        setSelectedEntry(entries[0]);
      }
    } catch (error) {
      console.error('Failed to load benchmark history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteBenchmarkFromHistory(minerIp, id);
    await loadHistory();
    if (selectedEntry?.id === id) {
      setSelectedEntry(history.length > 1 ? history.find(e => e.id !== id) ?? null : null);
    }
    if (compareEntry?.id === id) {
      setCompareEntry(null);
    }
  };

  const handleClearAll = async () => {
    await clearMinerBenchmarkHistory(minerIp);
    setHistory([]);
    setSelectedEntry(null);
    setCompareEntry(null);
  };

  const handleSelect = (entry: BenchmarkHistoryEntry) => {
    if (compareEntry) {
      // In compare mode, select second entry
      if (entry.id !== selectedEntry?.id) {
        setCompareEntry(entry);
      }
    } else {
      setSelectedEntry(entry);
    }
  };

  const toggleCompareMode = () => {
    if (compareEntry) {
      setCompareEntry(null);
    } else if (history.length >= 2 && selectedEntry) {
      // Auto-select the second most recent for comparison
      const other = history.find(e => e.id !== selectedEntry.id);
      if (other) {
        setCompareEntry(other);
      }
    }
  };

  const comparison = selectedEntry && compareEntry
    ? compareBenchmarks(selectedEntry, compareEntry)
    : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <History className="h-4 w-4 mr-2" />
            History
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Benchmark History
          </DialogTitle>
          <DialogDescription>
            View past benchmark results for {minerName || minerIp}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No benchmark history for this miner</p>
            <p className="text-sm mt-2">Run a benchmark to save results here</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {/* History List */}
            <div className="col-span-1 border rounded-lg">
              <div className="p-3 border-b flex items-center justify-between">
                <span className="text-sm font-medium">Runs ({history.length})</span>
                <div className="flex gap-1">
                  {history.length >= 2 && (
                    <Button
                      variant={compareEntry ? 'default' : 'ghost'}
                      size="sm"
                      onClick={toggleCompareMode}
                      className="h-7 text-xs"
                    >
                      Compare
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive">
                        Clear
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear All History?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will delete all {history.length} benchmark records for this miner.
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Clear All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <ScrollArea className="h-[400px]">
                <div className="p-2 space-y-1">
                  {history.map((entry) => {
                    const formatted = formatHistoryEntry(entry);
                    const isSelected = selectedEntry?.id === entry.id;
                    const isCompare = compareEntry?.id === entry.id;

                    return (
                      <button
                        key={entry.id}
                        onClick={() => handleSelect(entry)}
                        className={`w-full text-left p-2 rounded-md transition-colors ${
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : isCompare
                            ? 'bg-secondary text-secondary-foreground'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{formatted.date}</p>
                            <p className="text-xs opacity-70">{formatted.time}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant={isSelected || isCompare ? 'secondary' : 'outline'} className="text-xs">
                              {formatted.mode}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs opacity-80">
                          <TrendingUp className="h-3 w-3" />
                          {formatted.hashrate}
                          <span className="mx-1">|</span>
                          <Zap className="h-3 w-3" />
                          {formatted.efficiency}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Details Panel */}
            <div className="col-span-2 border rounded-lg">
              {compareEntry && selectedEntry ? (
                // Comparison View
                <ComparisonView
                  entry1={selectedEntry}
                  entry2={compareEntry}
                  comparison={comparison!}
                />
              ) : selectedEntry ? (
                // Single Entry View
                <EntryDetailView
                  entry={selectedEntry}
                  onDelete={() => handleDelete(selectedEntry.id)}
                  onApply={onSelectBenchmark ? () => {
                    onSelectBenchmark(selectedEntry);
                    setOpen(false);
                  } : undefined}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Select a benchmark to view details
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Single entry detail view
function EntryDetailView({
  entry,
  onDelete,
  onApply,
}: {
  entry: BenchmarkHistoryEntry;
  onDelete: () => void;
  onApply?: () => void;
}) {
  const formatted = formatHistoryEntry(entry);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h3 className="font-medium">{formatted.date} at {formatted.time}</h3>
          <p className="text-sm text-muted-foreground">
            {entry.deviceProfile} - {entry.benchmarkMode} mode
          </p>
        </div>
        <div className="flex gap-2">
          {onApply && (
            <Button size="sm" onClick={onApply}>
              Apply Settings
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Benchmark?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this benchmark record from {formatted.date}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <Tabs defaultValue="summary">
          <TabsList className="mb-4">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="results">All Results ({entry.allResults.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            {/* Best Hashrate */}
            {entry.bestHashrate && (
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="h-5 w-5 text-primary" />
                  <h4 className="font-medium">Best Hashrate</h4>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Hashrate</p>
                    <p className="text-lg font-bold">{entry.bestHashrate.hashrate.toFixed(1)} GH/s</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Settings</p>
                    <p className="font-medium">{entry.bestHashrate.frequency} MHz @ {entry.bestHashrate.voltage} mV</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Efficiency</p>
                    <p className="font-medium">{entry.bestHashrate.efficiency.toFixed(2)} J/TH</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-orange-500" />
                    <span>{entry.bestHashrate.temperature.toFixed(1)}°C</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <span>{entry.bestHashrate.power.toFixed(1)} W</span>
                  </div>
                </div>
              </div>
            )}

            {/* Best Efficiency */}
            {entry.bestEfficiency && (
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-5 w-5 text-green-500" />
                  <h4 className="font-medium">Best Efficiency</h4>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Efficiency</p>
                    <p className="text-lg font-bold">{entry.bestEfficiency.efficiency.toFixed(2)} J/TH</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Settings</p>
                    <p className="font-medium">{entry.bestEfficiency.frequency} MHz @ {entry.bestEfficiency.voltage} mV</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Hashrate</p>
                    <p className="font-medium">{entry.bestEfficiency.hashrate.toFixed(1)} GH/s</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-orange-500" />
                    <span>{entry.bestEfficiency.temperature.toFixed(1)}°C</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <span>{entry.bestEfficiency.power.toFixed(1)} W</span>
                  </div>
                </div>
              </div>
            )}

            {/* Safe Limits */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-5 w-5" />
                <h4 className="font-medium">Discovered Safe Limits</h4>
              </div>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Max Freq</p>
                  <p className="font-medium">{entry.safeLimits.maxFrequency} MHz</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Max Voltage</p>
                  <p className="font-medium">{entry.safeLimits.maxVoltage} mV</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Peak Temp</p>
                  <p className="font-medium">{entry.safeLimits.maxTemperature.toFixed(1)}°C</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Peak Power</p>
                  <p className="font-medium">{entry.safeLimits.maxPower.toFixed(1)} W</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="results">
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Freq</th>
                    <th className="px-3 py-2 text-left font-medium">Voltage</th>
                    <th className="px-3 py-2 text-left font-medium">Hashrate</th>
                    <th className="px-3 py-2 text-left font-medium">Temp</th>
                    <th className="px-3 py-2 text-left font-medium">Power</th>
                    <th className="px-3 py-2 text-left font-medium">J/TH</th>
                    <th className="px-3 py-2 text-left font-medium">Stable</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.allResults.map((result, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-3 py-2">{result.frequency}</td>
                      <td className="px-3 py-2">{result.voltage}</td>
                      <td className="px-3 py-2 font-medium">{result.hashrate.toFixed(1)}</td>
                      <td className="px-3 py-2">{result.temperature.toFixed(1)}°C</td>
                      <td className="px-3 py-2">{result.power.toFixed(1)}W</td>
                      <td className="px-3 py-2">{result.efficiency.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        {result.stable ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">Yes</Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-600">No</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
}

// Comparison view for two entries
function ComparisonView({
  entry1,
  entry2,
  comparison,
}: {
  entry1: BenchmarkHistoryEntry;
  entry2: BenchmarkHistoryEntry;
  comparison: {
    hashrateDiff: number | null;
    efficiencyDiff: number | null;
    frequencyDiff: number | null;
    voltageDiff: number | null;
  };
}) {
  const f1 = formatHistoryEntry(entry1);
  const f2 = formatHistoryEntry(entry2);

  const DiffIndicator = ({ value, unit, inverted = false }: { value: number | null; unit: string; inverted?: boolean }) => {
    if (value === null) return <Minus className="h-4 w-4 text-muted-foreground" />;
    const isPositive = inverted ? value < 0 : value > 0;
    const isNegative = inverted ? value > 0 : value < 0;

    return (
      <span className={`flex items-center gap-1 ${isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-muted-foreground'}`}>
        {isPositive ? <TrendingUp className="h-4 w-4" /> : isNegative ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
        {Math.abs(value).toFixed(1)}{unit}
      </span>
    );
  };

  return (
    <div className="h-full flex flex-col p-4">
      <h3 className="font-medium mb-4">Comparison</h3>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 rounded-lg bg-primary/10">
          <p className="text-xs text-muted-foreground mb-1">Selected</p>
          <p className="font-medium">{f1.date}</p>
          <p className="text-xs text-muted-foreground">{f1.time}</p>
        </div>
        <div className="flex items-center justify-center">
          <ChevronRight className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="text-center p-3 rounded-lg bg-secondary">
          <p className="text-xs text-muted-foreground mb-1">Compare</p>
          <p className="font-medium">{f2.date}</p>
          <p className="text-xs text-muted-foreground">{f2.time}</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Hashrate Comparison */}
        <div className="rounded-lg border p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Best Hashrate
          </h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <p className="text-lg font-bold">
                {entry1.bestHashrate?.hashrate.toFixed(1) ?? 'N/A'} GH/s
              </p>
              <p className="text-xs text-muted-foreground">
                {entry1.bestHashrate ? `${entry1.bestHashrate.frequency}MHz @ ${entry1.bestHashrate.voltage}mV` : '-'}
              </p>
            </div>
            <div className="flex items-center justify-center">
              <DiffIndicator value={comparison.hashrateDiff} unit=" GH/s" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">
                {entry2.bestHashrate?.hashrate.toFixed(1) ?? 'N/A'} GH/s
              </p>
              <p className="text-xs text-muted-foreground">
                {entry2.bestHashrate ? `${entry2.bestHashrate.frequency}MHz @ ${entry2.bestHashrate.voltage}mV` : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Efficiency Comparison */}
        <div className="rounded-lg border p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Best Efficiency
          </h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <p className="text-lg font-bold">
                {entry1.bestEfficiency?.efficiency.toFixed(2) ?? 'N/A'} J/TH
              </p>
              <p className="text-xs text-muted-foreground">
                {entry1.bestEfficiency ? `${entry1.bestEfficiency.hashrate.toFixed(1)} GH/s` : '-'}
              </p>
            </div>
            <div className="flex items-center justify-center">
              <DiffIndicator value={comparison.efficiencyDiff} unit=" J/TH" inverted />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">
                {entry2.bestEfficiency?.efficiency.toFixed(2) ?? 'N/A'} J/TH
              </p>
              <p className="text-xs text-muted-foreground">
                {entry2.bestEfficiency ? `${entry2.bestEfficiency.hashrate.toFixed(1)} GH/s` : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Test Summary */}
        <div className="rounded-lg border p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Test Summary
          </h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <p className="font-medium">{entry1.allResults.length} tests</p>
              <p className="text-xs text-muted-foreground">{entry1.benchmarkMode} mode</p>
            </div>
            <div className="flex items-center justify-center text-muted-foreground">
              vs
            </div>
            <div className="text-center">
              <p className="font-medium">{entry2.allResults.length} tests</p>
              <p className="text-xs text-muted-foreground">{entry2.benchmarkMode} mode</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
