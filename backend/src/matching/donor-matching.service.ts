// src/matching/donor-matching.service.ts
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
  ): Promise<Donor[]> {
    try {
      const compatibleBloodTypes = 
        this.bloodCompatibilityService.getCompatibleDonors(bloodGroup);

      if (compatibleBloodTypes.length === 0) {
        return [];
      }

      const donorsRef = this.firebaseService.firestore.collection('donors');
      
      const promises = compatibleBloodTypes.map(bloodType => 
        donorsRef
          .where('bloodGroup', '==', bloodType)
          .where('district', '==', district)
          .where('isAvailable', '==', true)
          .where('isNotificationEnabled', '==', true)
          .get()
      );

      const snapshots = await Promise.all(promises);
      
      const allDonors: Donor[] = [];
      const now = new Date();
      const MIN_DAYS_BETWEEN_DONATIONS = 90;
      const seenIds = new Set<string>();

      snapshots.forEach(snapshot => {
        snapshot.docs.forEach(doc => {
          const donorData = doc.data();
          
          // ✅ MAP ALL FIELDS CORRECTLY
          const donor: Donor = {
            id: doc.id,
            userId: donorData.userId || doc.id,
            name: donorData.name || '',
            email: donorData.email || '',
            phone: donorData.phone || '',
            bloodGroup: donorData.bloodGroup || '',
            district: donorData.district || '',
            location: donorData.location || '',
            fcmToken: donorData.fcmToken || '',
            
            lastDonationDate: this.parseDonationDate(donorData),
            
            isAvailable: donorData.isAvailable !== false,
            isNotificationEnabled: donorData.isNotificationEnabled !== false,
            deviceId: donorData.deviceId,
            lastDonation: donorData.lastDonation,
            imageUrl: donorData.imageUrl,
            
            isActive: donorData.isAvailable !== false,
            canDonate: true,
            lastActive: donorData.lastActive,
            createdAt: donorData.createdAt,
            updatedAt: donorData.updatedAt,
            daysSinceLastDonation: 0,
          };

          if (seenIds.has(doc.id)) return;
          seenIds.add(doc.id);

          // CHECK ELIGIBILITY
          let isEligible = true;
          if (donor.lastDonationDate) {
            try {
              const lastDonation = donor.lastDonationDate instanceof Date 
                ? donor.lastDonationDate 
                : typeof donor.lastDonationDate === 'number'
                  ? new Date(donor.lastDonationDate)
                  : (donor.lastDonationDate as any).toDate 
                    ? (donor.lastDonationDate as any).toDate()
                    : new Date(donor.lastDonationDate as any);
              
              const diffTime = now.getTime() - lastDonation.getTime();
              const diffDays = diffTime / (1000 * 60 * 60 * 24);
              
              isEligible = diffDays >= MIN_DAYS_BETWEEN_DONATIONS;
              donor.daysSinceLastDonation = Math.floor(diffDays);
            } catch (error) {
              console.warn(`Error parsing donation date:`, error);
              isEligible = true;
            }
          }

          if (isEligible && donor.isAvailable && donor.isNotificationEnabled) {
            allDonors.push(donor);
          }
        });
      });

      // SORT BY PRIORITY
      allDonors.sort((a, b) => {
        const aHasToken = a.fcmToken ? 1 : 0;
        const bHasToken = b.fcmToken ? 1 : 0;
        if (bHasToken !== aHasToken) return bHasToken - aHasToken;
        
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

  private parseDonationDate(donorData: any): Date | number | null {
    try {
      if (typeof donorData.lastDonationDate === 'number') {
        return donorData.lastDonationDate;
      }
      
      if (donorData.lastDonation) {
        const parts = donorData.lastDonation.split('/');
        if (parts.length === 3) {
          return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
      }
      
      if (donorData.lastDonationDate && donorData.lastDonationDate.toDate) {
        return donorData.lastDonationDate.toDate();
      }
      
      return null;
    } catch (error) {
      console.warn('Error parsing donation date:', error);
      return null;
    }
  }
}