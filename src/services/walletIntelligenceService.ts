import WalletLabel from "../models/WalletLabel";
import TokenWalletStats from "../models/TokenWalletStats";

export interface TokenWalletInput {
  mintAddress: string;
  holders: Array<{
    owner: string;
    amount: number;
    percentage: number;
  }>;
}

export interface WalletIntelligenceResult {
  mintAddress: string;

  smartDegenCount: number;
  smartDegenHoldingPercent: number;

  botDegenCount: number;
  botDegenHoldingPercent: number;

  ratTraderCount: number;
  ratTraderHoldingPercent: number;

  alphaCallerCount: number;

  pumpReplyCount: number | null;
}

function hasLabel(labels: string[], label: string): boolean {
  return Array.isArray(labels) && labels.includes(label);
}

export async function analyzeTokenWallets(
  input: TokenWalletInput
): Promise<WalletIntelligenceResult> {
  const { mintAddress, holders } = input;

  if (!holders || holders.length === 0) {
    return {
      mintAddress,
      smartDegenCount: 0,
      smartDegenHoldingPercent: 0,
      botDegenCount: 0,
      botDegenHoldingPercent: 0,
      ratTraderCount: 0,
      ratTraderHoldingPercent: 0,
      alphaCallerCount: 0,
      pumpReplyCount: null
    };
  }

  const walletAddresses = holders
    .map((holder) => holder.owner)
    .filter(Boolean);

  const labeledWallets = await WalletLabel.find({
    walletAddress: { $in: walletAddresses }
  }).lean();

  const walletMap = new Map(
    labeledWallets.map((wallet) => [wallet.walletAddress, wallet])
  );

  let smartDegenCount = 0;
  let smartDegenHoldingPercent = 0;

  let botDegenCount = 0;
  let botDegenHoldingPercent = 0;

  let ratTraderCount = 0;
  let ratTraderHoldingPercent = 0;

  let alphaCallerCount = 0;

  for (const holder of holders) {
    const labeledWallet = walletMap.get(holder.owner);

    if (!labeledWallet) continue;

    const pct = typeof holder.percentage === "number" ? holder.percentage : 0;

    if (hasLabel(labeledWallet.labels, "smart_degen")) {
      smartDegenCount += 1;
      smartDegenHoldingPercent += pct;
    }

    if (hasLabel(labeledWallet.labels, "bot_degen")) {
      botDegenCount += 1;
      botDegenHoldingPercent += pct;
    }

    if (hasLabel(labeledWallet.labels, "rat_trader")) {
      ratTraderCount += 1;
      ratTraderHoldingPercent += pct;
    }

    if (hasLabel(labeledWallet.labels, "alpha_caller")) {
      alphaCallerCount += 1;
    }
  }

  return {
    mintAddress,
    smartDegenCount,
    smartDegenHoldingPercent,
    botDegenCount,
    botDegenHoldingPercent,
    ratTraderCount,
    ratTraderHoldingPercent,
    alphaCallerCount,
    pumpReplyCount: null
  };
}

export async function saveTokenWalletStats(
  result: WalletIntelligenceResult
) {
  return TokenWalletStats.findOneAndUpdate(
    { mintAddress: result.mintAddress },
    {
      $set: {
        smartDegenCount: result.smartDegenCount,
        smartDegenHoldingPercent: result.smartDegenHoldingPercent,
        botDegenCount: result.botDegenCount,
        botDegenHoldingPercent: result.botDegenHoldingPercent,
        ratTraderCount: result.ratTraderCount,
        ratTraderHoldingPercent: result.ratTraderHoldingPercent,
        alphaCallerCount: result.alphaCallerCount,
        pumpReplyCount: result.pumpReplyCount,
        analyzedAt: new Date()
      }
    },
    {
      upsert: true,
      new: true
    }
  );
}

export async function analyzeAndSaveTokenWalletStats(
  input: TokenWalletInput
) {
  const result = await analyzeTokenWallets(input);
  const saved = await saveTokenWalletStats(result);

  return {
    result,
    saved
  };
}