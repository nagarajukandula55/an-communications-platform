export interface SmtpConfig {
  readonly host: string;
  readonly port: number;
  readonly username?: string;
  readonly password?: string;
  readonly fromAddress: string;
}

export interface EmailConfigProvider {
  getConfig(tenantId: string): Promise<SmtpConfig | undefined>;
}

export class MissingEmailConfigError extends Error {
  constructor(tenantId: string) {
    super(`No SMTP configuration set for tenant: ${tenantId}`);
    this.name = 'MissingEmailConfigError';
  }
}
