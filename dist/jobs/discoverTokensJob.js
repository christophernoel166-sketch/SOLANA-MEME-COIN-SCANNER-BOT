"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDiscoveryJob = startDiscoveryJob;
const discoveryService_1 = require("../services/discoveryService");
let isDiscoveryRunning = false;
function startDiscoveryJob() {
    console.log("🚀 Token discovery engine started");
    setInterval(async () => {
        if (isDiscoveryRunning) {
            console.log("⏳ Discovery job still running, skipping this cycle");
            return;
        }
        isDiscoveryRunning = true;
        try {
            await (0, discoveryService_1.discoverNewTokens)();
        }
        catch (error) {
            console.error("Discovery job error:", error);
        }
        finally {
            isDiscoveryRunning = false;
        }
    }, 20000);
}
//# sourceMappingURL=discoverTokensJob.js.map