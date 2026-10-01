---
title: Actividad de profesionales (Backoffice)
description: >-
  Panel interno para entender, con datos reales, cómo usó Agendya un
  profesional durante su prueba de 30 días.
---

El Backoffice (`apps/backoffice-web`, «Pruebas» y «Ver actividad» en la vista
360° de un profesional) muestra qué hizo una cuenta durante su
[periodo de prueba](/features/admin-panel/#período-de-prueba). Solo hechos: no
hay puntaje de «engagement».

## Tres capas separadas

| Pregunta | Fuente |
| --- | --- |
| ¿Qué hizo el equipo interno? | `AuditLog` (sin cambios; ahora también registra `SUPPORT_VIEWED_PROFESSIONAL_ACTIVITY`) |
| ¿Cómo usa Agendya el profesional? | [`ProfessionalActivityEvent`](/database/models/#professionalactivityevent) |
| ¿Qué pasó en su negocio? | Se calcula al vuelo desde `Booking`, `Service`, `WorkingHour`, `ScheduleException`, `Notification`, `PushSubscription` y `SupportTicket` — no hay contadores guardados |

## Qué se registra

`apps/api` (`modules/activity/activity.service.ts`) escribe un evento después de
cada acción persistida: creación de cuenta, inicio de sesión, restablecimiento
de contraseña, una visita al panel por día (en `GET /professionals/me`), cambios
de perfil, servicios (crear, editar con antes/después, eliminar), guardado del
horario semanal (antes/después), fechas bloqueadas y desbloqueadas, citas
(creada en línea o manual, modificada, **reprogramada** con la fecha anterior y
la nueva, cancelada, completada) y activación/desactivación de push.

No se guarda nada del cliente (nombre, correo, teléfono, dirección, nota) ni
credenciales. Las descripciones e imágenes solo se marcan como «actualizadas».
Una acción rechazada no deja evento.

Al crearse la tabla, la migración reconstruyó lo que los datos existentes
permiten probar (cuentas, servicios creados/eliminados, horario vigente, fechas
bloqueadas vigentes, citas creadas/canceladas, dispositivos push), marcado
`backfilled` y mostrado como «reconstruido». Las reprogramaciones, ediciones,
inicios de sesión y visitas anteriores **no existen** y no se inventan.

## API (`apps/backoffice-api`)

Todas exigen token interno (`InternalJwtAuthGuard`, audiencia del Backoffice) y
el permiso `VIEW` (cualquier rol interno). No hay ruta equivalente en `apps/api`.

| Ruta | Qué devuelve |
| --- | --- |
| `GET /backoffice/trials?status=ACTIVE\|ENDED\|ALL` | Cuentas con prueba, última actividad y citas creadas durante la prueba |
| `GET /backoffice/professionals/:id/activity` | Línea de tiempo paginada (cursor). Filtros: `trialOnly`, `from`, `to`, `category`, `type`, `actor`, `entityId`, `search`, `order` |
| `GET /backoffice/professionals/:id/activity/summary` | Resumen de la prueba, citas, clientes, configuración, uso, compromiso, primeros pasos y actividad diaria. Queda en `AuditLog` |

Las métricas «del periodo» usan la ventana de la prueba (inicio → fin, o hasta
hoy si sigue activa); sin prueba, los últimos 30 días. «Días con actividad»
cuenta días (zona horaria del profesional) con al menos una acción propia.
«Clientes distintos» se cuenta por teléfono de la reserva.
