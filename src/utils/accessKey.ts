import type { Pengajuan } from '../types';

/**
 * Generate or retrieve a deterministic, unguessable 6-character secret key for an applicant.
 * This prevents sequential enumeration / IDOR attacks (e.g. guessing MT-0281 from MT-0280).
 */
export const getApplicantAccessKey = (item: Pengajuan | null | undefined): string => {
  if (!item) return '';
  if (item.accessKey && item.accessKey.trim().length >= 4) {
    return item.accessKey.trim().toUpperCase();
  }

  // Generate deterministic key from id + noTelp/paspor + secret salt
  const salt = 'mapah_sec_2026_jp';
  const idPart = (item.id || item.noPengajuan || '').trim();
  const phonePart = (item.noTelp || '').replace(/[^0-9]/g, '').slice(-4);
  const passportPart = (item.noPaspor || '').trim().slice(-3);
  const raw = `${idPart}-${phonePart}-${passportPart}-${salt}`;

  // Simple, fast 64-bit mix to 6 alphanumeric characters
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c6ce57 ^ 0;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  const num = (h2 >>> 0) * 4294967296 + (h1 >>> 0);
  const base36 = Math.abs(num).toString(36).toUpperCase();
  return base36.slice(0, 6).padStart(6, '7');
};

/**
 * Verify whether a provided key matches the applicant's secret key.
 */
export const verifyApplicantAccessKey = (
  item: Pengajuan | null | undefined,
  providedKey: string | null | undefined
): boolean => {
  if (!item || !providedKey) return false;
  const expected = getApplicantAccessKey(item);
  return expected.toUpperCase().trim() === providedKey.toUpperCase().trim();
};

