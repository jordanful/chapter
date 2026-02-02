import { FastifyPluginAsync } from 'fastify';
import { libraryService } from './library.service';
import type { CreateWatchedFolderRequest, UpdateWatchedFolderRequest } from '@chapter/types';

export const libraryRoutes: FastifyPluginAsync = async (app) => {
  // Authentication for all routes
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (error) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  // Get all watched folders
  app.get('/folders', async (request, reply) => {
    try {
      const userId = (request.user as any).userId;
      const folders = await libraryService.getWatchedFolders(userId);
      return reply.send(folders);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch folders';
      return reply.code(500).send({ error: message });
    }
  });

  // Create watched folder
  app.post('/folders', async (request, reply) => {
    try {
      const userId = (request.user as any).userId;
      const { path, name } = request.body as CreateWatchedFolderRequest;

      if (!path) {
        return reply.code(400).send({ error: 'Path is required' });
      }

      const folder = await libraryService.createWatchedFolder(userId, path, name);
      return reply.code(201).send(folder);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create folder';
      return reply.code(400).send({ error: message });
    }
  });

  // Update watched folder
  app.patch('/folders/:folderId', async (request, reply) => {
    try {
      const userId = (request.user as any).userId;
      const { folderId } = request.params as { folderId: string };
      const updates = request.body as UpdateWatchedFolderRequest;

      const folder = await libraryService.updateWatchedFolder(userId, folderId, updates);
      return reply.send(folder);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update folder';
      return reply.code(404).send({ error: message });
    }
  });

  // Delete watched folder
  app.delete('/folders/:folderId', async (request, reply) => {
    try {
      const userId = (request.user as any).userId;
      const { folderId } = request.params as { folderId: string };

      await libraryService.deleteWatchedFolder(userId, folderId);
      return reply.code(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete folder';
      return reply.code(404).send({ error: message });
    }
  });

  // Scan specific folder
  app.post('/folders/:folderId/scan', async (request, reply) => {
    try {
      const userId = (request.user as any).userId;
      const { folderId } = request.params as { folderId: string };

      const result = await libraryService.scanFolder(userId, folderId);
      return reply.send(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to scan folder';
      return reply.code(500).send({ error: message });
    }
  });

  // Get folder scan status
  app.get('/folders/:folderId/status', async (request, reply) => {
    try {
      const userId = (request.user as any).userId;
      const { folderId } = request.params as { folderId: string };

      const status = await libraryService.getFolderScanStatus(userId, folderId);
      return reply.send(status);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get folder status';
      return reply.code(404).send({ error: message });
    }
  });

  // Scan all folders
  app.post('/scan-all', async (request, reply) => {
    try {
      const userId = (request.user as any).userId;
      const results = await libraryService.scanAllFolders(userId);
      return reply.send(results);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to scan folders';
      return reply.code(500).send({ error: message });
    }
  });
};
