import SignalWalletLink from "../models/SignalWalletLink";

export async function linkSignalWallets({
  mintAddress,
  walletAddresses
}: {
  mintAddress: string;
  walletAddresses: string[];
}) {
  if (!walletAddresses.length) {
    return;
  }

  const uniqueWallets = [...new Set(walletAddresses)];

  await Promise.all(
    uniqueWallets.map((walletAddress) =>
      SignalWalletLink.updateOne(
        {
          mintAddress,
          walletAddress
        },
        {
          $setOnInsert: {
            mintAddress,
            walletAddress,
            signalSentAt: new Date()
          }
        },
        {
          upsert: true
        }
      )
    )
  );
}