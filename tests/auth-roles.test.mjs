import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { isUserRole, roleHome, routeRole } from '../src/features/auth/roles.ts';
test('roles retain the agricultural business areas and reject unknown values', () => {
  assert.equal(roleHome.ADMIN, '/gerente');
  assert.equal(roleHome.SUPERVISOR, '/packing');
  assert.equal(roleHome.OPERADOR, '/campo');
  for (const role of ['ADMIN','SUPERVISOR','OPERADOR']) assert.equal(isUserRole(role), true);
  for (const role of ['admin','courier','client',undefined,null,'__proto__']) assert.equal(isUserRole(role), false);
});
test('route matching is exact and supports exported trailing slashes', () => {
  for (const [role, path] of Object.entries(roleHome)) {
    assert.equal(routeRole(path), role); assert.equal(routeRole(path + '/'), role);
  }
  assert.equal(routeRole('/campo-falso'), null);
  assert.equal(routeRole('/login'), null);
});
test('active login has no mock-password or self-selected role fallback', () => {
  const source = readFileSync(new URL('../src/app/login/page.tsx',import.meta.url),'utf8');
  assert.doesNotMatch(source, /mockUsers|nativa-role|localStorage\.setItem|admin123|pack123|agro123/);
  assert.match(source, /signInWithPassword/); assert.match(source,/resetPasswordForEmail/);
  assert.equal(existsSync(new URL('../middleware.ts',import.meta.url)),false);
  assert.equal(existsSync(new URL('../src/app/api',import.meta.url)),false);
});
