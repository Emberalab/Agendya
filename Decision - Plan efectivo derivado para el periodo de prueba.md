---
type: decision-tecnica
proyecto: agendya
estado: aceptada
fecha: 2026-09-30
rama: AG-178-desarrollar-funcionalidad-para-periodo-de-prueba-30-dias-acceso-full
tags: [decision-tecnica, planes, trial]
---

# 🧭 Decisión Técnica: Plan efectivo derivado para el período de prueba

## Contexto

Se necesitaba una prueba de 30 días con acceso completo para cuentas
seleccionadas, que al terminar vuelva sola al plan Gratuito sin intervención
manual y sin borrar datos. Agendya ya tenía un sistema de planes en
`Professional` (plan, ciclo, vencimiento, cancelación, job horario de
vencimiento) y una regla establecida para datos que exceden el plan: bloquear
servicios (`planLocked`), nunca borrarlos. Ver [[Estado de Implementacion]].

## Opciones consideradas

1. **Poner `plan = BUSINESS` con `planExpiresAt`** durante la prueba. Mezcla la
   prueba con un plan pagado: aplicaría los 3 días de gracia, la cancelación y
   el checkout lo trataría como plan pagado.
2. **Campo de estado de prueba + cron que lo cambie** al vencer. Estado
   redundante y el acceso dependería de que el cron corra.
3. **Dos fechas en `Professional` y plan efectivo derivado.** El acceso se
   calcula en cada lectura: `trialStartedAt <= now < trialEndsAt`.

## Decisión

Opción 3. `trialStartedAt` / `trialEndsAt` en `Professional` y
`effectivePlan()` en `@agendya/types` como única regla, usada por todos los
límites del API. `plan` sigue siendo el plan facturado. La duración vive en
`TRIAL_DURATION_DAYS`.

Las acciones de admin se auditan en una tabla propia `TrialEvent`, porque el
`AuditLog` del Backoffice (AG-171) exige un `InternalUser` que no existe en `dev`.

## Consecuencias

- Positivas:
  - El vencimiento no depende de un cron ni de que el usuario entre.
  - Un pago durante la prueba no se pisa: al terminar aplica el plan pagado.
  - `trialStartedAt` marca la prueba como usada; repetirla exige excepción explícita.
  - Sin consultas extra: `JwtStrategy` ya carga el `Professional` completo.
- Negativas / trade-offs:
  - `Service.planLocked` es estado persistido, así que sigue haciendo falta un
    barrido horario (`TrialExpiryScheduler`) para bloquear servicios sobrantes
    tras el vencimiento. Mira solo los últimos 7 días.
  - Cada punto de bloqueo/desbloqueo de servicios debe usar
    `enforceEffectiveServiceLimit`, no el plan facturado.
  - Al integrar AG-171 habrá que migrar la auditoría a su `AuditLog`.

## Relacionado

- [[Estado de Implementacion]]
- [[Arquitectura-Tecnica]]
- [[Stack-Tecnologico]]
