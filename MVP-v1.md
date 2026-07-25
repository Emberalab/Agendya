---
type: proyecto-personal
status: planning
phase: mvp-v1
category: web-app
tech-stack: TBD
created: 2026-06-10
tags: [personal, mvp, booking, beauty-services, validation]
---

# 💇 MVP V1 – Plataforma de Gestión de Citas para Profesionales de Belleza Independientes

> Primera versión enfocada en validación del producto con funcionalidad esencial

---

## 🎯 Problema que Queremos Resolver

Los profesionales de belleza independientes (barberos, peluqueros, manicuristas, esteticistas, maquilladores, entre otros) suelen gestionar sus citas mediante:
- ☎️ Llamadas telefónicas
- 💬 Mensajes de WhatsApp
- 📱 Instagram o redes sociales

**Consecuencias**:
- ⏰ Pérdida de tiempo
- ❌ Errores de comunicación
- 🔴 Horarios ocupados por error
- 😓 Dificultad para organizar la agenda diaria

**Solución**: La plataforma permitirá que los clientes consulten disponibilidad real y reserven en pocos pasos, mientras el profesional tiene control total desde un panel administrativo.

---

## 🎯 Objetivo del MVP

**Validar que**:
1. Los profesionales de belleza independientes están dispuestos a usar una herramienta digital para administrar sus citas
2. Los clientes prefieren reservar directamente desde un enlace vs coordinar manualmente por mensajes

---

## 💇 Qué Podrá Hacer el Profesional

### 1. Registro y Acceso

- ✅ Crear una cuenta profesional
- ✅ Iniciar sesión en la plataforma

---

### 2. Perfil Profesional

**Configuración básica**:
- ✅ Nombre del negocio o nombre profesional
- ✅ Fotografía de perfil
- ✅ Descripción breve del servicio
- ✅ **Enlace público de reservas**

**Ejemplo de enlace**:
```
ronda.com/maria-belleza
```

Cada profesional tendrá su propio enlace único para compartir con sus clientes.

---

### 3. Gestión de Servicios

**Crear servicios con**:
- ✅ Nombre del servicio
- ✅ Duración estimada

**Ejemplos de servicios** (varían según el tipo de profesional):
| Servicio | Duración |
|----------|----------|
| Corte de cabello | 30 minutos |
| Arreglo de barba | 20 minutos |
| Manicure | 45 minutos |
| Peinado | 40 minutos |
| Tratamiento facial | 60 minutos |

El profesional define libremente sus propios servicios y duraciones — la plataforma no impone un catálogo fijo, ya que cada rubro (barbería, peluquería, manicura, estética, etc.) tiene servicios distintos.

---

### 4. Gestión de Horarios

**Configuración de disponibilidad**:
- ✅ Configurar horario laboral (ej: Lunes a Sábado, 9am - 7pm)
- ✅ Definir días de descanso (ej: Domingos)
- ✅ Bloquear fechas específicas cuando no esté disponible

**Ejemplos de bloqueos**:
- 🏖️ Vacaciones
- 👨‍⚕️ Citas personales
- 🎉 Eventos especiales
- 🏠 Días libres

---

### 5. Gestión de Reservas

**Vista de agenda**:
- ✅ Ver citas programadas
- ✅ Consultar agenda diaria
- ✅ Consultar agenda semanal
- ✅ Cancelar reservas cuando sea necesario

**Panel con**:
- Listado de citas del día
- Información del cliente (nombre, teléfono)
- Servicio solicitado
- Hora de la cita
- Estado de la reserva

---

### 6. Configuración de Cancelaciones

**Política de cancelación**:

El profesional podrá definir **cuántas horas antes** un cliente puede cancelar una cita.

**Opciones**:
- ⏰ 2 horas antes
- ⏰ 6 horas antes
- ⏰ 12 horas antes
- ⏰ 24 horas antes

El sistema impedirá cancelaciones fuera del tiempo permitido.

