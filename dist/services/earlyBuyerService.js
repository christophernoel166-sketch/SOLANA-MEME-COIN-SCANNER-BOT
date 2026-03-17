"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordEarlyBuyer = recordEarlyBuyer;
exports.recordApproximateEarlyBuyers = recordApproximateEarlyBuyers;
exports.getEarlyBuyers = getEarlyBuyers;
const TokenEarlyBuyer_1 = __importDefault(require("../models/TokenEarlyBuyer"));
async function recordEarlyBuyer(input) {
    const { mintAddress, walletAddress, amount = null, priceUsd = null, entryTime, tokenLaunchTime = null, sequence } = input;
    const existing = await TokenEarlyBuyer_1.default.findOne({
        mintAddress,
        walletAddress
    });
    if (existing)
        return;
    const count = await TokenEarlyBuyer_1.default.countDocuments({ mintAddress });
    const resolvedSequence = typeof sequence === "number" && sequence > 0 ? sequence : count + 1;
    let entryDelaySeconds = null;
    if (tokenLaunchTime) {
        entryDelaySeconds = Math.floor((entryTime.getTime() - tokenLaunchTime.getTime()) / 1000);
    }
    await TokenEarlyBuyer_1.default.create({
        mintAddress,
        walletAddress,
        amount,
        priceUsd,
        entryTime,
        entryDelaySeconds,
        sequence: resolvedSequence
    });
}
async function recordApproximateEarlyBuyers(params) {
    const { mintAddress, tokenLaunchTime = null, buyers, priceUsd = null } = params;
    for (let i = 0; i < buyers.length; i++) {
        const buyer = buyers[i];
        if (!buyer?.owner)
            continue;
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
async function getEarlyBuyers(mintAddress, limit = 20) {
    return TokenEarlyBuyer_1.default.find({ mintAddress })
        .sort({ sequence: 1 })
        .limit(limit)
        .lean();
}
//# sourceMappingURL=earlyBuyerService.js.map