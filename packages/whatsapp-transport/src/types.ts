export interface WhatsAppConfig {
  readonly phoneNumberId: string;
  readonly accessToken: string;
}

export interface WhatsAppConfigProvider {
  getConfig(tenantId: string): Promise<WhatsAppConfig | undefined>;
}

export class MissingWhatsAppConfigError extends Error {
  constructor(tenantId: string) {
    super(`No WhatsApp configuration set for tenant: ${tenantId}`);
    this.name = 'MissingWhatsAppConfigError';
  }
}

export class WhatsAppRequestError extends Error {
  constructor(status: number, body: string) {
    super(`WhatsApp API request failed (${String(status)}): ${body}`);
    this.name = 'WhatsAppRequestError';
  }
}

export type FetchLike = typeof fetch;
