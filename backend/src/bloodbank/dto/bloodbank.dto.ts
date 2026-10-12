import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsIn, IsOptional } from 'class-validator';

export class InventoryAdjustmentDto {
  @ApiProperty({ example: 'O+', enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] })
  @IsNotEmpty()
  @IsString()
  @IsIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
  bloodGroup: string;

  @ApiProperty({ example: 'INTAKE', enum: ['INTAKE', 'DISPATCH', 'EXPIRED'] })
  @IsNotEmpty()
  @IsString()
  @IsIn(['INTAKE', 'DISPATCH', 'EXPIRED'])
  type: 'INTAKE' | 'DISPATCH' | 'EXPIRED';

  @ApiProperty({ example: 4 })
  @IsNotEmpty()
  @IsNumber()
  units: number;

  @ApiProperty({ example: 'Voluntary mobile camp collection' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ example: 'BAG-2026-9912' })
  @IsOptional()
  @IsString()
  batchOrBagNumber?: string;
}

export class CreateDriveDto {
  @ApiProperty({ example: 'Dhaka University Youth Blood Donation Camp' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ example: 'Curzon Hall Premises, University of Dhaka' })
  @IsNotEmpty()
  @IsString()
  venue: string;

  @ApiProperty({ example: 'Dhaka' })
  @IsNotEmpty()
  @IsString()
  district: string;

  @ApiProperty({ example: '2026-10-25' })
  @IsNotEmpty()
  @IsString()
  startDate: string;

  @ApiProperty({ example: '2026-10-26' })
  @IsNotEmpty()
  @IsString()
  endDate: string;

  @ApiProperty({ example: 100 })
  @IsNotEmpty()
  @IsNumber()
  targetUnits: number;

  @ApiProperty({ example: '+8801712000000' })
  @IsNotEmpty()
  @IsString()
  contactPhone: string;
}
