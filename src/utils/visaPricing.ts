// src/utils/visaPricing.ts - Master Tarif & Penentuan Harga Layanan Visa Jepang
import { supabase } from '../lib/supabase';

export interface VisaPricingItem {
  id: string;
  title: string;
  category: 'turis' | 'kerja' | 'magang' | 'studi' | 'transit' | 'keluarga' | 'bisnis' | 'medis' | 'khusus' | string;
  regulerPrice: number; // Baseline / Jakarta
  priceJakarta?: number; // Jakarta (Kedutaan / JVAC Kuningan)
  priceSurabaya?: number; // Surabaya (Konsulat Jenderal)
  priceMedan?: number; // Medan (Konsulat Jenderal)
  priceMakassar?: number; // Makassar (Kantor Konsuler)
  priceDenpasar?: number; // Denpasar (Konsulat Bali)
  priceLuarKota?: number; // Fallback legacy
  premiumPrice: number;
  tacPrice?: number;
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
    title: 'Japan e-Visa/Waiver',
    subtitle: 'e-Paspor & Visa Waiver Registration',
    desc: 'Multiple entry (3 tahun). Maksimal stay 15 hari per kunjungan.',
    durationPill: 'Maksimal 15 Hari',
    category: 'turis',
    popularBadge: '★ TERPOPULER',
    topRightBadge: '★ TERPOPULER',
    pricePill: 'Mulai dari Rp 200rb',
    regulerPrice: 200000,
    priceJakarta: 200000,
    priceSurabaya: 200000,
    priceMedan: 200000,
    priceMakassar: 200000,
    priceDenpasar: 200000,
    priceLuarKota: 200000,
    premiumPrice: 200000,
    tacPrice: 0,
    keterangan: 'Multiple entry (3 tahun). Maksimal stay 15 hari per kunjungan.',
  },
  {
    id: 'tokutei-ginou',
    title: 'Visa Tokutei Ginou/SSW',
    subtitle: 'Specified Skilled Worker',
    desc: 'Dikunjungi keluarga/teman di Jepang? Kami siapkan surat undangan & penjamin.',
    durationPill: 'Sesuai kontrak/CoE',
    category: 'kerja',
    popularBadge: '★ TERPOPULER',
    topRightBadge: '★ TERPOPULER',
    pricePill: 'Mulai dari Rp 2,65jt - 2,75jt',
    regulerPrice: 2650000,
    priceJakarta: 2650000,
    priceSurabaya: 2700000,
    priceMedan: 2700000,
    priceMakassar: 2700000,
    priceDenpasar: 2750000,
    priceLuarKota: 2700000,
    premiumPrice: 3250000,
    tacPrice: 0,
    keterangan: 'Dikunjungi keluarga/teman di Jepang? Kami siapkan surat undangan & penjamin.',
  },
  {
    id: 'kunjungan-keluarga',
    title: 'Visa Kunjungan Keluarga/Teman',
    subtitle: 'Designated Activities',
    desc: 'Aktivitas khusus magang lanjutan, transisi visa kerja, atau magang mahasiswa universitas di Jepang, Single Entry.',
    durationPill: 'Maksimal 90 Hari',
    category: 'turis',
    topRightBadge: 'Aktivitas Khusus',
    pricePill: 'Mulai dari Rp 2,75jt - 2,99jt',
    regulerPrice: 2750000,
    priceJakarta: 2750000,
    priceSurabaya: 2800000,
    priceMedan: 2800000,
    priceMakassar: 2800000,
    priceDenpasar: 2990000,
    priceLuarKota: 2800000,
    premiumPrice: 3350000,
    tacPrice: 0,
    keterangan: 'Aktivitas khusus magang lanjutan, transisi visa kerja, atau magang mahasiswa universitas di Jepang, Single Entry.',
  },
  {
    id: 'visa-pelajar',
    title: 'Visa Student',
    subtitle: 'Specified Skilled Worker',
    desc: 'Pekerja berketerampilan spesifik: pengolahan makanan, perhotelan, perawat/kaigo, manufaktur & pertanian.',
    durationPill: 'Sesuai Kontrak / CoE',
    category: 'studi',
    topRightBadge: 'Long Stay',
    pricePill: 'Mulai dari Rp 2,65jt - 2,75jt',
    regulerPrice: 2650000,
    priceJakarta: 2650000,
    priceSurabaya: 2700000,
    priceMedan: 2700000,
    priceMakassar: 2700000,
    priceDenpasar: 2750000,
    priceLuarKota: 2700000,
    premiumPrice: 3250000,
    tacPrice: 0,
    keterangan: 'Pekerja berketerampilan spesifik: pengolahan makanan, perhotelan, perawat/kaigo, manufaktur & pertanian.',
  },
  {
    id: 'visa-magang',
    title: 'Visa Internship',
    subtitle: '5 Tahun / Multiple',
    desc: 'Untuk yang sering ke Jepang. Syarat lebih ketat, kami bantu review & strengthening.',
    durationPill: '15-90 Hari / kunjungan',
    category: 'magang',
    topRightBadge: 'Hemat Jangka Panjang',
    pricePill: 'Mulai dari Rp 2,65jt - 2,75jt',
    regulerPrice: 2650000,
    priceJakarta: 2650000,
    priceSurabaya: 2700000,
    priceMedan: 2700000,
    priceMakassar: 2700000,
    priceDenpasar: 2750000,
    priceLuarKota: 2700000,
    premiumPrice: 3250000,
    tacPrice: 0,
    keterangan: 'Untuk yang sering ke Jepang. Syarat lebih ketat, kami bantu review & strengthening.',
  },
  {
    id: 'tourist-single',
    title: 'Visa Temporary Visitor Single Entry',
    subtitle: 'e-Paspor & Reguler',
    desc: 'Cocok untuk liburan, jalan-jalan, kunjungan keluarga, atau perjalanan singkat ke Jepang. Berlaku untuk satu kali masuk.',
    durationPill: '15-90 Hari',
    category: 'turis',
    topRightBadge: 'Sekali Kunjungan',
    pricePill: 'Mulai dari Rp 2,75jt - 2,99jt',
    regulerPrice: 2750000,
    priceJakarta: 2750000,
    priceSurabaya: 2800000,
    priceMedan: 2800000,
    priceMakassar: 2800000,
    priceDenpasar: 2990000,
    priceLuarKota: 2800000,
    premiumPrice: 3350000,
    tacPrice: 0,
    keterangan: 'Cocok untuk liburan, jalan-jalan, kunjungan keluarga, atau perjalanan singkat ke Jepang. Berlaku untuk satu kali masuk.',
  },
  {
    id: 'tourist-multiple',
    title: 'Visa Temporary Visitor Multiple Entry',
    subtitle: '5 Tahun / Multiple',
    desc: 'Cocok untuk yang sering bepergian ke Jepang. Bisa digunakan untuk beberapa kali kunjungan tanpa perlu mengajukan visa baru setiap kali berkunjung.',
    durationPill: '15-90 Hari / kunjungan',
    category: 'turis',
    topRightBadge: 'Kunjungan Berulang',
    pricePill: 'Mulai dari Rp 4,5jt - 4,85jt',
    regulerPrice: 4500000,
    priceJakarta: 4500000,
    priceSurabaya: 4550000,
    priceMedan: 4550000,
    priceMakassar: 4550000,
    priceDenpasar: 4850000,
    priceLuarKota: 4550000,
    premiumPrice: 5100000,
    tacPrice: 0,
    keterangan: 'Cocok untuk yang sering bepergian ke Jepang. Bisa digunakan untuk beberapa kali kunjungan tanpa perlu mengajukan visa baru setiap kali berkunjung.',
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

export function formatPricePillRange(reguler: number, tacOrPremium?: number, premium?: number): string {
  const min = reguler || 0;
  const max = Math.max(min, Number(tacOrPremium) || 0, Number(premium) || 0);

  if (min > 0 && max > min && min !== 200000) {
    return `Mulai dari Rp ${formatNominalShort(min)} - ${formatNominalShort(max)}`;
  }
  if (min > 0) {
    return `Mulai dari Rp ${formatNominalShort(min)}`;
  }
  return 'Mulai dari Rp 0';
}

const STORAGE_KEY = 'mapahtrip_visa_prices';
const PRICING_VERSION_KEY = 'mapahtrip_visa_prices_version';
const CURRENT_PRICING_VERSION = 'v17_pure_reguler_ranges';

/**
 * Mengambil daftar tarif harga seluruh visa yang tersimpan.
 * Jika belum ada di localStorage atau versi diperbarui, kembalikan default.
 */
export function getVisaPricingList(): VisaPricingItem[] {
  if (typeof window === 'undefined') return DEFAULT_VISA_PRICING;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const ver = localStorage.getItem(PRICING_VERSION_KEY);
    if (ver !== CURRENT_PRICING_VERSION) {
      localStorage.setItem(PRICING_VERSION_KEY, CURRENT_PRICING_VERSION);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const merged = DEFAULT_VISA_PRICING.map((def) => {
              const userItem = parsed.find((p) => p.id === def.id || p.title === def.title);
              if (userItem) {
                return {
                  ...def,
                  ...userItem,
                  desc: userItem.desc || userItem.keterangan || def.desc,
                  keterangan: userItem.keterangan || userItem.desc || def.keterangan,
                  topRightBadge: userItem.topRightBadge || def.topRightBadge,
                  subtitle: userItem.subtitle || def.subtitle,
                  durationPill: userItem.durationPill || def.durationPill,
                };
              }
              return def;
            });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            return merged;
          }
        } catch { }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_VISA_PRICING));
      return DEFAULT_VISA_PRICING;
    }
    if (!raw) return DEFAULT_VISA_PRICING;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item) => {
        const isW = item.id === 'evisa-waiver' || (item.title && item.title.toLowerCase().includes('waiver'));
        if (isW) {
          const flatPrice = item.priceJakarta ?? item.regulerPrice ?? 200000;
          return {
            ...item,
            regulerPrice: flatPrice,
            priceJakarta: flatPrice,
            priceSurabaya: flatPrice,
            priceMedan: flatPrice,
            priceMakassar: flatPrice,
            priceDenpasar: flatPrice,
            priceLuarKota: flatPrice,
            premiumPrice: flatPrice,
          };
        }
        return item;
      });
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
      const cleanRowTitle = (row.title || row.nama_visa || '').toLowerCase().replace(/[\s\-_/()]/g, '');
      const existing =
        currentCached.find((c) => c.id === String(row.id)) ||
        currentCached.find((c) => (c.title || '').toLowerCase().replace(/[\s\-_/()]/g, '') === cleanRowTitle);
      const defaultItem =
        DEFAULT_VISA_PRICING.find((d) => (d.title || '').toLowerCase().replace(/[\s\-_/()]/g, '') === cleanRowTitle) ||
        DEFAULT_VISA_PRICING.find((d) => d.id === String(row.id));

      // Ekstrak meta tambahan jika disematkan di keterangan
      let extraMeta: any = {};
      let cleanDesc = row.keterangan || '';
      const metaMatch = cleanDesc.match(/<!--extra:([\s\S]*?)-->/);
      if (metaMatch) {
        try {
          extraMeta = JSON.parse(metaMatch[1]);
          cleanDesc = cleanDesc.replace(metaMatch[0], '').trim();
        } catch { }
      }

      const topRightBadge =
        extraMeta.topRightBadge ||
        row.top_right_badge ||
        row.topRightBadge ||
        existing?.topRightBadge ||
        defaultItem?.topRightBadge;

      const subtitle =
        extraMeta.subtitle ||
        existing?.subtitle ||
        row.subtitle ||
        defaultItem?.subtitle;

      const durationPill =
        extraMeta.durationPill ||
        existing?.durationPill ||
        row.duration_pill ||
        row.durationPill ||
        defaultItem?.durationPill;

      const popularBadge =
        extraMeta.popularBadge ||
        (topRightBadge && typeof topRightBadge === 'string' && topRightBadge.includes('TERPOPULER') ? '★ TERPOPULER' : undefined) ||
        existing?.popularBadge ||
        row.popular_badge ||
        row.popularBadge ||
        defaultItem?.popularBadge;

      const reg = Number(row.reguler_price ?? row.regulerPrice ?? existing?.regulerPrice ?? defaultItem?.regulerPrice ?? 0);
      const jkt = Number(extraMeta.priceJakarta ?? row.price_jakarta ?? existing?.priceJakarta ?? defaultItem?.priceJakarta ?? reg);
      const sby = Number(extraMeta.priceSurabaya ?? existing?.priceSurabaya ?? defaultItem?.priceSurabaya ?? (reg === 200000 ? 200000 : reg + 50000));
      const mdn = Number(extraMeta.priceMedan ?? existing?.priceMedan ?? defaultItem?.priceMedan ?? (reg === 200000 ? 200000 : reg + 50000));
      const mks = Number(extraMeta.priceMakassar ?? existing?.priceMakassar ?? defaultItem?.priceMakassar ?? (reg === 200000 ? 200000 : reg + 50000));
      const dps = Number(extraMeta.priceDenpasar ?? row.price_denpasar ?? existing?.priceDenpasar ?? defaultItem?.priceDenpasar ?? (reg === 200000 ? 200000 : reg + 100000));
      const luar = Number(extraMeta.priceLuarKota ?? row.price_luar_kota ?? existing?.priceLuarKota ?? sby);

      return {
        id: String(row.id),
        title: row.title || row.nama_visa || existing?.title || defaultItem?.title || 'Visa Jepang',
        category: row.category || existing?.category || defaultItem?.category || 'turis',
        subtitle: subtitle,
        desc: cleanDesc || existing?.desc || (row.keterangan ? row.keterangan : defaultItem?.desc),
        durationPill: durationPill,
        topRightBadge: topRightBadge,
        popularBadge: popularBadge,
        pricePill: existing?.pricePill || row.price_pill || row.pricePill || defaultItem?.pricePill,
        regulerPrice: reg,
        priceJakarta: jkt,
        priceSurabaya: sby,
        priceMedan: mdn,
        priceMakassar: mks,
        priceDenpasar: dps,
        priceLuarKota: luar,
        premiumPrice: Number(row.premium_price ?? row.premiumPrice ?? existing?.premiumPrice ?? defaultItem?.premiumPrice ?? 0),
        tacPrice: Number(row.tac_price ?? row.tacPrice ?? existing?.tacPrice ?? defaultItem?.tacPrice ?? 0),
        keterangan: cleanDesc || existing?.keterangan || defaultItem?.keterangan || '',
        isCustom: Boolean(row.is_custom ?? row.isCustom ?? existing?.isCustom ?? defaultItem?.isCustom),
      };
    });

    // Urutkan persis sesuai urutan prioritas 7 kartu yang ditentukan user
    const orderPriority = [
      'evisa-waiver',
      'tokutei-ginou',
      'kunjungan-keluarga',
      'visa-pelajar',
      'visa-magang',
      'tourist-single',
      'tourist-multiple',
    ];

    mapped.sort((a, b) => {
      const idxA = orderPriority.indexOf(a.id);
      const idxB = orderPriority.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return 0;
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
    const payload = items.map((item) => {
      const meta = {
        topRightBadge: item.topRightBadge,
        subtitle: item.subtitle,
        durationPill: item.durationPill,
        popularBadge: item.popularBadge,
        priceJakarta: item.priceJakarta,
        priceSurabaya: item.priceSurabaya,
        priceMedan: item.priceMedan,
        priceMakassar: item.priceMakassar,
        priceDenpasar: item.priceDenpasar,
        priceLuarKota: item.priceSurabaya || item.priceMedan || item.priceMakassar || item.priceLuarKota,
      };
      const cleanKeterangan = (item.keterangan || item.desc || '').replace(/<!--extra:[\s\S]*?-->/g, '').trim();
      const combinedKeterangan = `${cleanKeterangan} <!--extra:${JSON.stringify(meta)}-->`;

      return {
        id: item.id,
        title: item.title,
        category: item.category,
        reguler_price: item.regulerPrice,
        premium_price: item.premiumPrice,
        tac_price: Number(item.tacPrice) || 0,
        keterangan: combinedKeterangan,
        is_custom: Boolean(item.isCustom),
        updated_at: new Date().toISOString(),
      };
    });

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
    saveVisaPricingToDB(items).catch(() => { });
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

export interface ConsulatePricingConfig {
  jakarta: number;
  luarKota: number; // Medan, Surabaya, Makassar
  denpasar: number; // Denpasar (Bali)
  premiumAddon: number; // Upgrade Paket Premium (+Rp 600.000)
}

export const DEFAULT_CONSULATE_PRICING: ConsulatePricingConfig = {
  jakarta: 2650000,
  luarKota: 2700000,
  denpasar: 2750000,
  premiumAddon: 600000,
};

const CONSULATE_STORAGE_KEY = 'mapahtrip_consulate_pricing';

export function getConsulatePricing(): ConsulatePricingConfig {
  if (typeof window === 'undefined') return DEFAULT_CONSULATE_PRICING;
  try {
    const raw = localStorage.getItem(CONSULATE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        jakarta: Number(parsed.jakarta) || DEFAULT_CONSULATE_PRICING.jakarta,
        luarKota: Number(parsed.luarKota) || DEFAULT_CONSULATE_PRICING.luarKota,
        denpasar: Number(parsed.denpasar) || DEFAULT_CONSULATE_PRICING.denpasar,
        premiumAddon: Number(parsed.premiumAddon) || DEFAULT_CONSULATE_PRICING.premiumAddon,
      };
    }
  } catch { }
  return DEFAULT_CONSULATE_PRICING;
}

export function saveConsulatePricing(config: ConsulatePricingConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONSULATE_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('mapahtrip:consulate-prices-updated', { detail: config }));
  } catch { }
}

