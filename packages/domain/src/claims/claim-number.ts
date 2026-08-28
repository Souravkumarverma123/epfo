/**
 * Claim number formatting. Pure — the random digits are supplied by the
 * caller (application layer), not generated here, per the domain-purity
 * rule (no Math.random() inside packages/domain).
 */
export function formatClaimNumber(randomDigits: string): string {
  return `EPFO-${randomDigits}`;
}
