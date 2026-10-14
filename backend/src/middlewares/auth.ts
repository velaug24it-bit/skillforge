import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';
import { User, IUser } from '../models/User';
import { AppError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // Check cookie first (HTTP-only)
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // Fallback to Bearer token in Authorization header
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Unauthorized: Access denied. Please log in to continue.', 401));
    }

    // Verify token
    let decoded: TokenPayload;
    try {
      decoded = verifyToken(token);
    } catch (err: any) {
      return next(new AppError('Invalid or expired authentication session. Please log in again.', 401));
    }

    // Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new AppError('The user associated with this token no longer exists.', 401));
    }

    req.user = user;
    next();
  } catch (error: any) {
    next(new AppError(error.message || 'Authentication error', 401));
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(`User role (${req.user?.role}) is not authorized to access this resource`, 403));
    }
    next();
  };
};
