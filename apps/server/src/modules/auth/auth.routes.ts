import { FastifyPluginAsync } from 'fastify';
import { authService } from './auth.service';
import { seedService } from '../books/seed.service';
import { z } from 'zod';
import { UserRegistration, UserLogin } from '@chapter/types';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  // Register
  app.post('/register', async (request, reply) => {
    try {
      const body = registerSchema.parse(request.body);

      const result = await authService.register(body as UserRegistration, (payload) =>
        app.jwt.sign(payload, { expiresIn: '7d' })
      );

      // Seed books for new user (async, don't block response)
      const userId = (result.user as any).id;
      seedService.seedBooksForUser(userId).catch((error) => {
        console.error('Failed to seed books for new user:', error);
      });

      return reply.code(201).send(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }

      const message = error instanceof Error ? error.message : 'Registration failed';
      return reply.code(400).send({ error: message });
    }
  });

  // Login
  app.post('/login', async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body);

      const result = await authService.login(body as UserLogin, (payload) =>
        app.jwt.sign(payload, { expiresIn: '7d' })
      );

      return reply.send(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }

      const message = error instanceof Error ? error.message : 'Login failed';
      return reply.code(401).send({ error: message });
    }
  });

  // Get current user
  app.get('/me', async (request, reply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).userId;

      const user = await authService.getUserById(userId);

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      return reply.send(user);
    } catch (error) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  });
};
