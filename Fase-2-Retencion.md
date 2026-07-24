---
type: proyecto-personal
status: planning
phase: fase-2
category: web-app
tech-stack: TBD
created: 2026-06-10
tags: [personal, mvp, booking, retention, crm]
---

# 🔁 Fase 2 - Gestión de Clientes y Reducción de Cancelaciones

> Ayudar al profesional a reducir ausencias, administrar mejor a sus clientes y obtener información sobre el crecimiento de su negocio

---

## 🎯 Objetivo de la Fase

**Problema a resolver**: Después de validar que el MVP funciona, los profesionales necesitan:
1. Reducir las ausencias (no-shows) de clientes
2. Entender mejor su negocio con datos reales
3. Identificar y retener clientes frecuentes
4. Tener mayor control sobre las reservas con anticipos

**Esta fase convierte la plataforma de "agenda digital" a "herramienta de gestión de negocio".**

---

## 💼 Nuevas Funcionalidades para el Profesional

### 1. Gestión de Clientes (CRM Básico)

**Sistema automático de base de clientes**

La plataforma construirá automáticamente un directorio de clientes cada vez que alguien haga una reserva.

#### Información de cada cliente:

| Campo | Descripción |
|-------|-------------|
| 👤 **Nombre** | Nombre del cliente |
| 📱 **Teléfono** | Número de contacto |
| 📅 **Historial de citas** | Todas las reservas (pasadas y futuras) |
| 🕒 **Fecha de última visita** | Para identificar clientes inactivos |
| 🔢 **Cantidad de reservas** | Total de citas realizadas |
| 📝 **Notas privadas** | Observaciones del profesional |

#### Vista de clientes:

- 📋 Listado completo de clientes
- 🔍 Búsqueda por nombre o teléfono
- 📊 Ordenar por: última visita, total de reservas, nombre
- 👁️ Ver perfil detallado de cada cliente

---

### 2. Clientes Frecuentes

**Identificación automática de tipos de clientes**

El sistema categorizará automáticamente a los clientes en:

#### 🆕 Clientes Nuevos
- Primera o segunda visita
- Destacados con badge "Nuevo"

#### ⭐ Clientes Recurrentes
- 3 o más visitas
- Badge "Frecuente"
- Identificar fuente de ingresos estable

#### ⚠️ Clientes Inactivos
- No regresan hace más de X días (configurable)
- Ejemplo: 30 días, 60 días, 90 días
- Potencial para campañas de reactivación futuras

**Vista rápida**:
```
📊 Resumen de Clientes
- 🆕 Nuevos este mes: 12
- ⭐ Frecuentes: 45
- ⚠️ Inactivos (30+ días): 8
- 👥 Total clientes: 65
```

---

### 3. Notas Privadas

**Observaciones personalizadas por cliente**

El profesional podrá guardar información útil sobre cada cliente.

#### Ejemplos de notas:

```
📝 "Le gusta corte clásico"
📝 "Prefiere atención después de las 5 PM"
📝 "Siempre paga en efectivo"
📝 "Sensible al calor del secador"
📝 "Viene cada 15 días exactos"
```

#### Características:

- ✅ Visibles **solo para el profesional**
- ✅ Editables en cualquier momento
- ✅ Mostradas al ver agenda del día (contexto rápido)
- ✅ Sin límite de caracteres (texto libre)

**Beneficio**: Servicio personalizado que genera fidelización.

---

### 4. Estadísticas Básicas

**Panel de métricas simples pero útiles**

#### Dashboard con indicadores:

**📊 Este Mes**:
```
✅ Citas realizadas: 85
❌ Citas canceladas: 7 (8.2%)
✅ Citas completadas: 78 (91.8%)
⏱️ Horas trabajadas: ~42.5 hrs
```

**🛠️ Servicios Más Solicitados**:
```
1. Corte + barba (45%)
2. Corte de cabello (35%)
3. Arreglo de barba (20%)
```

