import { escapeHtml } from '../html.util';

export interface UsageAlertServicesReachedParams {
  professionalName: string;
  limit: number;
  planName: string;
}

export function usageAlertServicesReachedTemplate(
  params: UsageAlertServicesReachedParams,
): { subject: string; html: string; text: string } {
  const professionalName = escapeHtml(params.professionalName);
  const planName = escapeHtml(params.planName);

  const subject = `🚫 Alcanzaste el límite de servicios de tu plan ${params.planName}`;

  const html = `<p>Hola ${professionalName},</p>
<p>Has alcanzado el límite de <strong>${params.limit} servicios</strong> de tu plan <strong>${planName}</strong>.</p>
<p>No podrás agregar más servicios a tu catálogo hasta que actualices tu plan.</p>
<p><a href="https://agendya.co/dashboard/plan">Actualizar plan ahora</a></p>`;

  const text = `Hola ${params.professionalName},

Has alcanzado el límite de ${params.limit} servicios de tu plan ${params.planName}.

No podrás agregar más servicios a tu catálogo hasta que actualices tu plan.

Actualizar plan ahora: https://agendya.co/dashboard/plan`;

  return { subject, html, text };
}
