import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, ExceptionFilter } from '@nestjs/common';
import cors from 'cors';
import helmet from 'helmet';
import { AppModule } from './app.module';

class FatalFilter implements ExceptionFilter {
  catch(exception: unknown) {
    Logger.error(
      `Bootstrap fatal: ${exception instanceof Error ? exception.stack : String(exception)}`,
      'Bootstrap',
    );
  }
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
    const app = await NestFactory.create(AppModule, {
      bufferLogs: true,
    });
    app.useGlobalFilters(new FatalFilter());

    const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,https://nutrifit-web-nu.vercel.app')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    app.use(helmet());
    app.use(
      cors({
        origin: (origin, callback) => {
          if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
          return callback(new Error('Origen no permitido por CORS'));
        },
        credentials: false,
      }),
    );
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api');

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
