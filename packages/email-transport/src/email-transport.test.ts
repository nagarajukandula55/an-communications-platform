import { describe, expect, it } from 'vitest';
import type { Message } from '@acp/types';
import { EmailTransport } from './email-transport.js';
import { MissingEmailConfigError, type EmailConfigProvider, type SmtpConfig } from './types.js';
import type { Mailer, MailMessage } from './mailer.js';

const message: Message = {
  id: 'm1',
  tenantId: 't1',
  channel: 'email',
  to: 'user@example.com',
  body: 'Hello there',
  status: 'queued',
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

function fakeConfigProvider(config?: SmtpConfig): EmailConfigProvider {
  return { getConfig: () => Promise.resolve(config) };
}

describe('EmailTransport', () => {
  it('sends via the mailer using the tenant SMTP config', async () => {
    const sent: MailMessage[] = [];
    const fakeMailer: Mailer = {
      sendMail: (mailMessage) => {
        sent.push(mailMessage);
        return Promise.resolve({ messageId: 'msg-123' });
      },
    };

    const transport = new EmailTransport({
      configProvider: fakeConfigProvider({
        host: 'smtp.example.com',
        port: 587,
        fromAddress: 'no-reply@example.com',
      }),
      mailerFactory: () => fakeMailer,
    });

    const result = await transport.send(message);

    expect(result.providerRef).toBe('msg-123');
    expect(sent[0]).toMatchObject({
      from: 'no-reply@example.com',
      to: 'user@example.com',
      text: 'Hello there',
    });
  });

  it('uses metadata.subject when provided', async () => {
    const sent: MailMessage[] = [];
    const fakeMailer: Mailer = {
      sendMail: (mailMessage) => {
        sent.push(mailMessage);
        return Promise.resolve({});
      },
    };

    const transport = new EmailTransport({
      configProvider: fakeConfigProvider({
        host: 'smtp.example.com',
        port: 587,
        fromAddress: 'no-reply@example.com',
      }),
      mailerFactory: () => fakeMailer,
    });

    await transport.send({ ...message, metadata: { subject: 'Custom subject' } });

    expect(sent[0]?.subject).toBe('Custom subject');
  });

  it('throws MissingEmailConfigError when no config is set', async () => {
    const transport = new EmailTransport({
      configProvider: fakeConfigProvider(undefined),
    });

    await expect(transport.send(message)).rejects.toBeInstanceOf(
      MissingEmailConfigError,
    );
  });
});