---

## 👤 Qué Podrá Hacer el Cliente

### 1. Reservar una Cita

**Sin necesidad de crear cuenta** (experiencia simple)

**Proceso de reserva**:
1. Cliente ingresa al enlace del profesional (ej: `ronda.com/maria-belleza`)
2. Proporciona información básica:
   - ✅ Nombre
   - ✅ Número de celular
3. Ve los servicios disponibles
4. Ve horarios disponibles en calendario
5. Selecciona fecha y hora deseada
6. Confirma la reserva

**Resultado**: Cliente recibe confirmación inmediata.

---

### 2. Consultar Información del Profesional

**Información visible**:
- 👤 Nombre del profesional
- 📝 Descripción del servicio
- 💇 Servicios ofrecidos
- ⏱️ Duración de cada servicio
- 🕒 Horarios de atención

---

### 3. Cancelar una Reserva

**Condiciones**:
- ✅ Podrá cancelar la cita siempre que esté **dentro del tiempo permitido** por el profesional
- ❌ No podrá cancelar si ya pasó el límite de tiempo configurado

**Ejemplo**:
- Política del profesional: 6 horas antes
- Cita programada: Mañana 10:00 AM
- Cliente puede cancelar hasta: Mañana 4:00 AM

---

## 🤖 Qué Hará el Sistema (Automático)

### 1. Gestión Automática de Disponibilidad

**El sistema impedirá**:
- ❌ Reservas duplicadas (mismo horario, mismo profesional)
- ❌ Horarios ya ocupados
- ❌ Reservas durante descansos configurados
- ❌ Reservas en fechas bloqueadas (vacaciones, días libres)

**Lógica inteligente**:
- Si un servicio dura 30 minutos y se reserva a las 2:00 PM, el siguiente horario disponible será 2:30 PM o después.

---

### 2. Confirmación Automática

**Cuando una cita sea creada**:
- ✅ Cliente recibe confirmación con detalles:
  - Nombre del profesional
  - Servicio reservado
  - Fecha y hora
  - Ubicación (si aplica)
  - Enlace para cancelar
- ✅ Profesional recibe notificación de nueva reserva

**Canales de notificación** (por definir):
- Email
- SMS
- WhatsApp (API)

---

### 3. Recordatorios Automáticos

**Objetivo**: Reducir ausencias (no-shows)

**Recordatorios enviados**:
- 📅 **24 horas antes**: "Tienes una cita mañana a las X"
- ⏰ **2 horas antes**: "Tu cita es en 2 horas"

**Información incluida**:
- Fecha y hora
- Servicio
- Nombre del profesional
- Opción para cancelar (si está dentro del tiempo permitido)

---

## ⛔ Lo que NO Estará Incluido en el MVP

Para mantener el alcance controlado y validar rápidamente el producto:

### ❌ Pagos
- Sin anticipos
- Sin Nequi
- Sin pasarelas de pago (Stripe, PayPal, etc.)
- Sin comprobantes de pago

**Razón**: El MVP valida la gestión de agenda, no procesamiento de dinero.

---

### ❌ Marketplace
- Sin búsqueda de profesionales
- Sin rankings
- Sin recomendaciones
- Sin perfiles públicos en directorio

**Acceso**: Los clientes accederán **únicamente mediante el enlace compartido por el profesional** (ej: Instagram bio, WhatsApp status, tarjeta de presentación).

---

### ❌ Chat
- Sin mensajería interna
- Sin conversaciones entre cliente y profesional
- Sin notificaciones de chat

**Razón**: La comunicación puede seguir ocurriendo por WhatsApp si es necesario. El MVP se enfoca en reservas.

---

### ❌ Calificaciones
- Sin sistema de reseñas
- Sin puntuaciones (⭐)
- Sin comentarios de clientes

**Razón**: Validar primero que la herramienta sea útil antes de agregar social proof.

---

