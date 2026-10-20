import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { RegisterDto } from '../auth/auth.dto';
import { CreateApplicationDto } from './create-application.dto';
import { ListApplicationsQueryDto } from './list-applications-query.dto';

const validApplication = {
  fullName: '  Test Person  ',
  nric: '900101-14-1234',
  phone: '012-3456789',
  email: ' Test.Person@Example.COM ',
  monthlyIncome: '4500.50',
  loanAmount: '25000',
  tenureMonths: 36,
  purposeCode: 'HOME_RENOVATION',
};

const errorFields = (cls: new () => object, plain: object) =>
  validateSync(plainToInstance(cls, plain)).map((e) => e.property);

describe('CreateApplicationDto', () => {
  it('accepts a valid payload and trims / lower-cases', () => {
    const dto = plainToInstance(CreateApplicationDto, validApplication);
    expect(validateSync(dto)).toEqual([]);
    expect(dto.fullName).toBe('Test Person');
    expect(dto.email).toBe('test.person@example.com');
  });

  it('reports the offending fields', () => {
    expect(
      errorFields(CreateApplicationDto, {
        ...validApplication,
        nric: '901301-14-1234',
        loanAmount: '999.99',
        tenureMonths: 11,
        monthlyIncome: '0',
        phone: '12345',
      }).sort(),
    ).toEqual(['loanAmount', 'monthlyIncome', 'nric', 'phone', 'tenureMonths']);
  });

  it('rejects tenure bounds and non-integers', () => {
    expect(
      errorFields(CreateApplicationDto, {
        ...validApplication,
        tenureMonths: 85,
      }),
    ).toEqual(['tenureMonths']);
    expect(
      errorFields(CreateApplicationDto, {
        ...validApplication,
        tenureMonths: 12.5,
      }),
    ).toEqual(['tenureMonths']);
  });
});

describe('RegisterDto', () => {
  it('requires a 12+ character password', () => {
    const base = { email: 'a@example.com', fullName: 'Test User' };
    expect(
      errorFields(RegisterDto, { ...base, password: 'x'.repeat(11) }),
    ).toEqual(['password']);
    expect(
      errorFields(RegisterDto, { ...base, password: 'x'.repeat(12) }),
    ).toEqual([]);
    expect(
      errorFields(RegisterDto, { ...base, password: 'x'.repeat(129) }),
    ).toEqual(['password']);
  });
});

describe('ListApplicationsQueryDto', () => {
  it('applies defaults', () => {
    const dto = plainToInstance(ListApplicationsQueryDto, {});
    expect(validateSync(dto)).toEqual([]);
    expect(dto.page).toBe(1);
    expect(dto.pageSize).toBe(20);
  });

  it('coerces query strings and validates ranges', () => {
    const dto = plainToInstance(ListApplicationsQueryDto, {
      page: '2',
      pageSize: '100',
      status: 'PENDING',
    });
    expect(validateSync(dto)).toEqual([]);
    expect(dto.page).toBe(2);
    expect(errorFields(ListApplicationsQueryDto, { pageSize: '101' })).toEqual([
      'pageSize',
    ]);
    expect(errorFields(ListApplicationsQueryDto, { page: '0' })).toEqual([
      'page',
    ]);
    expect(errorFields(ListApplicationsQueryDto, { status: 'DONE' })).toEqual([
      'status',
    ]);
  });
});

describe('money range message', () => {
  it('shows the limits as RM amounts', () => {
    const dto = plainToInstance(CreateApplicationDto, {
      ...validApplication,
      loanAmount: '999999',
    });
    const errors = validateSync(dto);
    const loan = errors.find((e) => e.property === 'loanAmount');

    expect(Object.values(loan?.constraints ?? {})).toContain(
      'loanAmount must be an amount between RM1,000.00 and RM150,000.00',
    );
  });
});
