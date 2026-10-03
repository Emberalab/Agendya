# Email Templates Setup - Resend

## Descripción
Este documento explica cómo subir y configurar los templates HTML en Resend para que los correos se envíen con el diseño profesional desde Figma.

## Archivos de Templates
- `templates/welcome.html` - Email de bienvenida para nuevos profesionales
- `templates/booking-confirmation.html` - Confirmación de reserva
- `templates/booking-reminder.html` - Email cuando el profesional crea una cita para el cliente
- `templates/booking-reminder-upcoming.html` - Recordatorio automático antes de la cita (1h o 2h antes)
- `templates/booking-rescheduled.html` - Notificación cuando una cita es reprogramada
- `templates/booking-cancelled.html` - Notificación cuando una cita es cancelada
- `templates/password-reset.html` - Recuperación de contraseña
- `templates/password-updated.html` - Confirmación de contraseña actualizada
- `templates/plan-updated.html` - Notificación cuando el plan es actualizado
- `templates/payment-received.html` - Confirmación de pago recibido
- `templates/payment-failed.html` - Alerta cuando el pago es rechazado
- `templates/subscription-cancelled.html` - Confirmación de suscripción cancelada
- `templates/plan-limit-alert.html` - Alerta cuando se alcanza límite de reservas
- `templates/services-limit-alert.html` - Alerta cuando se alcanza límite de servicios
- `templates/plan-full-alert.html` - Alerta cuando se alcanza límite completo del plan

## Paso 1: Acceder a Resend Dashboard

1. Ve a https://resend.com/emails
2. Inicia sesión con tu cuenta

## Paso 2: Crear Templates en Resend

Para cada template (welcome, booking-confirmation, booking-reminder):

### A. Desde Resend Dashboard:
1. Click en **"Create Template"** (o similar)
2. Dale un nombre (ej: "Welcome - New Professional")
3. Pega el contenido HTML del archivo correspondiente
4. Click **"Save Template"**
5. Copia el **Template ID** que aparece (ej: `t_1abc2def3ghi...`)

### B. O usa la API:
```bash
curl -X POST "https://api.resend.com/emails" \
  -H "Authorization: Bearer tu_resend_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "tu_template_id",
    "from": "reservas@agendya.app",
    "to": "recipient@example.com",
    "subject": "Tu asunto",
    "variables": {
      "customerName": "Juan",
      "businessName": "Barbería XYZ",
      "serviceName": "Corte de pelo",
      "dateTime": "Viernes, 5 de octubre 2024, 14:30",
      "duration": "30",
      "dashboardUrl": "https://app.agendya.app/dashboard",
      "bookingUrl": "https://app.agendya.app/booking/123",
      "cancelUrl": "https://app.agendya.app/booking/token123/cancel"
    }
  }'
```

## Paso 3: Obtener los Template IDs

Después de crear los templates en Resend, obtendrás IDs como:
- Welcome: `t_welcome_xyz`
- Booking Confirmation: `t_booking_conf_xyz`
- Booking Reminder: `t_booking_reminder_xyz`

Guarda estos IDs en tu archivo `.env.local`:

```env
RESEND_TEMPLATE_ID_WELCOME=t_welcome_xyz
RESEND_TEMPLATE_ID_BOOKING_CONFIRMATION=t_booking_conf_xyz
RESEND_TEMPLATE_ID_BOOKING_REMINDER=t_booking_reminder_xyz
```

## Paso 4: Preparar las URLs de imagen

Las imágenes deben ser URLs públicas y accesibles. Recomendaciones:

### Opción A: Cloudinary (Recomendado)
Si el logo se sube a Cloudinary (como se hace en Agendya):
```
https://res.cloudinary.com/your-account/image/upload/c_fill,w_100,h_100,r_max/v1/agendya/logos/PROFESSIONAL_ID
```

### Opción B: URL pública cualquiera
Cualquier URL pública que sea accesible:
```
https://ejemplo.com/logos/barberia-xyz.jpg
```

⚠️ **Importante:** La URL debe estar en HTTPS y ser accesible públicamente

## Paso 5: Actualizar el MailService (Próxima PR)

Una vez tengas los Template IDs, el servicio usará Resend templates:

