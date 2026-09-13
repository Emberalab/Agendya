import { describe, expect, it } from 'vitest';
import { appBuild } from './appBuild';

describe('appBuild', () => {
  it('exposes a sha, branch and builtAt stamp', () => {
    const build = appBuild();
    expect(build.sha).toMatch(/^[0-9a-f]{7,40}$|^unknown$/);
    expect(build.branch.length).toBeGreaterThan(0);
    expect(build.builtAt).toMatch(/^\d{4}-\d{2}-\d{2}T|unknown/);
  });
});
