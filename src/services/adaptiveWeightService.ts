import AdaptiveWeights from "../models/AdaptiveWeights";

export async function getAdaptiveWeights() {
  const existing =
    await AdaptiveWeights.findOne().lean();

  if (existing) {
    return existing;
  }

  await AdaptiveWeights.create({});

  const created =
    await AdaptiveWeights.findOne().lean();

  if (!created) {
    throw new Error(
      "Failed to initialize AdaptiveWeights"
    );
  }

  return created;
}