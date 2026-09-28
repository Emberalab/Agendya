export interface PasswordChangedParams {
  replyTo: string;
}

export function passwordChangedTemplate(params: PasswordChangedParams): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = 'Tu contraseña fue actualizada';

  const html = `<p>Hola,</p>
<p>Tu contraseña en Agendya fue actualizada.</p>
<p>Si no fuiste tú quien hizo este cambio, escríbenos de inmediato a ${params.replyTo}</p>`;

  const text = `Hola,

Tu contraseña en Agendya fue actualizada.

Si no fuiste tú quien hizo este cambio, escríbenos de inmediato a ${params.replyTo}`;

  return { subject, html, text };
}
