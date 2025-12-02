'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Download, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  checkForUpdates,
  dismissUpdate,
  isUpdateDismissed,
  getReleasesUrl,
  formatReleaseDate,
  APP_VERSION,
  type UpdateCheckResult,
} from '@/lib/update-checker';
import { openUrl } from '@/lib/tauri-api';

// Check for updates every 6 hours
const UPDATE_CHECK_INTERVAL = 6 * 60 * 60 * 1000;

export function UpdateBanner() {
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const performUpdateCheck = useCallback(async () => {
    setIsChecking(true);
    try {
      const result = await checkForUpdates();
      setUpdateResult(result);

      // Show banner if update available and not dismissed
      if (result.updateAvailable && result.latestVersion) {
        const dismissed = isUpdateDismissed(result.latestVersion);
        setIsVisible(!dismissed);
      } else {
        setIsVisible(false);
      }
    } catch (error) {
      console.error('[Update Banner] Check failed:', error);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    // Initial check after a short delay (let app load first)
    const initialTimeout = setTimeout(() => {
      performUpdateCheck();
    }, 3000);

    // Periodic checks
    const intervalId = setInterval(() => {
      performUpdateCheck();
    }, UPDATE_CHECK_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
    };
  }, [performUpdateCheck]);

  const handleDismiss = () => {
    if (updateResult?.latestVersion) {
      dismissUpdate(updateResult.latestVersion);
    }
    setIsVisible(false);
  };

  const handleOpenReleases = async () => {
    const url = updateResult?.releaseInfo?.htmlUrl || getReleasesUrl();
    await openUrl(url);
  };

  if (!isVisible || !updateResult?.updateAvailable) {
    return null;
  }

  const releaseInfo = updateResult.releaseInfo;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-primary/90 to-primary text-primary-foreground shadow-lg">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          {/* Main content */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              <Download className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">
                  Update Available: v{updateResult.latestVersion}
                </span>
                <span className="text-primary-foreground/70 text-sm">
                  (Current: v{APP_VERSION})
                </span>
                {releaseInfo?.publishedAt && (
                  <span className="text-primary-foreground/70 text-sm hidden sm:inline">
                    &middot; Released {formatReleaseDate(releaseInfo.publishedAt)}
                  </span>
                )}
              </div>
              {releaseInfo?.name && releaseInfo.name !== `v${updateResult.latestVersion}` && (
                <p className="text-sm text-primary-foreground/80 truncate">
                  {releaseInfo.name}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {releaseInfo?.body && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-primary-foreground hover:bg-primary-foreground/20 hidden sm:flex"
              >
                {isExpanded ? 'Hide' : 'Details'}
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleOpenReleases}
              className="gap-1"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="text-primary-foreground hover:bg-primary-foreground/20 h-8 w-8"
              title="Dismiss (won't show again for this version)"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Expanded release notes */}
        {isExpanded && releaseInfo?.body && (
          <div className="mt-3 pt-3 border-t border-primary-foreground/20">
            <p className="text-sm font-medium mb-2">Release Notes:</p>
            <div className="text-sm text-primary-foreground/90 max-h-40 overflow-y-auto whitespace-pre-wrap bg-primary-foreground/10 rounded p-3">
              {releaseInfo.body}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Version display component for settings/about page
 */
export function VersionInfo() {
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkNow = async () => {
    setIsChecking(true);
    try {
      const result = await checkForUpdates();
      setUpdateResult(result);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkNow();
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Version:</span>
        <span className="font-mono">v{APP_VERSION}</span>
        {updateResult?.updateAvailable && (
          <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
            Update available
          </span>
        )}
      </div>

      {updateResult?.latestVersion && updateResult.updateAvailable && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Latest:</span>
          <span className="font-mono">v{updateResult.latestVersion}</span>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0"
            onClick={() => openUrl(getReleasesUrl())}
          >
            View releases
          </Button>
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={checkNow}
        disabled={isChecking}
        className="gap-2"
      >
        <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
        {isChecking ? 'Checking...' : 'Check for updates'}
      </Button>

      {updateResult?.error && (
        <p className="text-sm text-destructive">
          Failed to check: {updateResult.error}
        </p>
      )}
    </div>
  );
}
