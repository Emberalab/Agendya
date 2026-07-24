---
type: proyecto-personal
status: planning
category: technical-stack
created: 2026-06-10
tags: [personal, stack, nestjs, react, postgresql, technical-decisions]
---

# 🛠️ Stack Tecnológico Definitivo - Ronda

> Decisiones técnicas justificadas y evolutivas para las 4 fases del proyecto Ronda

---

## 📋 Índice

1. [Visión General](#visión-general)
2. [Frontend Web](#frontend-web)
3. [Backend API](#backend-api)
4. [Base de Datos](#base-de-datos)
5. [Infraestructura y Hosting](#infraestructura-y-hosting)
6. [Servicios Externos](#servicios-externos)
7. [Stack por Fase](#stack-por-fase)
8. [Arquitectura de Deployment](#arquitectura-de-deployment)

---

## 🎯 Visión General

### Principio Fundamental

**Frontend ≠ Backend**

Nunca mezclar:
- ❌ React + lógica de negocio + base de datos todo junto

Siempre separar:
- ✅ React (UI) → API (lógica) → PostgreSQL (datos)

**Beneficio**: Cambiar tecnologías sin afectar el núcleo del negocio.

```
Hoy:    GoDaddy + VPS
Mañana: AWS + CloudFront
Futuro: Azure + CDN

La API permanece intacta.
```

---

### Stack Core

| Capa | Tecnología | Justificación |
|------|------------|---------------|
| **Frontend Web** | React + TypeScript | Ecosistema maduro, fácil contratar |
| **Mobile App** | React Native | Mismo lenguaje, equipo más pequeño |
| **Backend API** | NestJS + TypeScript | Orden y estructura para escalabilidad |
| **Base de Datos** | PostgreSQL | Datos relacionales, transacciones |
| **ORM** | Prisma | Tipado, migraciones, productividad |
| **Storage** | AWS S3 | Imágenes y archivos estáticos |
| **Hosting Web** | GoDaddy | Aprovecha hosting existente |
| **Hosting API** | VPS/Railway/Render | Node.js optimizado |

---

## 🌐 Frontend Web

### Core Stack

#### React 18+

**Por qué React**:
- ✅ Ya lo conoces → Productividad inmediata
- ✅ Gran ecosistema → Miles de librerías disponibles
- ✅ Fácil contratar desarrolladores → Talento abundante
- ✅ Sirve para dashboard Y páginas públicas
- ✅ Community support masivo

**Uso**:
- Página pública: `ronda.com/jose-barber`
- Panel administrativo: `ronda.com/dashboard`
- Dashboard de negocio: `ronda.com/business`

---

#### TypeScript

**Estado**: **OBLIGATORIO**

**Por qué TypeScript**:
- ✅ Type safety → Menos bugs en producción
- ✅ Autocomplete → Productividad 10x
- ✅ Refactoring seguro → Cambios sin miedo
- ✅ Documentación implícita → El código se autodocumenta
- ✅ Catch errors en compile time → No en runtime

**Decisión**: NO usar JavaScript puro.

```typescript
// ✅ CORRECTO - TypeScript
interface Booking {
  id: number;
  professionalId: number;
  serviceId: number;
  date: Date;
  status: 'pending' | 'confirmed' | 'cancelled';
}

// ❌ INCORRECTO - JavaScript puro
const booking = {
  id: 1,
  professional: 2, // Typo no detectado
  // Propiedades faltantes no detectadas
}
```

---

### Routing

#### React Router v6

**Por qué React Router**:
- ✅ Estándar de facto para React
- ✅ Client-side routing
- ✅ Nested routes
- ✅ Protected routes
- ✅ Lazy loading de rutas

**Ejemplo de estructura**:
```typescript
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/:username" element={<PublicProfile />} />
  <Route path="/dashboard" element={<ProtectedRoute />}>
    <Route index element={<Dashboard />} />
    <Route path="bookings" element={<Bookings />} />
    <Route path="customers" element={<Customers />} />
  </Route>
</Routes>
```

---

### Server State Management

#### TanStack Query (React Query)

**Por qué TanStack Query**:
- ✅ **Cache inteligente** → Menos peticiones al servidor
- ✅ **Invalidaciones automáticas** → Datos siempre frescos
- ✅ **Retry logic** → Manejo de errores automático
- ✅ **Background refetching** → UI siempre actualizada
- ✅ **Optimistic updates** → UX instantánea
- ✅ **Pagination y infinite scroll** → Built-in

**Uso típico**:
```typescript
// Fetch bookings con cache automático
const { data, isLoading } = useQuery({
  queryKey: ['bookings'],
  queryFn: fetchBookings,
  staleTime: 5 * 60 * 1000, // 5 minutos de cache
});

// Create booking con invalidación automática
const mutation = useMutation({
  mutationFn: createBooking,
  onSuccess: () => {
    queryClient.invalidateQueries(['bookings']);
  },
});
```

**Alternativas descartadas**:
- ❌ Redux Toolkit + RTK Query → Más verboso, overhead innecesario
- ❌ SWR → Menos features que TanStack Query

---

### Client State Management

#### Zustand

**Por qué Zustand**:
- ✅ **Simple y minimalista** → Sin boilerplate
- ✅ **API intuitiva** → Fácil de aprender
- ✅ **Pequeño** → ~1KB gzipped
- ✅ **No requiere Context Provider** → Menos wrapping
- ✅ **TypeScript first-class** → Tipado perfecto
- ✅ **DevTools integration** → Debugging fácil

**Uso típico**:
```typescript
// Store de usuario
const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
}));

// Uso en componente
const user = useUserStore((state) => state.user);
const logout = useUserStore((state) => state.logout);
```

**Cuándo usar Zustand**:
- Estado de UI global (modals, sidebars)
- Usuario autenticado
- Preferencias del usuario
- Carrito de compra (si aplica)
- Filtros de búsqueda

**Cuándo NO usar Zustand**:
- ❌ Server data → Usar TanStack Query
- ❌ Estado local de componente → Usar useState
- ❌ Formularios → Usar React Hook Form

**Alternativa descartada**:
- ❌ Redux → **NO** usaríamos Redux para este proyecto
  - Demasiado verboso
  - Overhead innecesario para esta escala
  - Zustand cubre el 95% de casos con 10% del código

---

### Styling

#### Enfoque Híbrido: Tailwind + SCSS

**Estrategia combinada para máxima productividad**

**Decisión final**: Usar ambos aprovechando sus fortalezas

---

#### Tailwind CSS

**Cuándo usar Tailwind**:
- ✅ **Layouts y estructura** → Grid, Flexbox, spacing
- ✅ **Responsive design** → Breakpoints sin media queries
- ✅ **Utilidades comunes** → Padding, margin, colors, typography
- ✅ **Prototipado rápido** → Construir UI rápidamente

**Por qué Tailwind**:
- ✅ **Productividad para layouts** → No escribir media queries
- ✅ **Consistencia automática** → Design tokens centralizados
- ✅ **Pequeño bundle** → Tree-shaking automático con PurgeCSS
- ✅ **Mantenibilidad** → Cambios de diseño en `tailwind.config.js`

**Configuración customizada**:
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',    // Tu brand color
        secondary: '#8b5cf6',
      },
      spacing: {
        '128': '32rem',        // Custom spacing
      },
    },
  },
}
```

**Ejemplo de uso**:
```tsx
// Layout y estructura con Tailwind
<div className="container mx-auto px-4 sm:px-6 lg:px-8">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <BookingCard />
  </div>
</div>
```

---

#### SCSS (Sass)

**Cuándo usar SCSS**:
- ✅ **Componentes complejos** → Lógica de estilos avanzada
- ✅ **Animaciones** → Keyframes, transitions complejas
- ✅ **Temas** → Variables dinámicas, mixins
- ✅ **Estados complejos** → Hover, focus, active con lógica

**Por qué SCSS**:
- ✅ **Control total** → Para componentes custom
- ✅ **Variables nativas** → Theming avanzado
- ✅ **Nesting y mixins** → Reutilización de lógica
- ✅ **CSS Modules** → Scoping automático

**Estructura recomendada**:
```scss
// styles/
├── abstracts/
│   ├── _variables.scss    // Colores, spacing (sync con Tailwind)
│   ├── _mixins.scss        // Mixins reutilizables
│   └── _functions.scss
├── base/
│   ├── _reset.scss
│   └── _typography.scss
├── components/
│   ├── _button.scss        // Componentes complejos
│   ├── _calendar.scss
│   └── _booking-card.scss
└── main.scss
```

**Ejemplo de componente complejo**:
```scss
// BookingCard.module.scss
.booking-card {
  @apply rounded-lg shadow-md; // Usa Tailwind utilities con @apply

  background: linear-gradient(135deg, $primary, $secondary);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  }

  &--confirmed {
    border-left: 4px solid $success-color;
  }

  &--cancelled {
    opacity: 0.6;
    filter: grayscale(100%);
  }
}
```

---

#### Estrategia de Uso

**Regla general**:
```
Layout + Responsive = Tailwind
Componentes complejos = SCSS
```

**Ejemplo práctico**:
```tsx
// Componente con enfoque híbrido
import styles from './BookingCard.module.scss';

function BookingCard({ booking }) {
  return (
    // Tailwind para layout y estructura
    <div className="p-4 sm:p-6 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* SCSS para componentes custom */}
      <div className={styles['booking-card']}>
        <h3 className="text-lg font-semibold text-gray-900">
          {booking.serviceName}
        </h3>
        {/* Tailwind para utilidades simples */}
        <p className="mt-2 text-sm text-gray-600">
          {formatDate(booking.date)}
        </p>
      </div>
    </div>
  );
}
```

**Ventajas del enfoque híbrido**:
- ✅ **Rapidez de Tailwind** para layouts y prototipos
- ✅ **Control de SCSS** para componentes complejos
- ✅ **Flexibilidad** para elegir la mejor herramienta según el caso
- ✅ **Mantenibilidad** con ambos sistemas trabajando juntos

---

### Forms

#### React Hook Form + Zod

**Por qué React Hook Form**:
- ✅ **Performance** → Re-renders mínimos
- ✅ **Menos código** → API simple
- ✅ **Validation** → Integración con Zod
- ✅ **TypeScript** → Type-safe
- ✅ **Pequeño** → Sin dependencias pesadas

**Por qué Zod**:
- ✅ **Schema validation** → Define una vez, usa everywhere
- ✅ **TypeScript inference** → Types automáticos
- ✅ **Reusable** → Mismo schema en frontend y backend
- ✅ **Error messages** → Customizables
- ✅ **Composable** → Schemas complejos fácilmente

**Ejemplo**:
```typescript
// Schema compartido
const bookingSchema = z.object({
  serviceId: z.number(),
  date: z.date(),
  time: z.string(),
  customerName: z.string().min(2),
  customerPhone: z.string().regex(/^[0-9]{10}$/),
});

type BookingForm = z.infer<typeof bookingSchema>;

// En el componente
const { register, handleSubmit, formState: { errors } } =
  useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
  });
```

---

### HTTP Client

#### Axios

**Por qué Axios**:
- ✅ **Interceptors** → Auth tokens automáticos
- ✅ **Request/Response transformation** → Manejo centralizado
- ✅ **Cancel requests** → Evitar race conditions
- ✅ **Timeout configuration** → Control fino
- ✅ **Better error handling** → Más info que fetch
- ✅ **Backward compatible** → IE11 si se necesita

**Configuración típica**:
```typescript
const api = axios.create({
  baseURL: 'https://api.ronda.com/v1',
  timeout: 10000,
});

// Interceptor para auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
    }
    return Promise.reject(error);
  }
);
```

---

### Date Handling

#### date-fns

**Por qué date-fns**:
- ✅ **Modular** → Tree-shakeable, solo importas lo que usas
- ✅ **Inmutable** → No muta dates
- ✅ **TypeScript** → Tipado completo
- ✅ **i18n** → Locales incluidos
- ✅ **Pequeño** → Más ligero que moment.js
- ✅ **Funcional** → Composable

**Uso típico**:
```typescript
import { format, addDays, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';

const today = new Date();
const tomorrow = addDays(today, 1);
const formattedDate = format(tomorrow, 'PPP', { locale: es });
// "11 de junio de 2026"

const isAvailable = isAfter(bookingDate, minDate);
```

---

### PWA (Progressive Web App)

**Features implementadas**:
- ✅ **Service Worker** → Cache de assets
- ✅ **Manifest.json** → Instalable en home screen
- ✅ **Offline fallback** → Funciona sin internet
- ✅ **Add to home screen** → Ícono en móvil
- ✅ **Push notifications** → Web push API

**Objetivo**: Sentirse como app nativa sin instalar desde store.

---

## ⚙️ Backend API

### Framework - NestJS

**Por qué NestJS sobre Express puro**:

#### Razones de Arquitectura

1. **Organización forzada**
   - ✅ Estructura modular predefinida
   - ✅ Separation of concerns automático
   - ✅ Escalabilidad desde día 1

2. **TypeScript first-class**
   - ✅ Decorators para routing
   - ✅ Dependency injection built-in
   - ✅ Type safety end-to-end

3. **Ecosistema completo**
   - ✅ Guards (auth)
   - ✅ Interceptors (logging, transform)
   - ✅ Pipes (validation)
   - ✅ Filters (error handling)
   - ✅ Middleware

4. **Preparado para complejidad**
   - ✅ WhatsApp integration
   - ✅ Sistema de pagos
   - ✅ Notificaciones
   - ✅ Roles y permisos (RBAC)
   - ✅ Marketplace

**Cuándo la complejidad llega, NestJS ya te tiene cubierto.**

---

#### Estructura de NestJS

```
api/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── guards/
│   │   │   │   └── jwt-auth.guard.ts
│   │   │   ├── strategies/
│   │   │   │   └── jwt.strategy.ts
│   │   │   └── dto/
│   │   │       ├── login.dto.ts
│   │   │       └── register.dto.ts
│   │   │
│   │   ├── professionals/
│   │   ├── services/
│   │   ├── bookings/
│   │   ├── customers/
│   │   ├── whatsapp/
│   │   └── business/
│   │
│   ├── common/
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   └── pipes/
│   │
│   ├── config/
│   │   └── configuration.ts
│   │
│   ├── database/
│   │   └── prisma.service.ts
│   │
│   ├── app.module.ts
│   └── main.ts
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
└── test/
```

---

#### Ejemplo de Módulo

```typescript
// bookings.controller.ts
@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Get()
  async findAll(@CurrentUser() user: User) {
    return this.bookingsService.findAllByUser(user.id);
  }

  @Post()
  @UsePipes(new ValidationPipe())
  async create(
    @Body() createBookingDto: CreateBookingDto,
    @CurrentUser() user: User,
  ) {
    return this.bookingsService.create(createBookingDto, user);
  }

  @Patch(':id/cancel')
  async cancel(@Param('id') id: number, @CurrentUser() user: User) {
    return this.bookingsService.cancel(id, user);
  }
}

