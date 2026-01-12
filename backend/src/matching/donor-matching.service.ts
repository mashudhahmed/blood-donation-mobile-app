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
          .where('notificationEnabled', '==', true)
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
          
          if (seenIds.has(doc.id)) return;
          seenIds.add(doc.id);

          // Parse donation date
          const lastDonationDate = this.parseDonationDate(donorData);
          
          // Check eligibility based on 90-day rule
          let isEligible = true;
          let daysSinceLastDonation = 0;

          if (lastDonationDate) {
            try {
              const lastDonation = lastDonationDate instanceof Date 
                ? lastDonationDate 
                : new Date(lastDonationDate);
              
              const diffTime = now.getTime() - lastDonation.getTime();
              const diffDays = diffTime / (1000 * 60 * 60 * 24);
              
              isEligible = diffDays >= MIN_DAYS_BETWEEN_DONATIONS;
              daysSinceLastDonation = Math.floor(diffDays);
            } catch (error) {
              console.warn(`Error parsing donation date:`, error);
              isEligible = true;
            }
          }

          // ✅ COMPLETE DONOR OBJECT WITH ALL FIELDS
          const donor: Donor = {
            id: doc.id,
            userId: donorData.userId || doc.id,
            name: donorData.name || '',
            phone: donorData.phone || '',
            bloodGroup: donorData.bloodGroup || '',
            district: donorData.district || '',
            location: donorData.location || '',
            fcmToken: donorData.fcmToken || '',
            isAvailable: donorData.isAvailable === true,
            notificationEnabled: donorData.notificationEnabled === true,
            
            // ✅ BACKWARD COMPATIBILITY FIELDS
            isActive: donorData.isActive !== false,
            canDonate: donorData.canDonate !== false,
            hasFcmToken: donorData.hasFcmToken === true,
            
            // ✅ OPTIONAL FIELDS
            email: donorData.email,
            lastDonationDate: lastDonationDate ? lastDonationDate.getTime() : null,
            lastDonation: donorData.lastDonation,
            imageUrl: donorData.imageUrl,
            
            // ✅ COMPUTED PROPERTY
            daysSinceLastDonation: daysSinceLastDonation,
          };

          if (isEligible && donor.isAvailable && donor.notificationEnabled && donor.fcmToken) {
            allDonors.push(donor);
          }
        });
      });

      // SORT BY PRIORITY (FCM token first, then time since last donation)
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

  private parseDonationDate(donorData: any): Date | null {
    try {
      // 1. Check if lastDonationDate is a timestamp (from Android)
      if (typeof donorData.lastDonationDate === 'number' && donorData.lastDonationDate > 0) {
        return new Date(donorData.lastDonationDate);
      }
      
      // 2. Check if lastDonation is a string in "dd/MM/yyyy" format (from Android)
      if (donorData.lastDonation && typeof donorData.lastDonation === 'string') {
        const parts = donorData.lastDonation.split('/');
        if (parts.length === 3) {
          return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
      }
      
      // 3. Check Firebase Timestamp format
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