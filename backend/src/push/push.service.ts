import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';

export type PushPayload = {
  title: string;
  body?: string;
  url?: string;
};

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(private prisma: PrismaService) {}

  private vapid() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) {
      throw new BadRequestException('Push no configurado (faltan claves VAPID en el servidor)');
    }
    return { publicKey, privateKey };
  }

  getPublicKey() {
    return { publicKey: this.vapid().publicKey };
  }

  async subscribe(
    data: { endpoint: string; keys: { p256dh: string; auth: string }; userAgent?: string },
    userId?: string,
  ) {
    const endpoint = String(data?.endpoint || '').trim();
    const p256dh = String(data?.keys?.p256dh || '').trim();
    const auth = String(data?.keys?.auth || '').trim();
    if (!endpoint.startsWith('https://') || !p256dh || !auth) {
      throw new BadRequestException('Suscripción push inválida');
    }
    if (endpoint.length > 2000 || p256dh.length > 500 || auth.length > 500) {
      throw new BadRequestException('Suscripción push inválida');
    }
    return this.prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh, auth, userId: userId || null, userAgent: String(data?.userAgent || '').slice(0, 300) || null },
      create: {
        endpoint,
        p256dh,
        auth,
        userId: userId || null,
        userAgent: String(data?.userAgent || '').slice(0, 300) || null,
      },
    });
  }

  async unsubscribe(endpoint: string) {
    // Idempotente: si no existe, igual OK
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint: String(endpoint || '') } });
    return { ok: true };
  }

  private async sendTo(sub: { id: string; endpoint: string; p256dh: string; auth: string }, payload: PushPayload) {
    const { publicKey, privateKey } = this.vapid();
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } } as any,
        JSON.stringify({ title: payload.title, body: payload.body || '', url: payload.url || '/admin' }),
        { vapidDetails: { subject: 'mailto:admin@nutrifit.cl', publicKey, privateKey } },
      );
      return true;
    } catch (e: any) {
      // 404/410 = suscripción muerta (app desinstalada, permiso revocado): limpiar
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await this.prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
        this.logger.log(`Push sub muerta eliminada: ${sub.id}`);
      } else {
        this.logger.warn(`Push falló a ${sub.id}: ${e?.message || e}`);
      }
      return false;
    }
  }

  async sendToUser(userId: string, payload: PushPayload) {
    const subs = await this.prisma.pushSubscription.findMany({ where: { userId } });
    let sent = 0;
    for (const s of subs) {
      if (await this.sendTo(s, payload)) sent++;
    }
    return { sent, total: subs.length };
  }

  async broadcast(payload: PushPayload) {
    const subs = await this.prisma.pushSubscription.findMany();
    let sent = 0;
    for (const s of subs) {
      if (await this.sendTo(s, payload)) sent++;
    }
    return { sent, total: subs.length };
  }
}
