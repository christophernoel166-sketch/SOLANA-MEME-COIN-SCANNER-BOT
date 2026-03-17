import TokenEarlyBuyer from "../models/TokenEarlyBuyer";
import TokenFundingCluster from "../models/TokenFundingCluster";

export interface BuyerFundingInput {
  walletAddress: string;
  funder: string | null;
}

/*
  For now this service accepts a buyer -> funder map.
  Later we can replace the input source with real Solana RPC funding lookup.
*/

export async function detectFundingClusters(
  mintAddress: string,
  buyerFunders: BuyerFundingInput[]
) {
  if (!buyerFunders.length) {
    return TokenFundingCluster.findOneAndUpdate(
      { mintAddress },
      {
        $set: {
          uniqueFundingWalletCount: 0,
          largestFundingClusterSize: 0,
          clusteredBuyerCount: 0,
          fundingClusterScore: 0,
          flagged: false,
          fundingGroups: [],
          analyzedAt: new Date()
        }
      },
      { upsert: true, new: true }
    );
  }

  const fundingMap = new Map<string, string[]>();

  for (const item of buyerFunders) {
    if (!item.funder) continue;

    if (!fundingMap.has(item.funder)) {
      fundingMap.set(item.funder, []);
    }

    fundingMap.get(item.funder)!.push(item.walletAddress);
  }

  const fundingGroups = Array.from(fundingMap.entries()).map(
    ([funder, buyers]) => ({
      funder,
      buyerCount: buyers.length,
      buyers
    })
  );

  const uniqueFundingWalletCount = fundingGroups.length;

  const largestFundingClusterSize = fundingGroups.reduce((max, group) => {
    return Math.max(max, group.buyerCount);
  }, 0);

  const clusteredBuyerCount = fundingGroups.reduce((sum, group) => {
    return group.buyerCount >= 2 ? sum + group.buyerCount : sum;
  }, 0);

  const fundingClusterScore =
    largestFundingClusterSize * 5 +
    clusteredBuyerCount * 2;

  const flagged =
    largestFundingClusterSize >= 3 ||
    clusteredBuyerCount >= 4 ||
    fundingClusterScore >= 18;

  return TokenFundingCluster.findOneAndUpdate(
    { mintAddress },
    {
      $set: {
        uniqueFundingWalletCount,
        largestFundingClusterSize,
        clusteredBuyerCount,
        fundingClusterScore,
        flagged,
        fundingGroups,
        analyzedAt: new Date()
      }
    },
    { upsert: true, new: true }
  );
}

export async function getEarlyBuyerWallets(mintAddress: string, limit = 20) {
  const buyers = await TokenEarlyBuyer.find({ mintAddress })
    .sort({ sequence: 1 })
    .limit(limit)
    .lean();

  return buyers.map((buyer) => buyer.walletAddress);
}