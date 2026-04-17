export type Candle = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  startTime: number;
  source: "dex" | "snapshot" | "cache";
};

const INTERVAL_MS = 60 * 1000; // 1 minute candles

const closedCandles: Record<string, Candle[]> = {};
const activeCandles: Record<string, Candle> = {};

export function processTrade(
  mint: string,
  price: number,
  volume: number,
  timestamp: number = Date.now(),
  source: "dex" | "snapshot" | "cache" = "cache"
): void {
  if (!mint || !Number.isFinite(price) || price <= 0 || !Number.isFinite(volume) || volume < 0) {
    return;
  }

  const bucketStart = Math.floor(timestamp / INTERVAL_MS) * INTERVAL_MS;
  const existing = activeCandles[mint];

  if (!existing || existing.startTime !== bucketStart) {
    if (existing) {
      if (!closedCandles[mint]) closedCandles[mint] = [];
      closedCandles[mint].push(existing);

      if (closedCandles[mint].length > 200) {
        closedCandles[mint] = closedCandles[mint].slice(-200);
      }
    }

    activeCandles[mint] = {
      open: price,
      high: price,
      low: price,
      close: price,
      volume,
      startTime: bucketStart,
      source,
    };

    return;
  }

  existing.high = Math.max(existing.high, price);
  existing.low = Math.min(existing.low, price);
  existing.close = price;
  existing.volume += volume;
  existing.source = source;
}

export function getCandles(mint: string, limit = 30): Candle[] {
  const history = closedCandles[mint] || [];
  const active = activeCandles[mint];

  const all = active ? [...history, active] : [...history];
  return all.slice(-limit);
}

export function getLatestCandle(mint: string): Candle | null {
  const candles = getCandles(mint, 1);
  return candles.length ? candles[0] : null;
}

export function resetCandles(mint?: string): void {
  if (mint) {
    delete closedCandles[mint];
    delete activeCandles[mint];
    return;
  }

  for (const key of Object.keys(closedCandles)) delete closedCandles[key];
  for (const key of Object.keys(activeCandles)) delete activeCandles[key];
}