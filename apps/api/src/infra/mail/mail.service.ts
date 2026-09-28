import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  bookingConfirmationTemplate,
  type BookingConfirmationParams,
} from './templates/booking-confirmation.template';
import {
  bookingCancelledTemplate,
  type BookingCancelledParams,
} from './templates/booking-cancelled.template';
import {
  bookingCancelledToProfessionalTemplate,
  type BookingCancelledToProfessionalParams,
} from './templates/booking-cancelled-professional.template';
import {
  bookingReminderTemplate,
  type BookingReminderParams,
} from './templates/booking-reminder.template';
import {
  bookingRescheduledTemplate,
  type BookingRescheduledParams,
} from './templates/booking-rescheduled.template';
import {
  bookingRescheduledToProfessionalTemplate,
  type BookingRescheduledToProfessionalParams,
} from './templates/booking-rescheduled-professional.template';
import {
  welcomePendingTemplate,
  type WelcomePendingParams,
} from './templates/welcome-pending.template';
import {
  welcomeApprovedTemplate,
  type WelcomeApprovedParams,
} from './templates/welcome-approved.template';
import {
  accountActivatedTemplate,
  type AccountActivatedParams,
} from './templates/account-activated.template';
import {
  forgotPasswordTemplate,
  type ForgotPasswordParams,
} from './templates/forgot-password.template';
import {
  passwordChangedTemplate,
  type PasswordChangedParams,
} from './templates/password-changed.template';
import {
  usageAlertBookingsNearTemplate,
  type UsageAlertBookingsNearParams,
} from './templates/usage-alert-bookings-near.template';
import {
  usageAlertBookingsReachedTemplate,
  type UsageAlertBookingsReachedParams,
} from './templates/usage-alert-bookings-reached.template';
import {
  usageAlertServicesNearTemplate,
  type UsageAlertServicesNearParams,
} from './templates/usage-alert-services-near.template';
import {
  usageAlertServicesReachedTemplate,
  type UsageAlertServicesReachedParams,
} from './templates/usage-alert-services-reached.template';
import {
  planUpdatedTemplate,
  type PlanUpdatedParams,
} from './templates/plan-updated.template';
import {
  paymentApprovedTemplate,
  type PaymentApprovedParams,
} from './templates/payment-approved.template';
import {
  paymentRejectedTemplate,
  type PaymentRejectedParams,
} from './templates/payment-rejected.template';
import {
  subscriptionCancelledTemplate,
  type SubscriptionCancelledParams,
} from './templates/subscription-cancelled.template';

interface SendParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

interface BookingEmailBaseParams {
  to: string;
  customerName: string;
  businessName: string;
  serviceName: string;
  startAt: Date;
  timezone: string;
}

interface BookingConfirmationEmailParams extends BookingEmailBaseParams {
  cancellationToken: string;
}

interface BookingReminderEmailParams extends BookingEmailBaseParams {
  hoursBefore: 24 | 2;
}

interface BookingRescheduledEmailParams extends Omit<
  BookingEmailBaseParams,
  'startAt'
> {
  oldStartAt: Date;
  newStartAt: Date;
  cancellationToken: string;
}

interface BookingRescheduledToProfessionalEmailParams {
  to: string;
  professionalName: string;
  customerName: string;
  serviceName: string;
  oldStartAt: Date;
  newStartAt: Date;
  timezone: string;
}

