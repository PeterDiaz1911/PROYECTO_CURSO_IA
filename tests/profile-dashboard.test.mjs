import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateAvatarFile, validateAvatarSignature, validateEditableProfile } from '../src/features/profile/profile-validation.ts';
import { dashboardSinceDate, getStatusCounts, parseGerenciaDashboard } from '../src/features/gerencia/dashboard-data.ts';

test('profile validation accepts optional details and enforces lengths and phone format', () => {
  assert.equal(validateEditableProfile({ nombre: 'Rodrigo Díaz', telefono: '', descripcion: '' }), null);
  assert.equal(validateEditableProfile({ nombre: '  ', telefono: '', descripcion: '' }), 'Escribe tu nombre.');
  assert.equal(validateEditableProfile({ nombre: 'R'.repeat(121), telefono: '', descripcion: '' }), 'El nombre no puede superar los 120 caracteres.');
  assert.equal(validateEditableProfile({ nombre: 'Rodrigo', telefono: '123', descripcion: '' }), 'Ingresa un teléfono válido de 7 a 15 dígitos.');
  assert.equal(validateEditableProfile({ nombre: 'Rodrigo', telefono: '+51 (999) 888-777', descripcion: '' }), null);
  assert.equal(validateEditableProfile({ nombre: 'Rodrigo', telefono: '', descripcion: 'd'.repeat(281) }), 'La descripción no puede superar los 280 caracteres.');
});

test('avatar validation rejects unsupported MIME types and SVG data disguised as PNG', async () => {
  const svgAsPng = new File(['<svg xmlns="http://www.w3.org/2000/svg"></svg>'], 'avatar.png', { type: 'image/png' });
  const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], 'avatar.png', { type: 'image/png' });
  const svg = new File(['<svg/>'], 'avatar.svg', { type: 'image/svg+xml' });
  assert.equal(validateAvatarFile(svg), 'La foto debe ser JPEG, PNG o WebP.');
  assert.equal(await validateAvatarSignature(svgAsPng), false);
  assert.equal(await validateAvatarSignature(png), true);
});

test('dashboard periods are bounded and status counts use the selected lot set', () => {
  const now = new Date('2026-10-28T13:00:00.000Z');
  assert.equal(dashboardSinceDate('7d', now), '2026-10-22');
  assert.equal(dashboardSinceDate('30d', now), '2026-09-29');
  assert.equal(dashboardSinceDate('all', now), null);
  const data = parseGerenciaDashboard({
    documentos: 2,
    lotes: [
      { id: 'L-1', fundo: 'Fundo A', cultivo: 'Uva', agroquimico: 'Producto A', estado: 'EN_CAMPO', fecha_cosecha: '2026-10-28', created_at: '2026-10-28T10:00:00Z' },
      { id: 'L-2', fundo: 'Fundo B', cultivo: 'Palta', agroquimico: 'Producto B', estado: 'APROBADO', fecha_cosecha: '2026-10-28', created_at: '2026-10-27T10:00:00Z' },
    ],
  });
  assert.deepEqual(getStatusCounts(data.lotes).filter((entry) => entry.total), [
    { estado: 'EN_CAMPO', total: 1 },
    { estado: 'APROBADO', total: 1 },
  ]);
  assert.throws(() => parseGerenciaDashboard({ lotes: [], documentos: -1 }));
  assert.throws(() => parseGerenciaDashboard({ lotes: [{ id: 'L-3', estado: 'DESPACHADO' }], documentos: 0 }));
});

test('new database functions guard profile edits and managerial access', () => {
  const migration = readFileSync(new URL('../supabase/migrations/202610280003_sprint_2_profile_dashboard.sql', import.meta.url), 'utf8');
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /public\.don_ricardo_role\(\) is distinct from 'ADMIN'/);
  assert.match(migration, /update public\.usuarios\s+set nombre = v_nombre,\s+telefono = v_telefono,\s+descripcion = v_descripcion,\s+avatar_path = p_avatar_path/i);
  assert.match(migration, /public\.usuarios.*?telefono.*?descripcion.*?avatar_path/s);
  assert.match(migration, /file_size_limit, allowed_mime_types/);
  assert.match(migration, /public = false/);
  assert.match(migration, /revoke all on function public\.gerencia_dashboard\(date, text\) from public, anon/i);
});
