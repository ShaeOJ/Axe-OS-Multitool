'use client';

import { useState, useEffect, useCallback, Component, ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import type { MinerConfig } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Search,
  Loader2,
  Wifi,
  WifiOff,
  Plus,
  Check,
  AlertCircle,
  RefreshCw,
  Pencil,
} from 'lucide-react';
import {
  getLocalSubnet,
  scanNetwork,
  type DiscoveredMiner,
} from '@/lib/tauri-api';

// Expanded color palette for miner cards - works in both light and dark modes
const ACCENT_COLORS = [
    // Greens (default theme colors)
    "hsl(var(--miner-green))",
    "hsl(var(--miner-emerald))",
    "hsl(var(--miner-teal))",
    "hsl(var(--miner-lime))",
    // Blues
    "hsl(var(--miner-cyan))",
    "hsl(var(--miner-sky))",
    "hsl(var(--miner-blue))",
    "hsl(var(--miner-indigo))",
    // Purples
    "hsl(var(--miner-violet))",
    "hsl(var(--miner-purple))",
    "hsl(var(--miner-fuchsia))",
    // Pinks & Reds
    "hsl(var(--miner-pink))",
    "hsl(var(--miner-rose))",
    "hsl(var(--miner-red))",
    // Warm colors
    "hsl(var(--miner-orange))",
    "hsl(var(--miner-amber))",
    "hsl(var(--miner-yellow))",
    // Neutral
    "hsl(var(--miner-slate))",
];

// Error boundary to catch rendering errors
class DialogErrorBoundary extends Component<
  { children: ReactNode; onError: (error: string) => void },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: ReactNode; onError: (error: string) => void }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-destructive">
          <AlertCircle className="h-6 w-6 mb-2" />
          <p>Something went wrong: {this.state.error}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const formSchema = z.object({
  ipAddress: z.string().min(1, { message: 'IP address is required.' }).refine((ip) => {
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    return ipRegex.test(ip);
  }, { message: 'Please enter a valid IPv4 address.' }),
  name: z.string().optional(),
  accentColor: z.string().optional(),
});

