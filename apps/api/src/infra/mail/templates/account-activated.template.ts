import { escapeHtml } from '../html.util';

export interface AccountActivatedParams {
  businessName: string;
  loginUrl: string;
}

export function accountActivatedTemplate(params: AccountActivatedParams): {
  subject: string;
  html: string;
  text: string;
} {
  const businessName = escapeHtml(params.businessName);

  const subject = 'Tu cuenta en Agendya fue activada';

  const html = `<p>Hola,</p>
<p>Tu cuenta para <strong>${businessName}</strong> fue activada.</p>
<p>Ya puedes iniciar sesión aquí: <a href="${params.loginUrl}">${params.loginUrl}</a></p>`;

  const text = `Hola,

Tu cuenta para ${params.businessName} fue activada.

Ya puedes iniciar sesión aquí: ${params.loginUrl}`;

  return { subject, html, text };
}
