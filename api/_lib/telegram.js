'use strict';

function telegramConfig() {
  return {
    token: String(process.env.TELEGRAM_BOT_TOKEN || '').trim(),
    chatId: String(process.env.TELEGRAM_CHAT_ID || '').trim()
  };
}

function isTelegramConfigured() {
  const config = telegramConfig();
  return Boolean(config.token && config.chatId);
}

/**
 * Send a message using server-only Telegram credentials.
 * Returns a small status object; never returns the bot token or raw Telegram response.
 */
async function sendTelegramMessage(text) {
  const config = telegramConfig();
  if (!config.token || !config.chatId) return { status: 'not_configured', messageId: null };

  const message = String(text == null ? '' : text).trim().slice(0, 3900);
  if (!message) return { status: 'failed', messageId: null };

  try {
    const response = await fetch('https://api.telegram.org/bot' + config.token + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: message,
        disable_web_page_preview: true
      }),
      signal: AbortSignal.timeout(5000)
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || payload.ok !== true) {
      return { status: 'failed', messageId: null };
    }
    const messageId = Number(payload.result && payload.result.message_id);
    return { status: 'sent', messageId: Number.isFinite(messageId) && messageId > 0 ? messageId : null };
  } catch (_) {
    return { status: 'failed', messageId: null };
  }
}

module.exports = { isTelegramConfigured, sendTelegramMessage };
