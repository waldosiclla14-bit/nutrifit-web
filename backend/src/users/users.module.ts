import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { RolesGuard } from '../auth/roles.guard';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController],
  providers: [UsersService, RolesGuard],
})
export class UsersModule {}
