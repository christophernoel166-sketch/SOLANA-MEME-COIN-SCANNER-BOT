import { Telegraf } from "telegraf";

const token = process.env.TELEGRAM_BOT_TOKEN as string;

export const bot = new Telegraf(token);

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

/**
 * 🔥 PROFILE → CHANNEL ROUTING
 * Add your Telegram channel IDs here
 */
function getChannelId(profileName?: string): string | null {
  if (!profileName) {
    return process.env.TELEGRAM_CHANNEL_ID ?? null;
  }

  if (profileName === "fresh_meme") {
    return process.env.TELEGRAM_CHANNEL_FRESH ?? null;
  }

  if (profileName === "early_runner") {
    return process.env.TELEGRAM_CHANNEL_RUNNER ?? null;
  }

  // fallback
  return process.env.TELEGRAM_CHANNEL_ID ?? null;
}

export async function sendTelegramSignal(
  message: string,
  profileName?: string
) {
  try {
    if (!token) {
      console.error("❌ TELEGRAM_BOT_TOKEN missing");
      return;
    }

    const chatId = getChannelId(profileName);

    if (!chatId) {
      console.error(
        `❌ No Telegram channel configured for profile: ${profileName}`
      );
      return;
    }

    // ✅ Add profile label to message
    let taggedMessage = message;

    if (profileName === "fresh_meme") {
      taggedMessage = `🚀 *FRESH MEME SIGNAL*\n\n${message}`;
    }

    if (profileName === "early_runner") {
      taggedMessage = `🔥 *RUNNER SIGNAL (1H–4H)*\n\n${message}`;
    }

    const safeMessage = escapeMarkdown(taggedMessage);

    await bot.telegram.sendMessage(chatId, safeMessage, {
      parse_mode: "MarkdownV2",
      link_preview_options: {
        is_disabled: true
      }
    });

    console.log(`📢 Signal sent (${profileName ?? "default"})`);
  } catch (error) {
    console.error("Telegram send error:", error);
  }
}