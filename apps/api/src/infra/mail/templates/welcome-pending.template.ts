import { escapeHtml } from '../html.util';

export interface WelcomePendingParams {
  businessName: string;
}

export function welcomePendingTemplate(params: WelcomePendingParams): {
  subject: string;
  html: string;
  text: string;
} {
  const businessName = escapeHtml(params.businessName);

  const subject = 'Tu registro en Agendya fue recibido';

  const html = `<p>Hola,</p>
<p>Recibimos tu registro para <strong>${businessName}</strong>.</p>
<p>Te avisaremos por correo cuando tu cuenta esté lista para usarla.</p>`;

  const text = `Hola,

Recibimos tu registro para ${params.businessName}.

Te avisaremos por correo cuando tu cuenta esté lista para usarla.`;

  return { subject, html, text };
}
