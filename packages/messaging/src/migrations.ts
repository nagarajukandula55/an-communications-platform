export const MESSAGING_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  channel TEXT NOT NULL,
  "to" TEXT NOT NULL,
  "from" TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL,
  template_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_tenant_id_idx ON messages (tenant_id);
CREATE INDEX IF NOT EXISTS messages_status_idx ON messages (status);
`;