**💰 Potencial de Ingresos** (opcional si se configura precio):
```
Ingreso estimado este mes: $XXX
Promedio por cita: $XX
```

**📈 Comparación con mes anterior**:
```
Citas: +12% 📈
Cancelaciones: -5% 📉
```

**Visualización**:
- Gráficos simples (barras o líneas)
- Colores para indicar tendencias (verde ↑, rojo ↓)
- Comparación mes a mes

---

### 5. Calendario Mejorado

**Vistas más completas de la agenda**

#### Nuevas vistas:

**📅 Diaria** (ya existe en MVP):
- Lista de citas del día
- Hora por hora

**📅 Semanal** (ya existe en MVP):
- 7 días en una vista
- Identificar días con más/menos ocupación

**📅 Mensual** (NUEVA):
- Vista de calendario tradicional
- Días con citas marcados con badge
- Click en día → ver citas de ese día
- Identificar patrones de ocupación

#### Features adicionales:

- 🔴 Indicador visual de ocupación por día:
  - Verde: Poca ocupación (0-3 citas)
  - Amarillo: Ocupación media (4-6 citas)
  - Rojo: Día lleno (7+ citas)

- 📊 Resumen semanal al final de cada semana:
  - Total de citas
  - Total de horas
  - Servicios realizados

---

### 6. Sistema de Anticipos Manuales 💰

**Funcionalidad clave de esta fase**

El profesional podrá **requerir un anticipo** para confirmar reservas y reducir ausencias.

#### Configuración del Anticipo

**Toggle en configuración**:
```
☑️ Requerir anticipo para confirmar reservas
```

**Opciones**:
- Monto fijo (ej: $10,000 COP)
- Porcentaje del servicio (ej: 30%)
- Monto por servicio (diferentes anticipos según el servicio)

---

#### Datos de Pago

**El profesional configura sus métodos de pago**:

| Método | Datos Requeridos |
|--------|------------------|
| 💚 **Nequi** | Número de celular |
| 🏦 **Bancolombia** | Número de cuenta o Nequi |
| 💳 **Transferencia** | Banco, tipo de cuenta, número |
| 💸 **Daviplata** | Número de celular |
| 📱 **Otro** | Instrucciones personalizadas |

**Ejemplo de configuración**:
```
Métodos de pago aceptados:
✅ Nequi: 300-123-4567
✅ Bancolombia Ahorros: 123-456789-01
✅ Daviplata: 300-123-4567
```

---

#### Flujo de Reserva con Anticipo

**Paso a paso del cliente**:

1. **Selecciona servicio**
   - Ve precio (si está configurado)
   - Ve anticipo requerido

2. **Selecciona horario**
   - Ve disponibilidad normal

3. **Ve instrucciones de pago**
   ```
   📋 Para confirmar tu reserva:

   Anticipo requerido: $10,000 COP

   Puedes pagar por:
   💚 Nequi: 300-123-4567
   🏦 Bancolombia: 123-456789-01

   Después de pagar:
   1. Toma captura del comprobante
   2. Envía el comprobante usando el botón abajo
   3. Espera confirmación del barbero
   ```

4. **Realiza el pago** (por fuera de la plataforma)
   - El cliente sale a Nequi/banco
   - Realiza transferencia

5. **Envía comprobante**
   - Upload de imagen (captura de pantalla)
   - Botón: "Enviar comprobante"

6. **Espera confirmación**
   - Cita queda en estado "Pendiente de validación"
   - Notificación enviada al profesional

---

#### Estados de la Reserva

**Nuevos estados en el sistema**:

| Estado | Icono | Descripción | Acción del Profesional |
|--------|-------|-------------|------------------------|
| 🟡 **Pendiente de pago** | ⏳ | Reserva creada, esperando comprobante | Esperar |
| 🟠 **Pendiente de validación** | 🔍 | Cliente envió comprobante | **Revisar y aprobar/rechazar** |
| 🟢 **Confirmada** | ✅ | Pago aprobado por profesional | Ninguna |
| 🔴 **Rechazada** | ❌ | Comprobante no válido | Contactar cliente |
| ⚫ **Cancelada** | 🚫 | Reserva cancelada | Ninguna |

