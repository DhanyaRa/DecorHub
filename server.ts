import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { authMiddleware } from './server/middleware/auth';
import { authRouter } from './server/routes/auth';
import { roomsRouter } from './server/routes/rooms';
import { furnitureRouter } from './server/routes/furniture';
import { recommendationsRouter } from './server/routes/recommendations';
import { layoutsRouter } from './server/routes/layouts';
import { budgetRouter } from './server/routes/budget';
import { projectsRouter } from './server/routes/projects';
import { scannerRouter } from './server/routes/scanner';
import { isSupabaseConfigured } from './server/supabase';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // Base Middlewares - 50mb body limit ensures photo uploads are never rejected with 413
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Global Auth/Session context middleware
  app.use(authMiddleware);

  // Health and System Status Endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      app: 'DecorHub Interior Design System API',
      timestamp: new Date().toISOString(),
      supabaseConfigured: isSupabaseConfigured(),
      user: req.user,
    });
  });

  // REST API Route Mounts
  app.use('/api/auth', authRouter);
  app.use('/api/rooms', roomsRouter);
  app.use('/api/furniture', furnitureRouter);
  app.use('/api/recommendations', recommendationsRouter);
  app.use('/api/layouts', layoutsRouter);
  app.use('/api/budget', budgetRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/scanner', scannerRouter);

  // Vite integration in development, static files in production
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static frontend build
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DecorHub Server running on http://0.0.0.0:${PORT}`);
    console.log(`Supabase connection: ${isSupabaseConfigured() ? 'Connected' : 'Offline / Guest mode'}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start DecorHub server:', err);
  process.exit(1);
});
