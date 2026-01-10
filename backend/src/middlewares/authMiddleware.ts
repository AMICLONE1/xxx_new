import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

// Helper function to safely extract error messages
function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'Unknown error occurred';
}

export async function verifyAuth(req: Request, res: Response, next: NextFunction) {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ success: false, error: 'No authentication token provided' });
        }

        // Verify token with Supabase
        const { data: { user }, error } = await createClient(supabaseUrl, supabaseAnonKey)
            .auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ success: false, error: 'Invalid or expired token' });
        }

        // Attach user to request
        (req as any).user = user;
        next();
    } catch (error: unknown) {
        return res.status(401).json({ success: false, error: getErrorMessage(error) });
    }
}
