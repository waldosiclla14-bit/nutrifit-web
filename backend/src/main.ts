import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cors from 'cors';
import helmet from 'helmet';
import { urlencoded } from 'express';
import { AppModule } from './app.module';

// JSON bodies are read inside each handler via readJsonBody() from the raw
// request stream. The built-in express.json() body parser HANGS on JSON POSTs
// in this runtime, so bodyParser is disabled (false) and no global JSON
// middleware parses the body. urlencoded is kept for form posts.
// (A no-op stream prime is NOT needed: attaching a 'data' listener on a Node
//  http.IncomingMessage auto-resumes the stream inside the handler, which is
//  the phase where the body is reliably delivered here.)
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
    );
  });

  try {
    const app = await NestFactory.create(AppModule, { bodyParser: false });

    app.use(urlencoded({ extended: true, limit: '5mb' }));
    app.use(helmet());
    (app as any).set('trust proxy', 1);
    const corsOrigins = (process.env.CORS_ORIGINS || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    app.use(
      cors({
        origin: corsOrigins.length > 0 ? corsOrigins : true,
        credentials: true,
      }),
    );
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
    );
    throw err;
  }
}
bootstrap();
