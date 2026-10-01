import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { SignOptions } from 'jsonwebtoken';
import { InternalJwtStrategy } from './auth/internal-jwt.strategy';
import { BackofficeAuthController } from './auth/backoffice-auth.controller';
import { BackofficeAuthService } from './auth/backoffice-auth.service';
import { AuditLogController } from './audit-log/audit-log.controller';
import { AuditLogService } from './audit-log/audit-log.service';
import { InternalUsersController } from './internal-users/internal-users.controller';
import { InternalUsersService } from './internal-users/internal-users.service';
import { TicketsController } from './tickets/tickets.controller';
import { TicketsService } from './tickets/tickets.service';
import { BackofficeProfessionalsController } from './professionals/professionals.controller';
import { BackofficeProfessionalsService } from './professionals/professionals.service';
import { AppointmentsController } from './appointments/appointments.controller';
import { AppointmentsService } from './appointments/appointments.service';
import { BackofficeSearchController } from './search/search.controller';
import { BackofficeSearchService } from './search/search.service';
import { BackofficeDashboardController } from './dashboard/dashboard.controller';
import { BackofficeDashboardService } from './dashboard/dashboard.service';

/**
 * Agendya Backoffice — internal operations & support (Phase 1 MVP). Entirely
 * additive: no route here overlaps `/admin/*` (the existing SUPER_ADMIN
 * platform panel) or any customer-facing route, and `InternalUser` is a
 * separate identity from `Professional`. See the Backoffice plan for the
 * full design rationale.
 *
 * Registers its own `JwtModule` (same secret/expiry config as the
 * customer-facing `AuthModule`, but Backoffice tokens carry a distinct
 * `audience` claim — see `BACKOFFICE_JWT_AUDIENCE` — so the two token
 * families can never authenticate each other's routes).
 */
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>(
            'jwt.expiresIn',
          ) as SignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [
    BackofficeAuthController,
    AuditLogController,
    InternalUsersController,
    TicketsController,
    BackofficeProfessionalsController,
    AppointmentsController,
    BackofficeSearchController,
    BackofficeDashboardController,
  ],
  providers: [
    InternalJwtStrategy,
    BackofficeAuthService,
    AuditLogService,
    InternalUsersService,
    TicketsService,
    BackofficeProfessionalsService,
    AppointmentsService,
    BackofficeSearchService,
    BackofficeDashboardService,
  ],
})
export class BackofficeModule {}
