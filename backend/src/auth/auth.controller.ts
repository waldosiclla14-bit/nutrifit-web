import { Controller, Post, Body, Req, HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { AuthService } from './auth.service';

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string) {
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
  async login(@Body() dto: LoginDto, @Req() req: any) {
    const ip =
      req.ip || req.headers?.['x-forwarded-for']?.toString().split(',')[0]?.trim() || 'unknown';
    checkRateLimit(ip);
    return this.authService.login(dto.email, dto.password);
  }
}
