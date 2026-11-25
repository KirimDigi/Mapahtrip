// src/utils/visaPricing.ts - Master Tarif & Penentuan Harga Layanan Visa Jepang
import { supabase } from '../lib/supabase';

export interface VisaPricingItem {
  id: string;
  title: string;
  category: 'turis' | 'kerja' | 'magang' | 'studi' | 'transit' | 'keluarga' | 'bisnis' | 'medis' | 'khusus' | string;
  regulerPrice: number;
  premiumPrice: number;
  tacPrice: number;
  pricePill?: string;
  subtitle?: string;
  desc?: string;
  durationPill?: string;
  topRightBadge?: string;
  popularBadge?: string;
  keterangan?: string;
  isCustom?: boolean;
  badge?: string;
}

export const DEFAULT_VISA_PRICING: VisaPricingItem[] = [
  {
    id: 'evisa-waiver',
    title: 'Japan e-Visa / Waiver',
    subtitle: 'Multiple Entry (3 Tahun)',
    desc: 'Registrasi bebas visa untuk e-paspor atau e-Visa turis via online. Bebas keluar-masuk Jepang.',
    pricePill: 'Rp 200rb',
    durationPill: 'Maksimal 15 Hari',
    category: 'turis',
    popularBadge: '★ TERPOPULER',
    topRightBadge: '100% Online',
    regulerPrice: 200000,
    premiumPrice: 250000,
    tacPrice: 300000,
    keterangan: 'Multiple Entry (3 tahun) • Maksimal stay 15 hari',
  },
  {
    id: 'tokutei-ginou',
    title: 'Visa Tokutei Ginou / SSW',
    subtitle: 'Specified Skilled Worker (SSW 1 & SSW 2)',
    desc: 'Pekerja berketerampilan spesifik Jepang (manufaktur, perhotelan, pengolahan makanan, kaigo, agrikultur).',
    pricePill: 'Rp 2,65jt - 2,75jt',
    durationPill: 'Sesuai Kontrak / CoE',
    category: 'kerja',
    topRightBadge: 'Kerja Formal',
    regulerPrice: 2650000,
    premiumPrice: 2750000,
    tacPrice: 2950000,
    keterangan: 'Durasi tinggal sesuai kontrak/CoE',
  },
  {
    id: 'kunjungan-keluarga',
    title: 'Visa Kunjungan Keluarga / Teman',
    subtitle: 'Single Entry (Family / Friend Visit)',
    desc: 'Kunjungan keluarga, kerabat, atau teman di Jepang dengan surat undangan resmi (Shouheiriyuusho).',
    pricePill: 'Rp 2,75jt - 2,99jt',
    durationPill: 'Maksimal 90 Hari',
    category: 'keluarga',
    topRightBadge: 'Single Entry',
    regulerPrice: 2750000,
    premiumPrice: 2990000,
    tacPrice: 3200000,
    keterangan: 'Single Entry • Maksimal stay 90 hari',
  },
  {
    id: 'visa-student',
    title: 'Visa Student',
    subtitle: 'Kuliah & Sekolah Bahasa (Ryuugaku)',
    desc: 'Studi jangka menengah/panjang: sekolah bahasa Jepang (Nihongo Gakkou), perguruan tinggi, atau riset.',
    pricePill: 'Rp 2,65jt - 2,75jt',
    durationPill: 'Sesuai Kontrak / CoE',
    category: 'studi',
    topRightBadge: 'Studi / Edukasi',
    regulerPrice: 2650000,
    premiumPrice: 2750000,
    tacPrice: 2950000,
    keterangan: 'Durasi tinggal sesuai kontrak/CoE',
  },
  {
    id: 'visa-internship',
    title: 'Visa Internship',
    subtitle: 'Magang & Pelatihan Industri (Trainee)',
    desc: 'Program pemagangan praktik industri manufaktur, teknik, dan agrikultur Jepang via LPK / SO resmi.',
    pricePill: 'Rp 2,65jt - 2,75jt',
    durationPill: 'Sesuai Kontrak / CoE',
    category: 'magang',
    topRightBadge: 'Internship',
    regulerPrice: 2650000,
    premiumPrice: 2750000,
    tacPrice: 2950000,
    keterangan: 'Durasi tinggal sesuai kontrak/CoE',
  },
  {
    id: 'temp-visitor-single',
    title: 'Visa Temporary Visitor Single Entry',
    subtitle: 'Single Entry • Turis & Wisata',
    desc: 'Wisata, liburan, dan urusan perorangan sementara single entry dengan itinerary & dokumen finansial.',
    pricePill: 'Rp 2,75jt - 2,99jt',
    durationPill: '15 - 90 Hari',
    category: 'turis',
    topRightBadge: 'Single Entry',
    regulerPrice: 2750000,
    premiumPrice: 2990000,
    tacPrice: 3200000,
    keterangan: 'Periode stay 15-90 hari',
  },
  {
    id: 'temp-visitor-multiple',
    title: 'Visa Temporary Visitor Multiple Entry',
    subtitle: 'Multiple Entry (1 - 5 Tahun)',
    desc: 'Bebas keluar-masuk Jepang selama 1 sampai 5 tahun untuk pelancong rutin atau pebisnis.',
    pricePill: 'Rp 4,5jt - 4,85jt',
    durationPill: '15-90 Hari (1-5 Thn)',
    category: 'turis',
    topRightBadge: 'Multiple Entry',
    regulerPrice: 4500000,
    premiumPrice: 4850000,
    tacPrice: 5100000,
    keterangan: 'Multiple entry (1-5 tahun) • Durasi tinggal 15-90 hari',
  },
];

