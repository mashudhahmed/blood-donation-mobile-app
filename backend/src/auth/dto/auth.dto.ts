import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../roles.decorator';

export class RegisterDto {
  @ApiProperty({ example: 'doctor@dmc.hospital.bd', description: 'Enterprise or official email' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'SecurePassword123!', description: 'Account password (min 6 chars)' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Dr. Rafiqul Islam', description: 'Full name of officer or doctor' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Dhaka Medical College Hospital', description: 'Healthcare organization / facility' })
  @IsString()
  @IsNotEmpty()
  organization: string;

  @ApiProperty({ enum: UserRole, example: UserRole.HOSPITAL, description: 'Role (ADMIN, HOSPITAL, BLOOD_BANK)' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const lower = value.toLowerCase().replace(/[\s_-]/g, '');
      if (lower === 'admin') return UserRole.ADMIN;
      if (lower === 'hospital') return UserRole.HOSPITAL;
      if (lower === 'bloodbank') return UserRole.BLOOD_BANK;
      if (lower === 'donor') return UserRole.DONOR;
    }
    return value;
  })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({ example: '+8801711223344', description: 'Contact phone number' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'Dhaka', description: 'Operating district' })
  @IsString()
  @IsNotEmpty()
  district: string;

  @ApiPropertyOptional({ example: 'DGHS-HOSP-2021-9921', description: 'Medical license or DGHS registration' })
  @IsString()
  @IsOptional()
  licenseNumber?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'admin@bloodlink.health.bd', description: 'Registered email' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'AdminPass2026!', description: 'Account password' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
