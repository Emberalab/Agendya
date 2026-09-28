export interface ForgotPasswordParams {
  resetUrl: string;
}

export function forgotPasswordTemplate(params: ForgotPasswordParams): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = 'Recupera tu contraseña en Agendya';

  const html = `<p>Hola,</p>
<p>Recibimos una solicitud para restablecer tu contraseña en Agendya.</p>
<p>Puedes crear una nueva contraseña aquí: <a href="${params.resetUrl}">${params.resetUrl}</a></p>
<p>Este enlace expira en 1 hora.</p>
<p>Si no solicitaste restablecer tu contraseña, ignora este correo.</p>`;

  const text = `Hola,

Recibimos una solicitud para restablecer tu contraseña en Agendya.

Puedes crear una nueva contraseña aquí: ${params.resetUrl}

Este enlace expira en 1 hora.

Si no solicitaste restablecer tu contraseña, ignora este correo.`;

  return { subject, html, text };
}