type AddMinerDialogProps = {
  onAddMiner: (minerConfig: Omit<MinerConfig, 'tunerSettings'>) => void;
  onAddMiners?: (miners: { ip: string; name: string; accentColor: string }[]) => void;
  existingMinerIps?: string[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

// State for discovered miner customization
interface DiscoveredMinerConfig extends DiscoveredMiner {
  customName: string;
  accentColor: string;
}

export function AddMinerDialog({
  onAddMiner,
  onAddMiners,
  existingMinerIps = [],
  isOpen,
  onOpenChange
}: AddMinerDialogProps) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<string>('manual');
  const [error, setError] = useState<string | null>(null);

  // Network discovery state
  const [subnet, setSubnet] = useState('192.168.1');
  const [startIp, setStartIp] = useState(1);
  const [endIp, setEndIp] = useState(254);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [discoveredMiners, setDiscoveredMiners] = useState<DiscoveredMinerConfig[]>([]);
  const [selectedMiners, setSelectedMiners] = useState<string[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [editingMiner, setEditingMiner] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ipAddress: '',
      name: '',
      accentColor: ACCENT_COLORS[0],
    },
  });

  // Auto-detect subnet on open
  useEffect(() => {
    if (isOpen && activeTab === 'discover') {
      getLocalSubnet()
        .then((detectedSubnet) => {
          if (detectedSubnet) {
            setSubnet(detectedSubnet);
          }
        })
        .catch((err) => {
          console.error('Failed to detect local subnet:', err);
        });
    }
  }, [isOpen, activeTab]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setDiscoveredMiners([]);
      setSelectedMiners([]);
      setError(null);
      setHasScanned(false);
      setScanProgress(0);
      setEditingMiner(null);
      setActiveTab('manual');
    }
  }, [isOpen, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    onAddMiner({
        ip: values.ipAddress,
        name: values.name || '',
        accentColor: values.accentColor || ACCENT_COLORS[0],
    });
    form.reset();
    onOpenChange(false);
  }

  const handleScan = useCallback(async () => {
    setIsScanning(true);
    setError(null);
    setDiscoveredMiners([]);
    setSelectedMiners([]);
    setScanProgress(0);

    // Simulate progress (actual scan is done in one go)
    const progressInterval = setInterval(() => {
      setScanProgress((prev) => Math.min(prev + 5, 90));
    }, 200);

    try {
      const miners = await scanNetwork(subnet, startIp, endIp);

      setScanProgress(100);

      // Filter out already existing miners and add customization fields
      const newMiners: DiscoveredMinerConfig[] = miners
        .filter((m) => !existingMinerIps.includes(m.ip))
        .map((m, index) => ({
          ...m,
          customName: m.hostname || m.model || m.ip,
          accentColor: ACCENT_COLORS[index % ACCENT_COLORS.length],
        }));

      setDiscoveredMiners(newMiners);
      setHasScanned(true);

      // Auto-select all new miners
      setSelectedMiners(newMiners.map((m) => m.ip));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan network');
    } finally {
      clearInterval(progressInterval);
      setIsScanning(false);
    }
  }, [subnet, startIp, endIp, existingMinerIps]);

  const toggleMinerSelection = (ip: string) => {
    setSelectedMiners((prev) =>
      prev.includes(ip)
        ? prev.filter((i) => i !== ip)
        : [...prev, ip]
    );
  };

  const updateDiscoveredMiner = (ip: string, updates: Partial<DiscoveredMinerConfig>) => {
    setDiscoveredMiners((prev) =>
      prev.map((m) => (m.ip === ip ? { ...m, ...updates } : m))
    );
  };

  const handleAddSelected = () => {
    try {
      const minersToAdd = discoveredMiners
        .filter((m) => selectedMiners.includes(m.ip))
        .map((m) => ({
          ip: m.ip,
          name: m.customName,
          accentColor: m.accentColor,
        }));

      // Close dialog first to prevent state issues
      onOpenChange(false);

      // Then add miners after a brief delay to let dialog close
      setTimeout(() => {
        try {
          if (onAddMiners) {
            onAddMiners(minersToAdd);
          } else {
            // Fallback: add one at a time
            minersToAdd.forEach((m) => {
              onAddMiner({ ip: m.ip, name: m.name, accentColor: m.accentColor });
            });
          }
        } catch (err) {
          console.error('Failed to add miners:', err);
        }
      }, 100);
    } catch (err) {
      console.error('Failed to add miners:', err);
      setError(err instanceof Error ? err.message : 'Failed to add miners');
    }
  };

  const ColorPicker = ({
    value,
    onChange,
    size = 'md'
  }: {
    value: string;
    onChange: (color: string) => void;
    size?: 'sm' | 'md';
  }) => (
    <div className={cn("flex flex-wrap gap-1", size === 'sm' ? 'max-w-[200px]' : '')}>
      {ACCENT_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          className={cn(
            "rounded-full border-2 border-transparent cursor-pointer transition-all",
            size === 'sm' ? "h-5 w-5" : "h-8 w-8",
            value === color && "ring-2 ring-ring ring-offset-1 ring-offset-background"
          )}
          style={{ backgroundColor: color }}
          onClick={() => onChange(color)}
        />
      ))}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={cn("w-full max-w-lg overflow-y-auto max-h-[90vh]", { "max-w-[95vw]": isMobile })}>
        <DialogErrorBoundary onError={(err) => setError(err)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Miner
            </DialogTitle>
            <DialogDescription>
              Add a miner manually or discover miners on your network.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <Pencil className="h-4 w-4" />
                Manual
              </TabsTrigger>
              <TabsTrigger value="discover" className="flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                Discover
              </TabsTrigger>
            </TabsList>

            {/* Manual Add Tab */}
            <TabsContent value="manual" className="space-y-4 mt-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="ipAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Miner IP Address</FormLabel>
                        <FormControl>
                          <Input placeholder="192.168.1.100" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Miner Name (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="My First Miner" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="accentColor"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Accent Color</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-wrap gap-2"
                          >
                            {ACCENT_COLORS.map((color) => (
                              <FormItem key={color} className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value={color} className="sr-only" />
                                </FormControl>
                                <FormLabel
                                  className={cn(
                                      "h-8 w-8 rounded-full border-2 border-transparent cursor-pointer",
                                      field.value === color && "ring-2 ring-ring ring-offset-2 ring-offset-background"
                                  )}
                                  style={{ backgroundColor: color }}
                                />
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit">Add Miner</Button>
                  </DialogFooter>
                </form>
              </Form>
            </TabsContent>

            {/* Network Discovery Tab */}
            <TabsContent value="discover" className="space-y-4 mt-4">
              {/* Subnet configuration */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3 sm:col-span-1">
                  <Label htmlFor="subnet">Subnet</Label>
                  <Input
                    id="subnet"
                    value={subnet}
                    onChange={(e) => setSubnet(e.target.value)}
                    placeholder="192.168.1"
                    disabled={isScanning}
                  />
                </div>
                <div>
                  <Label htmlFor="startIp">Start IP</Label>
                  <Input
                    id="startIp"
                    type="number"
                    min={1}
                    max={254}
                    value={startIp}
                    onChange={(e) => setStartIp(parseInt(e.target.value) || 1)}
                    disabled={isScanning}
                  />
                </div>
                <div>
                  <Label htmlFor="endIp">End IP</Label>
                  <Input
                    id="endIp"
                    type="number"
                    min={1}
                    max={254}
                    value={endIp}
                    onChange={(e) => setEndIp(parseInt(e.target.value) || 254)}
                    disabled={isScanning}
                  />
                </div>
              </div>

              {/* Scan button */}
              <Button
                onClick={handleScan}
                disabled={isScanning}
                className="w-full"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning {subnet}.{startIp}-{endIp}...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    {hasScanned ? 'Scan Again' : 'Start Scan'}
                  </>
                )}
              </Button>

              {/* Progress bar */}
              {isScanning && (
                <div className="space-y-2">
                  <Progress value={scanProgress} />
                  <p className="text-xs text-muted-foreground text-center">
                    Scanning {endIp - startIp + 1} IP addresses...
                  </p>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* Results */}
              {hasScanned && !isScanning && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">
                      Found {discoveredMiners.length} miner(s)
                    </h4>
                    {discoveredMiners.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (selectedMiners.length === discoveredMiners.length) {
                            setSelectedMiners([]);
                          } else {
                            setSelectedMiners(discoveredMiners.map((m) => m.ip));
                          }
                        }}
                      >
                        {selectedMiners.length === discoveredMiners.length
                          ? 'Deselect All'
                          : 'Select All'}
                      </Button>
                    )}
                  </div>

                  {discoveredMiners.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <WifiOff className="h-10 w-10 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">
                        No new miners found on the network.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Make sure your miners are powered on and connected.
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto rounded-md border">
                      {discoveredMiners.map((miner) => {
                        const isSelected = selectedMiners.includes(miner.ip);
                        const isEditing = editingMiner === miner.ip;

                        return (
                          <div
                            key={miner.ip}
                            className={cn(
                              "border-b p-3 last:border-b-0",
                              isSelected ? 'bg-muted/30' : ''
                            )}
                          >
                            <div
                              className="flex items-center gap-3 cursor-pointer"
                              onClick={() => toggleMinerSelection(miner.ip)}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleMinerSelection(miner.ip)}
                              />
                              <div
                                className="w-4 h-4 rounded-full shrink-0"
                                style={{ backgroundColor: miner.accentColor }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm">{miner.ip}</span>
                                  {miner.model && (
                                    <Badge variant="secondary" className="text-xs">
                                      {miner.model}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {miner.customName}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingMiner(isEditing ? null : miner.ip);
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </div>

                            {/* Expanded editing section */}
                            {isEditing && (
                              <div className="mt-3 pt-3 border-t space-y-3" onClick={(e) => e.stopPropagation()}>
                                <div>
                                  <Label className="text-xs">Name</Label>
                                  <Input
                                    value={miner.customName}
                                    onChange={(e) => updateDiscoveredMiner(miner.ip, { customName: e.target.value })}
                                    placeholder="Miner name"
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Color</Label>
                                  <ColorPicker
                                    value={miner.accentColor}
                                    onChange={(color) => updateDiscoveredMiner(miner.ip, { accentColor: color })}
                                    size="sm"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add button */}
                  {discoveredMiners.length > 0 && selectedMiners.length > 0 && (
                    <Button onClick={handleAddSelected} className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Add {selectedMiners.length} Miner(s)
                    </Button>
                  )}
                </div>
              )}

              {/* Hint when not scanned */}
              {!hasScanned && !isScanning && (
                <div className="flex items-center gap-2 rounded-md bg-muted p-3">
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    Click "Start Scan" to discover miners on your network. The scan checks
                    for AxeOS API endpoints on each IP address.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogErrorBoundary>
      </DialogContent>
    </Dialog>
  );
}
