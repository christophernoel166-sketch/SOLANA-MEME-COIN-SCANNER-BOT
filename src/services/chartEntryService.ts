import { fetchCandles } from "./ohlcvService";

export type ChartEntryAction =
  | "enter_now"
  | "wait_pullback"
  | "breakout_only"
  | "avoid"
  | "unknown";

export type ChartTrend = "bullish" | "neutral" | "bearish" | "unknown";

export type ChartEntryAnalysis = {
  action: ChartEntryAction;
  trend: ChartTrend;
  confidence: number;
  entryMin?: number;
  entryMax?: number;
  breakoutLevel?: number;
  invalidationLevel?: number;
  takeProfitLevel?: number;
  profitPotentialPct?: number;
  overextended: boolean;
  reasons: string[];
};
type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  source: "dex" | "snapshot" | "cache";
};

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function sanitizeCandles(rawCandles: Candle[]): Candle[] {
  return rawCandles.filter(
    (c) =>
      c &&
      isValidNumber(c.open) &&
      isValidNumber(c.high) &&
      isValidNumber(c.low) &&
      isValidNumber(c.close) &&
      isValidNumber(c.volume) &&
      c.close > 0
  );
}

export async function analyzeChartEntry(
  mintAddress: string
): Promise<ChartEntryAnalysis> {
  try {
    console.log(`📊 Starting chart entry analysis for ${mintAddress}`);

    const rawCandles = await fetchCandles(mintAddress, 30);
    const candles = sanitizeCandles(rawCandles);

    if (candles.length < 3) {
      return {
        action: "wait_pullback",
        trend: "unknown",
        confidence: 3,
        overextended: false,
        reasons: ["limited_data"],
      };
    }

    // 🔥 Prefer best candle quality
    const dexCandles = candles.filter((c) => c.source === "dex");
    const goodCandles = candles.filter((c) => c.source !== "cache");

    const usableCandles =
      dexCandles.length >= 3
        ? dexCandles
        : goodCandles.length >= 3
        ? goodCandles
        : candles;

    const closes = usableCandles.map((c) => c.close);
    const highs = usableCandles.map((c) => c.high);
    const lows = usableCandles.map((c) => c.low);
    const volumes = usableCandles.map((c) => c.volume);

    const current = closes.at(-1)!;
    const previous = closes.at(-2)!;
    const first = closes[0];

    const avgClose = average(closes);
    const avgVolume = average(volumes);
    const avgRecentVolume = average(volumes.slice(-5));

 const resistance = Math.max(
  ...highs.slice(
    0,
    Math.max(highs.length - 1, 1)
  )
);
    const support = Math.min(...lows.slice(-10));

    const volumeNow = volumes.at(-1)!;

    const priceRising = current >= previous;
    const strongVolume =
      volumeNow > avgVolume * 1.5 || volumeNow > avgRecentVolume * 1.35;

const momentumAcceleration =
  avgRecentVolume > avgVolume * 1.2;

    // ============================
    // 🚀 BREAKOUT LOGIC
    // ============================
    const cleanBreakout =
  current > resistance &&
  strongVolume &&
  momentumAcceleration &&
  priceRising;

    const weakBreakout =
      current > resistance && !strongVolume;

    const fakeBreakout =
  current > resistance &&
  previous > resistance &&
  current < previous * 0.95;

    // ============================
    // 🎯 PULLBACK ZONE
    // ============================
   const pullbackZoneLow = support * 1.03;
const pullbackZoneHigh = support * 1.15;

    const inPullbackZone =
      current >= pullbackZoneLow &&
      current <= pullbackZoneHigh;

    const weakVolume = avgVolume > 0 && volumeNow < avgVolume * 0.7;

    // ============================
    // 📈 TREND
    // ============================
    let trend: ChartTrend = "neutral";

    if (current > avgClose && priceRising) {
      trend = "bullish";
    } else if (current < avgClose && !priceRising) {
      trend = "bearish";
    }

    const priceChange = first > 0 ? (current - first) / first : 0;
  const overextended = priceChange >= 1.0;

    // ============================
    // 🎯 DECISION ENGINE
    // ============================
    let action: ChartEntryAction = "wait_pullback";
    let confidence = 5;
    const reasons: string[] = [];

    if (trend === "bullish") reasons.push("bullish_structure");
    if (strongVolume) reasons.push("volume_expansion");
    if (weakVolume) reasons.push("weak_volume");

    if (fakeBreakout) {
      action = "avoid";
      confidence = 3;
      reasons.push("fake_breakout");

    } else if (cleanBreakout) {
      action = "breakout_only";
      confidence = 9;
      reasons.push("clean_breakout");

    } else if (weakBreakout) {
      action = "wait_pullback";
      confidence = 6;
      reasons.push("weak_breakout");

    } else if (trend === "bullish" && inPullbackZone) {
      action = "enter_now";
      confidence = 8;
      reasons.push("pullback_entry");

    } else if (trend === "bullish" && !overextended) {
      action = "enter_now";
      confidence = 7;
      reasons.push("trend_continuation");

    } else if (overextended) {
      action = "wait_pullback";
      confidence = 5;
      reasons.push("overextended");
    }

    if (weakVolume && action === "enter_now") {
      action = "wait_pullback";
      confidence -= 2;
    }

    // ============================
    // 📊 DATA QUALITY
    // ============================
    const hasDexData = usableCandles.some((c) => c.source === "dex");
    const hasOnlyCache = usableCandles.every((c) => c.source === "cache");

    if (hasOnlyCache) {
      confidence = Math.min(confidence, 3);
      reasons.push("low_quality_data");
    }

    if (!hasDexData) {
      confidence = Math.min(confidence, 7);
      reasons.push("no_dex_confirmation");
    }

    // ============================
    // 🎯 ENTRY + RISK
    // ============================
    let entryMin: number;
    let entryMax: number;

    if (action === "enter_now") {
      entryMin = current * 0.985;
      entryMax = current * 0.995;
    } else if (action === "breakout_only") {
      entryMin = resistance * 1.001;
      entryMax = resistance * 1.01;
    } else {
      entryMin = pullbackZoneLow;
      entryMax = pullbackZoneHigh;
    }

    const breakoutLevel = resistance;

    const invalidationLevel =
      action === "breakout_only"
        ? resistance * 0.97
        : support * 0.95;

const takeProfitLevel =
  action === "breakout_only"
    ? breakoutLevel * 1.30
    : current * 1.20;

const profitPotentialPct =
  entryMax > 0 && takeProfitLevel > entryMax
    ? ((takeProfitLevel - entryMax) / entryMax) * 100
    : 0;
    // ============================
    // ✅ RESULT
    // ============================
    const result: ChartEntryAnalysis = {
  action,
  trend,
  confidence: clamp(Math.round(confidence), 0, 10),
  entryMin,
  entryMax,
  breakoutLevel,
  invalidationLevel,
  takeProfitLevel,
  profitPotentialPct,
  overextended,
  reasons,
};

    console.log(`✅ Chart entry analysis complete for ${mintAddress}`, result);

    return result;

  } catch (error) {
    console.error("analyzeChartEntry error:", error);

    return {
      action: "unknown",
      trend: "unknown",
      confidence: 0,
      overextended: false,
      reasons: ["analysis_error"],
    };
  }
}