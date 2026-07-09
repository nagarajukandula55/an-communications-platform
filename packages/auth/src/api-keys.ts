import { createHash, randomBytes } from 'node:crypto';

const KEY_PREFIX = 'acp_';

export interface GeneratedApiKey {
  readonly plaintext: string;
  readonly hashed: string;
}

export function generateApiKey(): GeneratedApiKey {
  const plaintext = `${KEY_PREFIX}${randomBytes(24).toString('hex')}`;
  return { plaintext, hashed: hashApiKey(plaintext) };
}

export function hashApiKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}

export function verifyApiKey(plaintext: string, hashed: string): boolean {
  return hashApiKey(plaintext) === hashed;
}
