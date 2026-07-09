import { Pool } from 'pg';
import type { PoolConfig, QueryResult, QueryResultRow } from 'pg';

export interface DatabaseOptions {
  readonly connectionString: string;
  readonly poolConfig?: Omit<PoolConfig, 'connectionString'>;
}

export class Database {
  private readonly pool: Pool;

  constructor(options: DatabaseOptions) {
    this.pool = new Pool({
      connectionString: options.connectionString,
      ...options.poolConfig,
    });
  }

  query<T extends QueryResultRow>(
    text: string,
    params?: readonly unknown[],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params as unknown[] | undefined);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
