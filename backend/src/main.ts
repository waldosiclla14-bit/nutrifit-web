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

class FatalFilter implements ExceptionFilter {
  catch(exception: unknown) {
    Logger.error(
      `Bootstrap fatal: ${exception instanceof Error ? exception.stack : String(exception)}`,
      'Bootstrap',
    );
  }
}

// The built-in express.json() body parser HANGS on JSON POSTs in this runtime
// (content-length / transfer-encoding mismatch upstream causes it to wait for
// bytes that never arrive). This reader consumes the raw stream with
// Buffer.concat and parses on 'end', ignoring content-length. Proven working.
function rawJsonBodyParser(req: any, _res: any, next: any) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }
  const ct = String(req.headers['content-type'] || '').toLowerCase();
  if (!ct.includes('application/json')) return next();

  let finished = false;
  const finish = (body: any) => {
    if (finished) return;
    finished = true;
    req.body = body;
    next();
  };

  const chunks: Buffer[] = [];
  let size = 0;
  const limit = 5 * 1024 * 1024;
  req.on('data', (chunk: Buffer) => {
    if (finished) return;
    chunks.push(chunk);
    size += chunk.length;
    if (size > limit) {
      req.destroy();
      finish({});
    }
  });
  req.on('end', () => {
    try {
      const raw = Buffer.concat(chunks).toString('utf8');
      finish(raw ? JSON.parse(raw) : {});
    } catch {
      finish({});
    }
  });
  req.on('error', () => finish(req.body || {}));
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

    app.use(rawJsonBodyParser);
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
