import { describe, expect, it, vi } from 'vitest';
import { InMemoryCache } from './index.js';

describe('InMemoryCache', () => {
  it('stores and retrieves values', async () => {
    const cache = new InMemoryCache();
    await cache.set('a', 1);

    await expect(cache.get('a')).resolves.toBe(1);
  });

  it('returns undefined for missing keys', async () => {
    const cache = new InMemoryCache();
    await expect(cache.get('missing')).resolves.toBeUndefined();
  });

  it('expires entries after ttl', async () => {
    vi.useFakeTimers();
    const cache = new InMemoryCache();
    await cache.set('a', 1, 1000);

    vi.advanceTimersByTime(1500);

    await expect(cache.get('a')).resolves.toBeUndefined();
    vi.useRealTimers();
  });

  it('deletes and clears', async () => {
    const cache = new InMemoryCache();
    await cache.set('a', 1);
    await cache.delete('a');
    await expect(cache.get('a')).resolves.toBeUndefined();

    await cache.set('b', 2);
    await cache.clear();
    await expect(cache.get('b')).resolves.toBeUndefined();
  });
});
