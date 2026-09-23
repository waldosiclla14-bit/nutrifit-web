import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

function cookieExtractor(req: any): string | null {
  try {
    // cookie-parser no instalado: parseo manual del header (cero deps nuevas)
    const header: string = req?.headers?.cookie || '';
    const m = header.match(/(?:^|;\s*)access_token=([^;]*)/);
    if (m?.[1]) return decodeURIComponent(m[1]);
    // Fallback transitorio: header Bearer (clientes aún no migrados)
    const auth: string = req?.headers?.authorization || '';
    const b = auth.match(/^Bearer\s+(.+)$/i);
    return b?.[1] ?? null;
  } catch {
    return null;
  }
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService, config: ConfigService) {
    const jwtSecret = config.get<string>('JWT_SECRET');
    if (!jwtSecret) throw new Error('JWT_SECRET es obligatorio');
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) throw new UnauthorizedException();
    return user;
  }
}