// bookings.service.ts
@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBookingDto, user: User) {
    // Validar disponibilidad
    const isAvailable = await this.checkAvailability(dto);
    if (!isAvailable) {
      throw new ConflictException('Horario no disponible');
    }

    // Crear reserva
    return this.prisma.booking.create({
      data: {
        ...dto,
        customerId: user.id,
        status: 'pending',
      },
    });
  }

  async cancel(id: number, user: User) {
    // Verificar propiedad y política de cancelación
    const booking = await this.findOne(id);
    this.validateCancellationPolicy(booking);

    return this.prisma.booking.update({
      where: { id },
      data: { status: 'cancelled' },
    });
  }
}
```

---

#### Ventajas de NestJS en Este Proyecto

**Fase 1 (MVP)**:
```typescript
// Ya tienes estructura clara
modules/
├── auth/
├── professionals/
└── bookings/
```

**Fase 2 (CRM + Anticipos)**:
```typescript
// Simplemente agregar módulos
+ customers/
+ analytics/
+ payments/
```

**Fase 3 (Marketplace)**:
```typescript
+ search/
+ reviews/
+ subscriptions/
```

**Fase 4 (Multi-usuario + WhatsApp)**:
```typescript
+ business/
+ whatsapp/
+ roles/

// Sistema de roles con Guards
@UseGuards(RolesGuard)
@Roles('admin', 'professional')
@Get('team')
getTeam() { }
```

**Sin NestJS**: Todo sería un gran Express app con archivos mezclados.

**Con NestJS**: Cada feature es un módulo independiente y testeable.

---

### Runtime

#### Node.js 20+ LTS

**Por qué Node.js**:
- ✅ **JavaScript/TypeScript full-stack** → Un lenguaje para todo
- ✅ **Async I/O** → Perfecto para APIs con muchas conexiones
- ✅ **NPM ecosystem** → Millones de paquetes
- ✅ **Performance** → Suficiente para 99% de casos
- ✅ **Comunidad masiva** → Fácil encontrar ayuda

**LTS (Long Term Support)**:
- Actualizaciones de seguridad garantizadas
- Estabilidad
- No breaking changes sorpresa

---

## 🗄️ Base de Datos

### PostgreSQL

**Por qué PostgreSQL sin pensarlo**:

#### Naturaleza Relacional del Dominio

**Datos a manejar**:
```
Usuarios (profesionales, clientes, admin)
    ↓
