import Bottleneck from "bottleneck";
import { Connection } from "@solana/web3.js";

type RpcProviderName = "alchemy" | "quicknode" | "public";

type RpcProvider = {
  name: RpcProviderName;
  url: string;
  connection: Connection;
  cooldownUntil: number;
};

const providerUrls: Array<{ name: RpcProviderName; url?: string }> = [
  { name: "alchemy", url: process.env.ALCHEMY_RPC_URL },
  { name: "quicknode", url: process.env.QUICKNODE_RPC_URL },
  { name: "public", url: "https://api.mainnet-beta.solana.com" }
];

const providers: RpcProvider[] = providerUrls
  .filter((p) => typeof p.url === "string" && p.url.trim().length > 0)
  .map((p) => ({
    name: p.name,
    url: p.url!.trim(),
    connection: new Connection(p.url!.trim(), "confirmed"),
    cooldownUntil: 0
  }));

if (providers.length === 0) {
  throw new Error(
    "No RPC providers configured. Set ALCHEMY_RPC_URL or QUICKNODE_RPC_URL."
  );
}

export const rpcLimiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 250
});

function getActiveProvider(): RpcProvider {
  const now = Date.now();

  const active = providers.find((p) => p.cooldownUntil <= now);
  if (active) return active;

  const soonest = providers.reduce((best, current) =>
    current.cooldownUntil < best.cooldownUntil ? current : best
  );

  return soonest;
}

function markProviderCooldown(provider: RpcProvider, ms: number): void {
  provider.cooldownUntil = Date.now() + ms;
  console.log(
    `⚠️ RPC provider ${provider.name} cooling down for ${Math.round(ms / 1000)}s`
  );
}

function isRateLimitError(error: unknown): boolean {
  const text =
    error instanceof Error ? error.message : String(error);

  return (
    text.includes("429") ||
    text.toLowerCase().includes("too many requests") ||
    text.toLowerCase().includes("rate limit") ||
    text.toLowerCase().includes("daily request limit reached")
  );
}

export async function withRpc<T>(
  operation: (connection: Connection) => Promise<T>,
  options?: {
    retries?: number;
    cooldownMs?: number;
  }
): Promise<T> {
  const retries = options?.retries ?? 2;
  const cooldownMs = options?.cooldownMs ?? 5 * 60 * 1000;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const provider = getActiveProvider();

    try {
      return await rpcLimiter.schedule(() => operation(provider.connection));
    } catch (error) {
      lastError = error;

      if (isRateLimitError(error)) {
        markProviderCooldown(provider, cooldownMs);
        continue;
      }

      throw error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError));
}

export function getRpcProviderStatus(): Array<{
  name: RpcProviderName;
  cooldownUntil: number;
}> {
  return providers.map((p) => ({
    name: p.name,
    cooldownUntil: p.cooldownUntil
  }));
}