"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bot = void 0;
exports.sendTelegramSignal = sendTelegramSignal;
const telegraf_1 = require("telegraf");
const token = process.env.TELEGRAM_BOT_TOKEN;
exports.bot = new telegraf_1.Telegraf(token);
function escapeMarkdown(text) {
    return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}
async function sendTelegramSignal(message) {
    try {
        const chatId = process.env.TELEGRAM_CHANNEL_ID;
        if (!chatId) {
            console.error("❌ TELEGRAM_CHANNEL_ID missing");
            return;
        }
        if (!token) {
            console.error("❌ TELEGRAM_BOT_TOKEN missing");
            return;
        }
        const safeMessage = escapeMarkdown(message);
        await exports.bot.telegram.sendMessage(chatId, safeMessage, {
            parse_mode: "MarkdownV2",
            link_preview_options: {
                is_disabled: true
            }
        });
        console.log("📢 Signal sent to Telegram");
    }
    catch (error) {
        console.error("Telegram send error:", error);
    }
}
//# sourceMappingURL=telegramService.js.map