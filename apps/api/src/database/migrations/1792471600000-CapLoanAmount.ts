import { MigrationInterface, QueryRunner } from 'typeorm';

/** Cap the loan amount at RM150,000 (RHB Personal Financing: "up to RM150,000"). */
export class CapLoanAmount1792471600000 implements MigrationInterface {
  name = 'CapLoanAmount1792471600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `loan_applications` DROP CHECK `CHK_loan_applications_loan_amount`',
    );
    await queryRunner.query(
      'ALTER TABLE `loan_applications` ADD CONSTRAINT `CHK_loan_applications_loan_amount` CHECK (`loan_amount` BETWEEN 1000 AND 150000)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `loan_applications` DROP CHECK `CHK_loan_applications_loan_amount`',
    );
    await queryRunner.query(
      'ALTER TABLE `loan_applications` ADD CONSTRAINT `CHK_loan_applications_loan_amount` CHECK (`loan_amount` BETWEEN 1000 AND 200000)',
    );
  }
}