const STORAGE_KEY = 'mapahtrip_visa_prices';
const PRICING_VERSION_KEY = 'mapahtrip_visa_prices_version';
const CURRENT_PRICING_VERSION = 'v2_official_7_visas';

/**
 * Mengambil daftar tarif harga seluruh visa yang tersimpan.
 * Jika belum ada di localStorage atau versi belum diperbarui, kembalikan default resmi.
 */
export function getVisaPricingList(): VisaPricingItem[] {
  if (typeof window === 'undefined') return DEFAULT_VISA_PRICING;
  try {
    const ver = localStorage.getItem(PRICING_VERSION_KEY);
    if (ver !== CURRENT_PRICING_VERSION) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_VISA_PRICING));
      localStorage.setItem(PRICING_VERSION_KEY, CURRENT_PRICING_VERSION);
      return DEFAULT_VISA_PRICING;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_VISA_PRICING));
      localStorage.setItem(PRICING_VERSION_KEY, CURRENT_PRICING_VERSION);
      return DEFAULT_VISA_PRICING;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (e) {
    console.error('Error loading visa pricing:', e);
  }
  return DEFAULT_VISA_PRICING;
}

/**
 * Mengambil daftar harga visa dari Supabase Cloud jika tabel 'master_tarif_visa' tersedia.
 * Jika berhasil, otomatis memperbarui cache localStorage dan mentrigger update event.
 */
export async function fetchVisaPricingFromDB(): Promise<VisaPricingItem[] | null> {
  try {
    const { data, error } = await supabase
      .from('master_tarif_visa')
      .select('*')
      .order('id', { ascending: true });

    if (error || !data || data.length === 0) {
      return null;
    }

    const mapped: VisaPricingItem[] = data.map((row: any) => ({
      id: String(row.id),
      title: row.title || row.nama_visa || 'Visa Jepang',
      category: row.category || 'turis',
      regulerPrice: Number(row.reguler_price || row.regulerPrice) || 0,
      premiumPrice: Number(row.premium_price || row.premiumPrice) || 0,
      tacPrice: Number(row.tac_price || row.tacPrice) || 0,
      keterangan: row.keterangan || '',
      isCustom: Boolean(row.is_custom ?? row.isCustom),
    }));

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
      window.dispatchEvent(new CustomEvent('mapahtrip:visa-prices-updated', { detail: mapped }));
    }
    return mapped;
  } catch (err) {
    console.warn('Supabase fetchVisaPricingFromDB note:', err);
    return null;
  }
}

/**
 * Menyimpan sinkronisasi harga visa ke Supabase Cloud jika tabel master_tarif_visa ada.
 */
