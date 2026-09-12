import { Test } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import type { Professional } from '@prisma/client';

const mockSuperAdmin = {
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

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: adminService }],
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
});
