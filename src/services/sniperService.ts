import SniperWallet from "../models/SniperWallet";
import TokenEarlyBuyer from "../models/TokenEarlyBuyer";

export async function trackSniperWallets(
  mintAddress: string
): Promise<void> {
  try {
    const earlyBuyers = await TokenEarlyBuyer.find({
      mintAddress
    }).limit(10);

    for (const buyer of earlyBuyers) {
      const wallet = buyer.walletAddress;

      let sniper = await SniperWallet.findOne({
        walletAddress: wallet
      });

      if (!sniper) {
        sniper = await SniperWallet.create({
          walletAddress: wallet,
          earlyBuyCount: 1,
          totalTokensSeen: 1,
          lastSeen: new Date()
        });

        continue;
      }

      sniper.earlyBuyCount += 1;
      sniper.totalTokensSeen += 1;
      sniper.lastSeen = new Date();

      await sniper.save();
    }
  } catch (error) {
    console.error("Sniper tracking error:", error);
  }
}