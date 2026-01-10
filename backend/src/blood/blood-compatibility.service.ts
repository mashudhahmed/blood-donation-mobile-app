import { Injectable } from '@nestjs/common';

@Injectable()
export class BloodCompatibilityService {
  // Blood type compatibility: who can donate to whom
  private readonly compatibility = {
    'A+': ['A+', 'AB+'],
    'A-': ['A+', 'A-', 'AB+', 'AB-'],
    'B+': ['B+', 'AB+'],
    'B-': ['B+', 'B-', 'AB+', 'AB-'],
    'O+': ['O+', 'A+', 'B+', 'AB+'],
    'O-': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    'AB+': ['AB+'],
    'AB-': ['AB+', 'AB-']
  };

  // Check if donor can donate to recipient
  canDonate(donorBloodType: string, recipientBloodType: string): boolean {
    const compatibleTypes = this.compatibility[donorBloodType];
    return compatibleTypes ? compatibleTypes.includes(recipientBloodType) : false;
  }

  // Get all compatible donor blood types for a recipient
  getCompatibleDonors(recipientBloodType: string): string[] {
    const compatible: string[] = [];
    for (const [donorType, canDonateTo] of Object.entries(this.compatibility)) {
      if (canDonateTo.includes(recipientBloodType)) {
        compatible.push(donorType);
      }
    }
    return compatible;
  }
}