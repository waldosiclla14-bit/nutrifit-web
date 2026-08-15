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

// JSON bodies are read inside each handler via readJsonBody() from the raw
// request stream. The built-in express.json() body parser HANGS on JSON POSTs
// in this runtime, so bodyParser is disabled (false) and no global JSON
// middleware parses the body. A no-op middleware is registered so Express
// resumes the request stream (otherwise the raw body is never delivered to
// handlers). urlencoded is kept for form posts.
function primeRequestStream(_req: any, _res: any, next: any) {
  next();
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

    app.use(primeRequestStream);
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
