import { escapeHtml } from '../html.util';

export interface SubscriptionCancelledParams {
  professionalName: string;
  plan: string;
  expiresAt: string;
}

export function subscriptionCancelledTemplate(
  params: SubscriptionCancelledParams,
): { subject: string; html: string; text: string } {
  const professionalName = escapeHtml(params.professionalName);
  const plan = escapeHtml(params.plan);

  const subject = 'Tu suscripción ha sido cancelada';

  const html = `<p>Hola ${professionalName},</p>
<p>Confirmamos que tu suscripción al plan <strong>${plan}</strong> ha sido cancelada.</p>
<p>Seguirás teniendo acceso a todos los beneficios de tu plan hasta el <strong>${params.expiresAt}</strong>.</p>
<p>Después de esa fecha, tu cuenta cambiará automáticamente al plan FREE y algunos de tus servicios podrían bloquearse según los límites del plan gratuito.</p>
<p>Si cambias de opinión, puedes reactivar tu suscripción en cualquier momento antes de la fecha de vencimiento desde tu perfil.</p>
<p>Lamentamos verte partir. Si hay algo que podamos mejorar, nos encantaría saberlo respondiendo a este correo.</p>`;

  const text = `Hola ${params.professionalName},

Confirmamos que tu suscripción al plan ${params.plan} ha sido cancelada.

Seguirás teniendo acceso a todos los beneficios de tu plan hasta el ${params.expiresAt}.

Después de esa fecha, tu cuenta cambiará automáticamente al plan FREE y algunos de tus servicios podrían bloquearse según los límites del plan gratuito.

Si cambias de opinión, puedes reactivar tu suscripción en cualquier momento antes de la fecha de vencimiento desde tu perfil.

Lamentamos verte partir. Si hay algo que podamos mejorar, nos encantaría saberlo respondiendo a este correo.`;

  return { subject, html, text };
}
