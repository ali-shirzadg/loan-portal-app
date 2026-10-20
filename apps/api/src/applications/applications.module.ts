import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RealtimeModule } from '../realtime/realtime.module';
import { CreditCheckModule } from '../credit-check/credit-check.module';
import { LoanPurposesModule } from '../loan-purposes/loan-purposes.module';
import { ApplicationStatusEvent } from './application-status-event.entity';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { LoanApplication } from './loan-application.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([LoanApplication, ApplicationStatusEvent]),
    LoanPurposesModule,
    RealtimeModule,
    CreditCheckModule,
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