---

#### Panel de Validación (Profesional)

**Vista para revisar comprobantes**:

```
📬 Comprobantes Pendientes (3)

┌─────────────────────────────────────┐
│ Juan Pérez - Corte + barba          │
│ Mañana 10:00 AM                     │
│ Anticipo: $10,000                   │
│                                     │
│ [Ver comprobante 📷]                │
│                                     │
│ [✅ Aprobar]  [❌ Rechazar]         │
└─────────────────────────────────────┘
```

**Al aprobar**:
- Estado cambia a "Confirmada"
- Cliente recibe notificación de confirmación
- Cita aparece en agenda normal

**Al rechazar**:
- Estado cambia a "Rechazada"
- Cliente recibe notificación
- Se le pide enviar comprobante correcto
- Horario permanece bloqueado temporalmente

---

### 7. Recordatorios Avanzados

**Sistema configurable de notificaciones**

#### Configuración de recordatorios:

El profesional podrá elegir **cuándo** enviar recordatorios:

```
⏰ Configuración de Recordatorios

☑️ 24 horas antes
☑️ 12 horas antes
☑️ 2 horas antes
☐ 1 hora antes
☐ 30 minutos antes
```

**Selección múltiple permitida**.

#### Contenido de recordatorios:

```
📅 Recordatorio de Cita

Hola Juan, te recordamos tu cita:

📅 Mañana 10:00 AM
💇 Servicio: Corte + barba
👤 Con: José Barber
📍 [Ver ubicación]

[Cancelar cita] [Contactar]
```

#### Canales de notificación:

- 📧 Email
- 📱 SMS (opcional, según presupuesto)
- 💬 WhatsApp (Fase 2)

---

### 8. Integración con WhatsApp 💬

**NO chat interno, pero SÍ notificaciones y contacto directo**

#### Notificaciones por WhatsApp

**Mensajes automáticos** (si el profesional configura WhatsApp Business API):

| Evento | Mensaje |
|--------|---------|
| ✅ Cita confirmada | "Tu cita ha sido confirmada para [fecha] a las [hora]" |
| ⏰ Recordatorio | "Tu cita es mañana a las 3:00 PM" |
| ❌ Cita cancelada | "Tu cita del [fecha] fue cancelada" |
| 🔄 Cita reagendada | "Tu cita fue movida a [nueva fecha]" |

**Ventajas**:
- Canal que los clientes ya usan diariamente
- Mayor tasa de apertura que email
- Reduce ausencias

---

#### Botón "Contactar por WhatsApp"

**Desde cualquier punto de contacto**:

El cliente puede contactar directamente al profesional:

```
[💬 Contactar por WhatsApp]
```

**Comportamiento**:
- Abre WhatsApp Web (desktop) o app (mobile)
- Inicia conversación con el barbero
- Mensaje pre-llenado (opcional):
  ```
  Hola José, tengo una pregunta sobre mi cita del [fecha] a las [hora]
  ```

**Beneficio**: Reduce fricción para consultas específicas sin necesitar chat interno.

---

## 👤 Nuevas Funcionalidades para el Cliente

### 1. Cuenta Opcional del Cliente

**Registro opcional** (no obligatorio, pero recomendado)

#### Beneficios de crear cuenta:

- 📅 Ver historial completo de citas
- 🔔 Gestionar reservas actuales
- 🔄 Reagendar fácilmente
- 📱 Acceso desde cualquier dispositivo

#### Registro simple:

```
Crear cuenta (opcional)
- Nombre: [ya capturado]
- Teléfono: [ya capturado]
- Email: [nuevo campo]
- Contraseña: [crear]

O continuar sin cuenta
```

**Importante**: Las reservas sin cuenta seguirán funcionando (no perder funcionalidad del MVP).

---

### 2. Historial de Reservas

**Portal del cliente** (requiere cuenta)

#### Vista de reservas:

