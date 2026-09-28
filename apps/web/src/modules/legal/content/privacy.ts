/**
 * Política de privacidad de Agendya
 *
 * Documento legal que informa sobre el tratamiento de datos personales
 * conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013.
 * Última actualización: 27 de septiembre de 2026
 *
 * IMPORTANTE: Este documento es un BORRADOR y requiere revisión legal
 * antes de uso en producción.
 */

export interface LegalSubsection {
  title: string;
  items: string[];
}

export interface LegalSection {
  title: string;
  content: (string | string[] | LegalSubsection)[];
}

export const privacyVersion = '2026-09-27';

export const privacySections: LegalSection[] = [
  {
    title: '1. Introducción',
    content: [
      'Esta Política de privacidad (en adelante, la "Política") describe cómo Agendya, con domicilio en Calle 9 Sur #79C - 151, Medellín (en adelante, "Agendya", "nosotros" o "la empresa"), recolecta, usa, almacena, comparte y protege los datos personales de los usuarios de la plataforma Agendya (en adelante, la "Plataforma").',
      'Esta Política se rige por la Ley 1581 de 2012, el Decreto 1377 de 2013 y demás normativa colombiana aplicable en materia de protección de datos personales (habeas data).',
      'Al registrarte o utilizar la Plataforma, aceptas el tratamiento de tus datos personales conforme a esta Política.',
    ],
  },
  {
    title: '2. Responsables del tratamiento',
    content: [
      'Es importante distinguir dos roles en el tratamiento de datos personales:',
      [
        'Datos del Profesional: Agendya actúa como "Responsable del Tratamiento" de los datos personales de los profesionales que se registran en la Plataforma (correo electrónico, nombre del negocio, contraseña, etc.).',
        'Datos del Cliente: El Profesional que utiliza Agendya actúa como "Responsable del Tratamiento" de los datos personales de sus clientes (nombre, correo, teléfono, dirección). Agendya actúa únicamente como "Encargado del Tratamiento" bajo las instrucciones del Profesional. El Profesional es quien debe obtener el consentimiento de sus clientes y responder por el tratamiento de sus datos.',
      ],
    ],
  },
  {
    title: '3. Datos personales que recolectamos',
    content: [
      'Dependiendo de tu rol en la Plataforma, recolectamos los siguientes datos personales:',
      {
        title: '3.1. Datos del Profesional',
        items: [
          'Datos de registro: Correo electrónico, nombre del negocio, contraseña (hasheada), Google ID (si usas Google OAuth).',
          'Datos del perfil: Slug personalizado (URL de tu página de reservas), categoría de negocio, fotos (perfil, logo, portada), color de marca, descripción, zona horaria.',
          'Datos de configuración: Horarios de trabajo, excepciones de calendario, política de cancelación, servicios ofrecidos (nombre, descripción, duración, precio).',
          'Datos de suscripción: Plan contratado (FREE, BASIC, ADVANCED, BUSINESS), intervalo de facturación, fechas de inicio y expiración, ID de transacción de Wompi.',
          'Metadatos: Rol en la plataforma, estado de acceso (PENDING, APPROVED, DECLINED), estado activo/inactivo, fechas de creación y actualización.',
        ],
      },
      {
        title: '3.2. Datos del Cliente',
        items: [
          'Datos de reserva: Nombre completo, correo electrónico, teléfono, nota opcional, dirección (solo si selecciona servicio a domicilio).',
          'Metadatos de reserva: Fecha y hora de la cita, servicio seleccionado, duración, estado de la reserva, token de cancelación, fechas de envío de recordatorios.',
        ],
      },
      {
        title: '3.3. Datos técnicos y de uso',
        items: [
          'Información del navegador: User agent, dirección IP, idioma, zona horaria.',
          'Cookies y almacenamiento local: Tokens de sesión, preferencias de tema, datos temporales de formularios (ver sección sobre cookies).',
          'Datos de uso: Páginas visitadas, clics, interacciones con la Plataforma (solo con fines de mejora del servicio, de forma agregada y anonimizada).',
        ],
      },
    ],
  },
  {
    title: '4. Finalidades del tratamiento',
    content: [
      'Tratamos los datos personales para las siguientes finalidades:',
      [
        'Registro y autenticación: Crear y gestionar cuentas de Profesionales, permitir inicio de sesión con correo/contraseña o Google OAuth.',
        'Prestación del servicio: Permitir a los Profesionales gestionar su agenda, servicios, horarios y reservas. Facilitar a los Clientes agendar citas con Profesionales.',
        'Comunicaciones: Enviar correos electrónicos de bienvenida, aprobación de cuenta, recuperación de contraseña, confirmaciones de reserva, recordatorios de cita, notificaciones de cancelación o modificación.',
        'Notificaciones push: Enviar notificaciones push en el navegador a Profesionales que hayan dado su consentimiento (nuevas reservas, cancelaciones).',
        'Procesamiento de pagos: Facilitar el pago de suscripciones a través de Wompi (procesador de pagos de terceros). Agendya no almacena datos de tarjetas de crédito.',
        'Soporte técnico: Responder consultas, resolver problemas técnicos, atender reclamos.',
        'Mejora del servicio: Analizar el uso de la Plataforma de forma agregada y anonimizada para mejorar funcionalidades y experiencia de usuario.',
        'Cumplimiento legal: Cumplir con obligaciones legales, regulatorias y fiscales en Colombia.',
        'Seguridad: Prevenir fraudes, detectar actividades ilícitas, proteger la integridad de la Plataforma.',
      ],
    ],
  },
  {
    title: '5. Terceros que procesan datos (Encargados)',
    content: [
      'Para prestar el servicio, compartimos datos personales con los siguientes terceros que actúan como "Encargados del Tratamiento" bajo nuestras instrucciones:',
      [
        'Railway (https://railway.app): Proveedor de infraestructura en la nube (hosting de base de datos y aplicación). Datos compartidos: Todos los datos almacenados en la Plataforma. Ubicación: Estados Unidos.',
        'Resend (https://resend.com): Proveedor de envío de correos electrónicos transaccionales. Datos compartidos: Correo electrónico, nombre, contenido de los correos (confirmaciones, recordatorios, etc.). Ubicación: Estados Unidos.',
        'Cloudinary (https://cloudinary.com): Proveedor de almacenamiento y optimización de imágenes. Datos compartidos: Fotos de perfil, logos, imágenes de portada subidas por Profesionales. Ubicación: Estados Unidos.',
        'Google (https://google.com): Proveedor de autenticación OAuth. Datos compartidos: Correo electrónico, Google ID, nombre de usuario de Google (solo si el Profesional elige iniciar sesión con Google). Ubicación: Estados Unidos.',
        'Wompi (https://wompi.com): Procesador de pagos para suscripciones. Datos compartidos: Información de transacciones, ID de transacción. Wompi maneja directamente los datos de tarjetas de crédito; Agendya no almacena ni procesa esta información. Ubicación: Colombia.',
        'Servicios de notificaciones push del navegador: Apple Push Notification Service (APNs), Firebase Cloud Messaging (FCM), Microsoft Push Notification Service, etc. Datos compartidos: Endpoint de suscripción push, claves de encriptación (p256dh, auth), user agent. Ubicación: Varía según el navegador y servicio.',
      ],
      'Estos terceros están obligados por contrato a proteger los datos personales y a utilizarlos únicamente para los fines autorizados por Agendya.',
    ],
  },
  {
    title: '6. Transferencias internacionales de datos',
    content: [
      'Algunos de los terceros mencionados (Railway, Resend, Cloudinary, Google) están ubicados en Estados Unidos. Esto implica una transferencia internacional de datos personales fuera de Colombia.',
      'Estas transferencias se realizan bajo las siguientes garantías:',
      [
        'Los proveedores cumplen con estándares internacionales de protección de datos (como GDPR en Europa).',
        'Existen contratos de procesamiento de datos que obligan a los proveedores a proteger la información.',
        'Al aceptar esta Política, autorizas expresamente estas transferencias internacionales.',
      ],
      'Conforme al artículo 26 del Decreto 1377 de 2013, te informamos que los países de destino pueden no ofrecer el mismo nivel de protección que Colombia, pero tomamos medidas para garantizar que tus datos sean tratados de forma segura.',
    ],
  },
  {
    title: '7. Derechos del titular (derechos ARCO)',
    content: [
      'Como titular de datos personales, tienes los siguientes derechos conforme a la Ley 1581 de 2012:',
      [
        'Acceso: Conocer qué datos personales tenemos sobre ti y cómo los tratamos.',
        'Rectificación: Solicitar la corrección de datos inexactos, incompletos o desactualizados.',
        'Cancelación: Solicitar la eliminación de tus datos personales cuando consideres que no están siendo tratados conforme a la ley.',
        'Oposición: Oponerte al tratamiento de tus datos por motivos legítimos.',
        'Revocación de la autorización: Revocar el consentimiento que nos diste para tratar tus datos (siempre que no exista una obligación legal o contractual que nos impida hacerlo).',
        'Obtener prueba de la autorización: Solicitar una copia de la autorización que otorgaste para el tratamiento de tus datos.',
        'Presentar quejas: Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) si consideras que tus derechos han sido vulnerados.',
      ],
    ],
  },
  {
    title: '8. Cómo ejercer tus derechos',
    content: [
      'Para ejercer cualquiera de los derechos ARCO, puedes contactarnos a través de:',
      [
        'Correo electrónico: info@agendya.co',
        'Asunto: "Solicitud de derechos ARCO - [Tu nombre completo]"',
      ],
      'Tu solicitud debe incluir:',
      [
        'Nombre completo y documento de identidad.',
        'Correo electrónico asociado a tu cuenta (si aplica).',
        'Descripción clara del derecho que deseas ejercer y los datos personales a los que se refiere.',
        'Dirección de correo electrónico o física para recibir respuesta.',
        'Documentos que soporten la solicitud (si aplica).',
      ],
      'Responderemos tu solicitud dentro de los siguientes plazos:',
      [
        'Consultas: Máximo 10 días hábiles desde la recepción.',
        'Reclamos: Máximo 15 días hábiles desde la recepción. Si necesitamos más tiempo, te informaremos antes de que expire este plazo.',
      ],
      'No tendrás que pagar ningún costo por ejercer tus derechos, salvo los gastos de envío de documentos físicos (si aplica).',
    ],
  },
  {
    title: '9. Tiempo de conservación de los datos',
    content: [
      'Conservaremos tus datos personales mientras:',
      [
        'Mantengas una Cuenta activa en la Plataforma.',
        'Sea necesario para cumplir con las finalidades descritas en esta Política.',
        'Exista una obligación legal de conservarlos (por ejemplo, obligaciones fiscales o contables).',
      ],
      'Cuando elimines tu Cuenta o solicites la cancelación de tus datos:',
      [
        'Procederemos a eliminar tus datos personales dentro de los 30 días siguientes.',
        'Algunos datos pueden conservarse de forma anonimizada con fines estadísticos.',
        'Datos necesarios para cumplir obligaciones legales (como registros fiscales) se conservarán durante el plazo legal exigido (generalmente 5 años).',
      ],
    ],
  },
  {
    title: '10. Seguridad de los datos',
    content: [
      'Implementamos medidas técnicas, administrativas y físicas para proteger tus datos personales contra acceso no autorizado, pérdida, alteración o divulgación, incluyendo:',
      [
        'Encriptación de contraseñas: Las contraseñas se almacenan hasheadas (nunca en texto plano) utilizando algoritmos seguros.',
        'Conexiones seguras: Toda comunicación entre tu navegador y nuestros servidores se realiza mediante HTTPS (SSL/TLS).',
        'Control de acceso: Solo personal autorizado de Agendya tiene acceso a los datos personales, bajo estrictas políticas de confidencialidad.',
        'Monitoreo: Monitoreamos actividades sospechosas y realizamos auditorías de seguridad periódicas.',
        'Backups: Realizamos copias de seguridad regulares para prevenir pérdida de datos.',
      ],
      'Sin embargo, ningún sistema es 100% seguro. Te recomendamos mantener la confidencialidad de tu contraseña y notificarnos inmediatamente si sospechas de un acceso no autorizado a tu Cuenta.',
    ],
  },
  {
    title: '11. Cookies y almacenamiento local',
    content: [
      'La Plataforma utiliza cookies y tecnologías similares para mejorar tu experiencia de uso. Estas tecnologías almacenan pequeños archivos de texto en tu dispositivo.',
      {
        title: '11.1. Tipos de cookies y almacenamiento que utilizamos',
        items: [
          'localStorage (navegador): Almacenamos tokens de autenticación (clave: "agendya-auth") para mantener tu sesión iniciada. También almacenamos preferencias de tema claro/oscuro (clave: "agendya-theme").',
          'sessionStorage (navegador): En el formulario público de reservas, ofrecemos una opción "Recordar mis datos" que guarda temporalmente nombre, correo y teléfono del Cliente durante la sesión de navegación (se borra al cerrar el navegador).',
          'Cookies de terceros: Google (para OAuth) y Wompi (para procesamiento de pagos) pueden establecer sus propias cookies conforme a sus políticas de privacidad.',
        ],
      },
      {
        title: '11.2. Cómo gestionar cookies',
        items: [
          'Puedes configurar tu navegador para rechazar cookies o eliminar las existentes. Sin embargo, esto puede afectar el funcionamiento de la Plataforma (por ejemplo, no podrás mantener tu sesión iniciada).',
          'Para más información sobre cómo gestionar cookies, consulta la ayuda de tu navegador (Chrome, Firefox, Safari, Edge, etc.).',
        ],
      },
    ],
  },
  {
    title: '12. Menores de edad',
    content: [
      'La Plataforma está dirigida a mayores de 18 años. No recolectamos intencionadamente datos personales de menores de edad.',
      'Si descubrimos que hemos recolectado datos de un menor sin el consentimiento de sus padres o tutores legales, eliminaremos esos datos de inmediato.',
      'Si eres padre, madre o tutor legal y crees que tu hijo(a) menor de edad ha proporcionado datos personales en la Plataforma, contáctanos en info@agendya.co.',
    ],
  },
  {
    title: '13. Modificaciones a esta Política',
    content: [
      'Agendya se reserva el derecho de modificar esta Política en cualquier momento para reflejar cambios en nuestras prácticas de tratamiento de datos, en la legislación aplicable o en las funcionalidades de la Plataforma.',
      'Te notificaremos sobre cambios importantes mediante:',
      [
        'Correo electrónico a la dirección asociada a tu Cuenta.',
        'Un aviso destacado en la Plataforma.',
      ],
      'La versión actualizada de la Política indicará la fecha de "Última actualización" en la parte superior. Te recomendamos revisar esta Política periódicamente.',
      'El uso continuado de la Plataforma después de la publicación de cambios constituye tu aceptación de la nueva Política.',
    ],
  },
  {
    title: '14. Autoridad de control',
    content: [
      'La autoridad encargada de velar por el cumplimiento de la normativa de protección de datos personales en Colombia es la Superintendencia de Industria y Comercio (SIC).',
      'Si consideras que tus derechos han sido vulnerados, puedes presentar una queja ante la SIC:',
      [
        'Sitio web: https://www.sic.gov.co',
        'Línea de atención: 592 0001 en Bogotá, o 018000 910165 a nivel nacional',
        'Dirección: Carrera 13 No. 27-00, pisos 3 y 4, Bogotá D.C., Colombia',
      ],
    ],
  },
  {
    title: '15. Contacto',
    content: [
      'Para cualquier consulta, duda o solicitud relacionada con el tratamiento de tus datos personales, puedes contactarnos en:',
      [
        'Correo electrónico: info@agendya.co',
        'Razón social: Agendya',
        'Domicilio: Calle 9 Sur #79C - 151, Medellín',
      ],
      'Nos comprometemos a responder tus inquietudes de manera oportuna y transparente.',
    ],
  },
  {
    title: '16. Consentimiento informado',
    content: [
      'Al registrarte en la Plataforma y aceptar esta Política de privacidad:',
      [
        'Reconoces que has leído, comprendido y aceptado los términos de esta Política.',
        'Autorizas de manera libre, previa, expresa e informada el tratamiento de tus datos personales conforme a las finalidades descritas.',
        'Autorizas las transferencias internacionales de datos a los países mencionados.',
        'Entiendes que puedes ejercer tus derechos ARCO en cualquier momento conforme a lo establecido en esta Política.',
      ],
    ],
  },
];

export const privacyLastUpdated = '27 de septiembre de 2026';
