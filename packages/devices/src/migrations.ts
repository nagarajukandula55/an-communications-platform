export const DEVICES_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unknown',
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS devices_tenant_id_idx ON devices (tenant_id);
`;
