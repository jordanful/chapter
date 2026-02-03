import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { kokoroService } from './kokoro.service';
import { audioCacheService } from './audio-cache.service';
import { chunker } from './chunker';
import { prisma } from '../../core/database';

const generateChapterSchema = z.object({
  voiceId: z.string(),
  settings: z
    .object({
      speed: z.number().min(0.5).max(2.0).optional(),
      temperature: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

export const ttsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', async (request, reply) => {
    const publicPaths = ['/audio/', '/health', '/voices', '/preview'];
    const isPublic = publicPaths.some(
      (path) => request.routeOptions.url?.includes(path) || request.url.includes(path)
    );

    if (isPublic) {
      return;
    }

    try {
      await request.jwtVerify();
    } catch (error) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  app.get('/voices', async (request, reply) => {
    try {
      const voices = kokoroService.getVoices();
      return reply.send(voices);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch voices';
      return reply.code(500).send({ error: message });
    }
  });

  app.get('/health', async (request, reply) => {
    try {
      const isHealthy = await kokoroService.healthCheck();
      if (isHealthy) {
        return reply.send({ status: 'ok', service: 'kokoro' });
      } else {
        return reply.code(503).send({ status: 'unavailable', service: 'kokoro' });
      }
    } catch (error) {
      return reply.code(503).send({ status: 'error', service: 'kokoro' });
    }
  });

  app.post('/preview', async (request, reply) => {
    try {
      const body = z
        .object({
          voiceId: z.string(),
          speed: z.number().min(0.5).max(2.0).optional().default(1.0),
          temperature: z.number().min(0).max(1).optional().default(0.7),
        })
        .parse(request.body);

      const sampleText =
        'The quick brown fox jumps over the lazy dog. This is a test of the text to speech system.';

      const result = await kokoroService.generateSpeech({
        text: sampleText,
        voiceId: body.voiceId as any,
        settings: {
          speed: body.speed,
          temperature: body.temperature,
        },
      });
      const audioBuffer = result.audioData;

      return reply
        .header('Content-Type', 'audio/wav')
        .header('Content-Length', audioBuffer.length)
        .send(audioBuffer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }

      const message = error instanceof Error ? error.message : 'Failed to generate preview';
      return reply.code(500).send({ error: message });
    }
  });

  app.get('/cache/stats', async (request, reply) => {
    try {
      const stats = await audioCacheService.getCacheStats();
      return reply.send(stats);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch cache stats';
      return reply.code(500).send({ error: message });
    }
  });

  app.post<{ Params: { bookId: string; chapterId: string } }>(
    '/generate/:bookId/:chapterId',
    async (request, reply) => {
      try {
        const { bookId, chapterId } = request.params;
        const userId = (request.user as any).userId;

        const body = generateChapterSchema.parse(request.body);

        const userBook = await prisma.userBook.findUnique({
          where: {
            userId_bookId: { userId, bookId },
          },
        });

        if (!userBook) {
          return reply.code(403).send({ error: 'Access denied' });
        }

        const chapter = await prisma.chapter.findUnique({
          where: { id: chapterId },
          include: { book: true },
        });

        if (!chapter || chapter.bookId !== bookId) {
          return reply.code(404).send({ error: 'Chapter not found' });
        }

        const chunks = chunker.chunk(chapter.textContent, chapter.startPosition);

        const audioChunks = await audioCacheService.generateChapterAudio(
          bookId,
          chapterId,
          chunks,
          body.voiceId as any,
          body.settings
        );

        return reply.send({
          chapterId,
          chapterTitle: chapter.title,
          chunks: audioChunks.map((chunk, index) => ({
            id: chunk.id,
            index,
            duration: chunk.audioDuration,
            size: chunk.audioSize,
          })),
          totalDuration: audioChunks.reduce((sum, chunk) => sum + chunk.audioDuration, 0),
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: 'Invalid input', details: error.errors });
        }

        const message = error instanceof Error ? error.message : 'Failed to generate audio';
        return reply.code(500).send({ error: message });
      }
    }
  );

  app.get<{ Params: { chunkId: string } }>('/audio/:chunkId', async (request, reply) => {
    try {
      const { chunkId } = request.params;

      const cached = await prisma.tTSCache.findUnique({
        where: { id: chunkId },
      });

      if (!cached) {
        return reply.code(404).send({ error: 'Audio not found' });
      }

      // Audio streaming is public - chunk IDs are unguessable UUIDs
      const audioBuffer = await audioCacheService.streamAudio(chunkId);

      const range = request.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : audioBuffer.length - 1;
        const chunkSize = end - start + 1;

        return reply
          .code(206)
          .header('Content-Range', `bytes ${start}-${end}/${audioBuffer.length}`)
          .header('Accept-Ranges', 'bytes')
          .header('Content-Length', chunkSize)
          .header('Content-Type', `audio/${cached.audioFormat}`)
          .header('Access-Control-Allow-Origin', '*')
          .header('Access-Control-Allow-Methods', 'GET, OPTIONS')
          .header('Access-Control-Allow-Headers', 'Range')
          .send(audioBuffer.slice(start, end + 1));
      }

      return reply
        .header('Content-Type', `audio/${cached.audioFormat}`)
        .header('Content-Length', audioBuffer.length)
        .header('X-Audio-Duration', cached.audioDuration.toString())
        .header('Access-Control-Allow-Origin', '*')
        .header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        .send(audioBuffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to stream audio';
      return reply.code(500).send({ error: message });
    }
  });

  app.post<{ Params: { bookId: string; chapterId: string; chunkIndex: string } }>(
    '/chapters/:bookId/:chapterId/chunk/:chunkIndex',
    async (request, reply) => {
      try {
        const { bookId, chapterId, chunkIndex } = request.params;
        const userId = (request.user as any).userId;
        const index = parseInt(chunkIndex, 10);

        if (isNaN(index) || index < 0) {
          return reply.code(400).send({ error: 'Invalid chunk index' });
        }

        const body = generateChapterSchema.parse(request.body);

        const userBook = await prisma.userBook.findUnique({
          where: { userId_bookId: { userId, bookId } },
        });

        if (!userBook) {
          return reply.code(403).send({ error: 'Access denied' });
        }

        const chapter = await prisma.chapter.findUnique({
          where: { id: chapterId },
        });

        if (!chapter || chapter.bookId !== bookId) {
          return reply.code(404).send({ error: 'Chapter not found' });
        }

        const chunks = chunker.chunk(chapter.textContent, chapter.startPosition);

        if (index >= chunks.length) {
          return reply.code(404).send({ error: 'Chunk index out of range' });
        }

        const audio = await audioCacheService.generateChunkOnDemand(
          bookId,
          chapterId,
          chunks[index],
          body.voiceId as any,
          body.settings
        );

        return reply.send({
          id: audio.id,
          index,
          duration: audio.audioDuration,
          size: audio.audioSize,
          startPosition: chunks[index].startPosition,
          endPosition: chunks[index].endPosition,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: 'Invalid input', details: error.errors });
        }
        const message = error instanceof Error ? error.message : 'Failed to generate chunk';
        return reply.code(500).send({ error: message });
      }
    }
  );

  app.get<{ Params: { bookId: string; chapterId: string } }>(
    '/chapters/:bookId/:chapterId',
    async (request, reply) => {
      try {
        const { bookId, chapterId } = request.params;
        const userId = (request.user as any).userId;

        const userBook = await prisma.userBook.findUnique({
          where: {
            userId_bookId: { userId, bookId },
          },
        });

        if (!userBook) {
          return reply.code(403).send({ error: 'Access denied' });
        }

        const chunks = await prisma.tTSCache.findMany({
          where: {
            bookId,
            chapterId,
          },
          orderBy: {
            startPosition: 'asc',
          },
          select: {
            id: true,
            startPosition: true,
            endPosition: true,
            audioDuration: true,
            audioSize: true,
            voiceId: true,
            settings: true,
          },
        });

        return reply.send(chunks);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch chunks';
        return reply.code(500).send({ error: message });
      }
    }
  );
};
