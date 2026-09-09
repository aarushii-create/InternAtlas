import { TelegramChannelConfig, NotificationPayload, AlertDeliveryStatus } from '../../types';
import { formatTelegramAlert } from './alertFormatter';

export interface TelegramDeliveryResult {
  status: AlertDeliveryStatus;
  chatId: string;
  messageId?: string;
  deliveredAt?: string;
  error?: string;
  latencyMs: number;
  isSimulated: boolean;
  rawResponse?: any;
}

export class TelegramAlertService {
  private config: TelegramChannelConfig = {
    enabled: true,
    botToken: 'demo_scout_bot_token_sandbox',
    chatId: '@ai_internship_scout_alerts',
    parseMode: 'HTML',
    sendSilently: false,
    includeInlineApplyButton: true,
  };

  constructor(initialConfig?: Partial<TelegramChannelConfig>) {
    if (initialConfig) {
      this.config = { ...this.config, ...initialConfig };
    }
  }

  public getConfig(): TelegramChannelConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<TelegramChannelConfig>): TelegramChannelConfig {
    this.config = { ...this.config, ...newConfig };
    return this.getConfig();
  }

  /**
   * Dispatches a Telegram notification for a matched job.
   * If live credentials are provided, attempts real Telegram Bot API call.
   * Otherwise falls back gracefully to high-fidelity simulated sandbox dispatch.
   */
  public async sendAlert(
    payload: NotificationPayload,
    forceSimulation = false
  ): Promise<TelegramDeliveryResult> {
    const startTime = Date.now();
    const formatted = formatTelegramAlert(payload);
    const chatId = this.config.chatId || '@ai_internship_scout_alerts';

    if (!this.config.enabled) {
      return {
        status: 'suppressed_threshold',
        chatId,
        latencyMs: 0,
        isSimulated: true,
        error: 'Telegram channel is disabled in configuration',
      };
    }

    const isLiveToken =
      !forceSimulation &&
      this.config.botToken &&
      !this.config.botToken.includes('demo') &&
      !this.config.botToken.includes('sandbox') &&
      this.config.botToken.includes(':');

    // 1. Live Telegram Bot API Call
    if (isLiveToken) {
      try {
        const body: Record<string, any> = {
          chat_id: chatId,
          text: this.config.parseMode === 'MarkdownV2' ? formatted.markdownV2 : formatted.html,
          parse_mode: this.config.parseMode,
          disable_notification: this.config.sendSilently,
          disable_web_page_preview: false,
        };

        if (this.config.includeInlineApplyButton && formatted.inlineButtons.length > 0) {
          body.reply_markup = {
            inline_keyboard: [
              formatted.inlineButtons.map((btn) => ({
                text: btn.text,
                url: btn.url,
              })),
            ],
          };
        }

        const res = await fetch(`https://api.telegram.org/bot${this.config.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const data = await res.json();
        const latencyMs = Date.now() - startTime;

        if (res.ok && data.ok) {
          return {
            status: 'delivered',
            chatId,
            messageId: `tg_msg_${data.result?.message_id || Date.now()}`,
            deliveredAt: new Date().toISOString(),
            latencyMs,
            isSimulated: false,
            rawResponse: data,
          };
        } else {
          return {
            status: 'failed',
            chatId,
            error: data.description || `Telegram API error (${res.status})`,
            latencyMs,
            isSimulated: false,
            rawResponse: data,
          };
        }
      } catch (err: any) {
        const latencyMs = Date.now() - startTime;
        return {
          status: 'failed',
          chatId,
          error: err?.message || 'Network error connecting to Telegram Bot API',
          latencyMs,
          isSimulated: false,
        };
      }
    }

    // 2. High-fidelity Sandbox / Simulated Dispatch
    // Simulates natural HTTP latency (25ms - 75ms)
    await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 40 + 25)));
    const latencyMs = Date.now() - startTime;
    const fakeMessageId = `tg_sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    return {
      status: 'delivered',
      chatId,
      messageId: fakeMessageId,
      deliveredAt: new Date().toISOString(),
      latencyMs,
      isSimulated: true,
      rawResponse: {
        ok: true,
        result: {
          message_id: fakeMessageId,
          chat: { id: chatId, title: 'Scout Alerts Channel' },
          date: Math.floor(Date.now() / 1000),
          text: formatted.html,
        },
      },
    };
  }

  /**
   * Health-checks the Telegram Bot Token
   */
  public async testConnection(): Promise<{
    ok: boolean;
    botName?: string;
    username?: string;
    error?: string;
    isSimulated: boolean;
  }> {
    const isLiveToken =
      this.config.botToken &&
      !this.config.botToken.includes('demo') &&
      !this.config.botToken.includes('sandbox') &&
      this.config.botToken.includes(':');

    if (isLiveToken) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${this.config.botToken}/getMe`);
        const data = await res.json();
        if (res.ok && data.ok) {
          return {
            ok: true,
            botName: data.result?.first_name,
            username: data.result?.username,
            isSimulated: false,
          };
        }
        return {
          ok: false,
          error: data.description || 'Invalid Telegram bot token',
          isSimulated: false,
        };
      } catch (err: any) {
        return {
          ok: false,
          error: err?.message || 'Connection to Telegram API failed',
          isSimulated: false,
        };
      }
    }

    // Simulated Bot Info
    return {
      ok: true,
      botName: 'AI Internship Scout Bot [Sandbox]',
      username: 'intern_scout_sandbox_bot',
      isSimulated: true,
    };
  }
}

export const telegramAlertService = new TelegramAlertService();
