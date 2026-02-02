import { buildApp } from './app';
import { config } from './core/config';
import { connectDatabase, disconnectDatabase } from './core/database';
import { disconnectRedis } from './core/redis';
import { ensureStorageDirectories } from './core/storage';

async function start() {
  try {
    // Initialize storage
    await ensureStorageDirectories();

    // Connect to database (continue even if it fails)
    try {
      await connectDatabase();
    } catch (dbError) {
      console.warn('⚠️  Database connection failed, server will start anyway');
      console.warn('   Some features may not work until database is fixed');
    }

    // Build and start app
    const app = await buildApp();

    await app.listen({
      port: config.port,
      host: '0.0.0.0',
    });

    console.log(`🚀 Server running on port ${config.port}`);
    console.log(`📚 Environment: ${config.nodeEnv}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await disconnectDatabase();
  await disconnectRedis();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await disconnectDatabase();
  await disconnectRedis();
  process.exit(0);
});

start();