**📅 Próximas Citas**:
```
┌─────────────────────────────────────┐
│ ✅ Mañana 10:00 AM                  │
│ José Barber                         │
│ Corte + barba (50 min)              │
│                                     │
│ [Ver detalles] [Cancelar] [Contactar] │
└─────────────────────────────────────┘
```

**📜 Citas Anteriores**:
```
┌─────────────────────────────────────┐
│ 15 Mayo 2026                        │
│ José Barber                         │
│ Corte de cabello                    │
│ Estado: Completada ✅               │
└─────────────────────────────────────┘
```

#### Información de cada cita:

- Fecha y hora
- Servicio reservado
- Profesional
- Estado (confirmada, pendiente, completada)
- Ubicación (si aplica)
- Opciones: ver, cancelar, contactar

---

### 3. Reagendar Cita 🔄

**Mover una reserva sin cancelar y crear nueva**

#### Flujo de reagendamiento:

1. Cliente va a "Mis Reservas"
2. Selecciona cita a reagendar
3. Click en "Reagendar"
4. Ve calendario con horarios disponibles
5. Selecciona nuevo horario
6. Confirma cambio

**Resultado**:
- La cita original se cancela
- Se crea nueva cita en el nuevo horario
- Notificación enviada al profesional
- Confirmación enviada al cliente

#### Restricciones:

- Solo si está dentro del tiempo de cancelación permitido
- Solo si el servicio sigue siendo el mismo
- Si requiere anticipo y ya se pagó → anticipo se transfiere

---

## ⛔ Lo que Todavía NO se Hará

Para mantener el enfoque y validar la utilidad de las nuevas features:

### ❌ Marketplace
- Sin búsqueda de profesionales
- Sin directorio público
- Acceso sigue siendo solo por enlace compartido

### ❌ Calificaciones y Reseñas
- Sin sistema de valoraciones
- Sin comentarios de clientes
- Sin puntuaciones (⭐)

### ❌ Múltiples Empleados
- Sigue siendo un profesional por cuenta
- Sin gestión de equipo
- Sin múltiples agendas

### ❌ Pagos Integrados
- Sin procesamiento de pagos dentro de la plataforma
- Anticipos siguen siendo manuales con comprobante
- Sin Stripe, PayPal, etc.

### ❌ Membresías
- Sin planes de suscripción
- Sin tiers (básico, premium)
- Plataforma gratuita o precio fijo

### ❌ Promociones y Descuentos
- Sin cupones
- Sin códigos de descuento
- Sin sistema de precios variables

### ❌ Inteligencia Artificial
- Sin sugerencias automáticas
- Sin optimización de agenda con IA
- Sin predicción de cancelaciones

---

## 📊 Métricas de Éxito - Fase 2

**Validar que estas funcionalidades agregan valor real**

### KPIs Principales:

1. **Reducción de Ausencias**
   - % de no-shows antes vs después de anticipos
   - Meta: Reducir en 50%

2. **Uso de CRM**
   - % de profesionales que agregan notas
   - Frecuencia de consulta de historial de clientes

3. **Adopción de Anticipos**
   - % de profesionales que activan anticipos
   - % de clientes que completan pago con comprobante

4. **Retención de Clientes**
   - Clientes con 3+ visitas (recurrentes)
   - Tiempo promedio entre visitas

5. **Engagement con Estadísticas**
   - % de profesionales que consultan dashboard semanal

---

## 🔄 Flujo Completo: Reserva con Anticipo

**Diagrama del proceso end-to-end**

```
CLIENTE                          SISTEMA                      PROFESIONAL

1. Selecciona servicio/hora
                         →  Crea reserva
                             Estado: "Pendiente de pago"

2. Ve datos de pago
   (Nequi, banco, etc)

3. Realiza pago
   (fuera de la plataforma)

4. Envía comprobante (imagen)
                         →  Estado: "Pendiente validación"
                         →  Notifica a profesional    →  5. Recibe notificación
                                                           "Nuevo comprobante"

                                                       →  6. Revisa comprobante

                                                       →  7. Aprueba/Rechaza

                         ←  Estado: "Confirmada"      ←  Si aprueba
                             O "Rechazada"                Si rechaza

8. Recibe confirmación  ←  Notificación

9. Recibe recordatorios
   (24h, 12h, 2h antes)

10. Asiste a la cita
                         →  Estado: "Completada"
```

