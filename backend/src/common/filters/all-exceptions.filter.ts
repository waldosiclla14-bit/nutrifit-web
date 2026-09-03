import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = 500;
    let message: string;
    let extra: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any)?.message || exception.message;
      if (Array.isArray(message)) message = message.join(', ');
    } else if (exception instanceof Error) {
      message = exception.message;
      const prisma = exception as any;
      // Log Prisma details internally but NEVER expose to client
      if (prisma.code) {
        extra = { prismaCode: prisma.code, meta: prisma.meta };
      }
      this.logger.error(
        `[${request.method} ${request.url}] ${exception.message}\n${JSON.stringify(extra || '')}\n${exception.stack || ''}`,
      );
    } else {
      message = String(exception);
      this.logger.error(`[${request.method} ${request.url}] ${message}`);
    }

    const body: Record<string, unknown> = {
      statusCode: status,
      message: message || 'Error interno del servidor',
      timestamp: new Date().toISOString(),
      path: request.url,
    };
    // Never expose internal details (Prisma codes, meta) to client

    response.status(status).json(body);
  }
}
