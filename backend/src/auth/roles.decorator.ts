import { SetMetadata } from '@nestjs/common';

export enum UserRole {
  ADMIN = 'admin',
  HOSPITAL = 'hospital',
  BLOOD_BANK = 'bloodbank',
  DONOR = 'donor',
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