Servicios
    ↓
Horarios (configuración compleja)
    ↓
Reservas (con estados y transiciones)
    ↓
Pagos (anticipos, confirmaciones)
    ↓
Clientes (CRM con historial)
```

**Todo es relacional y requiere**:
- ✅ **Foreign keys** → Integridad referencial
- ✅ **Transactions** → Reservas atómicas
- ✅ **ACID** → Consistencia de datos
- ✅ **Joins** → Queries complejas eficientes

---

#### Casos de Uso Específicos

**1. Reservas (Bookings)**:
```sql
-- Atomicidad: Reservar Y bloquear horario en una transacción
BEGIN;
  INSERT INTO bookings (professional_id, service_id, date, time)
  VALUES (1, 2, '2026-06-11', '14:00');

  UPDATE schedule_blocks
  SET is_available = false
  WHERE professional_id = 1 AND date = '2026-06-11' AND time = '14:00';
COMMIT;
```

**2. Búsqueda de disponibilidad**:
```sql
-- JOIN para encontrar horarios disponibles
SELECT s.id, s.time, p.name, srv.name, srv.duration
FROM schedule_slots s
INNER JOIN professionals p ON s.professional_id = p.id
INNER JOIN services srv ON s.service_id = srv.id
LEFT JOIN bookings b ON s.id = b.schedule_slot_id
WHERE s.date = '2026-06-11'
  AND b.id IS NULL  -- No reservado
  AND p.city = 'Medellín';
```

**3. Historial de clientes (CRM)**:
```sql
-- Aggregations para estadísticas
SELECT
  c.id,
  c.name,
  COUNT(b.id) as total_bookings,
  MAX(b.date) as last_visit,
  SUM(s.price) as total_spent
