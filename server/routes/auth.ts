import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getSupabaseClient, isSupabaseConfigured } from '../supabase';

export const authRouter = Router();

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(1).optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Check auth status & whether Supabase is configured
authRouter.get('/status', (req: Request, res: Response) => {
  res.json({
    isConfigured: isSupabaseConfigured(),
    user: req.user,
  });
});

// Register
authRouter.post('/register', async (req: Request, res: Response): Promise<void> => {
  if (!isSupabaseConfigured()) {
    res.status(503).json({
      error: 'Supabase authentication is not configured yet. Using guest mode.',
      isGuest: true,
    });
    return;
  }

  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid registration details', details: parsed.error.format() });
    return;
  }

  const supabase = getSupabaseClient()!;
  try {
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          full_name: parsed.data.displayName || parsed.data.email.split('@')[0],
        },
      },
    });

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({
      user: data.user,
      session: data.session,
      message: 'Registration successful',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// Login
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  if (!isSupabaseConfigured()) {
    res.status(503).json({
      error: 'Supabase authentication is not configured yet. Operating in guest mode.',
      isGuest: true,
    });
    return;
  }

  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid email or password', details: parsed.error.format() });
    return;
  }

  const supabase = getSupabaseClient()!;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      res.status(401).json({ error: error.message });
      return;
    }

    res.json({
      user: data.user,
      session: data.session,
      message: 'Login successful',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// Logout
authRouter.post('/logout', async (req: Request, res: Response): Promise<void> => {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient()!;
    await supabase.auth.signOut().catch(() => {});
  }
  res.json({ message: 'Logged out successfully' });
});

// Profile
authRouter.get('/profile', async (req: Request, res: Response): Promise<void> => {
  if (!req.user || req.user.isGuest) {
    res.json({
      profile: {
        id: req.user?.id || 'guest',
        displayName: 'Guest Designer',
        email: null,
        isGuest: true,
      },
    });
    return;
  }

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient()!;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (!error && data) {
      res.json({ profile: { ...data, isGuest: false } });
      return;
    }
  }

  res.json({
    profile: {
      id: req.user.id,
      email: req.user.email,
      displayName: req.user.displayName,
      isGuest: false,
    },
  });
});
