import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
    private resend: Resend;

    constructor(private config: ConfigService) {
        const apiKey = this.config.get<string>('RESEND_API_KEY');
        console.log(`EmailService initializing. API Key present: ${!!apiKey}`);

        if (!apiKey) {
            console.warn('RESEND_API_KEY is not set. Email sending will fail.');
            this.resend = new Resend('re_123456789'); // Dummy key to prevent crash
        } else {
            this.resend = new Resend(apiKey);
        }
    }

    async sendVerificationEmail(email: string, token: string) {
        const appUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173'); // Default to local dev
        const verificationLink = `${appUrl}/verify-email?token=${token}`;

        try {
            const data = await this.resend.emails.send({
                from: 'NPHI eLearning <onboarding@resend.dev>', // Use resend.dev for testing if they don't have a domain
                to: email,
                subject: 'Verify your email address',
                html: `
          <h1>Welcome to NPHI eLearning!</h1>
          <p>Please click the link below to verify your email address and activate your account:</p>
          <p><a href="${verificationLink}">${verificationLink}</a></p>
          <p>If you did not sign up for this account, please ignore this email.</p>
        `,
            });
            console.log('Email sent successfully:', data);
            return data;
        } catch (error) {
            console.error('Failed to send email:', error);
            throw error; // Or handle gracefully
        }
    }
}
