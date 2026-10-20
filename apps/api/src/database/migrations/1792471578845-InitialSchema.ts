import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1792471578845 implements MigrationInterface {
  name = 'InitialSchema1792471578845';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`users\` (\`id\` char(36) NOT NULL, \`email\` varchar(254) NOT NULL, \`password_hash\` varchar(255) NOT NULL, \`full_name\` varchar(100) NOT NULL, \`role\` enum ('CUSTOMER', 'ADMIN') NOT NULL DEFAULT 'CUSTOMER', \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), UNIQUE INDEX \`UQ_users_email\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`loan_applications\` (\`id\` char(36) NOT NULL, \`user_id\` char(36) NOT NULL, \`full_name\` varchar(100) NOT NULL, \`nric\` char(12) NOT NULL, \`phone\` varchar(16) NOT NULL, \`email\` varchar(254) NOT NULL, \`monthly_income\` decimal(12,2) NOT NULL, \`loan_amount\` decimal(12,2) NOT NULL, \`tenure_months\` smallint UNSIGNED NOT NULL, \`purpose_code\` varchar(50) NOT NULL, \`purpose_label\` varchar(100) NOT NULL, \`status\` enum ('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING', \`credit_check_due_at\` datetime(3) NOT NULL, \`decided_at\` datetime(3) NULL, \`idempotency_key\` varchar(64) NULL, \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), UNIQUE INDEX \`UQ_loan_applications_user_idempotency\` (\`user_id\`, \`idempotency_key\`), INDEX \`IDX_loan_applications_status_due\` (\`status\`, \`credit_check_due_at\`), INDEX \`IDX_loan_applications_created\` (\`created_at\`), INDEX \`IDX_loan_applications_status_created\` (\`status\`, \`created_at\`), INDEX \`IDX_loan_applications_user_created\` (\`user_id\`, \`created_at\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`application_status_events\` (\`id\` bigint UNSIGNED NOT NULL AUTO_INCREMENT, \`application_id\` char(36) NOT NULL, \`from_status\` enum ('PENDING', 'APPROVED', 'REJECTED') NULL, \`to_status\` enum ('PENDING', 'APPROVED', 'REJECTED') NOT NULL, \`actor\` enum ('CUSTOMER', 'SYSTEM', 'ADMIN') NOT NULL, \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX \`IDX_status_events_application_created\` (\`application_id\`, \`created_at\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`loan_applications\` ADD CONSTRAINT \`FK_675fc88c789366e3f362ebbccb3\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`application_status_events\` ADD CONSTRAINT \`FK_7f69400825980d716a4148c8567\` FOREIGN KEY (\`application_id\`) REFERENCES \`loan_applications\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    // CHECK constraints (enforced by MySQL >= 8.0.16). The TypeORM MySQL driver
    // does not manage them, so they are written by hand. Values are literal: migrations
    // are immutable snapshots, later limit changes get their own migration.
    await queryRunner.query(
      `ALTER TABLE \`loan_applications\` ADD CONSTRAINT \`CHK_loan_applications_loan_amount\` CHECK (\`loan_amount\` BETWEEN 1000 AND 200000)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`loan_applications\` ADD CONSTRAINT \`CHK_loan_applications_tenure\` CHECK (\`tenure_months\` BETWEEN 12 AND 84)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`loan_applications\` ADD CONSTRAINT \`CHK_loan_applications_income\` CHECK (\`monthly_income\` > 0 AND \`monthly_income\` <= 10000000)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`loan_applications\` ADD CONSTRAINT \`CHK_loan_applications_decided_at\` CHECK ((\`status\` = 'PENDING') = (\`decided_at\` IS NULL))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Dropping the tables below also drops their CHECK constraints.
    await queryRunner.query(
      `ALTER TABLE \`application_status_events\` DROP FOREIGN KEY \`FK_7f69400825980d716a4148c8567\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`loan_applications\` DROP FOREIGN KEY \`FK_675fc88c789366e3f362ebbccb3\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_status_events_application_created\` ON \`application_status_events\``,
    );
    await queryRunner.query(`DROP TABLE \`application_status_events\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_loan_applications_user_created\` ON \`loan_applications\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_loan_applications_status_created\` ON \`loan_applications\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_loan_applications_created\` ON \`loan_applications\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_loan_applications_status_due\` ON \`loan_applications\``,
    );
    await queryRunner.query(
      `DROP INDEX \`UQ_loan_applications_user_idempotency\` ON \`loan_applications\``,
    );
    await queryRunner.query(`DROP TABLE \`loan_applications\``);
    await queryRunner.query(`DROP INDEX \`UQ_users_email\` ON \`users\``);
    await queryRunner.query(`DROP TABLE \`users\``);
  }
}
