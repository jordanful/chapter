import { beforeAll, afterAll } from 'vitest';

// Setup runs before all tests
beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://chapter:password@localhost:5432/chapter_test';
});

// Cleanup runs after all tests
afterAll(() => {
  // Cleanup logic here if needed
});
