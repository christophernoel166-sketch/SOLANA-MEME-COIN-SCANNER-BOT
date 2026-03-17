import TokenEarlyBuyer from "../models/TokenEarlyBuyer";
import TokenBundleStats from "../models/TokenBundleStats";

function roundAmount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value / 1000) * 1000;
}

export async function detectBundlesForToken(mintAddress: string) {
  const buyers = await TokenEarlyBuyer.find({ mintAddress })
    .sort({ sequence: 1 })
    .limit(20)
    .lean();

  if (!buyers.length) {
    return TokenBundleStats.findOneAndUpdate(
      { mintAddress },
      {
        $set: {
          bundledWalletCount: 0,
          bundleScore: 0,
          sameSecondClusterCount: 0,
          firstThirtySecondBuyers: 0,
          similarSizeClusterCount: 0,
          flagged: false,
          analyzedAt: new Date()
        }
      },
      { upsert: true, new: true }
    );
  }

  const sameSecondMap = new Map<number, number>();
  const sizeMap = new Map<number, number>();

  let firstThirtySecondBuyers = 0;

  for (const buyer of buyers) {
    const delay = typeof buyer.entryDelaySeconds === "number"
      ? buyer.entryDelaySeconds
      : null;

    if (delay !== null) {
      sameSecondMap.set(delay, (sameSecondMap.get(delay) || 0) + 1);

      if (delay <= 30) {
        firstThirtySecondBuyers += 1;
      }
    }

    const amt =
      typeof buyer.amount === "number" && Number.isFinite(buyer.amount)
        ? buyer.amount
        : 0;

    const rounded = roundAmount(amt);

    if (rounded > 0) {
      sizeMap.set(rounded, (sizeMap.get(rounded) || 0) + 1);
    }
  }

  let sameSecondClusterCount = 0;
  for (const count of sameSecondMap.values()) {
    if (count >= 2) sameSecondClusterCount += count;
  }

  let similarSizeClusterCount = 0;
  for (const count of sizeMap.values()) {
    if (count >= 2) similarSizeClusterCount += count;
  }

  const bundledWalletCount = Math.max(
    sameSecondClusterCount,
    similarSizeClusterCount
  );

  const bundleScore =
    sameSecondClusterCount * 3 +
    firstThirtySecondBuyers * 2 +
    similarSizeClusterCount * 2;

  const flagged = bundledWalletCount >= 4 || bundleScore >= 18;

  return TokenBundleStats.findOneAndUpdate(
    { mintAddress },
    {
      $set: {
        bundledWalletCount,
        bundleScore,
        sameSecondClusterCount,
        firstThirtySecondBuyers,
        similarSizeClusterCount,
        flagged,
        analyzedAt: new Date()
      }
    },
    { upsert: true, new: true }
  );
}