export type IntegrationProvider = 'smtp' | 'fcm' | 'apns' | 'whatsapp' | 'voice';

export type IntegrationConfig = Readonly<Record<string, string>>;

export interface IntegrationRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly provider: IntegrationProvider;
  readonly config: IntegrationConfig;
  readonly updatedAt: string;
}

/**
 * Describes the fields a provider's settings form should render, so the
 * dashboard can build one generic form per provider instead of a bespoke
 * page each. `secret: true` fields are masked on read and only ever
 * accepted (never returned) on write.
 */
export interface IntegrationFieldSpec {
  readonly key: string;
  readonly label: string;
  readonly secret: boolean;
  readonly placeholder?: string;
}

export const INTEGRATION_FIELD_SPECS: Readonly<
  Record<IntegrationProvider, readonly IntegrationFieldSpec[]>
> = {
  smtp: [
    { key: 'host', label: 'SMTP Host', secret: false, placeholder: 'smtp.example.com' },
    { key: 'port', label: 'Port', secret: false, placeholder: '587' },
    { key: 'username', label: 'Username', secret: false },
    { key: 'password', label: 'Password', secret: true },
    { key: 'fromAddress', label: 'From address', secret: false, placeholder: 'no-reply@example.com' },
  ],
  fcm: [
    { key: 'projectId', label: 'Firebase Project ID', secret: false },
    { key: 'clientEmail', label: 'Service Account Client Email', secret: false },
    { key: 'privateKey', label: 'Service Account Private Key', secret: true },
  ],
  apns: [
    { key: 'teamId', label: 'Team ID', secret: false },
    { key: 'keyId', label: 'Key ID', secret: false },
    { key: 'bundleId', label: 'Bundle ID', secret: false },
    { key: 'privateKey', label: 'Signing Key (.p8 contents)', secret: true },
  ],
  whatsapp: [
    { key: 'phoneNumberId', label: 'Phone Number ID', secret: false },
    { key: 'accessToken', label: 'Access Token', secret: true },
  ],
  voice: [
    { key: 'apiBaseUrl', label: 'Voice Provider API Base URL', secret: false },
    { key: 'accountId', label: 'Account ID', secret: false },
    { key: 'apiKey', label: 'API Key', secret: true },
    { key: 'callerNumber', label: 'Caller Number', secret: false },
  ],
};
