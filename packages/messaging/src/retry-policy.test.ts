import { describe, expect, it } from 'vitest';
import { RetryPolicy } from './retry-policy.js';

describe('RetryPolicy', () => {
  it('retries with exponential backoff up to maxAttempts', () => {
    const policy = new RetryPolicy({ maxAttempts: 3, baseDelayMs: 1000 });

    expect(policy.decide(1)).toEqual({ shouldRetry: true, delayMs: 1000 });
    expect(policy.decide(2)).toEqual({ shouldRetry: true, delayMs: 2000 });
    expect(policy.decide(3)).toEqual({ shouldRetry: false, delayMs: 0 });
  });

  it('caps delay at maxDelayMs', () => {
    const policy = new RetryPolicy({
      maxAttempts: 10,
      baseDelayMs: 1000,
      maxDelayMs: 3000,
    });

    expect(policy.decide(5).delayMs).toBe(3000);
  });

  it('reports exhaustion correctly', () => {
    const policy = new RetryPolicy({ maxAttempts: 2, baseDelayMs: 100 });

    expect(policy.isExhausted(1)).toBe(false);
    expect(policy.isExhausted(2)).toBe(true);
  });
});
