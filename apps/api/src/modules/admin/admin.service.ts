import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type {
  AllowlistEntry,
  CreateAllowlistEntryInput,
  Plan,
  ProfessionalForPlanChange,
  UpdateAllowlistEntryInput,
} from '@agendya/types';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listAllowlist(): Promise<AllowlistEntry[]> {
    const rows = await this.prisma.platformAccessEmail.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toAllowlistEntry(row));
  }

  async createAllowlistEntry(
    input: CreateAllowlistEntryInput,
  ): Promise<AllowlistEntry> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.prisma.platformAccessEmail.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictException(`El correo ${email} ya está en la lista.`);
    }

    const row = await this.prisma.platformAccessEmail.create({
      data: { email, access: input.access },
    });
    return this.toAllowlistEntry(row);
  }

  async updateAllowlistEntry(
    email: string,
    input: UpdateAllowlistEntryInput,
    actorEmail: string,
  ): Promise<AllowlistEntry> {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.requireAllowlistEntry(normalizedEmail);

    if (
      normalizedEmail === actorEmail.trim().toLowerCase() &&
      input.access !== 'SUPER_ADMIN'
    ) {
      throw new ForbiddenException(
        'No puedes cambiar tu propio nivel de acceso a uno inferior.',
      );
    }

    if (existing.access === 'SUPER_ADMIN' && input.access !== 'SUPER_ADMIN') {
      await this.assertNotLastSuperAdmin();
    }

    const updated = await this.prisma.platformAccessEmail.update({
      where: { email: normalizedEmail },
      data: { access: input.access },
    });
    return this.toAllowlistEntry(updated);
  }

  async deleteAllowlistEntry(email: string, actorEmail: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.requireAllowlistEntry(normalizedEmail);

    if (normalizedEmail === actorEmail.trim().toLowerCase()) {
      throw new ForbiddenException('No puedes eliminar tu propio acceso.');
    }

    if (existing.access === 'SUPER_ADMIN') {
      await this.assertNotLastSuperAdmin();
    }

    await this.prisma.platformAccessEmail.delete({
      where: { email: normalizedEmail },
    });
  }

  async getProfessionalByEmail(
    email: string,
  ): Promise<ProfessionalForPlanChange> {
    const professional = await this.prisma.professional.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: {
        id: true,
        email: true,
        businessName: true,
        slug: true,
        plan: true,
      },
    });
    if (!professional) {
      throw new NotFoundException(
        `No se encontró un profesional con el correo: ${email}`,
      );
    }
    return professional;
  }

  async changeProfessionalPlan(
    email: string,
    plan: Plan,
  ): Promise<ProfessionalForPlanChange> {
    await this.getProfessionalByEmail(email);
    return this.prisma.professional.update({
      where: { email: email.trim().toLowerCase() },
      data: { plan },
      select: {
        id: true,
        email: true,
        businessName: true,
        slug: true,
        plan: true,
      },
    });
  }

  private async requireAllowlistEntry(email: string) {
    const row = await this.prisma.platformAccessEmail.findUnique({
      where: { email },
    });
    if (!row) {
      throw new NotFoundException(`No se encontró un registro para: ${email}`);
    }
    return row;
  }

  private async assertNotLastSuperAdmin(): Promise<void> {
    const remaining = await this.prisma.platformAccessEmail.count({
      where: { access: 'SUPER_ADMIN' },
    });
    if (remaining <= 1) {
      throw new BadRequestException(
        'No puedes eliminar el último administrador del sistema.',
      );
    }
  }

  private toAllowlistEntry(row: {
    id: string;
    email: string;
    access: AllowlistEntry['access'];
    createdAt: Date;
  }): AllowlistEntry {
    return {
      id: row.id,
      email: row.email,
      access: row.access,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
