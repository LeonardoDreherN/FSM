import {
  Controller, Get, Post, Patch, Body, Param,
  UseGuards, Request, Query, ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ServiceOrdersService } from './service-orders.service';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';

@ApiTags('Service Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('service-orders')
export class ServiceOrdersController {
  constructor(private readonly service: ServiceOrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Criar nova Ordem de Serviço' })
  create(@Request() req: any, @Body() dto: CreateServiceOrderDto) {
    return this.service.create(req.user.companyId, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'OSs do técnico autenticado' })
  getMyOrders(@Request() req: any, @Query('date') date?: string) {
    if (!req.user.technicianId) throw new ForbiddenException('Acesso restrito a técnicos');
    return this.service.findByTechnician(req.user.companyId, req.user.technicianId, date);
  }

  @Get()
  @ApiOperation({ summary: 'Listar OSs (filtrável por data)' })
  @ApiQuery({ name: 'date', required: false, example: '2026-06-16' })
  findAll(@Request() req: any, @Query('date') date?: string) {
    return this.service.findAll(req.user.companyId, date);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user.companyId, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Atualizar status da OS (aciona eventos de redespacho)' })
  updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.service.updateStatus(req.user.companyId, id, status);
  }
}
