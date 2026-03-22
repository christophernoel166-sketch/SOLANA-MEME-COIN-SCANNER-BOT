import { Connection, PublicKey } from "@solana/web3.js";

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
  // Pump.fun / AMM / LP examples
  // "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx": "Pump.fun",
  // "yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy": "Pump.fun AMM",
  // "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz": "Raydium LP",

  // Exchange examples
  // "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa": "Binance",
  // "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb": "OKX",
  // "cccccccccccccccccccccccccccccccccccccccccccc": "Bybit",
  // "dddddddddddddddddddddddddddddddddddddddddddd": "MEXC",
  // "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": "KuCoin",
  // "ffffffffffffffffffffffffffffffffffffffffffff": "Gate",
  // "gggggggggggggggggggggggggggggggggggggggggggg": "Coinbase"
};

export interface HolderAnalysis {
  holderCount: number | null;
  devHoldingPercent: number | null;
  largestHolderPercent: number | null;
  top10HoldingPercent: number | null;
  top10Wallets: Array<{
    owner: string;
    amount: number;
    percentage: number;
  }>;
}

function emptyHolderAnalysis(): HolderAnalysis {
  return {
    holderCount: null,
    devHoldingPercent: null,
    largestHolderPercent: null,
    top10HoldingPercent: null,
    top10Wallets: []
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

function getConnection(): Connection {
  const rpcUrl = process.env.QUICKNODE_RPC_URL?.trim();

  if (!rpcUrl) {
    throw new Error("QUICKNODE_RPC_URL is missing in .env");
  }

  return new Connection(rpcUrl, "confirmed");
}

function toUiAmount(
  amountRaw: string | number | bigint,
  decimals: number
): number {
  const raw =
    typeof amountRaw === "bigint" ? amountRaw : BigInt(String(amountRaw));

  return Number(raw) / Math.pow(10, decimals);
}

async function getTokenAccountOwner(
  connection: Connection,
  tokenAccountAddress: string
): Promise<string | null> {
  try {
    const info = await connection.getParsedAccountInfo(
      new PublicKey(tokenAccountAddress),
      "confirmed"
    );

    const value: any = info.value;
    const owner = value?.data?.parsed?.info?.owner;

    return typeof owner === "string" ? owner : null;
  } catch (error) {
    console.error(
      `Failed to resolve token-account owner for ${tokenAccountAddress}:`,
      error
    );
    return null;
  }
}

async function isLikelyLpOrProtocolTokenAccount(
  connection: Connection,
  tokenAccountAddress: string
): Promise<boolean> {
  try {
    const info = await connection.getParsedAccountInfo(
      new PublicKey(tokenAccountAddress),
      "confirmed"
    );

    const value: any = info.value;
    const parsed = value?.data?.parsed?.info;

    if (!parsed) return false;

    const owner = parsed?.owner;
    const state = parsed?.state;
    const isNative = parsed?.isNative;
    const tokenAmount = parsed?.tokenAmount;
    const delegate = parsed?.delegate;
    const delegatedAmount = parsed?.delegatedAmount;

    if (state && state !== "initialized") return true;
    if (isNative === true) return true;

    if (
      typeof owner === "string" &&
      KNOWN_SYSTEM_OR_PROGRAM_OWNERS.has(owner)
    ) {
      return true;
    }

    if (delegate && delegatedAmount) {
      return true;
    }

    if (!tokenAmount) {
      return true;
    }

    return false;
  } catch (error) {
    console.error(
      `Failed LP/protocol check for token account ${tokenAccountAddress}:`,
      error
    );
    return false;
  }
}

function isLikelyNonUserOwner(owner: string): boolean {
  if (!owner) return true;

  if (KNOWN_SYSTEM_OR_PROGRAM_OWNERS.has(owner)) return true;
  if (getExcludedOwnerLabel(owner)) return true;

  return false;
}

async function getKnownDevHoldingPercent(
  connection: Connection,
  mintAddress: string,
  devWalletAddress: string,
  totalSupplyUi: number
): Promise<number | null> {
  if (!devWalletAddress || totalSupplyUi <= 0) return null;

  try {
    const response = await connection.getTokenAccountsByOwner(
      new PublicKey(devWalletAddress),
      { mint: new PublicKey(mintAddress) },
      "confirmed"
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
  devWalletAddress?: string | null
): Promise<HolderAnalysis> {
  try {
    const connection = getConnection();
    const mintPubkey = new PublicKey(mintAddress);

    console.log(`🔍 QuickNode holder analysis for mint: ${mintAddress}`);

    const [largestAccountsResp, tokenSupplyResp] = await Promise.all([
      connection.getTokenLargestAccounts(mintPubkey, "confirmed"),
      connection.getTokenSupply(mintPubkey, "confirmed")
    ]);

    const totalSupplyUi = Number(tokenSupplyResp.value.uiAmount ?? 0);

    if (!totalSupplyUi || totalSupplyUi <= 0) {
      console.log(`⚠️ Total token supply is zero/invalid for ${mintAddress}`);
      return emptyHolderAnalysis();
    }

    const topAccounts = largestAccountsResp.value.slice(0, 20);

    const resolvedAccounts = await Promise.all(
      topAccounts.map(async (acct) => {
        const tokenAccountAddress = acct.address.toBase58();
        const owner = await getTokenAccountOwner(connection, tokenAccountAddress);
        const amount = Number(acct.uiAmount ?? 0);
        const isLikelyLpOrProtocol = await isLikelyLpOrProtocolTokenAccount(
          connection,
          tokenAccountAddress
        );

        return {
          tokenAccountAddress,
          owner: owner ?? tokenAccountAddress,
          amount,
          isLikelyLpOrProtocol
        };
      })
    );

    const groupedByOwner = new Map<string, number>();

    for (const item of resolvedAccounts) {
      if (!item.owner) continue;
      if (isLikelyBurnWallet(item.owner)) continue;

      const excludedLabel = getExcludedOwnerLabel(item.owner);
      if (excludedLabel) {
        console.log(
          `[HOLDER] Excluding owner ${item.owner} (${excludedLabel}) for ${mintAddress}`
        );
        continue;
      }

      if (item.isLikelyLpOrProtocol) {
        console.log(
          `[HOLDER] Excluding token account ${item.tokenAccountAddress} as likely LP/protocol for ${mintAddress}`
        );
        continue;
      }

      if (isLikelyNonUserOwner(item.owner)) continue;

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

    const top10Wallets = groupedWallets.slice(0, 10);

    const top10HoldingPercent =
      top10Wallets.length > 0
        ? top10Wallets.reduce((sum, wallet) => sum + wallet.percentage, 0)
        : null;

    const devHoldingPercent = devWalletAddress
      ? await getKnownDevHoldingPercent(
          connection,
          mintAddress,
          devWalletAddress,
          totalSupplyUi
        )
      : null;

    return {
      holderCount: groupedWallets.length,
      devHoldingPercent,
      largestHolderPercent,
      top10HoldingPercent,
      top10Wallets
    };
  } catch (error) {
    console.error(`❌ QuickNode holder analysis error for ${mintAddress}:`, error);
    return emptyHolderAnalysis();
  }
}