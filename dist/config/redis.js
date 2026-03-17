"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
exports.redis = new ioredis_1.default(redisUrl, {
    maxRetriesPerRequest: null
});
exports.redis.on("connect", () => {
    console.log("🟥 Redis connected");
});
exports.redis.on("error", (error) => {
    console.error("❌ Redis error:", error);
});
//# sourceMappingURL=redis.js.map