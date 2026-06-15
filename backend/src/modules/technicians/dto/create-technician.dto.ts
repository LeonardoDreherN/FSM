import { IsString, IsOptional, IsIn, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTechnicianDto {
  @ApiProperty()
  @IsString()
  @Length(2, 255)
  name: string;

  @ApiProperty({ example: '+5548999990000' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ enum: ['motorcycle', 'car', 'van', 'truck'] })
  @IsOptional()
  @IsIn(['motorcycle', 'car', 'van', 'truck'])
  vehicleType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  whatsappNumber?: string;
}
