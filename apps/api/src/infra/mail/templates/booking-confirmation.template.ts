import { escapeHtml } from '../html.util';

export interface BookingConfirmationParams {
  customerName: string;
  businessName: string;
  serviceName: string;
  formattedDate: string;
  cancelUrl: string;
}

export function bookingConfirmationTemplate(
  params: BookingConfirmationParams,
): { subject: string; html: string; text: string } {
  const customerName = escapeHtml(params.customerName);
  const businessName = escapeHtml(params.businessName);
  const serviceName = escapeHtml(params.serviceName);

  const subject = `Reserva confirmada con ${params.businessName}`;

  const html = `<p>Hola ${customerName},</p>
<p>Tu cita para <strong>${serviceName}</strong> con ${businessName} quedó confirmada para el ${params.formattedDate}.</p>
<p>Si necesitas cancelarla o modificarla, puedes hacerlo aquí: <a href="${params.cancelUrl}">${params.cancelUrl}</a></p>`;

  const text = `Hola ${params.customerName},

Tu cita para ${params.serviceName} con ${params.businessName} quedó confirmada para el ${params.formattedDate}.

Si necesitas cancelarla o modificarla, puedes hacerlo aquí: ${params.cancelUrl}`;

  return { subject, html, text };
}
