import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { FirebaseService } from '../firebase/firebase.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { UserRole } from './roles.decorator';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // Default accounts for standard administrative access
  private readonly defaultUsers: Record<string, any> = {
    'admin@bloodlink.org': {
      id: 'usr_admin_001',
      email: 'admin@bloodlink.org',
      name: 'System Administrator',
      organization: 'BloodLink Administration',
      role: UserRole.ADMIN,
      district: 'Dhaka',
      phone: '+880222334455',
      badge: 'Administrator',
      verified: true,
    },
    'admin@bloodlink.health.bd': {
      id: 'usr_admin_001',
      email: 'admin@bloodlink.health.bd',
      name: 'System Administrator',
      organization: 'BloodLink Administration',
      role: UserRole.ADMIN,
      district: 'Dhaka',
      phone: '+880222334455',
      badge: 'Administrator',
      verified: true,
    },
    'hospital@dmc.edu.bd': {
      id: 'usr_hosp_001',
      email: 'hospital@dmc.edu.bd',
      name: 'Dr. Rafiqul Islam, CMO',
      organization: 'Dhaka Medical College Hospital',
      role: UserRole.HOSPITAL,
      district: 'Dhaka',
      phone: '+880255165088',
      licenseNumber: 'LIC-2021-9921',
      badge: 'Chief Medical Officer',
      verified: true,
    },
    'dmc.hospital@dghs.gov.bd': {
      id: 'usr_hosp_001',
      email: 'dmc.hospital@dghs.gov.bd',
      name: 'Dr. Rafiqul Islam, CMO',
      organization: 'Dhaka Medical College Hospital',
      role: UserRole.HOSPITAL,
      district: 'Dhaka',
      phone: '+880255165088',
      licenseNumber: 'LIC-2021-9921',
      badge: 'Chief Medical Officer',
      verified: true,
    },
    'contact@redcrescent.org.bd': {
      id: 'usr_bb_001',
      email: 'contact@redcrescent.org.bd',
      name: 'Nusrat Jahan (Lab Director)',
      organization: 'Red Crescent Blood Center',
      role: UserRole.BLOOD_BANK,
      district: 'Dhaka',
      phone: '+88029330188',
      licenseNumber: 'LIC-2018-041',
      badge: 'Blood Bank Director',
      verified: true,
    },
    'redcrescent.bank@redcrescent.org.bd': {
      id: 'usr_bb_001',
      email: 'redcrescent.bank@redcrescent.org.bd',
      name: 'Nusrat Jahan (Lab Director)',
      organization: 'Red Crescent Blood Center',
      role: UserRole.BLOOD_BANK,
      district: 'Dhaka',
      phone: '+88029330188',
      licenseNumber: 'LIC-2018-041',
      badge: 'Blood Bank Director',
      verified: true,
    },
    // Hospital Position / Staff Accounts
    'kamal.icu@dmc.edu.bd': {
      id: 'usr_hosp_staff_001',
      facilityId: 'usr_hosp_001',
      email: 'kamal.icu@dmc.edu.bd',
      name: 'Dr. Kamal Hossain',
      position: 'ICU On-Duty Doctor',
      department: 'Intensive Care Unit',
      organization: 'Dhaka Medical College Hospital',
      role: UserRole.HOSPITAL,
      district: 'Dhaka',
      phone: '+8801711223344',
      badge: 'ICU On-Duty Doctor',
      verified: true,
      isStaff: true,
      isActive: true,
      permissions: ['create_requisition', 'view_donors', 'update_status'],
    },
    'ayesha.nurse@dmc.edu.bd': {
      id: 'usr_hosp_staff_002',
      facilityId: 'usr_hosp_001',
      email: 'ayesha.nurse@dmc.edu.bd',
      name: 'Nurse Ayesha Siddika',
      position: 'Emergency Desk Nurse',
      department: 'Emergency & Triage',
      organization: 'Dhaka Medical College Hospital',
      role: UserRole.HOSPITAL,
      district: 'Dhaka',
      phone: '+8801822334455',
      badge: 'Emergency Desk Nurse',
      verified: true,
      isStaff: true,
      isActive: true,
      permissions: ['create_requisition', 'view_donors'],
    },
    // Blood Bank Position / Staff Accounts
    'sumon.lab@redcrescent.org.bd': {
      id: 'usr_bb_staff_001',
      facilityId: 'usr_bb_001',
      email: 'sumon.lab@redcrescent.org.bd',
      name: 'Kazi Sumon',
      position: 'Senior Hematology Lab Tech',
      department: 'Component Separation & Testing',
      organization: 'Red Crescent Blood Center',
      role: UserRole.BLOOD_BANK,
      district: 'Dhaka',
      phone: '+8801933445566',
      badge: 'Senior Hematology Lab Tech',
      verified: true,
      isStaff: true,
      isActive: true,
      permissions: ['manage_inventory', 'record_donations'],
    },
    'tahmina.stock@redcrescent.org.bd': {
      id: 'usr_bb_staff_002',
      facilityId: 'usr_bb_001',
      email: 'tahmina.stock@redcrescent.org.bd',
      name: 'Tahmina Akter',
      position: 'Cryo-Storage Operator',
      department: 'Cold Chain & Storage',
      organization: 'Red Crescent Blood Center',
      role: UserRole.BLOOD_BANK,
      district: 'Dhaka',
      phone: '+8801644556677',
      badge: 'Cryo-Storage Operator',
      verified: true,
      isStaff: true,
      isActive: true,
      permissions: ['manage_inventory'],
    },
  };

  constructor(
    private readonly jwtService: JwtService,
    private readonly firebaseService: FirebaseService,
  ) {}

  /**
   * Registers a new enterprise organization user (Hospital, Blood Bank, or Admin)
   */
  async register(dto: RegisterDto) {
    const db = this.firebaseService.firestore;
    const emailNorm = dto.email.toLowerCase().trim();

    // Check if user already exists
    const existingSnap = await db
      .collection('users')
      .where('email', '==', emailNorm)
      .limit(1)
      .get();

    if (!existingSnap.empty || this.defaultUsers[emailNorm]) {
      throw new ConflictException(`An account with email ${dto.email} is already registered.`);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const docRef = db.collection('users').doc();
    const newUser = {
      id: docRef.id,
      email: emailNorm,
      name: dto.name,
      organization: dto.organization,
      role: dto.role,
      phone: dto.phone,
      district: dto.district,
      licenseNumber: dto.licenseNumber || '',
      verified: dto.role === UserRole.ADMIN, // Admin auto-verified; hospitals and blood banks verified by admin
      passwordHash,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await docRef.set(newUser);

    // If Hospital, also create facility entry
    if (dto.role === UserRole.HOSPITAL) {
      await db.collection('hospitals').doc(docRef.id).set({
        id: docRef.id,
        name: dto.organization,
        type: 'General Hospital',
        district: dto.district,
        address: dto.district,
        area: dto.district,
        phone: dto.phone,
        emergencyHotline: dto.phone,
        contactPhone: dto.phone,
        licenseNumber: dto.licenseNumber || 'LIC-PENDING',
        isEmergency24Hours: true,
        bloodTransfusionAvailable: true,
        verified: false,
        isVerified: false,
        createdAt: new Date().toISOString(),
      });
    }

    // If Blood Bank, also create entry
    if (dto.role === UserRole.BLOOD_BANK) {
      await db.collection('bloodBanks').doc(docRef.id).set({
        id: docRef.id,
        name: dto.organization,
        organization: dto.organization,
        district: dto.district,
        address: dto.district,
        phone: dto.phone,
        hotline: dto.phone,
        contactPhone: dto.phone,
        licenseNumber: dto.licenseNumber || 'LIC-PENDING',
        operatingHours: 'Open 24/7',
        availableComponents: 'Whole Blood, PRBC, Platelets, FFP',
        isOpen24Hours: true,
        verified: false,
        isVerified: false,
        createdAt: new Date().toISOString(),
      });
    }

    this.logger.log(`Registered new ${dto.role} account for ${dto.email}`);

    // Generate JWT token
    const token = this.generateToken(newUser);

    // Return user without passwordHash
    const { passwordHash: _, ...safeUser } = newUser;
    return {
      success: true,
      message: 'Account successfully registered and token generated.',
      token,
      user: safeUser,
    };
  }

  /**
   * Authenticates user via email/password and returns a JWT
   */
  async login(dto: LoginDto) {
    const emailNorm = dto.email.toLowerCase().trim();
    const db = this.firebaseService.firestore;

    let user: any = null;

    // Check Firestore
    try {
      const snap = await db.collection('users').where('email', '==', emailNorm).limit(1).get();
      if (!snap.empty) {
        user = snap.docs[0].data();
      }
    } catch (e) {
      this.logger.warn(`Firestore lookup error: ${e.message}`);
    }

    // If not found in Firestore, check pre-seeded accounts
    if (!user && this.defaultUsers[emailNorm]) {
      user = this.defaultUsers[emailNorm];
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials. Account not found.');
    }

    // Check if position/staff account is deactivated
    if (user.isActive === false) {
      throw new UnauthorizedException('This position account has been deactivated by facility administration.');
    }

    // If password hash exists in Firestore record, verify with bcrypt
    if (user.passwordHash) {
      const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
      if (!isMatch) {
        throw new UnauthorizedException('Invalid credentials. Password incorrect.');
      }
    }

    const token = this.generateToken(user);
    const { passwordHash: _, ...safeUser } = user;

    this.logger.log(`User ${emailNorm} logged in successfully as ${user.role} (${user.position || 'Facility Admin'})`);

    return {
      success: true,
      token,
      user: safeUser,
    };
  }

  /**
   * Generates signed JWT token
   */
  generateToken(user: any): string {
    const payload = {
      sub: user.id || user.uid,
      email: user.email,
      role: user.role,
      name: user.name,
      organization: user.organization,
      district: user.district,
      position: user.position || undefined,
      department: user.department || undefined,
      facilityId: user.facilityId || undefined,
      isStaff: user.isStaff || false,
      permissions: user.permissions || undefined,
    };

    return this.jwtService.sign(payload);
  }

  /**
   * Verifies a JWT token
   */
  async verifyToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }
}
