/**
 * Utility functions for checking AxeOS firmware updates
 */

export interface GitHubRelease {
  tag_name: string;
  name: string;
  html_url: string;
  published_at: string;
  body: string;
  prerelease: boolean;
  draft: boolean;
}

export interface FirmwareCheckResult {
  success: boolean;
  latestVersion?: string;
  releaseUrl?: string;
  releaseName?: string;
  publishedAt?: string;
  releaseNotes?: string;
  error?: string;
}

export interface MinerUpdateStatus {
  ip: string;
  name: string;
  currentVersion: string | null;
  latestVersion: string | null;
  hasUpdate: boolean;
  releaseUrl?: string;
}

// AxeOS GitHub repository
const AXEOS_REPO = 'skot/ESP-Miner';
const GITHUB_API_URL = `https://api.github.com/repos/${AXEOS_REPO}/releases/latest`;

export async function checkLatestAxeOSRelease(): Promise<FirmwareCheckResult> {
  try {
    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch(GITHUB_API_URL, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 403) {
        return {
          success: false,
          error: 'GitHub API rate limit exceeded. Please try again later.',
        };
      }
      return {
        success: false,
        error: `Failed to fetch release info: ${response.statusText}`,
      };
    }

    const release: GitHubRelease = await response.json();

    // Skip draft or prerelease versions
    if (release.draft || release.prerelease) {
      return {
        success: false,
        error: 'No stable release found.',
      };
    }

    return {
      success: true,
      latestVersion: release.tag_name,
      releaseUrl: release.html_url,
      releaseName: release.name,
      publishedAt: release.published_at,
      releaseNotes: release.body,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: 'Request timed out. Please check your internet connection.',
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check for updates',
    };
  }
}

/**
 * Parse version string to comparable numbers
 * Handles formats like "v2.4.0", "2.4.0", "v2.4.0-beta"
 */
export function parseVersion(version: string | null | undefined): number[] {
  if (!version) return [0, 0, 0];

  // Remove 'v' prefix and any suffix like '-beta', '-rc1', etc.
  const cleanVersion = version.replace(/^v/i, '').split('-')[0];

  const parts = cleanVersion.split('.').map(part => {
    const num = parseInt(part, 10);
    return isNaN(num) ? 0 : num;
  });

  // Ensure we have at least 3 parts
  while (parts.length < 3) {
    parts.push(0);
  }

  return parts.slice(0, 3);
}

/**
 * Compare two version strings
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
export function compareVersions(v1: string | null | undefined, v2: string | null | undefined): number {
  const parts1 = parseVersion(v1);
  const parts2 = parseVersion(v2);

  for (let i = 0; i < 3; i++) {
    if (parts1[i] > parts2[i]) return 1;
    if (parts1[i] < parts2[i]) return -1;
  }

  return 0;
}

/**
 * Check if a miner needs an update
 */
export function needsUpdate(currentVersion: string | null | undefined, latestVersion: string | null | undefined): boolean {
  if (!currentVersion || !latestVersion) return false;
  return compareVersions(latestVersion, currentVersion) > 0;
}

/**
 * Format version for display
 */
export function formatVersion(version: string | null | undefined): string {
  if (!version) return 'Unknown';
  return version.startsWith('v') ? version : `v${version}`;
}

/**
 * Format date for display
 */
export function formatReleaseDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Unknown';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Unknown';
  }
}
