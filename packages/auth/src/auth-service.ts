import { generateId } from '@acp/shared';
import { generateApiKey, hashApiKey, verifyApiKey } from './api-keys.js';
import { hashPassword, verifyPassword } from './password.js';
import type {
  ApiKeyRepository,
  OrganizationRepository,
  RefreshTokenRepository,
  UserRepository,
} from './repositories.js';
import type { TokenService } from './tokens.js';
import type { ApiKeyRecord, Organization, Role, User } from './types.js';

export interface AuthServiceDeps {
  readonly users: UserRepository;
  readonly organizations: OrganizationRepository;
  readonly apiKeys: ApiKeyRepository;
  readonly refreshTokens: RefreshTokenRepository;
  readonly tokens: TokenService;
}

export interface RegisterInput {
  readonly organizationName: string;
  readonly email: string;
  readonly password: string;
}

export interface LoginInput {
  readonly organizationId: string;
  readonly email: string;
  readonly password: string;
}

export interface InviteUserInput {
  readonly organizationId: string;
  readonly email: string;
  readonly password: string;
  readonly role: Role;
}

export interface AuthSession {
  readonly user: User;
  readonly accessToken: string;
  readonly refreshToken: string;
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid credentials');
    this.name = 'InvalidCredentialsError';
  }
}

export class EmailInUseError extends Error {
  constructor() {
    super('Email already in use for this organization');
    this.name = 'EmailInUseError';
  }
}

export class AuthService {
  constructor(private readonly deps: AuthServiceDeps) {}

  async register(input: RegisterInput): Promise<AuthSession> {
    const organization: Organization = {
      id: generateId(),
      name: input.organizationName,
      createdAt: new Date().toISOString(),
    };
    await this.deps.organizations.create(organization);

    const user: User = {
      id: generateId(),
      organizationId: organization.id,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: 'owner' satisfies Role,
      createdAt: new Date().toISOString(),
    };
    await this.deps.users.create(user);

    return this.issueSession(user);
  }

  async inviteUser(input: InviteUserInput): Promise<User> {
    const existing = await this.deps.users.findByEmail(
      input.organizationId,
      input.email,
    );
    if (existing) {
      throw new EmailInUseError();
    }

    const user: User = {
      id: generateId(),
      organizationId: input.organizationId,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: input.role,
      createdAt: new Date().toISOString(),
    };
    return this.deps.users.create(user);
  }

  async login(input: LoginInput): Promise<AuthSession> {
    const user = await this.deps.users.findByEmail(
      input.organizationId,
      input.email,
    );
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new InvalidCredentialsError();
    }

    return this.issueSession(user);
  }

  async refresh(refreshToken: string): Promise<AuthSession> {
    const { sub: userId, jti } =
      this.deps.tokens.verifyRefreshToken(refreshToken);
    const stored = await this.deps.refreshTokens.findById(jti);

    if (!stored || stored.revokedAt || stored.hashedToken !== hashApiKey(refreshToken)) {
      throw new InvalidCredentialsError();
    }

    const user = await this.deps.users.findById(userId);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    await this.deps.refreshTokens.revoke(stored.id);
    return this.issueSession(user);
  }

  async createApiKey(
    organizationId: string,
    name: string,
  ): Promise<{ record: ApiKeyRecord; plaintext: string }> {
    const generated = generateApiKey();
    const record: ApiKeyRecord = {
      id: generateId(),
      organizationId,
      name,
      hashedKey: generated.hashed,
      createdAt: new Date().toISOString(),
    };
    await this.deps.apiKeys.create(record);
    return { record, plaintext: generated.plaintext };
  }

  async verifyApiKey(plaintext: string): Promise<ApiKeyRecord | undefined> {
    const record = await this.deps.apiKeys.findByHash(hashApiKey(plaintext));
    return record && verifyApiKey(plaintext, record.hashedKey)
      ? record
      : undefined;
  }

  private async issueSession(user: User): Promise<AuthSession> {
    const accessToken = this.deps.tokens.signAccessToken({
      sub: user.id,
      organizationId: user.organizationId,
      role: user.role,
    });

    const issued = this.deps.tokens.issueRefreshToken(user.id);
    await this.deps.refreshTokens.create({
      id: issued.id,
      userId: user.id,
      hashedToken: hashApiKey(issued.token),
      expiresAt: issued.expiresAt.toISOString(),
    });

    return { user, accessToken, refreshToken: issued.token };
  }
}
