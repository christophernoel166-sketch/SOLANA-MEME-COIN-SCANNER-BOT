import mongoose, { Schema, Document } from "mongoose";

export interface ITokenVelocity extends Document {
  mintAddress: string;

  previousBuys: number;
  currentBuys: number;
  buyDelta: number;

  previousVolume5m: number;
  currentVolume5m: number;
  volumeDelta: number;

  breakoutScore: number;
  flagged: boolean;

  analyzedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TokenVelocitySchema = new Schema<ITokenVelocity>(
  {
    mintAddress: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    previousBuys: {
      type: Number,
      default: 0
    },

    currentBuys: {
      type: Number,
      default: 0
    },

    buyDelta: {
      type: Number,
      default: 0
    },

    previousVolume5m: {
      type: Number,
      default: 0
    },

    currentVolume5m: {
      type: Number,
      default: 0
    },

    volumeDelta: {
      type: Number,
      default: 0
    },

    breakoutScore: {
      type: Number,
      default: 0
    },

    flagged: {
      type: Boolean,
      default: false
    },

    analyzedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<ITokenVelocity>(
  "TokenVelocity",
  TokenVelocitySchema
);