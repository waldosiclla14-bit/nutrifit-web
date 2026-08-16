import { Controller, Post, Req, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { readJsonBody } from '../common/decorators/raw-body.decorator';
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

function attemptKey(email: string, ip: string) {
  return `${String(email).trim().toLowerCase()}:${ip}`;
}

function trackAttempt(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
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

// Limpieza periódica de entradas vencidas (evita que el Map crezca sin límite)
// y acotación del tamaño del Map.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of attempts) {
    if (entry.resetAt < now) attempts.delete(key);
  }
  if (attempts.size > 10000) {
    const keys = [...attempts.keys()];
    for (const key of keys.slice(0, 5000)) attempts.delete(key);
  }
}, WINDOW_MS);

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Req() req: any) {
    const dto: LoginDto = await readJsonBody(req);
    const ip = req.ip || 'unknown';
    const key = attemptKey(dto.email, ip);
    trackAttempt(key);
    const result = await this.authService.login(dto.email, dto.password);
    attempts.delete(key);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@Req() req: any) {
    const dto: ChangePasswordDto = await readJsonBody(req);
    return this.authService.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
  }
}
