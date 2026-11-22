// DAFTAR LENGKAP BANK SELURUH INDONESIA & E-WALLET
export const EWALLET_LIST = [
  'GoPay',
  'OVO',
  'DANA',
  'ShopeePay',
  'LinkAja',
  'AstraPay',
  'i.Saku (Indomaret)',
  'DOKU',
  'KasPro',
  'Sakuku (BCA)',
  'E-Wallet Lainnya',
];

export interface BankGroup {
  kategori: string;
  icon?: string;
  banks: string[];
}

export const ALL_INDONESIA_PAYMENT_GROUPS: BankGroup[] = [
  {
    kategori: '📱 Dompet Digital / E-Wallet (Semua E-Wallet Indonesia)',
    icon: 'phone_android',
    banks: EWALLET_LIST,
  },
  {
    kategori: '🏛️ Bank Utama & Himbara (BUMN)',
    icon: 'account_balance',
    banks: [
      'Bank Central Asia (BCA)',
      'Bank Mandiri',
      'Bank Rakyat Indonesia (BRI)',
      'Bank Negara Indonesia (BNI)',
      'Bank Syariah Indonesia (BSI)',
      'Bank Tabungan Negara (BTN)',
    ],
  },
  {
    kategori: '⚡ Bank Digital Populer',
    icon: 'bolt',
    banks: [
      'SeaBank Indonesia',
      'Bank Jago',
      'Blu by BCA Digital',
      'Bank Aladin Syariah',
      'Bank Raya Indonesia',
      'Allo Bank',
      'Bank Neo Commerce (BNC)',
      'Line Bank (KEB Hana)',
      'Superbank',
      'TMRW by UOB',
      'Digibank by DBS',
    ],
  },
  {
    kategori: '🏢 Bank Swasta Nasional',
    icon: 'apartment',
    banks: [
      'CIMB Niaga',
      'Bank Permata',
      'Bank Danamon Indonesia',
      'Bank Panin',
      'Bank OCBC NISP',
      'Bank Maybank Indonesia',
      'Bank Mega',
      'Bank Sinarmas',
      'Bank BTPN (Jenius)',
      'Bank UOB Indonesia',
      'Bank Commonwealth',
      'Bank HSBC Indonesia',
      'Bank DBS Indonesia',
      'Standard Chartered Bank',
      'Bank KB Bukopin',
      'Bank Mayapada',
      'Bank Victoria International',
      'Bank MNC Internasional',
      'Bank Artha Graha Internasional',
      'Bank Ganesha',
      'Bank Maspion Indonesia',
      'Bank Mestika Dharma',
      'Bank Ina Perdana',
      'Bank Sahabat Sampoerna',
      'Bank Woori Saudara',
      'Bank QNB Indonesia',
      'Bank Shinhan Indonesia',
      'Bank China Construction Bank (CCB) Indonesia',
      'Bank ICBC Indonesia',
      'Bank JTrust Indonesia',
      'Bank SBI Indonesia',
      'Bank Amar Indonesia',
      'Bank IBK Indonesia',
      'Bank Multiarta Sentosa (Bank MAS)',
      'Bank Nationalnobu (Nobu Bank)',
      'Bank Resona Perdania',
    ],
  },
  {
    kategori: '🗺️ Bank Pembangunan Daerah (BPD Seluruh Provinsi Indonesia)',
    icon: 'map',
    banks: [
      'Bank BJB (Jawa Barat & Banten)',
      'Bank BJB Syariah',
      'Bank DKI (Jakarta)',
      'Bank Jateng (Jawa Tengah)',
      'Bank Jateng Syariah',
      'Bank Jatim (Jawa Timur)',
      'Bank Jatim Syariah',
      'Bank BPD DIY (Yogyakarta)',
      'Bank BPD Bali',
      'Bank Sumut (Sumatera Utara)',
      'Bank Sumut Syariah',
      'Bank Nagari (Sumatera Barat)',
      'Bank Riau Kepri Syariah',
      'Bank Sumsel Babel (Sumatera Selatan & Bangka Belitung)',
      'Bank Sumsel Babel Syariah',
      'Bank Lampung',
      'Bank Jambi',
      'Bank Bengkulu',
      'Bank Kalbar (Kalimantan Barat)',
      'Bank Kaltimtara (Kalimantan Timur & Kaltara)',
      'Bank Kalsel (Kalimantan Selatan)',
      'Bank Kalteng (Kalimantan Tengah)',
      'Bank Sulselbar (Sulawesi Selatan & Barat)',
      'Bank SulutGo (Sulawesi Utara & Gorontalo)',
      'Bank Sulteng (Sulawesi Tengah)',
      'Bank Sultra (Sulawesi Tenggara)',
      'Bank Maluku Malut (Maluku & Maluku Utara)',
      'Bank Papua',
      'Bank NTB Syariah (Nusa Tenggara Barat)',
      'Bank NTT (Nusa Tenggara Timur)',
    ],
  },
  {
    kategori: '🕌 Bank Syariah Nasional',
    icon: 'mosque',
    banks: [
      'Bank Muamalat Indonesia',
      'BCA Syariah',
      'Bank Mega Syariah',
      'Bank BTPN Syariah',
      'Bank Panin Dubai Syariah',
      'Bank KB Bukopin Syariah',
      'Bank Victoria Syariah',
    ],
  },
  {
    kategori: 'Lainnya',
    icon: 'more_horiz',
    banks: [
      'Lainnya (Ketik Manual)',
    ],
  },
];

