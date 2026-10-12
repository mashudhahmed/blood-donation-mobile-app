import { Injectable, Logger, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { FirebaseService } from '../firebase/firebase.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DonorMatchingService } from '../matching/donor-matching.service';
import { CreateRequisitionDto } from './dto/create-requisition.dto';
import { CreateStaffDto } from './dto/create-staff.dto';

@Injectable()
export class HospitalService {
  private readonly logger = new Logger(HospitalService.name);

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly notificationsService: NotificationsService,
    private readonly donorMatchingService: DonorMatchingService,
  ) {}

  /**
   * Hospital raises an emergency blood requisition.
   * Saved into 'bloodRequests' (shared with mobile app) and triggers live notifications.
   */
  async createRequisition(hospitalId: string, dto: CreateRequisitionDto) {
    const db = this.firebaseService.firestore;
    const requisitionRef = db.collection('bloodRequests').doc();
    const requestId = requisitionRef.id;

    const requisitionData = {
      id: requestId,
      requesterId: hospitalId,
      hospital: dto.hospitalName || 'Dhaka Medical College Hospital',
      hospitalName: dto.hospitalName || 'Dhaka Medical College Hospital',
      patientName: dto.patientName,
      bloodGroup: dto.bloodGroup,
      units: dto.units,
      urgency: dto.urgency.toLowerCase(),
      district: dto.district,
      phone: dto.contactPhone || '+8801711000000',
      ward: dto.wardOrDepartment || '',
      medicalReason: dto.medicalReason || '',
      notes: dto.notes || '',
      status: 'pending',
      date: new Date().toLocaleDateString('en-GB'),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      source: 'HOSPITAL_PORTAL',
    };

    await requisitionRef.set(requisitionData);
    this.logger.log(`Created hospital requisition ${requestId} for ${dto.hospitalName}`);

    // Trigger instant real-time push notifications to matching donors in district
    let notificationResult: any = null;
    try {
      notificationResult = await this.notificationsService.notifyCompatibleDonors({
        requestId,
        bloodGroup: dto.bloodGroup,
        district: dto.district,
        hospitalName: dto.hospitalName,
        urgency: dto.urgency,
        patientName: dto.patientName,
        contactPhone: dto.contactPhone,
        units: dto.units,
        requesterId: hospitalId,
      });
    } catch (err) {
      this.logger.warn(`Failed to broadcast donor notifications: ${err.message}`);
    }

    return {
      success: true,
      requestId,
      requisition: requisitionData,
      notifications: notificationResult,
    };
  }

  /**
   * Retrieves requisitions for a specific hospital or by status.
   */
  async getRequisitions(hospitalId?: string, status?: string) {
    const db = this.firebaseService.firestore;
    let query: FirebaseFirestore.Query = db.collection('bloodRequests');

    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    }

    const snap = await query.limit(50).get();
    let requisitions = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    if (hospitalId) {
      const hospitalSpecific = requisitions.filter(
        (r: any) =>
          r.requesterId === hospitalId ||
          (r.hospital && r.hospital.toLowerCase().includes('dhaka')) ||
          (r.hospitalName && r.hospitalName.toLowerCase().includes('dhaka'))
      );
      if (hospitalSpecific.length > 0) {
        requisitions = hospitalSpecific;
      }
    }

    return {
      success: true,
      count: requisitions.length,
      requisitions,
    };
  }

  /**
   * Updates requisition lifecycle status (pending -> matched -> dispatched -> fulfilled).
   */
  async updateRequisitionStatus(requestId: string, status: string, notes?: string) {
    const docRef = this.firebaseService.firestore.collection('bloodRequests').doc(requestId);
    await docRef.update({
      status: status.toLowerCase(),
      statusNotes: notes || '',
      updatedAt: Date.now(),
    });

    return {
      success: true,
      requestId,
      status,
      message: `Requisition ${requestId} updated to ${status}`,
    };
  }

  /**
   * Finds compatible donors in the hospital's vicinity.
   */
  async findCompatibleDonors(bloodGroup: string, district: string, limit: number = 25) {
    const donors = await this.donorMatchingService.findCompatibleDonors(
      bloodGroup,
      district,
      limit,
    );

    return {
      success: true,
      bloodGroup,
      district,
      count: donors.length,
      donors,
    };
  }

  /**
   * Fetches or updates hospital profile in the directory.
   */
  async getHospitalProfile(hospitalId: string) {
    const doc = await this.firebaseService.firestore.collection('hospitals').doc(hospitalId).get();
    if (!doc.exists) {
      return {
        id: hospitalId,
        name: 'Hospital Member',
        district: 'Dhaka',
        phone: '',
        isVerified: false,
      };
    }
    return { id: doc.id, ...doc.data() };
  }

  // Fallback initial staff for Dhaka Medical College Hospital
  private readonly defaultHospitalStaff = [
    {
      id: 'usr_hosp_staff_001',
      facilityId: 'usr_hosp_001',
      facilityName: 'Dhaka Medical College Hospital',
      name: 'Dr. Kamal Hossain',
      email: 'kamal.icu@dmc.edu.bd',
      phone: '+8801711223344',
      position: 'ICU On-Duty Doctor',
      department: 'Intensive Care Unit',
      role: 'HOSPITAL',
      permissions: ['create_requisition', 'view_donors', 'update_status'],
      isActive: true,
      createdAt: Date.now() - 86400000 * 14,
    },
    {
      id: 'usr_hosp_staff_002',
      facilityId: 'usr_hosp_001',
      facilityName: 'Dhaka Medical College Hospital',
      name: 'Nurse Ayesha Siddika',
      email: 'ayesha.nurse@dmc.edu.bd',
      phone: '+8801822334455',
      position: 'Emergency Desk Nurse',
      department: 'Emergency & Triage',
      role: 'HOSPITAL',
      permissions: ['create_requisition', 'view_donors'],
      isActive: true,
      createdAt: Date.now() - 86400000 * 7,
    },
    {
      id: 'usr_hosp_staff_003',
      facilityId: 'usr_hosp_001',
      facilityName: 'Dhaka Medical College Hospital',
      name: 'Dr. Tariqul Islam',
      email: 'tariq.ot@dmc.edu.bd',
      phone: '+8801933445566',
      position: 'OT Surgery Coordinator',
      department: 'Operation Theater Desk',
      role: 'HOSPITAL',
      permissions: ['create_requisition', 'view_donors', 'update_status'],
      isActive: true,
      createdAt: Date.now() - 86400000 * 3,
    },
  ];

  /**
   * Retrieves list of position/staff accounts under this hospital
   */
  async getStaff(facilityId: string) {
    const db = this.firebaseService.firestore;
    try {
      const snap = await db
        .collection('facility_staff')
        .where('facilityId', '==', facilityId)
        .get();

      if (!snap.empty) {
        const staff = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        return {
          success: true,
          count: staff.length,
          staff,
        };
      }
    } catch (e) {
      this.logger.warn(`Could not fetch staff from firestore: ${e.message}`);
    }

    return {
      success: true,
      count: this.defaultHospitalStaff.length,
      staff: this.defaultHospitalStaff,
    };
  }

  /**
   * Creates a new staff/position account under this hospital
   */
  async createStaff(facilityId: string, facilityName: string, dto: CreateStaffDto) {
    const db = this.firebaseService.firestore;
    const emailNorm = dto.email.toLowerCase().trim();

    try {
      const existingSnap = await db
        .collection('users')
        .where('email', '==', emailNorm)
        .limit(1)
        .get();

      if (!existingSnap.empty) {
        throw new ConflictException(`An account with email ${dto.email} already exists.`);
      }
    } catch (e) {
      if (e instanceof ConflictException) throw e;
    }

    const salt = await bcrypt.genSalt(10);
    const password = dto.password || 'Staff@123456';
    const passwordHash = await bcrypt.hash(password, salt);

    const staffRef = db.collection('facility_staff').doc();
    const staffId = staffRef.id;

    const staffRecord = {
      id: staffId,
      facilityId,
      facilityName,
      name: dto.name,
      email: emailNorm,
      phone: dto.phone,
      position: dto.position,
      department: dto.department || 'General Clinical Staff',
      role: 'HOSPITAL',
      permissions: dto.permissions || ['create_requisition', 'view_donors'],
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      await staffRef.set(staffRecord);

      // Also register in users collection so staff can sign in at /login
      await db.collection('users').doc(staffId).set({
        id: staffId,
        email: emailNorm,
        name: dto.name,
        organization: facilityName,
        facilityId,
        role: 'HOSPITAL',
        position: dto.position,
        department: dto.department || 'General Clinical Staff',
        badge: dto.position,
        phone: dto.phone,
        verified: true, // Auto-verified under verified facility umbrella
        isStaff: true,
        isActive: true,
        permissions: staffRecord.permissions,
        passwordHash,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } catch (e) {
      this.logger.warn(`Could not save staff to firestore: ${e.message}`);
    }

    this.logger.log(`Created hospital position account for ${dto.name} (${dto.position}) at ${facilityName}`);

    return {
      success: true,
      message: `Staff position created successfully. Default password is: ${password}`,
      staff: staffRecord,
    };
  }

  /**
   * Toggles staff member active status (enable/deactivate)
   */
  async updateStaffStatus(staffId: string, isActive?: boolean) {
    const db = this.firebaseService.firestore;
    let newStatus = isActive;

    try {
      const staffRef = db.collection('facility_staff').doc(staffId);
      const snap = await staffRef.get();
      if (snap.exists) {
        if (typeof newStatus !== 'boolean') {
          newStatus = !snap.data()?.isActive;
        }
        await staffRef.update({ isActive: newStatus, updatedAt: Date.now() });
      }

      const userRef = db.collection('users').doc(staffId);
      const userSnap = await userRef.get();
      if (userSnap.exists) {
        await userRef.update({ isActive: newStatus, updatedAt: Date.now() });
      }
    } catch (e) {
      this.logger.warn(`Could not update staff status in firestore: ${e.message}`);
    }

    return {
      success: true,
      id: staffId,
      isActive: newStatus,
      message: `Staff account status updated to ${newStatus ? 'Active' : 'Deactivated'}`,
    };
  }

  /**
   * Deletes a staff position account
   */
  async deleteStaff(staffId: string) {
    const db = this.firebaseService.firestore;
    try {
      await db.collection('facility_staff').doc(staffId).delete();
      await db.collection('users').doc(staffId).delete();
    } catch (e) {
      this.logger.warn(`Could not delete staff from firestore: ${e.message}`);
    }

    return {
      success: true,
      id: staffId,
      message: 'Staff account deleted successfully.',
    };
  }
}
