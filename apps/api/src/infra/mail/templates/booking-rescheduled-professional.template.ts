import { escapeHtml } from '../html.util';

export interface BookingRescheduledToProfessionalParams {
  professionalName: string;
  customerName: string;
  serviceName: string;
  oldFormattedDate: string;
  newFormattedDate: string;
}

export function bookingRescheduledToProfessionalTemplate(
  params: BookingRescheduledToProfessionalParams,
): { subject: string; html: string; text: string } {
  const professionalName = escapeHtml(params.professionalName);
  const customerName = escapeHtml(params.customerName);
  const serviceName = escapeHtml(params.serviceName);

  const subject = `Modificación de reserva - ${params.customerName}`;

  const html = `<p>Hola ${professionalName},</p>
<p>El cliente <strong>${customerName}</strong> modificó su cita para <strong>${serviceName}</strong>.</p>
<p><strong>Fecha anterior:</strong> ${params.oldFormattedDate}</p>
<p><strong>Nueva fecha:</strong> ${params.newFormattedDate}</p>`;

  const text = `Hola ${params.professionalName},

El cliente ${params.customerName} modificó su cita para ${params.serviceName}.

Fecha anterior: ${params.oldFormattedDate}
Nueva fecha: ${params.newFormattedDate}`;

  return { subject, html, text };
}
