import axios from "axios";

const DEX_BOOSTS_URL = "https://api.dexscreener.com/token-boosts/latest/v1";

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
  const boostedTokens = await fetchBoostedTokens();

  const boostedSet = new Set<string>();

  for (const token of boostedTokens) {
    if (!token.tokenAddress) continue;
    boostedSet.add(token.tokenAddress);
  }

  return boostedSet;
}

export async function isTokenBoosted(tokenAddress: string): Promise<boolean> {
  const boostedSet = await fetchBoostedTokenSet();
  return boostedSet.has(tokenAddress);
}