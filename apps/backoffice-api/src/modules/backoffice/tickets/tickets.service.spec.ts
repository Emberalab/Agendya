import { ForbiddenException } from '@nestjs/common';
import type { InternalUser } from '@prisma/client';
import { TicketsService } from './tickets.service';

function makeActor(overrides: Partial<InternalUser>): InternalUser {
  return {
    id: 'actor-1',
    email: 'actor@agendya.test',
    name: 'Actor',
    passwordHash: 'x',
    role: 'SUPPORT',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('TicketsService.assign', () => {
  const existingTicket = {
    id: 'ticket-1',
    status: 'OPEN',
    priority: 'NORMAL',
    assignedToId: null as string | null,
  };

  function makeService() {
    const prisma = {
      supportTicket: {
        findUnique: jest.fn().mockResolvedValue(existingTicket),
        update: jest.fn().mockResolvedValue({}),
      },
      internalUser: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'other-1', isActive: true }),
      },
    };
    const auditLog = { record: jest.fn() };
    const service = new TicketsService(prisma as never, auditLog as never);
    // getOne() re-reads the ticket after mutating — stub it so tests don't
    // need the full detail-select shape.
    jest.spyOn(service, 'getOne').mockResolvedValue({} as never);
    return { service, prisma, auditLog };
  }

  it('lets SUPPORT assign a ticket to themselves', async () => {
    const { service, prisma } = makeService();
    const actor = makeActor({ id: 'support-1', role: 'SUPPORT' });

    await service.assign('ticket-1', { assignedToId: 'support-1' }, actor);

    expect(prisma.supportTicket.update).toHaveBeenCalledWith({
      where: { id: 'ticket-1' },
      data: { assignedToId: 'support-1' },
    });
  });

  it('blocks SUPPORT from assigning a ticket to someone else', async () => {
    const { service } = makeService();
    const actor = makeActor({ id: 'support-1', role: 'SUPPORT' });

    await expect(
      service.assign('ticket-1', { assignedToId: 'other-1' }, actor),
    ).rejects.toThrow(ForbiddenException);
  });

  it('lets SUPPORT unassign a ticket currently assigned to themselves', async () => {
    const { service, prisma } = makeService();
    prisma.supportTicket.findUnique.mockResolvedValue({
      ...existingTicket,
      assignedToId: 'support-1',
    });
    const actor = makeActor({ id: 'support-1', role: 'SUPPORT' });

    await service.assign('ticket-1', { assignedToId: null }, actor);

    expect(prisma.supportTicket.update).toHaveBeenCalledWith({
      where: { id: 'ticket-1' },
      data: { assignedToId: null },
    });
  });

  it('lets ADMIN assign a ticket to anyone', async () => {
    const { service, prisma } = makeService();
    const actor = makeActor({ id: 'admin-1', role: 'ADMIN' });

    await service.assign('ticket-1', { assignedToId: 'other-1' }, actor);

    expect(prisma.supportTicket.update).toHaveBeenCalledWith({
      where: { id: 'ticket-1' },
      data: { assignedToId: 'other-1' },
    });
  });
});
