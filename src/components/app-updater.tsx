'use client';

import { useEffect, useState } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Download, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Progress } from './ui/progress';

export function AppUpdater() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [updateInfo, setUpdateInfo] = useState<{ version: string; date: string; body: string } | null>(null);

  const checkForUpdates = async () => {
    // Only run in Tauri environment
    if (typeof window === 'undefined' || !('__TAURI__' in window)) {
      return;
    }

    setChecking(true);
    setError(null);

    try {
      const update = await check();

      if (update?.available) {
        setUpdateAvailable(true);
        setUpdateInfo({
          version: update.version,
          date: update.date || 'Unknown',
          body: update.body || 'No release notes available.',
        });
      } else {
        setUpdateAvailable(false);
      }
    } catch (err) {
      console.error('Error checking for updates:', err);
      setError(err instanceof Error ? err.message : 'Failed to check for updates');
    } finally {
      setChecking(false);
    }
  };

  const downloadAndInstall = async () => {
    if (typeof window === 'undefined' || !('__TAURI__' in window)) {
      return;
    }

    setDownloading(true);
    setError(null);

    try {
      const update = await check();

      if (!update?.available) {
        setError('No update available');
        setDownloading(false);
        return;
      }

      // Download and install the update
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            setDownloadProgress(0);
            break;
          case 'Progress':
            // Calculate progress based on chunk received
            if ('chunkLength' in event.data) {
              setDownloadProgress(Math.min(downloadProgress + 5, 95));
            }
            break;
          case 'Finished':
            setDownloadProgress(100);
            break;
        }
      });

      // Relaunch the app to apply the update
      await relaunch();
    } catch (err) {
      console.error('Error downloading update:', err);
      setError(err instanceof Error ? err.message : 'Failed to download update');
      setDownloading(false);
    }
  };

  useEffect(() => {
    // Check for updates on mount
    checkForUpdates();
  }, []);

  // Only render in Tauri environment
  if (typeof window === 'undefined' || !('__TAURI__' in window)) {
    return null;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTitle>Update Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={checkForUpdates}
          disabled={checking}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
          Try Again
        </Button>
      </Alert>
    );
  }

  if (updateAvailable && updateInfo) {
    return (
      <Alert className="m-4 border-primary">
        <Download className="h-4 w-4" />
        <AlertTitle>Update Available: v{updateInfo.version}</AlertTitle>
        <AlertDescription>
          <p className="mb-2">{updateInfo.body}</p>
          {downloading && (
            <div className="my-2">
              <Progress value={downloadProgress} className="w-full" />
              <p className="text-sm text-muted-foreground mt-1">
                Downloading: {Math.round(downloadProgress)}%
              </p>
            </div>
          )}
          <Button
            onClick={downloadAndInstall}
            disabled={downloading}
            className="mt-2"
          >
            {downloading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download & Install
              </>
            )}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex items-center justify-end p-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={checkForUpdates}
        disabled={checking}
      >
        {checking ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Checking...
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Check for Updates
          </>
        )}
      </Button>
    </div>
  );
}
