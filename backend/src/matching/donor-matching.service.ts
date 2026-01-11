import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { BloodCompatibilityService } from '../blood/blood-compatibility.service';
import { Donor } from '../types/donor.interface';

@Injectable()
export class DonorMatchingService {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly bloodCompatibilityService: BloodCompatibilityService,
  ) {}

  async findCompatibleDonors(
    bloodGroup: string,
    district: string,
    radiusKm: number = 50,
  ): Promise<Donor[]> { // Added return type
    try {
      // Get all compatible blood types
      const compatibleBloodTypes = this.bloodCompatibilityService
        .getCompatibleDonors(bloodGroup);

      if (compatibleBloodTypes.length === 0) {
        return [];
      }

      // Query donors with compatible blood types
      const donorsRef = this.firebaseService.firestore.collection('donors');
      
      const promises = compatibleBloodTypes.map(bloodType => 
        donorsRef
          .where('bloodGroup', '==', bloodType)
          .where('district', '==', district)
          .where('isActive', '==', true)
          .get()
      );

      const snapshots = await Promise.all(promises);
      
      // Combine results
      const allDonors: Donor[] = [];
      const now = new Date();
      const MIN_DAYS_BETWEEN_DONATIONS = 90;
      const seenIds = new Set<string>();

      snapshots.forEach(snapshot => {
        snapshot.docs.forEach(doc => {
          const donor = {
            id: doc.id,
            ...doc.data(),
          } as Donor;

          // Skip duplicates
          if (seenIds.has(doc.id)) return;
          seenIds.add(doc.id);

          // Check eligibility based on last donation
          let isEligible = true;
          if (donor.lastDonationDate) {
            try {
              const lastDonation = donor.lastDonationDate instanceof Date 
                ? donor.lastDonationDate 
                : (donor.lastDonationDate as any).toDate 
                  ? (donor.lastDonationDate as any).toDate()
                  : new Date(donor.lastDonationDate as any);
              
              const diffTime = now.getTime() - lastDonation.getTime();
              const diffDays = diffTime / (1000 * 60 * 60 * 24);
              
              isEligible = diffDays >= MIN_DAYS_BETWEEN_DONATIONS;
              
              // Add computed property
              donor.daysSinceLastDonation = Math.floor(diffDays);
            } catch (error) {
              console.warn(`Error parsing donation date for donor ${doc.id}:`, error);
              isEligible = true;
            }
          }

          // Check other eligibility criteria
          const isOverallEligible = isEligible && 
            (donor.canDonate !== false) && 
            (donor.isAvailable !== false);

          if (isOverallEligible) {
            allDonors.push(donor);
          }
        });
      });

      // Sort by priority
      allDonors.sort((a, b) => {
        // Priority 1: Donors with FCM tokens
        const aHasToken = a.fcmToken ? 1 : 0;
        const bHasToken = b.fcmToken ? 1 : 0;
        if (bHasToken !== aHasToken) return bHasToken - aHasToken;
        
        // Priority 2: Donors who haven't donated in longer time
        const aDays = a.daysSinceLastDonation || 365;
        const bDays = b.daysSinceLastDonation || 365;
        return bDays - aDays;
      });

      return allDonors;
    } catch (error) {
      console.error('Error finding compatible donors:', error);
      throw error;
    }
  }
}