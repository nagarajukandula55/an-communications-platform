import type { Message } from '@acp/types';
import type { Transport, TransportResult } from '@acp/messaging';
import { nodemailerFactory, type MailerFactory } from './mailer.js';
import { MissingEmailConfigError, type EmailConfigProvider } from './types.js';

export interface EmailTransportOptions {
  readonly configProvider: EmailConfigProvider;
  readonly mailerFactory?: MailerFactory;
  readonly defaultSubject?: string;
}

export class EmailTransport implements Transport {
  readonly channel = 'email' as const;

  private readonly mailerFactory: MailerFactory;
  private readonly defaultSubject: string;

  constructor(private readonly options: EmailTransportOptions) {
    this.mailerFactory = options.mailerFactory ?? nodemailerFactory;
    this.defaultSubject = options.defaultSubject ?? 'Notification';
  }

  async send(message: Message): Promise<TransportResult> {
    const config = await this.options.configProvider.getConfig(message.tenantId);
    if (!config) {
      throw new MissingEmailConfigError(message.tenantId);
    }

    const mailer = this.mailerFactory(config);
    const subject =
      typeof message.metadata?.['subject'] === 'string'
        ? message.metadata['subject']
        : this.defaultSubject;

    const result = await mailer.sendMail({
      from: config.fromAddress,
      to: message.to,
      subject,
      text: message.body,
    });

    return { ...(result.messageId !== undefined ? { providerRef: result.messageId } : {}) };
  }
}
