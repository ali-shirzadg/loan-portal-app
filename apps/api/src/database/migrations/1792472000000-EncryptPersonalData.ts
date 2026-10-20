import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  decryptField,
  encryptField,
} from '../../common/crypto/field-encryption';

const BATCH_SIZE = 1_000;

/** Must match the contexts the entity's column transformers use. */
const COLUMNS = ['nric', 'phone', 'monthly_income'] as const;
const context = (column: string) => `loan_applications.${column}`;

interface Row {
  id: string;
  nric: string;
  phone: string;
  monthly_income: string;
}

/**
 * NFR-PRIV-2: NRIC, phone and monthly income are stored AES-256-GCM encrypted.
 * The columns become VARCHAR(128) and existing rows are encrypted in place
 * with FIELD_ENCRYPTION_KEY. The income CHECK is dropped: MySQL cannot compare
 * ciphertext, so the DTO's range check is the only one left.
 */
export class EncryptPersonalData1792472000000 implements MigrationInterface {
  name = 'EncryptPersonalData1792472000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `loan_applications` DROP CHECK `CHK_loan_applications_income`',
    );
    await queryRunner.query(
      'ALTER TABLE `loan_applications` MODIFY `nric` varchar(128) NOT NULL, MODIFY `phone` varchar(128) NOT NULL, MODIFY `monthly_income` varchar(128) NOT NULL',
    );
    await this.rewrite(queryRunner, "`nric` NOT LIKE 'v1:%'", encryptField);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.rewrite(queryRunner, "`nric` LIKE 'v1:%'", decryptField);
    await queryRunner.query(
      'ALTER TABLE `loan_applications` MODIFY `nric` char(12) NOT NULL, MODIFY `phone` varchar(16) NOT NULL, MODIFY `monthly_income` decimal(12,2) NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `loan_applications` ADD CONSTRAINT `CHK_loan_applications_income` CHECK (`monthly_income` > 0 AND `monthly_income` <= 10000000)',
    );
  }

  /** Rewrites the rows still matching `pending` in batches until none are left. */
  private async rewrite(
    queryRunner: QueryRunner,
    pending: string,
    transform: (value: string, context: string) => string,
  ): Promise<void> {
    for (;;) {
      const rows: Row[] = await queryRunner.query(
        `SELECT id, nric, phone, monthly_income FROM loan_applications WHERE ${pending} LIMIT ${BATCH_SIZE}`,
      );
      if (rows.length === 0) return;
      for (const row of rows) {
        const values = COLUMNS.map((column) =>
          transform(String(row[column]), context(column)),
        );
        await queryRunner.query(
          'UPDATE loan_applications SET nric = ?, phone = ?, monthly_income = ? WHERE id = ?',
          [...values, row.id],
        );
      }
    }
  }
}
