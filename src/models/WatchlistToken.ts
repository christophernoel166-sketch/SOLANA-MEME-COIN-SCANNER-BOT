import mongoose, { Schema, Document } from "mongoose";

export interface IWatchlistToken extends Document {
  mintAddress: string;

  status: "watching" | "signaled" | "expired";

  firstSeenAt: Date;
  lastScannedAt: Date;

  scanCount: number;

  expiresAt: Date;

  lastScore: number;
  lastAdjustedScore: number;

  rejectionReasons: string[];

  walletFingerprint: string;
  marketFingerprint: string;
  structureFingerprint: string;

  createdAt: Date;
  updatedAt: Date;
}

const WatchlistTokenSchema =
  new Schema<IWatchlistToken>(
    {
      mintAddress: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },

      status: {
        type: String,
        enum: [
          "watching",
          "signaled",
          "expired",
        ],
        default: "watching",
        index: true,
      },

      firstSeenAt: {
        type: Date,
        default: Date.now,
      },

      lastScannedAt: {
        type: Date,
        default: Date.now,
      },

      scanCount: {
        type: Number,
        default: 1,
      },

      expiresAt: {
        type: Date,
        default: () =>
          new Date(
            Date.now() +
              24 * 60 * 60 * 1000
          ), // 24 hours
      },

      lastScore: {
        type: Number,
        default: 0,
      },

      lastAdjustedScore: {
        type: Number,
        default: 0,
      },

      rejectionReasons: {
        type: [String],
        default: [],
      },

      walletFingerprint: {
        type: String,
        default: "",
      },

      marketFingerprint: {
        type: String,
        default: "",
      },

      structureFingerprint: {
        type: String,
        default: "",
      },
    },
    {
      timestamps: true,
    }
  );

export default mongoose.model<IWatchlistToken>(
  "WatchlistToken",
  WatchlistTokenSchema
);