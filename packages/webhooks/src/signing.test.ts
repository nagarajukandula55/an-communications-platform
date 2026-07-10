import { describe, expect, it } from 'vitest';
import { signPayload } from './signing.js';

describe('signPayload', () => {
  it('produces a deterministic HMAC for the same secret and payload', () => {
    const a = signPayload('secret', '{"a":1}');
    const b = signPayload('secret', '{"a":1}');
    expect(a).toBe(b);
  });

  it('produces a different signature for a different secret', () => {
    const a = signPayload('secret-1', '{"a":1}');
    const b = signPayload('secret-2', '{"a":1}');
    expect(a).not.toBe(b);
  });
});
