import { Injectable } from '@nestjs/common';
import admin from '../firebase/firebase.service';
import { BloodRequestDto } from './dto/blood-request.dto';

const DAYS_90 = 90 * 24 * 60 * 60 * 1000;

@Injectable()
export class BloodRequestService {

  isEligible(lastDonationMillis?: number): boolean {
    if (!lastDonationMillis) return true;
    return Date.now() - lastDonationMillis >= DAYS_90;
  }

  async notifyEligibleDonors(dto: BloodRequestDto) {
    const snapshot = await admin.firestore()
      .collection('users')
      .where('bloodGroup', '==', dto.bloodGroup)
      .where('district', '==', dto.district)
      .get();

    const tokens: string[] = [];

    snapshot.forEach(doc => {
      const user = doc.data();
      const lastDonation = user.lastDonationDate?.toMillis?.();

      if (
        user.fcmToken &&
        this.isEligible(lastDonation)
      ) {
        tokens.push(user.fcmToken);
      }
    });

    if (tokens.length === 0) {
      return { message: 'No eligible donors found' };
    }

    await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: 'Blood Needed Urgently',
        body: `${dto.bloodGroup} blood needed in ${dto.district}`,
      },
      data: {
        type: 'blood_request',
      },
    });

    return {
      message: 'Notifications sent',
      count: tokens.length,
    };
  }
}
