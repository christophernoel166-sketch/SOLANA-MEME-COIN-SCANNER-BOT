import mongoose, { Schema, Document } from "mongoose";

export type WatchlistStatus =
  | "watching"
  | "sent"
  | "expired"
  | "rejected";

export interface ISignalWatchlist extends Document {
  mintAddress: string;
  profileName: string;
  status: WatchlistStatus;

  firstSeenAt: Date;
  lastCheckedAt?: Date | null;
  expiresAt: Date;

  score?: number;
  reason?: string | null;

  lastTrend?: string | null;
  lastAction?: string | null;
  lastConfidence?: number | null;

  createdAt: Date;
  updatedAt: Date;
}

const SignalWatchlistSchema = new Schema<ISignalWatchlist>(
  {
    mintAddress: {
      type: String,
      required: true,
      index: true,
    },

    profileName: {
      type: String,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["watching", "sent", "expired", "rejected"],
      default: "watching",
      index: true,
    },

    firstSeenAt: {
      type: Date,
      default: Date.now,
    },

    lastCheckedAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    score: {
      type: Number,
      default: null,
    },

    reason: {
      type: String,
      default: null,
    },

    lastTrend: {
      type: String,
      default: null,
    },

    lastAction: {
      type: String,
      default: null,
    },

    lastConfidence: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

SignalWatchlistSchema.index(
  { mintAddress: 1, profileName: 1 },
  { unique: true }
);

export default mongoose.model<ISignalWatchlist>(
  "SignalWatchlist",
  SignalWatchlistSchema
);