import axios from "axios";

const BIRDEYE_HOLDERS_URL = "https://public-api.birdeye.so/defi/v3/token/holder";

const KNOWN_BURN_WALLETS = new Set<string>([
  "11111111111111111111111111111111",
  "So11111111111111111111111111111111111111112"
]);

export interface HolderAnalysis {
  holderCount: number | null;
  devHoldingPercent: number | null;
  top10HoldingPercent: number | null;
  top10Wallets: Array<{
    owner: string;
    amount: number;
    percentage: number;
  }>;
}

interface BirdeyeHolderItem {
  owner?: string;
  ui_amount?: number | string;
  amount?: number | string;
}

function parseNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function emptyHolderAnalysis(): HolderAnalysis {
  return {
    holderCount: null,
    devHoldingPercent: null,
    top10HoldingPercent: null,
    top10Wallets: []
  };
}

export function isLikelyBurnWallet(owner?: string): boolean {
  if (!owner) return false;
  return KNOWN_BURN_WALLETS.has(owner);
}

export async function fetchHolderAnalysis(
  tokenAddress: string,
  priceUsd?: number | null,
  marketCap?: number | null
): Promise<HolderAnalysis> {
  try {
    const birdeyeApiKey = process.env.BIRDEYE_API_KEY?.trim();

    console.log("🔑 BIRDEYE key loaded:", !!birdeyeApiKey);

    if (!birdeyeApiKey) {
      console.warn("⚠️ BIRDEYE_API_KEY is missing. Holder analysis skipped.");
      return emptyHolderAnalysis();
    }

    const headers = {
      accept: "application/json",
      "x-chain": "solana",
      "x-api-key": birdeyeApiKey
    };

    const holdersResponse = await axios.get(BIRDEYE_HOLDERS_URL, {
      headers,
      params: {
        address: tokenAddress,
        offset: 0,
        limit: 10
      },
      timeout: 10000
    });

    console.log(
      `📥 Holders raw response for ${tokenAddress}:`,
      JSON.stringify(holdersResponse.data, null, 2)
    );

    if (!holdersResponse.data?.success) {
      return emptyHolderAnalysis();
    }

    const payload = holdersResponse.data?.data ?? {};
    const items: BirdeyeHolderItem[] = Array.isArray(payload.items)
      ? payload.items
      : [];

    let holderCount: number | null = null;
    let devHoldingPercent: number | null = null;
    let top10HoldingPercent: number | null = null;

    const estimatedSupply =
      typeof marketCap === "number" &&
      typeof priceUsd === "number" &&
      priceUsd > 0
        ? marketCap / priceUsd
        : null;

    const top10Wallets = items.slice(0, 10).map((item) => {
      const amount = parseNumber(item.ui_amount ?? item.amount);

      const percentage =
        estimatedSupply && estimatedSupply > 0
          ? (amount / estimatedSupply) * 100
          : 0;

      return {
        owner: item.owner ?? "",
        amount,
        percentage
      };
    });

    const cleanedWallets = top10Wallets.filter(
      (wallet) => wallet.owner && !isLikelyBurnWallet(wallet.owner)
    );

    if (cleanedWallets.length > 0) {
      top10HoldingPercent = cleanedWallets.reduce(
        (sum, wallet) => sum + wallet.percentage,
        0
      );

      devHoldingPercent = cleanedWallets[0]?.percentage ?? null;
    }

    return {
      holderCount,
      devHoldingPercent,
      top10HoldingPercent,
      top10Wallets
    };
  } catch (error) {
    console.error(`❌ Holder analysis error for ${tokenAddress}:`, error);
    return emptyHolderAnalysis();
  }
}