```typescript
async sendWelcome(params: WelcomeParams): Promise<void> {
  await this.send({
    to: params.to,
    templateId: this.configService.get<string>('resendTemplateIdWelcome'),
    variables: {
      dashboardUrl: `${this.baseUrl}/dashboard`,
      businessName: params.businessName,
      businessLogo: params.professionalLogoUrl, // URL de Cloudinary o pública
    },
  });
}

async sendBookingConfirmation(params: BookingConfirmationParams): Promise<void> {
  await this.send({
    to: params.to,
    templateId: this.configService.get<string>('resendTemplateIdBookingConfirmation'),
    variables: {
      customerName: params.customerName,
      businessName: params.businessName,
      businessLogo: params.professionalLogoUrl,
      serviceName: params.serviceName,
      dateTime: this.formatDate(params.startAt, params.timezone),
      duration: params.serviceDurationMinutes,
      bookingUrl: `${this.baseUrl}/booking/${params.bookingId}`,
      cancelUrl: `${this.baseUrl}/booking/${params.cancellationToken}`,
    },
  });
}
```

## Resumen Variables por Template

### Welcome (welcome.html)
- `dashboardUrl` - URL al dashboard para empezar
- `businessName` - Nombre del negocio/profesional
- `businessLogo` - URL de la imagen de perfil del negocio (circular, 28x28px)

### Booking Confirmation (booking-confirmation.html)
- `businessName` - Nombre del negocio
- `businessInitial` - Inicial del nombre (ej: "C" para "Clandestino")
- `serviceName` - Nombre del servicio (ej: "Corte sencillo")
- `dateTime` - Fecha y hora formateada (ej: "10 de septiembre de 2026")
- `duration` - Duración en minutos (ej: "60")
- `price` - Precio del servicio (ej: "$30.000")
- `serviceMode` - Modalidad (ej: "En el establecimiento" o "A domicilio")
- `bookingUrl` - URL para reprogramar la cita

**Ejemplo de cálculo en backend:**
```typescript
const dateTime = new Date(booking.startAt).toLocaleDateString('es-CO', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
});

await this.mailService.sendBookingConfirmation({
  to: customer.email,
  businessName: professional.name,
  businessInitial: professional.name.charAt(0),
  serviceName: service.name,
  dateTime: dateTime,
  duration: service.durationMinutes,
  price: `$${service.priceCents / 100}`,
  serviceMode: booking.atHome ? "A domicilio" : "En el establecimiento",
  bookingUrl: `${this.baseUrl}/booking/${booking.id}/reschedule`,
});
```

### Booking Reminder (booking-reminder.html)
**Enviado cuando el profesional crea una cita para el cliente** ("Tu cita fue agendada")

- `businessName` - Nombre del negocio/profesional
- `serviceName` - Nombre del servicio
- `dateTime` - Fecha y hora formateada (ej: "10 de octubre de 2026")
- `timeRange` - Rango de hora (ej: "2:00 PM - 2:30 PM")
- `duration` - Duración en minutos (ej: "30")
- `price` - Precio del servicio (ej: "$30.000")
- `serviceMode` - Modalidad (ej: "En el establecimiento" o "A domicilio")

**Ejemplo de cálculo en backend:**
```typescript
const dateTime = new Date(booking.startAt).toLocaleDateString('es-CO', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
});

const startHour = new Date(booking.startAt).toLocaleTimeString('es-CO', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true
});

const endTime = new Date(new Date(booking.startAt).getTime() + service.durationMinutes * 60000);
const endHour = endTime.toLocaleTimeString('es-CO', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true
});

await this.mailService.sendBookingReminder({
  to: customer.email,
  businessName: professional.name,
  serviceName: service.name,
  dateTime: dateTime,
  timeRange: `${startHour} - ${endHour}`,
  duration: service.durationMinutes.toString(),
  price: `$${service.priceCents / 100}`,
  serviceMode: booking.atHome ? "A domicilio" : "En el establecimiento",
});
```

### Booking Rescheduled (booking-rescheduled.html)
**Enviado cuando una cita programada es reprogramada** ("Tu cita cambió de horario")

- `businessName` - Nombre del negocio/profesional
- `serviceName` - Nombre del servicio
- `oldDateTime` - Fecha y hora anterior (ej: "10 de septiembre · 10:00 a. m.")
- `newDateTime` - Fecha y hora nueva (ej: "12 de septiembre · 2:00 p. m.")
- `duration` - Duración en minutos (ej: "60")
- `price` - Precio del servicio (ej: "$30.000")
- `serviceMode` - Modalidad (ej: "En el establecimiento" o "A domicilio")

