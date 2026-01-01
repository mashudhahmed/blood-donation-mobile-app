import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { BloodRequestService } from './blood-request.service';
import { CreateBloodRequestDto } from './dto/create-blood-request.dto';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';

@Controller('blood-request')
export class BloodRequestController {
  constructor(private readonly service: BloodRequestService) {}

  @UseGuards(FirebaseAuthGuard)
  @Post()
  async create(
    @Body() dto: CreateBloodRequestDto,
    @Req() req,
  ) {
    return this.service.createRequest({
      ...dto,
      requestedBy: req.user.uid,
    });
  }
}
