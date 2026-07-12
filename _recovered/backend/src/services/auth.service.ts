import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import {
  createUser,
  findUserByEmail,
  findUserByRefreshToken,
  saveRefreshToken,
} from '../models/user.model.js';
import type { AuthUser, Role } from '../models/domain.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '8h';

export async function login(
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string; user: AuthUser } | null> {
  const user = await findUserByEmail(email.toLowerCase().trim());
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;

  return issueSession({ id: user.id, email: user.email, name: user.name, role: user.role });
}

export async function register(input: {
  email: string;
  password: string;
  name: string;
  role: Role;
}): Promise<{ accessToken: string; refreshToken: string; user: AuthUser } | { error: 'email_taken' }> {
  const email = input.email.toLowerCase().trim();
  if (await findUserByEmail(email)) {
    return { error: 'email_taken' };
  }
  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await createUser({
    email,
    name: input.name,
    role: input.role,
    passwordHash,
  });
  return issueSession(user);
}

async function issueSession(
  user: AuthUser,
): Promise<{ accessToken: string; refreshToken: string; user: AuthUser }> {
  const accessToken = jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
  const refreshToken = randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await saveRefreshToken(user.id, refreshToken, expiresAt);
  return { accessToken, refreshToken, user };
}

export async function refresh(
  refreshToken: string,
): Promise<{ accessToken: string; user: AuthUser } | null> {
  const user = await findUserByRefreshToken(refreshToken);
  if (!user) return null;
  const accessToken = jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
  return { accessToken, user };
}

export function verifyAccessToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  cashier: ['orders:read', 'orders:write', 'products:read', 'products:write', 'ai:read', 'notifications:read'],
  kitchen: ['orders:read', 'orders:write', 'kitchen:read', 'kitchen:write', 'notifications:read'],
  manager: [
    'orders:read',
    'orders:write',
    'products:read',
    'products:write',
    'kitchen:read',
    'kitchen:write',
    'ai:read',
    'ai:write',
    'notifications:read',
    'notifications:write',
    'users:read',
    'users:write',
    'categories:read',
    'categories:write',
  ],
  support: ['orders:read', 'products:read', 'notifications:read', 'ai:read', 'categories:read'],
};
