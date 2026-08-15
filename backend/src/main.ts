import { NestFactory } from '@nestjs/core';
import {
  ValidationPipe,
  Logger,
  ExceptionFilter,
} from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cors from 'cors';
import helmet from 'helmet';
import { urlencoded } from 'express';
import { AppModule } from './app.module';
import { capturedReqs } from './reqcapture';

class FatalFilter implements ExceptionFilter {
  catch(exception: unknown) {
    Logger.error(
      `Bootstrap fatal: ${exception instanceof Error ? exception.stack : String(exception)}`,
      'Bootstrap',
    );
  }
}

// The default express.json() body parser was hanging indefinitely on
// `Content-Type: application/json` requests in this runtime, stalling every
// POST/PUT/PATCH (coupon validation, login, order creation). This reader
// consumes the raw stream itself and never blocks the request.
function safeJsonBodyParser(req: any, _res: any, next: any) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }
  const ct = String(req.headers['content-type'] || '').toLowerCase();
  if (!ct.includes('application/json')) return next();

  let data = '';
  let finished = false;
  const done = (err?: unknown) => {
    if (finished) return;
    finished = true;
    capturedReqs.push({
      ts: new Date().toISOString(),
      method: req.method,
      url: req.url,
      ct: ct,
      headers: req.headers,
      receivedLen: data.length,
      receivedHead: data.slice(0, 200),
    });
    if (capturedReqs.length > 15) capturedReqs.shift();
    if (err) {
      req.body = req.body || {};
      return next();
    }
    try {
      req.body = data ? JSON.parse(data) : {};
    } catch {
      req.body = {};
    }
    next();
  };

  req.on('data', (chunk: any) => {
    data += chunk.toString();
    if (data.length > 5 * 1024 * 1024) {
      (req as any).destroy?.();
      done(new Error('request body too large'));
    }
  });
  req.on('end', () => done());
  req.on('error', () => done(new Error('request body stream error')));
  // Hard safety net: never let a stalled stream block the request forever.
  setTimeout(() => done(), 10000);
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  logger.log(
    `Startup: NODE_ENV=${process.env.NODE_ENV || '(unset)'} PORT=${
      process.env.PORT || '(unset)'
    } DATABASE_URL=${process.env.DATABASE_URL ? 'present' : 'MISSING'} JWT_SECRET=${
      process.env.JWT_SECRET ? 'present' : 'MISSING'
    }`,
  );

  process.on('uncaughtException', (err) => {
    Logger.error(`uncaughtException: ${err && err.stack ? err.stack : err}`, 'Bootstrap');
    process.exit(1);
  });
  process.on('unhandledRejection', (reason: unknown) => {
    Logger.error(
      `unhandledRejection: ${reason instanceof Error ? reason.stack : String(reason)}`,
      'Bootstrap',
    );
  });

  try {
    const app = await NestFactory.create(AppModule, { bodyParser: false });
    app.useGlobalFilters(new FatalFilter());

    app.use(safeJsonBodyParser);
    app.use(urlencoded({ extended: true, limit: '5mb' }));
    app.use(helmet());
    app.use(cors({ origin: true, credentials: true }));
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api');

    const config = new DocumentBuilder()
      .setTitle('NutriFit ERP API')
      .setDescription('API completa para NutriFit — ERP + POS + Ecommerce')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    const port = process.env.PORT || 3001;
    await app.listen(port);
    logger.log(`Listening on http://0.0.0.0:${port}/api (health: /api/health)`);
  } catch (err) {
    logger.error(
      `Bootstrap failed: ${err instanceof Error ? err.stack : String(err)}`,
      'Bootstrap',
    );
    throw err;
  }
}
bootstrap();
