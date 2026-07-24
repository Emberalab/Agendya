---
type: proyecto-personal
status: planning
category: technical-architecture
tech-stack: React, Node.js, PostgreSQL
created: 2026-06-10
tags: [personal, architecture, technical-design, full-stack]
---

# 🏗️ Arquitectura Técnica - Plataforma de Reservas

> Diseño técnico evolutivo y escalable para las 4 fases del proyecto

---

## 📋 Índice

1. [Visión Arquitectónica](#visión-arquitectónica)
2. [Diagrama de Arquitectura](#diagrama-de-arquitectura)
3. [Estrategia de Desarrollo](#estrategia-de-desarrollo)
4. [Stack Tecnológico](#stack-tecnológico)
5. [Estructura de Proyecto](#estructura-de-proyecto)
6. [Evolución por Fases](#evolución-por-fases)
7. [API Design](#api-design)
8. [Consideraciones de Despliegue](#consideraciones-de-despliegue)

---

## 🎯 Visión Arquitectónica

### Principios de Diseño

**1. Mobile-First Web**
- Priorizar experiencia web responsive sobre apps nativas
- Validar mercado antes de invertir en aplicaciones móviles
- La web debe sentirse como una app nativa

**2. API-First Architecture**
- Backend desacoplado del frontend
- API RESTful reutilizable por múltiples clientes
- Una sola API para web y futuras apps móviles

**3. Arquitectura Evolutiva**
- Comenzar simple, escalar según necesidad
- No sobre-ingeniería prematura
- Cada fase agrega complejidad de forma controlada

**4. Monorepo Modular**
- Código organizado por dominios de negocio
- Facilita mantenimiento y escalabilidad
- Reutilización de lógica entre plataformas

---

## 📊 Diagrama de Arquitectura

### Arquitectura Completa (Fase 4)

```
                    ┌─────────────────┐
                    │   React Web     │
                    │ (Clientes/Admin)│
                    └────────┬────────┘
                             │
                             │ HTTPS/REST API
                             ▼
                    ┌─────────────────┐
                    │   API Backend   │
                    │   (Node.js)     │
                    └────────┬────────┘
                             │
             ┌───────────────┼───────────────┐
             │               │               │
             ▼               ▼               ▼
      ┌──────────┐    ┌──────────┐    ┌──────────┐
      │PostgreSQL│    │ WhatsApp │    │ Storage  │
      │ Database │    │ Business │    │(S3/Cloud)│
      │          │    │   API    │    │ (Images) │
      └──────────┘    └──────────┘    └──────────┘

                             ▲
                             │
                             │ HTTPS/REST API
                             │
                    ┌────────┴────────┐
                    │ React Native    │
                    │  Mobile App     │
                    │  (Fase 5)       │
                    └─────────────────┘
```

### Componentes Principales

| Componente | Tecnología | Responsabilidad |
|------------|------------|-----------------|
| **Frontend Web** | React + TypeScript | Interfaz de usuario (clientes y profesionales) |
| **API Backend** | Node.js + Express | Lógica de negocio y orquestación |
| **Base de Datos** | PostgreSQL | Persistencia de datos |
| **WhatsApp Integration** | WhatsApp Business API | Canal de reservas por WhatsApp |
| **Storage** | S3/Cloudinary | Almacenamiento de imágenes |
| **Mobile App** | React Native (Futuro) | Apps nativas iOS/Android |

---

## 🚀 Estrategia de Desarrollo

### Por Qué Comenzar con Web (No App Nativa)

**Problema a validar**: ¿La gente **usaría** este servicio?

**NO**: ¿La gente **instalaría** una app?

#### Razones para priorizar web:

1. **Validación más rápida**
   - Desarrollar web es más rápido que 3 plataformas (web + iOS + Android)
   - Despliegue instantáneo sin esperar aprobación de stores
   - Iteraciones más ágiles

2. **Menor fricción de adopción**
   - Sin necesidad de instalar
   - Acceso instantáneo por enlace: `ronda.com/jose-barber`
   - Funciona en cualquier dispositivo

3. **Menor costo inicial**
   - Una sola codebase para mantener
   - No requiere equipos especializados (iOS, Android)
   - Infraestructura más simple

4. **Evitar sobre-ingeniería**
   - Muchos MVPs fracasan por crear web + iOS + Android antes del primer cliente
   - Invertir recursos donde realmente aporta valor

---

### Estrategia Mobile-First Web

**Objetivo**: La web debe sentirse como una app nativa desde el móvil.

#### Características:

```
Cliente abre: ronda.com/jose-barber
Desde su celular

✅ Carga rápida
✅ Diseño responsive perfecto
✅ Gestos táctiles optimizados
✅ PWA (Progressive Web App)
✅ Funciona offline (caché)
✅ Instalable en pantalla de inicio
✅ Push notifications (web)
```

**Resultado**: Experiencia indistinguible de una app nativa para el 90% de los casos de uso.

---

### Cuándo Desarrollar App Nativa

**La app móvil llega cuando existe una necesidad demostrada, NO porque fue planeada.**

#### Criterios para desarrollar app:

| Métrica | Umbral |
|---------|--------|
| Reservas mensuales | 50,000+ |
| Profesionales activos | 500+ |
| Tráfico móvil | 80%+ |
| Feedback usuarios | Solicitudes constantes por app |
| Ingresos mensuales | Suficiente para costear desarrollo |

#### Features que justifican app nativa:

- Notificaciones push más confiables
- Integración con calendario del teléfono
- Funcionalidad offline robusta
- Acceso a cámara para fotos de servicios
- Geolocalización en tiempo real
- Performance mejorada

---

### Convivencia Web + App

**Importante**: La web NO se reemplaza cuando llega la app.

#### Arquitectura final:

```
Cliente:
  ✅ Web (desktop/mobile)
  ✅ App iOS
  ✅ App Android

Profesional:
  ✅ Web (principalmente desktop)
  ✅ App móvil (consulta rápida de agenda)

Administrador:
  ✅ Web (principalmente desktop)
  ⚠️ App móvil (opcional, vista simplificada)
```

**Beneficio**: Misma API sirve a todos los clientes.

---

## 🛠️ Stack Tecnológico

### Frontend - React Web

#### Core
```
- React 18+ (UI library)
- TypeScript (Type safety)
- Vite (Build tool) o Create React App
```

#### Routing
```
- React Router v6 (Client-side routing)
```

#### State Management
```
- Zustand (Simple, lightweight)
- O React Query (Server state)
- O Context API (Para casos simples)
```

#### Styling
```
- Tailwind CSS (Utility-first)
- O Styled Components (CSS-in-JS)
- O Emotion
```

#### Forms
```
- React Hook Form (Performance)
- Zod (Schema validation)
```

#### HTTP Client
```
- Axios (HTTP requests)
- O Fetch API (Nativo)
```

#### Date Handling
```
- date-fns (Lightweight)
- O dayjs
```

---

### Backend - Node.js API

#### Runtime & Framework
```
- Node.js 20+ LTS
- Express.js (Web framework)
- TypeScript (Type safety)
```

#### Database
```
- PostgreSQL (Relational DB)
- Prisma (ORM - Type-safe)
- O TypeORM
```

#### Authentication
```
- JWT (JSON Web Tokens)
- bcrypt (Password hashing)
- O Passport.js
```

#### Validation
```
- Zod (Schema validation)
- O Joi
```

#### Real-time (Opcional)
```
- Socket.io (WebSockets)
- O Server-Sent Events (SSE)
```

#### WhatsApp Integration
```
- Twilio API for WhatsApp
- O WhatsApp Business API oficial
- O 360Dialog
```

---

### Base de Datos - PostgreSQL

#### Por qué PostgreSQL:

✅ **Relacional**: Datos estructurados (profesionales, servicios, reservas)
✅ **ACID**: Transacciones confiables
✅ **JSON Support**: Flexibilidad cuando se necesita
✅ **Geospatial**: PostGIS para búsqueda por ubicación (Fase 3)
✅ **Escalable**: Soporta millones de registros
✅ **Open Source**: Sin costos de licencia

#### Alternativas consideradas:

| DB | Pros | Contras | Decisión |
|----|------|---------|----------|
| MongoDB | Flexible, fácil inicio | Sin transacciones robustas | ❌ No ideal para reservas |
| MySQL | Popular, bien soportado | Menos features avanzados | ⚠️ Alternativa válida |
| SQLite | Super simple | No escalable | ❌ Solo para prototipos |

---

### Storage - Imágenes

#### Cloud Storage
```
- AWS S3 (Escalable, confiable)
- O Cloudinary (Optimización automática)
- O Google Cloud Storage
```

#### CDN
```
- CloudFront (AWS)
- O Cloudflare (Caché global)
```

---

### Deployment

#### Hosting
```
Frontend:
- Vercel (Recomendado para React)
- O Netlify
- O AWS S3 + CloudFront

Backend:
- Railway (Simple, barato)
- O Render
- O AWS EC2/ECS
- O DigitalOcean

Database:
- Supabase (PostgreSQL managed)
- O Railway
- O AWS RDS
- O Render
```

#### CI/CD
```
- GitHub Actions (Automatización)
- O Vercel auto-deploy
```

---

## 📁 Estructura de Proyecto

### Monorepo Root

```
ronda/
├── apps/
│   ├── web/                 # React Web App
│   ├── api/                 # Node.js Backend
│   └── mobile/              # React Native (Fase 5)
├── packages/
│   ├── shared/              # Código compartido
│   └── types/               # TypeScript types
├── docs/                    # Documentación
└── infra/                   # Infrastructure as Code
```

---

### Frontend - React Web

```
web/
├── public/
│   ├── favicon.ico
│   └── manifest.json        # PWA manifest
│
├── src/
│   │
│   ├── modules/             # Módulos de negocio
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── types.ts
│   │   │
│   │   ├── professionals/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── services/
│   │   │   └── types.ts
│   │   │
│   │   ├── services/        # Servicios del negocio
│   │   ├── schedules/       # Horarios y disponibilidad
│   │   ├── bookings/        # Reservas
│   │   ├── customers/       # Gestión de clientes
│   │   ├── whatsapp/        # Integración WhatsApp (Fase 2)
│   │   ├── business/        # Multi-usuario (Fase 4)
│   │   └── analytics/       # Estadísticas (Fase 2+)
│   │
│   ├── shared/              # Código compartido
│   │   ├── components/      # Componentes reutilizables
│   │   ├── hooks/           # Custom hooks
│   │   ├── utils/           # Utilidades
│   │   ├── constants/
│   │   └── api/             # API client
│   │
│   ├── ui/                  # Design System
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Modal/
│   │   └── Calendar/
│   │
│   ├── routes/              # Routing configuration
│   │   ├── AppRouter.tsx
│   │   ├── PrivateRoute.tsx
│   │   └── PublicRoute.tsx
│   │
│   ├── App.tsx              # Root component
│   └── main.tsx             # Entry point
│
├── package.json
├── tsconfig.json
└── vite.config.ts
```

#### Organización por Módulos de Negocio

**No organizamos por tipo técnico** (pages/, components/, services/)

**Organizamos por dominio de negocio** (bookings/, professionals/, schedules/)

**Beneficios**:
- ✅ Cada módulo es independiente
- ✅ Fácil de entender el alcance
- ✅ Cambios aislados
- ✅ Reutilización clara

**Ejemplo**: Módulo `bookings/`

```
bookings/
├── components/
│   ├── BookingCard.tsx
│   ├── BookingList.tsx
│   └── BookingForm.tsx
├── pages/
│   ├── BookingsPage.tsx
│   └── BookingDetailsPage.tsx
├── hooks/
│   ├── useBookings.ts
│   └── useCreateBooking.ts
├── services/
│   └── bookingService.ts
└── types.ts
```

---

### Backend - Node.js API

```
api/
├── src/
│   │
│   ├── modules/             # Módulos de negocio
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── auth.types.ts
│   │   │
│   │   ├── professionals/
│   │   ├── services/
│   │   ├── schedules/
│   │   ├── bookings/
│   │   ├── customers/
│   │   ├── whatsapp/
│   │   ├── business/
│   │   └── analytics/
│   │
│   ├── shared/
│   │   ├── middleware/      # Auth, validation, error handling
│   │   ├── utils/
│   │   ├── config/          # Environment config
│   │   └── database/        # DB connection, migrations
│   │
│   ├── app.ts               # Express app setup
│   └── server.ts            # HTTP server
│
├── prisma/                  # Database schema
│   ├── schema.prisma
│   └── migrations/
│
├── tests/
│   ├── unit/
│   └── integration/
│
├── package.json
└── tsconfig.json
```

---

### Mobile - React Native (Fase 5)

```
mobile/
├── src/
│   │
│   ├── modules/             # Módulos de negocio
│   │   ├── auth/
│   │   ├── bookings/
│   │   ├── schedules/
│   │   ├── customers/
│   │   └── notifications/
│   │
│   ├── shared/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── api/             # ⭐ Mismo API client
│   │
│   ├── navigation/
│   │   ├── AppNavigator.tsx
│   │   └── AuthNavigator.tsx
│   │
│   └── App.tsx
│
├── android/
├── ios/
└── package.json
```

---

## 🔄 Evolución por Fases

### Fase 1: MVP - Agenda Básica

**Duración**: 7-8 semanas

#### Stack:
```
✅ React Web
✅ Node.js API
✅ PostgreSQL
```

#### Módulos activos:
```
- auth/           (Login/registro)
- professionals/  (Perfil profesional)
- services/       (CRUD servicios)
- schedules/      (Configuración horarios)
- bookings/       (Reservas básicas)
```

#### Features implementadas:
- Registro de profesionales
- Configuración de servicios
- Configuración de horarios
- Página pública: `ronda.com/jose-barber`
- Reservas sin registro (nombre + teléfono)
- Confirmaciones por email
- Panel administrativo básico

---

### Fase 2: Retención - CRM y Anticipos

**Duración**: 10 semanas

#### Stack adicional:
```
✅ Email service (SendGrid/Resend)
✅ Storage (S3/Cloudinary) para comprobantes
```

#### Módulos nuevos:
```
+ customers/      (CRM básico)
+ analytics/      (Estadísticas)
+ payments/       (Anticipos manuales)
```

#### Features implementadas:
- CRM con historial de clientes
- Notas privadas
- Dashboard de estadísticas
- Sistema de anticipos manuales
- Upload de comprobantes ? posiblee
- Calendario mensual
- Recordatorios configurables

---

### Fase 3: Marketplace - Descubrimiento

**Duración**: 15 semanas

#### Stack adicional:
```
✅ Elasticsearch/Algolia (Búsqueda)
✅ Maps API (Google Maps/Mapbox)
✅ Payment processor (Para suscripciones)
```

#### Módulos nuevos:
```
+ search/         (Búsqueda y filtros)
+ reviews/        (Valoraciones)
+ promotions/     (Promociones)
+ subscriptions/  (Planes Free/Pro)
```

#### Features implementadas:
- Búsqueda de profesionales
- Filtros avanzados
- Geolocalización
- Galería de trabajos
- Sistema de reseñas
- Promociones
- Planes de suscripción (Free/Pro) publicidad si es free
- Ranking algorítmico

---

### Fase 4: Negocios - Multi-usuario

**Duración**: 20 semanas

#### Stack adicional:
```
✅ WhatsApp Business API (Twilio/360Dialog)
✅ WebSockets (Socket.io) para real-time
```

#### Módulos nuevos:
```
+ business/       (Multi-tenant, roles)
+ whatsapp/       (Bot conversacional)
+ team/           (Gestión de equipo)
+ finance/        (Reportes financieros)
+ loyalty/        (Fidelización)
```

#### Features implementadas:
- Sistema de roles (Admin, Profesional, Recepcionista)
- Múltiples profesionales por negocio
- Integración WhatsApp completa
- Bot conversacional
- Reservas inteligentes (manual/automática)
- Base de clientes compartida
- Dashboard financiero avanzado
- Programa de fidelización

---

### Fase 5: Mobile - Apps Nativas

**Duración**: 12-16 semanas

#### Stack adicional:
```
✅ React Native
✅ Firebase (Push notifications, Analytics)
✅ App Store & Google Play setup
```

#### Apps a desarrollar:
```
1. Ronda (Cliente)
2. Ronda Pro (Profesional)
3. Ronda Business (Admin - opcional)
```

#### Features implementadas:
- Apps nativas iOS y Android
- Notificaciones push nativas
- Integración con calendario del teléfono
- Geolocalización en tiempo real
- Modo offline con sync
- Compartir enlaces profundos (deep links)

---

## 🔌 API Design

### Principios REST

**Base URL**: `https://api.ronda.com/v1`

#### Convenciones:
```
GET    /resource         # Listar todos
GET    /resource/:id     # Obtener uno
POST   /resource         # Crear
PUT    /resource/:id     # Actualizar completo
PATCH  /resource/:id     # Actualizar parcial
DELETE /resource/:id     # Eliminar
```

---

### Endpoints Principales

#### Authentication
```
POST   /auth/register         # Registro
POST   /auth/login            # Login
POST   /auth/logout           # Logout
POST   /auth/refresh          # Refresh token
POST   /auth/forgot-password  # Recuperar contraseña
```

#### Professionals
```
GET    /professionals              # Listar (marketplace)
GET    /professionals/:username    # Perfil público
GET    /professionals/me           # Mi perfil
PUT    /professionals/me           # Actualizar perfil
```

#### Services
```
GET    /professionals/:id/services
POST   /professionals/:id/services
PUT    /services/:id
DELETE /services/:id
```

#### Schedules
```
GET    /professionals/:id/schedules
PUT    /professionals/:id/schedules
GET    /professionals/:id/availability  # Horarios disponibles
```

#### Bookings
```
GET    /bookings                   # Mis reservas
POST   /bookings                   # Crear reserva
GET    /bookings/:id
PUT    /bookings/:id               # Actualizar
PATCH  /bookings/:id/cancel        # Cancelar
PATCH  /bookings/:id/confirm       # Confirmar
```

#### Customers (CRM)
```
GET    /customers                  # Listar clientes
GET    /customers/:id
PUT    /customers/:id
POST   /customers/:id/notes        # Agregar nota
```

#### Reviews
```
GET    /professionals/:id/reviews
POST   /bookings/:id/review        # Calificar después de cita
```

#### WhatsApp
```
POST   /whatsapp/webhook           # Webhook de WhatsApp
POST   /whatsapp/send-message      # Enviar mensaje
```

---

### Estructura de Respuesta

#### Success Response
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Jose Barber"
  }
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "BOOKING_NOT_AVAILABLE",
    "message": "Este horario ya no está disponible",
    "details": {}
  }
}
```

#### Pagination
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

### Reutilización de API

**Clave**: La misma API sirve a todos los clientes.

```
GET /bookings

Usado por:
  ✅ React Web (cliente)
  ✅ React Web (profesional - panel admin)
  ✅ React Native App (cliente)
  ✅ React Native App (profesional)

POST /bookings

Usado por:
  ✅ React Web
  ✅ React Native
  ✅ WhatsApp Bot (servidor)

GET /professionals/:id/services

Usado por:
  ✅ React Web
  ✅ React Native
  ✅ WhatsApp Bot (para mostrar servicios)
```

**Beneficio**:
- Sin duplicación de código
- Mantener una sola API
- Consistencia entre plataformas
- Cambios reflejados en todos los clientes

---

## 🚀 Consideraciones de Despliegue

### Ambientes

```
Development    → localhost:3000 (frontend), localhost:4000 (API)
Staging        → staging.ronda.com
Production     → ronda.com
```

### CI/CD Pipeline

```
GitHub Push
    ↓
GitHub Actions
    ↓
Run Tests
    ↓
Build
    ↓
Deploy to Vercel (Frontend)
Deploy to Railway (Backend)
```

### Escalabilidad

#### Horizontal Scaling
```
Multiple API instances behind load balancer
```

#### Database
```
Read replicas para queries pesados
Connection pooling
```

#### Caching
```
Redis para:
- Sesiones
- Horarios disponibles (cache)
- Búsquedas frecuentes
```

### Monitoring

```
- Sentry (Error tracking)
- Google Analytics (User behavior)
- DataDog/New Relic (Performance monitoring)
```

---

## 📝 Resumen Ejecutivo

### Decisiones Arquitectónicas Clave

1. **Web-First, Mobile Later**
   - Validar producto antes de invertir en apps nativas
   - Web responsive como app PWA

2. **API Única Reutilizable**
   - Una API sirve a web y futuras apps
   - Evita duplicación

3. **Monorepo Modular**
   - Organización por dominio de negocio
   - Facilita escalabilidad

4. **PostgreSQL como Base**
   - Datos relacionales y estructurados
   - Transacciones confiables

5. **React + Node.js**
   - Stack moderno y popular
   - TypeScript para type safety
   - Ecosistema maduro

6. **Evolución Incremental**
   - Cada fase agrega complejidad controlada
   - No sobre-ingeniería

---

## 🔗 Links Relacionados

- [[Plataforma-Reservas-Servicios]] - Visión completa del producto
- [[MVP-v1]] - Fase 1 detallada
- [[Fase-2-Retencion]] - Fase 2 detallada
- [[Fase-3-Marketplace]] - Fase 3 detallada
- [[Fase-4-Negocios-WhatsApp]] - Fase 4 detallada
- [[Proyecto Personal]] - Índice de proyectos

---

**Estado**: 🟡 Planificación
**Última actualización**: 2026-06-10
**Volver**: [[Plataforma-Reservas-Servicios]]
