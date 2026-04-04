import { PublicKey } from "@solana/web3.js";
import { withRpc } from "../utils/rpcManager";

const KNOWN_BURN_WALLETS = new Set<string>([
  "11111111111111111111111111111111",
  "So11111111111111111111111111111111111111112"
]);

const KNOWN_SYSTEM_OR_PROGRAM_OWNERS = new Set<string>([
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  "11111111111111111111111111111111"
]);

/**
 * Add known protocol / LP / AMM / exchange wallets here.
 * Key = wallet address
 * Value = label for logging/debugging
 */
const EXCLUDED_OWNER_LABELS: Record<string, string> = {
  // Example:
  // "Fzb8RBE1QyJqTvGZUFM4RuKMQ9DLojj15Q9bK8iB61bc": "Pump.fun AMM",
  // "AnotherWalletHere": "Binance",
  // "AnotherWalletHere2": "Raydium LP"
};

export interface HolderAnalysis {
  holderCount: number | null;
  largestHolderPercent: number | null;
  top10HoldingPercent: number | null;

  topHolders: Array<{
    address: string;
    amount: number;
    percent: number;
  }>;

  excludedAccounts: Array<{
    address: string;
    amount: number;
    percent: number;
    reason: string;
  }>;

  devHoldingPercent: number | null;
}

export interface HolderAnalysisOptions {
  devWalletAddress?: string | null;
  marketContext?: {
    dexId?: string | null;
    pairAddress?: string | null;
    labels?: string[] | null;
  };
}

function emptyHolderAnalysis(): HolderAnalysis {
  return {
    holderCount: null,
    largestHolderPercent: null,
    top10HoldingPercent: null,
    topHolders: [],
    excludedAccounts: [],
    devHoldingPercent: null
  };
}

export function isLikelyBurnWallet(owner?: string): boolean {
  if (!owner) return false;
  return KNOWN_BURN_WALLETS.has(owner);
}

function getExcludedOwnerLabel(owner?: string): string | null {
  if (!owner) return null;
  return EXCLUDED_OWNER_LABELS[owner] ?? null;
}

function toUiAmount(
  amountRaw: string | number | bigint,
  decimals: number
): number {
  const raw =
    typeof amountRaw === "bigint" ? amountRaw : BigInt(String(amountRaw));

  return Number(raw) / Math.pow(10, decimals);
}

function isLikelyNonUserOwner(owner: string): boolean {
  if (!owner) return true;

  if (KNOWN_SYSTEM_OR_PROGRAM_OWNERS.has(owner)) return true;
  if (getExcludedOwnerLabel(owner)) return true;

  return false;
}

