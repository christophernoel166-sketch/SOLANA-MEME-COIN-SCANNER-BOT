import WalletLabel from "../models/WalletLabel";

interface WalletMetrics {
  walletAddress: string;
  tokensTraded: number;
  earlyEntries: number;
  fastExits: number;
  avgHoldMinutes: number;
  wins: number;
  losses: number;
}

export async function updateWalletScore(metrics: WalletMetrics) {
  const {
    walletAddress,
    tokensTraded,
    earlyEntries,
    fastExits,
    avgHoldMinutes,
    wins,
    losses
  } = metrics;

  const smartScore =
    earlyEntries * 3 +
    wins * 4 +
    avgHoldMinutes / 10 -
    losses * 2;

  const botScore =
    tokensTraded * 1.5 +
    earlyEntries * 2 -
    avgHoldMinutes / 5;

  const ratScore =
    fastExits * 3 +
    tokensTraded -
    wins * 2;

  const labels: string[] = [];

  if (smartScore >= 25) labels.push("smart_degen");
  if (botScore >= 30) labels.push("bot_degen");
  if (ratScore >= 25) labels.push("rat_trader");

  return WalletLabel.findOneAndUpdate(
    { walletAddress },
    {
      $set: {
        smartScore,
        botScore,
        ratScore,
        labels,
        lastSeenAt: new Date()
      }
    },
    {
      upsert: true,
      new: true
    }
  );
}