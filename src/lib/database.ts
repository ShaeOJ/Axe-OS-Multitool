import Database from '@tauri-apps/plugin-sql';
import type { MinerDataPoint } from './types';

let db: Database | null = null;
let dbInitPromise: Promise<Database | null> | null = null;

// Check if we're running in Tauri environment
const isTauri = () => {
  return typeof window !== 'undefined' && ('__TAURI__' in window || '__TAURI_INTERNALS__' in window);
};

// Operation queue to serialize database operations and prevent locking
type QueuedOperation<T> = {
  operation: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

const operationQueue: QueuedOperation<unknown>[] = [];
let isProcessingQueue = false;

async function processQueue(): Promise<void> {
  if (isProcessingQueue || operationQueue.length === 0) return;

  isProcessingQueue = true;

  while (operationQueue.length > 0) {
    const item = operationQueue.shift();
    if (!item) continue;

    try {
      const result = await item.operation();
      item.resolve(result);
    } catch (error) {
      item.reject(error);
    }
  }

  isProcessingQueue = false;
}

function queueOperation<T>(operation: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    operationQueue.push({
      operation,
      resolve: resolve as (value: unknown) => void,
      reject,
    });
    processQueue();
  });
}

// Pending inserts queue for batching
let pendingInserts: { minerIp: string; dataPoint: MinerDataPoint }[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;
const BATCH_DELAY_MS = 3000; // Wait 3 seconds before flushing batch

/**
 * Initialize the database connection and create tables if they don't exist
 */
export async function initDatabase(): Promise<Database | null> {
  if (!isTauri()) {
    console.log('[Database] Not in Tauri environment, skipping database initialization');
    return null;
  }

  if (db) {
    return db;
  }

  // Prevent multiple concurrent initializations
  if (dbInitPromise) {
    return dbInitPromise;
  }

  dbInitPromise = (async () => {
    try {
      // Load SQLite database - this creates the file if it doesn't exist
      db = await Database.load('sqlite:axeos_data.db');

      // Enable WAL mode for better concurrent read/write performance
      await db.execute('PRAGMA journal_mode = WAL');
      // Set synchronous to NORMAL for better performance (still safe with WAL)
      await db.execute('PRAGMA synchronous = NORMAL');
      // Increase cache size for better performance
      await db.execute('PRAGMA cache_size = 10000');
      // Wait up to 10 seconds if database is locked instead of failing immediately
      await db.execute('PRAGMA busy_timeout = 10000');
      // Use memory-mapped I/O for better performance
      await db.execute('PRAGMA mmap_size = 268435456');

      // Create tables if they don't exist
      await db.execute(`
        CREATE TABLE IF NOT EXISTS miner_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          miner_ip TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          hashrate REAL NOT NULL,
          temperature REAL NOT NULL,
          voltage REAL,
          power REAL,
          frequency REAL,
          created_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
      `);

      // Create index for faster queries
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_miner_history_ip_timestamp
        ON miner_history(miner_ip, timestamp DESC)
      `);

      console.log('[Database] Initialized successfully with WAL mode');
      return db;
    } catch (error) {
      console.error('[Database] Failed to initialize:', error);
      dbInitPromise = null;
      return null;
    }
  })();

  return dbInitPromise;
}

/**
 * Flush all pending inserts to the database in a single transaction
 */
async function flushPendingInserts(): Promise<void> {
  if (pendingInserts.length === 0) return;

  const insertsToProcess = [...pendingInserts];
  pendingInserts = [];
  flushTimeout = null;

  await queueOperation(async () => {
    const database = await initDatabase();
    if (!database) {
      // Put back in queue if no database
      pendingInserts = [...insertsToProcess, ...pendingInserts];
      return;
    }

    try {
      // Use a single INSERT with multiple values for better performance
      // SQLite supports up to 500 values per INSERT, but we'll batch smaller
      const batchSize = 50;

      for (let i = 0; i < insertsToProcess.length; i += batchSize) {
        const batch = insertsToProcess.slice(i, i + batchSize);

        // Build a single INSERT statement with multiple value sets
        const placeholders = batch.map((_, idx) => {
          const base = idx * 7;
          return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`;
        }).join(', ');

        const values = batch.flatMap(({ minerIp, dataPoint }) => [
          minerIp,
          dataPoint.time,
          dataPoint.hashrate,
          dataPoint.temperature,
          dataPoint.voltage ?? null,
          dataPoint.power ?? null,
          dataPoint.frequency ?? null,
        ]);

        await database.execute(
          `INSERT INTO miner_history (miner_ip, timestamp, hashrate, temperature, voltage, power, frequency)
           VALUES ${placeholders}`,
          values
        );
      }

      console.log(`[Database] Flushed ${insertsToProcess.length} data points`);
    } catch (error) {
      // Put failed inserts back in queue for retry
      pendingInserts = [...insertsToProcess, ...pendingInserts];
      console.error('[Database] Failed to flush data points:', error);
    }
  });
}

