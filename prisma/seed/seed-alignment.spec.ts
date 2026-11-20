import { PERMISSIONS } from './permissions.js';
import { SYSTEM_ROLES } from './roles.js';
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';

describe('RBAC seed alignment', () => {
  it('contains unique permission codes', () => {
    const codes = PERMISSIONS.map(({ code }) => code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('references only seeded permission codes from system roles', () => {
    const codes = new Set(PERMISSIONS.map(({ code }) => code));
    for (const role of SYSTEM_ROLES) {
      if (role.permissions === '*') continue;
      for (const code of role.permissions) expect(codes.has(code), `${role.name}: ${code}`).toBe(true);
    }
  });

  it('seeds every permission declared by API controllers', () => {
    const seeded = new Set<string>(PERMISSIONS.map(({ code }) => code));
    const controllerFiles = globSync('src/modules/**/*.controller.ts');
    const declared = controllerFiles.flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      return [...source.matchAll(/@Permissions\('([^']+)'/g)].map((match) => match[1]);
    });
    for (const code of new Set(declared)) expect(seeded.has(code), code).toBe(true);
  });
});