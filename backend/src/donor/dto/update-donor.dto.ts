import { IsBoolean, IsDateString, IsString } from 'class-validator';

export class UpdateDonorDto {
  @IsString()
  bloodGroup: string;

  @IsString()
  district: string;

  @IsDateString()
  lastDonationDate: string;

  @IsBoolean()
  isAvailable: boolean;

  @IsString()
  fcmToken: string;
}
