'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import {
  LayoutGrid,
  LayoutList,
  Square,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  CheckSquare,
  Layers,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { DashboardLayout, CardSize } from '@/lib/types';

interface DashboardControlsProps {
  layout: DashboardLayout;
  onUpdateLayout: (updates: Partial<DashboardLayout>) => void;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  selectedCount: number;
}

const cardSizeIcons: Record<CardSize, React.ReactNode> = {
  compact: <LayoutList className="h-4 w-4" />,
  normal: <LayoutGrid className="h-4 w-4" />,
  expanded: <Square className="h-4 w-4" />,
};

const sortByLabels: Record<DashboardLayout['sortBy'], string> = {
  name: 'Name',
  hashrate: 'Hashrate',
  temperature: 'Temperature',
  power: 'Power',
  custom: 'Custom Order',
};

const groupByLabels: Record<DashboardLayout['groupBy'], string> = {
  none: 'No Grouping',
  group: 'By Group',
  status: 'By Status',
};

export function DashboardControls({
  layout,
  onUpdateLayout,
  selectionMode,
  onToggleSelectionMode,
  selectedCount,
}: DashboardControlsProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Selection Mode Toggle */}
      <Button
        variant={selectionMode ? 'default' : 'outline'}
        size="sm"
        onClick={onToggleSelectionMode}
      >
        <CheckSquare className="h-4 w-4 mr-2" />
        {selectionMode ? `${selectedCount} Selected` : 'Select'}
      </Button>

      {/* Card Size */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            {cardSizeIcons[layout.cardSize]}
            <span className="ml-2 hidden sm:inline">Size</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Card Size</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={layout.cardSize}
            onValueChange={(value) => onUpdateLayout({ cardSize: value as CardSize })}
          >
            <DropdownMenuRadioItem value="compact">
              <LayoutList className="h-4 w-4 mr-2" />
              Compact
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="normal">
              <LayoutGrid className="h-4 w-4 mr-2" />
              Normal
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="expanded">
              <Square className="h-4 w-4 mr-2" />
              Expanded
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sort By */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            {layout.sortDirection === 'asc' ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <ArrowDown className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">{sortByLabels[layout.sortBy]}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Sort By</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={layout.sortBy}
            onValueChange={(value) => onUpdateLayout({ sortBy: value as DashboardLayout['sortBy'] })}
          >
            <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="hashrate">Hashrate</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="temperature">Temperature</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="power">Power</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="custom">Custom Order</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() =>
              onUpdateLayout({
                sortDirection: layout.sortDirection === 'asc' ? 'desc' : 'asc',
              })
            }
          >
            <ArrowUpDown className="h-4 w-4 mr-2" />
            {layout.sortDirection === 'asc' ? 'Sort Descending' : 'Sort Ascending'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Group By */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Layers className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">{groupByLabels[layout.groupBy]}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Group By</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={layout.groupBy}
            onValueChange={(value) => onUpdateLayout({ groupBy: value as DashboardLayout['groupBy'] })}
          >
            <DropdownMenuRadioItem value="none">No Grouping</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="group">By Group</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="status">By Status (Online/Offline)</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Show/Hide Offline */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onUpdateLayout({ showOfflineMiners: !layout.showOfflineMiners })}
      >
        {layout.showOfflineMiners ? (
          <Eye className="h-4 w-4" />
        ) : (
          <EyeOff className="h-4 w-4" />
        )}
        <span className="ml-2 hidden sm:inline">
          {layout.showOfflineMiners ? 'Showing Offline' : 'Hiding Offline'}
        </span>
      </Button>
    </div>
  );
}
