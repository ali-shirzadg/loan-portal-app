import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { ValueTransformer } from 'typeorm';

const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;
/** Key version. A rotated key would be `v2:`, so values written with v1 stay readable. */
const PREFIX = 'v1:';

let key: Buffer | undefined;

/**
 * Sets the key for every encrypted column. Called by buildTypeOrmOptions, which
 * every path that opens the database goes through (app, migrations, seed).
 */
export function configureFieldEncryption(base64Key: string): void {
  const decoded = Buffer.from(base64Key, 'base64');
  if (decoded.length !== KEY_BYTES) {
    throw new Error('FIELD_ENCRYPTION_KEY must be 32 bytes, base64-encoded');
  }
  key = decoded;
}

function requireKey(): Buffer {
  if (!key) throw new Error('Field encryption is not configured');
  return key;
}

/**
 * AES-256-GCM with a random IV per value: `v1:` + base64(iv | tag | ciphertext).
 * `context` is bound in as additional data, so a value copied into another
 * column fails to decrypt instead of being read as that column.
 */
export function encryptField(plaintext: string, context: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, requireKey(), iv, {
    authTagLength: TAG_BYTES,
  });
  cipher.setAAD(Buffer.from(context, 'utf8'));
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  return (
    PREFIX +
    Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64')
  );
}

/** Throws if the value was tampered with, encrypted for another column, or under another key. */
export function decryptField(stored: string, context: string): string {
  if (!isEncryptedField(stored)) {
    throw new Error('Value is not in the encrypted field format');
  }
  const raw = Buffer.from(stored.slice(PREFIX.length), 'base64');
  const iv = raw.subarray(0, IV_BYTES);
  const tag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = raw.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv(ALGORITHM, requireKey(), iv, {
    authTagLength: TAG_BYTES,
  });
  decipher.setAAD(Buffer.from(context, 'utf8'));
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8');
}

export function isEncryptedField(value: string): boolean {
  return value.startsWith(PREFIX);
}

/**
 * TypeORM transformer for a personal-data column. The entity keeps plaintext in
 * memory; only ciphertext reaches the database. Encrypted columns cannot be
 * searched, sorted or compared in SQL.
 */
export function encryptedColumn(context: string): ValueTransformer {
  return {
    to: (value: unknown) =>
      typeof value === 'string' ? encryptField(value, context) : value,
    from: (value: unknown) =>
      typeof value === 'string' ? decryptField(value, context) : value,
  };
}
