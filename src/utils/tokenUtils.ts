export function getTokenAgeMinutes(pairCreatedAt?: number | null): number | null {
  if (!pairCreatedAt) {
    return null;
  }

  const now = Date.now();
  const ageMs = now - pairCreatedAt;

  return Math.floor(ageMs / 60000);
}