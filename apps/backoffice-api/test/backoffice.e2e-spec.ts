import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';
import type {
  BackofficeAuthResponse,
  SupportTicketDetail,
} from '@agendya/types';

describe('Backoffice (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const runId = Date.now();
  const password = 'supersecret123';
  const passwordHash = bcrypt.hashSync(password, 10);

  let superAdminToken: string;
  let supportToken: string;
  let readOnlyToken: string;
  let superAdminUserId: string;
  let supportUserId: string;
  let professionalId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    const superAdmin = await prisma.internalUser.create({
      data: {
        email: `super-e2e-${runId}@agendya.test`,
        name: 'Super E2E',
        passwordHash,
        role: 'SUPER_ADMIN',
      },
    });
    const support = await prisma.internalUser.create({
      data: {
        email: `support-e2e-${runId}@agendya.test`,
        name: 'Support E2E',
        passwordHash,
        role: 'SUPPORT',
      },
    });
    const readOnly = await prisma.internalUser.create({
      data: {
        email: `readonly-e2e-${runId}@agendya.test`,
        name: 'Read Only E2E',
        passwordHash,
        role: 'READ_ONLY',
      },
    });
    superAdminUserId = superAdmin.id;
    supportUserId = support.id;

    const professional = await prisma.professional.create({
      data: {
        email: `professional-backoffice-e2e-${runId}@agendya.test`,
        passwordHash,
        businessName: `Backoffice E2E ${runId}`,
        slug: `backoffice-e2e-${runId}`,
      },
    });
    professionalId = professional.id;

    const login = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/backoffice/auth/login')
        .send({ email, password });
      return (res.body as BackofficeAuthResponse).accessToken;
    };

    superAdminToken = await login(superAdmin.email);
    supportToken = await login(support.email);
    readOnlyToken = await login(readOnly.email);
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({
      where: { actorInternalUserId: { in: [supportUserId] } },
    });
    await prisma.supportMessage.deleteMany({
      where: { ticket: { professionalId } },
    });
    await prisma.supportTicket.deleteMany({ where: { professionalId } });
    await prisma.professional.deleteMany({ where: { id: professionalId } });
    await prisma.internalUser.deleteMany({
      where: { email: { contains: `-e2e-${runId}@` } },
    });
    await app.close();
  });

  it('rejects an unauthenticated request', async () => {
    await request(app.getHttpServer()).get('/backoffice/tickets').expect(401);
  });

  it('rejects a customer-facing (Professional) token', async () => {
    const professionalLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: `professional-backoffice-e2e-${runId}@agendya.test`,
        password,
      });
    const professionalToken = (
      professionalLogin.body as { accessToken: string }
    ).accessToken;

    await request(app.getHttpServer())
      .get('/backoffice/tickets')
      .set('Authorization', `Bearer ${professionalToken}`)
      .expect(401);
  });

  let ticketId: string;

  it('lets SUPPORT create a ticket', async () => {
    const res = await request(app.getHttpServer())
      .post('/backoffice/tickets')
      .set('Authorization', `Bearer ${supportToken}`)
      .send({
        professionalId,
        subject: 'No recibí la notificación de una cita',
        category: 'NOTIFICATIONS',
        priority: 'HIGH',
        body: 'El profesional reporta que no vio la notificación.',
        visibility: 'INTERNAL_NOTE',
      })
      .expect(201);

    const ticket = res.body as SupportTicketDetail;
    expect(ticket.status).toBe('OPEN');
    expect(ticket.messages).toHaveLength(1);
    ticketId = ticket.id;
  });

  it('blocks READ_ONLY from mutating the ticket', async () => {
    await request(app.getHttpServer())
      .patch(`/backoffice/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${readOnlyToken}`)
      .send({ status: 'IN_PROGRESS' })
      .expect(403);
  });

  it('lets READ_ONLY view the ticket', async () => {
    await request(app.getHttpServer())
      .get(`/backoffice/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${readOnlyToken}`)
      .expect(200);
  });

  it('lets SUPPORT reply and change status', async () => {
    await request(app.getHttpServer())
      .post(`/backoffice/tickets/${ticketId}/messages`)
      .set('Authorization', `Bearer ${supportToken}`)
      .send({
        body: 'Investigando el problema.',
        visibility: 'CUSTOMER_VISIBLE',
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .patch(`/backoffice/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${supportToken}`)
      .send({ status: 'IN_PROGRESS' })
      .expect(200);

    expect((res.body as SupportTicketDetail).status).toBe('IN_PROGRESS');
  });

  it('lets SUPPORT assign the ticket to themselves but not to someone else', async () => {
    const self = await request(app.getHttpServer())
      .patch(`/backoffice/tickets/${ticketId}/assign`)
      .set('Authorization', `Bearer ${supportToken}`)
      .send({ assignedToId: supportUserId })
      .expect(200);
    expect((self.body as SupportTicketDetail).assignedTo?.id).toBe(
      supportUserId,
    );

    await request(app.getHttpServer())
      .patch(`/backoffice/tickets/${ticketId}/assign`)
      .set('Authorization', `Bearer ${supportToken}`)
      .send({ assignedToId: superAdminUserId })
      .expect(403);
  });

  it('blocks SUPPORT from managing internal users', async () => {
    await request(app.getHttpServer())
      .get('/backoffice/internal-users')
      .set('Authorization', `Bearer ${supportToken}`)
      .expect(403);
  });

  it('lets SUPER_ADMIN manage internal users', async () => {
    const res = await request(app.getHttpServer())
      .get('/backoffice/internal-users')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('records an audit trail for the ticket actions taken', async () => {
    const entries = await prisma.auditLog.findMany({
      where: { entityType: 'SupportTicket', entityId: ticketId },
    });
    const actions = entries.map((entry) => entry.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        'TICKET_CREATED',
        'TICKET_MESSAGE_ADDED',
        'TICKET_STATUS_CHANGED',
        'TICKET_ASSIGNED',
      ]),
    );
  });

  it('audit-logs viewing a professional 360 view', async () => {
    await request(app.getHttpServer())
      .get(`/backoffice/professionals/${professionalId}`)
      .set('Authorization', `Bearer ${supportToken}`)
      .expect(200);

    const entries = await prisma.auditLog.findMany({
      where: {
        entityType: 'Professional',
        entityId: professionalId,
        action: 'SUPPORT_VIEWED_PROFESSIONAL',
      },
    });
    expect(entries.length).toBeGreaterThan(0);
  });
});
