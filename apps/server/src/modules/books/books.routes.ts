import { FastifyPluginAsync } from 'fastify';
import { booksService } from './books.service';

export const booksRoutes: FastifyPluginAsync = async (app) => {
  app.get('/cover-proxy', async (request, reply) => {
    try {
      const { url } = request.query as { url: string };

      if (!url || !url.startsWith('https://covers.openlibrary.org/')) {
        app.log.warn(`Cover proxy: Invalid URL - ${url}`);
        return reply.code(400).send({ error: 'Invalid URL' });
      }

      const response = await fetch(url);

      if (!response.ok) {
        app.log.warn(`Cover proxy: Upstream failed - ${url} (${response.status})`);
        return reply.code(response.status).send({ error: 'Failed to fetch image' });
      }

      const buffer = await response.arrayBuffer();

      if (buffer.byteLength <= 100) {
        app.log.warn(
          `Cover proxy: Placeholder image received - ${url} (${buffer.byteLength} bytes)`
        );
        return reply.code(404).send({ error: 'No cover image available' });
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';

      return reply
        .type(contentType)
        .header('Cache-Control', 'public, max-age=86400')
        .header('Access-Control-Allow-Origin', '*')
        .send(Buffer.from(buffer));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to proxy image';
      app.log.error(`Cover proxy: Error - ${message}`);
      return reply.code(500).send({ error: message });
    }
  });

  app.addHook('onRequest', async (request, reply) => {
    if (request.url.includes('/cover-proxy')) {
      return;
    }

    try {
      await request.jwtVerify();
    } catch (error) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });

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

  app.get('/maintenance/metadata-stats', async (request, reply) => {
    try {
      const stats = await booksService.getMetadataStats();
      return reply.send(stats);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get metadata stats';
      return reply.code(500).send({ error: message });
    }
  });

  app.post('/maintenance/clean-metadata', async (request, reply) => {
    try {
      const result = await booksService.cleanMetadata();
      return reply.send(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to clean metadata';
      return reply.code(500).send({ error: message });
    }
  });

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

  app.get(
    '/:bookId/epub',
    {
      preValidation: async (request, reply) => {
        try {
          await request.jwtVerify();
          return;
        } catch {
          const { token } = request.query as { token?: string };
          if (token) {
            try {
              const decoded = app.jwt.verify(token);
              (request as any).user = decoded;
              return;
            } catch {}
          }
          reply.code(401).send({ error: 'Unauthorized' });
        }
      },
    },
    async (request, reply) => {
      try {
        const userId = (request.user as any).userId;
        const { bookId } = request.params as any;

        const { buffer, filename } = await booksService.getEpubFile(userId, bookId);

        return reply
          .type('application/epub+zip')
          .header('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`)
          .send(buffer);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch EPUB';
        return reply.code(404).send({ error: message });
      }
    }
  );

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

  app.get('/:bookId/covers/alternatives', async (request, reply) => {
    try {
      const userId = (request.user as any).userId;
      const { bookId } = request.params as any;

      const covers = await booksService.getAlternativeCovers(userId, bookId);
      return reply.send(covers);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch alternative covers';
      return reply.code(500).send({ error: message });
    }
  });

  app.put('/:bookId/cover', async (request, reply) => {
    try {
      const userId = (request.user as any).userId;
      const { bookId } = request.params as any;
      const { coverUrl } = request.body as { coverUrl: string };

      if (!coverUrl) {
        return reply.code(400).send({ error: 'coverUrl is required' });
      }

      if (!coverUrl.startsWith('https://covers.openlibrary.org/')) {
        return reply.code(400).send({ error: 'Invalid cover URL' });
      }

      await booksService.updateCoverFromOpenLibrary(userId, bookId, coverUrl);
      return reply.send({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update cover';
      return reply.code(500).send({ error: message });
    }
  });

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
      const message = error instanceof Error ? error.message : 'Failed to update metadata';
      return reply.code(500).send({ error: message });
    }
  });

  app.put('/:bookId/favorite', async (request, reply) => {
    try {
      const userId = (request.user as any).userId;
      const { bookId } = request.params as any;
      const { isFavorite } = request.body as { isFavorite: boolean };

      if (typeof isFavorite !== 'boolean') {
        return reply.code(400).send({ error: 'isFavorite is required and must be a boolean' });
      }

      await booksService.setFavorite(userId, bookId, isFavorite);
      return reply.send({ success: true, isFavorite });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update favorite status';
      return reply.code(500).send({ error: message });
    }
  });
};
