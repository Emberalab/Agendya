import { roleHasPermission } from './permissions';

describe('roleHasPermission', () => {
  it('grants READ_ONLY view but nothing else', () => {
    expect(roleHasPermission('READ_ONLY', 'VIEW')).toBe(true);
    expect(roleHasPermission('READ_ONLY', 'MUTATE_TICKETS')).toBe(false);
    expect(roleHasPermission('READ_ONLY', 'ASSIGN_ANY_TICKET')).toBe(false);
    expect(roleHasPermission('READ_ONLY', 'MANAGE_INTERNAL_USERS')).toBe(false);
  });

  it('grants SUPPORT view + ticket mutation but not assign-any or user management', () => {
    expect(roleHasPermission('SUPPORT', 'VIEW')).toBe(true);
    expect(roleHasPermission('SUPPORT', 'MUTATE_TICKETS')).toBe(true);
    expect(roleHasPermission('SUPPORT', 'ASSIGN_ANY_TICKET')).toBe(false);
    expect(roleHasPermission('SUPPORT', 'MANAGE_INTERNAL_USERS')).toBe(false);
  });

  it('grants ADMIN everything but user management', () => {
    expect(roleHasPermission('ADMIN', 'ASSIGN_ANY_TICKET')).toBe(true);
    expect(roleHasPermission('ADMIN', 'MANAGE_INTERNAL_USERS')).toBe(false);
  });

  it('grants SUPER_ADMIN everything', () => {
    expect(roleHasPermission('SUPER_ADMIN', 'VIEW')).toBe(true);
    expect(roleHasPermission('SUPER_ADMIN', 'MUTATE_TICKETS')).toBe(true);
    expect(roleHasPermission('SUPER_ADMIN', 'ASSIGN_ANY_TICKET')).toBe(true);
    expect(roleHasPermission('SUPER_ADMIN', 'MANAGE_INTERNAL_USERS')).toBe(
      true,
    );
  });
});
