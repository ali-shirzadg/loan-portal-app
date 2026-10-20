import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationStatusEvent } from '../applications/application-status-event.entity';
import { LoanApplication } from '../applications/loan-application.entity';
import { RealtimeModule } from '../realtime/realtime.module';
import { CREDIT_CHECK_QUEUE, CREDIT_CHECK_RNG } from './credit-check.constants';
import { CreditCheckProcessor } from './credit-check.processor';
import { CreditCheckReconciler } from './credit-check.reconciler';
import { CreditCheckScheduler } from './credit-check.scheduler';
import { CreditCheckService } from './credit-check.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([LoanApplication, ApplicationStatusEvent]),
    BullModule.registerQueue({ name: CREDIT_CHECK_QUEUE }),
    RealtimeModule,
  ],
  providers: [
    CreditCheckService,
    CreditCheckProcessor,
    CreditCheckReconciler,
    CreditCheckScheduler,
    { provide: CREDIT_CHECK_RNG, useValue: Math.random },
  ],
  exports: [CreditCheckScheduler],
})
export class CreditCheckModule {}
