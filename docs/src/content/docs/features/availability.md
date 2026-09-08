---
title: Disponibilidad
description: >-
  El algoritmo de espacios libres basado en grilla de
  AvailabilityService.getAvailableSlots — paso a paso.
---

**Endpoint:** `GET /public/professionals/:slug/availability?serviceIds=&date=&atHome=`
(sin autenticar, `@Throttle 30/60s`).
**Esquema de query:** `availabilityQuerySchema` — `serviceIds` separados por
coma, `date` `YYYY-MM-DD`, `atHome` la cadena `"true"`/`"false"` → booleano.
**Respuesta:** `{ slots: string[] }` — instantes UTC ISO-8601, cada uno una hora
de *inicio* válida.
**Código:** `apps/api/src/modules/schedules/availability.service.ts`.

## Algoritmo

```mermaid
flowchart TB
  A["resolver profesional por id (404 si no hay)"] --> B["cargar servicios seleccionados<br/>(activos, propios; 404 si falta alguno)"]
  B --> C["totalDurationMinutes =<br/>Σ (atHome ? homeDurationMinutes ?? durationMinutes : durationMinutes)"]
  C --> D["workingBlocks = WorkingHour donde<br/>dayOfWeek = weekdayFromDateString(date), ordenados por startMinute"]
  D --> E{"¿sin bloques?"}
  E -->|sí| Z["devolver []"]
  E -->|no| F{"¿ScheduleException para (profesional, fecha)?"}
  F -->|sí| Z
  F -->|no| G["dayStart/dayEnd = zonedInstant(date, 0 / 1440, tz)"]
  G --> H["busyRanges = reservas CONFIRMED que solapan [dayStart, dayEnd)"]
  H --> I["para cada bloque: for start = block.startMinute;<br/>start + total ≤ block.endMinute; start += SLOT_GRID_MINUTES"]
  I --> J["slotStart = zonedInstant(date, start, tz)"]
  J --> K{"¿slotStart ≤ ahora?"}
  K -->|sí| skip1["saltar"]
  K -->|no| L{"¿[slotStart, slotStart+total) solapa algún busyRange?"}
  L -->|sí| skip2["saltar"]
  L -->|no| M["push slotStart.toISOString()"]
```

## Entradas que dan forma al resultado

| Entrada | Efecto |
| --- | --- |
| `serviceIds` | La suma de duraciones fija cuánto espacio contiguo necesita un slot. Cualquier id desconocido/inactivo → `404`. |
| `atHome=true` | Usa el `homeDurationMinutes` de cada servicio cuando está definido (cae de vuelta a `durationMinutes`). Nota: el endpoint de disponibilidad **no** rechaza por sí mismo los servicios donde `homeServiceEnabled` es false — esa comprobación ocurre al reservar. |
| `date` | Elige los bloques de horario de ese día de la semana; un `ScheduleException` que coincida anula el día. |
| Env `SLOT_GRID_MINUTES` (por defecto `15`) | Paso de la grilla — los inicios candidatos son `block.start`, `+grid`, `+2·grid`, … |
| `timezone` del profesional | `zonedInstant` mapea cada minuto de hora de pared al instante UTC correcto sin importar la TZ del servidor. |
| Reservas `CONFIRMED` existentes | El test de solapamiento semiabierto `slotStart < busyEnd && slotEnd > busyStart` elimina conflictos. |
| `now` | Los slots pasados se descartan. |

## Vale la pena saber

- Solo las reservas `CONFIRMED` cuentan como ocupado. `CANCELLED` /
  `COMPLETED` / `EXPIRED` liberan su tiempo.
- Un slot debe caber **por completo** dentro de un único bloque de horario — el
  algoritmo nunca abarca dos bloques ni cruza un descanso.
- La lista es orientativa. La reserva revalida todo en el servidor
  (`assertSlotWithinSchedule` + una guarda de solapamiento `Serializable`), así
  que un slot que se mostró pero fue tomado mientras tanto falla limpiamente con
  `"Ese horario ya no está disponible."`.

## Frontend

`useAvailability` (`modules/publicBooking/hooks`) consulta este endpoint con
clave `(slug, serviceIds, date, atHome)`; `SlotGrid.tsx` renderiza las cadenas
ISO devueltas como horas seleccionables en la timezone del profesional.
