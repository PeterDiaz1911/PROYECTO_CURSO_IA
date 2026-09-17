import { Pool } from "pg";

let pool: Pool | undefined;

export function getDb(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no está configurada");
  pool ??= new Pool({ connectionString: url, max: 10, ssl: { rejectUnauthorized: false } });
  return pool;
}

export async function findUserByEmail(email: string) {
  const result = await getDb().query(
    "SELECT id, nombre, correo, hash_password, rol, two_fa_secret, TRUE AS enabled FROM usuarios WHERE lower(correo) = lower($1) LIMIT 1",
    [email],
  );
  return result.rows[0] ?? null;
}
