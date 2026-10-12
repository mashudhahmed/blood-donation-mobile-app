import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsOptional, IsIn } from 'class-validator';

export class CreateRequisitionDto {
  @ApiProperty({ example: 'Dhaka Medical College Hospital' })
  @IsOptional()
  @IsString()
  hospitalName?: string;

  @ApiProperty({ example: 'O+' })
  @IsNotEmpty()
  @IsString()
  @IsIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
  bloodGroup: string;

  @ApiProperty({ example: 2 })
  @IsNotEmpty()
  @IsNumber()
  units: number;

  @ApiProperty({ example: 'urgent', enum: ['normal', 'urgent', 'critical'] })
  @IsNotEmpty()
  @IsString()
  urgency: string;

  @ApiProperty({ example: 'Kamal Hossain' })
  @IsNotEmpty()
  @IsString()
  patientName: string;

  @ApiProperty({ example: 'ICU - Bed 14' })
  @IsOptional()
  @IsString()
  wardOrDepartment?: string;

  @ApiProperty({ example: 'Dhaka' })
  @IsNotEmpty()
  @IsString()
  district: string;

  @ApiProperty({ example: '+8801711000000' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiProperty({ example: 'Severe anemia following emergency surgery' })
  @IsOptional()
  @IsString()
  medicalReason?: string;

  @ApiProperty({ example: 'Please send donors directly to Room 402' })
  @IsOptional()
  @IsString()
  notes?: string;
}
