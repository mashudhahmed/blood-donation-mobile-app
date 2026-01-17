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
    excludeUserId?: string,
  ): Promise<Donor[]> {
    try {
      console.log('🔍 Starting donor eligibility check...');
      console.log(`   Request: ${bloodGroup} blood in ${district}`);
      console.log(`   Excluding user: ${excludeUserId || 'none'}`);

      // Get compatible blood types
      const compatibleBloodTypes = this.bloodCompatibilityService.getCompatibleDonors(bloodGroup);
      console.log(`   Compatible blood types: ${compatibleBloodTypes.join(', ')}`);

      if (compatibleBloodTypes.length === 0) {
        console.log('❌ No compatible blood types found');
        return [];
      }

      const donorsRef = this.firebaseService.firestore.collection('donors');
      const now = new Date();
      const MIN_DAYS_BETWEEN_DONATIONS = 90;
      const allDonors: Donor[] = [];
      const seenIds = new Set<string>();

      // Query for each compatible blood type
      for (const bloodType of compatibleBloodTypes) {
        try {
          console.log(`   Querying donors with blood type: ${bloodType}`);
          
          // ✅ IMPORTANT: Query for ALL donors with isAvailable: true and hasFcmToken: true
          // This includes both logged-in AND logged-out donors
          const snapshot = await donorsRef
            .where('bloodGroup', '==', bloodType)
            .where('district', '==', district)
            .where('isAvailable', '==', true)        // ✅ User must be marked as available
            .where('hasFcmToken', '==', true)        // ✅ Must have valid FCM token
            .get();

          console.log(`   Found ${snapshot.size} available donors with ${bloodType} in ${district}`);

          snapshot.docs.forEach(doc => {
            try {
              const donorData = doc.data();
              
              // Skip duplicates
              if (seenIds.has(doc.id)) return;
              seenIds.add(doc.id);

              // ✅ FILTER 1: Exclude requester (same as before)
              if (excludeUserId && donorData.userId === excludeUserId) {
                console.log(`      ❌ Excluding requester: ${donorData.name || donorData.userId}`);
                return;
              }

              // ✅ FILTER 2: Check has valid FCM token (already in query, but double-check)
              if (!donorData.fcmToken || donorData.fcmToken.length < 20 || !donorData.fcmToken.includes(':')) {
                console.log(`      ❌ Excluding ${donorData.name || doc.id}: Invalid FCM token`);
                return;
              }

              // ✅ FILTER 3: Check required fields
              if (!donorData.name || !donorData.phone || !donorData.bloodGroup || !donorData.district) {
                console.log(`      ❌ Excluding ${doc.id}: Missing required fields`);
                return;
              }

              // ✅ FILTER 4: Check 90-day donation rule
              let isEligibleByTime = true;
              let daysSinceLastDonation = 0;
              const lastDonationDate = this.parseDonationDate(donorData);

              if (lastDonationDate) {
                try {
                  const lastDonation = lastDonationDate instanceof Date 
                    ? lastDonationDate 
                    : new Date(lastDonationDate);
                  
                  const diffTime = now.getTime() - lastDonation.getTime();
                  const diffDays = diffTime / (1000 * 60 * 60 * 24);
                  daysSinceLastDonation = Math.floor(diffDays);
                  
                  isEligibleByTime = diffDays >= MIN_DAYS_BETWEEN_DONATIONS;
                  
                  if (!isEligibleByTime) {
                    console.log(`      ❌ Excluding ${donorData.name || doc.id}: Donated ${daysSinceLastDonation} days ago (needs ${MIN_DAYS_BETWEEN_DONATIONS} days)`);
                    return;
                  }
                } catch (error) {
                  console.warn(`      ⚠ Error parsing donation date for ${donorData.userId}:`, error);
                }
              }

              // ✅ NEW: Check login status
              const isLoggedIn = donorData.isLoggedIn !== false; // Default to true if not set
              const status = isLoggedIn ? "✅ (Logged In)" : "👤 (Logged Out)";
              
              // ✅ FOR LOGGED-IN DONORS: Check notificationEnabled
              if (isLoggedIn && donorData.notificationEnabled !== true) {
                console.log(`      ❌ Excluding logged-in user ${donorData.name || doc.id}: Notifications disabled`);
                return;
              }
              
              // ✅ FOR LOGGED-OUT DONORS: Only check isAvailable (already true) and hasFcmToken (already true)

              // Create donor object
              const donor: Donor = {
                id: doc.id,
                userId: donorData.userId || doc.id,
                name: donorData.name || '',
                phone: donorData.phone || '',
                bloodGroup: donorData.bloodGroup || '',
                district: donorData.district || '',
                location: donorData.location || '',
                fcmToken: donorData.fcmToken || '',
                deviceId: donorData.deviceId || '',
                compoundTokenId: donorData.compoundTokenId || '',
                isAvailable: true, // Already filtered by query
                notificationEnabled: donorData.notificationEnabled === true,
                isActive: donorData.isActive !== false,
                canDonate: donorData.canDonate !== false,
                hasFcmToken: true, // Already filtered by query
                isLoggedIn: isLoggedIn, // ✅ Add login status
                email: donorData.email,
                lastDonationDate: lastDonationDate ? lastDonationDate.getTime() : null,
                lastDonation: donorData.lastDonation,
                imageUrl: donorData.imageUrl,
                daysSinceLastDonation,
              };

              allDonors.push(donor);
              console.log(`      ${status} Eligible: ${donor.name} (${donor.bloodGroup}) - ${daysSinceLastDonation} days since donation`);

            } catch (docError) {
              console.error(`      ❌ Error processing donor ${doc.id}:`, docError);
            }
          });

        } catch (queryError) {
          console.error(`   ❌ Error querying blood type ${bloodType}:`, queryError);
        }
      }

      console.log(`✅ Total eligible donors found: ${allDonors.length}`);
      console.log(`   - Logged-in: ${allDonors.filter(d => d.isLoggedIn).length}`);
      console.log(`   - Logged-out: ${allDonors.filter(d => !d.isLoggedIn).length}`);
      console.log(`   - All marked as available: ${allDonors.filter(d => d.isAvailable).length}`);

      // Sort donors: logged-in first, then by days since donation
      allDonors.sort((a, b) => {
        // Priority 1: Logged-in users first
        const aLoggedIn = a.isLoggedIn ? 1 : 0;
        const bLoggedIn = b.isLoggedIn ? 1 : 0;
        if (bLoggedIn !== aLoggedIn) return bLoggedIn - aLoggedIn;

        // Priority 2: Longer time since last donation
        const aDays = a.daysSinceLastDonation || 0;
        const bDays = b.daysSinceLastDonation || 0;
        return bDays - aDays;
      });

      return allDonors;

    } catch (error) {
      console.error('❌ Error in findCompatibleDonors:', error);
      throw error;
    }
  }

  private parseDonationDate(donorData: any): Date | null {
    try {
      // 1. Check timestamp number
      if (typeof donorData.lastDonationDate === 'number' && donorData.lastDonationDate > 0) {
        return new Date(donorData.lastDonationDate);
      }
      
      // 2. Check string in "dd/MM/yyyy" format
      if (donorData.lastDonation && typeof donorData.lastDonation === 'string') {
        const parts = donorData.lastDonation.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1; // Months are 0-indexed
          const year = parseInt(parts[2]);
          
          if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            return new Date(year, month, day);
          }
        }
      }
      
      // 3. Check Firebase Timestamp
      if (donorData.lastDonationDate && donorData.lastDonationDate.toDate) {
        return donorData.lastDonationDate.toDate();
      }
      
      // 4. Check timestamp field
      if (donorData.lastDonationTimestamp) {
        return new Date(donorData.lastDonationTimestamp);
      }
      
      return null;
    } catch (error) {
      console.warn('⚠ Error parsing donation date:', error);
      return null;
    }
  }
}