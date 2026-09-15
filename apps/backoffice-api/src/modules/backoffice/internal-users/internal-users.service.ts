import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { Prisma } from '@prisma/client';
import type {
  CreateInternalUserInput,
  InternalUser,
  UpdateInternalUserRoleInput,
  UpdateInternalUserStatusInput,
} from '@agendya/types';
import { PrismaService } from '../../../database/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

const SALT_ROUNDS = 10;

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.InternalUserSelect;

/**
 * SUPER_ADMIN-only staff management. No self-registration exists anywhere
 * in the Backoffice by design — the first SUPER_ADMIN is provisioned via
 * `apps/backoffice-api/scripts/seed-backoffice.mjs`, after which they create everyone
 * else here.
 */
@Injectable()
export class InternalUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async list(): Promise<InternalUser[]> {
    const rows = await this.prisma.internalUser.findMany({
      select: USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toDto);
  }

  async create(
    input: CreateInternalUserInput,
    actorId: string,
  ): Promise<InternalUser> {
    const existing = await this.prisma.internalUser.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      throw new ConflictException(
        `Ya existe un usuario interno con el correo ${input.email}.`,
      );
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const created = await this.prisma.internalUser.create({
      data: {
        email: input.email,
        name: input.name,
        role: input.role,
        passwordHash,
      },
      select: USER_SELECT,
    });

    await this.auditLog.record(
      actorId,
      'INTERNAL_USER_CREATED',
      'InternalUser',
      created.id,
      { email: created.email, role: created.role },
    );

    return toDto(created);
  }

  async updateRole(
    id: string,
    input: UpdateInternalUserRoleInput,
    actorId: string,
  ): Promise<InternalUser> {
    const existing = await this.requireUser(id);

    if (
      existing.id === actorId &&
      existing.role === 'SUPER_ADMIN' &&
      input.role !== 'SUPER_ADMIN'
    ) {
      throw new ForbiddenException(
        'No puedes quitarte a ti mismo el rol de administrador.',
      );
    }
    if (existing.role === 'SUPER_ADMIN' && input.role !== 'SUPER_ADMIN') {
      await this.assertNotLastSuperAdmin();
    }

    const updated = await this.prisma.internalUser.update({
      where: { id },
      data: { role: input.role },
      select: USER_SELECT,
    });

    await this.auditLog.record(
      actorId,
      'INTERNAL_USER_ROLE_CHANGED',
      'InternalUser',
      id,
      { from: existing.role, to: input.role },
    );

    return toDto(updated);
  }

  async updateStatus(
    id: string,
    input: UpdateInternalUserStatusInput,
    actorId: string,
  ): Promise<InternalUser> {
    const existing = await this.requireUser(id);

    if (existing.id === actorId && !input.isActive) {
      throw new ForbiddenException('No puedes desactivar tu propia cuenta.');
    }
    if (existing.role === 'SUPER_ADMIN' && !input.isActive) {
      await this.assertNotLastSuperAdmin();
    }

    const updated = await this.prisma.internalUser.update({
      where: { id },
      data: { isActive: input.isActive },
      select: USER_SELECT,
    });

    if (!input.isActive) {
      await this.auditLog.record(
        actorId,
        'INTERNAL_USER_DEACTIVATED',
        'InternalUser',
        id,
      );
    }

    return toDto(updated);
  }

  private async requireUser(id: string) {
    const user = await this.prisma.internalUser.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario interno no encontrado.');
    }
    return user;
  }

  private async assertNotLastSuperAdmin(): Promise<void> {
    const remaining = await this.prisma.internalUser.count({
      where: { role: 'SUPER_ADMIN', isActive: true },
    });
    if (remaining <= 1) {
      throw new BadRequestException(
        'No puedes dejar el Backoffice sin un administrador activo.',
      );
    }
  }
}

function toDto(
  row: Prisma.InternalUserGetPayload<{ select: typeof USER_SELECT }>,
): InternalUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
