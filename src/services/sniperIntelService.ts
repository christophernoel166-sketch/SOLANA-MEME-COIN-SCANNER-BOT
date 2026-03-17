import TokenEarlyBuyer from "../models/TokenEarlyBuyer";
import SniperWallet from "../models/SniperWallet";

export async function getSniperCount(
  mintAddress: string
): Promise<number> {
  const buyers = await TokenEarlyBuyer.find({
    mintAddress
  }).limit(10);

  let sniperCount = 0;

  for (const buyer of buyers) {
    const sniper = await SniperWallet.findOne({
      walletAddress: buyer.walletAddress
    });

    if (!sniper) continue;

    if (sniper.earlyBuyCount >= 3) {
      sniperCount++;
    }
  }

  return sniperCount;
}