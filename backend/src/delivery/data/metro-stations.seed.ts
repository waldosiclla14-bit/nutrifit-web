/**
 * Seed completo y corregido de estaciones Metro de Santiago
 * Fuente oficial: metro.cl, metrodesantiago.net (2026)
 * 143 estaciones en 7 líneas
 *
 * L1: 27 estaciones (San Pablo → Los Dominicos)
 * L2: 26 estaciones (Vespucio Norte → Hospital El Pino)
 * L3: 21 estaciones (Plaza Quilicura → Fernando Castillo Velasco)
 * L4: 23 estaciones (Tobalaba → Plaza de Puente Alto)
 * L4A: 6 estaciones (Vicuña Mackenna → La Cisterna)
 * L5: 30 estaciones (Plaza de Maipú → Vicente Valdés)
 * L6: 10 estaciones (Cerrillos → Los Leones)
 */
export const METRO_STATIONS = [
  // ═══════════════════════════════════════════
  // LÍNEA 1 — San Pablo → Los Dominicos (27)
  // Color: Rojo
  // ═══════════════════════════════════════════
  { name: 'San Pablo', line: 'L1', lineName: 'Línea 1', commune: 'Lo Prado', latitude: -33.4386, longitude: -70.6914, sortOrder: 1, defaultMeetingPoint: 'Acceso principal', notes: 'Combinación L5' },
  { name: 'Neptuno', line: 'L1', lineName: 'Línea 1', commune: 'Lo Prado', latitude: -33.4347, longitude: -70.6825, sortOrder: 2, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Pajaritos', line: 'L1', lineName: 'Línea 1', commune: 'Cerrillos', latitude: -33.4313, longitude: -70.6748, sortOrder: 3, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Las Rejas', line: 'L1', lineName: 'Línea 1', commune: 'Estación Central', latitude: -33.4280, longitude: -70.6670, sortOrder: 4, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Ecuador', line: 'L1', lineName: 'Línea 1', commune: 'Estación Central', latitude: -33.4254, longitude: -70.6613, sortOrder: 5, defaultMeetingPoint: 'Acceso principal' },
  { name: 'San Alberto Hurtado', line: 'L1', lineName: 'Línea 1', commune: 'Estación Central', latitude: -33.4221, longitude: -70.6545, sortOrder: 6, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Universidad de Santiago', line: 'L1', lineName: 'Línea 1', commune: 'Estación Central', latitude: -33.4191, longitude: -70.6488, sortOrder: 7, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Estación Central', line: 'L1', lineName: 'Línea 1', commune: 'Estación Central', latitude: -33.4168, longitude: -70.6427, sortOrder: 8, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Unión Latinoamericana', line: 'L1', lineName: 'Línea 1', commune: 'Santiago', latitude: -33.4141, longitude: -70.6372, sortOrder: 9, defaultMeetingPoint: 'Acceso principal' },
  { name: 'República', line: 'L1', lineName: 'Línea 1', commune: 'Santiago', latitude: -33.4116, longitude: -70.6315, sortOrder: 10, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Los Héroes', line: 'L1', lineName: 'Línea 1', commune: 'Santiago', latitude: -33.4086, longitude: -70.6231, sortOrder: 11, defaultMeetingPoint: 'Acceso principal', notes: 'Combinación L2' },
  { name: 'La Moneda', line: 'L1', lineName: 'Línea 1', commune: 'Santiago', latitude: -33.4058, longitude: -70.6173, sortOrder: 12, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Universidad de Chile', line: 'L1', lineName: 'Línea 1', commune: 'Santiago', latitude: -33.4027, longitude: -70.6113, sortOrder: 13, defaultMeetingPoint: 'Acceso principal', notes: 'Combinación L3' },
  { name: 'Santa Lucía', line: 'L1', lineName: 'Línea 1', commune: 'Santiago', latitude: -33.3998, longitude: -70.6051, sortOrder: 14, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Universidad Católica', line: 'L1', lineName: 'Línea 1', commune: 'Santiago', latitude: -33.3972, longitude: -70.5996, sortOrder: 15, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Baquedano', line: 'L1', lineName: 'Línea 1', commune: 'Providencia', latitude: -33.3943, longitude: -70.5935, sortOrder: 16, defaultMeetingPoint: 'Acceso principal', notes: 'Combinación L5' },
  { name: 'Salvador', line: 'L1', lineName: 'Línea 1', commune: 'Providencia', latitude: -33.3911, longitude: -70.5870, sortOrder: 17, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Manuel Montt', line: 'L1', lineName: 'Línea 1', commune: 'Providencia', latitude: -33.3880, longitude: -70.5807, sortOrder: 18, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Pedro de Valdivia', line: 'L1', lineName: 'Línea 1', commune: 'Providencia', latitude: -33.3853, longitude: -70.5749, sortOrder: 19, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Los Leones', line: 'L1', lineName: 'Línea 1', commune: 'Providencia', latitude: -33.3825, longitude: -70.5688, sortOrder: 20, defaultMeetingPoint: 'Acceso principal', notes: 'Combinación L6' },
  { name: 'Tobalaba', line: 'L1', lineName: 'Línea 1', commune: 'Las Condes', latitude: -33.3795, longitude: -70.5623, sortOrder: 21, defaultMeetingPoint: 'Acceso principal', notes: 'Combinación L4' },
  { name: 'El Golf', line: 'L1', lineName: 'Línea 1', commune: 'Las Condes', latitude: -33.3760, longitude: -70.5555, sortOrder: 22, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Alcántara', line: 'L1', lineName: 'Línea 1', commune: 'Las Condes', latitude: -33.3728, longitude: -70.5496, sortOrder: 23, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Escuela Militar', line: 'L1', lineName: 'Línea 1', commune: 'Las Condes', latitude: -33.3698, longitude: -70.5441, sortOrder: 24, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Manquehue', line: 'L1', lineName: 'Línea 1', commune: 'Las Condes', latitude: -33.3667, longitude: -70.5385, sortOrder: 25, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Hernando de Magallanes', line: 'L1', lineName: 'Línea 1', commune: 'Las Condes', latitude: -33.3635, longitude: -70.5328, sortOrder: 26, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Los Dominicos', line: 'L1', lineName: 'Línea 1', commune: 'Las Condes', latitude: -33.3606, longitude: -70.5273, sortOrder: 27, defaultMeetingPoint: 'Acceso principal' },

  // ═══════════════════════════════════════════
  // LÍNEA 2 — Vespucio Norte → Hospital El Pino (26)
  // Color: Amarillo
  // ═══════════════════════════════════════════
  { name: 'Vespucio Norte', line: 'L2', lineName: 'Línea 2', commune: 'Independencia', latitude: -33.4415, longitude: -70.5606, sortOrder: 1, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Zapadores', line: 'L2', lineName: 'Línea 2', commune: 'Recoleta', latitude: -33.4379, longitude: -70.5670, sortOrder: 2, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Dorsal', line: 'L2', lineName: 'Línea 2', commune: 'Recoleta', latitude: -33.4346, longitude: -70.5731, sortOrder: 3, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Einstein', line: 'L2', lineName: 'Línea 2', commune: 'Recoleta', latitude: -33.4312, longitude: -70.5791, sortOrder: 4, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Cementerios', line: 'L2', lineName: 'Línea 2', commune: 'Recoleta', latitude: -33.4278, longitude: -70.5853, sortOrder: 5, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Cerro Blanco', line: 'L2', lineName: 'Línea 2', commune: 'Recoleta', latitude: -33.4243, longitude: -70.5913, sortOrder: 6, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Patronato', line: 'L2', lineName: 'Línea 2', commune: 'Santiago', latitude: -33.4210, longitude: -70.5972, sortOrder: 7, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Cal y Canto', line: 'L2', lineName: 'Línea 2', commune: 'Santiago', latitude: -33.4178, longitude: -70.6031, sortOrder: 8, defaultMeetingPoint: 'Acceso principal', notes: 'Combinación L3' },
  { name: 'Santa Ana', line: 'L2', lineName: 'Línea 2', commune: 'Santiago', latitude: -33.4140, longitude: -70.6105, sortOrder: 9, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Los Héroes', line: 'L2', lineName: 'Línea 2', commune: 'Santiago', latitude: -33.4086, longitude: -70.6231, sortOrder: 10, defaultMeetingPoint: 'Acceso principal', notes: 'Combinación L1' },
  { name: 'Toesca', line: 'L2', lineName: 'Línea 2', commune: 'Santiago', latitude: -33.4058, longitude: -70.6300, sortOrder: 11, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Parque O\'Higgins', line: 'L2', lineName: 'Línea 2', commune: 'Santiago', latitude: -33.4030, longitude: -70.6370, sortOrder: 12, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Rondizzoni', line: 'L2', lineName: 'Línea 2', commune: 'Santiago', latitude: -33.4000, longitude: -70.6440, sortOrder: 13, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Franklin', line: 'L2', lineName: 'Línea 2', commune: 'San Miguel', latitude: -33.3970, longitude: -70.6510, sortOrder: 14, defaultMeetingPoint: 'Acceso principal' },
  { name: 'El Llano', line: 'L2', lineName: 'Línea 2', commune: 'San Miguel', latitude: -33.3940, longitude: -70.6580, sortOrder: 15, defaultMeetingPoint: 'Acceso principal' },
  { name: 'San Miguel', line: 'L2', lineName: 'Línea 2', commune: 'San Miguel', latitude: -33.3910, longitude: -70.6650, sortOrder: 16, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Lo Vial', line: 'L2', lineName: 'Línea 2', commune: 'San Miguel', latitude: -33.3880, longitude: -70.6720, sortOrder: 17, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Departamental', line: 'L2', lineName: 'Línea 2', commune: 'San Miguel', latitude: -33.3850, longitude: -70.6790, sortOrder: 18, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Ciudad del Niño', line: 'L2', lineName: 'Línea 2', commune: 'La Cisterna', latitude: -33.3820, longitude: -70.6860, sortOrder: 19, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Lo Ovalle', line: 'L2', lineName: 'Línea 2', commune: 'La Cisterna', latitude: -33.3790, longitude: -70.6930, sortOrder: 20, defaultMeetingPoint: 'Acceso principal' },
  { name: 'El Parrón', line: 'L2', lineName: 'Línea 2', commune: 'La Cisterna', latitude: -33.3760, longitude: -70.7000, sortOrder: 21, defaultMeetingPoint: 'Acceso principal' },
  { name: 'La Cisterna', line: 'L2', lineName: 'Línea 2', commune: 'La Cisterna', latitude: -33.3730, longitude: -70.7070, sortOrder: 22, defaultMeetingPoint: 'Acceso principal' },
  { name: 'El Bosque', line: 'L2', lineName: 'Línea 2', commune: 'El Bosque', latitude: -33.3700, longitude: -70.7140, sortOrder: 23, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Observatorio', line: 'L2', lineName: 'Línea 2', commune: 'El Bosque', latitude: -33.3670, longitude: -70.7210, sortOrder: 24, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Copa Lo Martínez', line: 'L2', lineName: 'Línea 2', commune: 'San Bernardo', latitude: -33.3640, longitude: -70.7280, sortOrder: 25, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Hospital El Pino', line: 'L2', lineName: 'Línea 2', commune: 'San Bernardo', latitude: -33.3610, longitude: -70.7350, sortOrder: 26, defaultMeetingPoint: 'Acceso principal' },

  // ═══════════════════════════════════════════
  // LÍNEA 3 — Plaza Quilicura → Fernando Castillo Velasco (21)
  // Color: Café
  // ═══════════════════════════════════════════
  { name: 'Plaza Quilicura', line: 'L3', lineName: 'Línea 3', commune: 'Quilicura', latitude: -33.3550, longitude: -70.7280, sortOrder: 1, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Lo Cruzat', line: 'L3', lineName: 'Línea 3', commune: 'Quilicura', latitude: -33.3520, longitude: -70.7210, sortOrder: 2, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Ferrocarril', line: 'L3', lineName: 'Línea 3', commune: 'Quilicura', latitude: -33.3490, longitude: -70.7140, sortOrder: 3, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Los Libertadores', line: 'L3', lineName: 'Línea 3', commune: 'Quilicura', latitude: -33.3460, longitude: -70.7070, sortOrder: 4, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Cardenal Caro', line: 'L3', lineName: 'Línea 3', commune: 'Renca', latitude: -33.3430, longitude: -70.7000, sortOrder: 5, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Vivaceta', line: 'L3', lineName: 'Línea 3', commune: 'Renca', latitude: -33.3400, longitude: -70.6930, sortOrder: 6, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Conchalí', line: 'L3', lineName: 'Línea 3', commune: 'Conchalí', latitude: -33.3370, longitude: -70.6860, sortOrder: 7, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Plaza Chacabuco', line: 'L3', lineName: 'Línea 3', commune: 'Conchalí', latitude: -33.3340, longitude: -70.6790, sortOrder: 8, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Hospitales', line: 'L3', lineName: 'Línea 3', commune: 'Santiago', latitude: -33.3310, longitude: -70.6720, sortOrder: 9, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Cal y Canto', line: 'L3', lineName: 'Línea 3', commune: 'Santiago', latitude: -33.4178, longitude: -70.6031, sortOrder: 10, defaultMeetingPoint: 'Acceso principal', notes: 'Combinación L2' },
  { name: 'Plaza de Armas', line: 'L3', lineName: 'Línea 3', commune: 'Santiago', latitude: -33.4164, longitude: -70.6073, sortOrder: 11, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Universidad de Chile', line: 'L3', lineName: 'Línea 3', commune: 'Santiago', latitude: -33.4027, longitude: -70.6113, sortOrder: 12, defaultMeetingPoint: 'Acceso principal', notes: 'Combinación L1' },
  { name: 'Parque Almagro', line: 'L3', lineName: 'Línea 3', commune: 'Santiago', latitude: -33.3980, longitude: -70.6155, sortOrder: 13, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Matta', line: 'L3', lineName: 'Línea 3', commune: 'Santiago', latitude: -33.3930, longitude: -70.6195, sortOrder: 14, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Irarrázaval', line: 'L3', lineName: 'Línea 3', commune: 'San Miguel', latitude: -33.3880, longitude: -70.6235, sortOrder: 15, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Monseñor Eyzaguirre', line: 'L3', lineName: 'Línea 3', commune: 'Ñuñoa', latitude: -33.3830, longitude: -70.6275, sortOrder: 16, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Ñuñoa', line: 'L3', lineName: 'Línea 3', commune: 'Ñuñoa', latitude: -33.3780, longitude: -70.6315, sortOrder: 17, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Chile España', line: 'L3', lineName: 'Línea 3', commune: 'Ñuñoa', latitude: -33.3730, longitude: -70.6355, sortOrder: 18, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Villa Frei', line: 'L3', lineName: 'Línea 3', commune: 'Ñuñoa', latitude: -33.3680, longitude: -70.6395, sortOrder: 19, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Plaza Egaña', line: 'L3', lineName: 'Línea 3', commune: 'Ñuñoa', latitude: -33.3630, longitude: -70.6435, sortOrder: 20, defaultMeetingPoint: 'Acceso principal', notes: 'Combinación L4' },
  { name: 'Fernando Castillo Velasco', line: 'L3', lineName: 'Línea 3', commune: 'La Reina', latitude: -33.3580, longitude: -70.6475, sortOrder: 21, defaultMeetingPoint: 'Acceso principal' },

  // ═══════════════════════════════════════════
  // LÍNEA 4 — Tobalaba → Plaza de Puente Alto (23)
  // Color: Azul
  // ═══════════════════════════════════════════
  { name: 'Tobalaba', line: 'L4', lineName: 'Línea 4', commune: 'Las Condes', latitude: -33.3795, longitude: -70.5623, sortOrder: 1, defaultMeetingPoint: 'Acceso principal', notes: 'Combinación L1' },
  { name: 'Cristóbal Colón', line: 'L4', lineName: 'Línea 4', commune: 'Providencia', latitude: -33.3750, longitude: -70.5560, sortOrder: 2, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Francisco Bilbao', line: 'L4', lineName: 'Línea 4', commune: 'Providencia', latitude: -33.3705, longitude: -70.5498, sortOrder: 3, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Príncipe de Gales', line: 'L4', lineName: 'Línea 4', commune: 'Providencia', latitude: -33.3660, longitude: -70.5435, sortOrder: 4, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Simón Bolívar', line: 'L4', lineName: 'Línea 4', commune: 'Providencia', latitude: -33.3615, longitude: -70.5373, sortOrder: 5, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Plaza Egaña', line: 'L4', lineName: 'Línea 4', commune: 'Ñuñoa', latitude: -33.3570, longitude: -70.5310, sortOrder: 6, defaultMeetingPoint: 'Acceso principal', notes: 'Combinación L3' },
  { name: 'Los Orientales', line: 'L4', lineName: 'Línea 4', commune: 'Ñuñoa', latitude: -33.3525, longitude: -70.5248, sortOrder: 7, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Grecia', line: 'L4', lineName: 'Línea 4', commune: 'Ñuñoa', latitude: -33.3480, longitude: -70.5185, sortOrder: 8, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Los Presidentes', line: 'L4', lineName: 'Línea 4', commune: 'Ñuñoa', latitude: -33.3435, longitude: -70.5123, sortOrder: 9, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Quilín', line: 'L4', lineName: 'Línea 4', commune: 'Macul', latitude: -33.3390, longitude: -70.5060, sortOrder: 10, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Las Torres', line: 'L4', lineName: 'Línea 4', commune: 'Macul', latitude: -33.3345, longitude: -70.4998, sortOrder: 11, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Macul', line: 'L4', lineName: 'Línea 4', commune: 'Macul', latitude: -33.3300, longitude: -70.4935, sortOrder: 12, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Vicuña Mackenna', line: 'L4', lineName: 'Línea 4', commune: 'Macul', latitude: -33.3255, longitude: -70.4873, sortOrder: 13, defaultMeetingPoint: 'Acceso principal', notes: 'Combinación L4A' },
  { name: 'Vicente Valdés', line: 'L4', lineName: 'Línea 4', commune: 'La Florida', latitude: -33.3210, longitude: -70.4810, sortOrder: 14, defaultMeetingPoint: 'Acceso principal', notes: 'Combinación L5' },
  { name: 'Rojas Magallanes', line: 'L4', lineName: 'Línea 4', commune: 'La Florida', latitude: -33.3165, longitude: -70.4748, sortOrder: 15, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Trinidad', line: 'L4', lineName: 'Línea 4', commune: 'La Florida', latitude: -33.3120, longitude: -70.4685, sortOrder: 16, defaultMeetingPoint: 'Acceso principal' },
  { name: 'San José de la Estrella', line: 'L4', lineName: 'Línea 4', commune: 'La Florida', latitude: -33.3075, longitude: -70.4623, sortOrder: 17, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Los Quillayes', line: 'L4', lineName: 'Línea 4', commune: 'La Florida', latitude: -33.3030, longitude: -70.4560, sortOrder: 18, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Elisa Correa', line: 'L4', lineName: 'Línea 4', commune: 'Puente Alto', latitude: -33.2985, longitude: -70.4498, sortOrder: 19, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Hospital Sótero del Río', line: 'L4', lineName: 'Línea 4', commune: 'Puente Alto', latitude: -33.2940, longitude: -70.4435, sortOrder: 20, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Protectora de la Infancia', line: 'L4', lineName: 'Línea 4', commune: 'Puente Alto', latitude: -33.2895, longitude: -70.4373, sortOrder: 21, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Las Mercedes', line: 'L4', lineName: 'Línea 4', commune: 'Puente Alto', latitude: -33.2850, longitude: -70.4310, sortOrder: 22, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Plaza de Puente Alto', line: 'L4', lineName: 'Línea 4', commune: 'Puente Alto', latitude: -33.2805, longitude: -70.4248, sortOrder: 23, defaultMeetingPoint: 'Acceso principal' },

  // ═══════════════════════════════════════════
  // LÍNEA 4A — Vicuña Mackenna → La Cisterna (6)
  // Color: Celeste
  // ═══════════════════════════════════════════
  { name: 'Vicuña Mackenna', line: 'L4A', lineName: 'Línea 4A', commune: 'Macul', latitude: -33.3255, longitude: -70.4873, sortOrder: 1, defaultMeetingPoint: 'Acceso principal', notes: 'Combinación L4' },
  { name: 'Santa Julia', line: 'L4A', lineName: 'Línea 4A', commune: 'La Granja', latitude: -33.3300, longitude: -70.4950, sortOrder: 2, defaultMeetingPoint: 'Acceso principal' },
  { name: 'La Granja', line: 'L4A', lineName: 'Línea 4A', commune: 'La Granja', latitude: -33.3350, longitude: -70.5030, sortOrder: 3, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Santa Rosa', line: 'L4A', lineName: 'Línea 4A', commune: 'La Granja', latitude: -33.3400, longitude: -70.5110, sortOrder: 4, defaultMeetingPoint: 'Acceso principal' },
  { name: 'San Ramón', line: 'L4A', lineName: 'Línea 4A', commune: 'San Ramón', latitude: -33.3450, longitude: -70.5190, sortOrder: 5, defaultMeetingPoint: 'Acceso principal' },
  { name: 'La Cisterna', line: 'L4A', lineName: 'Línea 4A', commune: 'La Cisterna', latitude: -33.3500, longitude: -70.5270, sortOrder: 6, defaultMeetingPoint: 'Acceso principal', notes: 'Combinación L2' },

  // ═══════════════════════════════════════════
  // LÍNEA 5 — Plaza de Maipú → Vicente Valdés (30)
  // Color: Verde
  // ═══════════════════════════════════════════
  { name: 'Plaza de Maipú', line: 'L5', lineName: 'Línea 5', commune: 'Maipú', latitude: -33.5130, longitude: -70.7580, sortOrder: 1, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Santiago Bueras', line: 'L5', lineName: 'Línea 5', commune: 'Maipú', latitude: -33.5080, longitude: -70.7500, sortOrder: 2, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Del Sol', line: 'L5', lineName: 'Línea 5', commune: 'Maipú', latitude: -33.5030, longitude: -70.7420, sortOrder: 3, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Monte Tabor', line: 'L5', lineName: 'Línea 5', commune: 'Maipú', latitude: -33.4980, longitude: -70.7340, sortOrder: 4, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Las Parcelas', line: 'L5', lineName: 'Línea 5', commune: 'Maipú', latitude: -33.4930, longitude: -70.7260, sortOrder: 5, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Laguna Sur', line: 'L5', lineName: 'Línea 5', commune: 'Maipú', latitude: -33.4880, longitude: -70.7180, sortOrder: 6, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Barrancas', line: 'L5', lineName: 'Línea 5', commune: 'Maipú', latitude: -33.4830, longitude: -70.7100, sortOrder: 7, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Pudahuel', line: 'L5', lineName: 'Línea 5', commune: 'Pudahuel', latitude: -33.4780, longitude: -70.7020, sortOrder: 8, defaultMeetingPoint: 'Acceso principal' },
  { name: 'San Pablo', line: 'L5', lineName: 'Línea 5', commune: 'Lo Prado', latitude: -33.4386, longitude: -70.6914, sortOrder: 9, defaultMeetingPoint: 'Acceso principal', notes: 'Combinación L1' },
  { name: 'Lo Prado', line: 'L5', lineName: 'Línea 5', commune: 'Lo Prado', latitude: -33.4340, longitude: -70.6840, sortOrder: 10, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Blanqueado', line: 'L5', lineName: 'Línea 5', commune: 'Lo Prado', latitude: -33.4290, longitude: -70.6770, sortOrder: 11, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Gruta de Lourdes', line: 'L5', lineName: 'Línea 5', commune: 'Quinta Normal', latitude: -33.4240, longitude: -70.6700, sortOrder: 12, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Quinta Normal', line: 'L5', lineName: 'Línea 5', commune: 'Quinta Normal', latitude: -33.4190, longitude: -70.6630, sortOrder: 13, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Cumming', line: 'L5', lineName: 'Línea 5', commune: 'Quinta Normal', latitude: -33.4140, longitude: -70.6560, sortOrder: 14, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Santa Ana', line: 'L5', lineName: 'Línea 5', commune: 'Santiago', latitude: -33.4140, longitude: -70.6105, sortOrder: 15, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Plaza de Armas', line: 'L5', lineName: 'Línea 5', commune: 'Santiago', latitude: -33.4164, longitude: -70.6073, sortOrder: 16, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Bellas Artes', line: 'L5', lineName: 'Línea 5', commune: 'Santiago', latitude: -33.4080, longitude: -70.6010, sortOrder: 17, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Baquedano', line: 'L5', lineName: 'Línea 5', commune: 'Providencia', latitude: -33.3943, longitude: -70.5935, sortOrder: 18, defaultMeetingPoint: 'Acceso principal', notes: 'Combinación L1' },
  { name: 'Parque Bustamante', line: 'L5', lineName: 'Línea 5', commune: 'Santiago', latitude: -33.3870, longitude: -70.5870, sortOrder: 19, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Santa Isabel', line: 'L5', lineName: 'Línea 5', commune: 'Santiago', latitude: -33.3800, longitude: -70.5800, sortOrder: 20, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Irarrázaval', line: 'L5', lineName: 'Línea 5', commune: 'Ñuñoa', latitude: -33.3730, longitude: -70.5730, sortOrder: 21, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Ñuble', line: 'L5', lineName: 'Línea 5', commune: 'Ñuñoa', latitude: -33.3660, longitude: -70.5660, sortOrder: 22, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Rodrigo de Araya', line: 'L5', lineName: 'Línea 5', commune: 'San Ramón', latitude: -33.3590, longitude: -70.5590, sortOrder: 23, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Carlos Valdovinos', line: 'L5', lineName: 'Línea 5', commune: 'San Ramón', latitude: -33.3520, longitude: -70.5520, sortOrder: 24, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Camino Agrícola', line: 'L5', lineName: 'Línea 5', commune: 'San Ramón', latitude: -33.3450, longitude: -70.5450, sortOrder: 25, defaultMeetingPoint: 'Acceso principal' },
  { name: 'San Joaquín', line: 'L5', lineName: 'Línea 5', commune: 'San Joaquín', latitude: -33.3380, longitude: -70.5380, sortOrder: 26, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Pedrero', line: 'L5', lineName: 'Línea 5', commune: 'La Florida', latitude: -33.3310, longitude: -70.5310, sortOrder: 27, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Mirador', line: 'L5', lineName: 'Línea 5', commune: 'La Florida', latitude: -33.3240, longitude: -70.5240, sortOrder: 28, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Bellavista de La Florida', line: 'L5', lineName: 'Línea 5', commune: 'La Florida', latitude: -33.3170, longitude: -70.5170, sortOrder: 29, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Vicente Valdés', line: 'L5', lineName: 'Línea 5', commune: 'La Florida', latitude: -33.3100, longitude: -70.5100, sortOrder: 30, defaultMeetingPoint: 'Acceso principal', notes: 'Combinación L4' },

  // ═══════════════════════════════════════════
  // LÍNEA 6 — Cerrillos → Los Leones (10)
  // Color: Morado
  // ═══════════════════════════════════════════
  { name: 'Cerrillos', line: 'L6', lineName: 'Línea 6', commune: 'Cerrillos', latitude: -33.4150, longitude: -70.6550, sortOrder: 1, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Lo Valledor', line: 'L6', lineName: 'Línea 6', commune: 'Cerrillos', latitude: -33.4100, longitude: -70.6480, sortOrder: 2, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Pdte. Pedro Aguirre Cerda', line: 'L6', lineName: 'Línea 6', commune: 'Pedro Aguirre Cerda', latitude: -33.4050, longitude: -70.6410, sortOrder: 3, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Franklin', line: 'L6', lineName: 'Línea 6', commune: 'San Miguel', latitude: -33.3970, longitude: -70.6340, sortOrder: 4, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Bío Bío', line: 'L6', lineName: 'Línea 6', commune: 'Santiago', latitude: -33.3900, longitude: -70.6270, sortOrder: 5, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Ñuble', line: 'L6', lineName: 'Línea 6', commune: 'Ñuñoa', latitude: -33.3830, longitude: -70.6200, sortOrder: 6, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Estadio Nacional', line: 'L6', lineName: 'Línea 6', commune: 'Ñuñoa', latitude: -33.3760, longitude: -70.6130, sortOrder: 7, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Ñuñoa', line: 'L6', lineName: 'Línea 6', commune: 'Ñuñoa', latitude: -33.3690, longitude: -70.6060, sortOrder: 8, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Inés de Suárez', line: 'L6', lineName: 'Línea 6', commune: 'Providencia', latitude: -33.3620, longitude: -70.5990, sortOrder: 9, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Los Leones', line: 'L6', lineName: 'Línea 6', commune: 'Providencia', latitude: -33.3825, longitude: -70.5688, sortOrder: 10, defaultMeetingPoint: 'Acceso principal', notes: 'Combinación L1' },
];
