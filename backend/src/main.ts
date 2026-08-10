import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cors from 'cors';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
  console.log(`🚀 NutriFit API running on http://localhost:${port}/api`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}
bootstrap();
