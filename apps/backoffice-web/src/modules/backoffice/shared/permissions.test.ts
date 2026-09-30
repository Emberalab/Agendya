import { describe, expect, it } from 'vitest';
import { roleHasPermission } from './permissions';

describe('roleHasPermission', () => {
  it('READ_ONLY can view but never mutate', () => {
    expect(roleHasPermission('READ_ONLY', 'VIEW')).toBe(true);
    expect(roleHasPermission('READ_ONLY', 'MUTATE_TICKETS')).toBe(false);
  });

  it('SUPPORT can mutate tickets but not manage internal users', () => {
    expect(roleHasPermission('SUPPORT', 'MUTATE_TICKETS')).toBe(true);
    expect(roleHasPermission('SUPPORT', 'MANAGE_INTERNAL_USERS')).toBe(false);
  });

  it('only SUPER_ADMIN can manage internal users', () => {
    expect(roleHasPermission('ADMIN', 'MANAGE_INTERNAL_USERS')).toBe(false);
    expect(roleHasPermission('SUPER_ADMIN', 'MANAGE_INTERNAL_USERS')).toBe(true);
  });

  it('treats a missing role as no permissions', () => {
    expect(roleHasPermission(undefined, 'VIEW')).toBe(false);
  });
});