FROM customers c
LEFT JOIN bookings b ON c.id = b.customer_id
LEFT JOIN services s ON b.service_id = s.id
GROUP BY c.id
HAVING COUNT(b.id) >= 3  -- Clientes frecuentes
ORDER BY total_spent DESC;
```

---

#### Features Avanzadas que Usaremos

**Fase 1-2**:
- Transactions para reservas
- Foreign keys para integridad
- Indexes para performance
- Timestamps automáticos

**Fase 3 (Marketplace)**:
- **PostGIS** → Geolocalización
  ```sql
  -- Buscar profesionales a menos de 5km
  SELECT * FROM professionals
  WHERE ST_DWithin(
    location,
    ST_MakePoint(-75.5636, 6.2442)::geography,
    5000  -- 5km en metros
  );
  ```

**Fase 4 (Multi-usuario)**:
- **Row Level Security (RLS)** → Aislar datos por negocio
- **Materialized Views** → Reportes rápidos
- **JSON columns** → Configuraciones flexibles

---

#### Por Qué NO MongoDB

| Característica | PostgreSQL | MongoDB |
|----------------|------------|---------|
| **Reservas atómicas** | ✅ Transactions | ⚠️ Limitado |
| **Integridad referencial** | ✅ Foreign keys | ❌ Manual |
| **Queries complejas** | ✅ SQL powerful | ⚠️ Aggregation pipeline |
| **ACID garantizado** | ✅ Siempre | ⚠️ Con configuración |
| **Geolocalización** | ✅ PostGIS | ✅ Geo queries |
| **Escalabilidad** | ✅ Vertical + Horizontal | ✅ Horizontal fácil |

**Decisión**: PostgreSQL es la elección natural para este dominio.

---

### ORM - Prisma

**Por qué Prisma**:

#### 1. Type Safety Completo

```typescript
// Schema Prisma
model Booking {
  id            Int      @id @default(autoincrement())
  professionalId Int
  serviceId     Int
  date          DateTime
  status        String   // 'pending' | 'confirmed' | 'cancelled'

  professional  Professional @relation(fields: [professionalId], references: [id])
  service       Service      @relation(fields: [serviceId], references: [id])
}

// TypeScript automático
const booking: Booking = await prisma.booking.create({
  data: {
    professionalId: 1,
    serviceId: 2,
    date: new Date(),
    status: 'pending', // Autocomplete funciona
  },
});

// ❌ Esto no compila
booking.status = 'invalid'; // Error: Type '"invalid"' is not assignable
```

---

#### 2. Migraciones Automáticas

```bash
# Cambio en schema.prisma
model Booking {
  + customerEmail String
}

# Generar migración
npx prisma migrate dev --name add-customer-email

# Prisma genera:
# - SQL migration file
# - TypeScript types actualizados
# - Todo sincronizado
```

---

#### 3. Productividad 10x

**Query típica con TypeORM**:
```typescript
const booking = await bookingRepository
  .createQueryBuilder('booking')
  .leftJoinAndSelect('booking.professional', 'professional')
  .leftJoinAndSelect('booking.service', 'service')
  .where('booking.date = :date', { date })
  .getOne();
```

**Misma query con Prisma**:
```typescript
const booking = await prisma.booking.findFirst({
  where: { date },
  include: {
    professional: true,
    service: true,
  },
});
```

**Menos líneas, más legible, type-safe.**

---

#### 4. Prisma Studio

**GUI incluido** para explorar datos:
```bash
npx prisma studio
```

- Ver todas las tablas
- Editar datos directamente
- Filtrar y buscar
- Relaciones visualizadas

**Perfecto para debugging en desarrollo.**

---

#### NestJS + Prisma + PostgreSQL

**La trinidad perfecta**:

```typescript
// prisma.service.ts (NestJS)
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

// bookings.service.ts
@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.booking.findMany({
      include: {
        professional: true,
        service: true,
      },
    });
  }
}
```

**Ventajas**:
- Tipado completo
- Dependency injection
- Testeable fácilmente
- Performance excelente

---

## 📦 Storage - Imágenes

### AWS S3

**Para qué**:
- Foto de perfil de profesionales
- Galería de trabajos (portfolio)
- Fotos de servicios
- Fotos del negocio/local
- Comprobantes de pago (Fase 2)

**Por qué S3**:
- ✅ **Escalable** → Sin límites de almacenamiento
- ✅ **Confiable** → 99.999999999% durability
- ✅ **CDN integration** → CloudFront para carga rápida
- ✅ **Cost-effective** → Pay-as-you-go
- ✅ **Presigned URLs** → Upload directo desde cliente
- ✅ **Lifecycle policies** → Mover a Glacier para backups

---

### Alternativa: Cloudinary

**Si prefieres managed service**:
- ✅ **Transformación automática** → Resize, crop, optimize
- ✅ **CDN incluido** → Global edge locations
- ✅ **Más simple** → Menos configuración que S3
- ✅ **Plan gratuito generoso** → Suficiente para MVP

**Cuándo usar Cloudinary**:
- Necesitas transformación de imágenes on-the-fly
- Prefieres simplicidad sobre control total
- Fase MVP donde tiempo > costo

**Cuándo usar S3**:
- Necesitas control fino
- Escala muy grande
- Ya tienes experiencia con AWS

**Recomendación**: Empezar con **Cloudinary** en Fase 1, migrar a S3 si es necesario.

---

## 🚀 Infraestructura y Hosting

### Estrategia de Deployment

#### Arquitectura Recomendada

```
Frontend (React)          Backend (NestJS)
     ↓                          ↓
  GoDaddy                    VPS/Railway
     ↓                          ↓
app.ronda.com         api.ronda.com
```

**Separación física de concerns.**

---

### Frontend - GoDaddy

**Por qué aprovechar GoDaddy**:
- ✅ Ya tienes el hosting
- ✅ React build estático → Perfecto para hosting tradicional
- ✅ Fácil de deployar
- ✅ Cero costo adicional

**Proceso de deploy**:
```bash
# Build React app
npm run build

# Output: build/ o dist/

