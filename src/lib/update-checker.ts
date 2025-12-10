/**
 * Update Checker Utility
 * Checks GitHub releases for new versions and notifies users
 */

// GitHub repository info
const GITHUB_OWNER = 'ShaeOJ';
const GITHUB_REPO = 'Axe-OS-Multitool';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
const RELEASES_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`;

// Current app version - should match tauri.conf.json
export const APP_VERSION = '1.8.1';

export interface ReleaseInfo {
  version: string;
  tagName: string;
  name: string;
  body: string;
  htmlUrl: string;
  publishedAt: string;
  assets: ReleaseAsset[];
}

export interface ReleaseAsset {
  name: string;
  downloadUrl: string;
  size: number;
}

export interface UpdateCheckResult {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string | null;
  releaseInfo: ReleaseInfo | null;
  error: string | null;
}

/**
 * Compare two semantic version strings
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1: string, v2: string): number {
  // Remove 'v' prefix if present
  const clean1 = v1.replace(/^v/, '');
  const clean2 = v2.replace(/^v/, '');

  const parts1 = clean1.split('.').map(Number);
  const parts2 = clean2.split('.').map(Number);

  // Pad arrays to same length
  const maxLength = Math.max(parts1.length, parts2.length);
  while (parts1.length < maxLength) parts1.push(0);
  while (parts2.length < maxLength) parts2.push(0);

  for (let i = 0; i < maxLength; i++) {
    if (parts1[i] > parts2[i]) return 1;
    if (parts1[i] < parts2[i]) return -1;
  }

  return 0;
}

/**
 * Fetch the latest release from GitHub
 */
async function fetchLatestRelease(): Promise<ReleaseInfo | null> {
  try {
    const response = await fetch(GITHUB_API_URL, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        // No auth needed for public repos
      },
      // Cache for 5 minutes to avoid rate limiting
      cache: 'default',
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log('[Update Checker] No releases found');
        return null;
      }
      throw new Error(`GitHub API returned ${response.status}`);
    }

    const data = await response.json();

    return {
      version: data.tag_name?.replace(/^v/, '') || '',
      tagName: data.tag_name || '',
      name: data.name || '',
      body: data.body || '',
      htmlUrl: data.html_url || RELEASES_URL,
      publishedAt: data.published_at || '',
      assets: (data.assets || []).map((asset: { name: string; browser_download_url: string; size: number }) => ({
        name: asset.name,
        downloadUrl: asset.browser_download_url,
        size: asset.size,
      })),
    };
  } catch (error) {
    console.error('[Update Checker] Failed to fetch release:', error);
    return null;
  }
}

/**
 * Check for updates
 */
export async function checkForUpdates(): Promise<UpdateCheckResult> {
  try {
    const releaseInfo = await fetchLatestRelease();

    if (!releaseInfo || !releaseInfo.version) {
      return {
        updateAvailable: false,
        currentVersion: APP_VERSION,
        latestVersion: null,
        releaseInfo: null,
        error: null,
      };
    }

    const comparison = compareVersions(releaseInfo.version, APP_VERSION);
    const updateAvailable = comparison > 0;

    console.log('[Update Checker] Version check:', {
      current: APP_VERSION,
      latest: releaseInfo.version,
      updateAvailable,
    });

    return {
      updateAvailable,
      currentVersion: APP_VERSION,
      latestVersion: releaseInfo.version,
      releaseInfo,
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Update Checker] Error:', message);
    return {
      updateAvailable: false,
      currentVersion: APP_VERSION,
      latestVersion: null,
      releaseInfo: null,
      error: message,
    };
  }
}

/**
 * Get the releases page URL
 */
export function getReleasesUrl(): string {
  return RELEASES_URL;
}

/**
 * Get download URL for a specific platform
 */
export function getDownloadUrlForPlatform(releaseInfo: ReleaseInfo): string | null {
  const platform = getPlatform();

  for (const asset of releaseInfo.assets) {
    const name = asset.name.toLowerCase();

    if (platform === 'windows' && (name.endsWith('.msi') || name.endsWith('.exe'))) {
      return asset.downloadUrl;
    }
    if (platform === 'macos' && (name.endsWith('.dmg') || name.endsWith('.app.tar.gz'))) {
      return asset.downloadUrl;
    }
    if (platform === 'linux' && (name.endsWith('.deb') || name.endsWith('.appimage'))) {
      return asset.downloadUrl;
    }
  }

  return null;
}

/**
 * Detect current platform
 */
function getPlatform(): 'windows' | 'macos' | 'linux' | 'unknown' {
  if (typeof navigator === 'undefined') return 'unknown';

  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('win')) return 'windows';
  if (ua.includes('mac')) return 'macos';
  if (ua.includes('linux')) return 'linux';
  return 'unknown';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format release date for display
 */
export function formatReleaseDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

// Storage key for dismissed updates
const DISMISSED_UPDATE_KEY = 'dismissed_update_version';

/**
 * Check if user has dismissed this version's update notification
 */
export function isUpdateDismissed(version: string): boolean {
  if (typeof localStorage === 'undefined') return false;
  const dismissed = localStorage.getItem(DISMISSED_UPDATE_KEY);
  return dismissed === version;
}

/**
 * Dismiss update notification for a specific version
 */
export function dismissUpdate(version: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(DISMISSED_UPDATE_KEY, version);
}

/**
 * Clear dismissed update (show notification again)
 */
export function clearDismissedUpdate(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(DISMISSED_UPDATE_KEY);
}
