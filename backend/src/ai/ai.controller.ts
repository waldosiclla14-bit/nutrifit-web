import { BadRequestException, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { readJsonBody } from '../common/decorators/raw-body.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AiService, ChatHistoryItem } from './ai.service';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('chat')
  @Roles(Role.ADMIN)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async chat(@Req() req: Request) {
    const body = await readJsonBody(req);
    const message = String(body?.message || '').trim();
    if (!message) throw new BadRequestException('Mensaje vacío');
    const history: ChatHistoryItem[] = Array.isArray(body?.history)
      ? body.history
          .filter((h: any) => h && typeof h.text === 'string')
          .slice(-10)
          .map((h: any) => ({ role: h.role === 'model' ? 'model' : 'user', text: String(h.text).slice(0, 500) }))
      : [];
    return this.aiService.chat(message, history);
  }
}