# Upload a GoDaddy vía:
- FTP
- File Manager
- Git deploy (si GoDaddy lo soporta)
```

**Configuración de dominio**:
```
ronda.com → GoDaddy hosting (React build)
```

---

### Backend - VPS/Railway/Render

**Opciones recomendadas**:

#### Opción 1: Railway (Más Simple)

**Por qué Railway**:
- ✅ **Deploy automático** → Git push = deploy
- ✅ **PostgreSQL incluido** → Managed database
- ✅ **Variables de entorno** → UI simple
- ✅ **Logs en vivo** → Debugging fácil
- ✅ **$5/mes aprox** → Muy barato para MVP
- ✅ **Escala automática** → Sin configuración

**Setup**:
```bash
# 1. Conectar repo GitHub
# 2. Railway detecta NestJS automáticamente
# 3. Deploy en 2 minutos

# URL automática:
https://ronda-api.railway.app
```

**Configurar dominio custom**:
```
api.ronda.com → Railway deployment
```

---

#### Opción 2: Render

**Similar a Railway**:
- ✅ Free tier generoso
- ✅ PostgreSQL incluido
- ✅ Deploy automático
- ✅ SSL gratis

**Trade-off**:
- ⚠️ Free tier "duerme" después de 15min sin uso
- ⚠️ Primera request tarda ~30s en "despertar"

**Recomendación**: Railway > Render para producción.

---

#### Opción 3: VPS (DigitalOcean, Linode, Vultr)

**Por qué VPS**:
- ✅ **Control total** → Root access
- ✅ **Barato** → $5-10/mes
- ✅ **Predecible** → No surprises en billing
- ✅ **Aprendizaje** → Sabes cómo funciona todo

**Trade-off**:
- ⚠️ **Más trabajo** → Setup manual de Nginx, PM2, SSL
- ⚠️ **Mantenimiento** → Updates de seguridad, monitoring

**Cuándo elegir VPS**:
- Quieres máximo control
- Tienes experiencia con Linux
- Múltiples proyectos en mismo servidor

---

#### Opción 4: AWS (Futuro)

**Fase 5+**: Cuando tengas 500+ profesionales activos

**Stack completo AWS**:
```
EC2/ECS         → API servers
RDS PostgreSQL  → Database managed
S3              → Storage
CloudFront      → CDN global
Load Balancer   → Traffic distribution
Auto Scaling    → Escalamiento automático
CloudWatch      → Monitoring
```

**Costo**: $100-300/mes para escala media.

**No empezar con AWS**: Over-engineering para MVP.

---

### Mi Recomendación para Fase 1

```
Frontend:  GoDaddy (ya tienes)
Backend:   Railway ($5/mes)
Database:  Railway PostgreSQL (incluido)
Storage:   Cloudinary (free tier)
```

**Total cost**: ~$5/mes

**Deploy time**: ~1 hora para configurar todo.

---

### Migración Futura (Fase 3+)

**Cuando tengas 50,000+ reservas/mes**:

```
Frontend:
  GoDaddy → AWS S3 + CloudFront
  O Vercel (especializado en React)

Backend:
  Railway → AWS ECS + RDS

Storage:
  Cloudinary → AWS S3 + CloudFront
```

**Importante**: La API no cambia, solo el hosting.

**Beneficio de arquitectura separada**:
```
React no sabe dónde está hosteada la API.
API no sabe dónde está hosteado React.

Cambiar uno no afecta al otro.
```

---

## 🔌 Servicios Externos

### Autenticación - JWT

**Por qué JWT**:
- ✅ **Stateless** → No requiere almacenar sesiones
- ✅ **Escalable** → Load balancer friendly
- ✅ **Multi-dispositivo** → Un token por dispositivo
- ✅ **Standard** → OAuth2 compatible

**Implementación NestJS**:
```typescript
// JWT Strategy
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    return { userId: payload.sub, email: payload.email };
  }
}

// Uso en controller
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@CurrentUser() user: User) {
  return user;
}
```

**Roles**:
- Profesional independiente
- Administrador de negocio
- Profesional de negocio
- Recepcionista

---

### Email - Resend

**Por qué Resend sobre SendGrid**:
- ✅ **Developer experience** → API más simple
- ✅ **React Email** → Emails con componentes React
- ✅ **Mejores templates** → Más modernos
- ✅ **Pricing transparente** → No hidden costs
- ✅ **Mejor deliverability** → Menos spam folder

**Casos de uso**:
- Email de bienvenida
- Confirmación de reserva
- Recordatorio de cita (24h antes, 2h antes)
- Recuperar contraseña
- Notificación de cancelación

**Ejemplo con Resend**:
```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'Ronda <noreply@ronda.com>',
  to: customer.email,
  subject: 'Confirmación de tu cita',
  react: BookingConfirmationEmail({ booking }),
});
```

---

### WhatsApp - WhatsApp Business Platform

**Fase 2**: Notificaciones por WhatsApp
**Fase 4**: Reservas completas por WhatsApp

**Opciones**:

#### 1. Twilio API for WhatsApp (Recomendado para MVP)

**Por qué Twilio**:
- ✅ **Fácil setup** → 15 minutos
- ✅ **Sandbox gratis** → Para testing
- ✅ **Documentación excelente** → Ejemplos en NestJS
- ✅ **Pay-as-you-go** → Sin mínimos

**Pricing**:
- Conversaciones iniciadas por negocio: $0.005/msg
- Respuestas de usuarios: Gratis

**Ejemplo**:
```typescript
import { Twilio } from 'twilio';

const client = new Twilio(accountSid, authToken);

