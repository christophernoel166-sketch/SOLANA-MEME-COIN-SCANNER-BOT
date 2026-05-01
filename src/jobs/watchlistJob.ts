import SignalWatchlist from "../models/SignalWatchlist";
import SentSignal from "../models/SentSignal";
import TokenSnapshot from "../models/TokenSnapshot";
import { analyzeChartEntry } from "../services/chartEntryService";
import { sendTelegramSignal } from "../services/telegramService";

const WATCHLIST_INTERVAL_MS = 30000;
const MAX_WATCHLIST_ITEMS = 20;

let isWatchlistRunning = false;

function formatPrice(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  return value.toFixed(6);
}

export function startWatchlistJob(): void {
  console.log("👀 Watchlist monitor started");

  setInterval(async () => {
    if (isWatchlistRunning) {
      console.log("⏳ Watchlist job still running, skipping this cycle");
      return;
    }

    isWatchlistRunning = true;

    try {
      const now = new Date();

      await SignalWatchlist.updateMany(
        {
          status: "watching",
          expiresAt: { $lte: now },
        },
        {
          $set: {
            status: "expired",
            reason: "watchlist_expired",
          },
        }
      );

      const watchItems = await SignalWatchlist.find({
        status: "watching",
        expiresAt: { $gt: now },
      })
        .sort({ updatedAt: 1 })
        .limit(MAX_WATCHLIST_ITEMS)
        .lean();

      for (const item of watchItems) {
        const entry = await analyzeChartEntry(item.mintAddress);

        await SignalWatchlist.updateOne(
          { _id: item._id },
          {
            $set: {
              lastCheckedAt: new Date(),
              lastTrend: entry.trend,
              lastAction: entry.action,
              lastConfidence: entry.confidence,
            },
          }
        );

        if (
          entry.trend !== "bullish" ||
          entry.action !== "enter_now" ||
          entry.confidence < 6 ||
          (entry.profitPotentialPct ?? 0) < 30
        ) {
          console.log(`👀 Still watching ${item.mintAddress}`, {
            trend: entry.trend,
            action: entry.action,
            confidence: entry.confidence,
            profitPotentialPct: entry.profitPotentialPct,
          });
          continue;
        }

        try {
          await SentSignal.create({
            mintAddress: item.mintAddress,
            profileName: item.profileName,
            sentAt: new Date(),
          });
        } catch (error: any) {
          if (error?.code === 11000) {
            console.log(`⚠️ Watchlist signal already sent for ${item.mintAddress}`);

            await SignalWatchlist.updateOne(
              { _id: item._id },
              {
                $set: {
                  status: "sent",
                  reason: "already_sent",
                },
              }
            );

            continue;
          }

          throw error;
        }

        const snapshot = await TokenSnapshot.findOne({
          mintAddress: item.mintAddress,
        })
          .sort({ createdAt: -1 })
          .lean();

        const message = `
🚀 *WATCHLIST BUY SIGNAL*

CA:
\`${item.mintAddress}\`

Score: ${item.score ?? "N/A"}

Market
• Liquidity: $${snapshot?.liquidityUsd ?? "N/A"}
• Market Cap: $${snapshot?.marketCap ?? "N/A"}
• Volume(5m): $${snapshot?.volume5m ?? "N/A"}
• Buys / Sells: ${snapshot?.buys ?? 0} / ${snapshot?.sells ?? 0}

📊 *Chart Entry*
• Action: ${entry.action}
• Trend: ${entry.trend}
• Confidence: ${entry.confidence}/10
• Entry Zone: ${formatPrice(entry.entryMin)} - ${formatPrice(entry.entryMax)}
• Breakout: ${formatPrice(entry.breakoutLevel)}
• Take Profit: ${formatPrice(entry.takeProfitLevel)}
• Profit Potential: ${entry.profitPotentialPct?.toFixed(2) ?? "N/A"}%
• Invalidation: ${formatPrice(entry.invalidationLevel)}
`;

        await TokenSnapshot.updateMany(
          { mintAddress: item.mintAddress },
          {
            $set: {
              signalSent: true,
              updatedAt: new Date(),
            },
          }
        );

        await SignalWatchlist.updateOne(
          { _id: item._id },
          {
            $set: {
              status: "sent",
              reason: "bullish_confirmation_sent",
            },
          }
        );

        await sendTelegramSignal(message, item.profileName);

        console.log("🚨 WATCHLIST SIGNAL TRIGGERED:", item.mintAddress);
      }
    } catch (error) {
      console.error("Watchlist job error:", error);
    } finally {
      isWatchlistRunning = false;
    }
  }, WATCHLIST_INTERVAL_MS);
}