import TokenEarlyBuyer from "../models/TokenEarlyBuyer";
import SniperWallet from "../models/SniperWallet";

export async function getSniperCount(
  mintAddress: string
): Promise<number> {
  const buyers = await TokenEarlyBuyer.find({
    mintAddress
  })
    .limit(10)
    .lean();

  if (buyers.length === 0) return 0;

  const walletAddresses = buyers.map((b) => b.walletAddress);

  const snipers = await SniperWallet.find({
    walletAddress: { $in: walletAddresses },
    earlyBuyCount: { $gte: 3 }
  }).lean();

  return snipers.length;
}