await client.messages.create({
  from: 'whatsapp:+14155238886',
  to: 'whatsapp:+573001234567',
  body: 'Tu cita es mañana a las 3:00 PM. Confirma con SÍ o NO.',
});
```

---

#### 2. WhatsApp Business API Oficial

**Para Fase 4** (cuando tengas 500+ profesionales):
- ✅ Marca verificada en WhatsApp
- ✅ Plantillas de mensaje aprobadas
- ✅ Más confiable para volumen alto

**Trade-off**:
- ⚠️ Proceso de aprobación largo (~2 semanas)
- ⚠️ Requiere verificación de negocio

---

#### 3. 360Dialog

**Alternativa a Twilio**:
- Partner oficial de WhatsApp
- Precios similares
- API compatible

---

### Notificaciones Push - Firebase Cloud Messaging

**Fase 5**: Cuando llegue React Native

**Para**:
- Android
- iOS

**Por qué FCM**:
- ✅ **Gratis** → Sin límites
- ✅ **Cross-platform** → Un SDK para ambos
- ✅ **Confiable** → Infraestructura de Google
- ✅ **Segmentación** → Enviar a grupos específicos

**Casos de uso**:
- Nueva reserva creada
- Recordatorio de cita
- Reserva cancelada
- Mensaje del cliente

---

### Pagos - Wompi (Fase 6)

**Por qué Wompi para Colombia**:
- ✅ **PSE** → Transferencias bancarias
- ✅ **Nequi** → Wallet más usado
- ✅ **Tarjetas** → Visa, Mastercard, Amex
- ✅ **Bancolombia** → Botón de pago
- ✅ **Sin mensualidad** → Solo comisión por transacción
- ✅ **Colombiano** → Soporte en español

**Alternativas**:
- Mercado Pago (más caro)
- PayU (buena alternativa)
- Stripe (internacional, más complejo para Colombia)

**Integración**:
```typescript
// NestJS + Wompi
@Post('payments/create')
async createPayment(@Body() dto: CreatePaymentDto) {
  const response = await axios.post('https://production.wompi.co/v1/transactions', {
    amount_in_cents: dto.amount * 100,
    currency: 'COP',
    customer_email: dto.email,
    reference: `booking-${dto.bookingId}`,
    redirect_url: 'https://ronda.com/payment/success',
  }, {
    headers: {
      Authorization: `Bearer ${process.env.WOMPI_PUBLIC_KEY}`,
    },
  });

  return response.data;
}
```

---

### Analytics - Google Analytics

**Para**:
- Visitas al sitio
- Conversiones (reservas)
- Funnel de registro
- Páginas más visitadas
- Tiempo en sitio

**Setup**:
```typescript
// React + GA4
import ReactGA from 'react-ga4';

ReactGA.initialize('G-XXXXXXXXXX');

// Track pageview
ReactGA.send({ hitType: 'pageview', page: window.location.pathname });

// Track event
ReactGA.event({
  category: 'Booking',
  action: 'Create',
  label: 'Professional: Jose Barber',
});
```

---

### Analytics Avanzado - PostHog (Fase 3+)

**Cuando necesites**:
- Feature flags
- A/B testing
- Session recording
- Heatmaps
- User funnels detallados

**Por qué PostHog**:
- ✅ **Open source** → Self-hosteable
- ✅ **Todo-en-uno** → Analytics + Feature flags + A/B
- ✅ **Privacy-friendly** → GDPR compliant
- ✅ **Barato** → 1M events gratis/mes

---

### Error Tracking - Sentry

**Para**:
- Errors en frontend (React)
- Errors en backend (NestJS)
- Performance monitoring
- Release tracking

**Ejemplo**:
```typescript
// main.ts (NestJS)
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

// Captura automática de errores no manejados
```

**Beneficio**:
```
"No se pudo reservar cita"
↓
Sentry te dice:
- Stack trace completo
- Usuario afectado
- Request que causó el error
- Frecuencia del error
- Ambiente (staging/production)
```

---

### Testing - Estrategia Completa

**Filosofía**: Testear lógica crítica del negocio, no UI simple.

#### Backend - NestJS

**Stack de testing**:
```
✅ Jest (incluido por defecto)
✅ Supertest (integration tests)
✅ @nestjs/testing (utilidades)
```

**Tests obligatorios**:

**1. Unit Tests - Lógica de negocio**:
```typescript
// bookings.service.spec.ts
describe('BookingsService', () => {
  it('should create booking if slot is available', async () => {
    const booking = await service.create({
      professionalId: 1,
      serviceId: 1,
      date: tomorrow,
      time: '14:00',
    });

    expect(booking.status).toBe('pending');
  });

  it('should throw error if slot is taken', async () => {
    await expect(
      service.create({ /* same slot */ })
    ).rejects.toThrow('Horario no disponible');
  });
});
```

**2. Integration Tests - API endpoints**:
```typescript
// bookings.controller.spec.ts (E2E)
describe('Bookings API', () => {
  it('POST /bookings creates a booking', () => {
    return request(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        professionalId: 1,
        serviceId: 1,
        date: '2026-06-15',
        time: '14:00',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.status).toBe('pending');
      });
  });
});
```

**Cobertura mínima**:
- ✅ 80%+ en servicios críticos (bookings, auth, availability)
- ✅ 60%+ en servicios secundarios
- ❌ No testear DTOs simples ni controllers triviales

---

#### Frontend - React

**Stack de testing**:
```
✅ Vitest (más rápido que Jest)
✅ React Testing Library
✅ MSW (Mock Service Worker para API)
✅ Playwright (E2E)
```

**Setup Vitest**:
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
```

**Tests obligatorios**:

**1. Component Tests - Lógica y comportamiento**:
```typescript
// BookingForm.test.tsx
import { render, screen, userEvent } from '@testing-library/react';
import { BookingForm } from './BookingForm';

describe('BookingForm', () => {
  it('validates required fields', async () => {
    render(<BookingForm />);

    const submitButton = screen.getByRole('button', { name: /reservar/i });
    await userEvent.click(submitButton);

    expect(screen.getByText(/nombre es requerido/i)).toBeInTheDocument();
  });

  it('submits booking when valid', async () => {
    const onSubmit = vi.fn();
    render(<BookingForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/nombre/i), 'Carlos');
    await userEvent.type(screen.getByLabelText(/teléfono/i), '3001234567');
    await userEvent.click(screen.getByRole('button', { name: /reservar/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Carlos',
      phone: '3001234567',
    });
  });
});
```

**2. Integration Tests - Hooks + API**:
```typescript
// useBookings.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { useBookings } from './useBookings';
import { server } from '../test/mocks/server';

describe('useBookings', () => {
  it('fetches bookings successfully', async () => {
    const { result } = renderHook(() => useBookings());

    await waitFor(() => {
      expect(result.current.data).toHaveLength(3);
    });
  });

  it('handles API errors', async () => {
    server.use(
      http.get('/api/bookings', () => {
        return HttpResponse.error();
      })
    );

    const { result } = renderHook(() => useBookings());

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });
});
```

**3. E2E Tests - Flujos críticos** (Playwright):
```typescript
// booking-flow.spec.ts
import { test, expect } from '@playwright/test';

test('complete booking flow', async ({ page }) => {
  await page.goto('/jose-barber');

  // Select service
  await page.click('text=Corte de cabello');

  // Select date and time
  await page.click('[data-date="2026-06-15"]');
  await page.click('[data-time="14:00"]');

  // Fill customer info
  await page.fill('[name="name"]', 'Carlos');
  await page.fill('[name="phone"]', '3001234567');

  // Submit
  await page.click('button:has-text("Confirmar reserva")');

  // Verify success
  await expect(page.locator('text=Reserva confirmada')).toBeVisible();
});
```

