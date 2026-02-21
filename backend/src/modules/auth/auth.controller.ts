import {
  Controller,
  Post,
  Patch,
  Body,
  Get,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { JwtGuard } from '../../common/guards/jwt.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import { ChangePasswordSchema } from './dto/change-password.dto.js';
import type { ChangePasswordDto } from './dto/change-password.dto.js';

const REFRESH_TOKEN_COOKIE = 'refresh_token';
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
const ACCESS_TOKEN_COOKIE = 'access_token';
const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000; // 15 minutes (matches JWT expiry)

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);

    this.setRefreshTokenCookie(res, result.refreshToken);
    this.setAccessTokenCookie(res, result.accessToken);

    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);

    this.setRefreshTokenCookie(res, result.refreshToken);
    this.setAccessTokenCookie(res, result.accessToken);

    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Post('logout')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];

    await this.authService.logout(user.id, user.jti, refreshToken);

    this.clearRefreshTokenCookie(res);
    this.clearAccessTokenCookie(res);

    return { message: 'Logged out successfully' };
  }

  @Get('google')
  async googleAuth(
    @Req() req: any,
    @Res() res: Response,
  ) {
    // Store referral code in cookie before redirecting to Google OAuth
    const ref = req.query?.ref;
    if (ref) {
      res.cookie('referral_code', ref, {
        httpOnly: true,
        maxAge: 10 * 60 * 1000, // 10 minutes
        sameSite: 'lax',
      });
    }
    // Redirect to the Passport-guarded endpoint that initiates Google OAuth
    res.redirect('/api/auth/google/init');
  }

  @Get('google/init')
  @UseGuards(AuthGuard('google'))
  async googleInit() {
    // Passport redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Req() req: any,
    @Res() res: Response,
  ) {
    // Read referral code from cookie (set during /auth/google)
    const referralCode = req.cookies?.referral_code || undefined;
    const result = await this.authService.googleLogin(req.user, referralCode);

    // Clear the referral cookie
    if (referralCode) {
      res.clearCookie('referral_code');
    }

    this.setRefreshTokenCookie(res, result.refreshToken);
    this.setAccessTokenCookie(res, result.accessToken);

    // Redirect to frontend with access token as query param
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    res.redirect(
      `${frontendUrl}/auth/callback?token=${result.accessToken}`,
    );
  }

  @Post('refresh')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];

    if (!refreshToken) {
      return { error: 'No refresh token provided' };
    }

    const result = await this.authService.refreshToken(refreshToken);

    this.setRefreshTokenCookie(res, result.refreshToken);
    this.setAccessTokenCookie(res, result.accessToken);

    return {
      accessToken: result.accessToken,
    };
  }

  @Get('me')
  @UseGuards(JwtGuard)
  async me(@CurrentUser() user: any) {
    return this.authService.getProfile(user.id);
  }

  @Patch('change-password')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(ChangePasswordSchema)) dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, dto);
  }

  // ── Cookie Helpers ──

  private setRefreshTokenCookie(res: Response, token: string) {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    res.cookie(REFRESH_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/api/auth',
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
  }

  private clearRefreshTokenCookie(res: Response) {
    res.clearCookie(REFRESH_TOKEN_COOKIE, {
      httpOnly: true,
      path: '/api/auth',
    });
  }

  private setAccessTokenCookie(res: Response, token: string) {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    res.cookie(ACCESS_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/api/files',
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });
  }

  private clearAccessTokenCookie(res: Response) {
    res.clearCookie(ACCESS_TOKEN_COOKIE, {
      httpOnly: true,
      path: '/api/files',
    });
  }
}
