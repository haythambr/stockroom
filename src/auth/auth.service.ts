import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto, TokensDto } from './dto/auth.dto';

const REFRESH_TTL_DAYS = 7;

export type PublicUser = Pick<
  User,
  'id' | 'email' | 'name' | 'role' | 'createdAt'
>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: PublicUser } & TokensDto> {
    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email: dto.email,
        passwordHash: await bcrypt.hash(dto.password, 10),
        role: Role.CUSTOMER,
      },
    });

    return {
      user: this.toPublic(user),
      ...(await this.issueTokens(user, randomUUID())),
    };
  }

  async login(dto: LoginDto): Promise<{ user: PublicUser } & TokensDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Same message for "no such email" and "wrong password", so emails can't be probed.
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Email or password is incorrect.');
    }

    return {
      user: this.toPublic(user),
      ...(await this.issueTokens(user, randomUUID())),
    };
  }

  /**
   * Swap a refresh token for a new pair. Each refresh token works once: using one revokes it.
   * If a revoked token is presented again, it was copied, so the whole login (family) is shut down.
   */
  async refresh(refreshToken: string): Promise<TokensDto> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(refreshToken) },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException('Unknown refresh token. Sign in again.');
    }

    if (stored.revokedAt) {
      await this.revokeFamily(stored.family);
      throw new UnauthorizedException(
        'This refresh token was already used, so every session from that sign-in has been closed. Sign in again.',
      );
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired. Sign in again.');
    }

    // Only one request can claim the token, even if two arrive at once.
    const claimed = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (claimed.count === 0) {
      await this.revokeFamily(stored.family);
      throw new UnauthorizedException(
        'This refresh token was already used. Sign in again.',
      );
    }

    return this.issueTokens(stored.user, stored.family);
  }

  async logout(refreshToken: string): Promise<void> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(refreshToken) },
    });

    if (stored) {
      await this.revokeFamily(stored.family);
    }
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    return this.toPublic(user);
  }

  private async issueTokens(user: User, family: string): Promise<TokensDto> {
    const expiresIn = this.config.get<number>('JWT_ACCESS_TTL_SECONDS', 900);
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn },
    );
    const refreshToken = randomBytes(48).toString('base64url');

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hash(refreshToken),
        family,
        expiresAt: new Date(
          Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
        ),
      },
    });

    return { accessToken, refreshToken, expiresIn };
  }

  private revokeFamily(family: string) {
    return this.prisma.refreshToken.updateMany({
      where: { family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Only a hash is stored, so a database leak doesn't hand out working tokens. */
  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private toPublic(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
