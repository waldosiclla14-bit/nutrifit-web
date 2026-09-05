import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class GoogleCalendarService implements OnModuleInit {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private calendar: calendar_v3.Calendar | null = null;
  private oauth2Client: OAuth2Client | null = null;
  private isConfigured = false;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.config.get<string>('GOOGLE_REDIRECT_URI');

    if (!clientId || !clientSecret) {
      this.logger.warn('Google Calendar no configurado (faltan GOOGLE_CLIENT_ID/SECRET)');
      return;
    }

    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    this.isConfigured = true;
    this.logger.log('Google Calendar habilitado');
  }

  getAuthUrl(state?: string) {
    if (!this.oauth2Client) return null;

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: state || 'nutrifit',
    });
  }

  async setCredentials(code: string) {
    if (!this.oauth2Client) return false;

    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    this.logger.log('Google Calendar credentials actualizados');
    return true;
  }

  isReady() {
    return this.isConfigured && this.calendar !== null;
  }

  async createDeliveryEvent(delivery: {
    id: string;
    orderNumber?: string;
    customerName?: string;
    stationName?: string;
    lineName?: string;
    deliveryDate: Date | null;
    windowStart?: string | null;
    windowEnd?: string | null;
    meetingPoint?: string | null;
    commune?: string | null;
    latitude?: number;
    longitude?: number;
  }): Promise<string | null> {
    if (!this.calendar || !delivery.deliveryDate) return null;

    try {
      const date = delivery.deliveryDate;
      const [startH, startM] = (delivery.windowStart || '17:00').split(':').map(Number);
      const [endH, endM] = (delivery.windowEnd || '17:30').split(':').map(Number);

      const startTime = new Date(date);
      startTime.setHours(startH, startM, 0, 0);
      const endTime = new Date(date);
      endTime.setHours(endH, endM, 0, 0);

      const location = delivery.stationName
        ? `Metro ${delivery.stationName} (${delivery.lineName || ''})${delivery.commune ? `, ${delivery.commune}` : ''}`
        : 'NutriFit';

      const description = [
        `Pedido: ${delivery.orderNumber || delivery.id}`,
        `Cliente: ${delivery.customerName || 'N/A'}`,
        `Estación: ${delivery.stationName || 'N/A'}`,
        `Línea: ${delivery.lineName || 'N/A'}`,
        delivery.meetingPoint ? `Punto de encuentro: ${delivery.meetingPoint}` : '',
        delivery.latitude && delivery.longitude ? `Coords: ${delivery.latitude}, ${delivery.longitude}` : '',
        '',
        'NutriFit — Suplementos deportivos',
      ].filter(Boolean).join('\n');

      const event = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: `Entrega #${delivery.orderNumber || delivery.id.slice(0, 8)}`,
          description,
          location,
          start: { dateTime: startTime.toISOString(), timeZone: 'America/Santiago' },
          end: { dateTime: endTime.toISOString(), timeZone: 'America/Santiago' },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 30 },
              { method: 'popup', minutes: 10 },
            ],
          },
          colorId: '6',
        },
      });

      this.logger.log(`Calendar event creado: ${event.data.id} para entrega ${delivery.id}`);
      return event.data.id || null;
    } catch (error: any) {
      this.logger.error(`Error creando calendar event: ${error.message}`);
      return null;
    }
  }

  async updateDeliveryEvent(
    eventId: string,
    updates: {
      summary?: string;
      description?: string;
      location?: string;
      start?: Date;
      end?: Date;
    },
  ): Promise<boolean> {
    if (!this.calendar) return false;

    try {
      const requestBody: calendar_v3.Schema$Event = {};
      if (updates.summary) requestBody.summary = updates.summary;
      if (updates.description) requestBody.description = updates.description;
      if (updates.location) requestBody.location = updates.location;
      if (updates.start) {
        requestBody.start = { dateTime: updates.start.toISOString(), timeZone: 'America/Santiago' };
      }
      if (updates.end) {
        requestBody.end = { dateTime: updates.end.toISOString(), timeZone: 'America/Santiago' };
      }

      await this.calendar.events.patch({
        calendarId: 'primary',
        eventId,
        requestBody,
      });

      return true;
    } catch (error: any) {
      this.logger.error(`Error actualizando calendar event: ${error.message}`);
      return false;
    }
  }

  async deleteDeliveryEvent(eventId: string): Promise<boolean> {
    if (!this.calendar) return false;

    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId,
      });
      return true;
    } catch (error: any) {
      this.logger.error(`Error eliminando calendar event: ${error.message}`);
      return false;
    }
  }

  async getTodayEvents(): Promise<calendar_v3.Schema$Event[]> {
    if (!this.calendar) return [];

    try {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 50,
      });

      return response.data.items || [];
    } catch (error: any) {
      this.logger.error(`Error obteniendo eventos: ${error.message}`);
      return [];
    }
  }
}
