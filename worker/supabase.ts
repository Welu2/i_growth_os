/** Secret API keys are not JWTs; only legacy service-role keys use Bearer auth. */
export function adminHeaders(key: string): Record<string, string> {
  return { apikey: key, 'Content-Type': 'application/json', ...(key.startsWith('sb_secret_') ? {} : { Authorization: `Bearer ${key}` }) };
}
