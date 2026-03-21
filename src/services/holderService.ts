import { Connection, PublicKey } from "@solana/web3.js";

const KNOWN_BURN_WALLETS = new Set<string>([
  "11111111111111111111111111111111",
  "So11111111111111111111111111111111111111112"
]);

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
    typeof amountRaw === "bigint"
      ? amountRaw
      : BigInt(String(amountRaw));

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
    const owner =
      value?.data?.parsed?.info?.owner;

    return typeof owner === "string" ? owner : null;
  } catch (error) {
    console.error(`Failed to resolve token-account owner for ${tokenAccountAddress}:`, error);
    return null;
  }
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
      const parsed: any = account.account.data.parsed?.info;
      const tokenAmount = parsed?.tokenAmount;

      if (!tokenAmount) continue;

      const amountRaw = tokenAmount.amount;
      decimals = Number(tokenAmount.decimals ?? decimals);

      totalRaw += BigInt(String(amountRaw));
    }

    const devUiAmount = toUiAmount(totalRaw, decimals);
    return (devUiAmount / totalSupplyUi) * 100;
  } catch (error) {
    console.error(`Failed to fetch dev wallet holding for ${devWalletAddress}:`, error);
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

    const decimals = tokenSupplyResp.value.decimals;
    const totalSupplyUi = Number(tokenSupplyResp.value.uiAmount ?? 0);

    if (!totalSupplyUi || totalSupplyUi <= 0) {
      console.log(`⚠️ Total token supply is zero/invalid for ${mintAddress}`);
      return emptyHolderAnalysis();
    }

    const topAccounts = largestAccountsResp.value.slice(0, 10);

    const resolvedWallets = await Promise.all(
      topAccounts.map(async (acct) => {
        const owner = await getTokenAccountOwner(connection, acct.address.toBase58());
        const amount = Number(acct.uiAmount ?? 0);
        const percentage = totalSupplyUi > 0 ? (amount / totalSupplyUi) * 100 : 0;

        return {
          owner: owner ?? acct.address.toBase58(),
          amount,
          percentage
        };
      })
    );

    const cleanedWallets = resolvedWallets.filter(
      (wallet) => wallet.owner && !isLikelyBurnWallet(wallet.owner)
    );

    const largestHolderPercent =
      cleanedWallets.length > 0 ? cleanedWallets[0].percentage : null;

    const top10HoldingPercent =
      cleanedWallets.length > 0
        ? cleanedWallets.reduce((sum, wallet) => sum + wallet.percentage, 0)
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
      holderCount: null,
      devHoldingPercent,
      largestHolderPercent,
      top10HoldingPercent,
      top10Wallets: cleanedWallets
    };
  } catch (error) {
    console.error(`❌ QuickNode holder analysis error for ${mintAddress}:`, error);
    return emptyHolderAnalysis();
  }
}