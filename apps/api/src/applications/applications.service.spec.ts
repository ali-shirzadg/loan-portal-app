import { BadRequestException } from '@nestjs/common';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import {
  ApplicationStatus,
  CreateApplicationDto,
  StatusActor,
} from '@loan-portal/shared';
import { CREDIT_CHECK_DELAY_MS } from '../credit-check/credit-check-schedule';
import { CreditCheckScheduler } from '../credit-check/credit-check.scheduler';
import { LoanPurposesService } from '../loan-purposes/loan-purposes.service';
import { ApplicationStatusEvent } from './application-status-event.entity';
import { ApplicationsService } from './applications.service';
import { LoanApplication } from './loan-application.entity';

const dto: CreateApplicationDto = {
  fullName: 'Aisyah Test',
  nric: '900101-14-1234',
  phone: '012-3456789',
  email: 'aisyah@loanportal.test',
  monthlyIncome: '4500.5',
  loanAmount: '25000',
  tenureMonths: 36,
  purposeCode: 'TRAVEL',
};

describe('ApplicationsService', () => {
  let service: ApplicationsService;
  const saved: object[] = [];
  const repo = {
    create: jest.fn((data: object) =>
      Object.assign(new LoanApplication(), { id: 'app-1', ...data }),
    ),
    findOneBy: jest.fn(),
  };
  const manager = {
    save: jest.fn((entity: object) => {
      saved.push(entity);
      return Promise.resolve(entity);
    }),
    create: jest.fn((_type: unknown, data: object) =>
      Object.assign(new ApplicationStatusEvent(), data),
    ),
  };
  const dataSource = {
    transaction: jest.fn((work: (m: typeof manager) => Promise<void>) =>
      work(manager),
    ),
  };
  const purposes = { findByCode: jest.fn() };
  const scheduler = { schedule: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    saved.length = 0;
    purposes.findByCode.mockResolvedValue({ code: 'TRAVEL', label: 'Travel' });
    repo.findOneBy.mockResolvedValue(null);
    scheduler.schedule.mockResolvedValue(undefined);
    const module = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        { provide: getRepositoryToken(LoanApplication), useValue: repo },
        { provide: getDataSourceToken(), useValue: dataSource },
        { provide: LoanPurposesService, useValue: purposes },
        { provide: CreditCheckScheduler, useValue: scheduler },
      ],
    }).compile();
    service = module.get(ApplicationsService);
  });

  it('FR-APP-1: stores normalised values as PENDING and writes the creation event in one transaction', async () => {
    const { application, created } = await service.create('user-1', dto);

    expect(created).toBe(true);
    expect(application).toMatchObject({
      userId: 'user-1',
      nric: '900101141234',
      phone: '+60123456789',
      email: 'aisyah@loanportal.test',
      monthlyIncome: '4500.50',
      loanAmount: '25000.00',
      purposeLabel: 'Travel',
      status: ApplicationStatus.PENDING,
      decidedAt: null,
    });
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(saved[1]).toMatchObject({
      applicationId: 'app-1',
      fromStatus: null,
      toStatus: ApplicationStatus.PENDING,
      actor: StatusActor.CUSTOMER,
    });
  });

  it('FR-CC-2: persists a due time 10 s to 5 min after submission', async () => {
    const { application } = await service.create('user-1', dto);

    const delay =
      application.creditCheckDueAt.getTime() - application.createdAt.getTime();
    expect(delay).toBeGreaterThanOrEqual(CREDIT_CHECK_DELAY_MS.min);
    expect(delay).toBeLessThanOrEqual(CREDIT_CHECK_DELAY_MS.max);
  });

  it('FR-CC-2: enqueues the credit check after commit, and a Redis failure does not fail the submit', async () => {
    const { application } = await service.create('user-1', dto);
    expect(scheduler.schedule).toHaveBeenCalledWith(
      'app-1',
      application.creditCheckDueAt,
    );

    scheduler.schedule.mockRejectedValueOnce(new Error('redis down'));
    await expect(service.create('user-1', dto)).resolves.toMatchObject({
      created: true,
    });
  });

  it('FR-APP-3: rejects an unknown purpose code with errors.purposeCode', async () => {
    purposes.findByCode.mockResolvedValue(undefined);

    const error = await service
      .create('user-1', { ...dto, purposeCode: 'NOPE' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({
      errors: { purposeCode: [expect.any(String)] },
    });
    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(scheduler.schedule).not.toHaveBeenCalled();
  });

  describe('Idempotency-Key (FR-APP-4)', () => {
    it('replays the original application without inserting again', async () => {
      const original = Object.assign(new LoanApplication(), { id: 'orig' });
      repo.findOneBy.mockResolvedValue(original);

      const result = await service.create('user-1', dto, 'key-1');

      expect(result).toEqual({ application: original, created: false });
      expect(repo.findOneBy).toHaveBeenCalledWith({
        userId: 'user-1',
        idempotencyKey: 'key-1',
      });
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('handles the race: a unique-key violation returns the winner row', async () => {
      const winner = Object.assign(new LoanApplication(), { id: 'winner' });
      repo.findOneBy.mockResolvedValueOnce(null).mockResolvedValueOnce(winner);
      dataSource.transaction.mockRejectedValueOnce({
        driverError: { code: 'ER_DUP_ENTRY' },
      });

      const result = await service.create('user-1', dto, 'key-1');

      expect(result).toEqual({ application: winner, created: false });
    });

    it('rethrows other database errors', async () => {
      dataSource.transaction.mockRejectedValueOnce(
        new Error('connection lost'),
      );

      await expect(service.create('user-1', dto, 'key-1')).rejects.toThrow(
        'connection lost',
      );
    });
  });
});
