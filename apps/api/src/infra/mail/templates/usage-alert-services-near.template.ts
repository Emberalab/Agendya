import { escapeHtml } from '../html.util';

export interface UsageAlertServicesNearParams {
  professionalName: string;
  currentCount: number;
  limit: number;
  planName: string;
}

export function usageAlertServicesNearTemplate(
  params: UsageAlertServicesNearParams,
): { subject: string; html: string; text: string } {
  const professionalName = escapeHtml(params.professionalName);
  const planName = escapeHtml(params.planName);

  const subject = `⚠️ Estás cerca del límite de servicios de tu plan ${params.planName}`;

  const html = `<p>Hola ${professionalName},</p>
<p>Tu catálogo está cerca del límite de servicios de tu plan <strong>${planName}</strong>.</p>
<p>Tienes <strong>${params.currentCount} de ${params.limit} servicios</strong> activos.</p>
<p>Si necesitas agregar más servicios, considera actualizar tu plan.</p>
<p><a href="https://agendya.co/dashboard/plan">Ver opciones de plan</a></p>`;

  const text = `Hola ${params.professionalName},

Tu catálogo está cerca del límite de servicios de tu plan ${params.planName}.

Tienes ${params.currentCount} de ${params.limit} servicios activos.

Si necesitas agregar más servicios, considera actualizar tu plan.

Ver opciones de plan: https://agendya.co/dashboard/plan`;

  return { subject, html, text };
}
