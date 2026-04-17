
import { getCandles } from "./candleEngine";

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  source: "dex" | "snapshot" | "cache";
};

type BirdeyeOhlcvItem = {
  unixTime?: number;
  o?: number;
  h?: number;
  l?: number;
  c?: number;
  v?: number;
};

function isFinitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

async function fetchBirdeyeCandles(
  mintAddress: string,
  limit = 30
): Promise<Candle[]> {
  const apiKey = process.env.BIRDEYE_API_KEY;
  if (!apiKey) return [];

  try {
    const url =
      `https://public-api.birdeye.so/defi/ohlcv` +
      `?address=${encodeURIComponent(mintAddress)}` +
      `&type=1m` +
      `&time_from=${Math.floor(Date.now() / 1000) - 60 * 60}` +
      `&time_to=${Math.floor(Date.now() / 1000)}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-KEY": apiKey,
        "x-chain": "solana",
        accept: "application/json",
      },
    });

    if (!res.ok) {
      console.warn(`Birdeye OHLCV failed for ${mintAddress}: ${res.status}`);
      return [];
    }

    const json: any = await res.json();

    const items: BirdeyeOhlcvItem[] =
      json?.data?.items ||
      json?.data ||
      [];

    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }

    const candles: Candle[] = items
      .map((item) => {
        const open = Number(item.o);
        const high = Number(item.h);
        const low = Number(item.l);
        const close = Number(item.c);
        const volume = Number(item.v ?? 0);
        const unixTime = Number(item.unixTime);

        if (
          !isFinitePositive(open) ||
          !isFinitePositive(high) ||
          !isFinitePositive(low) ||
          !isFinitePositive(close) ||
          !Number.isFinite(volume) ||
          !Number.isFinite(unixTime)
        ) {
          return null;
        }

        return {
          time: unixTime * 1000,
          open,
          high,
          low,
          close,
          volume,
          source: "dex" as const,
        };
      })
      .filter(Boolean) as Candle[];

    return candles.slice(-limit);
  } catch (err) {
    console.error(`fetchBirdeyeCandles error for ${mintAddress}:`, err);
    return [];
  }
}

export async function fetchCandles(
  mintAddress: string,
  limit = 30
): Promise<Candle[]> {
  try {
    // 1. Birdeye first
    const birdeyeCandles = await fetchBirdeyeCandles(mintAddress, limit);
    if (birdeyeCandles.length >= 3) {
      return birdeyeCandles;
    }

    // 2. Fallback to local candle engine
    const rawCandles = getCandles(mintAddress, limit);

    if (!rawCandles || rawCandles.length === 0) {
      return [];
    }

    const candles: Candle[] = rawCandles.map((c) => ({
      time: c.startTime,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
      source: c.source || "cache",
    }));

    return candles;
  } catch (err) {
    console.error(`fetchCandles error for ${mintAddress}:`, err);
    return [];
  }
}