export const ALL_PAYMENT_CHANNELS: string[] = ALL_INDONESIA_PAYMENT_GROUPS.flatMap((g) => g.banks);

export function isEWallet(name: string): boolean {
  if (!name) return false;
  const n = name.trim().toLowerCase();
  return EWALLET_LIST.some((ew) => n.includes(ew.toLowerCase())) || n.includes('wallet') || n.includes('dana') || n.includes('gopay') || n.includes('ovo') || n.includes('shopee');
}

export function normalizeBankSelection(val: string): string {
  if (!val) return 'Bank Central Asia (BCA)';
  const clean = val.trim();
  // Exact match
  const found = ALL_PAYMENT_CHANNELS.find((b) => b.toLowerCase() === clean.toLowerCase());
  if (found) return found;

  // Short code aliases
  const upper = clean.toUpperCase();
  if (upper === 'BCA') return 'Bank Central Asia (BCA)';
  if (upper === 'BSI') return 'Bank Syariah Indonesia (BSI)';
  if (upper === 'BRI') return 'Bank Rakyat Indonesia (BRI)';
  if (upper === 'BNI') return 'Bank Negara Indonesia (BNI)';
  if (upper === 'MANDIRI') return 'Bank Mandiri';
  if (upper === 'BTN') return 'Bank Tabungan Negara (BTN)';
  if (upper === 'BJB') return 'Bank BJB (Jawa Barat & Banten)';
  if (upper === 'DKI') return 'Bank DKI (Jakarta)';
  if (upper === 'JATENG') return 'Bank Jateng (Jawa Tengah)';
  if (upper === 'JATIM') return 'Bank Jatim (Jawa Timur)';
  if (upper === 'BALI' || upper === 'BPD BALI') return 'Bank BPD Bali';
  if (upper === 'NAGARI') return 'Bank Nagari (Sumatera Barat)';
  if (upper === 'SUMUT') return 'Bank Sumut (Sumatera Utara)';
  if (upper === 'GOPAY') return 'GoPay';
  if (upper === 'OVO') return 'OVO';
  if (upper === 'DANA') return 'DANA';
  if (upper === 'SHOPEEPAY' || upper === 'SHOPEE PAY') return 'ShopeePay';
  if (upper === 'LINKAJA' || upper === 'LINK AJA') return 'LinkAja';

  // Partial match
  const partial = ALL_PAYMENT_CHANNELS.find((b) => b.toLowerCase().includes(clean.toLowerCase()));
  if (partial) return partial;

  return 'Lainnya (Ketik Manual)';
}

