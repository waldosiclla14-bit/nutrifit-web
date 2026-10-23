import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';

export type PushPayload = {
  title: string;
  body?: string;
  url?: string;
};

export type EventoPedido = {
  tipo: 'nueva_venta' | 'pago_recibido' | 'pedido_agendado';
  referencia: string;
  pedidoId: string;
  clienteNombre: string;
  clienteTelefono: string;
  monto: number;
  items: string[];
  metroLine?: string;
  metroStation?: string;
  address?: string;
  comuna?: string;
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

  /**
   * Procesa un evento de pedido y envía notificaciones push a los
   * suscriptores que tengan habilitado ese tipo de evento.
   *
   * Reglas:
   * - Anti-duplicado: usa notificaciones_enviadas (tipo + referencia).
   * - Respeta preferencias_notificacion por usuario (si no hay registro,
     se asume todo habilitado).
   * - No incluye datos personales del cliente en el cuerpo del mensaje.
   */
  async procesarEventoPedido(evento: EventoPedido, webhookSecret: string) {
    // Validar secreto compartido
    const expectedSecret = process.env.WEBHOOK_SECRET;
    if (!expectedSecret || webhookSecret !== expectedSecret) {
      throw new BadRequestException('Webhook secreto inválido');
    }

    // Anti-duplicado: si ya existe este tipo+referencia, no volver a enviar
    const yaEnviada = await this.prisma.notificacionEnviada.findUnique({
      where: { tipo_referencia: { tipo: evento.tipo, referencia: evento.referencia } },
    });
    if (yaEnviada) {
      this.logger.log(`Notificación ya enviada: ${evento.tipo}:${evento.referencia}`);
      return { enviado: false, motivo: 'ya_enviado' };
    }

    // Insertar registro de envío (antes de enviar, para evitar duplicados)
    await this.prisma.notificacionEnviada.create({
      data: {
        tipo: evento.tipo,
        referencia: evento.referencia,
      },
    });

    // Obtener suscripciones activas
    const subs = await this.prisma.pushSubscription.findMany({
      where: { activa: true },
    });

    if (subs.length === 0) {
      return { enviado: false, motivo: 'sin_suscriptores' };
    }

    // Construir mensaje según tipo de evento
    const mensaje = this.buildMensaje(evento);

    // Enviar a cada suscripción que tenga habilitado este tipo de evento
    let sent = 0;
    let total = 0;
    for (const sub of subs) {
      // Verificar preferencia del usuario para este tipo de evento
      const prefs = await this.prisma.preferenciaNotificacion.findUnique({
        where: { usuarioId: sub.userId ?? '' },
      });
      const habilitado = prefs ? (prefs as any)[evento.tipo] ?? true : true;

      if (!habilitado) continue;

      total++;
      if (await this.sendTo(sub, { title: mensaje.title, body: mensaje.body, url: mensaje.url })) {
        sent++;
      }
    }

    return { enviado: true, enviadoCount: sent, total };
  }

  private buildMensaje(evento: EventoPedido): PushPayload {
    const montoFormateado = evento.monto.toLocaleString('es-CL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    switch (evento.tipo) {
      case 'nueva_venta':
        return {
          title: `Nueva venta! #${evento.referencia}`,
          body: `${montoFormateado} · ${evento.items.length} producto(s) · Web`,
          url: `/pedidos/${evento.pedidoId}`,
        };
      case 'pago_recibido':
        return {
          title: 'Pago recibido',
          body: `Venta #${evento.referencia} · $${montoFormateado}`,
          url: `/pedidos/${evento.pedidoId}`,
        };
      case 'pedido_agendado':
        const entregaInfo = evento.metroStation
          ? `Metro ${evento.metroStation}`
          : evento.comuna
            ? `Comuna ${evento.comuna}`
            : 'dirección';
        return {
          title: 'Pedido agendado',
          body: `#${evento.referencia} · entrega ${evento.metroLine || ''} ${entregaInfo}`,
          url: `/pedidos/${evento.pedidoId}`,
        };
      default:
        return {
          title: 'NutriFit',
          body: `Nuevo evento: ${evento.tipo}`,
          url: '/pedidos',
        };
    }
  }
}
