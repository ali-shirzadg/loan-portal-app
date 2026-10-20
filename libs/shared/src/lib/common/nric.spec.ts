import { formatNric, isMalaysianNric, maskNric, normalizeNric } from './nric';

describe('isMalaysianNric', () => {
  it.each([
    '900101-14-1234',
    '900101141234',
    '000229-10-0001',
    '991231-01-5555',
  ])('accepts %s', (value) => {
    expect(isMalaysianNric(value)).toBe(true);
  });

  it.each([
    '901301-14-1234', // month 13
    '900230-14-1234', // 30 Feb in any century
    '900431-14-1234', // 31 Apr
    '900101-14-123', // too short
    '90010114123', // 11 digits
    '9001011412345', // 13 digits
    '900101-141234', // mixed dash placement
    '9001-01-14-1234',
    '90010a141234',
    '',
  ])('rejects %s', (value) => {
    expect(isMalaysianNric(value)).toBe(false);
  });

  it('rejects non-strings', () => {
    expect(isMalaysianNric(900101141234)).toBe(false);
    expect(isMalaysianNric(null)).toBe(false);
    expect(isMalaysianNric(undefined)).toBe(false);
  });

  it('accepts 29 Feb of a year that is a leap year in only one century', () => {
    // 2000 is a leap year, 1900 is not: valid in either century is enough.
    expect(isMalaysianNric('000229141234')).toBe(true);
    // 2100-style: 1901/2001 are never leap years.
    expect(isMalaysianNric('010229141234')).toBe(false);
  });
});

describe('normalizeNric', () => {
  it('removes dashes', () => {
    expect(normalizeNric('900101-14-1234')).toBe('900101141234');
  });
  it('leaves 12 digits unchanged', () => {
    expect(normalizeNric('900101141234')).toBe('900101141234');
  });
});

describe('maskNric', () => {
  it('shows only the last 4 digits', () => {
    expect(maskNric('900101141234')).toBe('******-**-1234');
    expect(maskNric('900101-14-1234')).toBe('******-**-1234');
  });
});

describe('formatNric', () => {
  it('inserts the dashes into 12 digits', () => {
    expect(formatNric('900101145678')).toBe('900101-14-5678');
  });

  it('leaves an already formatted NRIC unchanged', () => {
    expect(formatNric('900101-14-5678')).toBe('900101-14-5678');
  });
});
