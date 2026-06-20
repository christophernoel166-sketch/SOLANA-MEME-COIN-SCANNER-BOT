import PatternSnapshot from "../models/PatternSnapshot";

export interface SavePatternSnapshotInput {
  mintAddress: string;

  smartWalletCount: number;
  walletPerformanceScore: number;

  momentumScore: number;
  breakoutScore: number;

  bundleScore: number;
  fundingClusterScore: number;

  liquidityUsd: number;
  marketCap: number;
  volume5m: number;

  // NEW
  walletFingerprint: string;
  marketFingerprint: string;
  structureFingerprint: string;

  historicalPatternKey: string;
  historicalConfidence: number;
}

export async function savePatternSnapshot(
  input: SavePatternSnapshotInput
) {
  const {
    mintAddress,

    smartWalletCount,
    walletPerformanceScore,

    momentumScore,
    breakoutScore,

    bundleScore,
    fundingClusterScore,

    liquidityUsd,
    marketCap,
    volume5m,

    // NEW
    walletFingerprint,
    marketFingerprint,
    structureFingerprint,

    historicalPatternKey,
    historicalConfidence,
  } = input;

  return PatternSnapshot.findOneAndUpdate(
    {
      mintAddress,
    },
    {
      $set: {
        smartWalletCount,
        walletPerformanceScore,

        momentumScore,
        breakoutScore,

        bundleScore,
        fundingClusterScore,

        liquidityUsd,
        marketCap,
        volume5m,

        // NEW
        walletFingerprint,
        marketFingerprint,
        structureFingerprint,

        historicalPatternKey,
        historicalConfidence,

        // Initially pending; updated later when
        // SignalOutcome is finalized.
        outcome: "pending",
      },
    },
    {
      upsert: true,
      new: true,
    }
  );
}