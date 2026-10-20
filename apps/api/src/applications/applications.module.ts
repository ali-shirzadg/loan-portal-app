import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { CreditCheckModule } from '../credit-check/credit-check.module';
import { LoanPurposesModule } from '../loan-purposes/loan-purposes.module';
import { ApplicationStatusEvent } from './application-status-event.entity';
import { AdminApplicationsController } from './admin-applications.controller';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { LoanApplication } from './loan-application.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([LoanApplication, ApplicationStatusEvent]),
    LoanPurposesModule,
    UsersModule,
    RealtimeModule,
    CreditCheckModule,
  ],
  controllers: [ApplicationsController, AdminApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
