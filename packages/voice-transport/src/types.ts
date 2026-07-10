/**
 * Voice is implemented as a REST call to a voice-provider gateway (the
 * pattern used by every major provider's public API - Twilio, Vonage,
 * Plivo - and by self-hosted SIP gateways like Asterisk/FreeSWITCH that
 * expose a REST control API in front of the actual SIP/RTP stack).
 *
 * Hand-rolling a SIP user agent (INVITE/ACK/BYE transaction state
 * machine, SDP offer/answer, RTP media) from scratch is a different
 * scale of project entirely and isn't something that could be verified
 * without a real SIP trunk to test against - out of scope here.
 */
export interface VoiceConfig {
  readonly apiBaseUrl: string;
  readonly accountId: string;
  readonly apiKey: string;
  readonly callerNumber: string;
}

export interface VoiceConfigProvider {
  getConfig(tenantId: string): Promise<VoiceConfig | undefined>;
}

export class MissingVoiceConfigError extends Error {
  constructor(tenantId: string) {
    super(`No voice provider configuration set for tenant: ${tenantId}`);
    this.name = 'MissingVoiceConfigError';
  }
}

export class VoiceRequestError extends Error {
  constructor(status: number, body: string) {
    super(`Voice provider request failed (${String(status)}): ${body}`);
    this.name = 'VoiceRequestError';
  }
}

export type FetchLike = typeof fetch;
