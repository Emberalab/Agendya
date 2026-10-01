/**
 * Términos de uso de Agendya
 *
 * Documento legal que rige el uso de la plataforma Agendya.
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

export const termsVersion = '2026-09-27';

export const termsSections: LegalSection[] = [
  {
    title: '1. Introducción',
    content: [
      'Bienvenido a Agendya. Estos Términos de uso (en adelante, los "Términos") rigen el acceso y uso de la plataforma Agendya (en adelante, la "Plataforma"), operada por Agendya, con domicilio en Ruta N, Medellín (en adelante, "Agendya", "nosotros" o "la empresa").',
      'Al registrarte, acceder o utilizar la Plataforma, aceptas estar legalmente vinculado por estos Términos y por nuestra Política de privacidad. Si no estás de acuerdo con alguna parte de estos Términos, no debes utilizar la Plataforma.',
    ],
  },
  {
    title: '2. Definiciones',
    content: [
      'Para efectos de estos Términos, se entiende por:',
      [
        '"Profesional": Persona natural o jurídica que se registra en la Plataforma para ofrecer servicios de agendamiento a sus clientes. El Profesional es responsable del tratamiento de los datos personales de sus clientes.',
        '"Cliente": Persona natural que utiliza la Plataforma para agendar citas con un Profesional. El Cliente no requiere crear una cuenta en Agendya.',
        '"Servicios": Funcionalidades que Agendya pone a disposición de los Profesionales para gestionar su agenda, servicios, horarios y reservas.',
        '"Cuenta": Perfil de usuario creado por un Profesional para acceder a los Servicios.',
        '"Contenido": Información, textos, imágenes, datos y demás material que los usuarios suben o generan en la Plataforma.',
      ],
    ],
  },
  {
    title: '3. Objeto del servicio',
    content: [
      'Agendya es una plataforma SaaS (Software as a Service) que permite a profesionales de servicios personales (como peluquerías, barberías, salones de belleza, entre otros) gestionar sus agendas, horarios, servicios y reservas en línea.',
      'La Plataforma facilita la conexión entre Profesionales y Clientes, pero Agendya no es parte de la relación comercial o contractual entre ellos. Agendya actúa únicamente como proveedor tecnológico.',
    ],
  },
  {
    title: '4. Acceso beta y aprobación de cuentas',
    content: [
      'Agendya se encuentra actualmente en fase beta. Durante este período:',
      [
        'El acceso a la Plataforma está sujeto a un proceso de aprobación por parte del administrador de Agendya.',
        'Al registrarte, tu cuenta quedará en estado "pendiente" hasta que sea revisada y aprobada.',
        'Agendya se reserva el derecho de aceptar o rechazar solicitudes de registro sin necesidad de proporcionar una justificación.',
        'Una vez aprobada tu cuenta, recibirás una notificación por correo electrónico y podrás acceder a todos los Servicios disponibles.',
      ],
    ],
  },
  {
    title: '5. Registro y cuenta',
    content: [
      'Para utilizar los Servicios de la Plataforma como Profesional, debes:',
      [
        'Proporcionar información veraz, completa y actualizada durante el proceso de registro.',
        'Ser mayor de edad (18 años o más en Colombia).',
        'Tener capacidad legal para contratar.',
        'Mantener la confidencialidad de tus credenciales de acceso.',
        'Notificar inmediatamente a Agendya cualquier uso no autorizado de tu Cuenta.',
      ],
      'Agendya se reserva el derecho de suspender o cancelar Cuentas que violen estos Términos o que proporcionen información falsa.',
    ],
  },
  {
    title: '6. Planes y tarifas',
    content: [
      'Agendya ofrece diferentes planes de servicio:',
      [
        'Plan FREE: Acceso gratuito con funcionalidades limitadas (número máximo de servicios, horarios y reservas).',
        'Planes pagos: Acceso a funcionalidades avanzadas mediante suscripción mensual o anual.',
      ],
      'Los pagos se procesan a través de Wompi, un procesador de pagos de terceros. Al contratar un plan pago, aceptas también los términos y condiciones de Wompi.',
      'Los precios, características y límites de cada plan están disponibles en la Plataforma y pueden modificarse con previo aviso.',
      'Agendya se reserva el derecho de modificar, suspender o descontinuar cualquier plan en cualquier momento.',
    ],
  },
  {
    title: '7. Obligaciones del Profesional',
    content: [
      'Como Profesional, te comprometes a:',
      [
        'Proporcionar información precisa sobre tus servicios, precios, horarios y disponibilidad.',
        'Utilizar la Plataforma de manera lícita y conforme a estos Términos.',
        'No utilizar la Plataforma para fines fraudulentos, ilegales o no autorizados.',
        'Respetar los derechos de propiedad intelectual de Agendya y de terceros.',
        'Cumplir con las citas agendadas a través de la Plataforma o notificar con anticipación su cancelación.',
        'Ser el responsable del tratamiento de los datos personales de tus Clientes conforme a la Ley 1581 de 2012 y demás normativa colombiana aplicable.',
        'Obtener las autorizaciones necesarias de tus Clientes para el tratamiento de sus datos personales.',
        'No realizar acciones que puedan dañar, deshabilitar o sobrecargar la Plataforma.',
        'Mantener actualizada la información de tu perfil y servicios.',
      ],
    ],
  },
  {
    title: '8. Política de cancelación',
    content: [
      'Cada Profesional puede establecer su propia política de cancelación (por ejemplo, "cancelación con 24 horas de anticipación"). Esta política debe ser comunicada claramente a sus Clientes.',
      'Agendya no es responsable de las cancelaciones, reprogramaciones o incumplimientos entre Profesionales y Clientes. Cualquier disputa debe resolverse directamente entre las partes.',
    ],
  },
  {
    title: '9. Relación entre Profesional y Cliente',
    content: [
      'Agendya actúa únicamente como proveedor tecnológico y facilitador del agendamiento. No somos parte de la relación comercial o contractual entre Profesionales y Clientes.',
      'El Profesional es el único responsable de:',
      [
        'La calidad, legalidad y cumplimiento de los servicios prestados.',
        'El cumplimiento de las obligaciones fiscales y tributarias derivadas de su actividad.',
        'La obtención de permisos, licencias y autorizaciones necesarias para operar.',
        'La atención de reclamos, disputas o controversias con los Clientes.',
      ],
    ],
  },
  {
    title: '10. Propiedad intelectual',
    content: [
      'Todos los derechos de propiedad intelectual sobre la Plataforma, incluyendo el software, diseño, contenido, marcas, logos y material gráfico, son propiedad exclusiva de Agendya o de sus licenciantes.',
      'Se te concede una licencia limitada, no exclusiva, no transferible y revocable para utilizar la Plataforma conforme a estos Términos.',
      'Está prohibido copiar, modificar, distribuir, vender o crear obras derivadas de la Plataforma sin autorización previa y por escrito de Agendya.',
      'El Contenido que subas a la Plataforma (como fotos de tu negocio, descripciones de servicios, etc.) sigue siendo de tu propiedad, pero nos otorgas una licencia mundial, gratuita y no exclusiva para usarlo en el contexto de la prestación de los Servicios.',
    ],
  },
  {
    title: '11. Suspensión y terminación de cuentas',
    content: [
      'Agendya se reserva el derecho de suspender o cancelar tu Cuenta en los siguientes casos:',
      [
        'Incumplimiento de estos Términos o de la legislación colombiana aplicable.',
        'Uso fraudulento o abusivo de la Plataforma.',
        'Falta de pago de suscripciones (en planes pagos).',
        'Solicitud expresa del Profesional de cerrar su Cuenta.',
        'Inactividad prolongada (más de 12 meses sin uso).',
      ],
      'En caso de suspensión o cancelación, podrás exportar tus datos dentro de los 30 días siguientes, tras lo cual Agendya podrá eliminar permanentemente tu información conforme a nuestra Política de privacidad.',
    ],
  },
  {
    title: '12. Limitación de responsabilidad',
    content: [
      'Agendya proporciona la Plataforma "tal cual" (as is) y "según disponibilidad", sin garantías de ningún tipo, ya sean expresas o implícitas.',
      'No garantizamos que la Plataforma esté libre de errores, interrupciones, virus u otros componentes dañinos, ni que funcione de manera ininterrumpida o segura.',
      'Agendya no será responsable por:',
      [
        'Daños directos, indirectos, incidentales, especiales o consecuentes derivados del uso o imposibilidad de uso de la Plataforma.',
        'Pérdida de datos, ingresos, oportunidades de negocio o reputación.',
        'Disputas entre Profesionales y Clientes.',
        'Contenido generado por los usuarios.',
        'Fallas en servicios de terceros (como proveedores de pago, servidores, servicios de correo, etc.).',
      ],
      'En la máxima medida permitida por la ley, la responsabilidad total de Agendya no excederá el monto pagado por el Profesional en los últimos 12 meses.',
    ],
  },
  {
    title: '13. Disponibilidad "as is" (MVP)',
    content: [
      'Agendya es un producto mínimo viable (MVP) en fase beta. Esto significa que:',
      [
        'Las funcionalidades pueden estar en desarrollo y sujetas a cambios.',
        'Pueden presentarse errores, bugs o comportamientos inesperados.',
        'El servicio puede no estar disponible el 100% del tiempo.',
        'Algunas características pueden ser modificadas, agregadas o eliminadas sin previo aviso.',
      ],
      'Al utilizar la Plataforma durante esta fase, aceptas estos riesgos y limitaciones.',
    ],
  },
  {
    title: '14. Modificaciones a los Términos',
    content: [
      'Agendya se reserva el derecho de modificar estos Términos en cualquier momento. Los cambios entrarán en vigor inmediatamente después de su publicación en la Plataforma.',
      'Te notificaremos sobre cambios importantes mediante correo electrónico o un aviso en la Plataforma.',
      'El uso continuado de la Plataforma después de la publicación de los cambios constituye tu aceptación de los nuevos Términos.',
    ],
  },
  {
    title: '15. Ley aplicable y jurisdicción',
    content: [
      'Estos Términos se rigen por las leyes de la República de Colombia, especialmente:',
      [
        'Ley 1581 de 2012 (Protección de datos personales)',
        'Decreto 1377 de 2013 (Reglamentación Ley 1581)',
        'Ley 1480 de 2011 (Estatuto del Consumidor)',
        'Código Civil y Código de Comercio de Colombia',
      ],
      'Cualquier disputa o controversia derivada de estos Términos será sometida a los jueces y tribunales de Medellín, Colombia.',
    ],
  },
  {
    title: '16. Contacto',
    content: [
      'Para cualquier consulta, reclamo o solicitud relacionada con estos Términos, puedes contactarnos en:',
      [
        'Correo electrónico: info@agendya.co',
        'Razón social: Agendya',
        'Domicilio: Ruta N, Medellín',
      ],
    ],
  },
  {
    title: '17. Disposiciones finales',
    content: [
      'Si alguna disposición de estos Términos es declarada inválida o inaplicable, las demás disposiciones permanecerán en pleno vigor y efecto.',
      'La falta de ejercicio por parte de Agendya de cualquier derecho establecido en estos Términos no constituye una renuncia a dicho derecho.',
      'Estos Términos constituyen el acuerdo completo entre tú y Agendya en relación con el uso de la Plataforma.',
    ],
  },
];

export const termsLastUpdated = '27 de septiembre de 2026';
