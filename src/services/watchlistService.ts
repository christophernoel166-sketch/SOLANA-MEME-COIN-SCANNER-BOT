import WatchlistToken from "../models/WatchlistToken";

export interface AddToWatchlistInput {
  mintAddress: string;

  lastScore: number;
  lastAdjustedScore: number;

  rejectionReasons?: string[];

  walletFingerprint?: string;
  marketFingerprint?: string;
  structureFingerprint?: string;
}

export async function addToWatchlist(
  input: AddToWatchlistInput
) {
  const {
    mintAddress,
    lastScore,
    lastAdjustedScore,
    rejectionReasons = [],
    walletFingerprint = "",
    marketFingerprint = "",
    structureFingerprint = "",
  } = input;

  return WatchlistToken.findOneAndUpdate(
    {
      mintAddress,
    },
    {
      $set: {
        status: "watching",
        lastScannedAt: new Date(),

        lastScore,
        lastAdjustedScore,

        rejectionReasons,

        walletFingerprint,
        marketFingerprint,
        structureFingerprint,
      },

      $setOnInsert: {
        firstSeenAt: new Date(),

        expiresAt: new Date(
          Date.now() + 24 * 60 * 60 * 1000
        ),
      },

      $inc: {
        scanCount: 1,
      },
    },
    {
      upsert: true,
      new: true,
    }
  );
}

export async function markAsSignaled(
  mintAddress: string
) {
  return WatchlistToken.findOneAndUpdate(
    {
      mintAddress,
    },
    {
      $set: {
        status: "signaled",
        lastScannedAt: new Date(),
      },
    },
    {
      new: true,
    }
  );
}

export async function markAsExpired(
  mintAddress: string
) {
  return WatchlistToken.findOneAndUpdate(
    {
      mintAddress,
    },
    {
      $set: {
        status: "expired",
        lastScannedAt: new Date(),
      },
    },
    {
      new: true,
    }
  );
}

export async function refreshWatchlistEntry(
  mintAddress: string,
  updates: {
    lastScore?: number;
    lastAdjustedScore?: number;
    rejectionReasons?: string[];
    walletFingerprint?: string;
    marketFingerprint?: string;
    structureFingerprint?: string;
  }
) {
  return WatchlistToken.findOneAndUpdate(
    {
      mintAddress,
    },
    {
      $set: {
        ...updates,
        lastScannedAt: new Date(),
      },
      $inc: {
        scanCount: 1,
      },
    },
    {
      new: true,
    }
  );
}

export async function getActiveWatchlist(
  limit = 100
) {
  return WatchlistToken.find({
    status: "watching",
    expiresAt: {
      $gt: new Date(),
    },
  })
    .sort({
      lastScannedAt: 1,
    })
    .limit(limit)
    .lean();
}

export async function expireOldWatchlistEntries() {
  return WatchlistToken.updateMany(
    {
      status: "watching",
      expiresAt: {
        $lte: new Date(),
      },
    },
    {
      $set: {
        status: "expired",
      },
    }
  );
}