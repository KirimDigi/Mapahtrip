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
    id: 'tourist-single',
    title: 'Tourist Single Entry',
    subtitle: 'e-Paspor & Reguler',
    desc: 'Liburan, jalan-jalan, Sakura/Harvest. Bantuan dummy tiket & itinerary Jepang.',
    durationPill: '15-90 Hari',
    category: 'turis',
    topRightBadge: 'Paling Populer',
    pricePill: 'Mulai dari Rp 2,75jt - 2,99jt',
    regulerPrice: 2750000,
    premiumPrice: 2990000,
    tacPrice: 3200000,
    keterangan: 'e-Paspor & Reguler, 15-90 Hari kunjungan',
  },
  {
    id: 'tourist-multiple',
    title: 'Tourist Multiple Entry',
    subtitle: '5 Tahun / Multiple',
    desc: 'Untuk yang sering ke Jepang. Syarat lebih ketat, kami bantu review & strengthening.',
    durationPill: '15-90 Hari / kunjungan',
    category: 'turis',
    topRightBadge: 'Hemat Jangka Panjang',
    pricePill: 'Mulai dari Rp 4,5jt - 4,85jt',
    regulerPrice: 4500000,
    premiumPrice: 4850000,
    tacPrice: 5100000,
    keterangan: '5 Tahun / Multiple Entry, 15-90 Hari per kunjungan',
  },
  {
    id: 'evisa-waiver',
    title: 'Japan e-Visa / Waiver',
    subtitle: 'e-Paspor & Visa Waiver Registration',
    desc: 'Multiple entry (3 tahun). Maksimal stay 15 hari per kunjungan.',
    durationPill: 'Maksimal 15 Hari',
    category: 'turis',
    popularBadge: '★ TERPOPULER',
    topRightBadge: '100% Online',
    pricePill: 'Mulai dari Rp 200rb',
    regulerPrice: 200000,
    premiumPrice: 250000,
    tacPrice: 300000,
    keterangan: 'Multiple entry (3 tahun). Maksimal stay 15 hari per kunjungan',
  },
  {
    id: 'tokutei-ginou',
    title: 'Tokutei Ginou (SSW 1)',
    subtitle: 'Specified Skilled Worker',
    desc: 'Pekerja berketerampilan spesifik: pengolahan makanan, perhotelan, perawat/kaigo, manufaktur & pertanian.',
    durationPill: 'Sesuai Kontrak / CoE',
    category: 'kerja',
    popularBadge: '★ TERPOPULER',
    topRightBadge: '★ TERPOPULER',
    pricePill: 'Mulai dari Rp 2,65jt - 2,75jt',
    regulerPrice: 2650000,
    premiumPrice: 2750000,
    tacPrice: 2950000,
    keterangan: 'Specified Skilled Worker (SSW 1 & SSW 2)',
  },
  {
    id: 'visa-magang',
    title: 'Visa Magang (Kenshuusei)',
    subtitle: 'Trainee / Pemagangan Jepang',
    desc: 'Program pemagangan industri manufaktur, teknik, dan agrikultur Jepang via LPK / SO resmi berizin.',
    durationPill: 'Sesuai Kontrak / CoE',
    category: 'magang',
    topRightBadge: 'Pemagangan',
    pricePill: 'Mulai dari Rp 2,65jt - 2,75jt',
    regulerPrice: 2650000,
    premiumPrice: 2750000,
    tacPrice: 2950000,
    keterangan: 'Trainee / Pemagangan Jepang',
  },
  {
    id: 'tekutei-katsudou',
    title: 'Tekutei Katsudou',
    subtitle: 'Designated Activities',
    desc: 'Aktivitas khusus magang lanjutan, transisi visa kerja, atau magang mahasiswa universitas di Jepang.',
    durationPill: '6 Bulan - 1 Tahun',
    category: 'khusus',
    topRightBadge: 'Aktivitas Khusus',
    pricePill: 'Mulai dari Rp 1,65jt',
    regulerPrice: 1650000,
    premiumPrice: 1900000,
    tacPrice: 2150000,
    keterangan: 'Designated Activities (Aktivitas Khusus)',
  },
  {
    id: 'kunjungan-keluarga',
    title: 'Kunjungan Keluarga / Teman',
    subtitle: 'Family / Friend Visit',
    desc: 'Dikunjungi keluarga/teman di Jepang? Kami siapkan surat undangan & penjamin.',
    durationPill: 'Maksimal 90 Hari',
    category: 'keluarga',
    topRightBadge: 'Visit',
    pricePill: 'Mulai dari Rp 2,75jt - 2,99jt',
    regulerPrice: 2750000,
    premiumPrice: 2990000,
    tacPrice: 3200000,
    keterangan: 'Family / Friend Visit (Shouheiriyuusho)',
  },
  {
    id: 'visa-bisnis',
    title: 'Visa Bisnis',
    subtitle: 'Business / Meeting',
    desc: 'Meeting, conference, negosiasi. Dokumen perusahaan Jepang & Indonesia kami cek lengkap.',
    durationPill: '15-90 Hari',
    category: 'bisnis',
    topRightBadge: 'Business',
    pricePill: 'Mulai dari Rp 950rb',
    regulerPrice: 950000,
    premiumPrice: 1200000,
    tacPrice: 1450000,
    keterangan: 'Business, Meeting, Negosiasi Perusahaan',
  },
  {
    id: 'visa-pelajar',
    title: 'Visa Pelajar / Student',
    subtitle: 'Student & Language School',
    desc: 'Untuk sekolah bahasa, kuliah, dan research. Bantuan CoE & dokumen pendukung.',
    durationPill: 'Sesuai Kontrak / CoE',
    category: 'studi',
    topRightBadge: 'Long Stay',
    pricePill: 'Mulai dari Rp 2,65jt - 2,75jt',
    regulerPrice: 2650000,
    premiumPrice: 2750000,
    tacPrice: 2950000,
    keterangan: 'Kuliah & Sekolah Bahasa (Ryuugaku)',
  },
  {
    id: 'visa-transit',
    title: 'Visa Transit',
    subtitle: 'Transit & Shore Pass',
    desc: 'Transit Jepang atau stopover. Proses cepat, tidak perlu dummy hotel lama.',
    durationPill: '3-15 Hari',
    category: 'transit',
    topRightBadge: 'Transit',
    pricePill: 'Mulai dari Rp 550rb',
    regulerPrice: 550000,
    premiumPrice: 800000,
    tacPrice: 1050000,
    keterangan: 'Transit & Shore Pass (maks 15 hari)',
  },
  {
    id: 'visa-dependent',
    title: 'Visa Dependent / Spouse',
    subtitle: 'Spouse / Child of Japanese',
    desc: 'Pendamping keluarga, spouse of Japanese, COE dependent. Pendampingan dokumen sensitif.',
    durationPill: 'Long Term',
    category: 'keluarga',
    topRightBadge: 'Keluarga',
    pricePill: 'Mulai dari Rp 1,3jt',
    regulerPrice: 1300000,
    premiumPrice: 1550000,
    tacPrice: 1800000,
    keterangan: 'Spouse / Child of Japanese (CoE Dependent)',
  },
];

