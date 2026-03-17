"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSignalJob = startSignalJob;
const signalService_1 = require("../services/signalService");
let isSignalRunning = false;
function startSignalJob() {
    console.log("🧠 Signal engine started");
    setInterval(async () => {
        if (isSignalRunning) {
            console.log("⏳ Signal job still running, skipping this cycle");
            return;
        }
        isSignalRunning = true;
        try {
            await (0, signalService_1.runSignalEngine)();
        }
        catch (error) {
            console.error("Signal job error:", error);
        }
        finally {
            isSignalRunning = false;
        }
    }, 20000);
}
//# sourceMappingURL=signalJob.js.map