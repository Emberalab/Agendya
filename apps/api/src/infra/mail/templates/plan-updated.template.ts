import { escapeHtml } from '../html.util';

export interface PlanUpdatedParams {
  professionalName: string;
  oldPlan: string;
  newPlan: string;
  reason: 'expired' | 'downgrade' | 'upgrade';
}

export function planUpdatedTemplate(params: PlanUpdatedParams): {
  subject: string;
  html: string;
  text: string;
} {
  const professionalName = escapeHtml(params.professionalName);
  const oldPlan = escapeHtml(params.oldPlan);
  const newPlan = escapeHtml(params.newPlan);

  const subject = 'Tu plan de Agendya ha sido actualizado';

  let reasonText = '';
  if (params.reason === 'expired') {
    reasonText = 'Tu plan anterior venció y no fue renovado.';
  } else if (params.reason === 'downgrade') {
    reasonText =
      'Tu suscripción fue cancelada y ha llegado su fecha de vencimiento.';
  } else {
    reasonText = 'Has actualizado tu suscripción.';
  }

  const html = `<p>Hola ${professionalName},</p>
<p>${reasonText}</p>
<p>Tu plan ha cambiado de <strong>${oldPlan}</strong> a <strong>${newPlan}</strong>.</p>
<p>Si algunos de tus servicios quedaron bloqueados debido a los límites del nuevo plan, puedes administrarlos desde tu panel de control.</p>
<p>Para renovar tu suscripción o cambiar de plan, visita tu perfil en Agendya.</p>
<p>¿Tienes preguntas? Contáctanos respondiendo a este correo.</p>`;

  const text = `Hola ${params.professionalName},

${reasonText}

Tu plan ha cambiado de ${params.oldPlan} a ${params.newPlan}.

Si algunos de tus servicios quedaron bloqueados debido a los límites del nuevo plan, puedes administrarlos desde tu panel de control.

Para renovar tu suscripción o cambiar de plan, visita tu perfil en Agendya.

¿Tienes preguntas? Contáctanos respondiendo a este correo.`;

  return { subject, html, text };
}
