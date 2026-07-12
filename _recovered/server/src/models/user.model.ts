import { createHash } from 'node:crypto';
import { v4 as uuid } from 'uuid';
import { db } from '../db/database.js';
import type { AuthUser, Role } from './domain.js';

export interface UserRecord extends AuthUser {
  passwordHash: string;
}

export function findUserByEmail(email: string): UserRecord | null {
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    role: row.role as Role,
    passwordHash: String(row.password_hash),
  };
}

export function createUser(input: {
  email: string;
  name: string;
  role: Role;
  passwordHash: string;
}): AuthUser {
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, input.email.toLowerCase().trim(), input.passwordHash, input.name.trim(), input.role, now);

  return {
    id,
    email: input.email.toLowerCase().trim(),
    name: input.name.trim(),
    role: input.role,
  };
}

export function listUsers(): AuthUser[] {
  const rows = db
    .prepare(`SELECT id, email, name, role FROM users ORDER BY created_at DESC`)
    .all() as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    role: row.role as Role,
  }));
}

export function getUser(id: string): AuthUser | null {
  const row = db.prepare(`SELECT id, email, name, role FROM users WHERE id = ?`).get(id) as
    | Record<string, unknown>
    | undefined;
  if (!row) return null;
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    role: row.role as Role,
  };
}

export function updateUser(
  id: string,
  patch: Partial<{ name: string; role: Role; email: string }>,
): AuthUser | null {
  const existing = getUser(id);
  if (!existing) return null;
  db.prepare(`UPDATE users SET name = ?, role = ?, email = ? WHERE id = ?`).run(
    patch.name ?? existing.name,
    patch.role ?? existing.role,
    (patch.email ?? existing.email).toLowerCase().trim(),
    id,
  );
  return getUser(id);
}

export function deleteUser(id: string): boolean {
  return db.prepare('DELETE FROM users WHERE id = ?').run(id).changes > 0;
}

export function saveRefreshToken(userId: string, refreshToken: string, expiresAt: string): void {
  const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
  db.prepare(`
    INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(uuid(), userId, tokenHash, expiresAt, new Date().toISOString());
}

export function findUserByRefreshToken(refreshToken: string): AuthUser | null {
  const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
  const row = db
    .prepare(
      `
    SELECT rt.user_id, u.email, u.name, u.role
    FROM refresh_tokens rt
    JOIN users u ON u.id = rt.user_id
    WHERE rt.token_hash = ? AND rt.expires_at > ?
  `,
    )
    .get(tokenHash, new Date().toISOString()) as Record<string, unknown> | undefined;

  if (!row) return null;
  return {
    id: String(row.user_id),
    email: String(row.email),
    name: String(row.name),
    role: row.role as Role,
  };
}
