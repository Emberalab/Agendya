import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  staffPasswordChangedTemplate,
  staffPasswordResetTemplate,
} from './templates';

interface SendParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Backoffice transactional email (password recovery only, for now). A small
 * deliberate duplicate of apps/api's MailService send path rather than a
 * shared package — the two services deploy independently (see CLAUDE.md).
 * Failures are logged, never thrown: the HTTP response of
 * `forgot-password` must not reveal whether an email was actually sent.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly fromAddress: string;
  private readonly replyToAddress: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('resendApiKey');
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.fromAddress =
      this.configService.get<string>('mail.from') ??
      'Agendya Backoffice <no-reply@agendya.co>';
    this.replyToAddress =
      this.configService.get<string>('mail.replyTo') ?? 'info@agendya.co';
  }

  async sendPasswordReset(to: string, name: string, token: string) {
    const resetUrl = `${this.webUrl()}/backoffice/reset-password?token=${encodeURIComponent(token)}`;
    await this.send({ to, ...staffPasswordResetTemplate({ name, resetUrl }) });
  }

  async sendPasswordChanged(to: string, name: string) {
    await this.send({
      to,
      ...staffPasswordChangedTemplate({ name, replyTo: this.replyToAddress }),
    });
  }

  private webUrl(): string {
    return (
      this.configService.get<string>('backofficeWebUrl') ??
      'http://localhost:5174'
    );
  }

  private async send(params: SendParams): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[dev] Email a ${params.to}: ${params.subject}`);
      return;
    }
    try {
      const { error } = await this.resend.emails.send({
        from: this.fromAddress,
        replyTo: this.replyToAddress,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });
      if (error) {
        this.logger.error(
          `No se pudo enviar el email a ${params.to}: ${error.name} - ${error.message}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `No se pudo enviar el email a ${params.to}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
