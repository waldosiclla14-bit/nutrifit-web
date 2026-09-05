/**
 * Seed runner — ejecutar con: npx ts-node src/delivery/seed-runner.ts
 * Popula metro_stations + delivery_settings en la BD
 */
import { PrismaClient } from '@prisma/client';
import { METRO_STATIONS } from './data/metro-stations.seed';

const prisma = new PrismaClient();

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

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

async function main() {
  console.log('🚇 Seeding metro stations...');

  let created = 0;
  let skipped = 0;

  for (const station of METRO_STATIONS) {
    const normalizedName = normalize(station.name);

    const existing = await prisma.metroStation.findUnique({
      where: { name_line: { name: station.name, line: station.line } },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.metroStation.create({
      data: {
        name: station.name,
        normalizedName,
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
  }

  console.log(`✅ Metro stations: ${created} created, ${skipped} skipped (existing)`);

  console.log('⚙️  Seeding delivery settings...');

  let settingsCreated = 0;
  let settingsSkipped = 0;

  for (const setting of DEFAULT_SETTINGS) {
    const existing = await prisma.deliverySettings.findUnique({
      where: { key: setting.key },
    });

    if (existing) {
      settingsSkipped++;
      continue;
    }

    await prisma.deliverySettings.create({
      data: { key: setting.key, value: setting.value as any },
    });
    settingsCreated++;
  }

  console.log(`✅ Delivery settings: ${settingsCreated} created, ${settingsSkipped} skipped (existing)`);
  console.log('🎉 Seed completado!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
