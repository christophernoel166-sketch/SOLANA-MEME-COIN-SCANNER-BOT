export const SIGNAL_PROFILES = [
  {
  name: "fresh_meme",
  minAge: 0,
  maxAge: 59,
  description: "0-59 minutes (ultra early plays)",

  minLiquidityUsd: 15000,
  minMarketCap: 30000,
  minVolume5m: 2000,
  requireBuyPressure: true,

  maxLargestHolderPercent: 18,
  maxTop10HoldingPercent: 25,

  maxBotDegenCount: 8,
  maxRatTraderCount: 12,
  minSniperCount: 0,
  maxSniperCount: 20,

  maxBundleScore: 10,
  maxBundledWalletCount: 7,
  requireBundleNotFlagged: false,

  minMomentumScore: 15,
  minBreakoutScore: 15,
  requireVelocityFlagged: false
},
{
    name: "early_runner",
    minAge: 60,
    maxAge: 240,
    description: "1h - 4h (confirmed runners)",

    minLiquidityUsd: 20000,
    minMarketCap: 40000,
    minVolume5m: 3000,
    requireBuyPressure: true,

    maxLargestHolderPercent: 5,
    maxTop10HoldingPercent: 18,

    maxBotDegenCount: 4,
    maxRatTraderCount: 6,
    minSniperCount: 2,
    maxSniperCount: 12,

    maxBundleScore: 5,
    maxBundledWalletCount: 4,
    requireBundleNotFlagged: true,

    minMomentumScore: 30,
    minBreakoutScore: 30,
    requireVelocityFlagged: false
  }
];