/**
 * Save a data point to the database (batched for performance)
 */
export async function saveDataPoint(minerIp: string, dataPoint: MinerDataPoint): Promise<void> {
  if (!isTauri()) return;

  // Add to pending queue
  pendingInserts.push({ minerIp, dataPoint });

  // Schedule flush if not already scheduled
  if (!flushTimeout) {
    flushTimeout = setTimeout(() => {
      flushPendingInserts().catch(console.error);
    }, BATCH_DELAY_MS);
  }
}

/**
 * Save multiple data points in a batch (more efficient)
 */
export async function saveDataPoints(minerIp: string, dataPoints: MinerDataPoint[]): Promise<void> {
  if (!isTauri() || dataPoints.length === 0) return;

  // Add all to pending queue
  for (const dataPoint of dataPoints) {
    pendingInserts.push({ minerIp, dataPoint });
  }

  // Flush immediately for batch saves
  await flushPendingInserts();
}

/**
 * Load history data for a miner
 * @param minerIp - The miner's IP address
 * @param hoursBack - How many hours of data to load (default: 24)
 * @param maxPoints - Maximum number of points to return (default: 5760 = 24 hours at 15s intervals)
 */
export async function loadHistory(
  minerIp: string,
  hoursBack: number = 24,
  maxPoints: number = 5760
): Promise<MinerDataPoint[]> {
  if (!isTauri()) return [];

  return queueOperation(async () => {
    const database = await initDatabase();
    if (!database) return [];

    try {
      const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);

      const result = await database.select<{
        timestamp: number;
        hashrate: number;
        temperature: number;
        voltage: number | null;
        power: number | null;
        frequency: number | null;
      }[]>(
        `SELECT timestamp, hashrate, temperature, voltage, power, frequency
         FROM miner_history
         WHERE miner_ip = $1 AND timestamp > $2
         ORDER BY timestamp ASC
         LIMIT $3`,
        [minerIp, cutoffTime, maxPoints]
      );

      return result.map(row => ({
        time: row.timestamp,
        hashrate: row.hashrate,
        temperature: row.temperature,
        voltage: row.voltage ?? undefined,
        power: row.power ?? undefined,
        frequency: row.frequency ?? undefined,
      }));
    } catch (error) {
      console.error('[Database] Failed to load history:', error);
      return [];
    }
  });
}

/**
 * Load history data for multiple miners
 */
