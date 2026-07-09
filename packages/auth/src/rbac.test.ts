import { describe, expect, it } from 'vitest';
import { assertPermission, can, ForbiddenError } from './rbac.js';

describe('rbac', () => {
  it('grants owners full permissions', () => {
    expect(can('owner', 'organization:manage')).toBe(true);
    expect(can('owner', 'apikey:manage')).toBe(true);
  });

  it('denies members organization management', () => {
    expect(can('member', 'organization:manage')).toBe(false);
    expect(can('member', 'message:send')).toBe(true);
  });

  it('throws ForbiddenError via assertPermission when missing', () => {
    expect(() => { assertPermission('member', 'apikey:manage'); }).toThrow(
      ForbiddenError,
    );
  });

  it('does not throw when the permission is granted', () => {
    expect(() => { assertPermission('admin', 'apikey:manage'); }).not.toThrow();
  });
});
