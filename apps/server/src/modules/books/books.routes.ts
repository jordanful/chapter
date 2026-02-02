import { FastifyPluginAsync } from 'fastify';
import { booksService } from './books.service';

export const booksRoutes: FastifyPluginAsync = async (app) => {
  // Authentication decorator
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (error) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  // Get user's books
  app.get('/', async (request, reply) => {
    try {
      const userId = (request.user as any).userId;
      const books = await booksService.getUserBooks(userId);
      return reply.send(books);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch books';
      return reply.code(500).send({ error: message });
    }
  });

  // Upload book
  app.post('/', async (request, reply) => {
    try {
      const userId = (request.user as any).userId;
      const data = await request.file();

      if (!data) {
        return reply.code(400).send({ error: 'No file provided' });
      }

      const buffer = await data.toBuffer();
      const book = await booksService.uploadBook(userId, buffer, data.filename);

      return reply.code(201).send(book);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload book';
      return reply.code(500).send({ error: message });
    }
  });

  // Get book details
  app.get('/:bookId', async (request, reply) => {
    try {
      const userId = (request.user as any).userId;
      const { bookId } = request.params as any;

      const book = await booksService.getBookById(userId, bookId);
      return reply.send(book);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch book';
      return reply.code(404).send({ error: message });
    }
  });

  // Get book structure
  app.get('/:bookId/structure', async (request, reply) => {
    try {
      const userId = (request.user as any).userId;
      const { bookId } = request.params as any;

      const structure = await booksService.getBookStructure(userId, bookId);
      return reply.send(structure);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch structure';
      return reply.code(404).send({ error: message });
    }
  });

  // Get chapter
  app.get('/:bookId/chapter/:index', async (request, reply) => {
    try {
      const userId = (request.user as any).userId;
      const { bookId, index } = request.params as any;

      const chapter = await booksService.getChapter(userId, bookId, parseInt(index, 10));
      return reply.send(chapter);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch chapter';
      return reply.code(404).send({ error: message });
    }
  });

  // Get cover
  app.get('/:bookId/cover', async (request, reply) => {
    try {
      const userId = (request.user as any).userId;
      const { bookId } = request.params as any;

      const cover = await booksService.getCover(userId, bookId);

      if (!cover) {
        return reply.code(404).send({ error: 'Cover not found' });
      }

      return reply.type('image/jpeg').send(cover);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch cover';
      return reply.code(404).send({ error: message });
    }
  });

  // Delete book
  app.delete('/:bookId', async (request, reply) => {
    try {
      const userId = (request.user as any).userId;
      const { bookId } = request.params as any;

      await booksService.deleteBook(userId, bookId);
      return reply.code(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete book';
      return reply.code(500).send({ error: message });
    }
  });

  // Get alternative covers from Open Library
  app.get('/:bookId/covers/alternatives', async (request, reply) => {
    try {
      const userId = (request.user as any).userId;
      const { bookId } = request.params as any;

      const covers = await booksService.getAlternativeCovers(userId, bookId);
      return reply.send(covers);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch alternative covers';
      return reply.code(500).send({ error: message });
    }
  });

  // Update cover from Open Library
  app.put('/:bookId/cover', async (request, reply) => {
    try {
      const userId = (request.user as any).userId;
      const { bookId } = request.params as any;
      const { coverUrl } = request.body as { coverUrl: string };

      if (!coverUrl) {
        return reply.code(400).send({ error: 'coverUrl is required' });
      }

      // Validate that URL is from Open Library
      if (!coverUrl.startsWith('https://covers.openlibrary.org/')) {
        return reply.code(400).send({ error: 'Invalid cover URL' });
      }

      await booksService.updateCoverFromOpenLibrary(userId, bookId, coverUrl);
      return reply.send({ success: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update cover';
      return reply.code(500).send({ error: message });
    }
  });

  // Update book metadata
  app.patch('/:bookId', async (request, reply) => {
    try {
      const userId = (request.user as any).userId;
      const { bookId } = request.params as any;
      const metadata = request.body as {
        title?: string;
        author?: string;
        isbn?: string;
        publisher?: string;
        language?: string;
        description?: string;
        publishedYear?: string;
        coverUrl?: string;
      };

      await booksService.updateMetadata(userId, bookId, metadata);
      return reply.send({ success: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update metadata';
      return reply.code(500).send({ error: message });
    }
  });
};
