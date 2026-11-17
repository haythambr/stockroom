import { plainToInstance, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

/** The app refuses to start with missing or weak settings, instead of failing later at runtime. */
class Env {
  @IsString()
  DATABASE_URL!: string;

  @IsString()
  @MinLength(32, { message: 'JWT_SECRET must be at least 32 characters' })
  JWT_SECRET!: string;

  @IsString()
  @MinLength(16, {
    message: 'PAYMENT_WEBHOOK_SECRET must be at least 16 characters',
  })
  PAYMENT_WEBHOOK_SECRET!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  JWT_ACCESS_TTL_SECONDS: number = 900;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  ORDER_PAYMENT_MINUTES: number = 30;

  /** Lets the shop website's "Pay now (demo)" button pay orders without a real provider. Off by default. */
  @IsOptional()
  @IsIn(['true', 'false'])
  DEMO_PAYMENTS: string = 'false';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  PORT: number = 3000;

  @IsOptional()
  @IsIn(['development', 'production', 'test'])
  NODE_ENV: string = 'development';
}

export function validateEnv(config: Record<string, unknown>): Env {
  const env = plainToInstance(Env, config, { enableImplicitConversion: true });
  const errors = validateSync(env, { skipMissingProperties: false });

  if (errors.length) {
    throw new Error(
      `Invalid environment:\n${errors.map((e) => `  - ${Object.values(e.constraints ?? {}).join(', ')}`).join('\n')}`,
    );
  }

  return env;
}
