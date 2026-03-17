"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateMomentum = calculateMomentum;
const TokenSnapshot_1 = __importDefault(require("../models/TokenSnapshot"));
const TokenMomentum_1 = __importDefault(require("../models/TokenMomentum"));
const TokenEarlyBuyer_1 = __importDefault(require("../models/TokenEarlyBuyer"));
async function calculateMomentum(mintAddress) {
    try {
        const snapshot = await TokenSnapshot_1.default.findOne({ mintAddress })
            .sort({ createdAt: -1 })
            .lean();
        if (!snapshot)
            return;
        const earlyBuyers = await TokenEarlyBuyer_1.default.find({ mintAddress });
        const buyVelocity = snapshot.buys ?? 0;
        const walletVelocity = earlyBuyers.length;
        const liquidityAcceleration = snapshot.liquidityUsd ?? 0;
        const boostAcceleration = snapshot.boostsActive ?? 0;
        let momentumScore = 0;
        if (buyVelocity > 150)
            momentumScore += 25;
        if (walletVelocity > 30)
            momentumScore += 25;
        if (liquidityAcceleration > 20000)
            momentumScore += 25;
        if (boostAcceleration > 5)
            momentumScore += 25;
        await TokenMomentum_1.default.findOneAndUpdate({ mintAddress }, {
            mintAddress,
            buyVelocity,
            walletVelocity,
            liquidityAcceleration,
            boostAcceleration,
            momentumScore,
            analyzedAt: new Date()
        }, { upsert: true });
    }
    catch (error) {
        console.error("Momentum calculation error:", error);
    }
}
//# sourceMappingURL=momentumService.js.map