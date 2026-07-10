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

export class InMemoryUserRepository implements UserRepository {
  private readonly usersById = new Map<string, User>();

  findByEmail(
    organizationId: string,
    email: string,
  ): Promise<User | undefined> {
    for (const user of this.usersById.values()) {
      if (user.organizationId === organizationId && user.email === email) {
        return Promise.resolve(user);
      }
    }
    return Promise.resolve(undefined);
  }

  findById(id: string): Promise<User | undefined> {
    return Promise.resolve(this.usersById.get(id));
  }

  findBySsoUserId(ssoUserId: string): Promise<User | undefined> {
    for (const user of this.usersById.values()) {
      if (user.ssoUserId === ssoUserId) {
        return Promise.resolve(user);
      }
    }
    return Promise.resolve(undefined);
  }

  create(user: User): Promise<User> {
    this.usersById.set(user.id, user);
    return Promise.resolve(user);
  }
}

export class InMemoryOrganizationRepository implements OrganizationRepository {
  private readonly organizations = new Map<string, Organization>();

  create(organization: Organization): Promise<Organization> {
    this.organizations.set(organization.id, organization);
    return Promise.resolve(organization);
  }

  findById(id: string): Promise<Organization | undefined> {
    return Promise.resolve(this.organizations.get(id));
  }

  findBySsoBusinessId(ssoBusinessId: string): Promise<Organization | undefined> {
    for (const organization of this.organizations.values()) {
      if (organization.ssoBusinessId === ssoBusinessId) {
        return Promise.resolve(organization);
      }
    }
    return Promise.resolve(undefined);
  }
}

export class InMemoryApiKeyRepository implements ApiKeyRepository {
  private readonly keys = new Map<string, ApiKeyRecord>();

  create(record: ApiKeyRecord): Promise<ApiKeyRecord> {
    this.keys.set(record.id, record);
    return Promise.resolve(record);
  }

  findByHash(hashedKey: string): Promise<ApiKeyRecord | undefined> {
    for (const key of this.keys.values()) {
      if (key.hashedKey === hashedKey && !key.revokedAt) {
        return Promise.resolve(key);
      }
    }
    return Promise.resolve(undefined);
  }

  revoke(id: string): Promise<void> {
    const existing = this.keys.get(id);
    if (existing) {
      this.keys.set(id, { ...existing, revokedAt: new Date().toISOString() });
    }
    return Promise.resolve();
  }
}

export class InMemoryRefreshTokenRepository
  implements RefreshTokenRepository
{
  private readonly tokens = new Map<string, RefreshTokenRecord>();

  create(record: RefreshTokenRecord): Promise<RefreshTokenRecord> {
    this.tokens.set(record.id, record);
    return Promise.resolve(record);
  }

  findById(id: string): Promise<RefreshTokenRecord | undefined> {
    return Promise.resolve(this.tokens.get(id));
  }

  revoke(id: string): Promise<void> {
    const existing = this.tokens.get(id);
    if (existing) {
      this.tokens.set(id, {
        ...existing,
        revokedAt: new Date().toISOString(),
      });
    }
    return Promise.resolve();
  }
}

export class InMemoryDeviceTokenRepository implements DeviceTokenRepository {
  private readonly tokens = new Map<string, DeviceTokenRecord>();

  create(record: DeviceTokenRecord): Promise<DeviceTokenRecord> {
    this.tokens.set(record.id, record);
    return Promise.resolve(record);
  }

  findByHash(hashedToken: string): Promise<DeviceTokenRecord | undefined> {
    for (const token of this.tokens.values()) {
      if (token.hashedToken === hashedToken && !token.revokedAt) {
        return Promise.resolve(token);
      }
    }
    return Promise.resolve(undefined);
  }

  revoke(id: string): Promise<void> {
    const existing = this.tokens.get(id);
    if (existing) {
      this.tokens.set(id, {
        ...existing,
        revokedAt: new Date().toISOString(),
      });
    }
    return Promise.resolve();
  }
}
