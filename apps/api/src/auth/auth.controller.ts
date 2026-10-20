import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { LoginDto, RegisterDto, UserDto } from '@loan-portal/shared';
import type { CookieOptions, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ACCESS_TOKEN_COOKIE } from '../common/guards/jwt-auth.guard';
import type { AuthUser } from '../common/types/auth-user';
import type { EnvironmentVariables } from '../config/env.validation';
import { toUserDto } from '../users/user.mapper';
import { AuthService } from './auth.service';

/** FR-AUTH-6: 5 attempts per minute per IP on credential endpoints. */
const CREDENTIAL_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  private readonly cookieOptions: CookieOptions;
  private readonly maxAgeMs: number;

  constructor(
    private readonly auth: AuthService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.cookieOptions = {
      httpOnly: true,
      sameSite: 'strict', // same-origin through the web dev proxy
      secure: config.get('COOKIE_SECURE', { infer: true }),
      path: '/',
    };
    this.maxAgeMs =
      config.get('JWT_EXPIRES_IN_SECONDS', { infer: true }) * 1000;
  }

  @Public()
  @Throttle(CREDENTIAL_THROTTLE)
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserDto> {
    const { user, token } = await this.auth.register(dto);
    this.setCookie(res, token);
    return toUserDto(user);
  }

  @Public()
  @Throttle(CREDENTIAL_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserDto> {
    const { user, token } = await this.auth.login(dto);
    this.setCookie(res, token);
    return toUserDto(user);
  }

  /** Public: clearing a cookie needs no valid session (it may already have expired). */
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(ACCESS_TOKEN_COOKIE, this.cookieOptions);
  }

  @Get('me')
  async me(@CurrentUser() current: AuthUser): Promise<UserDto> {
    return toUserDto(await this.auth.currentUser(current.id));
  }

  private setCookie(res: Response, token: string): void {
    res.cookie(ACCESS_TOKEN_COOKIE, token, {
      ...this.cookieOptions,
      maxAge: this.maxAgeMs,
    });
  }
}
