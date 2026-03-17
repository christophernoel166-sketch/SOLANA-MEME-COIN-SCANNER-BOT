import axios from "axios";

export interface DexPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  labels?: string[] | null;

  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };

  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };

  priceNative?: string;
  priceUsd?: string | null;

  txns?: {
    m5?: {
      buys?: number;
      sells?: number;
    };
    h1?: {
      buys?: number;
      sells?: number;
    };
    h24?: {
      buys?: number;
      sells?: number;
    };
  };

  volume?: {
    m5?: number;
    h1?: number;
    h24?: number;
  };

  priceChange?: {
    m5?: number;
    h1?: number;
    h24?: number;
  } | null;

  liquidity?: {
    usd?: number;
    base?: number;
    quote?: number;
  } | null;

  fdv?: number | null;
  marketCap?: number | null;
  pairCreatedAt?: number | null;

  info?: {
    imageUrl?: string;
    websites?: Array<{ url: string }>;
    socials?: Array<{ platform: string; handle: string }>;
  };

  boosts?: {
    active?: number;
  };
}

export async function fetchMarketData(tokenAddress: string): Promise<DexPair | null> {
  try {
    const url = `https://api.dexscreener.com/token-pairs/v1/solana/${tokenAddress}`;

    console.log(`🌐 Fetching market data: ${url}`);

    const response = await axios.get(url, {
      timeout: 10000
    });

    const pairs = response.data;

    if (!pairs || !Array.isArray(pairs) || pairs.length === 0) {
      console.log(`⚠️ Empty market response for ${tokenAddress}`);
      return null;
    }

    const validPairs = pairs.filter((pair: DexPair) => {
      return (
        pair &&
        pair.chainId === "solana" &&
        !!pair.pairAddress &&
        (
          pair.baseToken?.address === tokenAddress ||
          pair.quoteToken?.address === tokenAddress
        )
      );
    });

    if (validPairs.length === 0) {
      console.log(`⚠️ No valid Solana pairs found for ${tokenAddress}`);
      return null;
    }

    // Pick the strongest pool:
    // 1. Highest liquidity
    // 2. Then highest 5m volume
    const bestPair = validPairs.sort((a: DexPair, b: DexPair) => {
      const liquidityA = a.liquidity?.usd ?? 0;
      const liquidityB = b.liquidity?.usd ?? 0;

      if (liquidityB !== liquidityA) {
        return liquidityB - liquidityA;
      }

      const volumeA = a.volume?.m5 ?? 0;
      const volumeB = b.volume?.m5 ?? 0;

      return volumeB - volumeA;
    })[0];

    console.log(
      `✅ Best pair selected for ${tokenAddress}: ${bestPair.pairAddress}`
    );

    return bestPair;
  } catch (error) {
    console.error(`❌ Market fetch error for ${tokenAddress}:`, error);
    return null;
  }
}