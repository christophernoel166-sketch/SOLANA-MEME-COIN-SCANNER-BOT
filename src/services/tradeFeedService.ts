
import { processTrade } from "./candleEngine";
import TokenSnapshot from "../models/TokenSnapshot";

const POLL_INTERVAL = 15000;
const PER_TOKEN_DELAY_MS = 1200;

// keep a stable fallback price per mint
const fallbackPriceCache = new Map<string, number>();

type SnapshotLike = {
  mintAddress: string;
  priceUsd?: number | null;
  marketCap?: number | null;
  liquidityUsd?: number | null;
  volume5m?: number | null;
};

function isFinitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function deriveSnapshotPrice(snapshot?: SnapshotLike | null): number | null {
  if (!snapshot) return null;

  if (isFinitePositive(snapshot.priceUsd)) {
    return snapshot.priceUsd;
  }

  return null;
}

function getStableFallbackPrice(mint: string): number {
  const existing = fallbackPriceCache.get(mint);
  if (existing && Number.isFinite(existing) && existing > 0) {
    return existing;
  }

  const seedPrice = 0.000001;
  fallbackPriceCache.set(mint, seedPrice);
  return seedPrice;
}

function updateFallbackPrice(mint: string, newPrice: number): void {
  if (Number.isFinite(newPrice) && newPrice > 0) {
    fallbackPriceCache.set(mint, newPrice);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================
// 🔹 GET TOKENS TO TRACK
// ============================
async function getActiveTokens(): Promise<SnapshotLike[]> {
  const tokens = await TokenSnapshot.find({
  signalSent: false,
  enrichmentComplete: true,
  pairCreatedAt: { $ne: null }
})
  .sort({ createdAt: -1 }) // newest tokens first
  .limit(5)                // reduce load
  .lean();

  const deduped = new Map<string, SnapshotLike>();

  for (const token of tokens as SnapshotLike[]) {
    if (!token?.mintAddress) continue;
    if (!deduped.has(token.mintAddress)) {
      deduped.set(token.mintAddress, token);
    }
  }

  return Array.from(deduped.values());
}

// ============================
// 🔹 SAFE DEX FETCH
// ============================
async function fetchDexTokenData(mint: string): Promise<any | null> {
  const url = `https://api.dexscreener.com/latest/dex/tokens/${mint}`;

  try {
    const res = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "Mozilla/5.0 meme-scanner-bot",
      },
    });

    if (!res.ok) {
      console.warn(
        `⚠️ Dex request failed for ${mint}: ${res.status} ${res.statusText}`
      );
      return null;
    }

    const contentType = res.headers.get("content-type") || "";
    const rawBody = await res.text();

    if (!contentType.includes("application/json")) {
      console.warn(
        `⚠️ Dex returned non-JSON for ${mint}. content-type=${contentType}`
      );
      return null;
    }

    try {
      return JSON.parse(rawBody);
    } catch {
      console.warn(`⚠️ Failed to parse Dex JSON for ${mint}`);
      return null;
    }
  } catch (error) {
    console.warn(`⚠️ Dex fetch error for ${mint}:`, error);
    return null;
  }
}

// ============================
// 🚀 MAIN TRADE FEED
// ============================
export function startTradeFeed() {
  console.log("📡 Starting trade feed...");

  setInterval(async () => {
    try {
      const snapshots = await getActiveTokens();
      const mints = snapshots.map((s) => s.mintAddress);

      console.log("🧪 Tracking tokens:", mints);

      for (const snap of snapshots) {
        const mint = snap.mintAddress;

        try {
          console.log("🔍 Fetching:", mint);

          const data = await fetchDexTokenData(mint);

          const pair = data?.pairs?.find(
            (p: any) => p?.priceUsd && Number(p.priceUsd) > 0
          );

          let price: number | null = null;
          let priceSource: "dex" | "snapshot" | "cache" = "cache";

          // 1) Real Dex price
          if (pair?.priceUsd) {
            const dexPrice = parseFloat(pair.priceUsd);

            if (Number.isFinite(dexPrice) && dexPrice > 0) {
              price = dexPrice;
              priceSource = "dex";
              console.log("📦 Pair found:", pair.baseToken?.symbol || "UNKNOWN");
              updateFallbackPrice(mint, dexPrice);
            }
          }

          // 2) Snapshot fallback
          if (!price || !Number.isFinite(price) || price <= 0) {
            const snapshotPrice = deriveSnapshotPrice(snap);

            if (
              snapshotPrice &&
              Number.isFinite(snapshotPrice) &&
              snapshotPrice > 0
            ) {
              price = snapshotPrice;
              priceSource = "snapshot";
              updateFallbackPrice(mint, snapshotPrice);
              console.log("⚠️ No Dex price, using snapshot fallback for:", mint);
            }
          }

          // 3) Cached stable fallback
          if (!price || !Number.isFinite(price) || price <= 0) {
            price = getStableFallbackPrice(mint);
            priceSource = "cache";
            console.log(
              "⚠️ No Dex/snapshot price, using cached fallback for:",
              mint
            );
          }

          console.log("💰 Using price:", price, "| source:", priceSource);

          // Prefer Dex volume, else snapshot volume5m, else 0
          let volume = Number(pair?.volume?.h24 || 0);

          if (
            (!Number.isFinite(volume) || volume < 0) &&
            isFinitePositive(snap.volume5m)
          ) {
            volume = snap.volume5m;
          }

          if (!Number.isFinite(volume) || volume < 0) {
            volume = 0;
          }

          console.log("✅ Feeding trade:", {
            mint,
            price,
            priceSource,
            volume,
          });

          processTrade(mint, price, volume, Date.now(), priceSource);
        } catch (innerErr) {
          console.error("❌ Error processing mint:", mint, innerErr);
        }

        await sleep(PER_TOKEN_DELAY_MS);
      }
    } catch (err) {
      console.error("Trade feed error:", err);
    }
  }, POLL_INTERVAL);
}