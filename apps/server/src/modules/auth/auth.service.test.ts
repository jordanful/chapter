import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './auth.service';

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
};

vi.mock('../../core/database', () => ({
  prisma: mockPrisma,
}));

describe('AuthService', () => {
  let authService: AuthService;
  const mockJwtSign = vi.fn((payload) => 'mock-jwt-token');

  beforeEach(() => {
    authService = new AuthService();
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const mockUser = {
        id: 'user-1',
        email: userData.email,
        name: userData.name,
        password: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const result = await authService.register(userData, mockJwtSign);

      expect(result).toHaveProperty('token', 'mock-jwt-token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(userData.email);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: userData.email },
      });
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it('should throw error if user already exists', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'password123',
      };

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: userData.email,
      });

      await expect(authService.register(userData, mockJwtSign)).rejects.toThrow(
        'User already exists'
      );

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should hash the password before storing', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'plain-password',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: userData.email,
        password: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await authService.register(userData, mockJwtSign);

      const createCall = mockPrisma.user.create.mock.calls[0][0];
      // Password should not be stored in plain text
      expect(createCall.data.password).not.toBe(userData.password);
      // Password should be hashed (bcrypt hashes are 60 chars)
      expect(createCall.data.password.length).toBeGreaterThan(20);
    });
  });

  describe('login', () => {
    it('should login user with correct credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      // Create a real bcrypt hash for testing
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash(loginData.password, 10);

      const mockUser = {
        id: 'user-1',
        email: loginData.email,
        password: hashedPassword,
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await authService.login(loginData, mockJwtSign);

      expect(result).toHaveProperty('token', 'mock-jwt-token');
      expect(result.user.email).toBe(loginData.email);
      expect(mockJwtSign).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email,
      });
    });

    it('should throw error if user not found', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.login(loginData, mockJwtSign)).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('should throw error if password is incorrect', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash('correct-password', 10);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: loginData.email,
        password: hashedPassword,
      });

      await expect(authService.login(loginData, mockJwtSign)).rejects.toThrow(
        'Invalid credentials'
      );
    });
  });

  describe('getUserById', () => {
    it('should return user profile by ID', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await authService.getUserById('user-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('user-1');
      expect(result?.email).toBe('test@example.com');
      // Password should not be in the returned profile
      expect(result).not.toHaveProperty('password');
    });

    it('should return null if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await authService.getUserById('nonexistent');

      expect(result).toBeNull();
    });
  });
});
