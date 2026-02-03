import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../core/database';

const updateProgressSchema = z.object({
  chapterIndex: z.number().int().min(0),
  chapterId: z.string().optional(),
  paragraphIndex: z.number().int().min(0).optional(),
  charPosition: z.number().int().min(0).optional(),
  percentage: z.number().min(0).max(100).optional(), // Overall book progress
  scrollPosition: z.number().min(0).optional(), // For reading mode
  audioTimestamp: z.number().min(0).optional(), // For audio mode
  audioChunkId: z.string().optional(),
  mode: z.enum(['reading', 'audio']).optional(),
});

export const progressRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (error) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  // Get reading progress for a book
  app.get<{ Params: { bookId: string } }>('/:bookId', async (request, reply) => {
    try {
      const { bookId } = request.params;
      const userId = (request.user as any).userId;

      // Verify user has access to this book
      const userBook = await prisma.userBook.findUnique({
        where: {
          userId_bookId: { userId, bookId },
        },
      });

      if (!userBook) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      // Get progress
      const progress = await prisma.readingProgress.findUnique({
        where: {
          userId_bookId: { userId, bookId },
        },
      });

      if (!progress) {
        // Return default progress (start of book)
        return reply.send({
          bookId,
          chapterIndex: 0,
          paragraphIndex: 0,
          tokenIndex: 0,
          charPosition: 0,
          percentage: 0,
          scrollPosition: 0,
          audioTimestamp: 0,
          mode: 'reading',
          lastReadAt: new Date().toISOString(),
        });
      }

      return reply.send(progress);
    } catch (error) {
      console.error('Failed to get progress:', error);
      return reply.code(500).send({ error: 'Failed to get progress' });
    }
  });

  // Update reading progress
  app.put<{ Params: { bookId: string } }>('/:bookId', async (request, reply) => {
    try {
      const { bookId } = request.params;
      const userId = (request.user as any).userId;
      const body = updateProgressSchema.parse(request.body);

      // Verify user has access to this book
      const userBook = await prisma.userBook.findUnique({
        where: {
          userId_bookId: { userId, bookId },
        },
      });

      if (!userBook) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      // Get book to calculate percentage
      const book = await prisma.book.findUnique({
        where: { id: bookId },
        select: { totalCharacters: true },
      });

      if (!book) {
        return reply.code(404).send({ error: 'Book not found' });
      }

      // Use provided percentage, or calculate from character position
      const percentage =
        body.percentage !== undefined
          ? body.percentage
          : body.charPosition
            ? Math.min(100, (body.charPosition / book.totalCharacters) * 100)
            : 0;

      // Upsert progress
      const progress = await prisma.readingProgress.upsert({
        where: {
          userId_bookId: { userId, bookId },
        },
        create: {
          userId,
          bookId,
          chapterIndex: body.chapterIndex,
          chapterId: body.chapterId,
          paragraphIndex: body.paragraphIndex || 0,
          tokenIndex: 0,
          charPosition: body.charPosition || 0,
          percentage,
          scrollPosition: body.scrollPosition || 0,
          audioTimestamp: body.audioTimestamp || 0,
          audioChunkId: body.audioChunkId,
          mode: body.mode || 'reading',
          lastReadAt: new Date(),
        },
        update: {
          chapterIndex: body.chapterIndex,
          chapterId: body.chapterId,
          paragraphIndex: body.paragraphIndex || 0,
          charPosition: body.charPosition || 0,
          percentage,
          scrollPosition: body.scrollPosition || 0,
          audioTimestamp: body.audioTimestamp || 0,
          audioChunkId: body.audioChunkId,
          mode: body.mode,
          lastReadAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return reply.send(progress);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid request', details: error.errors });
      }
      console.error('Failed to update progress:', error);
      return reply.code(500).send({ error: 'Failed to update progress' });
    }
  });
};
