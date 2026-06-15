import {
  Controller, Get, Post, Patch, Body, Param, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TechniciansService } from './technicians.service';
import { CreateTechnicianDto } from './dto/create-technician.dto';

@ApiTags('Technicians')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('technicians')
export class TechniciansController {
  constructor(private readonly service: TechniciansService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar técnico' })
  create(@Request() req: any, @Body() dto: CreateTechnicianDto) {
    return this.service.create(req.user.companyId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar técnicos da empresa' })
  findAll(@Request() req: any) {
    return this.service.findAll(req.user.companyId);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user.companyId, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Atualizar status do técnico' })
  updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.service.updateStatus(req.user.companyId, id, status);
  }
}
