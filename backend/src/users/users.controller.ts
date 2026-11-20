import { Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { readJsonBody } from '../common/decorators/raw-body.decorator';
import { AuthService } from '../auth/auth.service';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UsersController {
  constructor(
    private usersService: UsersService,
    private authService: AuthService,
  ) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  async create(@Req() req: any) {
    const body = await readJsonBody(req);
    return this.usersService.create(body, req.user?.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  /**
   * Asigna o resetea el PIN de un repartidor. Solo ADMIN: el repartidor no
   * puede auto-asignarse credenciales de acceso.
   */
  @Patch(':id/pin')
  async setPin(@Param('id') id: string, @Req() req: any) {
    const body = await readJsonBody(req);
    return this.authService.setPin(id, body?.pin);
  }

  @Delete(':id/pin')
  async clearPin(@Param('id') id: string) {
    return this.authService.clearPin(id);
  }
}
