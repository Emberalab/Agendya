import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  CreateScheduleExceptionInput,
  ScheduleException,
  SetWorkingHoursInput,
  WorkingHour,
} from '@agendya/types';
import { PrismaService } from '../../database/prisma.service';
import { dateOnlyUtc, formatDateOnly } from '../../common/utils/timezone.util';

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async getWorkingHours(professionalId: string): Promise<WorkingHour[]> {
    const hours = await this.prisma.workingHour.findMany({
      where: { professionalId },
      orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }],
    });

    return hours.map((hour) => ({
      id: hour.id,
      dayOfWeek: hour.dayOfWeek,
      startMinute: hour.startMinute,
      endMinute: hour.endMinute,
    }));
  }

  async setWorkingHours(
    professionalId: string,
    input: SetWorkingHoursInput,
  ): Promise<WorkingHour[]> {
    await this.prisma.$transaction([
      this.prisma.workingHour.deleteMany({ where: { professionalId } }),
      this.prisma.workingHour.createMany({
        data: input.days.map((day) => ({
          professionalId,
          dayOfWeek: day.dayOfWeek,
          startMinute: day.startMinute,
          endMinute: day.endMinute,
        })),
      }),
    ]);

    return this.getWorkingHours(professionalId);
  }

  async listExceptions(professionalId: string): Promise<ScheduleException[]> {
    const exceptions = await this.prisma.scheduleException.findMany({
      where: { professionalId },
      orderBy: { date: 'asc' },
    });

    return exceptions.map((exception) => ({
      id: exception.id,
      date: formatDateOnly(exception.date),
      reason: exception.reason,
    }));
  }

  async createException(
    professionalId: string,
    input: CreateScheduleExceptionInput,
  ): Promise<ScheduleException> {
    try {
      const exception = await this.prisma.scheduleException.create({
        data: {
          professionalId,
          date: dateOnlyUtc(input.date),
          reason: input.reason ?? null,
        },
      });

      return {
        id: exception.id,
        date: formatDateOnly(exception.date),
        reason: exception.reason,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ya existe un bloqueo para esa fecha.');
      }
      throw error;
    }
  }

  async deleteException(
    professionalId: string,
    exceptionId: string,
  ): Promise<void> {
    const exception = await this.prisma.scheduleException.findFirst({
      where: { id: exceptionId, professionalId },
    });
    if (!exception) {
      throw new NotFoundException('Bloqueo de fecha no encontrado.');
    }

    await this.prisma.scheduleException.delete({ where: { id: exceptionId } });
  }
}
