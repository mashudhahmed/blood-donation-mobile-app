import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEmail, IsOptional, IsArray } from 'class-validator';

export class CreateStaffDto {
  @ApiProperty({ example: 'Kazi Sumon' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'sumon.lab@redcrescent.org.bd' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+8801933445566' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ example: 'Senior Hematology Lab Tech' })
  @IsNotEmpty()
  @IsString()
  position: string;

  @ApiProperty({ example: 'Component Separation & Testing', required: false })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ example: 'StaffPass@2026', required: false })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ example: ['manage_inventory', 'record_donations'], required: false })
  @IsOptional()
  @IsArray()
  permissions?: string[];
}
