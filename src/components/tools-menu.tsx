'use client';

import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { openToolsWindow } from '@/lib/tauri-api';

export function ToolsMenu() {
  return (
    <Button variant="outline" size="icon" onClick={() => openToolsWindow()}>
      <Settings className="h-4 w-4" />
      <span className="sr-only">Tools & Settings</span>
    </Button>
  );
}
