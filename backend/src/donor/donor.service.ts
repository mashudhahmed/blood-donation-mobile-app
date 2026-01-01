import { Injectable } from '@nestjs/common';

@Injectable()
export class DonorService {
  private donors: any[] = []; // replace with DB

  async updateDonor(userId: string, data: any) {
    const index = this.donors.findIndex(d => d.userId === userId);

    if (index >= 0) {
      this.donors[index] = { ...this.donors[index], ...data };
      return this.donors[index];
    }

    const donor = { userId, ...data };
    this.donors.push(donor);
    return donor;
  }

  async findEligibleDonors(bloodGroup: string, district: string) {
    const now = Date.now();

    return this.donors.filter(donor => {
      const days =
        (now - new Date(donor.lastDonationDate).getTime()) /
        (1000 * 60 * 60 * 24);

      return (
        donor.bloodGroup === bloodGroup &&
        donor.district === district &&
        donor.isAvailable === true &&
        days >= 90
      );
    });
  }
}
