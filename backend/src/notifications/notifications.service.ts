// src/notifications/notifications.service.ts
import { Injectable } from '@nestjs/common';
import { FieldValue } from 'firebase-admin/firestore';
import { DonorMatchingService } from '../matching/donor-matching.service';
import { FirebaseService } from '../firebase/firebase.service';
import { Donor } from '../types/donor.interface';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly donorMatchingService: DonorMatchingService,
    private readonly firebaseService: FirebaseService,
  ) {}

  async updateDonorToken(
    donorId: string, 
    data: { 
      fcmToken: string; 
      deviceId?: string;
      deviceType?: string; 
      appVersion?: string; 
      updatedAt: Date; 
    }
  ) {
    const deviceId = data.deviceId || 'unknown';
    const compoundTokenId = `${donorId}_${deviceId}`;
    
    const update = {
      fcmToken: data.fcmToken,
      deviceId: deviceId,
      compoundTokenId: compoundTokenId,
      deviceType: data.deviceType,
      appVersion: data.appVersion,
      updatedAt: FieldValue.serverTimestamp(),
      isAvailable: true,
      notificationEnabled: true,
      hasFcmToken: true,
      isActive: true,
      canDonate: true,
    };
    
    // ✅ Save to user's devices collection (USING .doc())
    await this.firebaseService.firestore
      .collection('users')
      .doc(donorId)  // ← .doc() NOT .document()
      .collection('devices')
      .doc(deviceId)  // ← .doc() NOT .document()
      .set(update, { merge: true });
    
    // Also update donor document
    await this.firebaseService.firestore
      .collection('donors')
      .where('userId', '==', donorId)
      .get()
      .then(snapshot => {
        if (!snapshot.empty) {
          snapshot.docs[0].ref.set(update, { merge: true });
        } else {
          this.firebaseService.firestore
            .collection('donors')
            .doc(donorId)  // ← .doc() NOT .document()
            .set(update, { merge: true });
        }
      });
  }

  async notifyCompatibleDonors(body: {
    requestId: string;
    bloodGroup: string;
    district: string;
    hospitalName?: string;
    hospital?: string;
    medicalName?: string;
    urgency?: string;
    patientName?: string;
    contactPhone?: string;
    units?: number;
    requesterId?: string;
  }) {
    try {
      const {
        requestId,
        bloodGroup,
        district,
        hospitalName: bodyHospitalName,
        hospital: bodyHospital,
        medicalName: bodyMedicalName,
        urgency = 'normal',
        patientName,
        contactPhone,
        units = 1,
        requesterId,
      } = body;

      const hospitalName = bodyHospitalName || bodyHospital || bodyMedicalName || 'Hospital';
      
      console.log('🔍 Starting donor matching for:', {
        requestId,
        requesterId,
        bloodGroup,
        district,
        hospital: hospitalName,
        urgency
      });

      // ✅ Get compatible donors WITH requester exclusion
      const compatibleDonors = await this.donorMatchingService.findCompatibleDonors(
        bloodGroup,
        district,
        50,
        requesterId
      );

      console.log(`✅ Found ${compatibleDonors?.length || 0} compatible donors`);

      if (!compatibleDonors || compatibleDonors.length === 0) {
        return {
          success: false,
          message: 'No compatible donors found in this district',
          data: {
            requestId,
            totalCompatibleDonors: 0,
            eligibleDonors: 0,
            notifiedDonors: 0,
            failedNotifications: 0,
            timestamp: new Date().toISOString(),
          },
        };
      }

      // ✅ Get requester's device IDs to avoid same-device notifications
      const requesterDevices: string[] = [];
      if (requesterId) {
        try {
          const requesterDevicesSnap = await this.firebaseService.firestore
            .collection('users')
            .doc(requesterId)  // ← .doc() NOT .document()
            .collection('devices')
            .get();
          
          requesterDevicesSnap.docs.forEach(doc => {
            const deviceId = doc.data().deviceId;
            if (deviceId) requesterDevices.push(deviceId);
          });
          console.log(`📱 Requester devices: ${requesterDevices.length} devices found`);
        } catch (deviceError) {
          console.warn('⚠️ Could not fetch requester devices:', deviceError.message);
        }
      }

      // ✅ Filter eligible donors
      const validDonors = compatibleDonors.filter((d: Donor) => {
        // Basic checks
        if (!d.fcmToken || d.fcmToken.length < 10) {
          console.log(`❌ Excluding ${d.userId}: No valid FCM token`);
          return false;
        }
        if (!d.isAvailable || !d.notificationEnabled) {
          console.log(`❌ Excluding ${d.userId}: Not available or notifications disabled`);
          return false;
        }
        if (!d.fcmToken.includes(':')) {
          console.log(`❌ Excluding ${d.userId}: Invalid token format`);
          return false;
        }
        
        // Exclude requester by userId
        if (d.userId === requesterId) {
          console.log(`❌ Excluding ${d.userId}: Is the requester`);
          return false;
        }
        
        // Exclude donors on same device as requester
        if (d.deviceId && requesterDevices.includes(d.deviceId)) {
          console.log(`❌ Excluding ${d.userId}: Same device as requester (${d.deviceId})`);
          return false;
        }
        
        console.log(`✅ Including ${d.userId}: Eligible donor`);
        return true;
      });

      console.log(`📊 Filtered to ${validDonors.length} valid donors`);

      if (!validDonors.length) {
        const onlyRequester = compatibleDonors.length === 1 && 
          compatibleDonors[0].userId === requesterId;
        
        return {
          success: false,
          message: onlyRequester 
            ? 'You are the only compatible donor in this district.'
            : 'No eligible donors with valid notification settings.',
          data: {
            requestId,
            totalCompatibleDonors: compatibleDonors.length,
            eligibleDonors: 0,
            notifiedDonors: 0,
            failedNotifications: 0,
            requesterDevicesCount: requesterDevices.length,
            timestamp: new Date().toISOString(),
          },
        };
      }

      const title = urgency === 'high' ? '🚨 URGENT: Blood Needed' : '🩸 Blood Donation Request';
      const bodyText = patientName
        ? `${patientName} needs ${bloodGroup} blood at ${hospitalName} (${district})`
        : `${bloodGroup} blood needed at ${hospitalName} in ${district}`;

      console.log(`📤 Preparing to send notifications to ${validDonors.length} donors`);

      // ✅ Create individual messages for each donor with recipientUserId
      const messages = validDonors.map(donor => ({
        token: donor.fcmToken,
        data: {
          type: 'blood_request',
          title,
          body: bodyText,
          requestId,
          bloodGroup,
          district,
          hospital: hospitalName,
          medicalName: hospitalName,
          patientName: patientName || '',
          contactPhone: contactPhone || '',
          urgency,
          units: units.toString(),
          channelId: 'blood_requests',
          timestamp: new Date().toISOString(),
          requesterId: requesterId || '',
          // ✅ CRITICAL: Add recipient information for account-specific filtering
          recipientUserId: donor.userId,
          recipientDeviceId: donor.deviceId || '',
          recipientName: donor.name || 'Donor',
        },
        android: {
          priority: 'high' as const,
        },
      }));

      // ✅ Send individual messages
      const failedTokens: string[] = [];
      const successfulMessages: any[] = [];

      for (const message of messages) {
        try {
          await this.firebaseService.messaging.send(message);
          successfulMessages.push(message);
          console.log(`✅ Sent to ${message.data.recipientUserId}`);
        } catch (error) {
          console.error(`❌ Failed to send to ${message.data.recipientUserId}:`, error.message);
          failedTokens.push(message.token);
        }
      }

      // ✅ Clean up invalid tokens
      if (failedTokens.length > 0) {
        console.log(`🧹 Cleaning up ${failedTokens.length} invalid tokens`);
        await Promise.all(
          failedTokens.map(token =>
            this.firebaseService.firestore
              .collection('donors')
              .where('fcmToken', '==', token)
              .get()
              .then(snapshot =>
                snapshot.docs.map(doc =>
                  doc.ref.set(
                    {
                      fcmToken: FieldValue.delete(),
                      hasFcmToken: false,
                      updatedAt: FieldValue.serverTimestamp(),
                    },
                    { merge: true },
                  ),
                ),
              ),
          ),
        );
      }

      // ✅ Log request to Firestore
      await this.firebaseService.firestore
        .collection('bloodRequests')
        .doc(requestId)  // ← .doc() NOT .document()
        .set(
          {
            requestId,
            bloodGroup,
            district,
            hospital: hospitalName,
            medicalName: hospitalName,
            urgency,
            units,
            requesterId: requesterId || null,
            requesterDeviceIds: requesterDevices,
            totalCompatibleDonors: compatibleDonors.length,
            notifiedDonors: successfulMessages.length,
            failedNotifications: failedTokens.length,
            status: successfulMessages.length > 0 ? 'sent' : 'failed',
            recipientCount: validDonors.length,
            recipients: validDonors.map(d => ({
              userId: d.userId,
              name: d.name,
              deviceId: d.deviceId
            })),
            updatedAt: FieldValue.serverTimestamp(),
            sentAt: new Date().toISOString(),
          },
          { merge: true },
        );

      console.log(`📝 Request logged to Firestore: ${requestId}`);

      return {
        success: successfulMessages.length > 0,
        message: successfulMessages.length > 0 
          ? `Notifications sent to ${successfulMessages.length} donor accounts` 
          : 'Failed to send notifications',
        data: {
          requestId,
          totalCompatibleDonors: compatibleDonors.length,
          eligibleDonors: validDonors.length,
          notifiedDonors: successfulMessages.length,
          failedNotifications: failedTokens.length,
          recipients: validDonors.map(d => ({
            userId: d.userId,
            name: d.name,
            deviceId: d.deviceId,
            hasToken: !!d.fcmToken
          })),
          requesterExcluded: requesterId ? true : false,
          sameDeviceExcluded: requesterDevices.length,
          requesterDevices: requesterDevices,
          timestamp: new Date().toISOString(),
          logId: `log_${Date.now()}`,
        },
      };
    } catch (error) {
      console.error('❌ notifyCompatibleDonors error:', error);
      return {
        success: false,
        message: error.message || 'Internal server error',
        data: {
          requestId: body.requestId,
          totalCompatibleDonors: 0,
          eligibleDonors: 0,
          notifiedDonors: 0,
          failedNotifications: 0,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  async saveFCMToken(data: {
    userId: string;
    fcmToken: string;
    deviceId?: string;
    userType?: string;
    deviceType?: string;
    appVersion?: string;
  }) {
    const { userId, fcmToken, deviceId, userType, deviceType, appVersion } = data;
    const deviceIdFinal = deviceId || 'unknown';
    const compoundTokenId = `${userId}_${deviceIdFinal}`;

    const update = {
      userId,
      fcmToken,
      deviceId: deviceIdFinal,
      compoundTokenId,
      userType: userType || 'donor',
      deviceType: deviceType || 'android',
      appVersion: appVersion || '1.0.0',
      isAvailable: true,
      notificationEnabled: true,
      hasFcmToken: true,
      isActive: true,
      canDonate: true,
      lastActive: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    console.log('💾 Saving FCM token:', {
      userId,
      deviceId: deviceIdFinal,
      compoundTokenId,
      tokenLength: fcmToken.length
    });

    // ✅ Save to user's devices collection (USING .doc())
    await this.firebaseService.firestore
      .collection('users')
      .doc(userId)  // ← .doc() NOT .document()
      .collection('devices')
      .doc(deviceIdFinal)  // ← .doc() NOT .document()
      .set(update, { merge: true });
    
    // ✅ Update donor collection
    const donorQuery = await this.firebaseService.firestore
      .collection('donors')
      .where('userId', '==', userId)
      .get();

    if (!donorQuery.empty) {
      await donorQuery.docs[0].ref.set(update, { merge: true });
    } else {
      await this.firebaseService.firestore
        .collection('donors')
        .doc(userId)  // ← .doc() NOT .document()
        .set(update, { merge: true });
    }

    console.log('✅ Token saved successfully:', compoundTokenId);

    return { success: true, compoundTokenId };
  }

  async sendTestNotification(token: string) {
    return this.firebaseService.messaging.send({
      token,
      data: {
        type: 'test',
        title: '✅ Test Notification',
        body: 'Your notification system is working!',
        urgency: 'normal',
        channelId: 'blood_requests',
        timestamp: new Date().toISOString(),
      },
      android: {
        priority: 'high',
      },
    });
  }

  async checkFirebaseStatus(): Promise<boolean> {
    return this.firebaseService.isInitialized();
  }

  // ✅ NEW: Get user's devices
  async getUserDevices(userId: string): Promise<string[]> {
    try {
      const devicesSnap = await this.firebaseService.firestore
        .collection('users')
        .doc(userId)  // ← .doc() NOT .document()
        .collection('devices')
        .get();
      
      return devicesSnap.docs.map(doc => doc.data().deviceId).filter(Boolean);
    } catch (error) {
      console.error('Error getting user devices:', error);
      return [];
    }
  }

  // ✅ NEW: Validate token for debugging
  async validateToken(userId: string, deviceId?: string) {
    const db = this.firebaseService.firestore;
    
    let query = db.collection('donors').where('userId', '==', userId);
    
    if (deviceId) {
      query = query.where('deviceId', '==', deviceId);
    }

    const snapshot = await query.limit(1).get();

    if (snapshot.empty) {
      return { hasToken: false, message: 'No donor found' };
    }

    const donor = snapshot.docs[0].data();
    const hasToken = !!donor.fcmToken && donor.hasFcmToken === true;
    
    return {
      hasToken,
      userId,
      deviceId: donor.deviceId || deviceId,
      compoundTokenId: donor.compoundTokenId,
      isAvailable: donor.isAvailable,
      notificationEnabled: donor.notificationEnabled,
      lastActive: donor.lastActive || donor.updatedAt,
      message: hasToken ? 'Valid token found' : 'No valid token found'
    };
  }
}