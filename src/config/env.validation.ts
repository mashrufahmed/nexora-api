import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

enum Environment {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.DEVELOPMENT;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 5000;

  @IsString()
  API_PREFIX: string = 'api/v1';

  @IsString()
  CORS_ORIGINS: string = 'http://localhost:3000';

  @IsString()
  REDIS_URL: string;

  @IsString()
  S3_ENDPOINT!: string;

  @IsString()
  S3_REGION: string = 'us-east-1';

  @IsString()
  S3_ACCESS_KEY!: string;

  @IsString()
  S3_SECRET_KEY!: string;

  @IsString()
  S3_BUCKET: string = 'nexora-media';

  @IsString()
  S3_FORCE_PATH_STYLE: string = 'true';

  @IsString()
  S3_PUBLIC_BASE_URL: string = '';

  @IsString()
  DATABASE_URL: string;

  @IsString()
  @MinLength(32)
  ADMIN_BOOTSTRAP_TOKEN!: string;

  @IsString()
  BOOTSTRAP_ADMIN_EMAIL: string = 'admin@example.com';

  // Mail
  @IsString()
  MAIL_HOST!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  MAIL_PORT: number = 587;

  @IsString()
  MAIL_USER!: string;

  @IsString()
  MAIL_PASSWORD!: string;

  @IsString()
  MAIL_FROM!: string;

  // OTP
  @IsString()
  @MinLength(32)
  OTP_SECRET!: string;

  @IsInt()
  @Min(60)
  OTP_EXPIRES_IN: number = 300;

  @IsInt()
  @Min(1)
  OTP_RESEND_COOLDOWN: number = 60;

  @IsInt()
  @Min(1)
  OTP_MAX_ATTEMPTS: number = 5;

  @IsString()
  @MinLength(32)
  SESSION_SECRET!: string;

  @IsInt()
  @Min(60)
  SESSION_TTL: number = 900;

  @IsString()
  SESSION_COOKIE_NAME: string = 'nexora_admin_sid';

  @IsString()
  ADMIN_PASSWORD_RESET_URL: string = 'http://localhost:3000/auth/reset-password';

  @IsInt()
  @Min(60)
  ADMIN_PASSWORD_RESET_TTL: number = 900;

  @IsInt()
  @Min(1)
  ADMIN_PASSWORD_RESET_MAX_REQUESTS: number = 3;

  @IsInt()
  @Min(60)
  ADMIN_PASSWORD_RESET_REQUEST_TTL: number = 900;

  @IsInt()
  @Min(1)
  @Max(20)
  ADMIN_LOGIN_MAX_ATTEMPTS: number = 5;

  @IsInt()
  @Min(60)
  ADMIN_LOGIN_ATTEMPT_TTL: number = 900;

  @IsInt()
  @Min(60)
  ADMIN_LOGIN_LOCK_TTL: number = 900;
}

export function validateEnvironment(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      errors
        .map((error) => Object.values(error.constraints ?? {}).join(', '))
        .join('; '),
    );
  }

  return validatedConfig;
}
