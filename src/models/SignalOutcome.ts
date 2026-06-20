import mongoose, { Schema, Document } from "mongoose";

export interface ISignalOutcome extends Document {
  mintAddress: string;

  signalSentAt: Date;

  entryPrice: number;

  currentPrice: number;

  maxPrice: number;

  minPrice: number;

  returnPct: number;

  maxGainPct: number;

  drawdownPct: number;

  evaluationVersion: number;

  exitPrice: number;

  outcome:
    | "pending"
    | "win"
    | "loss"
    | "neutral";

  evaluatedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

const SignalOutcomeSchema =
  new Schema<ISignalOutcome>(
    {
      mintAddress: {
        type: String,
        required: true,
        index: true,
      },

      signalSentAt: {
        type: Date,
        required: true,
      },

      entryPrice: {
        type: Number,
        required: true,
      },

      currentPrice: {
        type: Number,
        default: 0,
      },

      maxPrice: {
        type: Number,
        default: 0,
      },

      minPrice: {
        type: Number,
        default: 0,
      },

      returnPct: {
        type: Number,
        default: 0,
      },

      maxGainPct: {
        type: Number,
        default: 0,
      },

      drawdownPct: {
        type: Number,
        default: 0,
      },

      evaluationVersion: {
        type: Number,
        default: 1,
      },

      exitPrice: {
        type: Number,
        default: 0,
      },

      outcome: {
        type: String,
        enum: [
          "pending",
          "win",
          "loss",
          "neutral",
        ],
        default: "pending",
      },

      evaluatedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

export default mongoose.model<ISignalOutcome>(
  "SignalOutcome",
  SignalOutcomeSchema
);