function detectNonUserSignals(args: {
  owner: string;
  tokenAccountAddress: string;
  parsed: any;
  amount: number;
  totalSupplyUi: number;
  marketContext?: {
    dexId?: string | null;
    pairAddress?: string | null;
    labels?: string[] | null;
  };
}): {
  isLikelyNonUser: boolean;
  reasons: string[];
} {
  const {
    owner,
    tokenAccountAddress,
    parsed,
    amount,
    totalSupplyUi,
    marketContext
  } = args;

  const reasons: string[] = [];
  const sharePercent =
    totalSupplyUi > 0 ? (amount / totalSupplyUi) * 100 : 0;

  const dexId = marketContext?.dexId?.toLowerCase() ?? "";
  const labels = (marketContext?.labels ?? []).map((x) => x.toLowerCase());

  const isPumpFunMarket = dexId.includes("pump");
  const isLikelyAmmMarket =
    isPumpFunMarket ||
    dexId.includes("raydium") ||
    dexId.includes("orca") ||
    dexId.includes("meteora") ||
    labels.some((label) => label.includes("amm")) ||
    labels.some((label) => label.includes("lp")) ||
    labels.some((label) => label.includes("pool"));

  if (!parsed) {
    reasons.push("missing_parsed_data");
  }

  if (parsed?.state && parsed.state !== "initialized") {
    reasons.push("non_initialized_state");
  }

  if (parsed?.isNative === true) {
    reasons.push("native_account");
  }

  if (parsed?.delegate) {
    reasons.push("delegated_account");
  }

  if (!parsed?.tokenAmount) {
    reasons.push("missing_token_amount");
  }

  if (owner === tokenAccountAddress) {
    reasons.push("self_owned_token_account");
  }

  if (typeof owner === "string" && owner.length < 32) {
    reasons.push("invalid_owner_shape");
  }

  if (sharePercent >= 15) {
    reasons.push("very_large_share");
  }

  if (sharePercent >= 20) {
    reasons.push("extreme_share");
  }

  const hasStructuralOddity =
    !!parsed?.delegate ||
    !parsed?.tokenAmount ||
    (parsed?.state && parsed.state !== "initialized") ||
    owner === tokenAccountAddress;

  if (sharePercent >= 10 && hasStructuralOddity) {
    reasons.push("large_share_with_structural_oddity");
  }

  if (isLikelyAmmMarket && sharePercent >= 15) {
    reasons.push("amm_large_share_candidate");
  }

  if (isPumpFunMarket && sharePercent >= 12) {
    reasons.push("pumpfun_pool_candidate");
  }

  const isLikelyNonUser =
    reasons.includes("extreme_share") ||
    reasons.includes("large_share_with_structural_oddity") ||
    reasons.includes("amm_large_share_candidate") ||
    reasons.includes("pumpfun_pool_candidate") ||
    reasons.length >= 2;

  return {
    isLikelyNonUser,
    reasons
  };
}

async function getKnownDevHoldingPercent(
  mintAddress: string,
  devWalletAddress: string,
  totalSupplyUi: number
): Promise<number | null> {
  if (!devWalletAddress || totalSupplyUi <= 0) return null;

  try {
    const response = await withRpc((connection) =>
      connection.getTokenAccountsByOwner(
        new PublicKey(devWalletAddress),
        { mint: new PublicKey(mintAddress) },
        "confirmed"
      )
    );

    let totalRaw = 0n;
    let decimals = 0;

    for (const account of response.value) {
      const parsedAccount = account.account.data as any;
      const parsedInfo = parsedAccount?.parsed?.info;
      const tokenAmount = parsedInfo?.tokenAmount;

      if (!tokenAmount) continue;

      const amountRaw = tokenAmount.amount;
      decimals = Number(tokenAmount.decimals ?? decimals);

      totalRaw += BigInt(String(amountRaw));
    }

    const devUiAmount = toUiAmount(totalRaw, decimals);
    return (devUiAmount / totalSupplyUi) * 100;
  } catch (error) {
    console.error(
      `Failed to fetch dev wallet holding for ${devWalletAddress}:`,
      error
    );
    return null;
  }
}

