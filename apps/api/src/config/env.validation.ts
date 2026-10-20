import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUrl,
  Matches,
  Max,
  MinLength,
  Min,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV!: Environment;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT!: number;

  @IsString()
  @IsNotEmpty()
  DATABASE_HOST!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  DATABASE_PORT!: number;

  @IsString()
  @IsNotEmpty()
  DATABASE_NAME!: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_USERNAME!: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_PASSWORD!: string;

  @IsString()
  @IsNotEmpty()
  REDIS_HOST!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  REDIS_PORT!: number;

  @IsString()
  @IsNotEmpty()
  REDIS_PASSWORD!: string;

  @IsString()
  @MinLength(32)
  JWT_SECRET!: string;

  /** 32 random bytes, base64 (`openssl rand -base64 32`). Encrypts NRIC, phone and income at rest. */
  @Matches(/^[A-Za-z0-9+/]{43}=$/, {
    message: 'FIELD_ENCRYPTION_KEY must be 32 bytes, base64-encoded',
  })
  FIELD_ENCRYPTION_KEY!: string;

  @IsInt()
  @Min(60)
  JWT_EXPIRES_IN_SECONDS!: number;

  @IsUrl({ require_tld: false })
  WEB_ORIGIN!: string;

  // Parsed explicitly: implicit conversion would turn the string "false" into true.
  @Transform(({ obj }) => {
    const raw: unknown = obj.COOKIE_SECURE;
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return raw;
  })
  @IsBoolean()
  COOKIE_SECURE!: boolean;
}

export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    // List only property names and rules — never the values, which may be secrets.
    const details = errors
      .map((e) => `  - ${Object.values(e.constraints ?? {}).join('; ')}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return validatedConfig;
}
