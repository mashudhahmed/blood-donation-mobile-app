export function isEligible(lastDonationDate?: Date): boolean {
  if (!lastDonationDate) return true;

  const now = new Date();
  const diffMs = now.getTime() - new Date(lastDonationDate).getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays >= 90;
}
