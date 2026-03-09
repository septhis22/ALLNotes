
import * as dotenv from 'dotenv';
dotenv.config();

import { Request, Response, NextFunction } from 'express';
import { createClient, User } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      token?: string;
    }
  }
}

interface AuthError {
  error: string;
  details?: string;
}

export const authenticateSupabaseToken = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
      res.status(401).json({ 
        error: 'Access token required' 
      } as AuthError);
      return;
    }

    // Verify token using Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(403).json({ 
        error: 'Invalid or expired token',
        details: error?.message 
      } as AuthError);
      return;
    }
    console.log("USER EMAIL::::::::",user?.email);
    // Add user info to request object
    req.user = user;
    req.token = token;
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      error: 'Authentication service error' 
    } as AuthError);
  }
};
