import mongoose, { Schema, Document } from "mongoose";

export interface IPatternStatistics extends Document {
  patternKey: string;

  totalSignals: number;

  wins: number;
  losses: number;
  neutrals: number;

  winRate: number;

  averageReturnPct: number;
  averageMaxGainPct: number;
  averageDrawdownPct: number;

  // NEW: Additional learning metrics
  medianReturnPct: number;
  bestReturnPct: number;
  worstReturnPct: number;
  averageHoldingTimeHours: number;

  // Historical confidence score derived from
  // win rate and sample size
  confidenceScore: number;

  updatedAt: Date;
  createdAt: Date;
}

const PatternStatisticsSchema =
  new Schema<IPatternStatistics>(
    {
      patternKey: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },

      totalSignals: {
        type: Number,
        default: 0,
      },

      wins: {
        type: Number,
        default: 0,
      },

      losses: {
        type: Number,
        default: 0,
      },

      neutrals: {
        type: Number,
        default: 0,
      },

      winRate: {
        type: Number,
        default: 0,
      },

      averageReturnPct: {
        type: Number,
        default: 0,
      },

      averageMaxGainPct: {
        type: Number,
        default: 0,
      },

      averageDrawdownPct: {
        type: Number,
        default: 0,
      },

      // NEW
      medianReturnPct: {
        type: Number,
        default: 0,
      },

      bestReturnPct: {
        type: Number,
        default: 0,
      },

      worstReturnPct: {
        type: Number,
        default: 0,
      },

      averageHoldingTimeHours: {
        type: Number,
        default: 0,
      },

      confidenceScore: {
        type: Number,
        default: 0,
      },
    },
    {
      timestamps: true,
    }
  );

export default mongoose.model<IPatternStatistics>(
  "PatternStatistics",
  PatternStatisticsSchema
);