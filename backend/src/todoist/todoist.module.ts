import { Module } from '@nestjs/common';
import { TodoistService } from './todoist.service';
import { TodoistController } from './todoist.controller';

@Module({
  controllers: [TodoistController],
  providers: [TodoistService],
  exports: [TodoistService],
})
export class TodoistModule {}
