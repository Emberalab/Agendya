import { escapeHtml } from '../html.util';

export interface BookingReminderParams {
  customerName: string;
  businessName: string;
  serviceName: string;
  formattedDate: string;
  hoursBefore: 24 | 2;
}

export function bookingReminderTemplate(params: BookingReminderParams): {
  subject: string;
  html: string;
  text: string;
} {
  const customerName = escapeHtml(params.customerName);
  const businessName = escapeHtml(params.businessName);
  const serviceName = escapeHtml(params.serviceName);

  const subject = `Recordatorio: tu cita con ${params.businessName}`;

  const html = `<p>Hola ${customerName},</p>
<p>Te recordamos tu cita para <strong>${serviceName}</strong> con ${businessName} el ${params.formattedDate} (en aproximadamente ${params.hoursBefore} horas).</p>`;

  const text = `Hola ${params.customerName},

Te recordamos tu cita para ${params.serviceName} con ${params.businessName} el ${params.formattedDate} (en aproximadamente ${params.hoursBefore} horas).`;

  return { subject, html, text };
}
