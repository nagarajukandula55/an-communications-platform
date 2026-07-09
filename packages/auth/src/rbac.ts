import type { Role } from './types.js';

export type Permission =
  | 'organization:manage'
  | 'user:invite'
  | 'apikey:manage'
  | 'message:send'
  | 'message:read';

const rolePermissions: Record<Role, ReadonlySet<Permission>> = {
  owner: new Set([
    'organization:manage',
    'user:invite',
    'apikey:manage',
    'message:send',
    'message:read',
  ]),
  admin: new Set(['user:invite', 'apikey:manage', 'message:send', 'message:read']),
  member: new Set(['message:send', 'message:read']),
};

export function can(role: Role, permission: Permission): boolean {
  return rolePermissions[role].has(permission);
}

export class ForbiddenError extends Error {
  constructor(permission: Permission) {
    super(`Missing permission: ${permission}`);
    this.name = 'ForbiddenError';
  }
}

export function assertPermission(role: Role, permission: Permission): void {
  if (!can(role, permission)) {
    throw new ForbiddenError(permission);
  }
}
