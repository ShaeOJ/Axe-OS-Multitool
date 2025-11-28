import { useState, useEffect, useCallback } from 'react';
import { Store } from '@tauri-apps/plugin-store';
import type { MinerGroup, DashboardLayout } from '@/lib/types';

const GROUPS_KEY = 'axeos-miner-groups';
const LAYOUT_KEY = 'axeos-dashboard-layout';

// Check if we're running in Tauri environment
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

// Initialize store instance
let store: Store | null = null;

const getStore = async () => {
  if (!isTauri()) return null;
  if (!store) {
    store = await Store.load('dashboard.json');
  }
  return store;
};

export const defaultLayout: DashboardLayout = {
  cardSize: 'normal',
  showOfflineMiners: true,
  groupBy: 'none',
  sortBy: 'name',
  sortDirection: 'asc',
};

const defaultGroups: MinerGroup[] = [];

// Storage helpers
const loadFromStorage = async <T>(key: string, defaultValue: T): Promise<T> => {
  if (typeof window === 'undefined') return defaultValue;

  try {
    if (isTauri()) {
      const storeInstance = await getStore();
      if (storeInstance) {
        const stored = await storeInstance.get<T>(key);
        return stored ?? defaultValue;
      }
    }

    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.error(`Error loading ${key} from storage:`, error);
    return defaultValue;
  }
};

const saveToStorage = async <T>(key: string, value: T): Promise<void> => {
  if (typeof window === 'undefined') return;

  try {
    if (isTauri()) {
      const storeInstance = await getStore();
      if (storeInstance) {
        await storeInstance.set(key, value);
        await storeInstance.save();
        return;
      }
    }

    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to storage:`, error);
  }
};

export const useDashboardSettings = () => {
  const [groups, setGroups] = useState<MinerGroup[]>(defaultGroups);
  const [layout, setLayout] = useState<DashboardLayout>(defaultLayout);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      const [loadedGroups, loadedLayout] = await Promise.all([
        loadFromStorage<MinerGroup[]>(GROUPS_KEY, defaultGroups),
        loadFromStorage<DashboardLayout>(LAYOUT_KEY, defaultLayout),
      ]);
      setGroups(loadedGroups);
      setLayout({ ...defaultLayout, ...loadedLayout });
      setIsInitialized(true);
    };

    loadSettings();
  }, []);

  // Save groups when changed
  useEffect(() => {
    if (isInitialized) {
      saveToStorage(GROUPS_KEY, groups);
    }
  }, [groups, isInitialized]);

  // Save layout when changed
  useEffect(() => {
    if (isInitialized) {
      saveToStorage(LAYOUT_KEY, layout);
    }
  }, [layout, isInitialized]);

  // Group management
  const addGroup = useCallback((name: string, color: string) => {
    const newGroup: MinerGroup = {
      id: `group-${Date.now()}`,
      name,
      color,
      collapsed: false,
    };
    setGroups(prev => [...prev, newGroup]);
    return newGroup.id;
  }, []);

  const updateGroup = useCallback((id: string, updates: Partial<MinerGroup>) => {
    setGroups(prev =>
      prev.map(g => (g.id === id ? { ...g, ...updates } : g))
    );
  }, []);

  const deleteGroup = useCallback((id: string) => {
    setGroups(prev => prev.filter(g => g.id !== id));
  }, []);

  const toggleGroupCollapsed = useCallback((id: string) => {
    setGroups(prev =>
      prev.map(g => (g.id === id ? { ...g, collapsed: !g.collapsed } : g))
    );
  }, []);

  // Layout management
  const updateLayout = useCallback((updates: Partial<DashboardLayout>) => {
    setLayout(prev => ({ ...prev, ...updates }));
  }, []);

  const resetLayout = useCallback(() => {
    setLayout(defaultLayout);
  }, []);

  return {
    // Groups
    groups,
    addGroup,
    updateGroup,
    deleteGroup,
    toggleGroupCollapsed,
    // Layout
    layout,
    updateLayout,
    resetLayout,
    // State
    isInitialized,
  };
};
