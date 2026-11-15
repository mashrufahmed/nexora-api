import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AdminService } from './admin.service.js';
import { CreateAdminDto } from './dto/create-admin.dto.js';
import { AdminBootstrapGuard } from './guards/admin-bootstrap.guard.js';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('bootstrap')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AdminBootstrapGuard)
  bootstrap(@Body() dto: CreateAdminDto) {
    return this.adminService.create(dto);
  }
}
