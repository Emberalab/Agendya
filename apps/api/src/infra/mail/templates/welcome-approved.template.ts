import { escapeHtml } from '../html.util';

export interface WelcomeApprovedParams {
  businessName: string;
  loginUrl: string;
}

export function welcomeApprovedTemplate(params: WelcomeApprovedParams): {
  subject: string;
  html: string;
  text: string;
} {
  const businessName = escapeHtml(params.businessName);

  const subject = 'Tu cuenta en Agendya está lista';

  const html = `<p>Hola,</p>
<p>Tu cuenta para <strong>${businessName}</strong> está lista.</p>
<p>Ya puedes iniciar sesión aquí: <a href="${params.loginUrl}">${params.loginUrl}</a></p>`;

  const text = `Hola,

Tu cuenta para ${params.businessName} está lista.

Ya puedes iniciar sesión aquí: ${params.loginUrl}`;

  return { subject, html, text };
}
