'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  FolderPlus,
  Pencil,
  Trash2,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { MinerGroup, MinerConfig } from '@/lib/types';

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
];

interface GroupManagerProps {
  groups: MinerGroup[];
  miners: MinerConfig[];
  onAddGroup: (name: string, color: string) => string;
  onUpdateGroup: (id: string, updates: Partial<MinerGroup>) => void;
  onDeleteGroup: (id: string) => void;
  onAssignMinerToGroup: (minerIp: string, groupId: string | undefined) => void;
}

export function GroupManager({
  groups,
  miners,
  onAddGroup,
  onUpdateGroup,
  onDeleteGroup,
  onAssignMinerToGroup,
}: GroupManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<MinerGroup | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState(PRESET_COLORS[0]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const handleAddGroup = () => {
    if (newGroupName.trim()) {
      onAddGroup(newGroupName.trim(), newGroupColor);
      setNewGroupName('');
      setNewGroupColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    }
  };

  const handleSaveEdit = () => {
    if (editingGroup && newGroupName.trim()) {
      onUpdateGroup(editingGroup.id, {
        name: newGroupName.trim(),
        color: newGroupColor,
      });
      setEditingGroup(null);
      setNewGroupName('');
    }
  };

  const startEditing = (group: MinerGroup) => {
    setEditingGroup(group);
    setNewGroupName(group.name);
    setNewGroupColor(group.color);
  };

  const cancelEditing = () => {
    setEditingGroup(null);
    setNewGroupName('');
  };

  const getMinersInGroup = (groupId: string) => {
    return miners.filter(m => m.groupId === groupId);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FolderPlus className="h-4 w-4 mr-2" />
          Manage Groups
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Miner Groups</DialogTitle>
          <DialogDescription>
            Create and manage groups to organize your miners.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2">
          {/* Add/Edit Group Form */}
          <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
            <Label>{editingGroup ? 'Edit Group' : 'Add New Group'}</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Group name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={editingGroup ? handleSaveEdit : handleAddGroup}
                disabled={!newGroupName.trim()}
              >
                {editingGroup ? 'Save' : <Plus className="h-4 w-4" />}
              </Button>
              {editingGroup && (
                <Button variant="ghost" onClick={cancelEditing}>
                  Cancel
                </Button>
              )}
            </div>

            {/* Color Picker */}
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    newGroupColor === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setNewGroupColor(color)}
                />
              ))}
            </div>
          </div>

          {/* Groups List */}
          <div className="space-y-2">
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No groups yet. Create one above!
              </p>
            ) : (
              groups.map(group => {
                const groupMiners = getMinersInGroup(group.id);
                const availableMiners = miners.filter(m => m.groupId !== group.id);
                const isExpanded = expandedGroup === group.id;

                return (
                  <Collapsible
                    key={group.id}
                    open={isExpanded}
                    onOpenChange={(open) => setExpandedGroup(open ? group.id : null)}
                  >
                    <div className="rounded-lg border">
                      <div className="flex items-center justify-between p-3">
                        <CollapsibleTrigger asChild>
                          <button className="flex items-center gap-3 flex-1 text-left">
                            <div
                              className="w-4 h-4 rounded-full flex-shrink-0"
                              style={{ backgroundColor: group.color }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{group.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {groupMiners.length} miner{groupMiners.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        </CollapsibleTrigger>
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEditing(group)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => onDeleteGroup(group.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <CollapsibleContent>
                        <div className="px-3 pb-3 space-y-2 border-t pt-2">
                          {/* Current miners in group */}
                          {groupMiners.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">In this group:</p>
                              {groupMiners.map(miner => (
                                <div
                                  key={miner.ip}
                                  className="flex items-center justify-between text-sm py-1 px-2 rounded bg-muted/50"
                                >
                                  <span className="truncate">{miner.name || miner.ip}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => onAssignMinerToGroup(miner.ip, undefined)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Available miners to add */}
                          {availableMiners.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">Add miners:</p>
                              <div className="max-h-[150px] overflow-y-auto">
                                {availableMiners.map(miner => (
                                  <div
                                    key={miner.ip}
                                    className="flex items-center gap-2 text-sm py-1 px-2 rounded hover:bg-muted/50 cursor-pointer"
                                    onClick={() => onAssignMinerToGroup(miner.ip, group.id)}
                                  >
                                    <Checkbox
                                      checked={false}
                                      className="pointer-events-none"
                                    />
                                    <span className="truncate">{miner.name || miner.ip}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {groupMiners.length === 0 && availableMiners.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-2">
                              No miners available
                            </p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Small badge component to show group assignment
export function GroupBadge({
  group,
  onRemove,
}: {
  group: MinerGroup | undefined;
  onRemove?: () => void;
}) {
  if (!group) return null;

  return (
    <Badge
      variant="outline"
      className="text-xs gap-1"
      style={{ borderColor: group.color, color: group.color }}
    >
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: group.color }}
      />
      {group.name}
      {onRemove && (
        <button onClick={onRemove} className="ml-1 hover:opacity-70">
          ×
        </button>
      )}
    </Badge>
  );
}
