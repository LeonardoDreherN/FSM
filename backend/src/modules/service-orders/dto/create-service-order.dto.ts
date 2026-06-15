import {
  IsString, IsOptional, IsIn, IsDateString,
  IsNumber, Min, Max, IsUUID, IsEmail,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateServiceOrderDto {
  @ApiProperty()
  @IsString()
  clientName: string;

  @ApiProperty({ example: '+5548999990000' })
  @IsString()
  clientPhone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  clientEmail?: string;

  @ApiProperty()
  @IsString()
  address: string;

  @ApiProperty({ description: 'Latitude', example: -27.5950 })
  @IsNumber()
  @Type(() => Number)
  lat: number;

  @ApiProperty({ description: 'Longitude', example: -48.5480 })
  @IsNumber()
  @Type(() => Number)
  lng: number;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high', 'emergency'] })
  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'emergency'])
  priority?: string = 'medium';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 60, description: 'Duração estimada em minutos' })
  @IsNumber()
  @Min(5)
  @Max(480)
  @Type(() => Number)
  estimatedDurationMinutes: number;

  @ApiProperty({ example: '2026-06-16T08:00:00Z' })
  @IsDateString()
  timeWindowStart: string;

  @ApiProperty({ example: '2026-06-16T12:00:00Z' })
  @IsDateString()
  timeWindowEnd: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  technicianId?: string;
}
