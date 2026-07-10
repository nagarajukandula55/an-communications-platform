export const INTEGRATIONS_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  provider TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, provider)
);
`;
