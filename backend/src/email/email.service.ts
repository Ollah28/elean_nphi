import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
    private transporter: nodemailer.Transporter;

    constructor(private config: ConfigService) {
        // Initialize Nodemailer with Gmail SMTP settings
        const smtpHost = this.config.get<string>('SMTP_HOST') || 'smtp.gmail.com'; // Default to gmail if missing
        const smtpPort = this.config.get<number>('SMTP_PORT', 587); // Default to 587
        const smtpUser = this.config.get<string>('SMTP_USER');
        const smtpPass = this.config.get<string>('SMTP_PASS');

        console.log(`📧 Email Service Initialized with Host: ${smtpHost}:${smtpPort}`);
        console.log(`📧 User: ${smtpUser ? '***' : 'MISSING'}`);

        if (!smtpUser || !smtpPass) {
            console.warn('⚠️  SMTP_USER or SMTP_PASS is missing in .env. Emails will NOT send.');
        }

        this.transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465, // true for 465, false for 587
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
        });
    }

    async sendVerificationEmail(email: string, token: string) {
        const appUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173');
        const verificationLink = `${appUrl}/verify-email?token=${token}`;
        const from = this.config.get<string>('SMTP_FROM', 'no-reply@knphi.org');

        // Always log the link for local development/testing
        console.log('\n================ EMAIL VERIFICATION LINK ================\n');
        console.log(`To Verify Email: ${email}`);
        console.log(`Click or Copy Link: ${verificationLink}`);
        console.log('\n=========================================================\n');

        try {
            const info = await this.transporter.sendMail({
                from: from,
                to: email,
                subject: 'Verify your email address - NPHI eLearning',
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h1 style="color: #2563EB;">Welcome to NPHI eLearning!</h1>
            <p>Thank you for registering. Please confirm your email address to activate your account.</p>
            <p style="margin: 30px 0;">
              <a href="${verificationLink}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email Address</a>
            </p>
            <p style="color: #666;">Or copy and paste this link into your browser:</p>
            <p style="font-size: 12px; color: #888;">${verificationLink}</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 12px; color: #999;">If you did not create an account, please ignore this message.</p>
          </div>
        `,
            });
            console.log(`Verification email sent to ${email}. MessageId: ${info.messageId}`);
            return info;
        } catch (error) {
            console.error('Failed to send email via SMTP:', error);
            if (this.config.get('NODE_ENV') === 'production') {
                throw error;
            }
            // Don't throw error in dev so user can still copy link from console
            return { id: 'mock-id' };
        }
    }

    async sendPasswordResetEmail(email: string, token: string) {
        const appUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173');
        const resetLink = `${appUrl}/reset-password?token=${token}`;
        const from = this.config.get<string>('SMTP_FROM', 'no-reply@knphi.org');

        // Always log the link for local development/testing
        console.log('\n================ PASSWORD RESET LINK ================\n');
        console.log(`To Reset Password for: ${email}`);
        console.log(`Click or Copy Link: ${resetLink}`);
        console.log('\n=====================================================\n');

        try {
            await this.transporter.sendMail({
                from: from,
                to: email,
                subject: 'Reset your password - NPHI eLearning',
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h1 style="color: #2563EB;">Password Reset Request</h1>
            <p>We received a request to reset your password. Click the button below to proceed:</p>
            <p style="margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
            </p>
            <p style="color: #666;">Or copy and paste this link:</p>
            <p style="font-size: 12px; color: #888;">${resetLink}</p>
            <p>This link will expire in 30 minutes.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 12px; color: #999;">If you did not request this, please ignore this email.</p>
          </div>
        `,
            });
            console.log(`Password reset email sent to ${email}`);
        } catch (error) {
            console.error("Failed to send password reset email:", error);
            if (this.config.get('NODE_ENV') === 'production') {
                throw error;
            }
        }
    }
}
