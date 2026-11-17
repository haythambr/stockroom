import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../common/decorators/auth.decorators';
import { CurrentUser, Public } from '../common/decorators/auth.decorators';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto, RegisterDto } from './dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Create a customer account and sign in. */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  /** Sign in. Returns an access token (15 min) and a refresh token (7 days, single use). */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({
    description: 'Signed in.',
    schema: {
      example: {
        user: {
          id: '0b8e…',
          email: 'customer@stockroom.test',
          name: 'Sam Carter',
          role: 'CUSTOMER',
        },
        accessToken: 'eyJhbGciOiJIUzI1NiIs…',
        refreshToken: 'q7Z0m9…',
        expiresIn: 900,
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Email or password is incorrect.' })
  @ApiTooManyRequestsResponse({
    description: 'More than 5 attempts a minute from this address.',
  })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  /** Swap a refresh token for a new pair. Reusing an old refresh token signs that login out everywhere. */
  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiUnauthorizedResponse({
    description: 'Unknown, expired or already-used refresh token.',
  })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  /** Sign out: the refresh token and every token from the same sign-in stop working. */
  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Body() dto: RefreshDto): Promise<void> {
    await this.auth.logout(dto.refreshToken);
  }

  /** The signed-in user. */
  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}
