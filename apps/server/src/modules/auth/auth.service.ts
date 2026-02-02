import bcrypt from 'bcrypt';
import { prisma } from '../../core/database';
import { UserRegistration, UserLogin, UserProfile, AuthResponse } from '@chapter/types';

const SALT_ROUNDS = 10;

export class AuthService {
  async register(data: UserRegistration, jwtSign: (payload: any) => string): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
      },
    });

    // Generate token
    const token = jwtSign({
      userId: user.id,
      email: user.email,
    });

    return {
      token,
      user: this.toUserProfile(user),
    };
  }

  async login(data: UserLogin, jwtSign: (payload: any) => string): Promise<AuthResponse> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(data.password, user.password);

    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate token
    const token = jwtSign({
      userId: user.id,
      email: user.email,
    });

    return {
      token,
      user: this.toUserProfile(user),
    };
  }

  async getUserById(userId: string): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return null;
    }

    return this.toUserProfile(user);
  }

  private toUserProfile(user: any): UserProfile {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  }
}

export const authService = new AuthService();
