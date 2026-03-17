import axios from "axios";
import Token from "../models/Token";

const DEX_TOKEN_PROFILES =
  "https://api.dexscreener.com/token-profiles/latest/v1";

const DEX_TOKEN_BOOSTS =
  "https://api.dexscreener.com/token-boosts/latest/v1";

interface DexProfileToken {
  chainId?: string;
  tokenAddress?: string;
  description?: string | null;
}

interface DexBoostToken {
  chainId?: string;
  tokenAddress?: string;
  description?: string | null;
  amount?: number;
  totalAmount?: number;
}

export async function discoverNewTokens(): Promise<void> {
  try {
    console.log("🔎 Fetching latest token profiles + boosted tokens...");

    const [profilesResponse, boostsResponse] = await Promise.allSettled([
      axios.get(DEX_TOKEN_PROFILES, { timeout: 10000 }),
      axios.get(DEX_TOKEN_BOOSTS, { timeout: 10000 })
    ]);

    const profileTokens: DexProfileToken[] =
      profilesResponse.status === "fulfilled" &&
      Array.isArray(profilesResponse.value.data)
        ? profilesResponse.value.data
        : [];

    const boostedTokens: DexBoostToken[] =
      boostsResponse.status === "fulfilled" &&
      Array.isArray(boostsResponse.value.data)
        ? boostsResponse.value.data
        : [];

    console.log(
      `📥 Discovery source counts | profiles=${profileTokens.length} boosts=${boostedTokens.length}`
    );

    const tokenMap = new Map<
      string,
      {
        chain: string;
        mintAddress: string;
        name: string;
        symbol: string;
        source: string;
        firstSeenAt: Date;
        discoveredAt: Date;
      }
    >();

    // 1. Fresh token profiles
    for (const token of profileTokens) {
      if (!token) continue;
      if (token.chainId !== "solana") continue;
      if (!token.tokenAddress) continue;

      const mintAddress = token.tokenAddress.trim();

      if (!mintAddress) continue;
      if (!mintAddress.includes("pump")) continue;

      tokenMap.set(mintAddress, {
        chain: "solana",
        mintAddress,
        name: token.description || "Unknown",
        symbol: "UNKNOWN",
        source: "dexscreener-profile",
        firstSeenAt: new Date(),
        discoveredAt: new Date()
      });
    }

    // 2. Boosted tokens
    for (const token of boostedTokens) {
      if (!token) continue;
      if (token.chainId !== "solana") continue;
      if (!token.tokenAddress) continue;

      const mintAddress = token.tokenAddress.trim();

      if (!mintAddress) continue;
      if (!mintAddress.includes("pump")) continue;

      const existing = tokenMap.get(mintAddress);

      if (existing) {
        existing.source = "dexscreener-profile+boost";
      } else {
        tokenMap.set(mintAddress, {
          chain: "solana",
          mintAddress,
          name: token.description || "Unknown",
          symbol: "UNKNOWN",
          source: "dexscreener-boost",
          firstSeenAt: new Date(),
          discoveredAt: new Date()
        });
      }
    }

    const newTokens = Array.from(tokenMap.values());

    if (newTokens.length === 0) {
      console.log("⚠️ No new Solana pump tokens found from discovery sources");
      return;
    }

    console.log(`🧱 Prepared discovery candidates: ${newTokens.length}`);

    const result = await Token.insertMany(newTokens, {
      ordered: false
    }).catch(() => null);

    if (result && result.length > 0) {
      console.log(`✅ New tokens inserted: ${result.length}`);

      for (const token of result) {
        console.log(
          `🆕 New Solana token discovered: ${token.mintAddress} | source=${token.source}`
        );
      }
    } else {
      console.log("ℹ️ No brand-new tokens inserted (likely duplicates)");
    }
  } catch (error) {
    console.error("Discovery error:", error);
  }
}