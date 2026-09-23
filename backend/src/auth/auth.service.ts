import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { Response } from 'express';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

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

    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
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

  async bootstrapPassword(bootstrapKey: string, email: string, newPassword: string) {
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
    const user = await this.prisma.user.findUnique({ where: { email: String(email).trim().toLowerCase() } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    return { ok: true, email: user.email };
  }
}
