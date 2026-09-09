import { EmailChannelConfig, NotificationPayload, AlertDeliveryStatus, EmailProviderType } from '../../types';
import { formatEmailAlert } from './alertFormatter';

export interface EmailDeliveryResult {
  status: AlertDeliveryStatus;
  provider: EmailProviderType;
  toEmail: string;
  messageId?: string;
  deliveredAt?: string;
  error?: string;
  latencyMs: number;
  isSimulated: boolean;
  rawResponse?: any;
}

export class EmailAlertService {
  private config: EmailChannelConfig = {
    enabled: true,
    provider: 'resend',
    apiKey: 're_sandbox_scout_alert_key',
    fromEmail: 'alerts@internship-scout.ai',
    fromName: 'AI Internship Scout',
    toEmail: 'alex.rivera@stanford.edu',
    replyTo: 'support@internship-scout.ai',
    subjectTemplate: '[{{match_score}}% Match] {{company}} is hiring: {{role}}',
  };

  constructor(initialConfig?: Partial<EmailChannelConfig>) {
    if (initialConfig) {
      this.config = { ...this.config, ...initialConfig };
    }
  }

  public getConfig(): EmailChannelConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<EmailChannelConfig>): EmailChannelConfig {
    this.config = { ...this.config, ...newConfig };
    return this.getConfig();
  }

  /**
   * Dispatches an Email alert via configured provider (Resend, SendGrid, Postmark, or Sandbox)
   */
  public async sendAlert(
    payload: NotificationPayload,
    forceSimulation = false
  ): Promise<EmailDeliveryResult> {
    const startTime = Date.now();
    const formatted = formatEmailAlert(payload);
    const toEmail = payload.candidateEmail || this.config.toEmail || 'candidate@example.edu';

    if (!this.config.enabled) {
      return {
        status: 'suppressed_threshold',
        provider: this.config.provider,
        toEmail,
        latencyMs: 0,
        isSimulated: true,
        error: 'Email channel is disabled in configuration',
      };
    }

    const isLiveApiKey =
      !forceSimulation &&
      this.config.apiKey &&
      !this.config.apiKey.includes('sandbox') &&
      !this.config.apiKey.includes('demo') &&
      this.config.apiKey.length > 10;

    // 1. Resend API
    if (isLiveApiKey && this.config.provider === 'resend') {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify({
            from: `${this.config.fromName} <${this.config.fromEmail}>`,
            to: [toEmail],
            subject: formatted.subject,
            html: formatted.html,
            text: formatted.plainText,
            reply_to: this.config.replyTo,
          }),
        });

        const data = await res.json();
        const latencyMs = Date.now() - startTime;

        if (res.ok && data.id) {
          return {
            status: 'delivered',
            provider: 'resend',
            toEmail,
            messageId: data.id,
            deliveredAt: new Date().toISOString(),
            latencyMs,
            isSimulated: false,
            rawResponse: data,
          };
        } else {
          return {
            status: 'failed',
            provider: 'resend',
            toEmail,
            error: data.message || `Resend API Error (${res.status})`,
            latencyMs,
            isSimulated: false,
            rawResponse: data,
          };
        }
      } catch (err: any) {
        return {
          status: 'failed',
          provider: 'resend',
          toEmail,
          error: err?.message || 'Network error connecting to Resend API',
          latencyMs: Date.now() - startTime,
          isSimulated: false,
        };
      }
    }

    // 2. SendGrid API
    if (isLiveApiKey && this.config.provider === 'sendgrid') {
      try {
        const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: toEmail }] }],
            from: { email: this.config.fromEmail, name: this.config.fromName },
            subject: formatted.subject,
            content: [
              { type: 'text/plain', value: formatted.plainText },
              { type: 'text/html', value: formatted.html },
            ],
          }),
        });

        const latencyMs = Date.now() - startTime;
        if (res.status === 202 || res.ok) {
          const msgId = res.headers.get('X-Message-Id') || `sg_${Date.now()}`;
          return {
            status: 'delivered',
            provider: 'sendgrid',
            toEmail,
            messageId: msgId,
            deliveredAt: new Date().toISOString(),
            latencyMs,
            isSimulated: false,
          };
        } else {
          const errorData = await res.json().catch(() => ({}));
          return {
            status: 'failed',
            provider: 'sendgrid',
            toEmail,
            error: errorData.errors?.[0]?.message || `SendGrid API Error (${res.status})`,
            latencyMs,
            isSimulated: false,
            rawResponse: errorData,
          };
        }
      } catch (err: any) {
        return {
          status: 'failed',
          provider: 'sendgrid',
          toEmail,
          error: err?.message || 'Network error connecting to SendGrid API',
          latencyMs: Date.now() - startTime,
          isSimulated: false,
        };
      }
    }

    // 3. Postmark API
    if (isLiveApiKey && this.config.provider === 'postmark') {
      try {
        const res = await fetch('https://api.postmarkapp.com/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Postmark-Server-Token': this.config.apiKey,
          },
          body: JSON.stringify({
            From: `${this.config.fromName} <${this.config.fromEmail}>`,
            To: toEmail,
            Subject: formatted.subject,
            HtmlBody: formatted.html,
            TextBody: formatted.plainText,
          }),
        });

        const data = await res.json();
        const latencyMs = Date.now() - startTime;
        if (res.ok && data.ErrorCode === 0) {
          return {
            status: 'delivered',
            provider: 'postmark',
            toEmail,
            messageId: data.MessageID,
            deliveredAt: new Date().toISOString(),
            latencyMs,
            isSimulated: false,
            rawResponse: data,
          };
        } else {
          return {
            status: 'failed',
            provider: 'postmark',
            toEmail,
            error: data.Message || `Postmark API Error (${res.status})`,
            latencyMs,
            isSimulated: false,
            rawResponse: data,
          };
        }
      } catch (err: any) {
        return {
          status: 'failed',
          provider: 'postmark',
          toEmail,
          error: err?.message || 'Network error connecting to Postmark API',
          latencyMs: Date.now() - startTime,
          isSimulated: false,
        };
      }
    }

    // 4. High-fidelity Sandbox / Simulated Email Dispatch
    await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 45 + 30)));
    const latencyMs = Date.now() - startTime;
    const fakeMessageId = `em_${this.config.provider}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    return {
      status: 'delivered',
      provider: this.config.provider,
      toEmail,
      messageId: fakeMessageId,
      deliveredAt: new Date().toISOString(),
      latencyMs,
      isSimulated: true,
      rawResponse: {
        id: fakeMessageId,
        to: toEmail,
        subject: formatted.subject,
        status: 'queued_and_delivered',
      },
    };
  }

  /**
   * Health-checks the Email Service API credentials
   */
  public async testConnection(): Promise<{
    ok: boolean;
    provider: EmailProviderType;
    error?: string;
    isSimulated: boolean;
  }> {
    const isLiveApiKey =
      this.config.apiKey &&
      !this.config.apiKey.includes('sandbox') &&
      !this.config.apiKey.includes('demo') &&
      this.config.apiKey.length > 10;

    if (isLiveApiKey) {
      if (this.config.provider === 'resend') {
        try {
          const res = await fetch('https://api.resend.com/api-keys', {
            headers: { Authorization: `Bearer ${this.config.apiKey}` },
          });
          return {
            ok: res.ok,
            provider: 'resend',
            error: res.ok ? undefined : `Resend verification failed (${res.status})`,
            isSimulated: false,
          };
        } catch (err: any) {
          return {
            ok: false,
            provider: 'resend',
            error: err.message,
            isSimulated: false,
          };
        }
      }
    }

    return {
      ok: true,
      provider: this.config.provider,
      isSimulated: true,
    };
  }
}

export const emailAlertService = new EmailAlertService();
