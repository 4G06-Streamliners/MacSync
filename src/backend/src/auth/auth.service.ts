import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomInt } from 'crypto';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import jwt from 'jsonwebtoken';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { verificationTokens } from '../db/schema';
import type { User } from '../db/schema';
import { UsersService } from '../users/users.service';
import type { JwtPayload, OnboardingJwtPayload } from './auth.types';

const EMAIL_DOMAIN = 'mcmaster.ca';
const DEFAULT_CODE_EXPIRY_MIN = 10;
const DEFAULT_JWT_EXPIRES_IN = '60m';

@Injectable()
export class AuthService {
  private readonly transporter: Transporter | null;

  constructor(
    private readonly dbService: DatabaseService,
    private readonly usersService: UsersService,
  ) {
    this.transporter = this.createTransporter();
  }

  private get jwtSecret() {
    return process.env.JWT_SECRET || 'dev-secret';
  }

  private get codeHashSecret() {
    return process.env.VERIFICATION_CODE_SECRET || this.jwtSecret;
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private assertMcMasterEmail(email: string) {
    if (!email.endsWith(`@${EMAIL_DOMAIN}`)) {
      throw new BadRequestException(
        `Only @${EMAIL_DOMAIN} email addresses are allowed.`,
      );
    }
  }

  private generateCode() {
    return randomInt(0, 1000000).toString().padStart(6, '0');
  }

  private hashCode(code: string) {
    return createHash('sha256')
      .update(`${code}.${this.codeHashSecret}`)
      .digest('hex');
  }

  private createTransporter(): Transporter | null {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !port) {
      return null;
    }

    return nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  private async sendVerificationEmail(email: string, code: string) {
    if (!this.transporter) {
      // Dev fallback when SMTP is not configured.
      console.log(`[Auth] Verification code for ${email}: ${code}`);
      return;
    }

    const from = process.env.EMAIL_FROM || `no-reply@${EMAIL_DOMAIN}`;
    await this.transporter.sendMail({
      to: email,
      from,
      subject: 'Your McMaster verification code',
      text: `Your verification code is ${code}. It expires in ${this.getCodeExpiryMinutes()} minutes.`,
    });
  }

  private getCodeExpiryMinutes() {
    const parsed = Number(process.env.VERIFICATION_CODE_EXPIRY_MIN);
    return Number.isFinite(parsed) ? parsed : DEFAULT_CODE_EXPIRY_MIN;
  }

  private getJwtExpiry() {
    return process.env.JWT_EXPIRES_IN || DEFAULT_JWT_EXPIRES_IN;
  }

  private isProfileComplete(user: User) {
    return Boolean(
      user.name?.trim() &&
        user.phoneNumber?.trim() &&
        user.program?.trim(),
    );
  }

  private issueJwt(payload: JwtPayload | OnboardingJwtPayload) {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.getJwtExpiry(),
    });
  }

  async requestVerificationCode(rawEmail: string) {
    // M8: login(credentials) -> begin passwordless verification sequence.
    if (!rawEmail) {
      throw new BadRequestException('Email is required.');
    }
    const email = this.normalizeEmail(rawEmail);
    this.assertMcMasterEmail(email);

    const code = this.generateCode();
    const codeHash = this.hashCode(code);
    const expiresAt = new Date(
      Date.now() + this.getCodeExpiryMinutes() * 60 * 1000,
    );

    await this.dbService.db.insert(verificationTokens).values({
      email,
      codeHash,
      expiresAt,
    });

    await this.sendVerificationEmail(email, code);

    return { sent: true, expiresAt };
  }

  async verifyCode(rawEmail: string, code: string) {
    // M8: login(credentials) -> return AuthToken after verification succeeds.
    if (!rawEmail || !code) {
      throw new BadRequestException('Email and code are required.');
    }
    const email = this.normalizeEmail(rawEmail);
    this.assertMcMasterEmail(email);

    const records = await this.dbService.db
      .select()
      .from(verificationTokens)
      .where(
        and(
          eq(verificationTokens.email, email),
          isNull(verificationTokens.usedAt),
          gt(verificationTokens.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(verificationTokens.createdAt))
      .limit(1);

    const record = records[0];
    if (!record) {
      throw new UnauthorizedException('Verification code expired or invalid.');
    }

    const codeHash = this.hashCode(code.trim());
    if (record.codeHash !== codeHash) {
      throw new UnauthorizedException('Invalid verification code.');
    }

    await this.dbService.db
      .update(verificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(verificationTokens.id, record.id));

    const user = await this.usersService.findByEmailWithRoles(email);

    if (!user || !this.isProfileComplete(user)) {
      const token = this.issueJwt({ email, onboarding: true });
      return {
        token,
        needsRegistration: true,
        user: user ?? null,
      };
    }

    const token = this.issueJwt({ sub: user.id, email: user.email });
    return {
      token,
      needsRegistration: false,
      user,
    };
  }

  async registerUser(
    email: string,
    data: { name: string; phone: string; program: string },
  ) {
    // One-time onboarding for newly verified users.
    const name = data.name.trim();
    const program = data.program.trim();
    const phone = data.phone.trim();

    if (!/^[A-Za-z-]+$/.test(name)) {
      throw new BadRequestException(
        'Name must contain only letters and hyphens.',
      );
    }

    const normalizedPhone = phone.replace(/[\s()-]/g, '');
    if (!/^\+?\d{10,15}$/.test(normalizedPhone)) {
      throw new BadRequestException(
        'Phone number must be 10 digits or include a valid country code.',
      );
    }

    if (!program) {
      throw new BadRequestException('Program is required.');
    }

    const existing = await this.usersService.findByEmail(email);
    if (existing && this.isProfileComplete(existing)) {
      throw new BadRequestException('Profile is already complete.');
    }

    let user: User;
    if (existing) {
      user = await this.usersService.update(existing.id, {
        name,
        phoneNumber: normalizedPhone,
        program,
      });
    } else {
      user = await this.usersService.create({
        email,
        name,
        phoneNumber: normalizedPhone,
        program,
      });
    }

    const userWithRoles = await this.usersService.findOneWithRoles(user.id);
    const token = this.issueJwt({ sub: user.id, email: user.email });

    return {
      token,
      user: userWithRoles ?? user,
    };
  }

  async getUserInfo(userId: number) {
    // M8: getUserInfo(token) -> resolve authenticated user profile.
    const user = await this.usersService.findOneWithRoles(userId);
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }
    return user;
  }
}
