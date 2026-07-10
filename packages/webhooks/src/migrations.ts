export const WEBHOOKS_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  secret TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhook_subscriptions_org_idx ON webhook_subscriptions (organization_id);
`;