export async function loadAllMinersHistory(
  minerIps: string[],
  hoursBack: number = 24
): Promise<Record<string, MinerDataPoint[]>> {
  if (!isTauri() || minerIps.length === 0) return {};

  return queueOperation(async () => {
    const database = await initDatabase();
    if (!database) return {};

    const result: Record<string, MinerDataPoint[]> = {};
    const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);

    try {
      // Load all miners in a single query for better performance
      const placeholders = minerIps.map((_, i) => `$${i + 1}`).join(', ');

      const rows = await database.select<{
        miner_ip: string;
        timestamp: number;
        hashrate: number;
        temperature: number;
        voltage: number | null;
        power: number | null;
        frequency: number | null;
      }[]>(
        `SELECT miner_ip, timestamp, hashrate, temperature, voltage, power, frequency
         FROM miner_history
         WHERE miner_ip IN (${placeholders}) AND timestamp > $${minerIps.length + 1}
         ORDER BY miner_ip, timestamp ASC`,
        [...minerIps, cutoffTime]
      );

      // Initialize empty arrays for all miners
      for (const ip of minerIps) {
        result[ip] = [];
      }

      // Group results by miner IP
      for (const row of rows) {
        if (!result[row.miner_ip]) {
          result[row.miner_ip] = [];
        }
        result[row.miner_ip].push({
          time: row.timestamp,
          hashrate: row.hashrate,
          temperature: row.temperature,
          voltage: row.voltage ?? undefined,
          power: row.power ?? undefined,
          frequency: row.frequency ?? undefined,
        });
      }

      return result;
    } catch (error) {
      console.error('[Database] Failed to load all miners history:', error);
      return {};
    }
  });
}

/**
 * Clean up old data to prevent database from growing too large
 * @param daysToKeep - Number of days of data to keep (default: 7)
 */
export async function cleanupOldData(daysToKeep: number = 7): Promise<number> {
  if (!isTauri()) return 0;

  return queueOperation(async () => {
    const database = await initDatabase();
    if (!database) return 0;

    try {
      const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

      const result = await database.execute(
        `DELETE FROM miner_history WHERE timestamp < $1`,
        [cutoffTime]
      );

      console.log(`[Database] Cleaned up ${result.rowsAffected} old records`);
      return result.rowsAffected;
    } catch (error) {
      console.error('[Database] Failed to cleanup old data:', error);
      return 0;
    }
  });
}

/**
 * Delete all history for a specific miner (when miner is removed)
 */
export async function deleteMinerHistory(minerIp: string): Promise<void> {
  if (!isTauri()) return;

  await queueOperation(async () => {
    const database = await initDatabase();
    if (!database) return;

    try {
      await database.execute(
        `DELETE FROM miner_history WHERE miner_ip = $1`,
        [minerIp]
      );
      console.log(`[Database] Deleted history for miner ${minerIp}`);
    } catch (error) {
      console.error('[Database] Failed to delete miner history:', error);
    }
  });
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<{
  totalRecords: number;
  oldestRecord: number | null;
  newestRecord: number | null;
  minerCount: number;
} | null> {
  if (!isTauri()) return null;

  return queueOperation(async () => {
    const database = await initDatabase();
    if (!database) return null;

    try {
      const stats = await database.select<{
        total: number;
        oldest: number | null;
        newest: number | null;
        miners: number;
      }[]>(`
        SELECT
          COUNT(*) as total,
          MIN(timestamp) as oldest,
          MAX(timestamp) as newest,
          COUNT(DISTINCT miner_ip) as miners
        FROM miner_history
      `);

      if (stats.length > 0) {
        return {
          totalRecords: stats[0].total,
          oldestRecord: stats[0].oldest,
          newestRecord: stats[0].newest,
          minerCount: stats[0].miners,
        };
      }
      return null;
    } catch (error) {
      console.error('[Database] Failed to get stats:', error);
      return null;
    }
  });
}

/**
 * Close the database connection
 */
export async function closeDatabase(): Promise<void> {
  // Flush any pending inserts before closing
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }
  await flushPendingInserts();

  if (db) {
    try {
      await db.close();
      db = null;
      dbInitPromise = null;
      console.log('[Database] Closed successfully');
    } catch (error) {
      console.error('[Database] Failed to close:', error);
    }
  }
}
