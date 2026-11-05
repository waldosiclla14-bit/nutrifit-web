import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const MAX_PATH = 300;
const MAX_UA = 180;

/**
 * Normaliza un valor para que no rompa la linea de log:
 * elimina saltos de linea (inyeccion de logs), recorta y deja '-' si viene vacio.
 */
function clean(value: unknown, max: number): string {
  return (
    String(value ?? '')
      .replace(/[\r\n\t]+/g, ' ')
      .trim()
      .slice(0, max) || '-'
  );
}

/**
 * Logger de peticiones **opt-in**: solo se registra si `LOG_REQUESTS=true`.
 *
 * Deja una linea por peticion terminada: metodo, ruta, estado, duracion, IP y
 * User-Agent. **No** registra query string ni cuerpo, porque pueden llevar
 * tokens o datos personales.
 *
 * La IP es un dato personal: se registra solo mientras se investiga quien
 * mantiene despierta la instancia, y la variable debe quitarse despues.
 */
export function requestLogger(
  write: (line: string) => void = (line) => new Logger('HTTP').log(line),
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startedAt = Date.now();
    res.on('finish', () => {
      const method = clean(req.method, 12);
      const path = clean(req.path, MAX_PATH);
      const ip = clean(req.ip || req.socket?.remoteAddress, 64);
      const ua = clean(req.headers['user-agent'], MAX_UA);
      write(`${method} ${path} ${res.statusCode} ${Date.now() - startedAt}ms ip=${ip} ua="${ua}"`);
    });
    next();
  };
}
