import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  planPeriodStart,
  type AllowlistEntry,
  type BillingInterval,
  type CreateAllowlistEntryInput,
  type Plan,
  type ProfessionalForPlanChange,
  type UpdateAllowlistEntryInput,
} from '@agendya/types';

type AllowlistPlanSnapshot = {
  plan: Plan;
  billingInterval: BillingInterval | null;
  planStartedAt: Date | null;
  planExpiresAt: Date | null;
};

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listAllowlist(): Promise<AllowlistEntry[]> {
    const rows = await this.prisma.platformAccessEmail.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const plans = await this.plansByEmail(rows.map((row) => row.email));
    return rows.map((row) =>
      this.toAllowlistEntry(row, plans.get(row.email) ?? null),
    );
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
    return this.toAllowlistEntry(row, await this.planForEmail(email));
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
    return this.toAllowlistEntry(
      updated,
      await this.planForEmail(normalizedEmail),
    );
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
        billingInterval: true,
        planExpiresAt: true,
      },
    });
    if (!professional) {
      throw new NotFoundException(
        `No se encontró un profesional con el correo: ${email}`,
      );
    }
    return this.toPlanChange(professional);
  }

  async changeProfessionalPlan(
    email: string,
    plan: Plan,
  ): Promise<ProfessionalForPlanChange> {
    await this.getProfessionalByEmail(email);
    const updated = await this.prisma.professional.update({
      where: { email: email.trim().toLowerCase() },
      data: {
        plan,
        billingInterval: null,
        planStartedAt: null,
        planExpiresAt: null,
      },
      select: {
        id: true,
        email: true,
        businessName: true,
        slug: true,
        plan: true,
        billingInterval: true,
        planExpiresAt: true,
      },
    });
    return this.toPlanChange(updated);
  }

  private async plansByEmail(
    emails: string[],
  ): Promise<Map<string, AllowlistPlanSnapshot>> {
    if (emails.length === 0) {
      return new Map();
    }
    const professionals = await this.prisma.professional.findMany({
      where: { email: { in: emails } },
      select: {
        email: true,
        plan: true,
        billingInterval: true,
        planStartedAt: true,
        planExpiresAt: true,
      },
    });
    return new Map(
      professionals.map((row) => [
        row.email,
        {
          plan: row.plan,
          billingInterval: row.billingInterval,
          planStartedAt: row.planStartedAt,
          planExpiresAt: row.planExpiresAt,
        },
      ]),
    );
  }

  private async planForEmail(
    email: string,
  ): Promise<AllowlistPlanSnapshot | null> {
    const professional = await this.prisma.professional.findUnique({
      where: { email },
      select: {
        plan: true,
        billingInterval: true,
        planStartedAt: true,
        planExpiresAt: true,
      },
    });
    return professional
      ? {
          plan: professional.plan,
          billingInterval: professional.billingInterval,
          planStartedAt: professional.planStartedAt,
          planExpiresAt: professional.planExpiresAt,
        }
      : null;
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

  private toAllowlistEntry(
    row: {
      id: string;
      email: string;
      access: AllowlistEntry['access'];
      createdAt: Date;
    },
    snapshot: AllowlistPlanSnapshot | null,
  ): AllowlistEntry {
    return {
      id: row.id,
      email: row.email,
      access: row.access,
      createdAt: row.createdAt.toISOString(),
      plan: snapshot?.plan ?? null,
      billingInterval: snapshot?.billingInterval ?? null,
      planStartedAt: resolvePlanStartedAt(snapshot),
      planExpiresAt: snapshot?.planExpiresAt?.toISOString() ?? null,
    };
  }

  private toPlanChange(row: {
    id: string;
    email: string;
    businessName: string;
    slug: string;
    plan: Plan;
    billingInterval: BillingInterval | null;
    planExpiresAt: Date | null;
  }): ProfessionalForPlanChange {
    return {
      id: row.id,
      email: row.email,
      businessName: row.businessName,
      slug: row.slug,
      plan: row.plan,
      billingInterval: row.billingInterval,
      planExpiresAt: row.planExpiresAt?.toISOString() ?? null,
    };
  }
}

function resolvePlanStartedAt(
  snapshot: AllowlistPlanSnapshot | null,
): string | null {
  if (!snapshot) {
    return null;
  }
  if (snapshot.planStartedAt) {
    return snapshot.planStartedAt.toISOString();
  }
  if (snapshot.planExpiresAt && snapshot.billingInterval) {
    return planPeriodStart(
      snapshot.planExpiresAt,
      snapshot.billingInterval,
    ).toISOString();
  }
  return null;
}
