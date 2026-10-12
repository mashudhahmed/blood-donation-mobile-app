import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  /**
   * Aggregates platform-wide metrics across donors, requests, and inventory.
   */
  async getPlatformMetrics() {
    try {
      const db = this.firebaseService.firestore;

      // 1. Fetch counts in parallel
      const [
        donorsSnap,
        requestsSnap,
        usersSnap,
        hospitalsSnap,
        bloodBanksSnap,
      ] = await Promise.all([
        db.collection('donors').get(),
        db.collection('bloodRequests').get(),
        db.collection('users').get(),
        db.collection('hospitals').get(),
        db.collection('bloodBanks').get(),
      ]);

      const totalDonors = donorsSnap.size;
      const totalRequests = requestsSnap.size;
      const totalUsers = usersSnap.size;
      const totalHospitals = hospitalsSnap.size;
      const totalBloodBanks = bloodBanksSnap.size;

      // 2. Compute active vs fulfilled requests
      let activeRequests = 0;
      let fulfilledRequests = 0;
      const bloodGroupDemand: Record<string, number> = {
        'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'O+': 0, 'O-': 0, 'AB+': 0, 'AB-': 0,
      };

      requestsSnap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.status === 'pending' || data.status === 'urgent') {
          activeRequests++;
        } else if (data.status === 'completed' || data.status === 'fulfilled') {
          fulfilledRequests++;
        }
        const bg = data.bloodGroup?.trim().toUpperCase();
        if (bg && bloodGroupDemand[bg] !== undefined) {
          bloodGroupDemand[bg] += (Number(data.units) || 1);
        }
      });

      // 3. Compute donor availability & blood distribution
      let availableDonors = 0;
      const donorBloodDistribution: Record<string, number> = {
        'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'O+': 0, 'O-': 0, 'AB+': 0, 'AB-': 0,
      };

      donorsSnap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.isAvailable !== false) availableDonors++;
        const bg = data.bloodGroup?.trim().toUpperCase();
        if (bg && donorBloodDistribution[bg] !== undefined) {
          donorBloodDistribution[bg]++;
        }
      });

      return {
        success: true,
        metrics: {
          totalUsers,
          totalDonors,
          availableDonors,
          totalRequests,
          activeRequests,
          fulfilledRequests,
          totalHospitals,
          totalBloodBanks,
          donorBloodDistribution,
          bloodGroupDemand,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error('Failed to aggregate platform metrics', error);
      throw error;
    }
  }

  /**
   * Fetches organizations (hospitals & blood banks) with verification status.
   */
  async getOrganizations(type?: 'hospital' | 'bloodbank') {
    const db = this.firebaseService.firestore;
    const results: any[] = [];

    if (!type || type === 'hospital') {
      const snap = await db.collection('hospitals').get();
      snap.docs.forEach((doc) => {
        results.push({ id: doc.id, type: 'hospital', ...doc.data() });
      });
    }

    if (!type || type === 'bloodbank') {
      const snap = await db.collection('bloodBanks').get();
      snap.docs.forEach((doc) => {
        results.push({ id: doc.id, type: 'bloodbank', ...doc.data() });
      });
    }

    return {
      success: true,
      count: results.length,
      organizations: results,
    };
  }

  /**
   * Verifies or rejects an organization.
   */
  async updateOrganizationVerification(
    id: string,
    type: 'hospital' | 'bloodbank',
    status: 'VERIFIED' | 'REJECTED' | 'PENDING',
    notes?: string,
  ) {
    const collectionName = type === 'hospital' ? 'hospitals' : 'bloodBanks';
    const docRef = this.firebaseService.firestore.collection(collectionName).doc(id);

    await docRef.set(
      {
        verificationStatus: status,
        verified: status === 'VERIFIED',
        isVerified: status === 'VERIFIED',
        verificationNotes: notes || '',
        verifiedAt: status === 'VERIFIED' ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    return {
      success: true,
      id,
      type,
      status,
      message: `Organization ${id} marked as ${status}`,
    };
  }

  /**
   * Lists donors with filtering, search, and pagination.
   */
  async getDonors(query?: { search?: string; bloodGroup?: string; district?: string; limit?: number }) {
    const db = this.firebaseService.firestore;
    const limit = query?.limit || 50;

    let q: FirebaseFirestore.Query = db.collection('donors');
    if (query?.bloodGroup && query.bloodGroup !== 'All') {
      q = q.where('bloodGroup', '==', query.bloodGroup);
    }
    if (query?.district && query.district !== 'All') {
      q = q.where('district', '==', query.district);
    }

    const snap = await q.limit(limit).get();
    let donors = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    if (query?.search) {
      const term = query.search.toLowerCase();
      donors = donors.filter(
        (d: any) =>
          d.name?.toLowerCase().includes(term) ||
          d.location?.toLowerCase().includes(term) ||
          d.phone?.includes(term),
      );
    }

    return {
      success: true,
      count: donors.length,
      donors,
    };
  }

  /**
   * Toggles donor active/available status.
   */
  async updateDonorStatus(donorId: string, isAvailable: boolean) {
    await this.firebaseService.firestore.collection('donors').doc(donorId).update({
      isAvailable,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      donorId,
      isAvailable,
    };
  }

  /**
   * Retrieves recent platform activity logs.
   */
  async getAuditLogs(limit: number = 20) {
    const db = this.firebaseService.firestore;
    // Query recent blood requests and organizations
    const requestsSnap = await db
      .collection('bloodRequests')
      .limit(limit)
      .get();

    const logs = requestsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        action: 'EMERGENCY_REQUISITION',
        actor: data.patientName || data.requesterId || 'Anonymous Requester',
        details: `${data.units || 1} units of ${data.bloodGroup || 'blood'} at ${data.hospital || data.hospitalName || 'Unknown Hospital'}`,
        status: data.status || 'pending',
        timestamp: data.date || data.createdAt || new Date().toISOString(),
      };
    });

    return {
      success: true,
      logs,
    };
  }
}
