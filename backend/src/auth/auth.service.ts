import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Response } from 'express';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  /**
   * Cookie de sesión. Se emite igual para password y PIN: el rol viaja en el
   * JWT, así que el repartidor queda con las mismas garantías de servidor.
   */
  private issueSession(res: Response, user: { id: string; email: string; role: Role }) {
    const payload = { sub: user.id, email: user.email, role: user.role, iss: 'nutrifit-api', aud: 'nutrifit-client' };
    const accessToken = this.jwtService.sign(payload);

    // --- Cookie HttpOnly: el navegador la envía solo, JS no puede leerla ---
    // Producción = cross-site (Vercel → Render): exige SameSite=None + Secure,
    // si no el navegador la bloquea y el login "pasa" pero nada funciona.
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 * 1000, // 7 días en milisegundos
    });

    return { accessToken };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) return null;
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return null;
    return user;
  }

  async login(res: Response, email: string, password: string) {
    const user = await this.validateUser(String(email || '').trim().toLowerCase(), password);
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    this.issueSession(res, user);

    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  /** Normaliza y valida un PIN corto: 4 a 6 dígitos, sin ceros a la izquierda perdidos. */
  private normalizePin(pin: unknown): string {
    const clean = String(pin ?? '').replace(/\D/g, '');
    if (clean.length < 4 || clean.length > 6) {
      throw new BadRequestException('El PIN debe tener entre 4 y 6 dígitos');
    }
    return clean;
  }

  /**
   * Buscador determinista del PIN. bcrypt tiene sal aleatoria, así que por sí
   * solo no permite encontrar la cuenta; este HMAC (con secreto del servidor)
   * da una clave única sin guardar el PIN en claro.
   */
  private pinLookup(pin: string): string {
    const secret = process.env.PIN_LOOKUP_SECRET || process.env.JWT_SECRET;
    if (!secret) throw new Error('PIN_LOOKUP_SECRET o JWT_SECRET es obligatorio');
    return crypto.createHmac('sha256', secret).update(pin).digest('hex');
  }

  /** Asigna o reemplaza el PIN de un usuario de reparto (solo ADMIN lo llama). */
  async setPin(userId: string, pin: unknown) {
    const clean = this.normalizePin(pin);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.role !== Role.DELIVERY) {
      throw new BadRequestException('El PIN es exclusivo del rol Repartidor');
    }

    const lookup = this.pinLookup(clean);
    const taken = await this.prisma.user.findUnique({ where: { pinLookup: lookup } });
    if (taken && taken.id !== user.id) {
      throw new ConflictException('Ese PIN ya está en uso. Elige otro.');
    }

    const hashed = await bcrypt.hash(clean, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { pinHash: hashed, pinLookup: lookup },
    });
    await this.prisma.auditLog
      .create({
        data: {
          userId: user.id,
          action: 'COURIER_PIN_SET',
          entity: 'User',
          entityId: user.id,
          newValue: { pinSet: true },
        },
      })
      .catch(() => undefined);
    return { ok: true };
  }

  async clearPin(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { pinHash: null, pinLookup: null },
    });
    return { ok: true };
  }

  /**
   * Login del repartidor con PIN corto. Solo cuentas activas con rol DELIVERY.
   * Mismo mensaje para PIN inexistente e incorrecto (no se enumera).
   */
  async loginWithPin(res: Response, pin: unknown) {
    const clean = this.normalizePin(pin);
    const user = await this.prisma.user.findUnique({ where: { pinLookup: this.pinLookup(clean) } });
    if (!user || !user.isActive || user.role !== Role.DELIVERY || !user.pinHash) {
      throw new UnauthorizedException('PIN inválido');
    }
    const valid = await bcrypt.compare(clean, user.pinHash);
    if (!valid) throw new UnauthorizedException('PIN inválido');

    this.issueSession(res, user);
    await this.prisma.auditLog
      .create({
        data: {
          userId: user.id,
          action: 'COURIER_PIN_LOGIN',
          entity: 'User',
          entityId: user.id,
          ipAddress: null,
        },
      })
      .catch(() => undefined);

    return { user: { id: user.id, name: user.name, email: user.email, role: user.role } };
  }

  async logout(res: Response) {
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
    });
    return { ok: true };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) throw new UnauthorizedException('Credenciales inválidas');
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new UnauthorizedException('La contraseña actual es incorrecta');
    if (!newPassword || newPassword.length < 6) {
      throw new UnauthorizedException('La nueva contraseña debe tener al menos 6 caracteres');
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    return { ok: true };
  }

  /**
   * Recuperación de acceso sin sesión.
   *
   * Antes reseteaba la contraseña de CUALQUIER usuario conociendo
   * ADMIN_PASSWORD, sin distinguir rol ni dejar rastro: quien tuviera esa
   * clave podía tomar la cuenta de un vendedor o de reparto.
   *
   * Ahora:
   * - solo cuentas con rol ADMIN (la recuperación legítima del dueño);
   * - queda registrado en audit_logs con la IP del solicitante;
   * - `ENABLE_BOOTSTRAP=false` lo desactiva por completo (fail-closed
   *   voluntario, igual que ENABLE_SWAGGER). Sin esa variable sigue activo
   *   para no perder la única vía de recuperación.
   */
  async bootstrapPassword(
    bootstrapKey: string,
    email: string,
    newPassword: string,
    ip?: string,
  ) {
    if (process.env.ENABLE_BOOTSTRAP === 'false') {
      throw new UnauthorizedException('Bootstrap deshabilitado');
    }
    const adminKey = process.env.ADMIN_PASSWORD;
    if (!adminKey) {
      throw new UnauthorizedException('Bootstrap no configurado');
    }
    // Timing-safe comparison to prevent timing attacks
    const keyBuf = Buffer.from(bootstrapKey || '');
    const adminBuf = Buffer.from(adminKey);
    if (keyBuf.length !== adminBuf.length || !crypto.timingSafeEqual(keyBuf, adminBuf)) {
      throw new UnauthorizedException('Clave de bootstrap inválida');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new UnauthorizedException('La nueva contraseña debe tener al menos 6 caracteres');
    }
    const user = await this.prisma.user.findUnique({
      where: { email: String(email).trim().toLowerCase() },
    });
    // Mismo mensaje para "no existe" y "no es admin": no se revela qué
    // correos están registrados en el sistema.
    if (!user || user.role !== Role.ADMIN) {
      throw new UnauthorizedException('No se puede restablecer esa cuenta');
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    await this.prisma.auditLog
      .create({
        data: {
          userId: user.id,
          action: 'BOOTSTRAP_PASSWORD_RESET',
          entity: 'User',
          entityId: user.id,
          newValue: { email: user.email, reason: 'bootstrap' },
          ipAddress: ip || null,
        },
      })
      // El reset ya se aplicó: un fallo al auditar no debe convertirlo en error.
      .catch(() => undefined);
    return { ok: true, email: user.email };
  }
}
