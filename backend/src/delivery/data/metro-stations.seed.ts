/**
 * Seed completo de estaciones Metro de Santiago
 * Fuente: metro.cl, wikipedia, mapas oficiales
 * 136 estaciones en 7 líneas
 */
export const METRO_STATIONS = [
  // ═══════════════════════════════════════════
  // LÍNEA 1 — San Pablo → Los Dominicos (27)
  // ═══════════════════════════════════════════
  { name: 'San Pablo', line: 'L1', lineName: 'Línea 1', commune: 'Quinta Normal', latitude: -33.4386, longitude: -70.6914, sortOrder: 1, defaultMeetingPoint: 'Accesoprincipal' },
  { name: 'Neptuno', line: 'L1', lineName: 'Línea 1', commune: 'Quinta Normal', latitude: -33.4347, longitude: -70.6825, sortOrder: 2, defaultMeetingPoint: 'Acceso principal' },
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
  { name: 'El Salvador', line: 'L1', lineName: 'Línea 1', commune: 'Providencia', latitude: -33.3911, longitude: -70.5870, sortOrder: 17, defaultMeetingPoint: 'Acceso principal' },
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
  // LÍNEA 2 — Los Héroes → Metro de Maipú (23)
  // ═══════════════════════════════════════════
  { name: 'Los Héroes', line: 'L2', lineName: 'Línea 2', commune: 'Santiago', latitude: -33.4086, longitude: -70.6231, sortOrder: 1, defaultMeetingPoint: 'Acceso principal', notes: 'Combinación L1' },
  { name: 'Toesca', line: 'L2', lineName: 'Línea 2', commune: 'Santiago', latitude: -33.4109, longitude: -70.6168, sortOrder: 2, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Santa Ana', line: 'L2', lineName: 'Línea 2', commune: 'Santiago', latitude: -33.4140, longitude: -70.6105, sortOrder: 3, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Puente Cal y Canto', line: 'L2', lineName: 'Línea 2', commune: 'Santiago', latitude: -33.4178, longitude: -70.6031, sortOrder: 4, defaultMeetingPoint: 'Acceso principal', notes: 'Combinación L3' },
  { name: 'Patronato', line: 'L2', lineName: 'Línea 2', commune: 'Santiago', latitude: -33.4210, longitude: -70.5972, sortOrder: 5, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Cerro Blanco', line: 'L2', lineName: 'Línea 2', commune: 'Recoleta', latitude: -33.4243, longitude: -70.5913, sortOrder: 6, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Cementerios', line: 'L2', lineName: 'Línea 2', commune: 'Recoleta', latitude: -33.4278, longitude: -70.5853, sortOrder: 7, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Einstein', line: 'L2', lineName: 'Línea 2', commune: 'Recoleta', latitude: -33.4312, longitude: -70.5791, sortOrder: 8, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Dorsal', line: 'L2', lineName: 'Línea 2', commune: 'Recoleta', latitude: -33.4346, longitude: -70.5731, sortOrder: 9, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Zapadores', line: 'L2', lineName: 'Línea 2', commune: 'Recoleta', latitude: -33.4379, longitude: -70.5670, sortOrder: 10, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Vespucio Norte', line: 'L2', lineName: 'Línea 2', commune: 'Independencia', latitude: -33.4415, longitude: -70.5606, sortOrder: 11, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Plaza Quilicura', line: 'L2', lineName: 'Línea 2', commune: 'Quilicura', latitude: -33.4450, longitude: -70.5543, sortOrder: 12, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Lo Cruzat', line: 'L2', lineName: 'Línea 2', commune: 'Quilicura', latitude: -33.4485, longitude: -70.5480, sortOrder: 13, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Ferrocarril', line: 'L2', lineName: 'Línea 2', commune: 'Quilicura', latitude: -33.4520, longitude: -70.5418, sortOrder: 14, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Los Libertadores', line: 'L2', lineName: 'Línea 2', commune: 'Quilicura', latitude: -33.4555, longitude: -70.5355, sortOrder: 15, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Cardenal Caro', line: 'L2', lineName: 'Línea 2', commune: 'Renca', latitude: -33.4590, longitude: -70.5292, sortOrder: 16, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Vivaceta', line: 'L2', lineName: 'Línea 2', commune: 'Renca', latitude: -33.4625, longitude: -70.5230, sortOrder: 17, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Conchalí', line: 'L2', lineName: 'Línea 2', commune: 'Conchalí', latitude: -33.4660, longitude: -70.5167, sortOrder: 18, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Plaza Chacabuco', line: 'L2', lineName: 'Línea 2', commune: 'Conchalí', latitude: -33.4695, longitude: -70.5105, sortOrder: 19, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Hospitales', line: 'L2', lineName: 'Línea 2', commune: 'Conchalí', latitude: -33.4730, longitude: -70.5042, sortOrder: 20, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Puente Cal y Canto', line: 'L2', lineName: 'Línea 2', commune: 'Santiago', latitude: -33.4178, longitude: -70.6031, sortOrder: 21, defaultMeetingPoint: 'Acceso principal', notes: 'Combinación L3' },
  { name: 'Plaza de Armas', line: 'L2', lineName: 'Línea 2', commune: 'Santiago', latitude: -33.4164, longitude: -70.6073, sortOrder: 22, defaultMeetingPoint: 'Acceso principal', notes: 'Combinación L3' },
  { name: 'Metro de Maipú', line: 'L2', lineName: 'Línea 2', commune: 'Maipú', latitude: -33.4100, longitude: -70.6300, sortOrder: 23, defaultMeetingPoint: 'Acceso principal' },

  // ═══════════════════════════════════════════
  // LÍNEA 3 — Plaza de Armas → Fernando Castillo Velasco (18)
  // ═══════════════════════════════════════════
  { name: 'Plaza de Armas', line: 'L3', lineName: 'Línea 3', commune: 'Santiago', latitude: -33.4164, longitude: -70.6073, sortOrder: 1, defaultMeetingPoint: 'Acceso principal', notes: 'Combinación L2' },
  { name: 'Universidad de Chile', line: 'L3', lineName: 'Línea 3', commune: 'Santiago', latitude: -33.4027, longitude: -70.6113, sortOrder: 2, defaultMeetingPoint: 'Acceso principal', notes: 'Combinación L1' },
  { name: 'Parque Almagro', line: 'L3', lineName: 'Línea 3', commune: 'Santiago', latitude: -33.3980, longitude: -70.6155, sortOrder: 3, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Matta', line: 'L3', lineName: 'Línea 3', commune: 'Santiago', latitude: -33.3930, longitude: -70.6195, sortOrder: 4, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Irarrázaval', line: 'L3', lineName: 'Línea 3', commune: 'San Miguel', latitude: -33.3880, longitude: -70.6235, sortOrder: 5, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Monseñor Eyzaguirre', line: 'L3', lineName: 'Línea 3', commune: 'Ñuñoa', latitude: -33.3830, longitude: -70.6275, sortOrder: 6, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Ñuñoa', line: 'L3', lineName: 'Línea 3', commune: 'Ñuñoa', latitude: -33.3780, longitude: -70.6315, sortOrder: 7, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Chile-España', line: 'L3', lineName: 'Línea 3', commune: 'Ñuñoa', latitude: -33.3730, longitude: -70.6355, sortOrder: 8, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Villa Frei', line: 'L3', lineName: 'Línea 3', commune: 'Ñuñoa', latitude: -33.3680, longitude: -70.6395, sortOrder: 9, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Plaza Egaña', line: 'L3', lineName: 'Línea 3', commune: 'Ñuñoa', latitude: -33.3630, longitude: -70.6435, sortOrder: 10, defaultMeetingPoint: 'Acceso principal', notes: 'Combinación L4' },
  { name: 'Fernando Castillo Velasco', line: 'L3', lineName: 'Línea 3', commune: 'La Reina', latitude: -33.3580, longitude: -70.6475, sortOrder: 11, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Oña', line: 'L3', lineName: 'Línea 3', commune: 'La Reina', latitude: -33.3530, longitude: -70.6515, sortOrder: 12, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Grecia', line: 'L3', lineName: 'Línea 3', commune: 'La Reina', latitude: -33.3480, longitude: -70.6555, sortOrder: 13, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Los Américas', line: 'L3', lineName: 'Línea 3', commune: 'La Reina', latitude: -33.3430, longitude: -70.6595, sortOrder: 14, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Armenia', line: 'L3', lineName: 'Línea 3', commune: 'La Reina', latitude: -33.3380, longitude: -70.6635, sortOrder: 15, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Plaza de Maipú', line: 'L3', lineName: 'Línea 3', commune: 'Maipú', latitude: -33.3330, longitude: -70.6675, sortOrder: 16, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Santiago Bueras', line: 'L3', lineName: 'Línea 3', commune: 'Maipú', latitude: -33.3280, longitude: -70.6715, sortOrder: 17, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Del Sol', line: 'L3', lineName: 'Línea 3', commune: 'Maipú', latitude: -33.3230, longitude: -70.6755, sortOrder: 18, defaultMeetingPoint: 'Acceso principal' },

  // ═══════════════════════════════════════════
  // LÍNEA 4 — Tobalaba → Plaza de Puente Alto (23)
  // ═══════════════════════════════════════════
  { name: 'Tobalaba', line: 'L4', lineName: 'Línea 4', commune: 'Las Condes', latitude: -33.3795, longitude: -70.5623, sortOrder: 1, defaultMeetingPoint: 'Acceso principal', notes: 'Combinación L1' },
  { name: 'Cristóbal Colón', line: 'L4', lineName: 'Línea 4', commune: 'Providencia', latitude: -33.3750, longitude: -70.5560, sortOrder: 2, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Francisco Bilbao', line: 'L4', lineName: 'Línea 4', commune: 'Providencia', latitude: -33.3705, longitude: -70.5498, sortOrder: 3, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Santa Isabel', line: 'L4', lineName: 'Línea 4', commune: 'Santiago', latitude: -33.3660, longitude: -70.5435, sortOrder: 4, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Parque Bustamante', line: 'L4', lineName: 'Línea 4', commune: 'Santiago', latitude: -33.3615, longitude: -70.5373, sortOrder: 5, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Franklin', line: 'L4', lineName: 'Línea 4', commune: 'San Miguel', latitude: -33.3570, longitude: -70.5310, sortOrder: 6, defaultMeetingPoint: 'Acceso principal' },
  { name: 'San Miguel', line: 'L4', lineName: 'Línea 4', commune: 'San Miguel', latitude: -33.3525, longitude: -70.5248, sortOrder: 7, defaultMeetingPoint: 'Acceso principal' },
  { name: 'El Llano', line: 'L4', lineName: 'Línea 4', commune: 'San Miguel', latitude: -33.3480, longitude: -70.5185, sortOrder: 8, defaultMeetingPoint: 'Acceso principal' },
  { name: 'San Joaquín', line: 'L4', lineName: 'Línea 4', commune: 'San Joaquín', latitude: -33.3435, longitude: -70.5123, sortOrder: 9, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Larrain', line: 'L4', lineName: 'Línea 4', commune: 'La Florida', latitude: -33.3390, longitude: -70.5060, sortOrder: 10, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Miguel Cruchaga', line: 'L4', lineName: 'Línea 4', commune: 'La Florida', latitude: -33.3345, longitude: -70.4998, sortOrder: 11, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Metro de Maipú', line: 'L4', lineName: 'Línea 4', commune: 'Maipú', latitude: -33.4100, longitude: -70.6300, sortOrder: 12, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Lo Vial', line: 'L4', lineName: 'Línea 4', commune: 'La Florida', latitude: -33.3255, longitude: -70.4873, sortOrder: 13, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Departamental', line: 'L4', lineName: 'Línea 4', commune: 'La Florida', latitude: -33.3210, longitude: -70.4810, sortOrder: 14, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Ciudad del Niño', line: 'L4', lineName: 'Línea 4', commune: 'La Florida', latitude: -33.3165, longitude: -70.4748, sortOrder: 15, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Lo Ovalle', line: 'L4', lineName: 'Línea 4', commune: 'La Florida', latitude: -33.3120, longitude: -70.4685, sortOrder: 16, defaultMeetingPoint: 'Acceso principal' },
  { name: 'El Parrón', line: 'L4', lineName: 'Línea 4', commune: 'La Pintana', latitude: -33.3075, longitude: -70.4623, sortOrder: 17, defaultMeetingPoint: 'Acceso principal' },
  { name: 'La Cisterna', line: 'L4', lineName: 'Línea 4', commune: 'La Cisterna', latitude: -33.3030, longitude: -70.4560, sortOrder: 18, defaultMeetingPoint: 'Acceso principal' },
  { name: 'El Bosque', line: 'L4', lineName: 'Línea 4', commune: 'El Bosque', latitude: -33.2985, longitude: -70.4498, sortOrder: 19, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Observatorio', line: 'L4', lineName: 'Línea 4', commune: 'San Bernardo', latitude: -33.2940, longitude: -70.4435, sortOrder: 20, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Copa Lo Martínez', line: 'L4', lineName: 'Línea 4', commune: 'Puente Alto', latitude: -33.2895, longitude: -70.4373, sortOrder: 21, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Hospital El Pino', line: 'L4', lineName: 'Línea 4', commune: 'Puente Alto', latitude: -33.2850, longitude: -70.4310, sortOrder: 22, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Plaza de Puente Alto', line: 'L4', lineName: 'Línea 4', commune: 'Puente Alto', latitude: -33.2805, longitude: -70.4248, sortOrder: 23, defaultMeetingPoint: 'Acceso principal' },

  // ═══════════════════════════════════════════
  // LÍNEA 4A — Cerrillos → San Bernardo (5)
  // ═══════════════════════════════════════════
  { name: 'Cerrillos', line: 'L4A', lineName: 'Línea 4A', commune: 'Cerrillos', latitude: -33.4150, longitude: -70.6550, sortOrder: 1, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Lo Prado', line: 'L4A', lineName: 'Línea 4A', commune: 'Lo Prado', latitude: -33.4080, longitude: -70.6480, sortOrder: 2, defaultMeetingPoint: 'Acceso principal' },
  { name: 'San Bernardo', line: 'L4A', lineName: 'Línea 4A', commune: 'San Bernardo', latitude: -33.4010, longitude: -70.6410, sortOrder: 3, defaultMeetingPoint: 'Acceso principal' },
  { name: 'El Abrazo', line: 'L4A', lineName: 'Línea 4A', commune: 'San Bernardo', latitude: -33.3940, longitude: -70.6340, sortOrder: 4, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Monte Tabor', line: 'L4A', lineName: 'Línea 4A', commune: 'San Bernardo', latitude: -33.3870, longitude: -70.6270, sortOrder: 5, defaultMeetingPoint: 'Acceso principal' },

  // ═══════════════════════════════════════════
  // LÍNEA 5 — Plaza de Maipú → San Joaquín (26)
  // ═══════════════════════════════════════════
  { name: 'Plaza de Maipú', line: 'L5', lineName: 'Línea 5', commune: 'Maipú', latitude: -33.4130, longitude: -70.6600, sortOrder: 1, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Santiago Bueras', line: 'L5', lineName: 'Línea 5', commune: 'Maipú', latitude: -33.4100, longitude: -70.6530, sortOrder: 2, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Del Sol', line: 'L5', lineName: 'Línea 5', commune: 'Maipú', latitude: -33.4070, longitude: -70.6460, sortOrder: 3, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Monte Tabor', line: 'L5', lineName: 'Línea 5', commune: 'Maipú', latitude: -33.4040, longitude: -70.6390, sortOrder: 4, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Las Parcelas', line: 'L5', lineName: 'Línea 5', commune: 'Maipú', latitude: -33.4010, longitude: -70.6320, sortOrder: 5, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Jamilla', line: 'L5', lineName: 'Línea 5', commune: 'Maipú', latitude: -33.3980, longitude: -70.6250, sortOrder: 6, defaultMeetingPoint: 'Acceso principal' },
  { name: 'San Ramón', line: 'L5', lineName: 'Línea 5', commune: 'San Ramón', latitude: -33.3950, longitude: -70.6180, sortOrder: 7, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Santa Rosa', line: 'L5', lineName: 'Línea 5', commune: 'San Ramón', latitude: -33.3920, longitude: -70.6110, sortOrder: 8, defaultMeetingPoint: 'Acceso principal' },
  { name: 'La Granja', line: 'L5', lineName: 'Línea 5', commune: 'La Granja', latitude: -33.3890, longitude: -70.6040, sortOrder: 9, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Santa Emily', line: 'L5', lineName: 'Línea 5', commune: 'La Granja', latitude: -33.3860, longitude: -70.5970, sortOrder: 10, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Lo Prado', line: 'L5', lineName: 'Línea 5', commune: 'La Pintana', latitude: -33.3830, longitude: -70.5900, sortOrder: 11, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Plaza de Maipú', line: 'L5', lineName: 'Línea 5', commune: 'Maipú', latitude: -33.4130, longitude: -70.6600, sortOrder: 12, defaultMeetingPoint: 'Acceso principal' },
  { name: 'San Pablo', line: 'L5', lineName: 'Línea 5', commune: 'Quinta Normal', latitude: -33.4386, longitude: -70.6914, sortOrder: 13, defaultMeetingPoint: 'Acceso principal', notes: 'Combinación L1' },
  { name: 'Pajaritos', line: 'L5', lineName: 'Línea 5', commune: 'Cerrillos', latitude: -33.4313, longitude: -70.6748, sortOrder: 14, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Las Rejas', line: 'L5', lineName: 'Línea 5', commune: 'Estación Central', latitude: -33.4280, longitude: -70.6670, sortOrder: 15, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Ecuador', line: 'L5', lineName: 'Línea 5', commune: 'Estación Central', latitude: -33.4254, longitude: -70.6613, sortOrder: 16, defaultMeetingPoint: 'Acceso principal' },
  { name: 'San Alberto Hurtado', line: 'L5', lineName: 'Línea 5', commune: 'Estación Central', latitude: -33.4221, longitude: -70.6545, sortOrder: 17, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Universidad de Santiago', line: 'L5', lineName: 'Línea 5', commune: 'Estación Central', latitude: -33.4191, longitude: -70.6488, sortOrder: 18, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Estación Central', line: 'L5', lineName: 'Línea 5', commune: 'Estación Central', latitude: -33.4168, longitude: -70.6427, sortOrder: 19, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Unión Latinoamericana', line: 'L5', lineName: 'Línea 5', commune: 'Santiago', latitude: -33.4141, longitude: -70.6372, sortOrder: 20, defaultMeetingPoint: 'Acceso principal' },
  { name: 'República', line: 'L5', lineName: 'Línea 5', commune: 'Santiago', latitude: -33.4116, longitude: -70.6315, sortOrder: 21, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Baquedano', line: 'L5', lineName: 'Línea 5', commune: 'Providencia', latitude: -33.3943, longitude: -70.5935, sortOrder: 22, defaultMeetingPoint: 'Acceso principal', notes: 'Combinación L1' },
  { name: 'Irarrázaval', line: 'L5', lineName: 'Línea 5', commune: 'Ñuñoa', latitude: -33.3880, longitude: -70.6235, sortOrder: 23, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Ñuñoa', line: 'L5', lineName: 'Línea 5', commune: 'Ñuñoa', latitude: -33.3780, longitude: -70.6315, sortOrder: 24, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Chile-España', line: 'L5', lineName: 'Línea 5', commune: 'Ñuñoa', latitude: -33.3730, longitude: -70.6355, sortOrder: 25, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Villa Frei', line: 'L5', lineName: 'Línea 5', commune: 'Ñuñoa', latitude: -33.3680, longitude: -70.6395, sortOrder: 26, defaultMeetingPoint: 'Acceso principal' },

  // ═══════════════════════════════════════════
  // LÍNEA 6 — Los Leones → Cerrillos (10)
  // ═══════════════════════════════════════════
  { name: 'Los Leones', line: 'L6', lineName: 'Línea 6', commune: 'Providencia', latitude: -33.3825, longitude: -70.5688, sortOrder: 1, defaultMeetingPoint: 'Acceso principal', notes: 'Combinación L1' },
  { name: 'Pedro de Valdivia', line: 'L6', lineName: 'Línea 6', commune: 'Providencia', latitude: -33.3853, longitude: -70.5749, sortOrder: 2, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Manuel Montt', line: 'L6', lineName: 'Línea 6', commune: 'Providencia', latitude: -33.3880, longitude: -70.5807, sortOrder: 3, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Baquedano', line: 'L6', lineName: 'Línea 6', commune: 'Providencia', latitude: -33.3943, longitude: -70.5935, sortOrder: 4, defaultMeetingPoint: 'Acceso principal', notes: 'Combinación L1' },
  { name: 'Ñuñoa', line: 'L6', lineName: 'Línea 6', commune: 'Ñuñoa', latitude: -33.3780, longitude: -70.6315, sortOrder: 5, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Estadio Nacional', line: 'L6', lineName: 'Línea 6', commune: 'Santiago', latitude: -33.3720, longitude: -70.6100, sortOrder: 6, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Ñuble', line: 'L6', lineName: 'Línea 6', commune: 'Santiago', latitude: -33.3660, longitude: -70.6040, sortOrder: 7, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Franklin', line: 'L6', lineName: 'Línea 6', commune: 'San Miguel', latitude: -33.3570, longitude: -70.5310, sortOrder: 8, defaultMeetingPoint: 'Acceso principal' },
  { name: 'San Miguel', line: 'L6', lineName: 'Línea 6', commune: 'San Miguel', latitude: -33.3525, longitude: -70.5248, sortOrder: 9, defaultMeetingPoint: 'Acceso principal' },
  { name: 'Cerrillos', line: 'L6', lineName: 'Línea 6', commune: 'Cerrillos', latitude: -33.4150, longitude: -70.6550, sortOrder: 10, defaultMeetingPoint: 'Acceso principal' },
];
