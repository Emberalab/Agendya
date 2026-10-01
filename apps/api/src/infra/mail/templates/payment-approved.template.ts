import { escapeHtml } from '../html.util';

export interface PaymentApprovedParams {
  professionalName: string;
  plan: string;
  interval: string;
  amount: string;
  expiresAt: string;
}

export function paymentApprovedTemplate(params: PaymentApprovedParams): {
  subject: string;
  html: string;
  text: string;
} {
  const professionalName = escapeHtml(params.professionalName);
  const plan = escapeHtml(params.plan);
  const interval = params.interval === 'monthly' ? 'mensual' : 'anual';
  const amount = escapeHtml(params.amount);

  const subject = '¡Pago aprobado! Tu suscripción está activa';

  const html = `<p>Hola ${professionalName},</p>
<p>¡Buenas noticias! Tu pago de <strong>${amount}</strong> para el plan <strong>${plan}</strong> (${interval}) ha sido aprobado exitosamente.</p>
<p>Tu suscripción está activa hasta el <strong>${params.expiresAt}</strong>.</p>
<p>Ya puedes disfrutar de todos los beneficios de tu plan desde tu panel de control.</p>
<p>Gracias por confiar en Agendya.</p>`;

  const text = `Hola ${params.professionalName},

¡Buenas noticias! Tu pago de ${params.amount} para el plan ${params.plan} (${interval}) ha sido aprobado exitosamente.

Tu suscripción está activa hasta el ${params.expiresAt}.

Ya puedes disfrutar de todos los beneficios de tu plan desde tu panel de control.

Gracias por confiar en Agendya.`;

  return { subject, html, text };
}