**Ejemplo de cálculo en backend:**
```typescript
const formatDateTimeForEmail = (date: Date) => {
  const datePart = new Date(date).toLocaleDateString('es-CO', { 
    month: 'long', 
    day: 'numeric' 
  });
  
  const timePart = new Date(date).toLocaleTimeString('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  return `${datePart} · ${timePart}`;
};

await this.mailService.sendBookingRescheduled({
  to: customer.email,
  businessName: professional.name,
  serviceName: service.name,
  oldDateTime: formatDateTimeForEmail(booking.previousStartAt),
  newDateTime: formatDateTimeForEmail(booking.startAt),
  duration: service.durationMinutes.toString(),
  price: `$${service.priceCents / 100}`,
  serviceMode: booking.atHome ? "A domicilio" : "En el establecimiento",
});
```

### Booking Cancelled (booking-cancelled.html)
**Enviado cuando una cita es cancelada por el profesional** ("Tu cita fue cancelada")

- `businessName` - Nombre del negocio/profesional
- `serviceName` - Nombre del servicio
- `cancellationDate` - Fecha de la cita cancelada (ej: "10 de septiembre de 2026 (Cancelada)")
- `timeRange` - Rango de hora (ej: "10:00 a. m. – 11:00 a. m.")
- `duration` - Duración en minutos (ej: "60")
- `price` - Precio del servicio (ej: "$30.000")
- `serviceMode` - Modalidad (ej: "En el establecimiento" o "A domicilio")
- `cancellationReason` - Motivo de la cancelación (ej: "Cambio de disponibilidad del profesional")

**Ejemplo de cálculo en backend:**
```typescript
const cancellationDate = new Date(booking.startAt).toLocaleDateString('es-CO', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
}) + ' (Cancelada)';

const startTime = new Date(booking.startAt).toLocaleTimeString('es-CO', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
});

const endTime = new Date(new Date(booking.startAt).getTime() + service.durationMinutes * 60000);
const endTimeStr = endTime.toLocaleTimeString('es-CO', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
});

await this.mailService.sendBookingCancelled({
  to: customer.email,
  businessName: professional.name,
  serviceName: service.name,
  cancellationDate: cancellationDate,
  timeRange: `${startTime} – ${endTimeStr}`,
  duration: service.durationMinutes.toString(),
  price: `$${service.priceCents / 100}`,
  serviceMode: booking.atHome ? "A domicilio" : "En el establecimiento",
  cancellationReason: "Cambio de disponibilidad del profesional", // Puede variar según el motivo
});
```

### Booking Reminder Upcoming (booking-reminder-upcoming.html)
**Recordatorio automático enviado 1 o 2 horas antes de la cita** ("⏰ Tu cita es en 1 hora")

- `businessName` - Nombre del negocio/profesional
- `businessInitial` - Inicial del nombre del negocio (ej: "C" para "Clandestino")
- `serviceName` - Nombre del servicio
- `appointmentDate` - Fecha de la cita (ej: "10 de septiembre de 2026")
- `appointmentTime` - Rango de hora (ej: "10:00 a. m. – 11:00 a. m.")
- `duration` - Duración en minutos (ej: "60")
- `price` - Precio del servicio (ej: "$30.000")
- `serviceMode` - Modalidad (ej: "En el establecimiento" o "A domicilio")
- `hoursBeforeAppointment` - Número de horas antes (1 o 2)
- `bookingUrl` - URL para ver detalles de la cita

**Ejemplo de cálculo en backend:**
```typescript
const appointmentDate = new Date(booking.startAt).toLocaleDateString('es-CO', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
});

const startTime = new Date(booking.startAt).toLocaleTimeString('es-CO', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
});

const endTime = new Date(new Date(booking.startAt).getTime() + service.durationMinutes * 60000);
const endTimeStr = endTime.toLocaleTimeString('es-CO', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
});

// Determinar si es 1h o 2h antes
const hoursBeforeAppointment = Math.round((booking.startAt - new Date()) / (1000 * 60 * 60));

await this.mailService.sendBookingReminderUpcoming({
  to: customer.email,
  businessName: professional.name,
  businessInitial: professional.name.charAt(0),
  serviceName: service.name,
  appointmentDate: appointmentDate,
  appointmentTime: `${startTime} – ${endTimeStr}`,
  duration: service.durationMinutes.toString(),
  price: `$${service.priceCents / 100}`,
  serviceMode: booking.atHome ? "A domicilio" : "En el establecimiento",
  hoursBeforeAppointment: hoursBeforeAppointment.toString(),
  bookingUrl: `${this.baseUrl}/booking/${booking.id}`,
});
```

