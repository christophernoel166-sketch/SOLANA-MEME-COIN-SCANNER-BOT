import { discoverNewTokens } from "../services/discoveryService";

let isDiscoveryRunning = false;

export function startDiscoveryJob(): void {
  console.log("🚀 Token discovery engine started");

  setInterval(async () => {
    if (isDiscoveryRunning) {
      console.log("⏳ Discovery job still running, skipping this cycle");
      return;
    }

    isDiscoveryRunning = true;

    try {
      await discoverNewTokens();
    } catch (error) {
      console.error("Discovery job error:", error);
    } finally {
      isDiscoveryRunning = false;
    }
  }, 20000);
}