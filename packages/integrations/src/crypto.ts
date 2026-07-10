import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import type { IntegrationConfig } from './types.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, 'acp-integrations-salt', 32);
}

export interface EncryptedPayload {
  readonly iv: string;
  readonly authTag: string;
  readonly ciphertext: string;
}

export function encryptConfig(
  config: IntegrationConfig,
  secret: string,
): EncryptedPayload {
  const key = deriveKey(secret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const plaintext = JSON.stringify(config);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}

export function decryptConfig(
  payload: EncryptedPayload,
  secret: string,
): IntegrationConfig {
  const key = deriveKey(secret);
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');

  return JSON.parse(plaintext) as IntegrationConfig;
}