### Password Reset (password-reset.html)
- `resetUrl` - URL para restablecer la contraseña (con token temporal)

Ejemplo: `https://app.agendya.app/reset-password?token=abc123xyz`

### Password Updated (password-updated.html)
- `dashboardUrl` - URL al dashboard después de cambiar contraseña
- `businessName` - Nombre del negocio
- `businessLogo` - URL de la imagen de perfil del negocio (circular, 32x32px)

Ejemplo: `https://app.agendya.app/dashboard`

### Plan Updated (plan-updated.html)
- `dashboardUrl` - URL al dashboard para ver detalles del plan
- `oldPlan` - Nombre del plan anterior (ej: "Gratis")
- `newPlan` - Nombre del nuevo plan (ej: "Básico")
- `changeDate` - Fecha del cambio (ej: "10 de octubre 2026")
- `renewalPrice` - Precio de renovación (ej: "$19.900 COP/mes")

**Ejemplo de cálculo en backend:**
```typescript
const professional = await this.prisma.professional.findUnique({ ... });
const changeDate = new Date().toLocaleDateString('es-CO', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
});

await this.mailService.sendPlanUpdated({
  to: professional.email,
  dashboardUrl: `${this.baseUrl}/dashboard`,
  oldPlan: "Gratis",
  newPlan: "Básico",
  changeDate: changeDate,
  renewalPrice: "$19.900 COP/mes",
});
```

### Payment Received (payment-received.html)
- `dashboardUrl` - URL al dashboard o historial de pagos
- `paymentDate` - Fecha del pago (ej: "10 de octubre 2026")
- `planName` - Nombre del plan (ej: "Básico")
- `amount` - Monto pagado (ej: "$19.900 COP")

**Ejemplo de cálculo en backend:**
```typescript
const paymentDate = new Date().toLocaleDateString('es-CO', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
});

await this.mailService.sendPaymentReceived({
  to: professional.email,
  dashboardUrl: `${this.baseUrl}/dashboard/billing`,
  paymentDate: paymentDate,
  planName: "Básico",
  amount: "$19.900 COP",
});
```

### Payment Failed (payment-failed.html)
- `dashboardUrl` - URL para actualizar método de pago
- `paymentDate` - Fecha del intento fallido (ej: "10 de octubre 2026")
- `planName` - Nombre del plan (ej: "Básico")
- `amount` - Monto intentado (ej: "$19.900 COP")

**Ejemplo de cálculo en backend:**
```typescript
const paymentDate = new Date().toLocaleDateString('es-CO', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
});

await this.mailService.sendPaymentFailed({
  to: professional.email,
  dashboardUrl: `${this.baseUrl}/dashboard/billing`,
  paymentDate: paymentDate,
  planName: "Básico",
  amount: "$19.900 COP",
});
```

### Subscription Cancelled (subscription-cancelled.html)
- `dashboardUrl` - URL para reactivar el plan
- `planName` - Nombre del plan cancelado (ej: "Básico")
- `cancellationDate` - Fecha hasta la cual tiene acceso (ej: "10 de octubre 2026")

**Ejemplo de cálculo en backend:**
```typescript
const cancellationDate = new Date().toLocaleDateString('es-CO', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
});

await this.mailService.sendSubscriptionCancelled({
  to: professional.email,
  dashboardUrl: `${this.baseUrl}/dashboard/plans`,
  planName: "Básico",
  cancellationDate: cancellationDate,
});
```

### Plan Limit Alert (plan-limit-alert.html)
- `currentBookings` - Número de reservas actuales (ej: 27)
- `maxBookings` - Límite de reservas en el plan (ej: 30)
- `barWidth` - **IMPORTANTE**: Ancho de la barra de progreso en pixels. Calcular en backend como: `Math.round((currentBookings / maxBookings) * 555)` (555px es el ancho del contenedor)
- `upgradeUrl` - URL para ver planes disponibles

**Ejemplo de cálculo en backend:**
```typescript
const currentBookings = 27;
const maxBookings = 30;
const barWidth = Math.round((currentBookings / maxBookings) * 555); // = 498px

await this.mailService.sendPlanLimitAlert({
  to: professional.email,
  currentBookings: 27,
  maxBookings: 30,
  barWidth: barWidth,
  upgradeUrl: `${this.baseUrl}/pricing`,
});
```

