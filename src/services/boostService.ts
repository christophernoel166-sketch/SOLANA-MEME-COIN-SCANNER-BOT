import axios from "axios";

const DEX_BOOSTS_URL = "https://api.dexscreener.com/token-boosts/latest/v1";
const BOOST_CACHE_TTL_MS = 60 * 1000; // 60 seconds

export interface DexBoostedToken {
  url?: string;
  chainId?: string;
  tokenAddress?: string;
  amount?: number;
  totalAmount?: number;
  icon?: string | null;
  header?: string | null;
  description?: string | null;
}

// ✅ In-memory cache
let boostedTokenCache: DexBoostedToken[] = [];
let boostedTokenSetCache = new Set<string>();
let boostedCacheTimestamp = 0;

export async function fetchBoostedTokens(): Promise<DexBoostedToken[]> {
  try {
    console.log(`🚀 Fetching boosted tokens: ${DEX_BOOSTS_URL}`);

    const response = await axios.get(DEX_BOOSTS_URL, {
      timeout: 10000
    });

    const tokens = response.data;

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      console.log("⚠️ No boosted tokens returned");
      return [];
    }

    const solanaBoostedTokens = tokens.filter((token: DexBoostedToken) => {
      return token?.chainId === "solana" && !!token?.tokenAddress;
    });

    console.log(`✅ Solana boosted tokens found: ${solanaBoostedTokens.length}`);

    return solanaBoostedTokens;
  } catch (error) {
    console.error("❌ Boost fetch error:", error);
    return [];
  }
}

export async function fetchBoostedTokenSet(): Promise<Set<string>> {
  const now = Date.now();

  // ✅ Serve from cache if fresh
  if (now - boostedCacheTimestamp < BOOST_CACHE_TTL_MS && boostedTokenSetCache.size > 0) {
    console.log("⚡ Using cached boosted token set");
    return boostedTokenSetCache;
  }

  const boostedTokens = await fetchBoostedTokens();

  const boostedSet = new Set<string>();

  for (const token of boostedTokens) {
    if (!token.tokenAddress) continue;
    boostedSet.add(token.tokenAddress);
  }

  // ✅ Refresh cache
  boostedTokenCache = boostedTokens;
  boostedTokenSetCache = boostedSet;
  boostedCacheTimestamp = now;

  return boostedSet;
}

export async function isTokenBoosted(tokenAddress: string): Promise<boolean> {
  const boostedSet = await fetchBoostedTokenSet();
  return boostedSet.has(tokenAddress);
}