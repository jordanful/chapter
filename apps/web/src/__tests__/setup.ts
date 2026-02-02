import '@testing-library/jest-dom';
import { beforeAll, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useParams: () => ({}),
  usePathname: () => '/',
}));

// Setup
beforeAll(() => {
  process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001/api';
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});