### Services Limit Alert (services-limit-alert.html)
- `currentServices` - Número de servicios creados (ej: 2)
- `maxServices` - Límite de servicios en el plan (ej: 3)
- `barWidth` - **IMPORTANTE**: Ancho de la barra de progreso en pixels. Calcular en backend como: `Math.round((currentServices / maxServices) * 555)` (555px es el ancho del contenedor)
- `upgradeUrl` - URL para ver planes disponibles

**Ejemplo de cálculo en backend:**
```typescript
const currentServices = 2;
const maxServices = 3;
const barWidth = Math.round((currentServices / maxServices) * 555); // = 370px

await this.mailService.sendServicesLimitAlert({
  to: professional.email,
  currentServices: 2,
  maxServices: 3,
  barWidth: barWidth,
  upgradeUrl: `${this.baseUrl}/pricing`,
});
```

**Nota:** Ambas alertas usan la misma lógica de barra de progreso dinámica.

### Plan Full Alert (plan-full-alert.html)
- `currentBookings` - Número de reservas actuales (ej: 30)
- `maxBookings` - Límite de reservas en el plan (ej: 30)
- `currentServices` - Número de servicios creados (ej: 3)
- `maxServices` - Límite de servicios en el plan (ej: 3)
- `upgradeUrl` - URL para ver planes disponibles

**Nota especial:** Este template muestra AMBAS métricas (reservas y servicios) con sus barras de progreso llenas al 100%. Se envía cuando el usuario alcanza el límite máximo en AMBAS categorías.

**Ejemplo de cálculo en backend:**
```typescript
const currentBookings = 30;
const maxBookings = 30;
const currentServices = 3;
const maxServices = 3;

await this.mailService.sendPlanFullAlert({
  to: professional.email,
  currentBookings: 30,
  maxBookings: 30,
  currentServices: 3,
  maxServices: 3,
  upgradeUrl: `${this.baseUrl}/pricing`,
});
```

**Jerarquía de alertas recomendada:**
1. `plan-limit-alert.html` — Cuando reservas cercanas al límite (~90%)
2. `services-limit-alert.html` — Cuando servicios cercanos al límite (~90%)
3. `plan-full-alert.html` — Cuando AMBOS llegan a 100% (estado crítico)

## Testing Local

Mientras configuras Resend:
1. Los templates locales se guardan en `templates/`
2. El `MailService` puede ser extendido para renderizar HTML localmente durante dev
3. Usa `npx prisma studio` para probar con datos reales

## Notas
- Los estilos están optimizados para clientes de email (Outlook, Gmail, etc.)
- Todos los estilos son inline para máxima compatibilidad
- Las imágenes usan SVG inline (sin dependencias externas)
- Los templates son responsive (mobile-first)

## Obtener la URL del logo desde la BD

El logo del profesional se guarda en la tabla `Professional` de Prisma. Ejemplo:

```typescript
// En el controller o service que envía emails
const professional = await this.prisma.professional.findUnique({
  where: { id: professionalId },
  select: { logoUrl: true, name: true }, // logoUrl es la URL en Cloudinary
});

// Luego al llamar MailService:
await this.mailService.sendWelcome({
  to: professional.email,
  professionalLogoUrl: professional.logoUrl, // Puede ser null si no tiene logo
  businessName: professional.name,
});
```

**Si no tiene logo:** Puedes usar un fallback (una imagen por defecto o un avatar genérico):
```typescript
const logoUrl = professional.logoUrl || `https://ui-avatars.com/api/?name=${professional.name}&background=4f46e5&color=fff`;
```

## Troubleshooting

### Los emails no se ven bien en Outlook?
- Resend compila automáticamente los templates
- Asegúrate de usar solo estilos inline

### Variables no se reemplazan?
- Verifica que el nombre de la variable en el template coincida con el que envías
- Usa `{{variableName}}` en el HTML

### El avatar no aparece?
- Verifica que la URL esté en HTTPS
- Verifica que sea accesible públicamente (no requiera autenticación)
- Resend descarga la imagen en el momento del envío

### URLs no funcionan?
- Asegúrate que `publicWebUrl` esté configurado en `.env` del API
- Ejemplo: `publicWebUrl=https://app.agendya.app`

### El avatar está pegado a la línea separadora?
- Los templates ya tienen padding (32px) para separación correcta
- Si se ve pegado en algunos clientes, puede ser una limitación del cliente de email
