import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Donor extends Document {

  @Prop({ required: true })
  bloodGroup: string;

  @Prop({ required: true })
  district: string;

  @Prop()
  lastDonationDate?: Date; // nullable = never donated

  @Prop({ required: true })
  fcmToken: string;
}

export const DonorSchema = SchemaFactory.createForClass(Donor);