interface BookingCancelledToProfessionalEmailParams {
  to: string;
  professionalName: string;
  customerName: string;
  serviceName: string;
  startAt: Date;
  timezone: string;
}

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
      'Agendya <no-reply@agendya.co>';
    this.replyToAddress =
      this.configService.get<string>('mail.replyTo') ?? 'info@agendya.co';
  }

  async sendBookingConfirmation(
    params: BookingConfirmationEmailParams,
  ): Promise<void> {
    const formattedDate = this.formatDate(params.startAt, params.timezone);
    const cancelUrl = this.cancelUrl(params.cancellationToken);
    const templateParams: BookingConfirmationParams = {
      customerName: params.customerName,
      businessName: params.businessName,
      serviceName: params.serviceName,
      formattedDate,
      cancelUrl,
    };
    const { subject, html, text } = bookingConfirmationTemplate(templateParams);
    await this.send({ to: params.to, subject, html, text });
  }

  async sendBookingCancelled(params: BookingEmailBaseParams): Promise<void> {
    const formattedDate = this.formatDate(params.startAt, params.timezone);
    const templateParams: BookingCancelledParams = {
      customerName: params.customerName,
      businessName: params.businessName,
      serviceName: params.serviceName,
      formattedDate,
    };
    const { subject, html, text } = bookingCancelledTemplate(templateParams);
    await this.send({ to: params.to, subject, html, text });
  }

  async sendBookingCancelledToProfessional(
    params: BookingCancelledToProfessionalEmailParams,
  ): Promise<void> {
    const templateParams: BookingCancelledToProfessionalParams = {
      professionalName: params.professionalName,
      customerName: params.customerName,
      serviceName: params.serviceName,
      formattedDate: this.formatDate(params.startAt, params.timezone),
    };
    const { subject, html, text } =
      bookingCancelledToProfessionalTemplate(templateParams);
    await this.send({ to: params.to, subject, html, text });
  }

  async sendBookingReminder(params: BookingReminderEmailParams): Promise<void> {
    const formattedDate = this.formatDate(params.startAt, params.timezone);
    const templateParams: BookingReminderParams = {
      customerName: params.customerName,
      businessName: params.businessName,
      serviceName: params.serviceName,
      formattedDate,
      hoursBefore: params.hoursBefore,
    };
    const { subject, html, text } = bookingReminderTemplate(templateParams);
    await this.send({ to: params.to, subject, html, text });
  }

  async sendBookingRescheduled(
    params: BookingRescheduledEmailParams,
  ): Promise<void> {
    const oldFormattedDate = this.formatDate(
      params.oldStartAt,
      params.timezone,
    );
    const newFormattedDate = this.formatDate(
      params.newStartAt,
      params.timezone,
    );
    const manageUrl = this.cancelUrl(params.cancellationToken);
    const templateParams: BookingRescheduledParams = {
      customerName: params.customerName,
      businessName: params.businessName,
      serviceName: params.serviceName,
      oldFormattedDate,
      newFormattedDate,
      manageUrl,
    };
    const { subject, html, text } = bookingRescheduledTemplate(templateParams);
    await this.send({ to: params.to, subject, html, text });
  }

  async sendBookingRescheduledToProfessional(
    params: BookingRescheduledToProfessionalEmailParams,
  ): Promise<void> {
    const oldFormattedDate = this.formatDate(
      params.oldStartAt,
      params.timezone,
    );
    const newFormattedDate = this.formatDate(
      params.newStartAt,
      params.timezone,
    );
    const templateParams: BookingRescheduledToProfessionalParams = {
      professionalName: params.professionalName,
      customerName: params.customerName,
      serviceName: params.serviceName,
      oldFormattedDate,
      newFormattedDate,
    };
    const { subject, html, text } =
      bookingRescheduledToProfessionalTemplate(templateParams);
    await this.send({ to: params.to, subject, html, text });
  }

  async sendWelcomePending(to: string, businessName: string): Promise<void> {
    const templateParams: WelcomePendingParams = { businessName };
    const { subject, html, text } = welcomePendingTemplate(templateParams);
    await this.send({ to, subject, html, text });
  }

  async sendWelcomeApproved(to: string, businessName: string): Promise<void> {
    const loginUrl = `${this.webUrl()}/login`;
    const templateParams: WelcomeApprovedParams = { businessName, loginUrl };
    const { subject, html, text } = welcomeApprovedTemplate(templateParams);
    await this.send({ to, subject, html, text });
  }

  async sendAccountActivated(to: string, businessName: string): Promise<void> {
    const loginUrl = `${this.webUrl()}/login`;
    const templateParams: AccountActivatedParams = { businessName, loginUrl };
    const { subject, html, text } = accountActivatedTemplate(templateParams);
    await this.send({ to, subject, html, text });
  }

  async sendForgotPassword(to: string, token: string): Promise<void> {
    const resetUrl = `${this.webUrl()}/reset-password?token=${token}`;
    const templateParams: ForgotPasswordParams = { resetUrl };
    const { subject, html, text } = forgotPasswordTemplate(templateParams);
    await this.send({ to, subject, html, text });
  }

  async sendPasswordChanged(to: string): Promise<void> {
    const templateParams: PasswordChangedParams = {
      replyTo: this.replyToAddress,
    };
    const { subject, html, text } = passwordChangedTemplate(templateParams);
    await this.send({ to, subject, html, text });
  }

  async sendUsageAlertBookingsNear(
    to: string,
    professionalName: string,
    currentCount: number,
    limit: number,
    planName: string,
  ): Promise<void> {
    const templateParams: UsageAlertBookingsNearParams = {
      professionalName,
      currentCount,
      limit,
      planName,
    };
    const { subject, html, text } =
      usageAlertBookingsNearTemplate(templateParams);
    await this.send({ to, subject, html, text });
  }

  async sendUsageAlertBookingsReached(
    to: string,
    professionalName: string,
    limit: number,
    planName: string,
  ): Promise<void> {
    const templateParams: UsageAlertBookingsReachedParams = {
      professionalName,
      limit,
      planName,
    };
    const { subject, html, text } =
      usageAlertBookingsReachedTemplate(templateParams);
    await this.send({ to, subject, html, text });
  }

  async sendUsageAlertServicesNear(
    to: string,
    professionalName: string,
    currentCount: number,
    limit: number,
    planName: string,
  ): Promise<void> {
    const templateParams: UsageAlertServicesNearParams = {
      professionalName,
      currentCount,
      limit,
      planName,
    };
    const { subject, html, text } =
      usageAlertServicesNearTemplate(templateParams);
    await this.send({ to, subject, html, text });
  }

  async sendUsageAlertServicesReached(
    to: string,
    professionalName: string,
    limit: number,
    planName: string,
  ): Promise<void> {
    const templateParams: UsageAlertServicesReachedParams = {
      professionalName,
      limit,
      planName,
    };
    const { subject, html, text } =
      usageAlertServicesReachedTemplate(templateParams);
    await this.send({ to, subject, html, text });
  }

  async sendPlanUpdated(
    to: string,
    professionalName: string,
    oldPlan: string,
    newPlan: string,
    reason: 'expired' | 'downgrade' | 'upgrade',
  ): Promise<void> {
    const templateParams: PlanUpdatedParams = {
      professionalName,
      oldPlan,
      newPlan,
      reason,
    };
    const { subject, html, text } = planUpdatedTemplate(templateParams);
    await this.send({ to, subject, html, text });
  }

  async sendPaymentApproved(
    to: string,
    professionalName: string,
    plan: string,
    interval: string,
    amount: string,
    expiresAt: Date,
  ): Promise<void> {
    const formattedExpiresAt = new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'long',
    }).format(expiresAt);
    const templateParams: PaymentApprovedParams = {
      professionalName,
      plan,
      interval,
      amount,
      expiresAt: formattedExpiresAt,
    };
    const { subject, html, text } = paymentApprovedTemplate(templateParams);
    await this.send({ to, subject, html, text });
  }

  async sendPaymentRejected(
    to: string,
    professionalName: string,
    plan: string,
    interval: string,
    amount: string,
    reason?: string,
  ): Promise<void> {
    const templateParams: PaymentRejectedParams = {
      professionalName,
      plan,
      interval,
      amount,
      reason,
    };
    const { subject, html, text } = paymentRejectedTemplate(templateParams);
    await this.send({ to, subject, html, text });
  }

  async sendSubscriptionCancelled(
    to: string,
    professionalName: string,
    plan: string,
    expiresAt: Date,
  ): Promise<void> {
    const formattedExpiresAt = new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'long',
    }).format(expiresAt);
    const templateParams: SubscriptionCancelledParams = {
      professionalName,
      plan,
      expiresAt: formattedExpiresAt,
    };
    const { subject, html, text } =
      subscriptionCancelledTemplate(templateParams);
    await this.send({ to, subject, html, text });
  }

  private cancelUrl(token: string): string {
    const publicWebUrl = this.configService.get<string>('publicWebUrl');
    const webUrl = this.webUrl();
    const baseUrl = (publicWebUrl || webUrl).replace(/\/+$/, '');
    return `${baseUrl}/bookings/${token}`;
  }

  private webUrl(): string {
    return (
      this.configService.get<string>('webUrl') || 'http://localhost:5173'
    ).replace(/\/+$/, '');
  }

  private formatDate(date: Date, timeZone: string): string {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone,
    }).format(date);
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
      // Error de red o excepción inesperada
      this.logger.error(
        `No se pudo enviar el email a ${params.to}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