export function formatNominalShort(val: number): string {
  if (!val || val <= 0) return '0';
  if (val >= 1000000) {
    const num = val / 1000000;
    const formatted = parseFloat(num.toFixed(2)).toString().replace('.', ',');
    return `${formatted}jt`;
  }
  return `${Math.round(val / 1000)}rb`;
}

export function formatPricePillRange(reguler: number, tac?: number, premium?: number): string {
  const min = reguler || 0;
  const max = Math.max(min, Number(tac) || 0, Number(premium) || 0);

  if (min > 0 && max > min) {
    return `Mulai dari Rp ${formatNominalShort(min)} - ${formatNominalShort(max)}`;
  }
  if (min > 0) {
    return `Mulai dari Rp ${formatNominalShort(min)}`;
  }
  return 'Mulai dari Rp 0';
}

const STORAGE_KEY = 'mapahtrip_visa_prices';
const PRICING_VERSION_KEY = 'mapahtrip_visa_prices_version';
const CURRENT_PRICING_VERSION = 'v7_tokutei_featured_badge';

/**
 * Mengambil daftar tarif harga seluruh visa yang tersimpan.
 * Jika belum ada di localStorage atau versi diperbarui, kembalikan default.
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
    if (!raw) return DEFAULT_VISA_PRICING;
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

    const currentCached = getVisaPricingList();

    const mapped: VisaPricingItem[] = data.map((row: any) => {
      const existing = currentCached.find((c) => c.id === String(row.id));
      const defaultItem = DEFAULT_VISA_PRICING.find((d) => d.id === String(row.id));

      return {
        id: String(row.id),
        title: row.title || row.nama_visa || existing?.title || defaultItem?.title || 'Visa Jepang',
        category: row.category || existing?.category || defaultItem?.category || 'turis',
        subtitle: row.subtitle || existing?.subtitle || defaultItem?.subtitle,
        desc: row.desc || existing?.desc || defaultItem?.desc,
        durationPill: row.duration_pill || row.durationPill || existing?.durationPill || defaultItem?.durationPill,
        topRightBadge: row.top_right_badge || row.topRightBadge || existing?.topRightBadge || defaultItem?.topRightBadge,
        popularBadge: row.popular_badge || row.popularBadge || existing?.popularBadge || defaultItem?.popularBadge,
        pricePill: row.price_pill || row.pricePill || existing?.pricePill || defaultItem?.pricePill,
        regulerPrice: Number(row.reguler_price ?? row.regulerPrice ?? existing?.regulerPrice ?? defaultItem?.regulerPrice ?? 0),
        premiumPrice: Number(row.premium_price ?? row.premiumPrice ?? existing?.premiumPrice ?? defaultItem?.premiumPrice ?? 0),
        tacPrice: Number(row.tac_price ?? row.tacPrice ?? existing?.tacPrice ?? defaultItem?.tacPrice ?? 0),
        keterangan: row.keterangan || existing?.keterangan || defaultItem?.keterangan || '',
        isCustom: Boolean(row.is_custom ?? row.isCustom ?? existing?.isCustom ?? defaultItem?.isCustom),
      };
    });

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
  if (!visaTitle) return 1650000;
  const cleanTitle = visaTitle.toLowerCase().trim();

  // 1. Coba exact title match
  let found = list.find((item) => item.title.toLowerCase().trim() === cleanTitle);

  // 2. Coba fuzzy keyword match
  if (!found) {
    found = list.find((item) => {
      const itemTitle = item.title.toLowerCase();
      if (cleanTitle.includes('waiver') || cleanTitle.includes('evisa')) {
        return itemTitle.includes('waiver') || itemTitle.includes('evisa');
      }
      if (cleanTitle.includes('multiple')) return itemTitle.includes('multiple');
      if (cleanTitle.includes('single')) return itemTitle.includes('single');
      if (cleanTitle.includes('keluarga') || cleanTitle.includes('family')) {
        return itemTitle.includes('keluarga') || itemTitle.includes('family');
      }
      if (cleanTitle.includes('bisnis') || cleanTitle.includes('business')) {
        return itemTitle.includes('bisnis');
      }
      if (cleanTitle.includes('pelajar') || cleanTitle.includes('student') || cleanTitle.includes('ryuugaku')) {
        return itemTitle.includes('pelajar');
      }
      if (cleanTitle.includes('transit')) return itemTitle.includes('transit');
      if (cleanTitle.includes('dependent') || cleanTitle.includes('spouse')) {
        return itemTitle.includes('dependent');
      }
      if (cleanTitle.includes('magang') || cleanTitle.includes('kenshuusei')) {
        return itemTitle.includes('magang');
      }
      if (cleanTitle.includes('tekutei')) return itemTitle.includes('tekutei');
      if (cleanTitle.includes('tokutei') || cleanTitle.includes('ginou') || cleanTitle.includes('ssw')) {
        return itemTitle.includes('tokutei');
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
  if (cleanTitle.includes('waiver') || cleanTitle.includes('evisa')) {
    return p === 'premium' ? 250000 : p === 'tac' ? 300000 : 200000;
  }
  if (cleanTitle.includes('multiple')) {
    return p === 'premium' ? 4850000 : p === 'tac' ? 5100000 : 4500000;
  }
  if (cleanTitle.includes('single') || cleanTitle.includes('keluarga') || cleanTitle.includes('family')) {
    return p === 'premium' ? 2990000 : p === 'tac' ? 3200000 : 2750000;
  }
  if (cleanTitle.includes('transit')) {
    return p === 'premium' ? 800000 : p === 'tac' ? 1050000 : 550000;
  }
  if (cleanTitle.includes('bisnis')) {
    return p === 'premium' ? 1200000 : p === 'tac' ? 1450000 : 950000;
  }
  if (cleanTitle.includes('dependent')) {
    return p === 'premium' ? 1550000 : p === 'tac' ? 1800000 : 1300000;
  }

  // SSW, Magang, Student
  return p === 'premium' ? 2750000 : p === 'tac' ? 2950000 : 2650000;
}

