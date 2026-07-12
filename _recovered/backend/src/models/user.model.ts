import { createHash } from 'node:crypto';
import { v4 as uuid } from 'uuid';
import mongoose, { Schema } from 'mongoose';
import type { AuthUser, Role } from './domain.js';

export interface UserRecord extends AuthUser {
  passwordHash: string;
}

const userSchema = new Schema(
  {
    _id: { type: String, default: () => uuid() },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      required: true,
      enum: ['cashier', 'kitchen', 'manager', 'support'],
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const refreshTokenSchema = new Schema(
  {
    _id: { type: String, default: () => uuid() },
    userId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const UserModel = mongoose.models.User || mongoose.model('User', userSchema);
const RefreshTokenModel =
  mongoose.models.RefreshToken || mongoose.model('RefreshToken', refreshTokenSchema);

function toAuthUser(doc: { _id: string; email: string; name: string; role: Role }): AuthUser {
  return { id: doc._id, email: doc.email, name: doc.name, role: doc.role };
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const row = await UserModel.findOne({ email: email.toLowerCase().trim() }).lean();
  if (!row) return null;
  return {
    id: String(row._id),
    email: row.email,
    name: row.name,
    role: row.role as Role,
    passwordHash: row.passwordHash,
  };
}

export async function createUser(input: {
  email: string;
  name: string;
  role: Role;
  passwordHash: string;
}): Promise<AuthUser> {
  const created = await UserModel.create({
    email: input.email.toLowerCase().trim(),
    name: input.name.trim(),
    role: input.role,
    passwordHash: input.passwordHash,
  });
  return toAuthUser(created);
}

export async function listUsers(): Promise<AuthUser[]> {
  const rows = await UserModel.find().sort({ createdAt: -1 }).lean();
  return rows.map((row) => toAuthUser({ _id: String(row._id), email: row.email, name: row.name, role: row.role as Role }));
}

export async function getUser(id: string): Promise<AuthUser | null> {
  const row = await UserModel.findById(id).lean();
  if (!row) return null;
  return toAuthUser({ _id: String(row._id), email: row.email, name: row.name, role: row.role as Role });
}

export async function updateUser(
  id: string,
  patch: Partial<{ name: string; role: Role; email: string }>,
): Promise<AuthUser | null> {
  const existing = await getUser(id);
  if (!existing) return null;
  const updated = await UserModel.findByIdAndUpdate(
    id,
    {
      name: patch.name ?? existing.name,
      role: patch.role ?? existing.role,
      email: (patch.email ?? existing.email).toLowerCase().trim(),
    },
    { new: true },
  ).lean();
  if (!updated) return null;
  return toAuthUser({
    _id: String(updated._id),
    email: updated.email,
    name: updated.name,
    role: updated.role as Role,
  });
}

export async function deleteUser(id: string): Promise<boolean> {
  const result = await UserModel.deleteOne({ _id: id });
  await RefreshTokenModel.deleteMany({ userId: id });
  return result.deletedCount > 0;
}

export async function saveRefreshToken(userId: string, refreshToken: string, expiresAt: string): Promise<void> {
  const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
  await RefreshTokenModel.create({
    userId,
    tokenHash,
    expiresAt: new Date(expiresAt),
  });
}

export async function findUserByRefreshToken(refreshToken: string): Promise<AuthUser | null> {
  const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
  const token = await RefreshTokenModel.findOne({
    tokenHash,
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!token) return null;
  return getUser(String(token.userId));
}
