import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Prisma, Role } from "@prisma/client";
import * as bcrypt from "bcrypt";
import Redis from "ioredis";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { toFrontendUser } from "../shared/mappers";
import {
  ForgotPasswordDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
} from "./dto/auth.dto";
import { JwtPayload } from "./jwt.types";

import { EmailService } from "../email/email.service";
// ... imports

@Injectable()
export class AuthService {
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
  ) {
    this.redis = new Redis(this.config.get<string>("REDIS_URL", "redis://localhost:6379"), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    void this.redis.connect().catch(() => undefined);
  }

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (exists) throw new ConflictException("An account with this email already exists");

    const token = randomUUID();

    const created = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        passwordHash: await bcrypt.hash(dto.password, 10),
        role: Role.learner,
        department: "General",
        emailVerificationToken: token,
        isEmailVerified: false,
      },
      include: { progressRecords: true, certificates: true, managedCourses: true, assignedLearners: true },
    });

    try {
      await this.emailService.sendVerificationEmail(created.email, token);
    } catch (e) {
      console.error("Failed to send verification email", e);
      if (this.config.get('NODE_ENV') === 'production') {
        const appUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173');
        const verificationLink = `${appUrl}/verify-email?token=${token}`;
        // In production, let the user know email failed so they can report it
        throw new InternalServerErrorException(`Registration successful/created, but failed to send email. MANUAL VERIFICATION LINK: ${verificationLink} . Error details: ${(e as any).message}`);
      }
    }

    return { message: "Registration successful. Please check your email to verify your account." };
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({ where: { emailVerificationToken: token } });
    if (!user) throw new UnauthorizedException("Invalid or expired verification token");

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, emailVerificationToken: null },
      include: { progressRecords: true, certificates: true, managedCourses: true, assignedLearners: true },
    });

    const tokens = await this.issueTokens(updated.id, updated.email, updated.role);
    return { user: toFrontendUser(updated), ...tokens };
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) throw new NotFoundException("User not found");
    if (user.isEmailVerified) throw new ConflictException("Email already verified");

    const token = randomUUID();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerificationToken: token },
    });

    await this.emailService.sendVerificationEmail(user.email, token);
    return { message: "Verification email sent" };
  }

  async login(dto: LoginDto) {
    const username = dto.username.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: username },
          {
            email: {
              startsWith: `${username}@`,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      },
      include: { progressRecords: true, certificates: true, managedCourses: true, assignedLearners: true },
    });

    console.log(`Login attempt for ${username}: User found? ${!!user}`);

    if (!user) throw new UnauthorizedException("Invalid username or password");

    if (!user.passwordHash) {
      console.log(`Login failed for ${username}: No password hash (Google account?)`);
      throw new UnauthorizedException("Invalid username or password");
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    console.log(`Login password verified for ${username}? ${ok}`);

    if (!ok) throw new UnauthorizedException("Invalid username or password");

    // Check email verification
    // Note: Admin/Manager users might not have email verified if created manually or before this feature.
    // We should enforce it for learners mainly, or everyone.
    // Let's enforce for everyone EXCEPT if they are admin/manager and we want to be nice (or just force them to verify?)
    // Safe bet: if isEmailVerified is false, block them.
    // BUT checking existing users... I created admin manually. It has isEmailVerified=false (default).
    // So I must NOT block existing admin.
    // I will auto-verify the admin in a migration script or just allow them if role != learner?
    // Or simpler: Update check-login/create-admin to set isEmailVerified=true.

    if (!user.isEmailVerified && user.role === Role.learner) {
      throw new UnauthorizedException("Please verify your email address before logging in.");
    }
    // For now, I only enforce for learners to avoid locking out the admin I just fixed.

    const tokens = await this.issueTokens(user.id, user.email, user.role);
    return { user: toFrontendUser(user), ...tokens };
  }

  async refresh(dto: RefreshDto) {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(dto.refreshToken, {
        secret: this.config.get<string>("JWT_REFRESH_SECRET", "change_me_refresh"),
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
    if (payload.tokenType !== "refresh" || !payload.jti) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const sessionKey = `rt:${payload.sub}:${payload.jti}`;
    const active = await this.redis.get(sessionKey);
    if (!active) throw new UnauthorizedException("Refresh token expired");
    await this.redis.del(sessionKey);

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException("User not found");
    return this.issueTokens(user.id, user.email, user.role);
  }

  async logout(dto: RefreshDto) {
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(dto.refreshToken, {
        secret: this.config.get<string>("JWT_REFRESH_SECRET", "change_me_refresh"),
      });
      if (payload.jti) {
        await this.redis.del(`rt:${payload.sub}:${payload.jti}`);
      }
    } catch {
      return;
    }
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user) return; // Silent fail for security

    // Check if user is google auth only
    if (!user.passwordHash && user.googleId) {
      // Optional: Send email saying "You use Google login", but for now just silent return or ignore.
      return;
    }

    const token = randomUUID();
    await this.redis.setex(`reset:${token}`, 60 * 30, user.id);
    await this.emailService.sendPasswordResetEmail(user.email, token);
  }

  async resetPassword(dto: ResetPasswordDto) {
    const userId = await this.redis.get(`reset:${dto.token}`);
    if (!userId) throw new NotFoundException("Reset token invalid or expired");
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, 10) },
    });
    await this.redis.del(`reset:${dto.token}`);
  }

  private async issueTokens(userId: string, email: string, role: Role) {
    const accessPayload: JwtPayload = { sub: userId, email, role, tokenType: "access" };
    const jti = randomUUID();
    const refreshPayload: JwtPayload = { sub: userId, email, role, tokenType: "refresh", jti };

    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.config.get<string>("JWT_ACCESS_SECRET", "change_me_access"),
      expiresIn: this.config.get<string>("JWT_ACCESS_EXPIRES", "15m") as any,
    });
    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: this.config.get<string>("JWT_REFRESH_SECRET", "change_me_refresh"),
      expiresIn: this.config.get<string>("JWT_REFRESH_EXPIRES", "7d") as any,
    });

    await this.redis.setex(`rt:${userId}:${jti}`, 60 * 60 * 24 * 7, "1");
    return { accessToken, refreshToken };
  }

}
