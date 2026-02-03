import { FastifyPluginAsync } from 'fastify';

export const usersRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (error) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  app.get('/me/settings', async (request, reply) => {
    return reply.send({ message: 'User settings - to be implemented' });
  });

  app.put('/me/tts-config', async (request, reply) => {
    return reply.send({ message: 'TTS config update - to be implemented' });
  });
};
