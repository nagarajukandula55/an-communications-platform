import { describe, expect, it } from 'vitest';
import { generateApiKey, hashApiKey, verifyApiKey } from './api-keys.js';

describe('api keys', () => {
  it('generates a key whose hash matches independent hashing', () => {
    const { plaintext, hashed } = generateApiKey();

    expect(plaintext.startsWith('acp_')).toBe(true);
    expect(hashApiKey(plaintext)).toBe(hashed);
  });

  it('verifies a correct key and rejects an incorrect one', () => {
    const { plaintext, hashed } = generateApiKey();

    expect(verifyApiKey(plaintext, hashed)).toBe(true);
    expect(verifyApiKey('acp_wrong', hashed)).toBe(false);
  });

  it('generates unique keys on each call', () => {
    expect(generateApiKey().plaintext).not.toBe(generateApiKey().plaintext);
  });
});
