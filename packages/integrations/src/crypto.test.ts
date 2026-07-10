import { describe, expect, it } from 'vitest';
import { decryptConfig, encryptConfig } from './crypto.js';

describe('encryptConfig/decryptConfig', () => {
  it('round-trips a config object', () => {
    const config = { host: 'smtp.example.com', password: 'super-secret' };
    const payload = encryptConfig(config, 'test-secret');

    expect(payload.ciphertext).not.toContain('super-secret');
    expect(decryptConfig(payload, 'test-secret')).toEqual(config);
  });

  it('fails to decrypt with the wrong secret', () => {
    const payload = encryptConfig({ a: 'b' }, 'right-secret');
    expect(() => decryptConfig(payload, 'wrong-secret')).toThrow();
  });
});
