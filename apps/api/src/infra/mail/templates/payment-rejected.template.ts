import { escapeHtml } from '../html.util';

export interface PaymentRejectedParams {
  professionalName: string;
  plan: string;
  interval: string;
  amount: string;
  reason?: string;
}

export function paymentRejectedTemplate(params: PaymentRejectedParams): {
  subject: string;
  html: string;
  text: string;
} {
  const professionalName = escapeHtml(params.professionalName);
  const plan = escapeHtml(params.plan);
  const interval = params.interval === 'monthly' ? 'mensual' : 'anual';
  const amount = escapeHtml(params.amount);

  const subject = 'Tu pago no pudo ser procesado';

  const reasonText = params.reason
    ? `Motivo: ${escapeHtml(params.reason)}`
    : 'No pudimos procesar tu pago en este momento.';

  const html = `<p>Hola ${professionalName},</p>
<p>${reasonText}</p>
<p>El pago de <strong>${amount}</strong> para el plan <strong>${plan}</strong> (${interval}) no pudo ser completado.</p>
<p>Por favor, verifica:</p>
<ul>
  <li>Que tu método de pago tenga fondos suficientes</li>
  <li>Que la información de tu tarjeta sea correcta</li>
  <li>Que tu banco no haya bloqueado la transacción</li>
</ul>
<p>Puedes intentar nuevamente desde tu perfil en Agendya.</p>
<p>Si el problema persiste, contáctanos respondiendo a este correo.</p>`;

  const text = `Hola ${params.professionalName},

${reasonText}

El pago de ${params.amount} para el plan ${params.plan} (${interval}) no pudo ser completado.

Por favor, verifica:
- Que tu método de pago tenga fondos suficientes
- Que la información de tu tarjeta sea correcta
- Que tu banco no haya bloqueado la transacción

Puedes intentar nuevamente desde tu perfil en Agendya.

Si el problema persiste, contáctanos respondiendo a este correo.`;

  return { subject, html, text };
}
