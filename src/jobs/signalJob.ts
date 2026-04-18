import { runSignalEngine } from "../services/signalService";
import { SIGNAL_PROFILES } from "../config/signalProfiles";

const SIGNAL_INTERVAL_MS = 20000;
const PROFILE_DELAY_MS = 1000;

let isSignalRunning = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function startSignalJob(): void {
  console.log("🧠 Signal engine started (multi-profile)");

  setInterval(async () => {
    if (isSignalRunning) {
      console.log("⏳ Signal job still running, skipping this cycle");
      return;
    }

    isSignalRunning = true;

    try {
      for (const profile of SIGNAL_PROFILES) {
        await runSignalEngine(profile);
        await sleep(PROFILE_DELAY_MS);
      }
    } catch (error) {
      console.error("Signal job error:", error);
    } finally {
      isSignalRunning = false;
    }
  }, SIGNAL_INTERVAL_MS);
}