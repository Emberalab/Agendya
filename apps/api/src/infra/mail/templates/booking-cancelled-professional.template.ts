import { escapeHtml } from '../html.util';

export interface BookingCancelledToProfessionalParams {
  professionalName: string;
  customerName: string;
  serviceName: string;
  formattedDate: string;
}

export function bookingCancelledToProfessionalTemplate(
  params: BookingCancelledToProfessionalParams,
): { subject: string; html: string; text: string } {
  const professionalName = escapeHtml(params.professionalName);
  const customerName = escapeHtml(params.customerName);
  const serviceName = escapeHtml(params.serviceName);

  const subject = `Cita cancelada - ${params.customerName}`;

  const html = `<p>Hola ${professionalName},</p>
<p>El cliente <strong>${customerName}</strong> canceló su cita para <strong>${serviceName}</strong>.</p>
<p><strong>Fecha:</strong> ${params.formattedDate}</p>
<p>Ese horario quedó libre de nuevo en tu página de reservas.</p>`;

  const text = `Hola ${params.professionalName},

El cliente ${params.customerName} canceló su cita para ${params.serviceName}.

Fecha: ${params.formattedDate}

Ese horario quedó libre de nuevo en tu página de reservas.`;

  return { subject, html, text };
}