**Cobertura mínima**:
- ✅ 70%+ en hooks y lógica de negocio
- ✅ E2E tests para 5 flujos críticos:
  1. Registro/Login
  2. Crear reserva
  3. Cancelar reserva
  4. Configurar servicios (profesional)
  5. Ver agenda (profesional)

**Cuándo NO testear**:
- ❌ Componentes puramente visuales sin lógica
- ❌ Páginas estáticas
- ❌ Layouts simples

---

#### CI/CD Integration

**GitHub Actions**:
```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd api && npm ci
      - run: npm test
      - run: npm run test:e2e

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd web && npm ci
      - run: npm test
      - run: npx playwright install
      - run: npm run test:e2e
```

---

### Caching y Performance - Redis

**Fase 2+**: Agregar Redis para cache y session management

**Por qué Redis**:
- ✅ **Cache de queries** → Reducir carga en PostgreSQL
- ✅ **Session storage** → Refresh tokens
- ✅ **Rate limiting** → Prevenir abuse
- ✅ **Pub/Sub** → Real-time notifications (Fase 4)
- ✅ **Queue jobs** → Background tasks (emails, WhatsApp)

**Casos de uso**:

**1. Cache de disponibilidad**:
```typescript
// Cache horarios disponibles por 5 minutos
@Injectable()
export class AvailabilityService {
  constructor(
    private prisma: PrismaService,
    private redis: Redis,
  ) {}

  async getAvailableSlots(professionalId: number, date: Date) {
    const cacheKey = `availability:${professionalId}:${date}`;

    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Query DB
    const slots = await this.prisma.scheduleSlot.findMany({
      where: {
        professionalId,
        date,
        isAvailable: true,
      },
    });

    // Cache for 5 minutes
    await this.redis.setex(cacheKey, 300, JSON.stringify(slots));

    return slots;
  }
}
```

**2. Rate limiting**:
```typescript
// Limitar reservas por usuario
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private redis: Redis) {}

  async canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const userId = request.user.id;

    const key = `rate:bookings:${userId}`;
    const count = await this.redis.incr(key);

    if (count === 1) {
      await this.redis.expire(key, 3600); // 1 hour window
    }

    if (count > 10) {
      throw new TooManyRequestsException(
        'Máximo 10 reservas por hora'
      );
    }

    return true;
  }
}
```

**3. Session storage para refresh tokens**:
```typescript
@Injectable()
export class AuthService {
  async createSession(userId: number, refreshToken: string) {
    const sessionKey = `session:${userId}:${refreshToken}`;

    await this.redis.setex(
      sessionKey,
      7 * 24 * 60 * 60, // 7 days
      JSON.stringify({ userId, createdAt: Date.now() })
    );
  }

  async validateRefreshToken(userId: number, refreshToken: string) {
    const sessionKey = `session:${userId}:${refreshToken}`;
    const session = await this.redis.get(sessionKey);

    return session !== null;
  }
}
```

**Hosting Redis**:
- **MVP/Fase 1**: No necesario todavía
- **Fase 2**: Railway Redis (incluido, ~$0)
- **Fase 3+**: Upstash Redis (serverless, pay-as-you-go)

---

### Backup y Disaster Recovery

**Estrategia desde MVP**:

#### 1. PostgreSQL Backups

**Railway automático**:
- ✅ Backups diarios (últimos 7 días)
- ✅ Point-in-time recovery

**Backup manual adicional**:
```bash
# Script de backup semanal
#!/bin/bash
# backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DATE}.sql"

# Dump database
pg_dump $DATABASE_URL > $BACKUP_FILE

# Compress
gzip $BACKUP_FILE

# Upload to S3
aws s3 cp ${BACKUP_FILE}.gz s3://ronda-backups/db/

# Keep only last 30 days locally
find . -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
```

**Cron job**:
```bash
# Run every Sunday at 2 AM
0 2 * * 0 /home/scripts/backup-db.sh
```

#### 2. Testing de Restauración

**Obligatorio mensual**:
```bash
# Probar restauración en ambiente de staging
pg_restore --dbname=ronda_staging backup_YYYYMMDD.sql

# Verificar integridad
psql -d ronda_staging -c "SELECT COUNT(*) FROM bookings;"
psql -d ronda_staging -c "SELECT COUNT(*) FROM professionals;"
```

#### 3. Plan de Disaster Recovery

**RTO (Recovery Time Objective)**: 4 horas
**RPO (Recovery Point Objective)**: 24 horas

**Pasos en caso de desastre**:
1. Provisionar nueva base de datos en Railway
2. Restaurar backup más reciente
3. Actualizar DNS para apuntar a nuevo servidor
4. Verificar funcionalidad crítica
5. Notificar a usuarios

---

## 📅 Stack por Fase

### Fase 1: MVP (7-8 semanas)

```
Frontend:
✅ React 18
✅ TypeScript
✅ React Router v6
✅ TanStack Query
✅ Zustand
✅ Tailwind CSS + SCSS (enfoque híbrido)
✅ React Hook Form + Zod
✅ Axios
✅ date-fns

Backend:
✅ NestJS
✅ Node.js 20 LTS
✅ TypeScript
✅ Prisma
✅ PostgreSQL
✅ JWT

Testing:
✅ Vitest (Frontend)
✅ Jest + Supertest (Backend)
✅ Playwright (E2E - 5 flujos críticos)

Hosting:
✅ GoDaddy (Frontend)
✅ Railway (Backend + DB)

External Services:
✅ Resend (Emails)
✅ Cloudinary (Imágenes)
✅ Sentry (Error tracking)
✅ Google Analytics

Backup:
✅ Railway auto-backup (7 días)
✅ Script de backup manual semanal
```

---

### Fase 2: CRM + Anticipos (10 semanas)

```
Agregar:
+ Resend (más templates)
+ WhatsApp Business (Twilio)
+ File upload (Comprobantes)
```

**Módulos NestJS**:
```
+ customers/
+ analytics/
+ payments/
+ whatsapp/
```

---

### Fase 3: Marketplace (15 semanas)

