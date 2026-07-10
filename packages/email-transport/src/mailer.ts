import { createTransport } from 'nodemailer';
import type { SmtpConfig } from './types.js';

export interface MailMessage {
  readonly from: string;
  readonly to: string;
  readonly subject: string;
  readonly text: string;
}

export interface MailResult {
  readonly messageId?: string;
}

export interface Mailer {
  sendMail(message: MailMessage): Promise<MailResult>;
}

export class NodemailerMailer implements Mailer {
  private readonly transporter: ReturnType<typeof createTransport>;

  constructor(config: SmtpConfig) {
    this.transporter = createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      ...(config.username && config.password
        ? { auth: { user: config.username, pass: config.password } }
        : {}),
    });
  }

  async sendMail(message: MailMessage): Promise<MailResult> {
    const info = await this.transporter.sendMail(message);
    return { messageId: info.messageId };
  }
}

export type MailerFactory = (config: SmtpConfig) => Mailer;

export const nodemailerFactory: MailerFactory = (config) => new NodemailerMailer(config);
