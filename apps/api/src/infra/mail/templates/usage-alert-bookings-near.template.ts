import { escapeHtml } from '../html.util';

export interface UsageAlertBookingsNearParams {
  professionalName: string;
  currentCount: number;
  limit: number;
  planName: string;
}

export function usageAlertBookingsNearTemplate(
  params: UsageAlertBookingsNearParams,
): { subject: string; html: string; text: string } {
  const professionalName = escapeHtml(params.professionalName);
  const planName = escapeHtml(params.planName);

  const subject = `⚠️ Estás cerca del límite de reservas de tu plan ${params.planName}`;

  const html = `<p>Hola ${professionalName},</p>
<p>Tu cuenta está cerca del límite mensual de reservas de tu plan <strong>${planName}</strong>.</p>
<p>Has usado <strong>${params.currentCount} de ${params.limit} reservas</strong> este mes.</p>
<p>Si necesitas más reservas, considera actualizar tu plan para no perder oportunidades de negocio.</p>
<p><a href="https://agendya.co/dashboard/plan">Ver opciones de plan</a></p>`;

  const text = `Hola ${params.professionalName},

Tu cuenta está cerca del límite mensual de reservas de tu plan ${params.planName}.

Has usado ${params.currentCount} de ${params.limit} reservas este mes.

Si necesitas más reservas, considera actualizar tu plan para no perder oportunidades de negocio.

Ver opciones de plan: https://agendya.co/dashboard/plan`;

  return { subject, html, text };
}
