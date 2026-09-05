import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { METRO_STATIONS } from './data/metro-stations.seed';

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const DEFAULT_SETTINGS = [
  { key: 'delivery_enabled', value: true },
  { key: 'metro_enabled', value: true },
  { key: 'home_delivery_enabled', value: true },
  { key: 'pickup_enabled', value: true },
  { key: 'minimum_notice_minutes', value: 60 },
  { key: 'default_delivery_duration', value: 30 },
  { key: 'maximum_orders_per_slot', value: 10 },
  { key: 'delivery_start_time', value: '10:00' },
  { key: 'delivery_end_time', value: '21:00' },
  { key: 'slot_interval_minutes', value: 30 },
  { key: 'reminder_before_minutes', value: 60 },
];

@Injectable()
export class DeliverySeedService implements OnModuleInit {
  private readonly logger = new Logger(DeliverySeedService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedStations();
    await this.seedSettings();
  }

  private async seedStations() {
    const count = await this.prisma.metroStation.count();
    if (count > 0) {
      this.logger.log(`Metro stations already seeded (${count})`);
      return;
    }

    this.logger.log('Seeding metro stations...');
    let created = 0;

    for (const station of METRO_STATIONS) {
      try {
        const existing = await this.prisma.metroStation.findUnique({
          where: { name_line: { name: station.name, line: station.line } },
        });
        if (existing) continue;

        await this.prisma.metroStation.create({
          data: {
            name: station.name,
            normalizedName: normalize(station.name),
            line: station.line,
            lineName: station.lineName,
            commune: station.commune,
            latitude: station.latitude,
            longitude: station.longitude,
            active: true,
            deliveryEnabled: true,
            defaultMeetingPoint: station.defaultMeetingPoint || 'Acceso principal',
            notes: station.notes || null,
            sortOrder: station.sortOrder,
          },
        });
        created++;
      } catch {
        // skip duplicates
      }
    }

    this.logger.log(`Metro stations seeded: ${created} created`);
  }

  private async seedSettings() {
    const count = await this.prisma.deliverySettings.count();
    if (count > 0) {
      this.logger.log(`Delivery settings already seeded (${count})`);
      return;
    }

    this.logger.log('Seeding delivery settings...');
    let created = 0;

    for (const setting of DEFAULT_SETTINGS) {
      try {
        await this.prisma.deliverySettings.create({
          data: { key: setting.key, value: setting.value as any },
        });
        created++;
      } catch {
        // skip duplicates
      }
    }

    this.logger.log(`Delivery settings seeded: ${created} created`);
  }
}
