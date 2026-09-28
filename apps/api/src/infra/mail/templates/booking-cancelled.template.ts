import { escapeHtml } from '../html.util';

export interface BookingCancelledParams {
  customerName: string;
  businessName: string;
  serviceName: string;
  formattedDate: string;
}

export function bookingCancelledTemplate(params: BookingCancelledParams): {
  subject: string;
  html: string;
  text: string;
} {
  const customerName = escapeHtml(params.customerName);
  const businessName = escapeHtml(params.businessName);
  const serviceName = escapeHtml(params.serviceName);

  const subject = `Reserva cancelada con ${params.businessName}`;

  const html = `<p>Hola ${customerName},</p>
<p>Tu cita para <strong>${serviceName}</strong> con ${businessName} del ${params.formattedDate} fue cancelada.</p>`;

  const text = `Hola ${params.customerName},

Tu cita para ${params.serviceName} con ${params.businessName} del ${params.formattedDate} fue cancelada.`;

  return { subject, html, text };
}
