import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEmail, IsOptional, IsArray } from 'class-validator';

export class CreateStaffDto {
  @ApiProperty({ example: 'Dr. Kamal Hossain' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'kamal.icu@dmc.edu.bd' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+8801711223344' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ example: 'ICU On-Duty Doctor' })
  @IsNotEmpty()
  @IsString()
  position: string;

  @ApiProperty({ example: 'Intensive Care Unit', required: false })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ example: 'StaffPass@2026', required: false })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ example: ['create_requisition', 'view_donors'], required: false })
  @IsOptional()
  @IsArray()
  permissions?: string[];
}
