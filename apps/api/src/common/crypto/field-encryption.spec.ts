import { randomBytes } from 'node:crypto';
import {
  configureFieldEncryption,
  decryptField,
  encryptedColumn,
  encryptField,
} from './field-encryption';

describe('field encryption', () => {
  const key = randomBytes(32).toString('base64');

  beforeEach(() => configureFieldEncryption(key));

  it('NFR-PRIV-2: round-trips and never stores the plaintext', () => {
    const stored = encryptField('900101141234', 'nric');

    expect(stored).toMatch(/^v1:/);
    expect(stored).not.toContain('900101141234');
    expect(decryptField(stored, 'nric')).toBe('900101141234');
  });

  it('NFR-PRIV-2: uses a fresh IV, so equal values give different ciphertext', () => {
    expect(encryptField('+60123456789', 'phone')).not.toBe(
      encryptField('+60123456789', 'phone'),
    );
  });

  it('NFR-PRIV-2: rejects a value moved to another column', () => {
    const stored = encryptField('4500.00', 'monthly_income');
    expect(() => decryptField(stored, 'nric')).toThrow();
  });

  it('NFR-PRIV-2: rejects a tampered value', () => {
    const stored = encryptField('4500.00', 'monthly_income');
    const raw = Buffer.from(stored.slice('v1:'.length), 'base64');
    raw[raw.length - 1] ^= 0x01;
    const tampered = `v1:${raw.toString('base64')}`;
    expect(() => decryptField(tampered, 'monthly_income')).toThrow();
  });

  it('NFR-PRIV-2: rejects a value written under another key', () => {
    const stored = encryptField('900101141234', 'nric');
    configureFieldEncryption(randomBytes(32).toString('base64'));
    expect(() => decryptField(stored, 'nric')).toThrow();
  });

  it('refuses a key that is not 32 bytes', () => {
    expect(() =>
      configureFieldEncryption(randomBytes(16).toString('base64')),
    ).toThrow('32 bytes');
  });

  it('the column transformer leaves null and query operators alone', () => {
    const transformer = encryptedColumn('nric');
    const operator = { type: 'isNull' };

    expect(transformer.to(null)).toBeNull();
    expect(transformer.to(operator)).toBe(operator);
    expect(transformer.from(transformer.to('900101141234'))).toBe(
      '900101141234',
    );
  });
});
