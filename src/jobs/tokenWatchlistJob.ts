import WatchlistToken from "../models/WatchlistToken";
import { expireOldWatchlistEntries } from "../services/watchlistService";
import { runSignalEngine } from "../services/signalService";

const WATCHLIST_RESCAN_INTERVAL_MS = Number(
  process.env.WATCHLIST_RESCAN_INTERVAL_MS ??
    3 * 60 * 1000
);

const MAX_BATCH_SIZE = 25;

let running = false;

export function startTokenWatchlistJob(): void {
  console.log(
    "👀 Token watchlist re-scan job started"
  );

  setInterval(async () => {
    if (running) {
      return;
    }

    running = true;

    try {
      // Expire stale watchlist entries
      await expireOldWatchlistEntries();

      // Load active watchlist tokens
      const watching = await WatchlistToken.find({
        status: "watching",
        expiresAt: {
          $gt: new Date(),
        },
      })
        .sort({
          lastScannedAt: 1,
        })
        .limit(MAX_BATCH_SIZE)
        .lean();

      if (watching.length === 0) {
        return;
      }

      const mintAddresses = watching.map(
        (token) => token.mintAddress
      );

      console.log(
        `👀 Rechecking ${mintAddresses.length} watched tokens`
      );

      // Reuse the existing signal engine to
      // re-evaluate only these watched tokens.
      await runSignalEngine(
        undefined,
        mintAddresses
      );

      // Update scan metadata for tokens that
      // are still being watched.
      await WatchlistToken.updateMany(
        {
          mintAddress: {
            $in: mintAddresses,
          },
          status: "watching",
        },
        {
          $set: {
            lastScannedAt: new Date(),
          },
          $inc: {
            scanCount: 1,
          },
        }
      );
    } catch (err) {
      console.error(
        "❌ Token watchlist job failed:",
        err
      );
    } finally {
      running = false;
    }
  }, WATCHLIST_RESCAN_INTERVAL_MS);
}