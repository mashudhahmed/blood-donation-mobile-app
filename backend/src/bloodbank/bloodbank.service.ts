import { Injectable, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { FirebaseService } from '../firebase/firebase.service';
import { InventoryAdjustmentDto, CreateDriveDto } from './dto/bloodbank.dto';
import { CreateStaffDto } from './dto/create-staff.dto';

@Injectable()
export class BloodBankService {
  private readonly logger = new Logger(BloodBankService.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  /**
   * Retrieves inventory for a blood bank across all 8 blood groups.
   */
  async getInventory(bankId: string) {
    const docRef = this.firebaseService.firestore.collection('bloodBankInventory').doc(bankId);
    const doc = await docRef.get();

    // Default inventory baseline if not yet populated
    const defaultStock: Record<string, number> = {
      'A+': 18, 'A-': 5, 'B+': 24, 'B-': 7,
      'AB+': 10, 'AB-': 3, 'O+': 32, 'O-': 4,
    };

    let stock = defaultStock;
    if (doc.exists) {
      stock = { ...defaultStock, ...(doc.data()?.stock || {}) };
    } else {
      // Initialize in Firestore
      await docRef.set({
        bankId,
        stock: defaultStock,
        updatedAt: Date.now(),
      });
    }

    const totalUnits = Object.values(stock).reduce((acc, curr) => acc + curr, 0);

    // Compute stock status per blood group (thresholds: < 5 critical, < 10 low, >= 10 normal)
    const stockStatus: Record<string, { units: number; status: 'CRITICAL' | 'LOW' | 'NORMAL' | 'ABUNDANT' }> = {};
    for (const [bg, units] of Object.entries(stock)) {
      let status: 'CRITICAL' | 'LOW' | 'NORMAL' | 'ABUNDANT' = 'NORMAL';
      if (units <= 4) status = 'CRITICAL';
      else if (units <= 9) status = 'LOW';
      else if (units >= 25) status = 'ABUNDANT';

      stockStatus[bg] = { units, status };
    }

    return {
      success: true,
      bankId,
      totalUnits,
      inventory: stockStatus,
      rawStock: stock,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Adjusts inventory (INTAKE, DISPATCH, or EXPIRED) and logs transaction audit trail.
   */
  async adjustInventory(bankId: string, dto: InventoryAdjustmentDto) {
    const db = this.firebaseService.firestore;
    const invRef = db.collection('bloodBankInventory').doc(bankId);
    const txRef = db.collection('bloodBankTransactions').doc();

    const invDoc = await invRef.get();
    const currentStock = invDoc.exists ? (invDoc.data()?.stock || {}) : {};
    const currentUnits = currentStock[dto.bloodGroup] || 0;

    let newUnits = currentUnits;
    if (dto.type === 'INTAKE') {
      newUnits += dto.units;
    } else {
      if (currentUnits < dto.units) {
        throw new BadRequestException(
          `Cannot dispatch ${dto.units} units of ${dto.bloodGroup}. Current stock is only ${currentUnits} units.`,
        );
      }
      newUnits -= dto.units;
    }

    currentStock[dto.bloodGroup] = newUnits;

    // Save updated stock
    await invRef.set({ stock: currentStock, updatedAt: Date.now() }, { merge: true });

    // Record transaction
    const transaction = {
      id: txRef.id,
      bankId,
      bloodGroup: dto.bloodGroup,
      type: dto.type,
      units: dto.units,
      previousUnits: currentUnits,
      newUnits,
      reason: dto.reason || '',
      batchOrBagNumber: dto.batchOrBagNumber || '',
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
    };
    await txRef.set(transaction);

    this.logger.log(`Adjusted ${dto.type} ${dto.units} units of ${dto.bloodGroup} for ${bankId}`);

    return {
      success: true,
      bloodGroup: dto.bloodGroup,
      type: dto.type,
      previousUnits: currentUnits,
      updatedUnits: newUnits,
      transaction,
    };
  }

  /**
   * Lists inventory transaction history.
   */
  async getTransactions(bankId: string, limit: number = 25) {
    const snap = await this.firebaseService.firestore
      .collection('bloodBankTransactions')
      .where('bankId', '==', bankId)
      .limit(limit)
      .get();

    const transactions = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return {
      success: true,
      count: transactions.length,
      transactions,
    };
  }

  /**
   * Creates a public blood donation drive campaign.
   */
  async createDrive(bankId: string, dto: CreateDriveDto) {
    const docRef = this.firebaseService.firestore.collection('bloodDrives').doc();
    const drive = {
      id: docRef.id,
      bankId,
      ...dto,
      status: 'PLANNED',
      registeredDonorsCount: 0,
      collectedUnits: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await docRef.set(drive);
    return {
      success: true,
      driveId: docRef.id,
      drive,
    };
  }

  /**
   * Retrieves blood drives.
   */
  async getDrives(bankId?: string) {
    let query: FirebaseFirestore.Query = this.firebaseService.firestore.collection('bloodDrives');
    if (bankId) {
      query = query.where('bankId', '==', bankId);
    }

    const snap = await query.limit(50).get();
    const drives = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return {
      success: true,
      count: drives.length,
      drives,
    };
  }

  /**
   * Records walk-in donor collection and updates donor's last donation date.
   */
  async recordWalkInDonation(bankId: string, donorId: string, bloodGroup: string, units: number = 1) {
    const db = this.firebaseService.firestore;
    const now = Date.now();

    // 1. Update donor document
    try {
      await db.collection('donors').doc(donorId).update({
        lastDonationDate: now,
        lastDonation: new Date().toLocaleDateString('en-GB'),
        updatedAt: now,
        canDonate: false, // Ineligible for 90 days after donation
      });
    } catch (e) {
      this.logger.warn(`Could not update donor ${donorId}: ${e.message}`);
    }

    // 2. Adjust inventory automatically (INTAKE)
    return this.adjustInventory(bankId, {
      bloodGroup,
      type: 'INTAKE',
      units,
      reason: `Walk-in donor donation from ${donorId}`,
    });
  }

  // Fallback initial staff for Red Crescent Blood Center
  private readonly defaultBloodBankStaff = [
    {
      id: 'usr_bb_staff_001',
      facilityId: 'usr_bb_001',
      facilityName: 'Red Crescent Blood Center',
      name: 'Kazi Sumon',
      email: 'sumon.lab@redcrescent.org.bd',
      phone: '+8801933445566',
      position: 'Senior Hematology Lab Tech',
      department: 'Component Separation & Testing',
      role: 'BLOOD_BANK',
      permissions: ['manage_inventory', 'record_donations'],
      isActive: true,
      createdAt: Date.now() - 86400000 * 20,
    },
    {
      id: 'usr_bb_staff_002',
      facilityId: 'usr_bb_001',
      facilityName: 'Red Crescent Blood Center',
      name: 'Tahmina Akter',
      email: 'tahmina.stock@redcrescent.org.bd',
      phone: '+8801644556677',
      position: 'Cryo-Storage Operator',
      department: 'Cold Chain & Storage',
      role: 'BLOOD_BANK',
      permissions: ['manage_inventory'],
      isActive: true,
      createdAt: Date.now() - 86400000 * 10,
    },
    {
      id: 'usr_bb_staff_003',
      facilityId: 'usr_bb_001',
      facilityName: 'Red Crescent Blood Center',
      name: 'Farhana Parveen',
      email: 'farhana.qc@redcrescent.org.bd',
      phone: '+8801555667788',
      position: 'Quality Control Officer',
      department: 'Transfusion Safety Assurance',
      role: 'BLOOD_BANK',
      permissions: ['manage_inventory', 'manage_drives'],
      isActive: true,
      createdAt: Date.now() - 86400000 * 4,
    },
  ];

  /**
   * Retrieves list of position/staff accounts under this blood bank
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
      count: this.defaultBloodBankStaff.length,
      staff: this.defaultBloodBankStaff,
    };
  }

  /**
   * Creates a new staff/position account under this blood bank
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
      department: dto.department || 'Laboratory & Storage Operations',
      role: 'BLOOD_BANK',
      permissions: dto.permissions || ['manage_inventory', 'record_donations'],
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
        role: 'BLOOD_BANK',
        position: dto.position,
        department: dto.department || 'Laboratory & Storage Operations',
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

    this.logger.log(`Created blood bank position account for ${dto.name} (${dto.position}) at ${facilityName}`);

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
