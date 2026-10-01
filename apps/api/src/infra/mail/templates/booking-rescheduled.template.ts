import { escapeHtml } from '../html.util';

export interface BookingRescheduledParams {
  customerName: string;
  businessName: string;
  serviceName: string;
  oldFormattedDate: string;
  newFormattedDate: string;
  manageUrl: string;
}

export function bookingRescheduledTemplate(params: BookingRescheduledParams): {
  subject: string;
  html: string;
  text: string;
} {
  const customerName = escapeHtml(params.customerName);
  const businessName = escapeHtml(params.businessName);
  const serviceName = escapeHtml(params.serviceName);

  const subject = `Cita modificada con ${params.businessName}`;

  const html = `<p>Hola ${customerName},</p>
<p>Tu cita para <strong>${serviceName}</strong> con ${businessName} fue modificada.</p>
<p><strong>Fecha anterior:</strong> ${params.oldFormattedDate}</p>
<p><strong>Nueva fecha:</strong> ${params.newFormattedDate}</p>
<p>Puedes gestionar tu cita aquí: <a href="${params.manageUrl}">${params.manageUrl}</a></p>`;

  const text = `Hola ${params.customerName},

Tu cita para ${params.serviceName} con ${params.businessName} fue modificada.

Fecha anterior: ${params.oldFormattedDate}
Nueva fecha: ${params.newFormattedDate}

Puedes gestionar tu cita aquí: ${params.manageUrl}`;

  return { subject, html, text };
}
