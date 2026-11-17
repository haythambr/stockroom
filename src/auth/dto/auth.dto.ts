import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

const trimLower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
  /** @example "Sam Carter" */
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  /** @example "sam@example.com" */
  @Transform(trimLower)
  @IsEmail()
  email!: string;

  /** At least 8 characters. @example "correct-horse-battery" */
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}

export class LoginDto {
  /** @example "customer@stockroom.test" */
  @Transform(trimLower)
  @IsEmail()
  email!: string;

  /** @example "password123" */
  @IsString()
  password!: string;
}

export class RefreshDto {
  /** The refresh token from /auth/login or the previous /auth/refresh. */
  @IsString()
  @MinLength(20)
  refreshToken!: string;
}

export class TokensDto {
  /** Short-lived JWT (15 minutes). Send as "Authorization: Bearer <token>". */
  accessToken!: string;
  /** Long-lived token (7 days) to get a new pair. It can be used once. */
  refreshToken!: string;
  /** Seconds until the access token expires. @example 900 */
  expiresIn!: number;
}
