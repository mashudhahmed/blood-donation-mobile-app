import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, UserRole } from './roles.decorator';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private firebaseService: FirebaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // Set by FirebaseAuthGuard

    if (!user || !user.uid) {
      throw new ForbiddenException('User is not authenticated');
    }

    const normalize = (r?: string) => (r || '').toString().toLowerCase().replace(/[\s_-]/g, '');
    const normalizedRequired = requiredRoles.map((r) => normalize(r));

    // 1. Check custom claims in JWT
    const userRole = normalize(user.role || user.userType);
    if (userRole && normalizedRequired.includes(userRole)) {
      return true;
    }

    // 2. Check Firestore 'users' collection
    try {
      const userDoc = await this.firebaseService.firestore.collection('users').doc(user.uid).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        const role = normalize(data?.role || data?.userType);
        if (role && normalizedRequired.includes(role)) {
          return true;
        }
      }

      // 3. Check Firestore 'organizations' collection
      const orgDoc = await this.firebaseService.firestore.collection('organizations').doc(user.uid).get();
      if (orgDoc.exists) {
        const orgData = orgDoc.data();
        const role = normalize(orgData?.type || orgData?.role);
        if (role && normalizedRequired.includes(role)) {
          return true;
        }
      }
    } catch (e) {
      console.error('Error verifying user role in Firestore:', e);
    }

    // For local development / testing fallback
    if (process.env.NODE_ENV !== 'production' && (user.email?.includes('admin') || user.email === 'admin@bloodlink.org')) {
      return true;
    }

    throw new ForbiddenException(`Access denied: Requires one of [${requiredRoles.join(', ')}]`);
  }
}
