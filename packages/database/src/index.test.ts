import { describe, expect, it } from 'vitest';
import { Database } from './index.js';

describe('Database', () => {
  it('reports unhealthy when it cannot connect', async () => {
    const db = new Database({
      connectionString: 'postgresql://invalid:invalid@127.0.0.1:1/invalid',
    });

    await expect(db.healthCheck()).resolves.toBe(false);
    await db.close();
  });
});
