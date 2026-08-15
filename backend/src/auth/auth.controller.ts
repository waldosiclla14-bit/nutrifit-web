import { Controller, Post, Req, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { JsonBody } from '../common/decorators/raw-body.decorator';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  newPassword: string;
}

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

function trackAttempt(ip: string) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  entry.count += 1;
  if (entry.count > MAX_ATTEMPTS) {
    throw new HttpException(
      'Demasiados intentos fallidos. Intenta nuevamente en 10 minutos.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@JsonBody() dto: LoginDto, @Req() req: any) {
    const ip =
      req.ip || req.headers?.['x-forwarded-for']?.toString().split(',')[0]?.trim() || 'unknown';
    trackAttempt(ip);
    const result = await this.authService.login(dto.email, dto.password);
    attempts.delete(ip);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@JsonBody() dto: ChangePasswordDto, @Req() req: any) {
    return this.authService.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
  }
}