### ❌ Estadísticas Avanzadas
- Sin reportes avanzados
- Sin métricas de crecimiento
- Sin gráficos de ocupación
- Sin análisis de ingresos

**Incluido**: Solo vista básica de agenda (citas del día/semana).

---

### ❌ Gestión de Empleados
- Un profesional administra **únicamente su propia agenda**
- Sin múltiples profesionales por negocio
- Sin gestión de equipo
- Sin roles y permisos

**Razón**: MVP enfocado en profesionales de belleza **independientes** (solopreneurs).

---

### ❌ Inteligencia Artificial
- Sin sugerencias automáticas de horarios
- Sin optimización de agenda
- Sin recomendaciones personalizadas
- Sin predicción de cancelaciones

**Razón**: Agregar complejidad innecesaria para la validación inicial.

---

## 📋 User Stories (MVP V1)

### Como Profesional

**US-001**: Como profesional, quiero crear mi cuenta profesional para empezar a usar la plataforma.

**US-002**: Como profesional, quiero configurar mis servicios (nombre y duración) para que los clientes los vean al reservar.

**US-003**: Como profesional, quiero configurar mis horarios de trabajo para que solo se puedan reservar citas en esos horarios.

**US-004**: Como profesional, quiero bloquear días específicos para que no se puedan hacer reservas cuando estoy de vacaciones.

**US-005**: Como profesional, quiero ver mi agenda diaria para saber qué citas tengo hoy.

**US-006**: Como profesional, quiero ver mi agenda semanal para planificar mejor mi tiempo.

**US-007**: Como profesional, quiero tener un enlace único para compartir con mis clientes.

**US-008**: Como profesional, quiero cancelar una cita cuando sea necesario.

**US-009**: Como profesional, quiero recibir notificaciones cuando un cliente haga una reserva.

**US-010**: Como profesional, quiero configurar el tiempo mínimo de cancelación para evitar pérdidas.

---

### Como Cliente

**US-011**: Como cliente, quiero ver los servicios disponibles de un profesional para decidir cuál necesito.

**US-012**: Como cliente, quiero ver los horarios disponibles en un calendario para elegir el que me convenga.

**US-013**: Como cliente, quiero reservar una cita sin tener que crear cuenta para que sea rápido y fácil.

**US-014**: Como cliente, quiero recibir confirmación de mi reserva para tener la tranquilidad de que quedó agendada.

**US-015**: Como cliente, quiero recibir recordatorios de mi cita para no olvidarla.

**US-016**: Como cliente, quiero poder cancelar mi cita si surge un inconveniente.

**US-017**: Como cliente, quiero ver la información del profesional (nombre, descripción) para conocer más sobre su servicio.

---

## 🎨 Wireframes Pendientes

- [ ] Pantalla de registro de profesional
- [ ] Dashboard del profesional
- [ ] Configuración de servicios
- [ ] Configuración de horarios
- [ ] Vista de agenda (diaria/semanal)
- [ ] Página pública de reservas del profesional
- [ ] Flujo de reserva del cliente
- [ ] Confirmación de cita
- [ ] Pantalla de cancelación

---

## 🛠️ Stack Tecnológico (Por Definir)

### Opciones a Considerar

**Frontend**:
- Next.js 14 (App Router) - Full-stack React framework
- Tailwind CSS - Styling
- shadcn/ui - Component library

**Backend**:
- Next.js API Routes
- O Firebase Functions
- O Supabase Functions

**Base de Datos**:
- PostgreSQL (Supabase)
- O Firebase Firestore
- O MongoDB

**Autenticación**:
- NextAuth.js
- O Clerk
- O Firebase Auth

**Notificaciones**:
- Resend (emails)
- Twilio (SMS)
- WhatsApp Business API

**Hosting**:
- Vercel (Next.js)
- O Railway
- O Render

> Nota: el stack definitivo y aprobado para el proyecto vive en [[Stack-Tecnologico]] (React + TypeScript + NestJS + Prisma + PostgreSQL). Esta sección queda como registro histórico de las opciones evaluadas.