---

## 🛠️ Consideraciones Técnicas

### Base de Datos

**Nuevas tablas/colecciones**:

- `clients` - Información de clientes y CRM
- `client_notes` - Notas privadas del profesional
- `payment_receipts` - Comprobantes de pago
- `notifications` - Log de notificaciones enviadas
- `statistics` - Cache de métricas calculadas

### Storage de Imágenes

- Comprobantes de pago (JPG, PNG)
- Guardar en cloud storage (S3, Cloudinary, etc.)
- Comprimir imágenes para ahorrar espacio

### WhatsApp Integration

**Opciones**:
- Twilio API (pago)
- WhatsApp Business API (oficial, más complejo)
- Servicios third-party (WhatAPI, etc.)

### Cálculo de Estadísticas

- Proceso batch nocturno para calcular métricas
- Cache de resultados para performance
- Actualización en tiempo real para métricas críticas

---

## ⏱️ Timeline Estimado - Fase 2

**Después de completar MVP V1**

### Semana 1-2: CRM Básico
- [ ] Base de datos de clientes
- [ ] Historial automático
- [ ] Notas privadas
- [ ] Vista de clientes frecuentes

### Semana 3-4: Estadísticas y Calendario
- [ ] Dashboard de métricas
- [ ] Vista mensual de calendario
- [ ] Gráficos básicos
- [ ] Comparación mes a mes

### Semana 5-6: Sistema de Anticipos
- [ ] Configuración de métodos de pago
- [ ] Flujo de reserva con anticipo
- [ ] Upload de comprobantes
- [ ] Panel de validación

### Semana 7-8: Cuenta de Cliente y Reagendamiento
- [ ] Registro opcional de cliente
- [ ] Historial de reservas
- [ ] Reagendamiento de citas
- [ ] Portal del cliente

### Semana 9: Integración WhatsApp
- [ ] Configuración de WhatsApp Business
- [ ] Notificaciones por WhatsApp
- [ ] Botón de contacto directo
- [ ] Testing de mensajes

### Semana 10: Testing y Deploy
- [ ] Testing completo de flujos
- [ ] Correcciones de bugs
- [ ] Deploy a producción
- [ ] Documentación actualizada

**Total estimado**: 10 semanas (~2.5 meses)

---

## 💡 Próximos Pasos

### Después de Fase 2

**Posibles Fase 3**:
- Marketplace (búsqueda de profesionales)
- Calificaciones y reseñas
- Pagos integrados (Stripe, etc.)
- Gestión de múltiples empleados
- Promociones y descuentos

**Validar primero**:
- ¿La Fase 2 realmente reduce cancelaciones?
- ¿Los profesionales usan las estadísticas?
- ¿Los anticipos generan fricción o mejoran compromiso?
- ¿Los clientes quieren cuenta o prefieren sin registro?

**Iterar basado en feedback real de usuarios activos.**

---

## 🔗 Links Relacionados

- [[MVP-v1]] - Fase 1: Agenda básica
- [[Fase-3-Marketplace]] - Fase 3: Marketplace y descubrimiento
- [[Plataforma-Reservas-Servicios]] - Visión completa
- [[Proyecto Personal]] - Índice de proyectos

---

## 📝 Notas

**Fecha de creación**: 2026-06-10
**Status**: Planificación (después de MVP V1)
**Prerequisito**: MVP V1 completado y validado
**Objetivo**: Transformar agenda digital → herramienta de gestión de negocio

---

**Estado**: 🟡 Planificación
**Última actualización**: 2026-06-10
**Volver**: [[MVP-v1]] | [[Plataforma-Reservas-Servicios]]