export async function saveVisaPricingToDB(items: VisaPricingItem[]): Promise<boolean> {
  try {
    const payload = items.map((item) => ({
      id: item.id,
      title: item.title,
      category: item.category,
      reguler_price: item.regulerPrice,
      premium_price: item.premiumPrice,
      tac_price: item.tacPrice,
      keterangan: item.keterangan || '',
      is_custom: Boolean(item.isCustom),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('master_tarif_visa').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Catatan sync Supabase master_tarif_visa (tabel belum dibuat):', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('saveVisaPricingToDB note:', err);
    return false;
  }
}

/**
 * Menghapus visa dari tabel master_tarif_visa di Supabase Cloud.
 */
export async function deleteVisaPricingFromDB(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('master_tarif_visa').delete().eq('id', id);
    if (error) {
      console.warn('deleteVisaPricingFromDB note:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('deleteVisaPricingFromDB note:', err);
    return false;
  }
}

/**
 * Menyimpan konfigurasi harga visa dari Owner ke localStorage dan Supabase Database.
 * Sekaligus mentrigger CustomEvent agar semua halaman (Customer, Admin) langsung update.
 */
export function saveVisaPricingList(items: VisaPricingItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('mapahtrip:visa-prices-updated', { detail: items }));
    // Asynchronous sync ke Supabase Database Cloud
    saveVisaPricingToDB(items).catch(() => {});
  } catch (e) {
    console.error('Error saving visa pricing:', e);
  }
}

/**
 * Mengembalikan konfigurasi harga visa ke baseline default MapahTrip.
 */
export function resetVisaPricingList(): VisaPricingItem[] {
  saveVisaPricingList(DEFAULT_VISA_PRICING);
  return DEFAULT_VISA_PRICING;
}

/**
 * Mencari nominal biaya visa berdasarkan judul program dan paket (Reguler, Premium, TAC).
 */
export function getVisaPrice(visaTitle?: string, paket: string = 'Reguler'): number {
  const list = getVisaPricingList();
  if (!visaTitle) return 2650000;
  const cleanTitle = visaTitle.toLowerCase().trim();

  // 1. Coba exact title match
  let found = list.find((item) => item.title.toLowerCase().trim() === cleanTitle);

  // 2. Coba fuzzy keyword match
  if (!found) {
    found = list.find((item) => {
      const itemTitle = item.title.toLowerCase();
      if (cleanTitle.includes('waiver') || cleanTitle.includes('evisa') || cleanTitle.includes('e-visa')) {
        return itemTitle.includes('waiver') || itemTitle.includes('evisa') || itemTitle.includes('e-visa');
      }
      if (cleanTitle.includes('multiple')) return itemTitle.includes('multiple');
      if (cleanTitle.includes('single') || cleanTitle.includes('temporary visitor single') || cleanTitle.includes('tourist single')) {
        return itemTitle.includes('single');
      }
      if (cleanTitle.includes('keluarga') || cleanTitle.includes('family') || cleanTitle.includes('teman')) {
        return itemTitle.includes('keluarga') || itemTitle.includes('teman');
      }
      if (cleanTitle.includes('student') || cleanTitle.includes('pelajar') || cleanTitle.includes('ryuugaku')) {
        return itemTitle.includes('student') || itemTitle.includes('pelajar');
      }
      if (cleanTitle.includes('internship') || cleanTitle.includes('magang') || cleanTitle.includes('kenshuusei')) {
        return itemTitle.includes('internship') || itemTitle.includes('magang');
      }
      if (cleanTitle.includes('tokutei') || cleanTitle.includes('ginou') || cleanTitle.includes('ssw')) {
        return itemTitle.includes('tokutei') || itemTitle.includes('ssw');
      }
      return false;
    });
  }

  const p = (paket || 'Reguler').toLowerCase().trim();

  if (found) {
    if (p === 'premium') return Number(found.premiumPrice) || 0;
    if (p === 'tac') return Number(found.tacPrice) || 0;
    return Number(found.regulerPrice) || 0;
  }

  // 3. Fallback default jika tidak ditemukan sama sekali
  let base = 2650000;
  if (cleanTitle.includes('waiver') || cleanTitle.includes('evisa') || cleanTitle.includes('e-visa')) {
    base = p === 'premium' ? 250000 : p === 'tac' ? 300000 : 200000;
  } else if (cleanTitle.includes('multiple')) {
    base = p === 'premium' ? 4850000 : p === 'tac' ? 5100000 : 4500000;
  } else if (cleanTitle.includes('keluarga') || cleanTitle.includes('single') || cleanTitle.includes('visitor')) {
    base = p === 'premium' ? 2990000 : p === 'tac' ? 3200000 : 2750000;
  } else {
    base = p === 'premium' ? 2750000 : p === 'tac' ? 2950000 : 2650000;
  }
  return base;
}

