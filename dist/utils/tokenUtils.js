"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTokenAgeMinutes = getTokenAgeMinutes;
function getTokenAgeMinutes(pairCreatedAt) {
    if (!pairCreatedAt) {
        return null;
    }
    const now = Date.now();
    const ageMs = now - pairCreatedAt;
    return Math.floor(ageMs / 60000);
}
//# sourceMappingURL=tokenUtils.js.map