export async function fetchHolderAnalysis(
  mintAddress: string,
  options?: HolderAnalysisOptions
): Promise<HolderAnalysis> {
  try {
    const mintPubkey = new PublicKey(mintAddress);

    console.log(`🔍 Holder analysis for mint: ${mintAddress}`);

    const [largestAccountsResp, tokenSupplyResp] = await Promise.all([
      withRpc((connection) =>
        connection.getTokenLargestAccounts(mintPubkey, "confirmed")
      ),
      withRpc((connection) =>
        connection.getTokenSupply(mintPubkey, "confirmed")
      )
    ]);

    const totalSupplyUi = Number(tokenSupplyResp.value.uiAmount ?? 0);

    if (!totalSupplyUi || totalSupplyUi <= 0) {
      console.log(`⚠️ Total token supply is zero/invalid for ${mintAddress}`);
      return emptyHolderAnalysis();
    }

    const topAccounts = largestAccountsResp.value.slice(0, 12);

    const resolvedAccounts: Array<{
      tokenAccountAddress: string;
      owner: string;
      amount: number;
      isLikelyLpOrProtocol: boolean;
      autoDetectionReasons: string[];
    }> = [];

    for (const acct of topAccounts) {
      const tokenAccountAddress = acct.address.toBase58();

      try {
        const info = await withRpc((connection) =>
          connection.getParsedAccountInfo(
            new PublicKey(tokenAccountAddress),
            "confirmed"
          )
        );

        const parsed = (info.value as any)?.data?.parsed?.info;
        if (!parsed) continue;

        const owner = parsed.owner ?? tokenAccountAddress;
        const amount = Number(acct.uiAmount ?? 0);

        const autoDetection = detectNonUserSignals({
          owner,
          tokenAccountAddress,
          parsed,
          amount,
          totalSupplyUi,
          marketContext: options?.marketContext
        });

        resolvedAccounts.push({
          tokenAccountAddress,
          owner,
          amount,
          isLikelyLpOrProtocol: autoDetection.isLikelyNonUser,
          autoDetectionReasons: autoDetection.reasons
        });

        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (err) {
        console.error(`Error resolving ${tokenAccountAddress}:`, err);
      }
    }

    const groupedByOwner = new Map<string, number>();

    const excludedAccounts: Array<{
      address: string;
      amount: number;
      percent: number;
      reason: string;
    }> = [];

    for (const item of resolvedAccounts) {
      if (!item.owner) continue;

      const percent =
        totalSupplyUi > 0 ? (item.amount / totalSupplyUi) * 100 : 0;

      if (isLikelyBurnWallet(item.owner)) {
        excludedAccounts.push({
          address: item.owner,
          amount: item.amount,
          percent,
          reason: "burn_wallet"
        });
        continue;
      }

      const excludedLabel = getExcludedOwnerLabel(item.owner);
      if (excludedLabel) {
        excludedAccounts.push({
          address: item.owner,
          amount: item.amount,
          percent,
          reason: excludedLabel
        });
        continue;
      }

      if (item.isLikelyLpOrProtocol) {
        excludedAccounts.push({
          address: item.owner,
          amount: item.amount,
          percent,
          reason: item.autoDetectionReasons.join(", ")
        });
        continue;
      }

      if (isLikelyNonUserOwner(item.owner)) {
        excludedAccounts.push({
          address: item.owner,
          amount: item.amount,
          percent,
          reason: "non_user_owner"
        });
        continue;
      }

      const current = groupedByOwner.get(item.owner) ?? 0;
      groupedByOwner.set(item.owner, current + item.amount);
    }

    const groupedWallets = Array.from(groupedByOwner.entries())
      .map(([owner, amount]) => ({
        owner,
        amount,
        percentage: totalSupplyUi > 0 ? (amount / totalSupplyUi) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    const largestHolderPercent =
      groupedWallets.length > 0 ? groupedWallets[0].percentage : null;

    if (largestHolderPercent && largestHolderPercent > 25) {
      console.log(
        `[HOLDER WARNING] Large holder detected (${largestHolderPercent}%) — likely LP/exchange not excluded for ${mintAddress}`
      );
    }

    const topHolders = groupedWallets.slice(0, 10).map((wallet) => ({
      address: wallet.owner,
      amount: wallet.amount,
      percent: wallet.percentage
    }));

    const top10HoldingPercent =
      topHolders.length > 0
        ? topHolders.reduce((sum, holder) => sum + holder.percent, 0)
        : null;

    const devHoldingPercent = options?.devWalletAddress
      ? await getKnownDevHoldingPercent(
          mintAddress,
          options.devWalletAddress,
          totalSupplyUi
        )
      : null;

    return {
      holderCount: groupedWallets.length,
      largestHolderPercent,
      top10HoldingPercent,
      topHolders,
      excludedAccounts,
      devHoldingPercent
    };
  } catch (error) {
    console.error(`❌ Holder analysis error for ${mintAddress}:`, error);
    return emptyHolderAnalysis();
  }
}