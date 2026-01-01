import { IsString, IsNotEmpty } from 'class-validator';

export class CreateBloodRequestDto {
  @IsString()
  @IsNotEmpty()
  bloodGroup: string;

  @IsString()
  @IsNotEmpty()
  district: string;

  @IsString()
  @IsNotEmpty()
  patientName: string;
}