---

## 📊 Métricas de Validación del MVP

**Objetivo**: Validar Product-Market Fit

**Métricas clave**:
- 📈 Número de profesionales que completan el registro
- 📈 Número de servicios configurados por profesional
- 📈 Número de reservas realizadas por clientes
- 📈 Tasa de cancelación de citas
- 📈 Feedback cualitativo de profesionales (entrevistas)
- 📈 Feedback cualitativo de clientes (si es posible)

**Meta del MVP**:
- Conseguir 5-10 profesionales usando la plataforma activamente
- Lograr 50+ reservas completadas
- Obtener feedback valioso para iteraciones futuras

---

## ⏱️ Timeline Estimado

**Fase 1: Diseño y Arquitectura** (1 semana)
- [ ] Definir stack tecnológico
- [ ] Diseñar modelo de datos
- [ ] Crear wireframes básicos
- [ ] Definir arquitectura del sistema

**Fase 2: Desarrollo del Core** (3-4 semanas)
- [ ] Setup del proyecto
- [ ] Sistema de autenticación (profesional)
- [ ] CRUD de servicios
- [ ] Configuración de horarios
- [ ] Sistema de calendario
- [ ] Lógica de disponibilidad

**Fase 3: Reservas y Confirmaciones** (2 semanas)
- [ ] Página pública de profesional
- [ ] Flujo de reserva (sin auth)
- [ ] Confirmaciones automáticas
- [ ] Sistema de cancelaciones
- [ ] Notificaciones básicas

**Fase 4: Testing y Deploy** (1 semana)
- [ ] Testing manual completo
- [ ] Correcciones de bugs
- [ ] Deploy a producción
- [ ] Documentación básica

**Total estimado**: 7-8 semanas (2 meses aprox)

---

## 🚀 Próximos Pasos Inmediatos

### Decisiones Técnicas
- [x] Elegir stack tecnológico definitivo → Ver [[Stack-Tecnologico]]
- [ ] Definir arquitectura de base de datos
- [ ] Elegir proveedor de notificaciones

### Diseño
- [ ] Crear wireframes en Figma
- [ ] Definir paleta de colores
- [ ] Diseñar logo básico

### Preparación
- [ ] Crear repositorio en GitHub
- [ ] Setup del proyecto base
- [ ] Configurar linters y formatters
- [ ] Documentar convenciones de código

---

## 💡 Consideraciones Importantes

### Simplicidad es Clave
- Resistir la tentación de agregar features "nice to have"
- Enfocarse en el flujo core: Configurar → Compartir enlace → Recibir reservas
- La experiencia debe ser **más simple que coordinar por WhatsApp**

### Mobile First
- La mayoría de clientes reservarán desde celular
- El profesional también revisará su agenda desde el móvil
- Diseño responsive es crítico

### Onboarding Rápido
- El profesional debe poder configurar todo en **menos de 10 minutos**
- El cliente debe poder reservar en **menos de 2 minutos**

### Validación Antes de Escalar
- No agregar features hasta validar que el core funciona
- Hablar con usuarios reales (profesionales de belleza) antes, durante y después del desarrollo
- Iterar basado en feedback real, no en suposiciones

---

## 🔗 Links Relacionados

- [[Plataforma-Reservas-Servicios]] - Visión completa del producto
- [[Fase-2-Retencion]] - Siguiente fase: CRM y anticipos
- [[Proyecto Personal]] - Índice de proyectos personales

---

## 📝 Notas de Desarrollo

**Fecha de inicio**: 2026-06-10
**Estado actual**: Planificación
**Próxima reunión**: TBD
**Repo**: TBD

---

**Estado**: 🟡 Planificación
**Última actualización**: 2026-07-24
**Volver**: [[Plataforma-Reservas-Servicios]] | [[Proyecto Personal]]
