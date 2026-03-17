"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectBundlesForToken = detectBundlesForToken;
const TokenEarlyBuyer_1 = __importDefault(require("../models/TokenEarlyBuyer"));
const TokenBundleStats_1 = __importDefault(require("../models/TokenBundleStats"));
function roundAmount(value) {
    if (!Number.isFinite(value))
        return 0;
    return Math.round(value / 1000) * 1000;
}
async function detectBundlesForToken(mintAddress) {
    const buyers = await TokenEarlyBuyer_1.default.find({ mintAddress })
        .sort({ sequence: 1 })
        .limit(20)
        .lean();
    if (!buyers.length) {
        return TokenBundleStats_1.default.findOneAndUpdate({ mintAddress }, {
            $set: {
                bundledWalletCount: 0,
                bundleScore: 0,
                sameSecondClusterCount: 0,
                firstThirtySecondBuyers: 0,
                similarSizeClusterCount: 0,
                flagged: false,
                analyzedAt: new Date()
            }
        }, { upsert: true, new: true });
    }
    const sameSecondMap = new Map();
    const sizeMap = new Map();
    let firstThirtySecondBuyers = 0;
    for (const buyer of buyers) {
        const delay = typeof buyer.entryDelaySeconds === "number"
            ? buyer.entryDelaySeconds
            : null;
        if (delay !== null) {
            sameSecondMap.set(delay, (sameSecondMap.get(delay) || 0) + 1);
            if (delay <= 30) {
                firstThirtySecondBuyers += 1;
            }
        }
        const amt = typeof buyer.amount === "number" && Number.isFinite(buyer.amount)
            ? buyer.amount
            : 0;
        const rounded = roundAmount(amt);
        if (rounded > 0) {
            sizeMap.set(rounded, (sizeMap.get(rounded) || 0) + 1);
        }
    }
    let sameSecondClusterCount = 0;
    for (const count of sameSecondMap.values()) {
        if (count >= 2)
            sameSecondClusterCount += count;
    }
    let similarSizeClusterCount = 0;
    for (const count of sizeMap.values()) {
        if (count >= 2)
            similarSizeClusterCount += count;
    }
    const bundledWalletCount = Math.max(sameSecondClusterCount, similarSizeClusterCount);
    const bundleScore = sameSecondClusterCount * 3 +
        firstThirtySecondBuyers * 2 +
        similarSizeClusterCount * 2;
    const flagged = bundledWalletCount >= 4 || bundleScore >= 18;
    return TokenBundleStats_1.default.findOneAndUpdate({ mintAddress }, {
        $set: {
            bundledWalletCount,
            bundleScore,
            sameSecondClusterCount,
            firstThirtySecondBuyers,
            similarSizeClusterCount,
            flagged,
            analyzedAt: new Date()
        }
    }, { upsert: true, new: true });
}
//# sourceMappingURL=bundleDetectionService.js.map