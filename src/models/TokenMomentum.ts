import mongoose, { Schema, Document } from "mongoose";

export interface ITokenMomentum extends Document {
  mintAddress: string;

  buyVelocity: number;
  walletVelocity: number;
  liquidityAcceleration: number;
  boostAcceleration: number;

  momentumScore: number;

  analyzedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TokenMomentumSchema = new Schema<ITokenMomentum>(
  {
    mintAddress: { type: String, required: true, unique: true },

    buyVelocity: Number,
    walletVelocity: Number,
    liquidityAcceleration: Number,
    boostAcceleration: Number,

    momentumScore: Number,

    analyzedAt: Date
  },
  { timestamps: true }
);

export default mongoose.model<ITokenMomentum>(
  "TokenMomentum",
  TokenMomentumSchema
);