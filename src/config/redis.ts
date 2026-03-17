import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null
});

redis.on("connect", () => {
  console.log("🟥 Redis connected");
});

redis.on("error", (error) => {
  console.error("❌ Redis error:", error);
});