import { escapeHtml } from '../html.util';

export interface UsageAlertBookingsReachedParams {
  professionalName: string;
  limit: number;
  planName: string;
}

export function usageAlertBookingsReachedTemplate(
  params: UsageAlertBookingsReachedParams,
): { subject: string; html: string; text: string } {
  const professionalName = escapeHtml(params.professionalName);
  const planName = escapeHtml(params.planName);

  const subject = `🚫 Alcanzaste el límite de reservas de tu plan ${params.planName}`;

  const html = `<p>Hola ${professionalName},</p>
<p>Has alcanzado el límite mensual de <strong>${params.limit} reservas</strong> de tu plan <strong>${planName}</strong>.</p>
<p>No podrás recibir nuevas reservas hasta el próximo mes, a menos que actualices tu plan.</p>
<p><a href="https://agendya.co/dashboard/plan">Actualizar plan ahora</a></p>`;

  const text = `Hola ${params.professionalName},

Has alcanzado el límite mensual de ${params.limit} reservas de tu plan ${params.planName}.

No podrás recibir nuevas reservas hasta el próximo mes, a menos que actualices tu plan.

Actualizar plan ahora: https://agendya.co/dashboard/plan`;

  return { subject, html, text };
}
