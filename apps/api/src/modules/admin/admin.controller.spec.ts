import { Test } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { TrialService } from './trial.service';
import type { Professional } from '@prisma/client';

const mockSuperAdmin = {
  id: 'admin-1',
  email: 'admin@agendya.co',
} as Professional;

describe('AdminController', () => {
  let controller: AdminController;
  const adminService = {
    listAllowlist: jest.fn(),
    createAllowlistEntry: jest.fn(),
    updateAllowlistEntry: jest.fn(),
    deleteAllowlistEntry: jest.fn(),
    getProfessionalByEmail: jest.fn(),
    changeProfessionalPlan: jest.fn(),
  };
  const trialService = {
    grantTrial: jest.fn(),
    extendTrial: jest.fn(),
    endTrial: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: adminService },
        { provide: TrialService, useValue: trialService },
      ],
    }).compile();

    controller = module.get(AdminController);
    jest.clearAllMocks();
  });

  it('passes the actor email when updating an allowlist entry', async () => {
    await controller.updateAllowlistEntry(
      'user@example.com',
      { access: 'SUPER_ADMIN' },
      mockSuperAdmin,
    );

    expect(adminService.updateAllowlistEntry).toHaveBeenCalledWith(
      'user@example.com',
      { access: 'SUPER_ADMIN' },
      'admin@agendya.co',
    );
  });

  it('passes the actor email when deleting an allowlist entry', async () => {
    const result = await controller.deleteAllowlistEntry(
      'user@example.com',
      mockSuperAdmin,
    );

    expect(result).toEqual({ deleted: true });
    expect(adminService.deleteAllowlistEntry).toHaveBeenCalledWith(
      'user@example.com',
      'admin@agendya.co',
    );
  });

  it('changes a professional plan', async () => {
    adminService.changeProfessionalPlan.mockResolvedValue({ plan: 'BASIC' });

    await controller.changeProfessionalPlan('pro@example.com', {
      plan: 'BASIC',
    });

    expect(adminService.changeProfessionalPlan).toHaveBeenCalledWith(
      'pro@example.com',
      'BASIC',
    );
  });

  describe('trial actions', () => {
    it('grants a trial as the authenticated admin, never a body-supplied actor', async () => {
      await controller.grantTrial(
        'barber@example.com',
        { allowRepeat: false },
        mockSuperAdmin,
      );
      expect(trialService.grantTrial).toHaveBeenCalledWith(
        'barber@example.com',
        mockSuperAdmin,
        { allowRepeat: false },
      );
    });

    it('extends and ends with the authenticated admin as actor', async () => {
      await controller.extendTrial(
        'barber@example.com',
        { days: 7 },
        mockSuperAdmin,
      );
      await controller.endTrial('barber@example.com', {}, mockSuperAdmin);
      expect(trialService.extendTrial).toHaveBeenCalledWith(
        'barber@example.com',
        mockSuperAdmin,
        { days: 7 },
      );
      expect(trialService.endTrial).toHaveBeenCalledWith(
        'barber@example.com',
        mockSuperAdmin,
        {},
      );
    });
  });
});
