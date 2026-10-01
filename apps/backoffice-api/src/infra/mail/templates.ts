interface Template {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function staffPasswordResetTemplate(params: {
  name: string;
  resetUrl: string;
}): Template {
  const name = escapeHtml(params.name);
  const url = escapeHtml(params.resetUrl);
  return {
    subject: 'Recupera tu contraseña del Backoffice de Agendya',
    html: `<p>Hola ${name},</p>
<p>Recibimos una solicitud para restablecer tu contraseña del Backoffice de Agendya.</p>
<p>Crea una nueva contraseña aquí: <a href="${url}">${url}</a></p>
<p>Este enlace expira en 1 hora y solo se puede usar una vez.</p>
<p>Si no lo solicitaste, ignora este correo y avisa al equipo: tu contraseña actual sigue funcionando.</p>`,
    text: `Hola ${params.name},

Recibimos una solicitud para restablecer tu contraseña del Backoffice de Agendya.

Crea una nueva contraseña aquí: ${params.resetUrl}

Este enlace expira en 1 hora y solo se puede usar una vez.

Si no lo solicitaste, ignora este correo y avisa al equipo: tu contraseña actual sigue funcionando.`,
  };
}

export function staffPasswordChangedTemplate(params: {
  name: string;
  replyTo: string;
}): Template {
  const name = escapeHtml(params.name);
  const replyTo = escapeHtml(params.replyTo);
  return {
    subject: 'Tu contraseña del Backoffice de Agendya cambió',
    html: `<p>Hola ${name},</p>
<p>Tu contraseña del Backoffice de Agendya se cambió correctamente. Cerramos las demás sesiones abiertas.</p>
<p>Si no fuiste tú, escríbenos de inmediato a <a href="mailto:${replyTo}">${replyTo}</a>.</p>`,
    text: `Hola ${params.name},

Tu contraseña del Backoffice de Agendya se cambió correctamente. Cerramos las demás sesiones abiertas.

Si no fuiste tú, escríbenos de inmediato a ${params.replyTo}.`,
  };
}