/**
 * Mencari nominal biaya visa berdasarkan judul program, paket (Reguler, Premium), dan wilayah konsulat.
 * Mengambil langsung harga spesifik wilayah per visa yang diinput oleh Owner di tabel:
 * - Jakarta: priceJakarta (default Rp 2.650.000)
 * - Medan, Surabaya, Makassar: priceLuarKota (default Rp 2.700.000)
 * - Denpasar (Bali): priceDenpasar (default Rp 2.750.000)
 * - Japan e-Visa / Waiver: Flat Rp 200.000 (100% online)
 * - Paket Premium: Harga Reguler Wilayah + Rp 600.000
 */
export function getVisaPrice(visaTitle?: string, paket: string = 'Reguler', konsulat?: string): number {
  if (!visaTitle) return 2650000;
  const cleanTitle = visaTitle.toLowerCase().trim();
  const p = (paket || 'Reguler').toLowerCase().trim();

  // 1. Japan e-Visa / Waiver (Flat 200rb, online)
  if (cleanTitle.includes('waiver') || cleanTitle.includes('evisa') || cleanTitle.includes('e-visa')) {
    return 200000;
  }

  // 2. Cari dari daftar harga per visa
  const list = getVisaPricingList();
  const found = list.find((v) => {
    const t = (v.title || '').toLowerCase().trim();
    return t === cleanTitle || cleanTitle.includes(t) || t.includes(cleanTitle);
  });

  const k = (konsulat || '').toLowerCase().trim();
  let basePrice = found?.regulerPrice || 2650000;

  if (k.includes('denpasar') || k.includes('bali')) {
    basePrice = found?.priceDenpasar ?? (found?.regulerPrice ? found.regulerPrice + 100000 : 2750000);
  } else if (k.includes('surabaya')) {
    basePrice = found?.priceSurabaya ?? found?.priceLuarKota ?? (found?.regulerPrice ? found.regulerPrice + 50000 : 2700000);
  } else if (k.includes('medan')) {
    basePrice = found?.priceMedan ?? found?.priceLuarKota ?? (found?.regulerPrice ? found.regulerPrice + 50000 : 2700000);
  } else if (k.includes('makassar')) {
    basePrice = found?.priceMakassar ?? found?.priceLuarKota ?? (found?.regulerPrice ? found.regulerPrice + 50000 : 2700000);
  } else {
    basePrice = found?.priceJakarta ?? found?.regulerPrice ?? 2650000;
  }

  // 3. Paket Premium = Harga Reguler Wilayah + 600.000
  if (p === 'premium') {
    return basePrice + 600000;
  }

  return basePrice;
}

