import {
  IsEmail,
  IsInt,
  IsMobilePhone,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { IsMalaysianNric } from '../common/nric';
import { IsMoneyInRange, MONEY_PATTERN } from '../common/money';
import { LOAN_LIMITS } from '../common/loan-limits';
import { Trim, TrimLowercase } from '../common/transforms';

const MONEY_FORMAT_MESSAGE =
  '$property must be an amount in RM with at most 2 decimal places';

export class CreateApplicationDto {
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  /** `YYMMDD-PB-####` or 12 digits; the server stores 12 digits. */
  @Trim()
  @IsMalaysianNric()
  nric!: string;

  /** Malaysian mobile; the server stores E.164 (`+60…`). */
  @Trim()
  @IsMobilePhone('ms-MY')
  phone!: string;

  @TrimLowercase()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  /** RM, as a string such as "4500.50". Greater than 0. */
  @Trim()
  @Matches(MONEY_PATTERN, { message: MONEY_FORMAT_MESSAGE })
  @IsMoneyInRange(0.01, LOAN_LIMITS.monthlyIncomeMax)
  monthlyIncome!: string;

  /** RM, as a string such as "25000.00". */
  @Trim()
  @Matches(MONEY_PATTERN, { message: MONEY_FORMAT_MESSAGE })
  @IsMoneyInRange(LOAN_LIMITS.amount.min, LOAN_LIMITS.amount.max)
  loanAmount!: string;

  @IsInt()
  @Min(LOAN_LIMITS.tenureMonths.min)
  @Max(LOAN_LIMITS.tenureMonths.max)
  tenureMonths!: number;

  /** A code returned by `GET /loan-purposes`; the server checks it against that list. */
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  purposeCode!: string;
}
