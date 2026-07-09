import { describe, expect, it, vi } from 'vitest';
import { err, generateId, ok, retry } from './index.js';

describe('shared', () => {
  it('creates ok/err results', () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 });
    expect(err('bad')).toEqual({ ok: false, error: 'bad' });
  });

  it('generates unique ids', () => {
    expect(generateId()).not.toBe(generateId());
  });

  it('retries until success', async () => {
    let calls = 0;
    const fn = vi.fn(() => {
      calls += 1;
      if (calls < 3) {
        return Promise.reject(new Error('fail'));
      }
      return Promise.resolve('done');
    });

    const result = await retry(fn, { attempts: 5, baseDelayMs: 0 });

    expect(result).toBe('done');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after exhausting attempts', async () => {
    const fn = vi.fn(() => Promise.reject(new Error('always fails')));

    await expect(retry(fn, { attempts: 2, baseDelayMs: 0 })).rejects.toThrow(
      'always fails',
    );
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
