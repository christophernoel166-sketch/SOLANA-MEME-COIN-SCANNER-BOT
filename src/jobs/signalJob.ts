import { runSignalEngine } from "../services/signalService";
import { SIGNAL_PROFILES } from "../config/signalProfiles";

const SIGNAL_INTERVAL_MS = 20000;

let isSignalRunning = false;

export function startSignalJob(): void {
  console.log("🧠 Signal engine started (fresh_meme only)");

  setInterval(async () => {
    if (isSignalRunning) {
      console.log("⏳ Signal job still running, skipping this cycle");
      return;
    }

    isSignalRunning = true;

    try {
      // ✅ ONLY run fresh_meme profile
      const freshProfile = SIGNAL_PROFILES.find(
        (profile) => profile.name === "fresh_meme"
      );

      if (!freshProfile) {
        console.log("⚠️ fresh_meme profile not found");
        return;
      }

      await runSignalEngine(freshProfile);
    } catch (error) {
      console.error("Signal job error:", error);
    } finally {
      isSignalRunning = false;
    }
  }, SIGNAL_INTERVAL_MS);
}