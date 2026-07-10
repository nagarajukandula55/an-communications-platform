import type { Database } from '@acp/database';
import type { AnalyticsRepository, DateRange, DeliveryStats } from './types.js';

interface CountRow {
  readonly key: string;
  readonly count: string;
}

export class PostgresAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly db: Database) {}

  async getDeliveryStats(
    tenantId: string,
    range: DateRange = {},
  ): Promise<DeliveryStats> {
    const conditions = ['tenant_id = $1'];
    const params: unknown[] = [tenantId];

    if (range.from) {
      params.push(range.from.toISOString());
      conditions.push(`created_at >= $${String(params.length)}`);
    }
    if (range.to) {
      params.push(range.to.toISOString());
      conditions.push(`created_at <= $${String(params.length)}`);
    }

    const where = conditions.join(' AND ');

    const [statusRows, channelRows] = await Promise.all([
      this.db.query<CountRow>(
        `SELECT status AS key, COUNT(*) AS count FROM messages WHERE ${where} GROUP BY status`,
        params,
      ),
      this.db.query<CountRow>(
        `SELECT channel AS key, COUNT(*) AS count FROM messages WHERE ${where} GROUP BY channel`,
        params,
      ),
    ]);

    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const row of statusRows.rows) {
      const count = Number(row.count);
      byStatus[row.key] = count;
      total += count;
    }

    const byChannel: Record<string, number> = {};
    for (const row of channelRows.rows) {
      byChannel[row.key] = Number(row.count);
    }

    return { total, byStatus, byChannel };
  }
}
