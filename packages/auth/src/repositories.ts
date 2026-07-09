import type {
  ApiKeyRecord,
  DeviceTokenRecord,
  Organization,
  RefreshTokenRecord,
  User,
} from './types.js';

export interface UserRepository {
  findByEmail(
    organizationId: string,
    email: string,
  ): Promise<User | undefined>;
  findById(id: string): Promise<User | undefined>;
  create(user: User): Promise<User>;
}

export interface OrganizationRepository {
  create(organization: Organization): Promise<Organization>;
  findById(id: string): Promise<Organization | undefined>;
}

export interface ApiKeyRepository {
  create(record: ApiKeyRecord): Promise<ApiKeyRecord>;
  findByHash(hashedKey: string): Promise<ApiKeyRecord | undefined>;
  revoke(id: string): Promise<void>;
}

export interface RefreshTokenRepository {
  create(record: RefreshTokenRecord): Promise<RefreshTokenRecord>;
  findById(id: string): Promise<RefreshTokenRecord | undefined>;
  revoke(id: string): Promise<void>;
}

export interface DeviceTokenRepository {
  create(record: DeviceTokenRecord): Promise<DeviceTokenRecord>;
  findByHash(hashedToken: string): Promise<DeviceTokenRecord | undefined>;
  revoke(id: string): Promise<void>;
}
