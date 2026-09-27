import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'marksure_oiml_r76_secure_key_2026';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'TESTING_OFFICER' | 'REVIEWING_OFFICER' | 'ADMIN';
  designation?: string;
  department?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || (req.query.token as string);

  if (!token) {
    res.status(401).json({ error: 'Access token required. Please log in.' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      res.status(403).json({ error: 'Invalid or expired authentication session.' });
      return;
    }
    req.user = decoded as AuthUser;
    next();
  });
};

export const requireRoles = (roles: Array<'TESTING_OFFICER' | 'REVIEWING_OFFICER' | 'ADMIN'>) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized: Session required.' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden: Your role (${req.user.role}) is not authorized to perform this operation. Allowed roles: ${roles.join(', ')}`
      });
      return;
    }

    next();
  };
};
