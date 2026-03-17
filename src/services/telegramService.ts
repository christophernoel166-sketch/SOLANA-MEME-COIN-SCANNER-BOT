import { Telegraf } from "telegraf";

const token = process.env.TELEGRAM_BOT_TOKEN as string;

export const bot = new Telegraf(token);

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

export async function sendTelegramSignal(message: string) {
  try {
    const chatId = process.env.TELEGRAM_CHANNEL_ID as string;

    if (!chatId) {
      console.error("❌ TELEGRAM_CHANNEL_ID missing");
      return;
    }

    if (!token) {
      console.error("❌ TELEGRAM_BOT_TOKEN missing");
      return;
    }

    const safeMessage = escapeMarkdown(message);

    await bot.telegram.sendMessage(chatId, safeMessage, {
      parse_mode: "MarkdownV2",
      link_preview_options: {
        is_disabled: true
      }
    });

    console.log("📢 Signal sent to Telegram");
  } catch (error) {
    console.error("Telegram send error:", error);
  }
}