```
Agregar:
+ Elasticsearch/Algolia (Búsqueda)
+ Google Maps API (Geolocalización)
+ PostGIS (PostgreSQL extension)
+ Stripe/Wompi (Suscripciones)
+ PostHog (Analytics avanzado)
```

**Módulos NestJS**:
```
+ search/
+ reviews/
+ promotions/
+ subscriptions/
+ geolocation/
```

---

### Fase 4: Multi-usuario (20 semanas)

```
Agregar:
+ WhatsApp Business API (oficial)
+ Socket.io (Real-time)
+ Redis (Caché y pub/sub)
```

**Módulos NestJS**:
```
+ business/
+ team/
+ roles/
+ finance/
+ loyalty/
```

---

### Fase 5: Mobile App (12-16 semanas)

```
Agregar:
+ React Native
+ Firebase Cloud Messaging (Push)
+ Firebase Analytics (App analytics)
+ Deep linking
+ Biometric auth (Touch ID, Face ID)
```

**Apps**:
```
1. Ronda (Cliente)
2. Ronda Pro (Profesional)
3. Ronda Business (Admin)
```

**Importante**: Misma API para web y mobile.

---

### Fase 6: Pagos Integrados (8-12 semanas)

```
Agregar:
+ Wompi (Pasarela de pagos)
+ Webhooks (Confirmación de pago)
+ Facturación automática
```

---

### Fase 7: IA (Futuro)

```
Agregar:
+ OpenAI API (Recomendaciones)
+ Análisis predictivo (Demanda)
+ Chatbot inteligente
+ Optimización automática de agenda
```

---

## 🏗️ Arquitectura de Deployment

### Arquitectura Completa

```
┌─────────────────────────────────────────────┐
│              USUARIOS                        │
└──────────────┬──────────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
┌─────────────┐   ┌─────────────┐
│  React Web  │   │React Native │
│  (GoDaddy)  │   │    Apps     │
└──────┬──────┘   └──────┬──────┘
       │                  │
       │   HTTPS/REST     │
       └────────┬─────────┘
                │
                ▼
       ┌─────────────────┐
       │   NestJS API    │
       │   (Railway)     │
       └────────┬────────┘
                │
    ┌───────────┼───────────┐
    │           │           │
    ▼           ▼           ▼
┌────────┐ ┌────────┐ ┌────────┐
│Postgres│ │WhatsApp│ │Cloudinary│
│(Railway)│ │ API    │ │(Images)│
└────────┘ └────────┘ └────────┘
```

---

### URLs Finales

```
Producción:
  - Web:     https://app.ronda.com (GoDaddy)
  - API:     https://api.ronda.com (Railway)
  - Admin:   https://app.ronda.com/dashboard
  - Public:  https://app.ronda.com/:username

Staging:
  - Web:     https://staging.ronda.com
  - API:     https://api-staging.ronda.com

Development:
  - Web:     http://localhost:3000
  - API:     http://localhost:4000
```

---

### CI/CD Pipeline

```
GitHub Push
    ↓
GitHub Actions
    ↓
├─► Run Tests (Jest + Supertest)
│   ├─► Unit tests
│   └─► Integration tests
    ↓
├─► Lint & Type Check
│   ├─► ESLint
│   └─► TypeScript compiler
    ↓
├─► Build
│   ├─► React build (production)
│   └─► NestJS build (production)
    ↓
└─► Deploy
    ├─► Frontend → GoDaddy (or Vercel)
    └─► Backend → Railway

Automatic on: Push to main branch
Manual trigger: For staging deploys
```

---

### Environment Variables

**Frontend (.env.production)**:
```bash
VITE_API_URL=https://api.ronda.com/v1
VITE_GA_ID=G-XXXXXXXXXX
VITE_SENTRY_DSN=https://...
```

**Backend (.env.production)**:
```bash
DATABASE_URL=postgresql://user:pass@host:5432/ronda
JWT_SECRET=super-secret-key-change-in-production
JWT_EXPIRES_IN=7d

RESEND_API_KEY=re_xxxxx
CLOUDINARY_URL=cloudinary://xxxxx

TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_WHATSAPP_NUMBER=+14155238886

SENTRY_DSN=https://xxxxx
NODE_ENV=production
```

---

## 📝 Resumen Ejecutivo

### Stack Definitivo

```
Frontend:
  React + TypeScript + SCSS
  TanStack Query + Zustand
  React Router + React Hook Form + Zod

Backend:
  NestJS + TypeScript
  Prisma + PostgreSQL
  JWT Auth

Mobile (Fase 5):
  React Native
  Same API

Hosting:
  Frontend: GoDaddy
  Backend: Railway
  Database: Railway PostgreSQL
  Images: Cloudinary

External Services:
  Email: Resend
  WhatsApp: Twilio
  Push: Firebase (Fase 5)
  Payments: Wompi (Fase 6)
  Analytics: Google Analytics
  Monitoring: Sentry
```

---

### Por Qué Este Stack

1. **TypeScript everywhere** → Type safety total
2. **React + NestJS** → Ecosistema maduro
3. **PostgreSQL** → Perfecto para dominio relacional
4. **Prisma** → Productividad + typado
5. **SCSS** → Preferencia personal, control total
6. **TanStack Query** → Cache inteligente sin esfuerzo
7. **Zustand** → Estado global simple
8. **Railway** → Deploy fácil, barato, escalable
9. **GoDaddy** → Aprovechar hosting existente

---

### Decisiones Clave

| Decisión | Razón |
|----------|-------|
| ✅ NestJS sobre Express | Organización forzada, escalabilidad |
| ✅ PostgreSQL sobre MongoDB | Datos relacionales, transacciones |
| ✅ SCSS sobre Tailwind | Preferencia personal, separación de concerns |
| ✅ Zustand sobre Redux | Simplicidad, menos boilerplate |
| ✅ Railway sobre AWS | Más simple para MVP, migración fácil |
| ✅ Resend sobre SendGrid | Mejor DX, React Email |
| ✅ Wompi sobre Stripe | Optimizado para Colombia |

---

## 🔗 Links Relacionados

- [[Arquitectura-Tecnica]] - Diseño arquitectónico general
- [[Plataforma-Reservas-Servicios]] - Visión completa del producto
- [[MVP-v1]] - Fase 1 detallada
- [[Proyecto Personal]] - Índice de proyectos

---

**Estado**: ✅ Definido y Aprobado
**Última actualización**: 2026-06-10
**Próximo paso**: Diseñar modelo de datos (Prisma schema)
