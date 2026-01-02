import { Injectable, Logger } from '@nestjs/common';
import { DonorService } from '../donor/donor.service';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class BloodRequestService {
  private readonly logger = new Logger(BloodRequestService.name);

  constructor(
    private donorService: DonorService,
    private firebaseService: FirebaseService,
  ) {}

  async createRequest(request: any) {
    const donors = await this.donorService.findEligibleDonors(
      request.bloodGroup,
      request.district,
    );

    const tokens = donors.map(d => d.fcmToken).filter(Boolean);

    if (tokens.length > 0) {
      await this.firebaseService.sendToMultipleDevices(
        tokens,
        'Urgent Blood Needed',
        `${request.bloodGroup} blood required in ${request.district}`
      );
    }

    this.logger.log(
      `Blood request created & notified ${tokens.length} donors`,
    );

    return {
      success: true,
      notifiedDonors: tokens.length,
    };
  }
}
