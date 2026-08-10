import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { RolesGuard } from '../auth/roles.guard';
import { AuditController } from './audit.controller';

@Module({
  controllers: [AuditController],
  providers: [AuditService, RolesGuard],
})
export class AuditModule {}
