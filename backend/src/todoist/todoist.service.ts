import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const API = 'https://api.todoist.com/api/v1';

/** Offset de America/Santiago para un instante dado, en minutos (negativo al oeste). */
function santiagoOffsetMinutes(at: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santiago',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(at)) parts[p.type] = p.value;
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((asUTC - at.getTime()) / 60000);
}

/** "2026-09-12" + "17:30" (hora Santiago) -> ISO UTC para due_datetime. */
function santiagoToUtcIso(day: Date, hm: string): string {
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(day);
  const [Y, M, D] = ymd.split('-').map(Number);
  const [h, m] = hm.split(':').map((x) => Number(x) || 0);
  const guess = Date.UTC(Y, M - 1, D, h, m);
  const off = santiagoOffsetMinutes(new Date(guess));
  return new Date(guess - off * 60000).toISOString();
}

export type DeliveryTaskInput = {
  id: string;
  orderNumber?: string;
  customerName?: string;
  customerPhone?: string;
  stationName?: string;
  lineName?: string;
  deliveryDate: Date | null;
  windowStart?: string | null;
  windowEnd?: string | null;
  meetingPoint?: string | null;
  commune?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  deliveryCode?: string;
};

@Injectable()
export class TodoistService implements OnModuleInit {
  private readonly logger = new Logger(TodoistService.name);
  private token: string | null = null;
  private projectId: string | null = null;
  private projectName = 'Entregas NutriFit';
  private ready = false;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const token = this.config.get<string>('TODOIST_API_TOKEN');
    const projectName = this.config.get<string>('TODOIST_PROJECT_NAME');
    if (projectName) this.projectName = projectName;
    this.logger.log(`Todoist env: TOKEN=${token ? 'presente' : 'ausente'} PROJECT=${this.projectName}`);
    if (!token) {
      this.logger.warn('Todoist no configurado (falta TODOIST_API_TOKEN)');
      return;
    }
    this.token = token;
    try {
      this.projectId = await this.ensureProject(this.projectName);
      this.ready = true;
      this.logger.log(`Todoist habilitado (proyecto=${this.projectName})`);
    } catch (e: any) {
      this.logger.error(`Todoist no disponible: ${e?.message}`);
    }
  }

  private async req(path: string, init: RequestInit = {}): Promise<any> {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...((init.headers as Record<string, string>) || {}),
      },
    });
    if (res.status === 204) return null;
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Todoist ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json();
  }

  private async ensureProject(name: string): Promise<string> {
    const list: any[] = await this.req('/projects');
    const found = (list || []).find((p) => p?.name === name && !p?.is_archived);
    if (found) return found.id;
    const created = await this.req('/projects', { method: 'POST', body: JSON.stringify({ name }) });
    return created.id;
  }

  isReady() {
    return this.ready && !!this.token && !!this.projectId;
  }

  getMode() {
    return 'todoist';
  }

  async checkConnection(): Promise<{ ok: boolean; reason: string }> {
    if (!this.token) return { ok: false, reason: 'not_configured' };
    try {
      const me: any = await this.req('/projects');
      if (!Array.isArray(me)) throw new Error('Respuesta inesperada');
      if (!this.projectId) this.projectId = await this.ensureProject(this.projectName);
      this.ready = true;
      return { ok: true, reason: 'ok' };
    } catch (e: any) {
      this.logger.warn(`Todoist sin acceso: ${e?.message}`);
      return { ok: false, reason: /40[13]/.test(String(e?.message)) ? 'no_access' : 'error' };
    }
  }

  private taskContent(d: DeliveryTaskInput, statusLabel?: string): string {
    const num = d.orderNumber || d.id.slice(0, 8);
    const who = d.customerName || 'Cliente';
    const where = d.stationName ? `Metro ${d.stationName}${d.lineName ? ` ${d.lineName}` : ''}` : 'Retiro/Domicilio';
    const base = `Entrega #${num} — ${who} (${where})`;
    return statusLabel ? `${base} — ${statusLabel}` : base;
  }

  private taskDescription(d: DeliveryTaskInput): string {
    const lines = [
      `Pedido: ${d.orderNumber || d.id}`,
      `Cliente: ${d.customerName || 'N/A'}${d.customerPhone ? ` (${d.customerPhone})` : ''}`,
      d.stationName ? `Estación: ${d.stationName}${d.lineName ? ` (${d.lineName})` : ''}` : null,
      d.commune ? `Comuna: ${d.commune}` : null,
      d.meetingPoint ? `Punto de encuentro: ${d.meetingPoint}` : null,
      d.windowStart ? `Ventana: ${d.windowStart}${d.windowEnd ? `–${d.windowEnd}` : ''}` : null,
      d.deliveryCode ? `Código: ${d.deliveryCode}` : null,
      d.latitude && d.longitude ? `Mapa: https://www.google.com/maps?q=${d.latitude},${d.longitude}` : null,
      '',
      'NutriFit — Suplementos deportivos',
    ];
    return lines.filter((l) => l !== null).join('\n');
  }

  async createDeliveryTask(d: DeliveryTaskInput): Promise<string | null> {
    if (!this.isReady() || !d.deliveryDate) return null;
    try {
      const due = santiagoToUtcIso(new Date(d.deliveryDate), d.windowStart || '17:00');
      const created = await this.req('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          content: this.taskContent(d),
          description: this.taskDescription(d),
          project_id: this.projectId,
          due_datetime: due,
          priority: 4,
        }),
      });
      this.logger.log(`Todoist task creada: ${created?.id} para entrega ${d.id}`);
      return created?.id || null;
    } catch (e: any) {
      this.logger.error(`Error creando todoist task: ${e?.message}`);
      return null;
    }
  }

  async updateDeliveryTask(
    taskId: string,
    patch: { summary?: string; deliveryDate?: Date | string; windowStart?: string },
  ): Promise<boolean> {
    if (!this.isReady()) return false;
    try {
      const body: Record<string, unknown> = {};
      if (patch.summary) body.content = patch.summary;
      if (patch.deliveryDate) {
        body.due_datetime = santiagoToUtcIso(new Date(patch.deliveryDate), patch.windowStart || '17:00');
      }
      await this.req(`/tasks/${taskId}`, { method: 'POST', body: JSON.stringify(body) });
      return true;
    } catch (e: any) {
      this.logger.error(`Error actualizando todoist task: ${e?.message}`);
      return false;
    }
  }

  async closeDeliveryTask(taskId: string): Promise<boolean> {
    if (!this.isReady()) return false;
    try {
      await this.req(`/tasks/${taskId}/close`, { method: 'POST' });
      return true;
    } catch (e: any) {
      this.logger.error(`Error cerrando todoist task: ${e?.message}`);
      return false;
    }
  }

  async deleteDeliveryTask(taskId: string): Promise<boolean> {
    if (!this.isReady()) return false;
    try {
      await this.req(`/tasks/${taskId}`, { method: 'DELETE' });
      return true;
    } catch (e: any) {
      this.logger.error(`Error eliminando todoist task: ${e?.message}`);
      return false;
    }
  }
}
