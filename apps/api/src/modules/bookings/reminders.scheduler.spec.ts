import { Test } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../../infra/mail/mail.service';
import { RemindersScheduler } from './reminders.scheduler';

const BOOKING = {
  id: 'booking-1',
  customerEmail: 'ana@example.com',
  customerName: 'Ana',
  serviceNameSnapshot: 'Corte de cabello',
  startAt: new Date('2026-08-02T14:00:00.000Z'),
  professional: { businessName: 'María Belleza', timezone: 'America/Bogota' },
};

describe('RemindersScheduler', () => {
  let scheduler: RemindersScheduler;
  let prisma: { booking: { findMany: jest.Mock; update: jest.Mock } };
  let mailService: { sendBookingReminder: jest.Mock };

  beforeEach(async () => {
    prisma = {
      booking: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue(undefined),
      },
    };
    mailService = {
      sendBookingReminder: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        RemindersScheduler,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    scheduler = moduleRef.get(RemindersScheduler);

    jest
      .spyOn(Date, 'now')
      .mockReturnValue(new Date('2026-08-01T14:00:00.000Z').getTime());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('queries confirmed bookings starting ~24h from now that have not been reminded yet', async () => {
    await scheduler.send24hReminders();

    expect(prisma.booking.findMany).toHaveBeenCalledWith({
      where: {
        status: 'CONFIRMED',
        reminder24hSentAt: null,
        startAt: {
          gte: new Date('2026-08-02T14:00:00.000Z'),
          lt: new Date('2026-08-02T14:15:00.000Z'),
        },
      },
      include: { professional: true },
    });
  });

  it('queries confirmed bookings starting ~2h from now for the 2h reminder', async () => {
    await scheduler.send2hReminders();

    expect(prisma.booking.findMany).toHaveBeenCalledWith({
      where: {
        status: 'CONFIRMED',
        reminder2hSentAt: null,
        startAt: {
          gte: new Date('2026-08-01T16:00:00.000Z'),
          lt: new Date('2026-08-01T16:15:00.000Z'),
        },
      },
      include: { professional: true },
    });
  });

  it('sends a reminder email and marks the booking as reminded', async () => {
    prisma.booking.findMany.mockResolvedValue([BOOKING]);

    await scheduler.send24hReminders();

    expect(mailService.sendBookingReminder).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'ana@example.com', hoursBefore: 24 }),
    );

    type UpdateCall = [
      { where: { id: string }; data: { reminder24hSentAt: Date } },
    ];
    const [[updateArgs]] = prisma.booking.update.mock.calls as UpdateCall[];
    expect(updateArgs.where).toEqual({ id: 'booking-1' });
    expect(updateArgs.data.reminder24hSentAt).toBeInstanceOf(Date);
  });

  it('continues with remaining bookings when one email fails', async () => {
    const secondBooking = {
      ...BOOKING,
      id: 'booking-2',
      customerEmail: 'other@example.com',
    };
    prisma.booking.findMany.mockResolvedValue([BOOKING, secondBooking]);
    mailService.sendBookingReminder.mockRejectedValueOnce(
      new Error('Resend is down'),
    );

    await scheduler.send24hReminders();

    expect(mailService.sendBookingReminder).toHaveBeenCalledTimes(2);
    expect(prisma.booking.update).toHaveBeenCalledTimes(1);

    type UpdateCall = [
      { where: { id: string }; data: { reminder24hSentAt: Date } },
    ];
    const [[updateArgs]] = prisma.booking.update.mock.calls as UpdateCall[];
    expect(updateArgs.where).toEqual({ id: 'booking-2' });
    expect(updateArgs.data.reminder24hSentAt).toBeInstanceOf(Date);
  });
});
