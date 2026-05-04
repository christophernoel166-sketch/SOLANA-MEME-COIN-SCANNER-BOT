export type LiquidityLockResult = {
  locked: boolean | null;
  source: "rugcheck" | "unknown";
  reason?: string;
};

type RugCheckRisk = {
  name?: string;
  description?: string;
  level?: string;
  score?: number;
};

export async function checkLiquidityLocked(
  mintAddress: string
): Promise<LiquidityLockResult> {
  try {
    const url = `https://api.rugcheck.xyz/v1/tokens/${mintAddress}/report`;

    const res = await fetch(url, {
      headers: {
        accept: "application/json",
      },
    });

    if (!res.ok) {
      console.warn(
        `⚠️ RugCheck liquidity request failed for ${mintAddress}: ${res.status}`
      );

      return {
        locked: null,
        source: "unknown",
        reason: "rugcheck_request_failed",
      };
    }

    const data: any = await res.json();

    const risks: RugCheckRisk[] = Array.isArray(data?.risks)
      ? data.risks
      : [];

    const riskText = risks
      .map((risk) =>
        `${risk.name ?? ""} ${risk.description ?? ""}`.toLowerCase()
      )
      .join(" ");

    const hasUnlockedLiquidityWarning =
      riskText.includes("unlocked liquidity") ||
      riskText.includes("lp tokens unlocked") ||
      riskText.includes("liquidity is not locked") ||
      riskText.includes("not locked");

    const hasLockedLiquiditySignal =
      riskText.includes("liquidity locked") ||
      riskText.includes("lp tokens burned") ||
      riskText.includes("lp burned");

    if (hasUnlockedLiquidityWarning) {
      return {
        locked: false,
        source: "rugcheck",
        reason: "unlocked_liquidity_warning",
      };
    }

    if (hasLockedLiquiditySignal) {
      return {
        locked: true,
        source: "rugcheck",
        reason: "locked_liquidity_detected",
      };
    }

    return {
      locked: null,
      source: "rugcheck",
      reason: "liquidity_lock_unknown",
    };
  } catch (error) {
    console.error("checkLiquidityLocked error:", error);

    return {
      locked: null,
      source: "unknown",
      reason: "liquidity_lock_check_error",
    };
  }
}