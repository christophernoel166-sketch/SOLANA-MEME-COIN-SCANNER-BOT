import TokenEarlyBuyer from "../models/TokenEarlyBuyer";

export interface EarlyBuyerInput {
  mintAddress: string;
  walletAddress: string;
  amount?: number | null;
  priceUsd?: number | null;
  entryTime: Date;
  tokenLaunchTime?: Date | null;
  sequence?: number;
}

export async function recordEarlyBuyer(
  input: EarlyBuyerInput
): Promise<void> {
  const {
    mintAddress,
    walletAddress,
    amount = null,
    priceUsd = null,
    entryTime,
    tokenLaunchTime = null,
    sequence
  } = input;

  const existing = await TokenEarlyBuyer.findOne({
    mintAddress,
    walletAddress
  });

  if (existing) return;

  const count = await TokenEarlyBuyer.countDocuments({ mintAddress });

  const resolvedSequence =
    typeof sequence === "number" && sequence > 0 ? sequence : count + 1;

  let entryDelaySeconds: number | null = null;

  if (tokenLaunchTime) {
    entryDelaySeconds = Math.floor(
      (entryTime.getTime() - tokenLaunchTime.getTime()) / 1000
    );
  }

  await TokenEarlyBuyer.create({
    mintAddress,
    walletAddress,
    amount,
    priceUsd,
    entryTime,
    entryDelaySeconds,
    sequence: resolvedSequence
  });
}

export async function recordApproximateEarlyBuyers(params: {
  mintAddress: string;
  tokenLaunchTime?: Date | null;
  buyers: Array<{
    owner: string;
    amount: number;
    percentage: number;
  }>;
  priceUsd?: number | null;
}): Promise<void> {
  const {
    mintAddress,
    tokenLaunchTime = null,
    buyers,
    priceUsd = null
  } = params;

  for (let i = 0; i < buyers.length; i++) {
    const buyer = buyers[i];

    if (!buyer?.owner) continue;

    await recordEarlyBuyer({
      mintAddress,
      walletAddress: buyer.owner,
      amount: buyer.amount ?? null,
      priceUsd,
      entryTime: new Date(),
      tokenLaunchTime,
      sequence: i + 1
    });
  }
}

export async function getEarlyBuyers(
  mintAddress: string,
  limit = 20
) {
  return TokenEarlyBuyer.find({ mintAddress })
    .sort({ sequence: 1 })
    .limit(limit)
    .lean();
}