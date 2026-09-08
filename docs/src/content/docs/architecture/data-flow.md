---
title: Flujo de datos
description: >-
  Dos ejemplos completos de extremo a extremo — un cliente que crea una reserva
  y un profesional que carga su agenda.
---

## Ejemplo 1 — un cliente crea una reserva

```mermaid
sequenceDiagram
  autonumber
  actor C as Cliente (navegador)
  participant W as BookingWizard (React)
  participant H as useCreateBooking (TanStack Query)
  participant AC as apiClient
  participant Ctl as BookingsCreateController
  participant Zod as ZodValidationPipe(createBookingSchema)
  participant Svc as BookingsService
  participant DB as PostgreSQL (Prisma)
  participant M as MailService (Resend)

  C->>W: elige servicios, fecha, espacio, datos de contacto
  W->>H: mutate(CreateBookingInput)
  H->>AC: createPublicBooking(slug, input)
  AC->>Ctl: POST /public/professionals/:slug/bookings
  Note over Ctl: @Throttle 10 / 60s
  Ctl->>Zod: validar el cuerpo
  Zod-->>Ctl: input parseado  (400 si falla)
  Ctl->>Svc: createPublicBooking(slug, input)
  Svc->>DB: buscar profesional activo por slug  (404 si no hay)
  Svc->>DB: resolver servicios, sumar duración, aplicar reglas a domicilio
  Svc->>Svc: rechazar si startAt está en el pasado
  Svc->>DB: assertSlotWithinSchedule (horario + excepción)
  Svc->>DB: tx SERIALIZABLE: chequeo de solapamiento → INSERT reserva (reintento x3 ante 40001/P2034)
  DB-->>Svc: Booking (status CONFIRMED, cancellationToken)
  Svc->>M: sendBookingConfirmation(...)  (registra en log si no está configurado)
  Svc-->>Ctl: DTO PublicBooking
  Ctl-->>AC: 201 JSON
  AC-->>H: { data }
  H-->>W: onSuccess → mostrar BookingConfirmedView
```

Puntos clave:

- **La validación ocurre dos veces a propósito** — el asistente valida con el
  esquema Zod por UX, la API revalida el mismo esquema por confianza.
- **La puerta de espacio es autoritativa en el servidor.** La lista de
  disponibilidad que mostró el asistente puede estar obsoleta;
  `assertSlotWithinSchedule` + el chequeo de solapamiento serializable son lo
  que realmente evita una reserva doble.
- **El correo nunca bloquea la respuesta ante un fallo** — `MailService.send`
  captura y registra.
- Las reservas nuevas se crean `CONFIRMED` (`@default(CONFIRMED)` en el modelo).
  `PENDING` existe en el enum pero ningún flujo actual lo asigna.

## Ejemplo 2 — un profesional carga la agenda

```mermaid
sequenceDiagram
  autonumber
  actor P as Profesional (navegador)
  participant AP as AgendaPage
  participant H as useAgenda
  participant AC as apiClient
  participant G as JwtAuthGuard → JwtStrategy
  participant Ctl as BookingsController
  participant Svc as BookingsService
  participant DB as PostgreSQL

  P->>AP: abre /dashboard/agenda (rango de fechas)
  AP->>H: useQuery(['agenda', from, to])
  H->>AC: listAgenda(from, to)
  AC->>Ctl: GET /bookings?from=…&to=…  (Authorization: Bearer <JWT>)
  Ctl->>G: validar el token
  G->>DB: professional.findUnique(sub)  → comprobar isActive
  G-->>Ctl: request.user = Professional
  Ctl->>Svc: listAgenda(user.id, from, to)
  Svc->>DB: professional.findUniqueOrThrow (para la timezone)
  Svc->>DB: booking.findMany({ professionalId, startAt en [zonedInstant(from,0), zonedInstant(to,24h)) }) ORDER BY startAt
  DB-->>Svc: filas
  Svc-->>Ctl: AgendaBooking[]  (canReschedule calculado por fila vía booking-policy)
  Ctl-->>AC: 200 JSON
  AC-->>H: caché + render de la lista
```

- Los parámetros de query `from`/`to` son fechas de calendario (`YYYY-MM-DD`);
  el servicio los convierte en instantes absolutos **en la timezone del
  profesional** antes de consultar.
- `canReschedule` / `canCancel` en cada fila los derivan los predicados puros de
  `booking-policy.ts`, así que la UI puede deshabilitar botones sin una ida y
  vuelta — pero los endpoints de mutación revalidan las mismas reglas.

## La forma genérica

```
Usuario → React → hook → api.ts → apiClient(+JWT)
        → Controller (guard, ZodValidationPipe)
        → Service (propiedad + política + tx)
        → Prisma → PostgreSQL
        → mapeador de DTO → JSON → caché → render
```
