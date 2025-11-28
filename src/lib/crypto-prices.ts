// Cryptocurrency price fetching utilities
// Supports BTC, BCH, and Bitcoin II (BTC2)

export type CryptoSymbol = 'BTC' | 'BCH' | 'BTC2';

export interface CryptoPrice {
  symbol: CryptoSymbol;
  price: number;
  change24h: number;
  lastUpdated: number;
}

export interface NetworkStats {
  symbol: CryptoSymbol;
  difficulty: number;
  blockReward: number;
  blocksPerDay: number;
  networkHashrate: number; // TH/s
}

// Known network stats (these should be updated from APIs in production)
// Block rewards and targets
const NETWORK_DEFAULTS: Record<CryptoSymbol, Partial<NetworkStats>> = {
  BTC: {
    blockReward: 3.125, // After 2024 halving
    blocksPerDay: 144, // ~10 min blocks
  },
  BCH: {
    blockReward: 3.125, // Same halving schedule as BTC
    blocksPerDay: 144,
  },
  BTC2: {
    blockReward: 50, // Bitcoin II block reward (varies by network)
    blocksPerDay: 144, // Assuming similar block time
  },
};

// Cache for prices
let priceCache: Record<CryptoSymbol, CryptoPrice | null> = {
  BTC: null,
  BCH: null,
  BTC2: null,
};

// CoinGecko IDs
const COINGECKO_IDS: Record<CryptoSymbol, string> = {
  BTC: 'bitcoin',
  BCH: 'bitcoin-cash',
  BTC2: 'bitcoin-2', // May need to update if CoinGecko has different ID
};

/**
 * Fetch current price from CoinGecko API
 */
export async function fetchCryptoPrice(symbol: CryptoSymbol): Promise<CryptoPrice | null> {
  // Check cache (5 minute expiry)
  const cached = priceCache[symbol];
  if (cached && Date.now() - cached.lastUpdated < 5 * 60 * 1000) {
    return cached;
  }

  try {
    const id = COINGECKO_IDS[symbol];

    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`,
      {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Failed to fetch ${symbol} price: ${response.status}`);
      return cached; // Return cached if available
    }

    const data = await response.json();
    const coinData = data[id];

    if (!coinData) {
      console.error(`No data for ${symbol}`);
      return cached;
    }

    const price: CryptoPrice = {
      symbol,
      price: coinData.usd || 0,
      change24h: coinData.usd_24h_change || 0,
      lastUpdated: Date.now(),
    };

    priceCache[symbol] = price;
    return price;
  } catch (error) {
    // Don't log abort errors as they're expected on timeout
    if (error instanceof Error && error.name !== 'AbortError') {
      console.error(`Error fetching ${symbol} price:`, error);
    }
    return cached;
  }
}

/**
 * Fetch all supported crypto prices
 */
export async function fetchAllPrices(): Promise<Record<CryptoSymbol, CryptoPrice | null>> {
  const symbols: CryptoSymbol[] = ['BTC', 'BCH', 'BTC2'];

  // Fetch all in parallel
  const results = await Promise.all(symbols.map(s => fetchCryptoPrice(s)));

  return {
    BTC: results[0],
    BCH: results[1],
    BTC2: results[2],
  };
}

/**
 * Calculate daily mining earnings
 * @param hashrateGHs - Your hashrate in GH/s
 * @param networkHashrateTHs - Network hashrate in TH/s
 * @param blockReward - Block reward
 * @param blocksPerDay - Number of blocks per day
 * @param poolFeePercent - Pool fee percentage (0-100)
 */
export function calculateDailyCoins(
  hashrateGHs: number,
  networkHashrateTHs: number,
  blockReward: number,
  blocksPerDay: number,
  poolFeePercent: number = 0
): number {
  if (networkHashrateTHs <= 0 || hashrateGHs <= 0) return 0;

  // Convert your hashrate to TH/s for comparison
  const hashrateTHs = hashrateGHs / 1000;

  // Your share of the network
  const shareOfNetwork = hashrateTHs / networkHashrateTHs;

  // Daily coins before pool fee
  const dailyCoinsGross = shareOfNetwork * blockReward * blocksPerDay;

  // After pool fee
  const dailyCoinsNet = dailyCoinsGross * (1 - poolFeePercent / 100);

  return dailyCoinsNet;
}

/**
 * Calculate profitability
 */
export function calculateProfitability(
  hashrateGHs: number,
  powerWatts: number,
  electricityRate: number, // $/kWh
  cryptoPrice: number,
  dailyCoins: number
): {
  dailyRevenue: number;
  dailyPowerCost: number;
  dailyProfit: number;
  monthlyProfit: number;
  yearlyProfit: number;
  breakEvenPrice: number;
  coinsPerKwh: number;
} {
  // Daily power cost
  const dailyKwh = (powerWatts / 1000) * 24;
  const dailyPowerCost = dailyKwh * electricityRate;

  // Revenue
  const dailyRevenue = dailyCoins * cryptoPrice;

  // Profit
  const dailyProfit = dailyRevenue - dailyPowerCost;

  // Break-even crypto price (price at which profit = 0)
  const breakEvenPrice = dailyCoins > 0 ? dailyPowerCost / dailyCoins : 0;

  // Coins per kWh
  const coinsPerKwh = dailyKwh > 0 ? dailyCoins / dailyKwh : 0;

  return {
    dailyRevenue,
    dailyPowerCost,
    dailyProfit,
    monthlyProfit: dailyProfit * 30,
    yearlyProfit: dailyProfit * 365,
    breakEvenPrice,
    coinsPerKwh,
  };
}

/**
 * Get network defaults for a crypto
 */
export function getNetworkDefaults(symbol: CryptoSymbol): Partial<NetworkStats> {
  return NETWORK_DEFAULTS[symbol] || {};
}

/**
 * Format crypto amount with appropriate decimals
 */
export function formatCryptoAmount(amount: number, symbol: CryptoSymbol): string {
  if (symbol === 'BTC' || symbol === 'BCH') {
    // Show more decimals for valuable coins
    if (amount < 0.00001) return amount.toExponential(2);
    if (amount < 0.001) return amount.toFixed(8);
    if (amount < 1) return amount.toFixed(6);
    return amount.toFixed(4);
  }
  // BTC2 or others
  if (amount < 1) return amount.toFixed(4);
  return amount.toFixed(2);
}

/**
 * Format USD amount
 */
export function formatUSD(amount: number): string {
  if (Math.abs(amount) < 0.01) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
