import { Request, Response, NextFunction } from 'express';
import { getSupabaseClient, isSupabaseConfigured } from '../supabase';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  displayName?: string;
  isGuest: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const guestHeaderId = req.headers['x-guest-user-id'] as string;

  // 1. If Bearer token is provided and Supabase is configured
  if (authHeader && authHeader.startsWith('Bearer ') && isSupabaseConfigured()) {
    const token = authHeader.split(' ')[1];
    const supabase = getSupabaseClient();

    if (supabase) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          req.user = {
            id: user.id,
            email: user.email,
            displayName: user.user_metadata?.full_name || user.email?.split('@')[0],
            isGuest: false,
          };
          return next();
        }
      } catch (err) {
        // Fall through to guest
      }
    }
  }

  // 2. Guest fallback
  const guestId = guestHeaderId || 'guest_user_default';
  req.user = {
    id: guestId,
    displayName: 'Guest Designer',
    isGuest: true,
  };

  next();
};

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.isGuest) {
    res.status(401).json({
      error: 'Authentication required. Please sign in to perform this operation.',
      isGuest: true,
    });
    return;
  }
  next();
};
