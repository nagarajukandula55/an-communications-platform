import type { Database } from '@acp/database';
import type {
  ApiKeyRecord,
  DeviceTokenRecord,
  Organization,
  RefreshTokenRecord,
  User,
} from './types.js';
import type {
  ApiKeyRepository,
  DeviceTokenRepository,
  OrganizationRepository,
  RefreshTokenRepository,
  UserRepository,
} from './repositories.js';
import type { Role } from './types.js';

interface UserRow {
  readonly id: string;
  readonly organization_id: string;
  readonly email: string;
  readonly password_hash: string;
  readonly role: Role;
  readonly created_at: string;
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    organizationId: row.organization_id,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    createdAt: row.created_at,
  };
}

export class PostgresUserRepository implements UserRepository {
  constructor(private readonly db: Database) {}

  async findByEmail(
    organizationId: string,
    email: string,
  ): Promise<User | undefined> {
    const result = await this.db.query<UserRow>(
      'SELECT * FROM users WHERE organization_id = $1 AND email = $2',
      [organizationId, email],
    );
    return result.rows[0] ? toUser(result.rows[0]) : undefined;
  }

  async findById(id: string): Promise<User | undefined> {
    const result = await this.db.query<UserRow>(
      'SELECT * FROM users WHERE id = $1',
      [id],
    );
    return result.rows[0] ? toUser(result.rows[0]) : undefined;
  }

  async create(user: User): Promise<User> {
    await this.db.query(
      `INSERT INTO users (id, organization_id, email, password_hash, role, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        user.id,
        user.organizationId,
        user.email,
        user.passwordHash,
        user.role,
        user.createdAt,
      ],
    );
    return user;
  }
}

interface OrganizationRow {
  readonly id: string;
  readonly name: string;
  readonly created_at: string;
}

export class PostgresOrganizationRepository implements OrganizationRepository {
  constructor(private readonly db: Database) {}

  async create(organization: Organization): Promise<Organization> {
    await this.db.query(
      'INSERT INTO organizations (id, name, created_at) VALUES ($1, $2, $3)',
      [organization.id, organization.name, organization.createdAt],
    );
    return organization;
  }

  async findById(id: string): Promise<Organization | undefined> {
    const result = await this.db.query<OrganizationRow>(
      'SELECT * FROM organizations WHERE id = $1',
      [id],
    );
    const row = result.rows[0];
    return row
      ? { id: row.id, name: row.name, createdAt: row.created_at }
      : undefined;
  }
}

interface ApiKeyRow {
  readonly id: string;
  readonly organization_id: string;
  readonly name: string;
  readonly hashed_key: string;
  readonly created_at: string;
  readonly revoked_at: string | null;
}

function toApiKey(row: ApiKeyRow): ApiKeyRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    hashedKey: row.hashed_key,
    createdAt: row.created_at,
    ...(row.revoked_at ? { revokedAt: row.revoked_at } : {}),
  };
}

export class PostgresApiKeyRepository implements ApiKeyRepository {
  constructor(private readonly db: Database) {}

  async create(record: ApiKeyRecord): Promise<ApiKeyRecord> {
    await this.db.query(
      `INSERT INTO api_keys (id, organization_id, name, hashed_key, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        record.id,
        record.organizationId,
        record.name,
        record.hashedKey,
        record.createdAt,
      ],
    );
    return record;
  }

  async findByHash(hashedKey: string): Promise<ApiKeyRecord | undefined> {
    const result = await this.db.query<ApiKeyRow>(
      'SELECT * FROM api_keys WHERE hashed_key = $1 AND revoked_at IS NULL',
      [hashedKey],
    );
    return result.rows[0] ? toApiKey(result.rows[0]) : undefined;
  }

  async revoke(id: string): Promise<void> {
    await this.db.query(
      'UPDATE api_keys SET revoked_at = now() WHERE id = $1',
      [id],
    );
  }
}

interface RefreshTokenRow {
  readonly id: string;
  readonly user_id: string;
  readonly hashed_token: string;
  readonly expires_at: string;
  readonly revoked_at: string | null;
}

function toRefreshToken(row: RefreshTokenRow): RefreshTokenRecord {
  return {
    id: row.id,
    userId: row.user_id,
    hashedToken: row.hashed_token,
    expiresAt: row.expires_at,
    ...(row.revoked_at ? { revokedAt: row.revoked_at } : {}),
  };
}

export class PostgresRefreshTokenRepository
  implements RefreshTokenRepository
{
  constructor(private readonly db: Database) {}

  async create(record: RefreshTokenRecord): Promise<RefreshTokenRecord> {
    await this.db.query(
      `INSERT INTO refresh_tokens (id, user_id, hashed_token, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [record.id, record.userId, record.hashedToken, record.expiresAt],
    );
    return record;
  }

  async findById(id: string): Promise<RefreshTokenRecord | undefined> {
    const result = await this.db.query<RefreshTokenRow>(
      'SELECT * FROM refresh_tokens WHERE id = $1',
      [id],
    );
    return result.rows[0] ? toRefreshToken(result.rows[0]) : undefined;
  }

  async revoke(id: string): Promise<void> {
    await this.db.query(
      'UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1',
      [id],
    );
  }
}

interface DeviceTokenRow {
  readonly id: string;
  readonly organization_id: string;
  readonly device_id: string;
  readonly hashed_token: string;
  readonly created_at: string;
  readonly revoked_at: string | null;
}

function toDeviceToken(row: DeviceTokenRow): DeviceTokenRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    deviceId: row.device_id,
    hashedToken: row.hashed_token,
    createdAt: row.created_at,
    ...(row.revoked_at ? { revokedAt: row.revoked_at } : {}),
  };
}

export class PostgresDeviceTokenRepository implements DeviceTokenRepository {
  constructor(private readonly db: Database) {}

  async create(record: DeviceTokenRecord): Promise<DeviceTokenRecord> {
    await this.db.query(
      `INSERT INTO device_tokens (id, organization_id, device_id, hashed_token, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        record.id,
        record.organizationId,
        record.deviceId,
        record.hashedToken,
        record.createdAt,
      ],
    );
    return record;
  }

  async findByHash(hashedToken: string): Promise<DeviceTokenRecord | undefined> {
    const result = await this.db.query<DeviceTokenRow>(
      'SELECT * FROM device_tokens WHERE hashed_token = $1 AND revoked_at IS NULL',
      [hashedToken],
    );
    return result.rows[0] ? toDeviceToken(result.rows[0]) : undefined;
  }

  async revoke(id: string): Promise<void> {
    await this.db.query(
      'UPDATE device_tokens SET revoked_at = now() WHERE id = $1',
      [id],
    );
  }
}
