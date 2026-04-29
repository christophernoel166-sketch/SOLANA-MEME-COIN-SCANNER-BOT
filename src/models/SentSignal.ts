import mongoose, { Schema, Document } from "mongoose";

export interface ISentSignal extends Document {
  mintAddress: string;
  profileName: string;
  sentAt: Date;
}

const SentSignalSchema = new Schema<ISentSignal>(
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
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

SentSignalSchema.index(
  { mintAddress: 1, profileName: 1 },
  { unique: true }
);

export default mongoose.model<ISentSignal>("SentSignal", SentSignalSchema);