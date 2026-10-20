import 'reflect-metadata';
import { validateSync } from 'class-validator';
import { formatMoney, IsMoneyInRange, moneyToSen } from './money';

class Sample {
  constructor(public amount: unknown) {}
}
IsMoneyInRange(1000, 200000)(Sample.prototype, 'amount');

const isValid = (amount: unknown) =>
  validateSync(new Sample(amount)).length === 0;

describe('IsMoneyInRange(1000, 200000)', () => {
  it.each(['1000', '1000.00', '1000.01', '199999.99', '200000.00', '200000'])(
    'accepts %s',
    (value) => expect(isValid(value)).toBe(true),
  );

  it.each([
    '999.99',
    '0',
    '200000.01',
    '200001',
    '1000.001',
    '-1000',
    '1e3',
    ' 1000',
    '',
    '10,000',
  ])('rejects %s', (value) => expect(isValid(value)).toBe(false));

  it('rejects numbers (amounts travel as strings)', () => {
    expect(isValid(5000)).toBe(false);
  });

  it('has no float error on values such as 1000.10', () => {
    expect(isValid('1000.10')).toBe(true);
    expect(isValid('200000.10')).toBe(false);
  });
});

describe('moneyToSen', () => {
  it('converts without float arithmetic', () => {
    expect(moneyToSen('0.07')).toBe(7);
    expect(moneyToSen('1000.1')).toBe(100010);
    expect(moneyToSen('19.99')).toBe(1999);
  });
  it('returns null for invalid input', () => {
    expect(moneyToSen('abc')).toBeNull();
    expect(moneyToSen('1.234')).toBeNull();
  });
});

describe('formatMoney', () => {
  it('always shows 2 decimals and groups thousands', () => {
    expect(formatMoney('1000')).toBe('1,000.00');
    expect(formatMoney('1234567.5')).toBe('1,234,567.50');
  });
});
