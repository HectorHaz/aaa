import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../modules/auth/auth.js';

declare global {
  namespace Express {
    interface Request {
      auth?: { userId: string; tenantId: string; roles: string[] };
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('Authorization');
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const token = header.replace('Bearer ', '');
    const data = verifyAccessToken(token) as { userId: string; tenantId: string; roles: string[] };
    req.auth = data;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRoles = req.auth?.roles ?? [];
    if (!roles.some((r) => userRoles.includes(r))) return res.status(403).json({ message: 'Forbidden' });
    next();
  };
}
