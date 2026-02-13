import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-it';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.warn('⚠️ WARNING: using default JWT_SECRET in production. Please set JWT_SECRET environment variable.');
}

export interface TokenPayload {
  userId: string;
  username: string;
  role: string;
  familyId?: string;
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  // Compatibility with plain text passwords
  if (!hash.startsWith('$2a$') && !hash.startsWith('$2b$')) {
      return password === hash;
  }
  return await bcrypt.compare(password, hash);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

export function getUserIdFromToken(authHeader?: string | null): string | null {
    const payload = getTokenPayload(authHeader);
    return payload ? payload.userId : null;
}

export function getTokenPayload(authHeader?: string | null): TokenPayload | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    const token = authHeader.split(' ')[1];
    return verifyToken(token);
}
