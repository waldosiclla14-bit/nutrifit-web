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
  { key: 'delivery_start_time', value: '08:00' },
  { key: 'delivery_end_time', value: '22:00' },
  { key: 'slot_interval_minutes', value: 30 },
  { key: 'reminder_before_minutes', value: 60 },
];

/**
 * Version del seed de estaciones de metro.
 *
 * SUBIR ESTA CADENA cada vez que cambie METRO_STATIONS (agregar, quitar o
 * corregir una estacion). Es lo unico que dispara la resincronizacion.
 *
 * Si NO se sube, el arranque asume que la tabla esta al dia y no la toca.
 */
const METRO_SEED_VERSION = '2026-10-27.1';
const METRO_SEED_VERSION_KEY = 'metro_seed_version';

/** Upserts en paralelo por lote. 10 mantiene comodo el pool (connection_limit=5). */
const UPSERT_CHUNK = 10;

@Injectable()
export class DeliverySeedService implements OnModuleInit {
  private readonly logger = new Logger(DeliverySeedService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedStationsIfNeeded();
    await this.seedSettings();
    await this.syncScheduleWindow();
  }

  // --------------------------- estaciones ---------------------------

  /**
   * Solo sincroniza si la version del seed cambio o si el numero de
   * estaciones en la tabla no cuadra con el seed.
   *
   * Antes: 143 upserts secuenciales en CADA arranque (~96 s).
   * Ahora: 2 consultas cuando no hay cambios (~1 s).
   */
  private async seedStationsIfNeeded() {
    const esperado = METRO_STATIONS.length;
    let versionGuardada: string | null = null;
    let enTabla = 0;

    try {
      const [row, count] = await Promise.all([
        this.prisma.config.findUnique({ where: { key: METRO_SEED_VERSION_KEY } }),
        this.prisma.metroStation.count(),
      ]);
      versionGuardada = row?.value ?? null;
      enTabla = count;
    } catch (e: any) {
      // Si la verificacion falla, se sincroniza: es mas seguro que quedarse corto.
      this.logger.warn(
        `No se pudo verificar el seed de estaciones, se sincroniza por precaucion: ${e?.message ?? e}`,
      );
    }

    if (versionGuardada === METRO_SEED_VERSION && enTabla === esperado) {
      this.logger.log(
        `Metro stations al dia (v${METRO_SEED_VERSION}, ${enTabla} estaciones) - sin sincronizar`,
      );
      return;
    }

    this.logger.log(
      `Metro stations sync requerido: version ${versionGuardada ?? 'ninguna'} -> ${METRO_SEED_VERSION}, ` +
        `en tabla ${enTabla}/${esperado}`,
    );

    await this.seedStations();
    await this.saveSeedVersion();
  }

  private async saveSeedVersion() {
    try {
      await this.prisma.config.upsert({
        where: { key: METRO_SEED_VERSION_KEY },
        update: { value: METRO_SEED_VERSION },
        create: { key: METRO_SEED_VERSION_KEY, value: METRO_SEED_VERSION },
      });
    } catch (e: any) {
      this.logger.warn(`No se pudo guardar metro_seed_version: ${e?.message ?? e}`);
    }
  }

  private async seedStations() {
    this.logger.log(`Syncing metro stations with seed data (${METRO_STATIONS.length})...`);

    // Build set of valid station keys from seed
    const validKeys = new Set(METRO_STATIONS.map((s) => `${s.name}|${s.line}`));

    // Remove stations not in seed (old/wrong data)
    const existing = await this.prisma.metroStation.findMany({
      select: { id: true, name: true, line: true },
    });
    let removed = 0;
    for (const station of existing) {
      if (!validKeys.has(`${station.name}|${station.line}`)) {
        // Individual y tolerante a fallos: Delivery referencia MetroStation,
        // asi que una estacion con entregas no se puede borrar y debe seguir.
        await this.prisma.metroStation
          .delete({ where: { id: station.id } })
          .catch(() => {});
        removed++;
      }
    }
    if (removed > 0) {
      this.logger.log(`Removed ${removed} obsolete stations`);
    }

    // Upsert all stations from seed, en lotes paralelos
    let upserted = 0;
    let failed = 0;

    for (let i = 0; i < METRO_STATIONS.length; i += UPSERT_CHUNK) {
      const lote = METRO_STATIONS.slice(i, i + UPSERT_CHUNK);

      const resultados = await Promise.all(
        lote.map((station) =>
          this.prisma.metroStation
            .upsert({
              where: { name_line: { name: station.name, line: station.line } },
              update: {
                lineName: station.lineName,
                commune: station.commune,
                latitude: station.latitude,
                longitude: station.longitude,
                defaultMeetingPoint: station.defaultMeetingPoint || 'Acceso principal',
                notes: station.notes || null,
                sortOrder: station.sortOrder,
                normalizedName: normalize(station.name),
                active: true,
                deliveryEnabled: true,
              },
              create: {
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
            })
            .then(() => true)
            .catch((e: any) => {
              failed++;
              this.logger.warn(
                `Failed to upsert station ${station.name} (${station.line}): ${e?.message}`,
              );
              return false;
            }),
        ),
      );

      upserted += resultados.filter(Boolean).length;
    }

    this.logger.log(
      `Metro stations synced: ${upserted} upserted, ${removed} removed` +
        (failed > 0 ? `, ${failed} fallidas` : ''),
    );
  }

  // --------------------------- settings ---------------------------

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

  /**
   * Canonical metro delivery window (spec 4.7.1: fixed 30-min blocks 8 AM - 10 PM).
   * Upserted on every boot so the window is guaranteed even on databases
   * baselined without running the settings UPDATE migrations.
   * There is no admin UI for these keys; code owns the values.
   */
  private async syncScheduleWindow() {
    const canonical: Record<string, string> = {
      delivery_start_time: '08:00',
      delivery_end_time: '22:00',
    };
    for (const [key, value] of Object.entries(canonical)) {
      try {
        await this.prisma.deliverySettings.upsert({
          where: { key },
          update: { value: value as any },
          create: { key, value: value as any },
        });
      } catch (e: any) {
        this.logger.warn(`Could not sync setting ${key}: ${e?.message}`);
      }
    }
    this.logger.log('Delivery window synced: 08:00-22:00');
  }
}
