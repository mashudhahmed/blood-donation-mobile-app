import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { BloodCompatibilityService } from '../blood/blood-compatibility.service';

interface EligibleDonor {
  uid: string;
  fcmToken: string;
  name: string;
  bloodGroup: string;
  district: string;
  phone: string;
}

@Injectable()
export class DonorMatchingService {
  constructor(
    private firebaseService: FirebaseService,
    private bloodCompatibility: BloodCompatibilityService
  ) {}

  // Check if donor is eligible (≥ 90 days since last donation)
  private isEligibleByDate(lastDonationTimestamp: number): boolean {
    if (!lastDonationTimestamp || lastDonationTimestamp === 0) {
      return true; // Never donated
    }
    
    const ninetyDaysInMillis = 90 * 24 * 60 * 60 * 1000;
    const timeSinceLastDonation = Date.now() - lastDonationTimestamp;
    
    return timeSinceLastDonation >= ninetyDaysInMillis;
  }

  // Find eligible donors for a blood request
  async findEligibleDonors(request: {
    bloodGroup: string;  // Required blood type
    district: string;    // Required district
    urgency?: 'normal' | 'urgent' | 'critical';
  }): Promise<EligibleDonor[]> {
    try {
      const firestore = this.firebaseService.getFirestore();
      
      // 1. Get compatible blood types
      const compatibleBloodTypes = this.bloodCompatibility.getCompatibleDonors(request.bloodGroup);
      
      if (compatibleBloodTypes.length === 0) {
        return [];
      }

      // 2. Query donors by district AND blood type
      const donorsSnapshot = await firestore
        .collection('donors')
        .where('district', '==', request.district)
        .where('bloodGroup', 'in', compatibleBloodTypes)
        .get();

      const eligibleDonors: EligibleDonor[] = [];

      // 3. Filter by eligibility (90+ days)
      donorsSnapshot.forEach(doc => {
        const donor = doc.data();
        
        // Check if donor has FCM token
        if (!donor.fcmToken || donor.fcmToken.length < 20) {
          return;
        }

        // Check eligibility (90+ days since last donation)
        const lastDonationDate = donor.lastDonationDate || 0;
        const isEligible = this.isEligibleByDate(lastDonationDate);
        
        if (!isEligible) {
          return;
        }

        // Check if donor is available
        if (donor.isAvailable === false) {
          return;
        }

        eligibleDonors.push({
          uid: doc.id,
          fcmToken: donor.fcmToken,
          name: donor.name || 'Anonymous Donor',
          bloodGroup: donor.bloodGroup,
          district: donor.district,
          phone: donor.phone || ''
        });
      });

      return eligibleDonors;

    } catch (error) {
      console.error('Error finding eligible donors:', error);
      throw error;
    }
  }

  // Count eligible donors (for statistics)
  async countEligibleDonors(district: string, bloodGroup: string): Promise<number> {
    const eligibleDonors = await this.findEligibleDonors({ district, bloodGroup });
    return eligibleDonors.length;
  }
}