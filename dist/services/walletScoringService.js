"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateWalletScore = updateWalletScore;
const WalletLabel_1 = __importDefault(require("../models/WalletLabel"));
async function updateWalletScore(metrics) {
    const { walletAddress, tokensTraded, earlyEntries, fastExits, avgHoldMinutes, wins, losses } = metrics;
    const smartScore = earlyEntries * 3 +
        wins * 4 +
        avgHoldMinutes / 10 -
        losses * 2;
    const botScore = tokensTraded * 1.5 +
        earlyEntries * 2 -
        avgHoldMinutes / 5;
    const ratScore = fastExits * 3 +
        tokensTraded -
        wins * 2;
    const labels = [];
    if (smartScore >= 25)
        labels.push("smart_degen");
    if (botScore >= 30)
        labels.push("bot_degen");
    if (ratScore >= 25)
        labels.push("rat_trader");
    return WalletLabel_1.default.findOneAndUpdate({ walletAddress }, {
        $set: {
            smartScore,
            botScore,
            ratScore,
            labels,
            lastSeenAt: new Date()
        }
    }, {
        upsert: true,
        new: true
    });
}
//# sourceMappingURL=walletScoringService.js.map