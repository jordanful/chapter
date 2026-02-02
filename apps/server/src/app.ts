import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import jwt from '@fastify/jwt';
import { config } from './core/config';

// Module routes
import { authRoutes } from './modules/auth/auth.routes';
import { booksRoutes } from './modules/books/books.routes';
import { libraryRoutes } from './modules/library/library.routes';
import { progressRoutes } from './modules/progress/progress.routes';
import { usersRoutes } from './modules/users/users.routes';
import { ttsRoutes } from './modules/tts/tts.routes';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.nodeEnv === 'development' ? 'info' : 'warn',
    },
  });

  // Register plugins
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(multipart, {
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB max file size
    },
  });

  await app.register(jwt, {
    secret: config.jwt.secret,
  });

  // Health check
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Register routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(booksRoutes, { prefix: '/api/books' });
  await app.register(libraryRoutes, { prefix: '/api/library' });
  await app.register(progressRoutes, { prefix: '/api/progress' });
  await app.register(usersRoutes, { prefix: '/api/users' });
  await app.register(ttsRoutes, { prefix: '/api/tts' });

  return app;
}
