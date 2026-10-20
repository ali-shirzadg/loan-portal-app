import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Trim, TrimLowercase } from '../common/transforms';

export class RegisterDto {
  @TrimLowercase()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;
}

export class LoginDto {
  @TrimLowercase()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;
}
