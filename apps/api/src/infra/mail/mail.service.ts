import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

interface SendParams {
  to: string;
  subject: string;
  html: string;
}

interface BookingEmailParams {
  to: string;
  customerName: string;
  businessName: string;
  serviceName: string;
  startAt: Date;
  timezone: string;
}

interface BookingConfirmationParams extends BookingEmailParams {
  cancellationToken: string;
}

interface BookingReminderParams extends BookingEmailParams {
  hoursBefore: 24 | 2;
}

interface BookingRescheduledParams extends Omit<BookingEmailParams, 'startAt'> {
  oldStartAt: Date;
  newStartAt: Date;
}

interface BookingRescheduledToProfessionalParams {
  to: string;
  professionalName: string;
  customerName: string;
  serviceName: string;
  oldStartAt: Date;
  newStartAt: Date;
  timezone: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly fromAddress = 'Agendya <reservas@agendya.app>';

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('resendApiKey');
    this.resend = apiKey ? new Resend(apiKey) : null;
  }

  async sendBookingConfirmation(
    params: BookingConfirmationParams,
  ): Promise<void> {
    const formattedDate = this.formatDate(params.startAt, params.timezone);
    await this.send({
      to: params.to,
      subject: `Reserva confirmada con ${params.businessName}`,
      html: `<p>Hola ${params.customerName},</p><p>Tu cita para <strong>${params.serviceName}</strong> con ${params.businessName} quedó confirmada para el ${formattedDate}.</p><p>Si necesitas cancelarla, puedes hacerlo aquí: ${this.cancelUrl(params.cancellationToken)}</p>`,
    });
  }

  async sendBookingCancelled(params: BookingEmailParams): Promise<void> {
    const formattedDate = this.formatDate(params.startAt, params.timezone);
    await this.send({
      to: params.to,
      subject: `Reserva cancelada con ${params.businessName}`,
      html: `<p>Hola ${params.customerName},</p><p>Tu cita para <strong>${params.serviceName}</strong> con ${params.businessName} del ${formattedDate} fue cancelada.</p>`,
    });
  }

  async sendBookingReminder(params: BookingReminderParams): Promise<void> {
    const formattedDate = this.formatDate(params.startAt, params.timezone);
    await this.send({
      to: params.to,
      subject: `Recordatorio: tu cita con ${params.businessName}`,
      html: `<p>Hola ${params.customerName},</p><p>Te recordamos tu cita para <strong>${params.serviceName}</strong> con ${params.businessName} el ${formattedDate} (en aproximadamente ${params.hoursBefore} horas).</p>`,
    });
  }

  async sendBookingRescheduled(
    params: BookingRescheduledParams,
  ): Promise<void> {
    const oldFormattedDate = this.formatDate(
      params.oldStartAt,
      params.timezone,
    );
    const newFormattedDate = this.formatDate(
      params.newStartAt,
      params.timezone,
    );
    await this.send({
      to: params.to,
      subject: `Cita modificada con ${params.businessName}`,
      html: `<p>Hola ${params.customerName},</p><p>Tu cita para <strong>${params.serviceName}</strong> con ${params.businessName} fue modificada.</p><p><strong>Fecha anterior:</strong> ${oldFormattedDate}</p><p><strong>Nueva fecha:</strong> ${newFormattedDate}</p>`,
    });
  }

  async sendBookingRescheduledToProfessional(
    params: BookingRescheduledToProfessionalParams,
  ): Promise<void> {
    const oldFormattedDate = this.formatDate(
      params.oldStartAt,
      params.timezone,
    );
    const newFormattedDate = this.formatDate(
      params.newStartAt,
      params.timezone,
    );
    await this.send({
      to: params.to,
      subject: `Modificación de reserva - ${params.customerName}`,
      html: `<p>Hola ${params.professionalName},</p><p>El cliente <strong>${params.customerName}</strong> modificó su cita para <strong>${params.serviceName}</strong>.</p><p><strong>Fecha anterior:</strong> ${oldFormattedDate}</p><p><strong>Nueva fecha:</strong> ${newFormattedDate}</p>`,
    });
  }

  private cancelUrl(token: string): string {
    const baseUrl = this.configService.get<string>('webUrl');
    return `${baseUrl}/bookings/${token}`;
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
      await this.resend.emails.send({
        from: this.fromAddress,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });
    } catch (error) {
      this.logger.error(
        `No se pudo enviar el email a ${params.to}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
