import React, { useState, useMemo, useEffect } from 'react';
import type { Pengajuan, AffiliateUser, StatusPengajuan } from '../types';
import logoPutih from '../assets/mapahtrip_logo_putih.png';
import { handleImageFallback, getLogoPutihFallbacks } from '../utils/imageFallbacks';
import { REAL_AFFILIATE_LEADERBOARD } from '../data/affiliateLeaderboardData';
import {
  supabase,
  registerMitraInDB,
  loginMitraFromDB,
  updateMitraProfileInDB,
  updateMitraBankInDB,
  fetchAllMitraFromDB,
} from '../lib/supabase';

interface AffiliatePortalProps {
  pengajuanList: Pengajuan[];
  onSwitchMode: (mode: 'customer' | 'admin') => void;
  onUpdateBerkas?: (
    id: string,
    berkasKey: keyof Pengajuan['berkas'],
    value: boolean
  ) => void;
  onUpdateStage?: (
    id: string,
    stageData: {
      tglBerkasMasuk?: string;
      tglApply?: string;
      tglSelesai?: string;
      tglKirim?: string;
      status?: StatusPengajuan;
      noResi?: string;
    }
  ) => void;
}


const PROVINSI_LIST = [
  'Aceh', 'Bali', 'Banten', 'Bengkulu', 'DI Yogyakarta', 'DKI Jakarta',
  'Gorontalo', 'Jambi', 'Jawa Barat', 'Jawa Tengah', 'Jawa Timur',
  'Kalimantan Barat', 'Kalimantan Selatan', 'Kalimantan Tengah', 'Kalimantan Timur', 'Kalimantan Utara',
  'Kepulauan Bangka Belitung', 'Kepulauan Riau', 'Lampung', 'Maluku', 'Maluku Utara',
  'Nusa Tenggara Barat', 'Nusa Tenggara Timur', 'Papua', 'Papua Barat', 'Papua Barat Daya',
  'Papua Pegunungan', 'Papua Selatan', 'Papua Tengah', 'Riau', 'Sulawesi Barat',
  'Sulawesi Selatan', 'Sulawesi Tengah', 'Sulawesi Tenggara', 'Sulawesi Utara',
  'Sumatera Barat', 'Sumatera Selatan', 'Sumatera Utara'
];

const STATUS_MITRA_LIST = [
  'Umum',
  'LPK (Lembaga Pelatihan Kerja ke Jepang)',
  'Biro Perjalanan / Agen Tour & Travel',
  'Alumni / Pekerja di Jepang (Tokutei Ginou / Magang)',
  'Sekolah Bahasa Jepang / Lembaga Kursus',
  'Konsultan Visa / Agen Independen',
  'Komunitas Jepang di Indonesia'
];

const JENIS_IDENTITAS_LIST = [
  'KTP (Kartu Tanda Penduduk)'
];

const EWALLET_LIST = [
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

const BANK_INDONESIA_GROUPS = [
  {
    kategori: 'Bank Utama & Himbara (BUMN)',
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
    kategori: 'Bank Swasta Nasional',
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
    kategori: 'Bank Digital Populer',
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
    kategori: 'Bank Pembangunan Daerah (BPD Seluruh Indonesia)',
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
      'Bank Sumsel Babel',
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
      'Bank Maluku Malut',
      'Bank Papua',
      'Bank NTB Syariah',
      'Bank NTT',
    ],
  },
  {
    kategori: 'Bank Syariah Nasional',
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
    banks: [
      'Bank Lainnya',
    ],
  },
];

export const DEMO_MITRA_USER: AffiliateUser = {
  id: 'aff_demo',
  nama: 'LPK Nusantara Mandiri (Demo)',
  email: 'demo@mapahtrip.id',
  noWa: '081234567890',
  affiliateCode: 'DEMO-LPK',
  kategori: 'LPK',
  statusMitra: 'LPK (Lembaga Pelatihan Kerja ke Jepang)',
  lembaga: 'LPK Nusantara Mandiri',
  alamat: 'Jl. Merdeka No. 45, Jakarta Selatan',
  provinsi: 'DKI Jakarta',
  namaBank: 'Bank Central Asia (BCA)',
  nomorRekening: '8830129841',
  atasNamaRekening: 'LPK NUSANTARA MANDIRI',
  createdAt: '2026-01-15T08:00:00Z',
  isProfileComplete: true,
  isDemo: true,
};

export const DEMO_APPLICANTS: Pengajuan[] = [
  {
    id: 'demo-1',
    noPengajuan: 'MT-0205',
    namaPemohon: 'Dimas Arya Pratama',
    noPaspor: 'E8291044',
    maskedPaspor: 'E82***44',
    noTelp: '081298765432',
    konsjen: 'Jakarta',
    staffPic: 'Nanami Kay',
    program: 'Tokutei Ginou (SSW)',
    paket: 'Reguler',
    tglBerkasMasuk: '2026-10-18',
    tglApply: '2026-10-20',
    tglEstimasiSelesai: '2026-10-27',
    tglSelesai: '2026-10-27',
    tglKirim: '2026-10-28',
    status: 'Selesai',
    noResi: 'JN-88392019283 (Terkirim)',
    affiliateCode: 'DEMO-LPK',
    dibayarPemohon: 1650000,
    nominalKeluar: 1100000,
    cashback: 100000,
    feeBersih: 450000,
    referralFee: 100000,
    statusPembayaran: 'Lunas',
    berkas: {
      formVisa: true,
      ktp: true,
      ektln: true,
      coe: true,
      foto: true,
      pasporFisik: true,
    },
    catatan: 'Handover di kantor pusat atau ekspedisi aman JNE YES.',
  },
  {
    id: 'demo-2',
    noPengajuan: 'MT-0206',
    namaPemohon: 'Siti Nurhaliza',
    noPaspor: 'E9382103',
    maskedPaspor: 'E93***03',
    noTelp: '085712349876',
    konsjen: 'Surabaya',
    staffPic: 'Nanami Kay',
    program: 'Tokutei Ginou (Kaigo)',
    paket: 'Premium',
    tglBerkasMasuk: '2026-10-25',
    tglApply: '2026-10-27',
    tglEstimasiSelesai: '2026-11-03',
    tglSelesai: '2026-11-03',
    tglKirim: '',
    status: 'Siap Ambil',
    noResi: 'Jadwal Handover Soetta T3 (12 Nov 2026)',
    affiliateCode: 'DEMO-LPK',
    dibayarPemohon: 2200000,
    nominalKeluar: 1500000,
    cashback: 100000,
    feeBersih: 600000,
    referralFee: 100000,
    statusPembayaran: 'Lunas',
    berkas: {
      formVisa: true,
      ktp: true,
      ektln: true,
      coe: true,
      foto: true,
      pasporFisik: true,
    },
    catatan: 'Visa terbit, menunggu jadwal keberangkatan & handover bandara.',
  },
  {
    id: 'demo-3',
    noPengajuan: 'MT-0207',
    namaPemohon: 'Rendy Aditya Kurniawan',
    noPaspor: 'B4729108',
    maskedPaspor: 'B47***08',
    noTelp: '082188992211',
    konsjen: 'Jakarta',
    staffPic: 'Nanami Kay',
    program: 'Engineer / Specialist in Humanities',
    paket: 'Reguler',
    tglBerkasMasuk: '2026-10-28',
    tglApply: '2026-10-30',
    tglEstimasiSelesai: '2026-11-08',
    status: 'Sedang Diproses',
    affiliateCode: 'DEMO-LPK',
    dibayarPemohon: 1650000,
    nominalKeluar: 1100000,
    cashback: 100000,
    feeBersih: 450000,
    referralFee: 100000,
    statusPembayaran: 'Lunas',
    berkas: {
      formVisa: true,
      ktp: true,
      ektln: false,
      coe: true,
      foto: true,
      pasporFisik: true,
    },
    catatan: 'Dokumen sedang dalam verifikasi Kedutaan Jepang di Jakarta.',
  },
  {
    id: 'demo-4',
    noPengajuan: 'MT-0208',
    namaPemohon: 'Farhan Maulana',
    noPaspor: 'E1049283',
    maskedPaspor: 'E10***83',
    noTelp: '081377889900',
    konsjen: 'Jakarta',
    staffPic: 'Nanami Kay',
    program: 'Tokutei Ginou (Konstruksi)',
    paket: 'Reguler',
    tglBerkasMasuk: '2026-11-02',
    tglApply: '',
    tglEstimasiSelesai: '2026-11-12',
    status: 'Sedang Diproses',
    affiliateCode: 'DEMO-LPK',
    dibayarPemohon: 1650000,
    nominalKeluar: 1100000,
    cashback: 100000,
    feeBersih: 450000,
    referralFee: 100000,
    statusPembayaran: 'Lunas',
    berkas: {
      formVisa: true,
      ktp: true,
      ektln: true,
      coe: true,
      foto: true,
      pasporFisik: true,
    },
    catatan: 'Berkas fisik sudah tiba di kantor MapahTrip, dijadwalkan submit JVAC.',
  },
  {
    id: 'demo-5',
    noPengajuan: 'MT-0209',
    namaPemohon: 'Bella Anatasya',
    noPaspor: 'B3901924',
    maskedPaspor: 'B39***24',
    noTelp: '087811223344',
    konsjen: 'Jakarta',
    staffPic: 'Nanami Kay',
    program: 'Tokutei Ginou (Pertanian)',
    paket: 'Reguler',
    tglBerkasMasuk: '',
    tglApply: '',
    tglEstimasiSelesai: '2026-11-15',
    status: 'Menunggu Verifikasi',
    affiliateCode: 'DEMO-LPK',
    dibayarPemohon: 1650000,
    nominalKeluar: 1100000,
    cashback: 100000,
    feeBersih: 450000,
    referralFee: 100000,
    statusPembayaran: 'Menunggu Pembayaran',
    berkas: {
      formVisa: true,
      ktp: true,
      ektln: true,
      coe: true,
      foto: true,
      pasporFisik: false,
    },
    catatan: 'Menunggu pengiriman paspor fisik dari pemohon.',
  },
];

export const AffiliatePortal: React.FC<AffiliatePortalProps> = ({
  pengajuanList,
  onSwitchMode,
  onUpdateBerkas,
}) => {
  // Sinkronisasi lokal saat ada pemohon mendaftar dari tab lain
  const [localVersion, setLocalVersion] = useState(0);
  useEffect(() => {
    const handleStorage = () => setLocalVersion((v) => v + 1);
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<AffiliateUser | null>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      if (hash.includes('demo') || search.includes('demo')) {
        return DEMO_MITRA_USER;
      }
    }
    try {
      const saved = localStorage.getItem('mapahtrip_current_affiliate');
      if (saved) {
        const parsed = JSON.parse(saved);
        if ((parsed.id === 'aff_demo' || parsed.email === 'demo@mapahtrip.id') && !parsed.affiliateCode) {
          parsed.affiliateCode = 'DEMO-LPK';
          parsed.isProfileComplete = true;
          parsed.isDemo = true;
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  // Auth Mode: 'register' or 'login'
  const [authMode, setAuthMode] = useState<'register' | 'login'>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      if (hash.includes('login') || hash.includes('masuk') || search.includes('login')) {
        return 'login';
      }
    }
    return 'register';
  });

  // Sync authMode & demo mode when hash changes in URL
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      if (hash.includes('demo') || search.includes('demo')) {
        setCurrentUser(DEMO_MITRA_USER);
        setOnboardingView('dashboard');
      } else if (hash.includes('login') || hash.includes('masuk') || search.includes('login')) {
        setCurrentUser((prev) => (prev?.isDemo || prev?.id === 'aff_demo' ? null : prev));
        setAuthMode('login');
        setAuthError('');
      } else if (hash.includes('register') || hash.includes('daftar')) {
        setCurrentUser((prev) => (prev?.isDemo || prev?.id === 'aff_demo' ? null : prev));
        setAuthMode('register');
        setAuthError('');
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleStartDemoMode = () => {
    setCurrentUser(DEMO_MITRA_USER);
    setOnboardingView('dashboard');
    window.location.hash = '#affiliate-demo';
  };

  // Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regAgree, setRegAgree] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showTermsInline, setShowTermsInline] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [authError, setAuthError] = useState('');
  const [authSuccessMsg] = useState('');

  // Sinkronisasi data mitra dari Supabase Cloud saat pertama kali dimuat
  useEffect(() => {
    fetchAllMitraFromDB().then((dbMitra) => {
      if (dbMitra && dbMitra.length > 0) {
        try {
          const localStr = localStorage.getItem('mapahtrip_all_affiliates');
          const localUsers: AffiliateUser[] = localStr ? JSON.parse(localStr) : [];
          const userMap = new Map<string, AffiliateUser>();
          localUsers.forEach((u) => userMap.set(u.email.toLowerCase(), u));
          dbMitra.forEach((u) => userMap.set(u.email.toLowerCase(), u));
          localStorage.setItem('mapahtrip_all_affiliates', JSON.stringify(Array.from(userMap.values())));
        } catch {
          // ignore
        }
      }
    });
  }, []);

  // Dashboard Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedKandidat, setSelectedKandidat] = useState<Pengajuan | null>(null);
  const [activeTab, setActiveTab] = useState<'kandidat' | 'jadwal'>('kandidat');
  const [copiedCode, setCopiedCode] = useState(false);
  // Onboarding & Profile Verification State (Nurul Fikri / Visa Partner Form)
  const [profileStatus, setProfileStatus] = useState('');
  const [profileNama, setProfileNama] = useState('');
  const [profileLembaga, setProfileLembaga] = useState('');
  const [profileNoWa, setProfileNoWa] = useState('');
  const [profileAlamat, setProfileAlamat] = useState('');
  const [profileProvinsi, setProfileProvinsi] = useState('');
  const [profileJenisIdentitas, setProfileJenisIdentitas] = useState('KTP (Kartu Tanda Penduduk)');
  const [profileNomorIdentitas, setProfileNomorIdentitas] = useState('');
  const [profileAkunIg, setProfileAkunIg] = useState('');
  const [profileFollowerIg, setProfileFollowerIg] = useState('');
  const [pencairanKategori, setPencairanKategori] = useState<'bank' | 'ewallet' | ''>(() => {
    if (currentUser?.namaBank) {
      return EWALLET_LIST.some((ew) => ew.toLowerCase() === currentUser.namaBank?.toLowerCase())
        ? 'ewallet'
        : 'bank';
    }
    return '';
  });
  const [bankNama, setBankNama] = useState(currentUser?.namaBank || '');
  const [bankNomor, setBankNomor] = useState(currentUser?.nomorRekening || '');
  const [bankAtasNama, setBankAtasNama] = useState(currentUser?.atasNamaRekening || '');
  const [bankSavedMsg, setBankSavedMsg] = useState('');
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [bankCopied, setBankCopied] = useState(false);
  const [showNotRegisteredToast, setShowNotRegisteredToast] = useState(false);
  const toastTimerRef = React.useRef<any>(null);
  const [profileError, setProfileError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [successReferralModal, setSuccessReferralModal] = useState<{
    isOpen: boolean;
    code: string;
    nama: string;
  } | null>(null);
  const [copiedSuccessCode, setCopiedSuccessCode] = useState(false);
  const [registeredSuccessModal, setRegisteredSuccessModal] = useState<AffiliateUser | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showNotifPopover, setShowNotifPopover] = useState(false);

  // Tutup Popover Notifikasi dengan tombol Esc / Escape
  useEffect(() => {
    if (!showNotifPopover) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNotifPopover(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showNotifPopover]);

  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('mapahtrip_read_notifs') || '[]');
    } catch {
      return [];
    }
  });
  const [notifFilter, setNotifFilter] = useState<'all' | 'new' | 'status' | 'fee'>('all');
  const [showLiveCustomerToast, setShowLiveCustomerToast] = useState(true);
  const [isNotifBannerDismissed, setIsNotifBannerDismissed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [registrationSuccessData, setRegistrationSuccessData] = useState<{
    code: string;
    nama: string;
    ktp: string;
    status: string;
    lembaga?: string;
    akunIg?: string;
  } | null>(null);

  // NFIC-style Menu / Tab State for Partner Onboarding
  const [onboardingView, setOnboardingView] = useState<'menu' | 'form' | 'dashboard'>('menu');
  const [portalTab, setPortalTab] = useState<'dasbor' | 'mpc'>('dasbor');
  const [partnerSubTab, setPartnerSubTab] = useState<'informasi' | 'insentif' | 'peringkat'>('informasi');
  const [selectedBuktiTransfer, setSelectedBuktiTransfer] = useState<{
    id: string;
    noRef: string;
    tanggalTransfer: string;
    namaPemohon: string;
    programVisa: string;
    konsulat: string;
    nominal: number;
    namaBank: string;
    nomorRekening: string;
    atasNama: string;
    status: 'Berhasil Ditransfer' | 'Menunggu Proses Visa';
    tglSelesaiVisa?: string;
    metode: string;
    buktiTransferUrl?: string;
    transferredBy?: string;
  } | null>(null);
  const [filterTransferStatus, setFilterTransferStatus] = useState<'all' | 'selesai' | 'pending'>('all');

  // Real Leaderboard State (Spreadsheet MapahTrip)
  const [leaderboardFilter, setLeaderboardFilter] = useState<'all' | 'top10' | 'lpk' | 'individu'>('all');
  const [leaderboardSearch, setLeaderboardSearch] = useState('');
  const [copiedLeaderboardCode, setCopiedLeaderboardCode] = useState<string | null>(null);

  // Filtered Leaderboard Data Real (Murni Mitra Luar Berprestasi)
  const filteredLeaderboard = useMemo(() => {
    return REAL_AFFILIATE_LEADERBOARD.filter((item) => {
      // 1. Staff MapahTrip internal kantor selalu disembunyikan 100% dari leaderboard mitra
      if (item.isStaff || item.kategori === 'Staff') return false;

      // 2. Mitra dengan nilai 0 (belum ada visa selesai & belum ada insentif) disembunyikan dari leaderboard
      if (item.nominal <= 0 && item.totalVisaApproved <= 0) return false;

      // Filter kategori / rank
      if (leaderboardFilter === 'top10' && item.rank > 10) return false;
      if (leaderboardFilter === 'lpk' && item.kategori !== 'LPK') return false;
      if (leaderboardFilter === 'individu' && item.kategori !== 'Individu') return false;

      if (leaderboardSearch.trim()) {
        const q = leaderboardSearch.toLowerCase();
        return (
          item.nama.toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q) ||
          item.kategori.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [leaderboardFilter, leaderboardSearch]);

  // Format Rupiah Helper
  const formatRupiah = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
  };


  // State override ceklis berkas interaktif secara realtime (0ms lag)
  const [localBerkasOverrides, setLocalBerkasOverrides] = useState<Record<string, Partial<Pengajuan['berkas']>>>({});

  const getCandidateBerkas = (item: Pengajuan) => {
    const overrides = localBerkasOverrides[item.id] || {};
    return {
      formVisa: overrides.formVisa !== undefined ? overrides.formVisa : Boolean(item.berkas?.formVisa),
      ktp: overrides.ktp !== undefined ? overrides.ktp : Boolean(item.berkas?.ktp),
      ektln: overrides.ektln !== undefined ? overrides.ektln : Boolean(item.berkas?.ektln),
      coe: overrides.coe !== undefined ? overrides.coe : Boolean(item.berkas?.coe),
      foto: overrides.foto !== undefined ? overrides.foto : Boolean(item.berkas?.foto),
    };
  };

  // Handler interaktif untuk ceklis berkas mandiri (FORM, KTP, KTLN, COE, FOTO)
  const handleToggleBerkas = (
    item: Pengajuan,
    key: 'formVisa' | 'ktp' | 'ektln' | 'coe' | 'foto'
  ) => {
    const currentStatus = getCandidateBerkas(item);
    const newVal = !currentStatus[key];

    // 1. Simpan ke local state override instan
    setLocalBerkasOverrides((prev) => ({
      ...prev,
      [item.id]: {
        ...(prev[item.id] || item.berkas || {}),
        [key]: newVal,
      },
    }));

    // 2. Beritahu App.tsx state
    if (onUpdateBerkas) {
      onUpdateBerkas(item.id, key, newVal);
    }

    // 3. Simpan permanen ke localStorage
    try {
      const raw = localStorage.getItem('mapahtrip_local_registrations');
      if (raw) {
        const localList: Pengajuan[] = JSON.parse(raw);
        const updated = localList.map((p) =>
          p.id === item.id ? { ...p, berkas: { ...p.berkas, [key]: newVal } } : p
        );
        localStorage.setItem('mapahtrip_local_registrations', JSON.stringify(updated));
      }
    } catch {}

    // 4. Update modal detail jika aktif
    if (selectedKandidat && selectedKandidat.id === item.id) {
      setSelectedKandidat((prev) =>
        prev
          ? {
              ...prev,
              berkas: { ...prev.berkas, [key]: newVal },
            }
          : null
      );
    }

    // 5. Sinkronisasi ke Supabase
    try {
      const dbColMap: Record<string, string> = {
        formVisa: 'form_visa',
        ktp: 'ktp',
        ektln: 'ektln',
        coe: 'coe',
        foto: 'foto',
      };
      const col = dbColMap[key];
      const numId = Number(item.id);
      if (col && !isNaN(numId)) {
        supabase
          .from('pengajuan_visa')
          .update({ [col]: newVal, updated_at: new Date().toISOString() })
          .eq('id', numId)
          .then();
      }
    } catch (err) {
      console.warn('Sync toggle note:', err);
    }
  };

  // State override tahapan pengajuan (Sampai, Proses, Selesai, Kirim) secara realtime
  const [localStageOverrides] = useState<
    Record<
      string,
      {
        tglSampai?: string;
        tglProses?: string;
        tglSelesai?: string;
        tglKirim?: string;
        noResi?: string;
        status?: StatusPengajuan;
      }
    >
  >(() => {
    try {
      const saved = localStorage.getItem('mapahtrip_stage_overrides');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const getTodayFormatted = () => {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    return `${d}/${m}/${y}`;
  };

  const getCandidateStages = (item: Pengajuan) => {
    const ov = localStageOverrides[item.id] || {};
    const tglSampai = ov.tglSampai !== undefined ? ov.tglSampai : (item.tglBerkasMasuk || '');
    const tglProses = ov.tglProses !== undefined ? ov.tglProses : (item.tglApply || '');
    const tglSelesai = ov.tglSelesai !== undefined ? ov.tglSelesai : (item.tglSelesai || '');
    const tglKirim = ov.tglKirim !== undefined ? ov.tglKirim : (item.tglKirim || '');
    const noResi = ov.noResi !== undefined ? ov.noResi : (item.noResi || '');
    const currentStatus = ov.status || item.status;

    return {
      tglSampai,
      isSampai: Boolean(tglSampai && tglSampai !== '-'),
      tglProses,
      isProses: Boolean(tglProses && tglProses !== '-'),
      tglSelesai,
      isSelesai: Boolean(tglSelesai && tglSelesai !== '-'),
      tglKirim,
      isKirim: Boolean((tglKirim && tglKirim !== '-') || (noResi && noResi !== '-')),
      noResi,
      currentStatus,
    };
  };

  // Tahapan pengajuan dikelola dan diverifikasi oleh Tim Staf Operasional MapahTrip (Affiliate Read-Only)

  // Sync profile form when user changes or logs in
  useEffect(() => {
    if (currentUser) {
      setProfileNama(currentUser.nama || '');
      setProfileStatus(currentUser.statusMitra || '');
      setProfileLembaga(currentUser.lembaga || '');
      setProfileNoWa(currentUser.noWa || '');
      setProfileAlamat(currentUser.alamat || '');
      setProfileProvinsi(currentUser.provinsi || '');
      setProfileJenisIdentitas(currentUser.jenisIdentitas || 'KTP (Kartu Tanda Penduduk)');
      setProfileNomorIdentitas(currentUser.nomorIdentitas || '');
      setProfileAkunIg(currentUser.akunIg || '');
      setProfileFollowerIg(currentUser.followerIg || '');
      setBankNama(currentUser.namaBank || '');
      setBankNomor(currentUser.nomorRekening || '');
      setBankAtasNama(currentUser.atasNamaRekening || currentUser.nama || '');
      if (currentUser.namaBank) {
        const isEwallet = EWALLET_LIST.some((ew) => ew.toLowerCase() === currentUser.namaBank?.toLowerCase());
        setPencairanKategori(isEwallet ? 'ewallet' : 'bank');
      } else {
        setPencairanKategori('');
      }
    }
  }, [currentUser]);



  // Handle Save Bank / E-Wallet for commission disbursement
  const handleSaveBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!pencairanKategori) {
      alert('Silakan pilih jenis pencairan (Bank atau E-Wallet) terlebih dahulu.');
      return;
    }
    if (!bankNama) {
      alert(pencairanKategori === 'bank' ? 'Silakan pilih nama bank terlebih dahulu.' : 'Silakan pilih nama e-wallet terlebih dahulu.');
      return;
    }
    if (!bankNomor.trim()) {
      alert(pencairanKategori === 'bank' ? 'Nomor rekening bank wajib diisi.' : 'Nomor HP akun e-wallet wajib diisi.');
      return;
    }
    if (!bankAtasNama.trim()) {
      alert('Nama pemilik rekening / akun (atas nama) wajib diisi.');
      return;
    }

    const updatedUser: AffiliateUser = {
      ...currentUser,
      namaBank: bankNama,
      nomorRekening: bankNomor.trim(),
      atasNamaRekening: bankAtasNama.trim(),
    };

    try {
      const existingUsersStr = localStorage.getItem('mapahtrip_all_affiliates');
      const allUsers: AffiliateUser[] = existingUsersStr ? JSON.parse(existingUsersStr) : [];
      const userIdx = allUsers.findIndex((u) => u.id === currentUser.id);
      if (userIdx !== -1) {
        allUsers[userIdx] = updatedUser;
      } else {
        allUsers.push(updatedUser);
      }
      localStorage.setItem('mapahtrip_all_affiliates', JSON.stringify(allUsers));
    } catch {
      // ignore
    }

    setCurrentUser(updatedUser);
    setIsEditingBank(false);
    setBankSavedMsg('✓ Rekening pencairan insentif berhasil disimpan! Mengalihkan ke Dashboard...');
    setTimeout(() => {
      setBankSavedMsg('');
      setPortalTab('dasbor');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1800);

    // Sinkronisasi pembaruan rekening langsung ke Supabase Cloud
    updateMitraBankInDB(currentUser.id, {
      jenis_pencairan: pencairanKategori === 'bank' ? 'Rekening Bank' : 'E-Wallet',
      nama_bank: bankNama,
      nomor_rekening: bankNomor.trim(),
      atas_nama: bankAtasNama.trim(),
    }).catch((err) => {
      console.warn('Catatan sinkronisasi rekening ke Supabase:', err);
    });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');

    if (!profileStatus) {
      setProfileError('Silakan pilih status mitra terlebih dahulu.');
      return;
    }
    if (!profileNama.trim()) {
      setProfileError('Nama lengkap wajib diisi.');
      return;
    }
    if (!profileNoWa.trim()) {
      setProfileError('Nomor WhatsApp wajib diisi.');
      return;
    }
    if (!profileAlamat.trim()) {
      setProfileError('Alamat tinggal wajib diisi.');
      return;
    }
    if (!profileProvinsi) {
      setProfileError('Silakan pilih provinsi tinggal Anda.');
      return;
    }
    const cleanKtp = profileNomorIdentitas.replace(/\D/g, '');
    if (!cleanKtp) {
      setProfileError('Nomor KTP / NIK wajib diisi.');
      return;
    }
    if (cleanKtp.length !== 16) {
      setProfileError(`Nomor KTP / NIK belum sesuai identitas (harus 16 digit angka, saat ini ${cleanKtp.length} digit).`);
      return;
    }

    if (!currentUser) return;

    // Normalisasi WhatsApp number
    let cleanWa = profileNoWa.replace(/[^0-9]/g, '');
    if (cleanWa.startsWith('0')) {
      cleanWa = '62' + cleanWa.slice(1);
    } else if (!cleanWa.startsWith('62')) {
      cleanWa = '62' + cleanWa;
    }

    // Kumpulkan seluruh kode referral yang sudah pernah terdaftar di sistem (anti-duplikat)
    let allUsers: AffiliateUser[] = [];
    try {
      const existingUsersStr = localStorage.getItem('mapahtrip_all_affiliates');
      allUsers = existingUsersStr ? JSON.parse(existingUsersStr) : [];
    } catch {
      allUsers = [];
    }

    const existingCodes = new Set<string>();
    existingCodes.add('LPK-JAPANCENTER'); // kode demo bawaan

    allUsers.forEach((u) => {
      if (u.affiliateCode) existingCodes.add(u.affiliateCode.toUpperCase().trim());
    });

    pengajuanList.forEach((p) => {
      if (p.affiliateCode) existingCodes.add(p.affiliateCode.toUpperCase().trim());
    });

    // GENERATE KODE REFERRAL BARU KETIKA DATA SUDAH DIISI (SESUAI SPREADSHEET: MPH + 3 DIGIT WA + 2 HURUF NAMA)
    let activeCode = currentUser.affiliateCode;
    if (!activeCode) {
      const cleanDigits = cleanWa.replace(/\D/g, '');
      const last3Digits = cleanDigits.length >= 3 ? cleanDigits.slice(-3) : cleanDigits.padStart(3, '0');

      // Ambil 2 huruf identifikasi dari nama depan atau lembaga
      let namePart = '';
      const cleanLembaga = (profileLembaga || '').trim();
      if (profileStatus !== 'Umum' && cleanLembaga && cleanLembaga !== '-') {
        const parts = cleanLembaga.split(/\s+/).filter(p => !['lpk', 'biro', 'pt', 'cv', 'tour', 'travel'].includes(p.toLowerCase()));
        namePart = (parts[0] || cleanLembaga).toUpperCase().replace(/[^A-Z]/g, '');
      }
      if (!namePart) {
        namePart = (profileNama.trim().split(/\s+/)[0] || 'MP').toUpperCase().replace(/[^A-Z]/g, '');
      }
      const twoLetters = (namePart.slice(0, 2) || 'MP').padEnd(2, 'X');

      let candidate = `MPH${last3Digits}${twoLetters}`;
      let suffix = 1;
      while (existingCodes.has(candidate)) {
        candidate = `MPH${last3Digits}${twoLetters}${suffix}`;
        suffix++;
      }

      existingCodes.add(candidate);
      activeCode = candidate;
    }

    const updatedUser: AffiliateUser = {
      ...currentUser,
      nama: profileNama.trim(),
      statusMitra: profileStatus,
      lembaga: profileLembaga.trim() || '-',
      noWa: cleanWa,
      alamat: profileAlamat.trim(),
      provinsi: profileProvinsi,
      jenisIdentitas: 'KTP (Kartu Tanda Penduduk)',
      nomorIdentitas: cleanKtp,
      akunIg: profileAkunIg.trim(),
      followerIg: profileFollowerIg.trim(),
      affiliateCode: activeCode,
      isProfileComplete: true,
    };

    // Update in allUsers storage
    try {
      const existingUsersStr = localStorage.getItem('mapahtrip_all_affiliates');
      const allUsers: AffiliateUser[] = existingUsersStr ? JSON.parse(existingUsersStr) : [];
      const userIdx = allUsers.findIndex(u => u.id === currentUser.id);
      if (userIdx !== -1) {
        allUsers[userIdx] = updatedUser;
      } else {
        allUsers.push(updatedUser);
      }
      localStorage.setItem('mapahtrip_all_affiliates', JSON.stringify(allUsers));
    } catch {
      // ignore
    }

    setIsSavingProfile(true);

    try {
      // Sinkronisasi pembaruan profil & aktivasi kode referral resmi ke Supabase Cloud
      const dbRes = await updateMitraProfileInDB(currentUser.id, {
        nama: profileNama.trim(),
        no_wa: cleanWa,
        status_mitra: profileStatus,
        lembaga_lpk: profileLembaga.trim() || '-',
        no_ktp: cleanKtp,
        alamat: profileAlamat.trim(),
        provinsi: profileProvinsi,
        akun_ig: profileAkunIg.trim() || '-',
        follower_ig: profileFollowerIg.trim() || '-',
        kode_referral: activeCode,
      });

      const finalUser = dbRes.user || updatedUser;
      setCurrentUser(finalUser);
      setShowProfileModal(false);
      setSuccessReferralModal({
        isOpen: true,
        code: finalUser.affiliateCode || activeCode,
        nama: finalUser.nama || profileNama.trim(),
      });
    } catch (err: any) {
      console.warn('Catatan sinkronisasi profil mitra ke Supabase:', err);
      setCurrentUser(updatedUser);
      setShowProfileModal(false);
      setSuccessReferralModal({
        isOpen: true,
        code: activeCode,
        nama: updatedUser.nama || profileNama.trim(),
      });
    } finally {
      setIsSavingProfile(false);
    }
  };


  // Sync current user to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('mapahtrip_current_affiliate', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('mapahtrip_current_affiliate');
    }
  }, [currentUser]);

  // Handle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!regName.trim() || !regEmail.trim()) {
      setAuthError('Nama lengkap dan alamat email wajib diisi.');
      return;
    }
    if (regPassword.length < 6) {
      setAuthError('Kata sandi minimal 6 karakter.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setAuthError('Konfirmasi kata sandi tidak cocok.');
      return;
    }
    if (!regAgree) {
      setAuthError('Harap centang persetujuan syarat dan kebijakan.');
      return;
    }

    const emailClean = regEmail.trim().toLowerCase();
    setIsRegistering(true);

    try {
      // 1. Simpan pendaftaran akun langsung ke Supabase Cloud
      const res = await registerMitraInDB({
        nama: regName.trim(),
        email: emailClean,
        password: regPassword,
      });

      if (res.error || !res.user) {
        setAuthError(res.error || 'Gagal mendaftar akun mitra. Silakan coba lagi.');
        return;
      }

      const newUser = res.user;

      // 2. Simpan juga ke cache lokal sebagai fallback
      try {
        const existingUsersStr = localStorage.getItem('mapahtrip_all_affiliates');
        const allUsers: AffiliateUser[] = existingUsersStr ? JSON.parse(existingUsersStr) : [];
        if (!allUsers.some((u) => u.email.toLowerCase() === emailClean)) {
          allUsers.push(newUser);
          localStorage.setItem('mapahtrip_all_affiliates', JSON.stringify(allUsers));
        }
      } catch {
        // ignore
      }

      // 3. Tampilkan popup notifikasi berhasil terlebih dahulu sesuai instruksi
      setRegisteredSuccessModal(newUser);
    } catch (err: any) {
      setAuthError(err?.message || 'Terjadi kesalahan sistem saat mendaftar.');
    } finally {
      setIsRegistering(false);
    }
  };

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const emailClean = loginEmail.trim().toLowerCase();
    if (!emailClean || !loginPassword) {
      setAuthError('Email dan kata sandi wajib diisi.');
      return;
    }

    // Default Demo Account (Aktifkan kode referral demo MPH425MI agar pemohon binaan dan notifikasi langsung tampil)
    if (emailClean === 'demo@mapahtrip.id' && loginPassword === '123456') {
      const demoUser: AffiliateUser = {
        id: 'aff_demo',
        nama: 'Mitra Demo LPK',
        email: 'demo@mapahtrip.id',
        affiliateCode: 'MPH425MI',
        createdAt: new Date().toISOString(),
        isProfileComplete: true,
      };
      setCurrentUser(demoUser);
      try {
        localStorage.setItem('mapahtrip_current_affiliate', JSON.stringify(demoUser));
      } catch {}
      return;
    }

    // 1. Login langsung dari database Supabase Cloud
    const dbResult = await loginMitraFromDB(emailClean, loginPassword);
    if (dbResult.user) {
      setCurrentUser(dbResult.user);
      return;
    }

    // 2. Fallback jika ada akun lokal lama yang belum tersinkron
    try {
      const existingUsersStr = localStorage.getItem('mapahtrip_all_affiliates');
      const allUsers: AffiliateUser[] = existingUsersStr ? JSON.parse(existingUsersStr) : [];
      const foundUser = allUsers.find(
        (u) => (u.email.toLowerCase() === emailClean || u.affiliateCode.toLowerCase() === emailClean)
      );

      if (!foundUser) {
        setAuthError(dbResult.error || 'Akun belum terdaftar. Silakan klik "Daftar Akun Baru" di bawah terlebih dahulu.');
        return;
      }

      if (foundUser.password !== loginPassword) {
        setAuthError('Kata sandi salah. Silakan periksa kembali kata sandi Anda.');
        return;
      }

      // Login berhasil dari cache lokal
      setCurrentUser(foundUser);
    } catch {
      setAuthError(dbResult.error || 'Terjadi kesalahan saat masuk. Silakan coba lagi.');
    }
  };

  // Active Affiliate Referral Code (dengan fallback otomatis untuk Demo)
  const activeAffiliateCode = useMemo(() => {
    if (!currentUser) return '';
    if (currentUser.isDemo || currentUser.id === 'aff_demo' || currentUser.email === 'demo@mapahtrip.id') {
      return currentUser.affiliateCode || 'DEMO-LPK';
    }
    if (currentUser.affiliateCode && currentUser.affiliateCode.trim()) {
      return currentUser.affiliateCode.trim().toUpperCase();
    }
    return '';
  }, [currentUser]);

  // Handle Logout
  const handleLogout = () => {
    if (currentUser?.isDemo || currentUser?.id === 'aff_demo') {
      setCurrentUser(null);
      onSwitchMode('customer');
      window.location.hash = '';
      return;
    }
    if (window.confirm('Apakah Anda yakin ingin keluar dari akun mitra?')) {
      setCurrentUser(null);
      setAuthMode('login');
      setAuthError('');
    }
  };

  // 1. Data Pemohon Khusus Milik Mitra Ini Saja (Berdasarkan Kode Referral Pribadi)
  const affiliateCandidates = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.isDemo || currentUser.id === 'aff_demo' || currentUser.email === 'demo@mapahtrip.id') {
      return DEMO_APPLICANTS;
    }
    const code = (activeAffiliateCode || '').trim().toUpperCase();
    if (!code) return [];

    // Baca juga pendaftaran lokal dari localStorage
    let localRegistrations: Pengajuan[] = [];
    try {
      const raw = localStorage.getItem('mapahtrip_local_registrations');
      if (raw) {
        localRegistrations = JSON.parse(raw);
        // Normalisasi komisi per orang bawa Rp 100.000 flat
        let modified = false;
        localRegistrations.forEach((p) => {
          if (p.referralFee !== 100000 || p.cashback !== 100000) {
            p.referralFee = 100000;
            p.cashback = 100000;
            modified = true;
          }
        });
        if (modified) {
          localStorage.setItem('mapahtrip_local_registrations', JSON.stringify(localRegistrations));
        }
      }
    } catch {}

    // Supabase (pengajuanList) adalah sumber kebenaran utama (Single Source of Truth)
    // Jika data live dari Supabase sudah dimuat, bersihkan cache lokal dari data yang telah dihapus di Supabase
    const liveIds = new Set(pengajuanList.map((p) => String(p.id)));
    const liveNos = new Set(pengajuanList.map((p) => p.noPengajuan).filter(Boolean));

    const validLocal = localRegistrations.filter((p) => {
      // Jika pemohon memiliki format ID Supabase atau No. Pengajuan resmi (misal MT-0247)
      // tapi tidak ada di data live Supabase, berarti data tersebut sudah dihapus di Supabase!
      const hasOfficialId = !isNaN(Number(p.id)) || (p.noPengajuan && p.noPengajuan.startsWith('MT-'));
      if (hasOfficialId && pengajuanList.length > 0) {
        return liveIds.has(String(p.id)) || (p.noPengajuan && liveNos.has(p.noPengajuan));
      }
      return true;
    });

    // Otomatis sinkronkan penghapusan ke browser storage jika ada data yang dihapus
    if (validLocal.length !== localRegistrations.length) {
      try {
        localStorage.setItem('mapahtrip_local_registrations', JSON.stringify(validLocal));
      } catch {}
    }

    // Gabungkan dengan memprioritaskan data resmi Supabase
    const combinedMap = new Map<string, Pengajuan>();
    pengajuanList.forEach((p) => combinedMap.set(String(p.id), p));
    validLocal.forEach((p) => {
      if (!combinedMap.has(String(p.id))) {
        combinedMap.set(String(p.id), p);
      }
    });

    const all = Array.from(combinedMap.values());

    // Filter KHUSUS pemohon yang terdaftar dengan kode referral milik mitra ini saja (Komisi Rp 100.000 per orang)
    return all
      .filter((p) => {
        const pCode = (p.affiliateCode || '').trim().toUpperCase();
        if (!pCode) return false;
        if (pCode === code) return true;
        // Demo LPK aliases: MPC & MPH425MI
        if ((code === 'MPC' || code === 'MPH425MI') && (pCode === 'MPC' || pCode === 'MPH425MI')) {
          return true;
        }
        return false;
      })
      .map((p) => ({
        ...p,
        referralFee: 100000,
        cashback: 100000,
      }));
  }, [pengajuanList, currentUser, activeAffiliateCode, localVersion]);

  // Filtered candidate list based on search and status (khusus pemohon mitra ini)
  const filteredList = useMemo(() => {
    return affiliateCandidates.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        item.namaPemohon.toLowerCase().includes(q) ||
        item.noPaspor.toLowerCase().includes(q) ||
        item.noTelp.toLowerCase().includes(q);

      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'proses' && (item.status === 'Sedang Diproses' || item.status === 'Apply Hari Ini')) ||
        (statusFilter === 'siap' && item.status === 'Siap Ambil') ||
        (statusFilter === 'selesai' && item.status === 'Selesai') ||
        (statusFilter === 'verifikasi' && item.status === 'Menunggu Verifikasi');

      return matchQuery && matchStatus;
    }).sort((a, b) => {
      const numA = parseInt(a.noPengajuan.replace(/[^0-9]/g, '') || a.id.replace(/[^0-9]/g, '') || '0', 10);
      const numB = parseInt(b.noPengajuan.replace(/[^0-9]/g, '') || b.id.replace(/[^0-9]/g, '') || '0', 10);
      return numB - numA;
    });
  }, [affiliateCandidates, searchQuery, statusFilter]);

  // Statistics tailored exclusively for this affiliate partner, 100% sync dengan 4 ceklis tahapan
  const stats = useMemo(() => {
    const total = affiliateCandidates.length;

    // 1. Berkas Sampai: berapa kandidat yang berkas fisiknya sudah sampai di kantor (Ceklis 'Sampai')
    const berkasLengkap = affiliateCandidates.filter((p) => {
      const st = getCandidateStages(p);
      return st.isSampai;
    }).length;

    // 2. Proses JVAC: berapa kandidat yang sudah diajukan ke Kedutaan / JVAC (Ceklis 'Proses')
    const sedangProses = affiliateCandidates.filter((p) => {
      const st = getCandidateStages(p);
      return st.isProses;
    }).length;

    // 3. Visa Terbit: berapa kandidat yang visanya sudah terbit / selesai (Ceklis 'Selesai')
    const siapTerbang = affiliateCandidates.filter((p) => {
      const st = getCandidateStages(p);
      return st.isSelesai;
    }).length;

    // 4. Pengiriman / Handover: berapa kandidat yang paspornya sudah dikirim / diserahkan (Ceklis 'Kirim')
    const handoverSoetta = affiliateCandidates.filter((p) => {
      const st = getCandidateStages(p);
      return st.isKirim;
    }).length;

    return { total, berkasLengkap, sedangProses, siapTerbang, handoverSoetta };
  }, [affiliateCandidates, localStageOverrides]);

  // Upcoming flight schedules for this affiliate's candidates
  const flightSchedules = useMemo(() => {
    return affiliateCandidates.filter((p) => {
      const ov = localStageOverrides[p.id] || {};
      const resi = (ov.noResi !== undefined ? ov.noResi : (p.noResi || '')).toLowerCase();
      const catatan = (p.catatan || '').toLowerCase();
      return (
        resi.includes('soetta') ||
        resi.includes('bandara') ||
        resi.includes('handover') ||
        catatan.includes('flight') ||
        catatan.includes('soetta') ||
        catatan.includes('bandara')
      );
    });
  }, [affiliateCandidates, localStageOverrides]);

  // Notifikasi Pelanggan & Aktivitas untuk Portal Mitra
  interface AffiliateNotifItem {
    id: string;
    candidateId: string;
    tipe: 'new_customer' | 'status_update' | 'visa_ready' | 'fee_ready';
    judul: string;
    pesan: string;
    detail?: string;
    waktu: string;
    icon: string;
    iconBg: string;
    iconColor: string;
    badgeText: string;
    badgeBg: string;
    badgeColor: string;
    candidate: Pengajuan;
  }

  const notifications = useMemo<AffiliateNotifItem[]>(() => {
    if (!currentUser) return [];
    const list: AffiliateNotifItem[] = [];

    affiliateCandidates.forEach((cand, idx) => {
      const st = getCandidateStages(cand);

      // 1. Notifikasi Pemohon Baru Mendaftar (Customer Masuk)
      list.push({
        id: `notif-cust-${cand.id}`,
        candidateId: cand.id,
        tipe: 'new_customer',
        judul: `Pemohon Baru: ${cand.namaPemohon}`,
        pesan: `Mendaftar visa ${cand.program} (${cand.konsjen}) menggunakan kode referral Anda.`,
        detail: `No. Paspor: ${cand.maskedPaspor || cand.noPaspor} • Paket: ${cand.paket} • Status: ${st.isSampai ? 'Berkas Sampai di Kantor' : 'Menunggu Verifikasi'}`,
        waktu: cand.tglBerkasMasuk && cand.tglBerkasMasuk !== '-' ? cand.tglBerkasMasuk : (idx === 0 ? 'Baru saja' : 'Hari ini'),
        icon: 'person_add',
        iconBg: '#DCFCE7',
        iconColor: '#16A34A',
        badgeText: 'Customer Baru',
        badgeBg: '#F0FDF4',
        badgeColor: '#15803D',
        candidate: cand,
      });

      // 2. Notifikasi Berkas Sampai di Kantor (HANYA jika staf sudah ceklis 'Sampai')
      if (st.isSampai) {
        list.push({
          id: `notif-sampai-${cand.id}`,
          candidateId: cand.id,
          tipe: 'status_update',
          judul: `Berkas Sampai: ${cand.namaPemohon}`,
          pesan: `Paspor fisik dan berkas telah tiba di kantor MapahTrip dan diverifikasi oleh tim staf.`,
          detail: `Petugas PIC: ${cand.staffPic || 'Staf Operasional'} • Tanggal: ${st.tglSampai}`,
          waktu: st.tglSampai || 'Hari ini',
          icon: 'inventory_2',
          iconBg: '#E0F2FE',
          iconColor: '#0284C7',
          badgeText: 'Berkas Sampai',
          badgeBg: '#F0F9FF',
          badgeColor: '#0369A1',
          candidate: cand,
        });
      }

      // 3. Notifikasi Proses JVAC / Konsulat (HANYA jika staf sudah ceklis 'Proses')
      if (st.isProses) {
        list.push({
          id: `notif-proses-${cand.id}`,
          candidateId: cand.id,
          tipe: 'status_update',
          judul: `Proses JVAC: ${cand.namaPemohon}`,
          pesan: `Berkas permohonan visa telah diajukan ke Konsulat ${cand.konsjen} / JVAC untuk verifikasi.`,
          detail: `Petugas PIC: ${cand.staffPic || 'Staf Operasional'} • Tanggal: ${st.tglProses}`,
          waktu: st.tglProses || 'Hari ini',
          icon: 'pending',
          iconBg: '#FFF7ED',
          iconColor: '#EA580C',
          badgeText: 'Proses Konsulat',
          badgeBg: '#FFFBEB',
          badgeColor: '#C2410C',
          candidate: cand,
        });
      }

      // 4. Notifikasi Visa Terbit (HANYA jika staf sudah ceklis 'Selesai')
      if (st.isSelesai) {
        list.push({
          id: `notif-visa-${cand.id}`,
          candidateId: cand.id,
          tipe: 'visa_ready',
          judul: `Visa Terbit: ${cand.namaPemohon} 🎉`,
          pesan: `Visa Jepang telah selesai diterbitkan di Konsulat ${cand.konsjen}! Stiker visa siap di paspor.`,
          detail: cand.noResi ? `No. Resi/Handover: ${cand.noResi}` : 'Paspor siap diambil atau dikirim.',
          waktu: st.tglSelesai || 'Hari ini',
          icon: 'task_alt',
          iconBg: '#FEF3C7',
          iconColor: '#D97706',
          badgeText: 'Visa Terbit',
          badgeBg: '#FFFBEB',
          badgeColor: '#B45309',
          candidate: cand,
        });
      }

      // 5. Notifikasi Paspor Terkirim (HANYA jika staf sudah ceklis 'Kirim')
      if (st.isKirim) {
        list.push({
          id: `notif-kirim-${cand.id}`,
          candidateId: cand.id,
          tipe: 'status_update',
          judul: `Paspor Terkirim: ${cand.namaPemohon} ✈️`,
          pesan: `Paspor pemohon telah dikirimkan ke alamat pemohon atau diserahterimakan.`,
          detail: st.noResi ? `No. Resi: ${st.noResi}` : 'Telah diserahterimakan.',
          waktu: st.tglKirim || 'Selesai',
          icon: 'flight_takeoff',
          iconBg: '#F3E8FF',
          iconColor: '#9333EA',
          badgeText: 'Paspor Terkirim',
          badgeBg: '#FAF5FF',
          badgeColor: '#7E22CE',
          candidate: cand,
        });
      }

      // 6. Notifikasi Komisi Siap Cair (Hanya jika visa sudah Selesai / Kirim)
      if (st.isSelesai || st.isKirim) {
        const komisiNominal = cand.referralFee || 100000;
        list.push({
          id: `notif-fee-${cand.id}`,
          candidateId: cand.id,
          tipe: 'fee_ready',
          judul: `Komisi Cair: Rp ${komisiNominal.toLocaleString('id-ID')} 💰`,
          pesan: `Komisi referral dari kandidat ${cand.namaPemohon} telah disetujui & siap ditransfer ke rekening Anda.`,
          detail: `Metode: Transfer Bank (${currentUser.namaBank || 'BCA'})`,
          waktu: st.tglSelesai || 'Baru saja',
          icon: 'payments',
          iconBg: '#FEE2E2',
          iconColor: '#DC2626',
          badgeText: 'Komisi Masuk',
          badgeBg: '#FEF2F2',
          badgeColor: '#B91C1C',
          candidate: cand,
        });
      }
    });

    return list;
  }, [affiliateCandidates, currentUser, localStageOverrides]);

  const unreadNotifications = useMemo(() => {
    return notifications.filter((n) => !readNotifIds.includes(n.id));
  }, [notifications, readNotifIds]);

  const filteredNotifications = useMemo(() => {
    if (notifFilter === 'new') return notifications.filter((n) => n.tipe === 'new_customer');
    if (notifFilter === 'status') return notifications.filter((n) => n.tipe === 'status_update' || n.tipe === 'visa_ready');
    if (notifFilter === 'fee') return notifications.filter((n) => n.tipe === 'fee_ready');
    return notifications;
  }, [notifications, notifFilter]);

  const handleMarkAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadNotifIds(allIds);
    try {
      localStorage.setItem('mapahtrip_read_notifs', JSON.stringify(allIds));
    } catch {}
  };

  const handleReadNotification = (notif: AffiliateNotifItem) => {
    if (!readNotifIds.includes(notif.id)) {
      const updated = [...readNotifIds, notif.id];
      setReadNotifIds(updated);
      try {
        localStorage.setItem('mapahtrip_read_notifs', JSON.stringify(updated));
      } catch {}
    }
    setSelectedKandidat(notif.candidate);
    setShowNotifPopover(false);
  };

  const renderNotificationPopover = () => {
    if (!showNotifPopover) return null;

    const newCustCount = notifications.filter((n) => n.tipe === 'new_customer').length;
    const visaReadyCount = notifications.filter((n) => n.tipe === 'visa_ready' || n.tipe === 'status_update').length;
    const feeCount = notifications.filter((n) => n.tipe === 'fee_ready').length;

    return (
      <>
        {/* Backdrop untuk klik di luar notifikasi */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            setShowNotifPopover(false);
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 998,
            backgroundColor: 'rgba(15, 23, 42, 0.1)',
          }}
        />
        <div
          className="portal-notif-popover"
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: '390px',
            maxWidth: 'calc(100vw - 24px)',
            backgroundColor: '#FFFFFF',
            borderRadius: '18px',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.2), 0 10px 20px -8px rgba(0, 0, 0, 0.1)',
            border: '1px solid #CBD5E1',
            zIndex: 1000,
            overflow: 'hidden',
            animation: 'notifSlideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #F1F5F9',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#10B981' }}>
              notifications_active
            </span>
            <div>
              <strong style={{ fontSize: '0.9rem', color: '#0F172A', display: 'block' }}>
                Notifikasi Pemohon &amp; Mitra
              </strong>
              <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                {unreadNotifications.length > 0 ? `${unreadNotifications.length} aktivitas belum dibaca` : 'Semua sudah dibaca'}
              </span>
            </div>
          </div>
          {unreadNotifications.length > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563EB',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '6px',
              }}
              title="Tandai semua sudah dibaca"
            >
              Tandai Dibaca
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            padding: '8px 12px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #F1F5F9',
            overflowX: 'auto',
          }}
        >
          <button
            type="button"
            onClick={() => setNotifFilter('all')}
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              border: 'none',
              fontSize: '0.74rem',
              fontWeight: notifFilter === 'all' ? 700 : 600,
              backgroundColor: notifFilter === 'all' ? '#0F172A' : '#F1F5F9',
              color: notifFilter === 'all' ? '#FFFFFF' : '#64748B',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Semua ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setNotifFilter('new')}
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              border: 'none',
              fontSize: '0.74rem',
              fontWeight: notifFilter === 'new' ? 700 : 600,
              backgroundColor: notifFilter === 'new' ? '#16A34A' : '#F1F5F9',
              color: notifFilter === 'new' ? '#FFFFFF' : '#64748B',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Customer Baru ({newCustCount})
          </button>
          <button
            type="button"
            onClick={() => setNotifFilter('status')}
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              border: 'none',
              fontSize: '0.74rem',
              fontWeight: notifFilter === 'status' ? 700 : 600,
              backgroundColor: notifFilter === 'status' ? '#0284C7' : '#F1F5F9',
              color: notifFilter === 'status' ? '#FFFFFF' : '#64748B',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Status Visa ({visaReadyCount})
          </button>
          <button
            type="button"
            onClick={() => setNotifFilter('fee')}
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              border: 'none',
              fontSize: '0.74rem',
              fontWeight: notifFilter === 'fee' ? 700 : 600,
              backgroundColor: notifFilter === 'fee' ? '#D97706' : '#F1F5F9',
              color: notifFilter === 'fee' ? '#FFFFFF' : '#64748B',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Komisi ({feeCount})
          </button>
        </div>

        {/* List Items */}
        <div style={{ padding: '8px', maxHeight: '360px', overflowY: 'auto' }}>
          {filteredNotifications.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#94A3B8', display: 'block', marginBottom: '8px' }}>
                notifications_paused
              </span>
              <p style={{ margin: '0 0 4px', fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                Belum Ada Notifikasi
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#94A3B8' }}>
                Notifikasi akan otomatis masuk saat ada pemohon mendaftar menggunakan referral Anda.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredNotifications.map((notif) => {
                const isUnread = !readNotifIds.includes(notif.id);
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleReadNotification(notif)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      backgroundColor: isUnread ? '#F0FDF4' : '#F8FAFC',
                      border: isUnread ? '1px solid #BBF7D0' : '1px solid #F1F5F9',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Unread indicator dot */}
                    {isUnread && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: '#16A34A',
                        }}
                      />
                    )}

                    {/* Icon Avatar */}
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: notif.iconBg,
                        color: notif.iconColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        {notif.icon}
                      </span>
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0, paddingRight: isUnread ? '12px' : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '6px',
                            backgroundColor: notif.badgeBg,
                            color: notif.badgeColor,
                          }}
                        >
                          {notif.badgeText}
                        </span>
                        <strong style={{ fontSize: '0.82rem', color: '#0F172A' }}>
                          {notif.judul}
                        </strong>
                      </div>
                      <p style={{ margin: '0 0 4px', fontSize: '0.76rem', color: '#475569', lineHeight: 1.4 }}>
                        {notif.pesan}
                      </p>
                      {notif.detail && (
                        <p style={{ margin: '0 0 6px', fontSize: '0.71rem', color: '#64748B', fontFamily: 'monospace' }}>
                          {notif.detail}
                        </p>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>
                          {notif.waktu}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#0284C7', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                          <span>Lihat Berkas</span>
                          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>arrow_forward</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 16px',
            borderTop: '1px solid #F1F5F9',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
            Kode Referral: <strong style={{ color: '#0284C7' }}>{activeAffiliateCode || 'MPC'}</strong>
          </span>
          <button
            type="button"
            onClick={() => setShowNotifPopover(false)}
            style={{
              background: 'none',
              border: 'none',
              color: '#475569',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Tutup
          </button>
        </div>
      </div>
      </>
    );
  };

  // Data Riwayat Transfer Insentif Mitra & Nominal Pencairan
  const riwayatTransferList = useMemo(() => {
    const bankTujuan = currentUser?.namaBank || 'Belum Diisi';
    const rekTujuan = currentUser?.nomorRekening
      ? currentUser.nomorRekening.length > 6
        ? `${currentUser.nomorRekening.slice(0, 4)}••••${currentUser.nomorRekening.slice(-4)}`
        : currentUser.nomorRekening
      : '-';
    const anTujuan = currentUser?.atasNamaRekening || currentUser?.nama || '-';

    let payoutsMap: Record<string, any> = {};
    try {
      const raw = localStorage.getItem('mapahtrip_affiliate_payouts');
      if (raw) payoutsMap = JSON.parse(raw);
    } catch {}

    return affiliateCandidates.map((cand) => {
      const isSelesai = cand.status === 'Selesai';
      const payout = payoutsMap[cand.id] || (cand.payoutStatus === 'Berhasil Ditransfer' ? {
        noRef: cand.payoutNoRef || `TRX-MPC-${cand.id.replace(/\D/g, '').slice(-6) || '202601'}`,
        tanggalTransfer: cand.payoutTanggal || cand.tglSelesai || 'Hari ini',
        buktiTransferUrl: cand.payoutBuktiUrl,
        transferredBy: cand.payoutBy || 'Owner MapahTrip',
      } : null);

      const isPaid = Boolean(payout);

      return {
        id: `TF-${cand.id}`,
        noRef: payout?.noRef || `TRX-MPC-${cand.id.replace(/\D/g, '').slice(-6) || '202601'}`,
        tanggalTransfer: isPaid
          ? (payout?.tanggalTransfer || cand.payoutTanggal || cand.tglSelesai || 'Hari ini')
          : isSelesai
          ? 'Visa Selesai • Menunggu Transfer Owner'
          : 'Menunggu Visa Selesai',
        namaPemohon: cand.namaPemohon,
        programVisa: cand.program,
        konsulat: cand.konsjen,
        nominal: cand.referralFee || 100000,
        namaBank: bankTujuan,
        nomorRekening: rekTujuan,
        atasNama: anTujuan,
        status: (isPaid ? 'Berhasil Ditransfer' : 'Menunggu Proses Visa') as 'Berhasil Ditransfer' | 'Menunggu Proses Visa',
        tglSelesaiVisa: isSelesai ? (cand.tglSelesai || 'Selesai') : (cand.tglEstimasiSelesai || 'Menunggu Verifikasi & Proses JVAC'),
        metode: isPaid ? 'Transfer Bank Resmi oleh Owner' : isSelesai ? 'Antrean Transfer Payout Owner' : 'Otomatis Ditransfer saat Visa Terbit',
        buktiTransferUrl: payout?.buktiTransferUrl || cand.payoutBuktiUrl,
        transferredBy: payout?.transferredBy || cand.payoutBy || 'Owner MapahTrip',
      };
    });
  }, [currentUser, affiliateCandidates]);

  // Nominal Total Insentif yang Sudah Ditransfer (Cair ke Rekening)
  const totalSudahDitransfer = useMemo(() => {
    return riwayatTransferList
      .filter((item) => item.status === 'Berhasil Ditransfer')
      .reduce((acc, curr) => acc + curr.nominal, 0);
  }, [riwayatTransferList]);

  // Nominal Insentif Menunggu Transfer (Proses JVAC)
  const totalMenungguTransfer = useMemo(() => {
    return riwayatTransferList
      .filter((item) => item.status === 'Menunggu Proses Visa')
      .reduce((acc, curr) => acc + curr.nominal, 0);
  }, [riwayatTransferList]);

  // Total Keseluruhan Akumulasi Komisi
  const totalAkumulasiKomisi = totalSudahDitransfer + totalMenungguTransfer;

  // Real Counts for Metric Badges
  const countSudahDitransfer = useMemo(() => {
    return riwayatTransferList.filter((item) => item.status === 'Berhasil Ditransfer').length;
  }, [riwayatTransferList]);

  const countMenungguTransfer = useMemo(() => {
    return riwayatTransferList.filter((item) => item.status === 'Menunggu Proses Visa').length;
  }, [riwayatTransferList]);

  const countTotalPemohon = riwayatTransferList.length;

  // Filtered Riwayat Transfer
  const filteredRiwayatTransfer = useMemo(() => {
    if (filterTransferStatus === 'selesai') {
      return riwayatTransferList.filter((item) => item.status === 'Berhasil Ditransfer');
    }
    if (filterTransferStatus === 'pending') {
      return riwayatTransferList.filter((item) => item.status === 'Menunggu Proses Visa');
    }
    return riwayatTransferList;
  }, [riwayatTransferList, filterTransferStatus]);

  // =========================================================================
  // VIEW 1: AUTHENTICATION SCREEN (REGISTER / LOGIN) - Matches user screenshot
  // =========================================================================
  // Reusable Terms & Conditions Modal (Rendered in Auth screen and Dashboard)
  const renderTermsModal = () => {
    if (!showTermsModal) return null;
    return (
      <div
        onClick={() => setShowTermsModal(false)}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
      >
        <div
          className="terms-modal-card"
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
          }}
        >
          {/* Modal Header */}
          <div
            className="terms-modal-header"
            style={{
              padding: '18px 24px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              backgroundColor: '#F8FAFC',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', minWidth: 0, flex: 1 }}>
              <div
                className="terms-modal-icon"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: '#ECFDF5',
                  color: '#10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.2rem',
                  flexShrink: 0,
                  marginTop: '1px',
                }}
              >
                📜
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h3 className="terms-modal-title" style={{ margin: '0 0 3px', fontSize: '1.02rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.3 }}>
                  Syarat &amp; Ketentuan Kemitraan (MPC)
                </h3>
                <span className="terms-modal-subtitle" style={{ fontSize: '0.74rem', color: '#64748B', lineHeight: 1.4, display: 'block' }}>
                  <span className="terms-sub-full">Peraturan Direksi No. 018/SK/DIR/MPC/VI/2026 &bull; Program Afiliasi Visa Jepang</span>
                  <span className="terms-sub-mobile">SK No. 018/SK/DIR/MPC/VI/2026</span>
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowTermsModal(false)}
              className="terms-modal-close-btn"
              style={{
                background: '#F1F5F9',
                border: '1px solid #E2E8F0',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#475569',
                fontSize: '14px',
                flexShrink: 0,
                marginTop: '1px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#E2E8F0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F1F5F9';
              }}
            >
              ✕
            </button>
          </div>

          {/* Modal Body (Scrollable Official Document) */}
          <div
            className="terms-modal-body"
            style={{
              padding: '24px 28px',
              overflowY: 'auto',
              fontSize: '0.84rem',
              color: '#334155',
              lineHeight: 1.65,
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              backgroundColor: '#FFFFFF',
            }}
          >
            {/* Kop Surat & Judul Formal */}
            <div className="terms-doc-kop" style={{ textAlign: 'center', paddingBottom: '16px', borderBottom: '2px solid #E2E8F0' }}>
              <div className="terms-doc-badge" style={{ fontSize: '0.72rem', fontWeight: 800, color: '#10B981', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>
                DOKUMEN RESMI KEMITRAAN MAPAHTRIP
              </div>
              <h2 className="terms-doc-title" style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 900, color: '#0F172A', textTransform: 'uppercase' }}>
                PERATURAN DIREKSI MAPAHTRIP DIGITAL
              </h2>
              <div className="terms-doc-number" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
                Nomor : 018/SK/DIR/MPC/VI/2026
              </div>
              <div className="terms-doc-subject" style={{ fontSize: '0.86rem', fontWeight: 800, color: '#005BB5', marginTop: '4px' }}>
                Tentang : PROGRAM MAPAHTRIP PARTNER CLUB (MPC)
              </div>
            </div>

            {/* Menimbang */}
            <div style={{ backgroundColor: '#F8FAFC', padding: '14px 16px', borderRadius: '10px', borderLeft: '4px solid #005BB5' }}>
              <strong style={{ color: '#0F172A', display: 'block', marginBottom: '6px', fontSize: '0.84rem', letterSpacing: '0.5px' }}>
                MENIMBANG :
              </strong>
              <ol className="terms-ordered-list">
                <li>Bahwa Divisi Kemitraan &amp; Operasional Visa MapahTrip merupakan unit kerja strategis dalam menyediakan akses pengurusan visa Jepang yang resmi, cepat, dan transparan.</li>
                <li>Bahwa tingginya kebutuhan pengurusan visa Jepang (Magang/SSW Tokutei Ginou, Bisnis, Pelajar, dan Wisata) perlu direspons dengan skema kemitraan yang saling menguntungkan.</li>
                <li>Bahwa ketentuan program kemitraan terbaru MapahTrip Partner Club (MPC) telah diperhitungkan secara cermat untuk memberikan Insentif Transfer yang transparan bagi mitra.</li>
                <li>Bahwa sehubungan dengan hal tersebut di atas, perlu dibuatkan dan ditetapkan Peraturan Direksi.</li>
              </ol>
            </div>

            {/* Mengingat */}
            <div style={{ backgroundColor: '#F8FAFC', padding: '14px 16px', borderRadius: '10px', borderLeft: '4px solid #64748B' }}>
              <strong style={{ color: '#0F172A', display: 'block', marginBottom: '6px', fontSize: '0.84rem', letterSpacing: '0.5px' }}>
                MENGINGAT :
              </strong>
              <ol className="terms-ordered-list">
                <li>Akta Pendirian Perusahaan MapahTrip Tahun 2026 tentang Layanan Pengurusan dan Pendampingan Dokumen Perjalanan.</li>
                <li>Standar Operasional Prosedur (SOP) Kedutaan Besar Jepang, Konsulat Jenderal Jepang di Indonesia, dan VFS JVAC (Japan Visa Application Centre).</li>
                <li>Peraturan Perusahaan MapahTrip Tahun 2026.</li>
              </ol>
            </div>

            {/* Memutuskan */}
            <div className="terms-decide-box" style={{ textAlign: 'center', margin: '6px 0', padding: '12px 14px', backgroundColor: '#F0FDF4', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
              <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.84rem', letterSpacing: '1px', display: 'block' }}>
                MEMUTUSKAN :
              </span>
              <div style={{ fontWeight: 800, color: '#047857', fontSize: '0.88rem', marginTop: '3px', lineHeight: 1.4 }}>
                Menetapkan : PERATURAN DIREKSI TENTANG PROGRAM MAPAHTRIP PARTNER CLUB (MPC)
              </div>
            </div>

            {/* PASAL 1 */}
            <div className="terms-pasal-block">
              <div className="terms-pasal-header">PASAL 1 : DEFINISI ISTILAH</div>
              <div className="terms-items-list">
                <div className="terms-item">
                  <span className="terms-item-num">1.</span>
                  <div className="terms-item-text"><strong>Mitra MPC</strong> adalah orang perorangan atau badan/lembaga (LPK, biro tour &amp; travel, sekolah bahasa, alumni/pekerja di Jepang, konsultan visa, atau masyarakat umum) yang terdaftar pada program MPC sebagai afiliasi untuk mereferensikan pemohon visa Jepang.</div>
                </div>
                <div className="terms-item">
                  <span className="terms-item-num">2.</span>
                  <div className="terms-item-text"><strong>Kode Referral</strong> adalah kode unik resmi berformat <span className="terms-code-tag">MPH + 3 digit terakhir No. WA + 2 huruf depan nama/lembaga</span> (contoh: <span className="terms-code-highlight">MPH433EL</span>) yang diberikan kepada Mitra MPC untuk digunakan oleh pemohon visa saat pendaftaran.</div>
                </div>
                <div className="terms-item">
                  <span className="terms-item-num">3.</span>
                  <div className="terms-item-text"><strong>Insentif / Komisi</strong> adalah imbalan berupa uang tunai resmi sebesar <strong style={{ color: '#047857' }}>Rp 100.000 / Visa</strong> yang diberikan kepada Mitra MPC untuk setiap pemohon visa yang berhasil menyelesaikan proses pengajuan dan visanya selesai/disetujui.</div>
                </div>
                <div className="terms-item">
                  <span className="terms-item-num">4.</span>
                  <div className="terms-item-text"><strong>Website / Portal MPC</strong> adalah halaman resmi <span className="terms-code-highlight">mapahtrip.id/#affiliate</span> untuk pendaftaran, monitoring berkas, dan pencairan komisi.</div>
                </div>
                <div className="terms-item">
                  <span className="terms-item-num">5.</span>
                  <div className="terms-item-text"><strong>Lembaga Pelatihan Kerja (LPK)</strong> adalah lembaga pelatihan yang mengirim kandidat tenaga kerja magang atau Tokutei Ginou (SSW) ke Jepang.</div>
                </div>
                <div className="terms-item">
                  <span className="terms-item-num">6.</span>
                  <div className="terms-item-text"><strong>Biro Travel / Agensi</strong> adalah penyedia jasa perjalanan wisata, dinas, atau bisnis rombongan ke Jepang.</div>
                </div>
                <div className="terms-item">
                  <span className="terms-item-num">7.</span>
                  <div className="terms-item-text"><strong>Alumni / Pekerja Jepang</strong> adalah eks-magang, pekerja berketerampilan spesifik (SSW), engineer, atau ekspatriat yang mereferensikan keluarga/rekan kerja untuk berangkat ke Jepang.</div>
                </div>
                <div className="terms-item">
                  <span className="terms-item-num">8.</span>
                  <div className="terms-item-text"><strong>Masyarakat Umum</strong> adalah individu perorangan yang secara aktif bergabung menjadi mitra promosi MapahTrip.</div>
                </div>
                <div className="terms-item">
                  <span className="terms-item-num">9.</span>
                  <div className="terms-item-text"><strong>Referral / Pemohon Visa</strong> adalah klien, siswa LPK, atau kandidat yang mengajukan pengurusan visa Jepang di MapahTrip menggunakan kode referral milik Mitra MPC.</div>
                </div>
                <div className="terms-item">
                  <span className="terms-item-num">10.</span>
                  <div className="terms-item-text"><strong>Pengelola MPC</strong> adalah unit kerja Divisi Kemitraan yang ditunjuk sebagai pengelola program kemitraan oleh MapahTrip.</div>
                </div>
                <div className="terms-item">
                  <span className="terms-item-num">11.</span>
                  <div className="terms-item-text"><strong>Staf Verifikator</strong> adalah petugas operasional MapahTrip yang melakukan validasi berkas fisik, pendaftaran JVAC, dan pencocokan kode referral.</div>
                </div>
                <div className="terms-item">
                  <span className="terms-item-num">12.</span>
                  <div className="terms-item-text"><strong>Approved</strong> adalah status verifikasi pencairan komisi yang dinyatakan aman, valid, dan siap ditransfer setelah visa selesai.</div>
                </div>
                <div className="terms-item">
                  <span className="terms-item-num">13.</span>
                  <div className="terms-item-text"><strong>Not Approved</strong> adalah status pencairan yang ditolak atau ditunda karena tidak memenuhi syarat, klaim sepihak, atau terindikasi pelanggaran.</div>
                </div>
              </div>
            </div>

            {/* PASAL 2 */}
            <div className="terms-pasal-block">
              <div className="terms-pasal-header">PASAL 2 : DEFINISI PROGRAM</div>
              <p className="terms-para">
                <strong>MapahTrip Partner Club (MPC)</strong> adalah program kemitraan berbasis afiliasi yang dikembangkan oleh MapahTrip untuk memperluas jangkauan layanan visa Jepang melalui para mitra (LPK, biro travel, alumni magang/pekerja di Jepang, sekolah bahasa, konsultan, maupun masyarakat umum). Program ini memberikan kesempatan bagi para mitra untuk memperoleh komisi transfer resmi atas keberhasilan mereferensikan pemohon visa Jepang menggunakan kode referral khusus.
              </p>
            </div>

            {/* PASAL 3 */}
            <div className="terms-pasal-block">
              <div className="terms-pasal-header">PASAL 3 : TUJUAN PROGRAM</div>
              <ol className="terms-ordered-list">
                <li>Meningkatkan kemudahan akses pengurusan berkas visa Jepang yang tepat, cepat, dan sesuai regulasi Kedutaan/JVAC.</li>
                <li>Menyediakan peluang bagi Mitra MPC untuk mendapatkan penghasilan tambahan (komisi transfer) tanpa modal dan tanpa pungutan biaya.</li>
                <li>Membangun ekosistem kemitraan yang solid bersama LPK, biro tour &amp; travel, dan komunitas alumni Jepang di seluruh Indonesia.</li>
                <li>Membangun hubungan profesional jangka panjang yang saling menguntungkan dan berkelanjutan.</li>
              </ol>
            </div>

            {/* PASAL 4 */}
            <div className="terms-pasal-block">
              <div className="terms-pasal-header">PASAL 4 : RUANG LINGKUP</div>
              <p className="terms-para">
                Peraturan ini berlaku dan mengikat bagi seluruh pihak yang terlibat dalam Program MPC, yaitu: (1) Mitra MPC terdaftar; (2) Pemohon Visa / Referral binaan mitra; dan (3) Manajemen serta Pegawai Operasional MapahTrip.
              </p>
            </div>

            {/* PASAL 5 */}
            <div className="terms-pasal-block">
              <div className="terms-pasal-header">PASAL 5 : SYARAT DAN KETENTUAN PENDAFTARAN</div>
              <ol className="terms-ordered-list">
                <li>Mitra MPC wajib mendaftarkan diri melalui formulir pendaftaran portal resmi MapahTrip.</li>
                <li>Pendaftaran 100% gratis tanpa dipungut biaya pendaftaran atau iuran bulanan apapun.</li>
                <li>Mitra MPC wajib memberikan data pribadi yang valid dan akurat, mencakup: (a) Nama Lengkap; (b) Status Kemitraan; (c) Nama Lembaga (boleh diisi '-' jika umum); (d) Nomor WhatsApp aktif; (e) Alamat dan Provinsi; (f) Jenis &amp; Nomor Identitas (KTP/Paspor/SIM); (g) Foto diri/KTP; dan (h) Nomor Rekening Bank atau E-Wallet.</li>
                <li>Atas nama rekening bank atau e-wallet harus sama dengan nama mitra MPC terdaftar demi keamanan pencairan.</li>
                <li>Kode referral resmi diterbitkan otomatis setelah mitra melengkapi formulir identitas.</li>
                <li>Kode referral bersifat personal dan tidak dapat dipindahtangankan tanpa persetujuan tertulis MapahTrip.</li>
                <li>Setiap pemohon visa hanya dapat menggunakan satu kode referral saat pengajuan berkas.</li>
                <li>Mitra MPC dilarang melakukan promosi yang melanggar etika, hukum, SARA, atau merugikan pihak lain.</li>
                <li>Pegawai internal verifikator MapahTrip tidak diperkenankan menggunakan kode referral pribadi untuk pengajuan klien organik.</li>
              </ol>
            </div>

            {/* PASAL 6 */}
            <div className="terms-pasal-block">
              <div className="terms-pasal-header">PASAL 6 : HAK DAN KEWAJIBAN MITRA MPC</div>
              <div className="terms-rights-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', marginTop: '6px' }}>
                <div style={{ backgroundColor: '#F0FDF4', padding: '14px', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
                  <strong style={{ color: '#166534', display: 'block', marginBottom: '6px', fontSize: '0.84rem' }}>Hak Mitra MPC:</strong>
                  <ul className="terms-unordered-list" style={{ margin: 0, paddingLeft: '16px', fontSize: '0.8rem', color: '#15803D', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <li>Mendapat Kode Referral resmi berformat unik (<span className="terms-code-highlight">MPH...</span>).</li>
                    <li>Mendapat flyer &amp; materi informasi persyaratan visa Jepang resmi.</li>
                    <li>Mendapat edukasi dan konsultasi berkas visa Jepang.</li>
                    <li>Mendapat komisi transfer Rp 100.000 per visa terbit/selesai.</li>
                    <li>Mendapat akses monitoring status berkas pemohon secara transparan.</li>
                    <li>Mendapat bukti transfer pencairan komisi transfer.</li>
                    <li>Mendapat jaminan perlindungan dan kerahasiaan data pribadi.</li>
                  </ul>
                </div>
                <div style={{ backgroundColor: '#EFF6FF', padding: '14px', borderRadius: '10px', border: '1px solid #BFDBFE' }}>
                  <strong style={{ color: '#1E40AF', display: 'block', marginBottom: '6px', fontSize: '0.84rem' }}>Kewajiban Mitra MPC:</strong>
                  <ul className="terms-unordered-list" style={{ margin: 0, paddingLeft: '16px', fontSize: '0.8rem', color: '#1D4ED8', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <li>Memberikan data diri dan nomor rekening yang valid untuk pencairan.</li>
                    <li>Mengajak rekan, siswa LPK, atau rombongan yang butuh visa Jepang ke MapahTrip.</li>
                    <li>Memastikan berkas pemohon yang direkomendasikan asli dan dapat dipertanggungjawabkan.</li>
                    <li>Memastikan pemohon memasukkan kode referral mitra pada saat pendaftaran.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* PASAL 7 */}
            <div className="terms-pasal-block">
              <div className="terms-pasal-header">PASAL 7 : SKEMA INSENTIF KOMISI MITRA</div>
              <div className="terms-komisi-box" style={{ backgroundColor: '#ECFDF5', padding: '14px 16px', borderRadius: '10px', border: '1px solid #10B981', marginBottom: '10px' }}>
                <div className="terms-komisi-title" style={{ fontWeight: 800, color: '#047857', fontSize: '0.92rem', marginBottom: '6px' }}>
                  Komisi Transfer Flat: Rp 100.000 / Visa Terbit
                </div>
                <div className="terms-komisi-sub" style={{ fontSize: '0.78rem', color: '#065F46', lineHeight: 1.45 }}>
                  Berlaku untuk seluruh kategori visa Jepang: Magang/SSW Tokutei Ginou, Visa Kerja, Visa Bisnis/Seminar, Visa Pelajar, dan Visa Turis Single/Multiple Entry.
                </div>
              </div>

              <div style={{ marginBottom: '8px' }}>
                <strong style={{ fontSize: '0.82rem', color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                  Simulasi Pendapatan Mitra:
                </strong>
                <div className="terms-sim-grid">
                  <div className="terms-sim-chip">
                    <span className="terms-sim-count">1 Pemohon</span>
                    <span className="terms-sim-val">Rp 100.000</span>
                  </div>
                  <div className="terms-sim-chip">
                    <span className="terms-sim-count">5 Pemohon</span>
                    <span className="terms-sim-val">Rp 500.000</span>
                  </div>
                  <div className="terms-sim-chip">
                    <span className="terms-sim-count">10 Pemohon</span>
                    <span className="terms-sim-val">Rp 1.000.000</span>
                  </div>
                  <div className="terms-sim-chip">
                    <span className="terms-sim-count">25 Pemohon</span>
                    <span className="terms-sim-val">Rp 2.500.000</span>
                  </div>
                </div>
              </div>

              <div className="terms-benefit-box" style={{ backgroundColor: '#F8FAFC', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
                <strong style={{ color: '#0F172A' }}>Benefit Pemohon Binaan:</strong> Pemohon binaan mendapatkan jaminan verifikasi berkas lengkap, translate dokumen resmi, pendampingan antrean JVAC, dan update progres langsung.
              </div>
            </div>

            {/* PASAL 8 */}
            <div className="terms-pasal-block">
              <div className="terms-pasal-header">PASAL 8 : STATUS DAN PROSES PENCAIRAN INSENTIF</div>
              <div className="terms-items-list">
                <div className="terms-item">
                  <span className="terms-item-num">1.</span>
                  <div className="terms-item-text"><strong>Approved:</strong> Status pencairan disetujui apabila proses visa pemohon telah selesai diproses oleh Kedutaan/JVAC dan data verifikasi mitra dinyatakan valid.</div>
                </div>
                <div className="terms-item">
                  <span className="terms-item-num">2.</span>
                  <div className="terms-item-text"><strong>Not Approved:</strong> Status pencairan tidak diproses apabila: (a) Pemohon mendaftar menggunakan kode referral miliknya sendiri tanpa izin; (b) Mitra terdaftar dalam daftar sanksi/blacklist; (c) Pemohon menyatakan tidak pernah direferensikan oleh mitra (klaim sepihak); atau (d) Pengajuan visa dibatalkan sebelum diproses.</div>
                </div>
                <div className="terms-item">
                  <span className="terms-item-num">3.</span>
                  <div className="terms-item-text"><strong>Waktu Pencairan:</strong> Komisi ditransfer maksimal 1–3 hari kerja setelah pengajuan visa dinyatakan selesai dan lolos approval.</div>
                </div>
                <div className="terms-item">
                  <span className="terms-item-num">4.</span>
                  <div className="terms-item-text"><strong>Metode Transfer:</strong> Insentif ditransfer langsung ke rekening bank (BCA, Mandiri, BNI, BRI, BSI, Seabank, dll) atau dompet digital (GoPay, OVO, Dana) yang didaftarkan mitra.</div>
                </div>
                <div className="terms-item">
                  <span className="terms-item-num">5.</span>
                  <div className="terms-item-text"><strong>Gagal Cair:</strong> Jika transfer terkendala teknis atau nomor rekening salah, pengelola MPC akan meminta mitra memperbarui data rekening agar komisi dapat dikirim ulang.</div>
                </div>
              </div>
            </div>

            {/* PASAL 9 */}
            <div className="terms-pasal-block">
              <div className="terms-pasal-header">PASAL 9 : PELANGGARAN PROGRAM MPC</div>
              <div className="terms-items-list">
                <div className="terms-item">
                  <span className="terms-item-num">1.</span>
                  <div className="terms-item-text"><strong>Pelanggaran Ringan:</strong> Mengarahkan pemohon organik kantor yang datang sendiri agar menggunakan kode referral tertentu demi mendapatkan keuntungan tanpa rekomendasi awal; atau mengetahui penyalahgunaan tetapi tidak melapor.</div>
                </div>
                <div className="terms-item">
                  <span className="terms-item-num">2.</span>
                  <div className="terms-item-text"><strong>Pelanggaran Berat:</strong> Memberikan informasi menyesatkan/palsu kepada pemohon; menjanjikan kelulusan visa 100% (keputusan visa adalah hak prerogatif Kedutaan Jepang); atau menjanjikan diskon liar di luar ketentuan resmi MapahTrip.</div>
                </div>
                <div className="terms-item">
                  <span className="terms-item-num">3.</span>
                  <div className="terms-item-text"><strong>Pelanggaran Mendesak (Fraud):</strong> Memalsukan dokumen pemohon (rekening koran palsu, KTP palsu, sponsor manipulatif); bersekongkol mencairkan komisi fiktif; atau merekayasa penggunaan kode referral mitra lain.</div>
                </div>
              </div>
            </div>

            {/* PASAL 10 */}
            <div className="terms-pasal-block">
              <div className="terms-pasal-header">PASAL 10 : SANKSI</div>
              <ul className="terms-unordered-list">
                <li>Peringatan tertulis kepada Mitra MPC yang melanggar ketentuan program.</li>
                <li>Pembatalan komisi insentif atas pengajuan yang terbukti memanipulasi kode referral.</li>
                <li>Kewajiban pengembalian insentif yang diperoleh dari transaksi yang tidak sah.</li>
                <li>Penonaktifan akun, pemblokiran kode referral permanen, dan pencantuman ke daftar hitam (blacklist) kemitraan MapahTrip.</li>
                <li>Tindakan pemalsuan dokumen berkas resmi dapat diteruskan ke jalur hukum yang berlaku.</li>
              </ul>
            </div>

            {/* PASAL 11 */}
            <div className="terms-pasal-block">
              <div className="terms-pasal-header">PASAL 11 : PENUTUP</div>
              <p className="terms-para">
                Peraturan ini mulai berlaku efektif sejak tanggal 1 Januari 2026 dan menjadi acuan operasional kemitraan MapahTrip Partner Club. Hal-hal teknis yang belum diatur akan dituangkan dalam SOP tersendiri.
              </p>
            </div>

            {/* Tanda Tangan Pengesahan */}
            <div className="terms-signature-card" style={{ marginTop: '16px', padding: '18px 20px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ textAlign: 'right', minWidth: '220px' }}>
                <div style={{ fontSize: '0.74rem', color: '#64748B', marginBottom: '2px' }}>Ditetapkan di: <strong>Jakarta</strong></div>
                <div style={{ fontSize: '0.74rem', color: '#64748B', marginBottom: '14px' }}>Berlaku sejak: <strong>1 Januari 2026</strong></div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A' }}>MapahTrip Digital Indonesia</div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginBottom: '32px' }}>Founder &amp; Direktur</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0F172A', textDecoration: 'underline', letterSpacing: '0.04em' }}>
                  ELDELIDIA
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748B' }}>Founder &amp; Direktur MapahTrip</div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div
            style={{
              padding: '14px 24px',
              borderTop: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
              Dengan mendaftar sebagai mitra, Anda menyepakati seluruh pasal di atas.
            </span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setRegAgree(true);
                  setShowTermsModal(false);
                }}
                style={{
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '9px 20px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                }}
              >
                <span>✓ Saya Mengerti &amp; Setuju</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRegisteredSuccessModal = () => {
    if (!registeredSuccessModal) return null;

    const handleContinueToDashboard = () => {
      const user = registeredSuccessModal;
      setRegisteredSuccessModal(null);
      setCurrentUser(user);
      setOnboardingView('dashboard');
      setPortalTab('mpc');
      setPartnerSubTab('informasi');
    };

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            maxWidth: '480px',
            width: '100%',
            padding: '36px 28px',
            textAlign: 'center',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
            border: '1px solid #E2E8F0',
          }}
        >
          <div
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '50%',
              backgroundColor: '#ECFDF5',
              border: '2px solid #10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#059669',
              boxShadow: '0 12px 28px -6px rgba(16, 185, 129, 0.4)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '42px' }}>
              task_alt
            </span>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#ECFDF5',
              color: '#059669',
              padding: '4px 14px',
              borderRadius: '9999px',
              fontSize: '0.74rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '12px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
              check_circle
            </span>
            Pendaftaran Berhasil
          </div>

          <h3
            style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              color: '#0F172A',
              marginBottom: '8px',
              lineHeight: 1.3,
            }}
          >
            Akun Berhasil Dibuat!
          </h3>

          <p
            style={{
              fontSize: '0.86rem',
              color: '#64748B',
              lineHeight: 1.55,
              marginBottom: '20px',
            }}
          >
            Selamat datang Kak <strong>{registeredSuccessModal.nama}</strong>! Akun kemitraan Anda telah berhasil didaftarkan.
          </p>

          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '14px',
              padding: '14px 16px',
              textAlign: 'left',
              marginBottom: '18px',
              fontSize: '0.84rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <span style={{ color: '#64748B' }}>Nama Pendaftar:</span>
              <strong style={{ color: '#0F172A' }}>{registeredSuccessModal.nama}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Email Akun:</span>
              <strong style={{ color: '#005BB5' }}>{registeredSuccessModal.email}</strong>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '22px',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '20px', color: '#2563EB', flexShrink: 0, marginTop: '1px' }}
            >
              info
            </span>
            <div style={{ fontSize: '0.80rem', color: '#1E40AF', lineHeight: 1.45 }}>
              <strong>Langkah Selanjutnya:</strong> Anda akan masuk ke halaman <strong>Informasi Program Partner Club</strong> untuk membaca syarat &amp; ketentuan. Setelah siap, silakan klik tombol <strong>&quot;Daftar Sekarang&quot;</strong> untuk mengisi formulir kemitraan.
            </div>
          </div>

          <button
            type="button"
            onClick={handleContinueToDashboard}
            style={{
              width: '100%',
              backgroundColor: '#10B981',
              color: '#FFFFFF',
              border: 'none',
              padding: '14px',
              borderRadius: '14px',
              fontSize: '0.95rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
              transition: 'all 0.2s ease',
            }}
          >
            <span>Masuk ke Dashboard Informasi Kemitraan ➔</span>
          </button>
        </div>
      </div>
    );
  };

  if (!currentUser) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
          fontFamily: 'inherit',
        }}
      >
        {/* Top bar back button */}
        <div style={{ width: '100%', maxWidth: '420px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => onSwitchMode('customer')}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748B',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
            <span>Kembali ke Beranda</span>
          </button>

          <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 700 }}>
            PORTAL MITRA ⛩️
          </span>
        </div>

        {/* Card Container (Clean white card matching screenshot) */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.05)',
            width: '100%',
            maxWidth: '420px',
            padding: '36px 32px',
            boxSizing: 'border-box',
          }}
        >
          {authMode === 'register' ? (
            /* ================= REGISTER VIEW ================= */
            <div>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h2
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: '#0F172A',
                    margin: '0 0 6px',
                    letterSpacing: '-0.02em',
                  }}
                >
                  Buat akun
                </h2>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748B' }}>
                  Masukkan detail anda untuk membuat akun
                </p>
              </div>

                            {authSuccessMsg && (
                <div
                  style={{
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    color: '#166534',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontSize: '0.82rem',
                    marginBottom: '16px',
                  }}
                >
                  {authSuccessMsg}
                </div>
              )}
              {authError && (
                <div
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#B91C1C',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontSize: '0.82rem',
                    marginBottom: '16px',
                  }}
                >
                  {authError}
                </div>
              )}

              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* 1. Nama Lengkap */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>
                    Nama Lengkap
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #10B981', // green border focus matching screenshot
                      backgroundColor: '#FFFFFF',
                      boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.1)',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#94A3B8' }}>
                      person
                    </span>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Nama Lengkap"
                      style={{
                        border: 'none',
                        outline: 'none',
                        width: '100%',
                        fontSize: '0.9rem',
                        color: '#0F172A',
                        backgroundColor: 'transparent',
                      }}
                    />
                  </div>
                </div>

                {/* 2. Alamat Email */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>
                    Alamat Email
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#94A3B8' }}>
                      alternate_email
                    </span>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="email@example.com"
                      style={{
                        border: 'none',
                        outline: 'none',
                        width: '100%',
                        fontSize: '0.9rem',
                        color: '#0F172A',
                        backgroundColor: 'transparent',
                      }}
                    />
                  </div>
                </div>

                {/* 3. Kata Sandi */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>
                    Kata Sandi
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#94A3B8' }}>
                      key
                    </span>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Kata Sandi (min. 6 karakter)"
                      style={{
                        border: 'none',
                        outline: 'none',
                        width: '100%',
                        fontSize: '0.9rem',
                        color: '#0F172A',
                        backgroundColor: 'transparent',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94A3B8', display: 'flex' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        {showRegPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* 4. Konfirmasi Kata Sandi */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>
                    Konfirmasi Kata Sandi
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#94A3B8' }}>
                      key
                    </span>
                    <input
                      type={showRegConfirmPassword ? 'text' : 'password'}
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Konfirmasi Kata Sandi"
                      style={{
                        border: 'none',
                        outline: 'none',
                        width: '100%',
                        fontSize: '0.9rem',
                        color: '#0F172A',
                        backgroundColor: 'transparent',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94A3B8', display: 'flex' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        {showRegConfirmPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* 5. Checkbox Agreement with Toggleable Terms */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '2px' }}>
                    <input
                      type="checkbox"
                      id="regAgreeCheckbox"
                      checked={regAgree}
                      onChange={(e) => setRegAgree(e.target.checked)}
                      style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: '#10B981', cursor: 'pointer' }}
                    />
                    <label htmlFor="regAgreeCheckbox" style={{ fontSize: '0.84rem', color: '#475569', lineHeight: 1.45, cursor: 'pointer' }}>
                      Saya setuju dengan{' '}
                      <span
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowTermsInline(!showTermsInline);
                        }}
                        style={{
                          color: '#0284C7',
                          fontWeight: 700,
                          textDecoration: 'underline',
                          cursor: 'pointer',
                        }}
                        title="Klik untuk melihat syarat dan kebijakan kemitraan"
                      >
                        syarat dan kebijakan
                      </span>{' '}
                      <span
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowTermsInline(!showTermsInline);
                        }}
                        style={{
                          fontSize: '0.72rem',
                          color: '#0284C7',
                          cursor: 'pointer',
                          display: 'inline-block',
                          transition: 'transform 0.2s ease',
                          transform: showTermsInline ? 'rotate(180deg)' : 'rotate(0deg)',
                        }}
                      >
                        ▼
                      </span>
                    </label>
                  </div>

                  {/* Kotak syarat & kebijakan hanya muncul KETIKA DIKLIK */}
                  {showTermsInline && (
                    <div
                      style={{
                        marginTop: '10px',
                        backgroundColor: '#F8FAFC',
                        border: '1.5px solid #BAE6FD',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        fontSize: '0.78rem',
                        color: '#334155',
                        lineHeight: 1.5,
                        boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px' }}>
                        <strong style={{ color: '#0369A1', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem' }}>
                          <span>📋</span> Ketentuan Utama Mitra MapahTrip:
                        </strong>
                        <button
                          type="button"
                          onClick={() => setShowTermsInline(false)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#64748B',
                            fontSize: '0.74rem',
                            cursor: 'pointer',
                            padding: '2px 6px',
                            fontWeight: 700,
                          }}
                        >
                          ✕ Tutup
                        </button>
                      </div>

                      <ul style={{ margin: 0, paddingLeft: '18px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <li>
                          <strong>Komisi Referral:</strong> Rp 100.000 flat per visa terbit / selesai.
                        </li>
                        <li>
                          <strong>Pendaftaran 100% Gratis:</strong> Tanpa biaya admin atau iuran bulanan.
                        </li>
                        <li>
                          <strong>Pencairan Komisi:</strong> Dicairkan berkala via transfer bank / e-wallet resmi.
                        </li>
                        <li>
                          <strong>Keaslian Dokumen:</strong> Wajib menjamin keabsahan berkas calon pemohon (dilarang manipulasi berkas).
                        </li>
                        <li>
                          <strong>Kerahasiaan Data:</strong> MapahTrip menjamin privasi data pemohon terjaga aman.
                        </li>
                      </ul>

                      <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setShowTermsModal(true)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#0284C7',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            padding: 0,
                            textDecoration: 'underline',
                          }}
                        >
                          Baca Dokumen Lengkap ➔
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRegAgree(true);
                            setShowTermsInline(false);
                          }}
                          style={{
                            backgroundColor: '#10B981',
                            color: '#FFFFFF',
                            border: 'none',
                            padding: '5px 14px',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Paham &amp; Setujui ✓
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isRegistering}
                  style={{
                    marginTop: '8px',
                    backgroundColor: isRegistering ? '#059669' : '#10B981',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '13px',
                    borderRadius: '12px',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    cursor: isRegistering ? 'not-allowed' : 'pointer',
                    opacity: isRegistering ? 0.8 : 1,
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  {isRegistering ? (
                    <>
                      <span>Mendaftarkan Akun...</span>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        sync
                      </span>
                    </>
                  ) : (
                    <span>Daftar Akun &amp; Dapatkan Kode ➔</span>
                  )}
                </button>
              </form>

              {/* Switch to Login */}
              <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.85rem', color: '#64748B' }}>
                Sudah punya akun?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#005bb5',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Masuk di sini
                </button>
              </div>

              {/* Coba Demo Link */}
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed #E2E8F0', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={handleStartDemoMode}
                  style={{
                    background: 'none',
                    border: '1px solid #FDE68A',
                    color: '#B45309',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '999px',
                    backgroundColor: '#FFFBEB',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#FEF3C7';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFBEB';
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#D97706' }}>
                    visibility
                  </span>
                  <span>Coba Demo Dashboard (Tanpa Mendaftar) ➔</span>
                </button>
              </div>
            </div>
          ) : (
            /* ================= LOGIN VIEW ================= */
            <div>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h2
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: '#0F172A',
                    margin: '0 0 6px',
                    letterSpacing: '-0.02em',
                  }}
                >
                  Masuk ke Akun Mitra
                </h2>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748B' }}>
                  Masukkan email atau kode referral dan kata sandi Anda
                </p>
              </div>

                            {authSuccessMsg && (
                <div
                  style={{
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    color: '#166534',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontSize: '0.82rem',
                    marginBottom: '16px',
                  }}
                >
                  {authSuccessMsg}
                </div>
              )}
{authError && (
                <div
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#B91C1C',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontSize: '0.82rem',
                    marginBottom: '16px',
                  }}
                >
                  {authError}
                </div>
              )}

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Email / Kode */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>
                    Alamat Email / Kode Referral
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#94A3B8' }}>
                      alternate_email
                    </span>
                    <input
                      type="text"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="email@example.com / MT-KODE"
                      style={{
                        border: 'none',
                        outline: 'none',
                        width: '100%',
                        fontSize: '0.9rem',
                        color: '#0F172A',
                        backgroundColor: 'transparent',
                      }}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>
                    Kata Sandi
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#94A3B8' }}>
                      key
                    </span>
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Kata Sandi"
                      style={{
                        border: 'none',
                        outline: 'none',
                        width: '100%',
                        fontSize: '0.9rem',
                        color: '#0F172A',
                        backgroundColor: 'transparent',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94A3B8', display: 'flex' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        {showLoginPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <a
                    href="https://wa.me/6281401735648?text=Halo%20Admin%20MapahTrip,%20saya%20lupa%20kata%20sandi%20akun%20mitra%20saya"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '0.8rem', color: '#005bb5', textDecoration: 'none', fontWeight: 600 }}
                  >
                    Lupa kata sandi?
                  </a>
                </div>

                {/* Submit Login Button */}
                <button
                  type="submit"
                  style={{
                    backgroundColor: '#005bb5',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '13px',
                    borderRadius: '12px',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0, 91, 181, 0.25)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Masuk ke Portal Mitra ➔
                </button>
              </form>

              {/* Switch to Register */}
              <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.85rem', color: '#64748B' }}>
                Belum punya akun mitra?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setAuthError('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#10B981',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Daftar Akun Baru
                </button>
              </div>

              {/* Coba Demo Link */}
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed #E2E8F0', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={handleStartDemoMode}
                  style={{
                    background: 'none',
                    border: '1px solid #FDE68A',
                    color: '#B45309',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '999px',
                    backgroundColor: '#FFFBEB',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#FEF3C7';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFBEB';
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#D97706' }}>
                    visibility
                  </span>
                  <span>Coba Demo Dashboard (Tanpa Mendaftar) ➔</span>
                </button>
              </div>
            </div>
          )}
        </div>
        {/* Modal Syarat & Kebijakan Kemitraan MapahTrip */}
        {renderTermsModal()}
        {/* Modal Notifikasi Berhasil Daftar Akun Mitra */}
        {renderRegisteredSuccessModal()}
      </div>
    );
  }

  
  // =========================================================================
  // VIEW 1.5: PARTNER CLUB MENU & FORM (SESUAI NFIC NURUL FIKRI UNTUK VISA)
  // Menampilkan landing page menu Informasi/Insentif terlebih dahulu,
  // lalu klik "Daftar Sekarang" untuk membuka formulir pendaftaran.
  // =========================================================================
  
  const renderSuccessReferralModal = () => {
    if (!successReferralModal || !successReferralModal.isOpen) return null;

    const copyCode = () => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(successReferralModal.code);
        setCopiedSuccessCode(true);
        setTimeout(() => setCopiedSuccessCode(false), 2500);
      }
    };

    const handleCloseModal = () => {
      setSuccessReferralModal(null);
      setOnboardingView('dashboard');
      setPortalTab('mpc');
      setPartnerSubTab('insentif');
      setIsEditingBank(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            maxWidth: '500px',
            width: '100%',
            padding: '36px 28px',
            textAlign: 'center',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
            border: '1px solid #E2E8F0',
          }}
        >
          {/* Animated Green Badge */}
          <div
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '50%',
              backgroundColor: '#ECFDF5',
              border: '2px solid #10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#059669',
              boxShadow: '0 12px 28px -6px rgba(16, 185, 129, 0.4)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '42px' }}>
              task_alt
            </span>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#ECFDF5',
              color: '#059669',
              padding: '4px 14px',
              borderRadius: '9999px',
              fontSize: '0.74rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '12px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
              check_circle
            </span>
            Data Berhasil Disimpan
          </div>

          <h3
            style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              color: '#0F172A',
              marginBottom: '8px',
              lineHeight: 1.3,
            }}
          >
            Pendaftaran Berhasil!
          </h3>

          <p style={{ fontSize: '0.86rem', color: '#64748B', lineHeight: 1.55, marginBottom: '20px' }}>
            Halo <strong>{successReferralModal.nama}</strong>, profil Anda telah terverifikasi dan aktif. Berikut Kode Referral resmi Anda:
          </p>

          {/* Box Kode Referral */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '2px dashed #005BB5',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.70rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Kode Referral Resmi Anda
              </div>
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: '#005BB5',
                  letterSpacing: '0.05em',
                  marginTop: '2px',
                }}
              >
                {successReferralModal.code}
              </div>
            </div>

            <button
              type="button"
              onClick={copyCode}
              style={{
                backgroundColor: copiedSuccessCode ? '#10B981' : '#005BB5',
                color: '#FFFFFF',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '10px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                {copiedSuccessCode ? 'done' : 'content_copy'}
              </span>
              <span>{copiedSuccessCode ? 'Tersalin!' : 'Salin Kode'}</span>
            </button>
          </div>

          {/* Step Reminder Info Box */}
          <div
            style={{
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '22px',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#D97706', flexShrink: 0, marginTop: '1px' }}>
              account_balance
            </span>
            <div style={{ fontSize: '0.80rem', color: '#92400E', lineHeight: 1.45 }}>
              <strong>Langkah Terakhir:</strong> Silakan lengkapi nomor rekening Bank atau E-Wallet untuk pencairan insentif komisi resmi Anda sebelum menuju Dasbor Utama.
            </div>
          </div>

          {/* Action button */}
          <button
            type="button"
            onClick={handleCloseModal}
            style={{
              width: '100%',
              backgroundColor: '#10B981',
              color: '#FFFFFF',
              border: 'none',
              padding: '14px',
              borderRadius: '14px',
              fontSize: '0.95rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#059669';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#10B981';
            }}
          >
            <span>Lanjut Pengisian Rekening / E-Wallet &rarr;</span>
          </button>
        </div>
      </div>
    );
  };

  // =========================================================================
  // UNIFIED AFFILIATE PORTAL (OPSI 1: DASBOR MONITORING VISA & PARTNER CLUB MPC)
  // =========================================================================
  if (currentUser) {
    if (onboardingView === 'form' && !currentUser.isProfileComplete) {
      
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 16px',
          fontFamily: 'inherit',
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.02)',
            padding: '36px 32px',
            maxWidth: '680px',
            width: '100%',
          }}
        >
          {/* Tombol Kembali ke Menu Landing Page */}
          <div style={{ marginBottom: '20px' }}>
            <button
              type="button"
              onClick={() => {
                setOnboardingView('dashboard');
                setPortalTab('mpc');
                setPartnerSubTab('informasi');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#005BB5',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: 0,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
              <span>Kembali ke Informasi Program</span>
            </button>
          </div>

          {/* Header Form */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'rgba(0, 91, 181, 0.08)',
                color: '#005BB5',
                padding: '6px 16px',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                fontWeight: 800,
                marginBottom: '12px',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                badge
              </span>
              <span>Langkah 2: Formulir Pendaftaran Mitra</span>
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
              Formulir Pendaftaran Mitra
            </h2>
            <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748B', lineHeight: 1.5 }}>
              Lengkapi identitas kemitraan resmi MapahTrip untuk pencairan komisi transfer dan penerbitan Kode Referral unik Anda.
            </p>
          </div>

          {/* Info Banner: Kode Diberikan Setelah Isi Data */}
          <div
            style={{
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '12px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              marginBottom: '24px',
              fontSize: '0.84rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1E40AF' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#2563EB', flexShrink: 0 }}>
                lock_clock
              </span>
              <span>
                <strong>Kode Referral Resmi</strong> akan otomatis diterbitkan dan diberikan setelah Anda melengkapi seluruh formulir data diri di bawah ini.
              </span>
            </div>
            <span style={{ fontSize: '0.74rem', color: '#1E40AF', backgroundColor: '#DBEAFE', padding: '4px 12px', borderRadius: '6px', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
              Menunggu Data
            </span>
          </div>

          {/* Error Alert */}
          {profileError && (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '12px',
                padding: '12px 16px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#991B1B',
                fontSize: '0.84rem',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                error
              </span>
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* 1. Status Mitra */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Status Mitra <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                value={profileStatus}
                onChange={(e) => {
                  const val = e.target.value;
                  setProfileStatus(val);
                  if (val === 'Umum' && (!profileLembaga || profileLembaga === 'Japan Center Indonesia')) {
                    setProfileLembaga('-');
                  }
                }}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: profileStatus ? '#0F172A' : '#94A3B8',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              >
                <option value="">pilih status</option>
                {STATUS_MITRA_LIST.map((st) => (
                  <option key={st} value={st} style={{ color: '#0F172A' }}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Nama Lengkap & Lembaga */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Nama Lengkap <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="nama lengkap"
                  value={profileNama}
                  onChange={(e) => setProfileNama(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Lembaga / Instansi <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 500 }}>(atau isi &quot;-&quot; jika perorangan)</span>
                </label>
                <input
                  type="text"
                  placeholder='nama LPK / biro travel / agensi (atau isi "-")'
                  value={profileLembaga}
                  onChange={(e) => setProfileLembaga(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    backgroundColor: '#FFFFFF',
                  }}
                />
                <span style={{ fontSize: '0.73rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#005BB5' }}>info</span>
                  <span>Boleh diisi &quot;-&quot; jika pendaftar Umum / perorangan atau tidak memiliki lembaga</span>
                </span>
              </div>
            </div>

            {/* 3. No Whatsapp & Provinsi */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  No Whatsapp <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="nomor dengan format 08xxxxxxxxxx atau 628xxxxxxxxxx"
                  value={profileNoWa}
                  onKeyDown={(e) => {
                    if (
                      [
                        'Backspace',
                        'Delete',
                        'Tab',
                        'Escape',
                        'Enter',
                        'ArrowLeft',
                        'ArrowRight',
                        'ArrowUp',
                        'ArrowDown',
                        'Home',
                        'End',
                      ].includes(e.key) ||
                      e.ctrlKey ||
                      e.metaKey
                    ) {
                      return;
                    }
                    if (!/^[0-9]$/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onInput={(e: React.FormEvent<HTMLInputElement>) => {
                    e.currentTarget.value = e.currentTarget.value.replace(/\D/g, '');
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pasteData = e.clipboardData.getData('text') || '';
                    const cleanDigits = pasteData.replace(/\D/g, '').slice(0, 16);
                    setProfileNoWa(cleanDigits);
                  }}
                  onChange={(e) => setProfileNoWa(e.target.value.replace(/\D/g, ''))}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Provinsi <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={profileProvinsi}
                  onChange={(e) => setProfileProvinsi(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: profileProvinsi ? '#0F172A' : '#94A3B8',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                >
                  <option value="">Pilih Provinsi</option>
                  {PROVINSI_LIST.map((prov) => (
                    <option key={prov} value={prov} style={{ color: '#0F172A' }}>
                      {prov}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4. Alamat Tinggal */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Alamat <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <textarea
                placeholder="alamat tinggal"
                value={profileAlamat}
                onChange={(e) => setProfileAlamat(e.target.value)}
                required
                rows={2}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.88rem',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* 5. Jenis Identitas & Nomor Identitas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Jenis Identitas <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={profileJenisIdentitas}
                  onChange={(e) => setProfileJenisIdentitas(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                >
                  <option value="">Pilih Jenis Identitas</option>
                  {JENIS_IDENTITAS_LIST.map((idType) => (
                    <option key={idType} value={idType}>
                      {idType}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Nomor Identitas <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={16}
                  placeholder="nomor identitas"
                  value={profileNomorIdentitas}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 16);
                    setProfileNomorIdentitas(val);
                    if (val.length === 16 && profileError && (profileError.includes('KTP') || profileError.includes('NIK'))) {
                      setProfileError('');
                    }
                  }}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: profileError && (profileError.includes('KTP') || profileError.includes('NIK')) ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
                    backgroundColor: profileError && (profileError.includes('KTP') || profileError.includes('NIK')) ? '#FEF2F2' : '#FFFFFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s ease',
                  }}
                />
                {profileError && (profileError.includes('KTP') || profileError.includes('NIK')) && (
                  <div
                    style={{
                      marginTop: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      color: '#DC2626',
                      fontSize: '0.80rem',
                      fontWeight: 600,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#DC2626' }}>
                      error
                    </span>
                    <span>
                      {profileNomorIdentitas.length === 0
                        ? 'Belum sesuai identitas KTP. Harap isi dengan 16 digit nomor KTP.'
                        : `Belum sesuai identitas KTP (baru ${profileNomorIdentitas.length}/16 digit). Harap isi dengan 16 digit nomor KTP.`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div style={{ marginTop: '16px' }}>
              <button
                type="submit"
                disabled={isSavingProfile}
                style={{
                  width: '100%',
                  backgroundColor: isSavingProfile ? '#059669' : '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '14px',
                  borderRadius: '14px',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  cursor: isSavingProfile ? 'not-allowed' : 'pointer',
                  opacity: isSavingProfile ? 0.8 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSavingProfile) e.currentTarget.style.backgroundColor = '#059669';
                }}
                onMouseLeave={(e) => {
                  if (!isSavingProfile) e.currentTarget.style.backgroundColor = '#10B981';
                }}
              >
                {isSavingProfile ? (
                  <>
                    <span>Menyimpan Data...</span>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      sync
                    </span>
                  </>
                ) : (
                  <>
                    <span>Simpan Data &amp; Terbitkan Kode Referral &rarr;</span>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      key
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer note */}
          <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748B',
                fontSize: '0.78rem',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Keluar / Ganti Akun Lain
            </button>
          </div>
        </div>
        {renderSuccessReferralModal()}
      </div>
    );
  }

    return (
      <div className="affiliate-portal-root" style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', display: 'flex', color: '#0F172A', fontFamily: 'inherit' }}>
        {/* Mobile Backdrop Overlay */}
        {isMobileMenuOpen && (
          <div
            className="portal-mobile-backdrop"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Top Navigation Header */}
        <header className="portal-mobile-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="portal-mobile-menu-btn"
              title="Buka Menu Navigasi"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>menu</span>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img
                src={logoPutih}
                alt="MapahTrip"
                onError={(e) => handleImageFallback(e, getLogoPutihFallbacks())}
                style={{ height: '28px', width: 'auto' }}
              />
              <div>
                <strong style={{ fontSize: '0.92rem', color: '#0F172A', display: 'block', lineHeight: 1.1 }}>MapahTrip</strong>
                <span style={{ fontSize: '0.68rem', color: '#64748B' }}>Partner Portal</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowNotifPopover(!showNotifPopover)}
              style={{
                background: 'none',
                border: 'none',
                padding: '6px',
                cursor: 'pointer',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Notifikasi Aktivitas"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '24px', color: unreadNotifications.length > 0 ? '#10B981' : '#64748B' }}>
                {unreadNotifications.length > 0 ? 'notifications_active' : 'notifications'}
              </span>
              {unreadNotifications.length > 0 && (
                <span style={{ position: 'absolute', top: '2px', right: '2px', minWidth: '16px', height: '16px', borderRadius: '8px', backgroundColor: '#EF4444', color: '#FFF', fontSize: '0.62rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', border: '1.5px solid #FFFFFF', lineHeight: 1 }}>
                  {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
                </span>
              )}
            </button>

            {/* Popover Notifikasi di Tampilan HP */}
            {renderNotificationPopover()}
          </div>
        </header>

        {/* Persistent Left Sidebar (Desktop) / Slide-over Drawer (Mobile) */}
        <aside
          className={`affiliate-portal-sidebar ${isMobileMenuOpen ? 'is-open' : ''}`}
          style={{
            width: '240px',
            backgroundColor: '#FFFFFF',
            borderRight: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '24px 16px',
            flexShrink: 0,
          }}
        >
          <div>
            {/* Brand Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', paddingLeft: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img
                  src={logoPutih}
                  alt="MapahTrip Logo"
                  onError={(e) => handleImageFallback(e, getLogoPutihFallbacks())}
                  style={{ height: '36px', width: 'auto', objectFit: 'contain' }}
                />
                <div>
                  <strong style={{ fontSize: '1.05rem', color: '#0F172A', display: 'block', lineHeight: 1.1 }}>
                    MapahTrip
                  </strong>
                  <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Partner Portal</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="portal-sidebar-close-btn"
                title="Tutup Menu"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
              </button>
            </div>

            {/* Nav Category 1: Platform User */}
            <div style={{ marginBottom: '24px' }}>
              <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', paddingLeft: '12px', display: 'block', marginBottom: '8px' }}>
                Platform User
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setPortalTab('dasbor');
                    setIsMobileMenuOpen(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: portalTab === 'dasbor' ? '1px solid #BBF7D0' : 'none',
                    backgroundColor: portalTab === 'dasbor' ? '#F0FDF4' : 'transparent',
                    color: portalTab === 'dasbor' ? '#166534' : '#64748B',
                    fontSize: '0.85rem',
                    fontWeight: portalTab === 'dasbor' ? 700 : 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: portalTab === 'dasbor' ? '#10B981' : 'inherit' }}>dashboard</span>
                  <span>Dasbor</span>
                </button>
              </div>
            </div>

            {/* Nav Category 2: Afiliasi */}
            <div style={{ marginBottom: '24px' }}>
              <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', paddingLeft: '12px', display: 'block', marginBottom: '8px' }}>
                Afiliasi
              </span>
              <button
                type="button"
                onClick={() => {
                  setPortalTab('mpc');
                  setIsMobileMenuOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: portalTab === 'mpc' ? '1px solid #BBF7D0' : 'none',
                  backgroundColor: portalTab === 'mpc' ? '#F0FDF4' : 'transparent',
                  color: portalTab === 'mpc' ? '#166534' : '#64748B',
                  fontSize: '0.85rem',
                  fontWeight: portalTab === 'mpc' ? 700 : 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: portalTab === 'mpc' ? '#10B981' : 'inherit' }}>groups</span>
                <span>Partner Club (MPC)</span>
              </button>
            </div>

            {/* Nav Category 3: Bantuan */}
            <div>
              <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', paddingLeft: '12px', display: 'block', marginBottom: '8px' }}>
                Bantuan &amp; Info
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowTermsModal(true);
                    setIsMobileMenuOpen(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#64748B',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>article</span>
                  <span>Syarat &amp; Ketentuan</span>
                </button>
                <a
                  href="https://wa.me/6281401735648?text=Halo%20MapahTrip,%20saya%20ingin%20tanya%20program%20mitra%20affiliate%20visa"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    color: '#64748B',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>support_agent</span>
                  <span>Pusat Bantuan</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    onSwitchMode('customer');
                    setIsMobileMenuOpen(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#64748B',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>public</span>
                  <span>Halaman Pelanggan</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom User Pill */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {currentUser.nama.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <strong style={{ fontSize: '0.82rem', color: '#0F172A', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentUser.nama}
                </strong>
                <span style={{ fontSize: '0.7rem', color: '#94A3B8', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentUser.email}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Keluar"
              style={{
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
            </button>
          </div>
        </aside>

        {/* Right Main Content Area */}
        <main className="affiliate-portal-main" style={{ flex: 1, minWidth: 0, padding: '20px 20px', overflowY: 'auto', overflowX: 'hidden' }}>
          {(currentUser?.isDemo || currentUser?.id === 'aff_demo') && (
            <div className="portal-demo-banner">
              <div className="portal-demo-main-row">
                <div className="portal-demo-icon">
                  <span className="material-symbols-outlined">visibility</span>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <strong className="portal-demo-title">
                      Mode Demo Dashboard
                    </strong>
                    <span
                      style={{
                        backgroundColor: '#F59E0B',
                        color: '#78350F',
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: '999px',
                        letterSpacing: '0.5px',
                      }}
                    >
                      SIMULASI
                    </span>
                  </div>
                  <p className="portal-demo-desc">
                    Simulasi pelacakan berkas siswa &amp; komisi transfer <strong>Rp 100.000 / visa terbit</strong>. Dapatkan kode referral resmi Anda sendiri sekarang!
                  </p>
                </div>
              </div>

              <div className="portal-demo-actions">
                <button
                  type="button"
                  className="portal-demo-btn-daftar"
                  onClick={() => {
                    setCurrentUser(null);
                    setAuthMode('register');
                    window.location.hash = '#affiliate-register';
                  }}
                >
                  <span>Daftar Akun Resmi</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>arrow_forward</span>
                </button>

                <button
                  type="button"
                  className="portal-demo-btn-keluar"
                  onClick={() => {
                    setCurrentUser(null);
                    onSwitchMode('customer');
                    window.location.hash = '';
                  }}
                >
                  Keluar Demo
                </button>
              </div>
            </div>
          )}
          {portalTab === 'dasbor' ? (
            <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
        {/* Banner Welcome & Search */}
        <div
          className="portal-welcome-banner"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            padding: '24px 28px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
            marginBottom: '24px',
            position: 'relative',
          }}
        >
          {/* Notification Bell di Pojok Kanan Atas */}
          <div className="welcome-banner-notif-btn" style={{ position: 'absolute', top: '22px', right: '24px', zIndex: 30 }}>
            <button
              type="button"
              onClick={() => setShowNotifPopover(!showNotifPopover)}
              title="Notifikasi Aktivitas Pemohon"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                boxShadow: 'none',
                padding: '6px',
                cursor: 'pointer',
                position: 'relative',
                outline: 'none',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: '24px',
                  color: unreadNotifications.length > 0 ? '#10B981' : '#64748B',
                  animation: unreadNotifications.length > 0 ? 'bellRing 3s infinite ease-in-out' : 'none',
                  display: 'block',
                }}
              >
                {unreadNotifications.length > 0 ? 'notifications_active' : 'notifications'}
              </span>

              {unreadNotifications.length > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    minWidth: '18px',
                    height: '18px',
                    borderRadius: '9px',
                    backgroundColor: '#EF4444',
                    color: '#FFFFFF',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    border: '2px solid #FFFFFF',
                    boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)',
                    animation: 'pulseBadge 2s infinite ease-in-out',
                    lineHeight: 1,
                    boxSizing: 'border-box',
                  }}
                >
                  {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
                </span>
              )}
            </button>

            {/* Popover Dropdown Notifikasi di Pojok Kanan */}
            {renderNotificationPopover()}
          </div>

          {/* Konten Kiri Banner (Judul, Subtitle, Tombol & Search) */}
          <div className="portal-welcome-content" style={{ paddingRight: '56px' }}>
            <div className="portal-welcome-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#EFF6FF', color: '#0284C7', padding: '3px 10px', borderRadius: '9999px', border: '1px solid #DBEAFE', fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
              <span>⛩️</span>
              <span>MITRA RESMI MAPAHTRIP</span>
            </div>
            <h1 className="portal-welcome-title" style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.25 }}>
              Selamat Datang, {currentUser.nama}!
            </h1>
            <p className="portal-welcome-subtitle" style={{ color: '#64748B', fontSize: '0.86rem', margin: '6px 0 0', maxWidth: '780px', lineHeight: 1.5 }}>
              Bagikan kode referral Anda kepada calon pemohon visa Jepang untuk pencatatan komisi dan pelacakan status berkas otomatis.
            </p>

            {activeAffiliateCode && (
              <div className="portal-referral-strip" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '14px', backgroundColor: '#F8FAFC', border: '1.5px dashed #CBD5E1', borderRadius: '12px', padding: '6px 6px 6px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>KODE:</span>
                  <span style={{ fontSize: '1.02rem', fontWeight: 900, color: '#005BB5', fontFamily: 'monospace', letterSpacing: '1px' }}>{activeAffiliateCode}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(activeAffiliateCode);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="portal-copy-btn"
                  style={{
                    backgroundColor: copiedCode ? '#059669' : '#0F172A',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '7px 14px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                    boxShadow: copiedCode ? '0 2px 6px rgba(5, 150, 105, 0.3)' : '0 2px 6px rgba(15, 23, 42, 0.2)',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                    {copiedCode ? 'done' : 'content_copy'}
                  </span>
                  <span>{copiedCode ? 'Tersalin!' : 'Salin Kode'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Highlight Banner saat ada Notifikasi Pemohon Masuk */}
        {unreadNotifications.length > 0 && !isNotifBannerDismissed && (
          <div
            className="portal-notif-banner"
            style={{
              position: 'relative',
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: '16px',
              padding: '14px 18px',
              marginBottom: '20px',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.05)',
            }}
          >
            {/* Tombol Tutup / Dismiss Banner */}
            <button
              type="button"
              onClick={() => setIsNotifBannerDismissed(true)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'none',
                border: 'none',
                color: '#86EFAC',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#15803D')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#86EFAC')}
              title="Tutup banner pemberitahuan ini"
            >
              ✕
            </button>

            <div className="portal-notif-banner-content" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', paddingRight: '28px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: '#DCFCE7',
                  color: '#16A34A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '1px',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  campaign
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
                  <strong style={{ fontSize: '0.88rem', color: '#166534', fontWeight: 800 }}>
                    Notifikasi Pemohon Baru
                  </strong>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      backgroundColor: '#DCFCE7',
                      color: '#15803D',
                      border: '1px solid #BBF7D0',
                      padding: '1px 8px',
                      borderRadius: '9999px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {unreadNotifications.length} Aktivitas Baru
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#15803D', lineHeight: 1.45 }}>
                  Terdapat {affiliateCandidates.length} pemohon visa yang mendaftar melalui kode referral Anda (<strong>{activeAffiliateCode}</strong>). Pantau status berkas dan pencairan insentif di bawah.
                </p>
              </div>
            </div>

            <div className="portal-notif-banner-actions">
              <button
                type="button"
                onClick={() => setShowNotifPopover(true)}
                className="portal-notif-action-btn"
                style={{
                  backgroundColor: '#16A34A',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '7px 16px',
                  borderRadius: '9px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(22, 163, 74, 0.2)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#15803D')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#16A34A')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  notifications
                </span>
                <span>Buka Notifikasi ({unreadNotifications.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. Partner Key Metric Cards (1 Baris Rapi) */}
        <div className="partner-metrics-grid">
          {/* Card 1: Total Kandidat (Summary Utama) */}
          <div
            className="metric-card-total"
            style={{ backgroundColor: '#FFFFFF', padding: '14px 16px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', minWidth: 0 }}
          >
            {/* Desktop View: Sesuai 4 kartu lainnya */}
            <div className="metric-total-desktop-view">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Total Pemohon</span>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#2563EB', flexShrink: 0 }}>groups</span>
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', marginTop: '4px', lineHeight: 1.2 }}>{stats.total}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Kandidat Binaan Anda</div>
            </div>

            {/* Mobile View: Baris horizontal rapi tanpa teks tumpang tindih */}
            <div className="metric-total-mobile-view">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#DBEAFE', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>groups</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.3px', lineHeight: 1.2 }}>Total Pemohon</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px', lineHeight: 1.2 }}>Kandidat Binaan Anda</div>
                </div>
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#1D4ED8', lineHeight: 1, paddingLeft: '12px', flexShrink: 0 }}>
                {stats.total}
              </div>
            </div>
          </div>

          {/* Card 2: Berkas Tiba & Lengkap */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '14px 16px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Berkas Lengkap</span>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#16A34A', flexShrink: 0 }}>verified</span>
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#15803D', marginTop: '4px', lineHeight: 1.2 }}>{stats.berkasLengkap}</div>
            <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Form &amp; Paspor siap</div>
          </div>

          {/* Card 3: Proses Konsulat */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '14px 16px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9A3412', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Proses JVAC</span>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#EA580C', flexShrink: 0 }}>pending</span>
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#C2410C', marginTop: '4px', lineHeight: 1.2 }}>{stats.sedangProses}</div>
            <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Verifikasi konsulat</div>
          </div>

          {/* Card 4: Selesai / Siap Kirim */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '14px 16px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0369A1', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Visa Terbit</span>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0284C7', flexShrink: 0 }}>task_alt</span>
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0284C7', marginTop: '4px', lineHeight: 1.2 }}>{stats.siapTerbang}</div>
            <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Stiker terpasang</div>
          </div>

          {/* Card 5: Handover Bandara */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '14px 16px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6D28D9', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Kirim / Handover</span>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#7C3AED', flexShrink: 0 }}>flight_takeoff</span>
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#7C3AED', marginTop: '4px', lineHeight: 1.2 }}>{stats.handoverSoetta}</div>
            <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Dikirim / Soetta T3</div>
          </div>
        </div>

        {/* 4. Tab Navigation & Filter Toolbar: Daftar Kandidat vs Jadwal Bandara */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '18px' }}>
          {/* Row 1: Segmented Tabs (Pemohon Binaan vs Jadwal Bandara) */}
          <div className="portal-tab-wrapper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div className="portal-tab-group" style={{ display: 'inline-flex', backgroundColor: '#E2E8F0', padding: '3px', borderRadius: '12px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('kandidat')}
                className={`portal-tab-btn ${activeTab === 'kandidat' ? 'active' : ''}`}
                style={{
                  backgroundColor: activeTab === 'kandidat' ? '#FFFFFF' : 'transparent',
                  color: activeTab === 'kandidat' ? '#0F172A' : '#64748B',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  border: 'none',
                  padding: '7px 18px',
                  borderRadius: '9px',
                  cursor: 'pointer',
                  boxShadow: activeTab === 'kandidat' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                📋 Pemohon Binaan ({filteredList.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('jadwal')}
                className={`portal-tab-btn ${activeTab === 'jadwal' ? 'active' : ''}`}
                style={{
                  backgroundColor: activeTab === 'jadwal' ? '#FFFFFF' : 'transparent',
                  color: activeTab === 'jadwal' ? '#0F172A' : '#64748B',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  border: 'none',
                  padding: '7px 18px',
                  borderRadius: '9px',
                  cursor: 'pointer',
                  boxShadow: activeTab === 'jadwal' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                ✈️ Jadwal Bandara ({flightSchedules.length})
              </button>
            </div>
          </div>

          {/* Row 2: Search Box & Status Filter Bar (Tepat di atas tabel) */}
          {activeTab === 'kandidat' && (
            <div
              className="portal-table-controls"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              {/* Search Box Pemohon */}
              <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
                <span
                  className="material-symbols-outlined"
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94A3B8',
                    fontSize: '18px',
                  }}
                >
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama pemohon / nomor paspor..."
                  style={{
                    width: '100%',
                    padding: '8px 32px 8px 36px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.82rem',
                    outline: 'none',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0284C7';
                    e.target.style.boxShadow = '0 0 0 3px rgba(2, 132, 199, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#CBD5E1';
                    e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.03)';
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '14px',
                    }}
                    title="Hapus Pencarian"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Status Filter Buttons */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: 'Semua Status' },
                  { id: 'verifikasi', label: 'Menunggu Berkas' },
                  { id: 'proses', label: 'Proses Konsulat' },
                  { id: 'siap', label: 'Siap Ambil' },
                  { id: 'selesai', label: 'Visa Selesai' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setStatusFilter(f.id)}
                    style={{
                      backgroundColor: statusFilter === f.id ? '#0F172A' : '#FFFFFF',
                      color: statusFilter === f.id ? '#FFFFFF' : '#475569',
                      border: '1px solid ' + (statusFilter === f.id ? '#0F172A' : '#CBD5E1'),
                      padding: '6px 13px',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 5. Main Content: Candidate Tracking Table / Cards */}
        {activeTab === 'kandidat' ? (
          <div>
            {/* Desktop Table View (Hidden on mobile) */}
            <div
              className="candidate-desktop-table"
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                overflow: 'hidden',
                boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left', fontSize: '0.80rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', color: '#64748B', fontWeight: 700 }}>
                      <th
                        style={{
                          position: 'sticky',
                          left: 0,
                          zIndex: 3,
                          backgroundColor: '#F8FAFC',
                          padding: '12px 14px',
                          whiteSpace: 'nowrap',
                          width: '85px',
                          minWidth: '85px',
                          borderBottom: '2px solid #CBD5E1',
                          borderRight: '1px solid #E2E8F0',
                          boxShadow: '2px 0 5px rgba(0,0,0,0.03)',
                        }}
                      >
                        No. &amp; ID
                      </th>
                      <th style={{ padding: '12px 10px', minWidth: '130px', borderBottom: '2px solid #CBD5E1' }}>Nama Pemohon / Kandidat</th>
                      <th style={{ padding: '12px 8px', whiteSpace: 'nowrap', width: '90px', borderBottom: '2px solid #CBD5E1' }}>No. Paspor</th>
                      <th style={{ padding: '12px 8px', whiteSpace: 'nowrap', width: '100px', borderBottom: '2px solid #CBD5E1' }}>Program Visa</th>
                      <th style={{ padding: '8px 8px', textAlign: 'center', width: '350px', minWidth: '350px', borderBottom: '2px solid #CBD5E1' }}>
                        <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: '4px', fontSize: '0.80rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <span>Status Pengajuan</span>
                          <span style={{ fontSize: '0.68rem', backgroundColor: '#EFF6FF', color: '#1E40AF', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            🔒 Dikelola Tim Staf
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', fontSize: '0.68rem', color: '#475569', fontWeight: 700, width: '100%', minWidth: '340px' }}>
                          <span style={{ backgroundColor: '#F1F5F9', padding: '2px 2px', borderRadius: '4px' }}>Sampai</span>
                          <span style={{ backgroundColor: '#F1F5F9', padding: '2px 2px', borderRadius: '4px' }}>Proses</span>
                          <span style={{ backgroundColor: '#F1F5F9', padding: '2px 2px', borderRadius: '4px' }}>Selesai</span>
                          <span style={{ backgroundColor: '#F1F5F9', padding: '2px 2px', borderRadius: '4px' }}>Kirim</span>
                        </div>
                      </th>
                      <th style={{ padding: '12px 10px', minWidth: '120px', borderBottom: '2px solid #CBD5E1' }}>Resi / Pengiriman</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', whiteSpace: 'nowrap', width: '75px', borderBottom: '2px solid #CBD5E1' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '48px 20px', textAlign: 'center' }}>
                          <div style={{ maxWidth: '460px', margin: '0 auto' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#F0FDF4', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>group_add</span>
                            </div>
                            <h4 style={{ margin: '0 0 6px', fontSize: '0.96rem', fontWeight: 800, color: '#0F172A' }}>
                              {searchQuery ? 'Tidak Ada Pemohon Sesuai Pencarian' : 'Belum Ada Pemohon Binaan'}
                            </h4>
                            <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: '#64748B', lineHeight: 1.5 }}>
                              {searchQuery
                                ? `Tidak ditemukan kandidat binaan Anda dengan kata kunci "${searchQuery}". Coba kata kunci lain.`
                                : `Belum ada calon pemohon visa yang mendaftar menggunakan kode referral Anda (${activeAffiliateCode || 'MPC'}). Bagikan kode referral Anda kepada calon pemohon untuk mulai mengumpulkan komisi Rp 100.000 / visa.`}
                            </p>
                            {!searchQuery && activeAffiliateCode && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(activeAffiliateCode);
                                  setCopiedCode(true);
                                  setTimeout(() => setCopiedCode(false), 2000);
                                }}
                                style={{
                                  backgroundColor: copiedCode ? '#059669' : '#0F172A',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  padding: '9px 18px',
                                  borderRadius: '9px',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                                  {copiedCode ? 'done' : 'content_copy'}
                                </span>
                                <span>{copiedCode ? 'Kode Tersalin!' : 'Salin Kode Referral'}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredList.map((item, idx) => (
                        <tr
                          key={item.id}
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            transition: 'background-color 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#F8FAFC';
                            const firstCell = e.currentTarget.querySelector('.sticky-col-id') as HTMLElement;
                            if (firstCell) firstCell.style.backgroundColor = '#F8FAFC';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#FFFFFF';
                            const firstCell = e.currentTarget.querySelector('.sticky-col-id') as HTMLElement;
                            if (firstCell) firstCell.style.backgroundColor = '#FFFFFF';
                          }}
                        >
                          {/* ID (Sticky Left) */}
                          <td
                            className="sticky-col-id"
                            style={{
                              position: 'sticky',
                              left: 0,
                              zIndex: 2,
                              backgroundColor: '#FFFFFF',
                              padding: '10px 14px',
                              color: '#64748B',
                              fontWeight: 600,
                              fontSize: '0.78rem',
                              borderBottom: '1px solid #F1F5F9',
                              borderRight: '1px solid #E2E8F0',
                              boxShadow: '2px 0 5px rgba(0,0,0,0.03)',
                            }}
                          >
                            <div style={{ fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>{item.noPengajuan}</div>
                            <div style={{ fontSize: '0.70rem', color: '#94A3B8' }}>#{idx + 1}</div>
                          </td>

                          {/* Nama */}
                          <td style={{ padding: '10px 8px' }}>
                            <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.82rem' }}>{item.namaPemohon}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                              WA: {item.noTelp || '-'}
                            </div>
                          </td>

                          {/* Paspor */}
                          <td style={{ padding: '10px 8px', fontWeight: 700, color: '#0F172A', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                            {item.noPaspor}
                          </td>

                          {/* Program */}
                          <td style={{ padding: '10px 8px' }}>
                            <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: '#EFF6FF', color: '#1E40AF', whiteSpace: 'nowrap' }}>{item.program}</span>
                          </td>

                          {/* Status Pengajuan 4 Tahapan Ceklis: Sampai | Proses | Selesai | Kirim */}
                          <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                            {(() => {
                              const st = getCandidateStages(item);
                              const stageItems = [
                                { key: 'sampai' as const, label: 'Sampai', ok: st.isSampai, date: st.tglSampai, color: '#0284C7', bg: '#E0F2FE', border: '#BAE6FD' },
                                { key: 'proses' as const, label: 'Proses', ok: st.isProses, date: st.tglProses, color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
                                { key: 'selesai' as const, label: 'Selesai', ok: st.isSelesai, date: st.tglSelesai, color: '#16A34A', bg: '#DCFCE7', border: '#BBF7D0' },
                                { key: 'kirim' as const, label: 'Kirim', ok: st.isKirim, date: st.tglKirim, color: '#7C3AED', bg: '#F3E8FF', border: '#DDD6FE' },
                              ];
                              return (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', width: '100%', minWidth: '340px' }}>
                                  {stageItems.map((s) => (
                                    <div
                                      key={s.key}
                                      style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: s.ok ? s.bg : '#F8FAFC',
                                        border: `1px solid ${s.ok ? s.border : '#E2E8F0'}`,
                                        borderRadius: '7px',
                                        padding: '5px 2px',
                                        transition: 'all 0.15s ease',
                                        boxSizing: 'border-box',
                                        minWidth: '80px',
                                      }}
                                    >
                                      <div
                                        title={s.ok ? `Tahap ${s.label} telah selesai (${s.date || '-'})` : `Tahap ${s.label} belum selesai (Dikelola oleh Tim Staf MapahTrip)`}
                                        style={{
                                          width: '100%',
                                          cursor: 'default',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: '3px',
                                          fontSize: '0.72rem',
                                          fontWeight: 800,
                                          color: s.ok ? s.color : '#94A3B8',
                                          whiteSpace: 'nowrap',
                                          lineHeight: 1.2,
                                          userSelect: 'none',
                                        }}
                                      >
                                        {s.ok && <span style={{ fontSize: '0.74rem', fontWeight: 900 }}>✓</span>}
                                        <span>{s.label}</span>
                                      </div>
                                      <span
                                        style={{
                                          fontSize: '0.62rem',
                                          fontFamily: 'inherit',
                                          color: s.ok ? s.color : '#CBD5E1',
                                          fontWeight: s.ok ? 700 : 500,
                                          lineHeight: 1.2,
                                          marginTop: '3px',
                                          whiteSpace: 'nowrap',
                                          wordBreak: 'keep-all',
                                          letterSpacing: '-0.3px',
                                          display: 'inline-block',
                                        }}
                                      >
                                        {s.ok ? (s.date || getTodayFormatted()) : '-'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </td>

                          {/* Resi / Pengiriman */}
                          <td style={{ padding: '10px 8px' }}>
                            {(() => {
                              const st = getCandidateStages(item);
                              const finalResi = (st.isKirim && st.noResi) ? st.noResi : item.noResi;
                              if (finalResi) {
                                const lower = finalResi.toLowerCase();
                                const isAirport = lower.includes('soetta') || lower.includes('bandara') || lower.includes('flight') || lower.includes('handover');
                                const isOffice = lower.includes('kantor') || lower.includes('langsung');

                                const iconName = isAirport ? 'flight_takeoff' : isOffice ? 'storefront' : 'local_shipping';
                                const bg = isAirport ? '#EFF6FF' : isOffice ? '#F0FDF4' : '#F3E8FF';
                                const color = isAirport ? '#1D4ED8' : isOffice ? '#15803D' : '#6B21A8';
                                const border = isAirport ? '#BFDBFE' : isOffice ? '#BBF7D0' : '#E9D5FF';

                                return (
                                  <div>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '0.73rem', fontWeight: 700, backgroundColor: bg, color: color, border: `1px solid ${border}` }}>
                                      <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>{iconName}</span>
                                      <span>{finalResi}</span>
                                    </span>
                                    {st.tglKirim && (
                                      <div style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: '2px' }}>
                                        Tgl: {st.tglKirim}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              return (
                                <div style={{ color: '#94A3B8', fontSize: '0.74rem' }}>
                                  <span>-</span>
                                </div>
                              );
                            })()}
                            {item.catatan && (
                              <div style={{ fontSize: '0.70rem', color: '#64748B', marginTop: '2px' }}>
                                {item.catatan}
                              </div>
                            )}
                          </td>

                          {/* Action Button */}
                          <td style={{ padding: '10px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <button
                              type="button"
                              onClick={() => setSelectedKandidat(item)}
                              style={{
                                backgroundColor: '#F1F5F9',
                                color: '#0F172A',
                                border: '1px solid #CBD5E1',
                                padding: '5px 12px',
                                borderRadius: '7px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#E2E8F0';
                                e.currentTarget.style.borderColor = '#94A3B8';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#F1F5F9';
                                e.currentTarget.style.borderColor = '#CBD5E1';
                              }}
                            >
                              <span>Rincian</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View (Visible only on mobile <= 768px via CSS) */}
            <div className="candidate-mobile-cards">
              {filteredList.length === 0 ? (
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '36px 16px', textAlign: 'center' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#F0FDF4', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>group_add</span>
                  </div>
                  <h4 style={{ margin: '0 0 4px', fontSize: '0.92rem', fontWeight: 800, color: '#0F172A' }}>
                    Belum Ada Pemohon Binaan
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B', lineHeight: 1.5 }}>
                    Bagikan kode referral Anda untuk mulai mengumpulkan komisi.
                  </p>
                </div>
              ) : (
                filteredList.map((item, idx) => {
                  const st = getCandidateStages(item);
                  const stageItems = [
                    { key: 'sampai' as const, label: 'Sampai', ok: st.isSampai, color: '#0284C7', bg: '#E0F2FE' },
                    { key: 'proses' as const, label: 'Proses', ok: st.isProses, color: '#D97706', bg: '#FEF3C7' },
                    { key: 'selesai' as const, label: 'Selesai', ok: st.isSelesai, color: '#16A34A', bg: '#DCFCE7' },
                    { key: 'kirim' as const, label: 'Kirim', ok: st.isKirim, color: '#7C3AED', bg: '#F3E8FF' },
                  ];

                  return (
                    <div
                      key={`mob-${item.id}`}
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '14px',
                        padding: '14px 16px',
                        boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      {/* Row 1: ID, Index & Program */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748B', backgroundColor: '#F1F5F9', padding: '2px 7px', borderRadius: '6px' }}>
                            #{idx + 1}
                          </span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A' }}>
                            {item.noPengajuan}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1E40AF', backgroundColor: '#EFF6FF', padding: '2px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                          {item.program}
                        </span>
                      </div>

                      {/* Row 2: Nama & Paspor */}
                      <div>
                        <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0F172A' }}>
                          {item.namaPemohon}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '3px' }}>
                          Paspor: <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>{item.noPaspor}</strong>
                          {item.noTelp && ` • WA: ${item.noTelp}`}
                        </div>
                      </div>

                      {/* Row 3: 4-Tahapan Ceklis Progress */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginTop: '2px' }}>
                        {stageItems.map((s) => (
                          <div
                            key={s.key}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: s.ok ? s.bg : '#F8FAFC',
                              border: `1px solid ${s.ok ? 'transparent' : '#E2E8F0'}`,
                              borderRadius: '6px',
                              padding: '5px 2px',
                              textAlign: 'center',
                            }}
                          >
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: s.ok ? s.color : '#94A3B8' }}>
                              {s.ok ? '✓ ' : ''}{s.label}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Row 4: Resi & Tombol Rincian */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px dashed #F1F5F9' }}>
                        <div>
                          {item.noResi ? (() => {
                            const lower = item.noResi.toLowerCase();
                            const isAirport = lower.includes('soetta') || lower.includes('bandara') || lower.includes('flight') || lower.includes('handover');
                            const isOffice = lower.includes('kantor') || lower.includes('langsung');
                            const iconEmoji = isAirport ? '✈️' : isOffice ? '🏢' : '🚚';
                            const bg = isAirport ? '#EFF6FF' : isOffice ? '#F0FDF4' : '#F3E8FF';
                            const color = isAirport ? '#1D4ED8' : isOffice ? '#15803D' : '#6B21A8';

                            return (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 7px', borderRadius: '5px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: bg, color: color }}>
                                <span>{iconEmoji}</span>
                                <span>{item.noResi}</span>
                              </span>
                            );
                          })() : (
                            <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Belum ada resi</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedKandidat(item)}
                          style={{
                            backgroundColor: '#0F172A',
                            color: '#FFFFFF',
                            border: 'none',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>Rincian</span>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* Jadwal Terbang / Soetta */
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              padding: '24px 20px',
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
              ✈️ Daftar Serah Terima Paspor di Bandara Soekarno-Hatta (Terminal 3)
            </h3>
            {flightSchedules.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>flight_takeoff</span>
                </div>
                <h4 style={{ margin: '0 0 6px', fontSize: '0.96rem', fontWeight: 800, color: '#0F172A' }}>
                  Belum Ada Jadwal Serah Terima di Bandara
                </h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B', maxWidth: '420px', marginInline: 'auto', lineHeight: 1.5 }}>
                  Paspor pemohon yang telah terbit visa dapat diserahterimakan langsung oleh tim MapahTrip di Terminal 3 Bandara Soekarno-Hatta menjelang jam penerbangan.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
                {flightSchedules.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#0F172A' }}>{item.namaPemohon}</strong>
                      <span style={{ fontSize: '0.75rem', color: '#2563EB', fontWeight: 700 }}>{item.program}</span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '6px' }}>
                      Paspor: <strong>{item.noPaspor}</strong> • WA: {item.noTelp}
                    </div>
                    {(() => {
                      const itemResi = localStageOverrides[item.id]?.noResi || item.noResi;
                      return (
                        <div
                          style={{
                            backgroundColor: '#EFF6FF',
                            color: '#1E40AF',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span style={{ fontSize: '1rem' }}>✈️</span>
                          <span>{itemResi || item.catatan || 'Jadwal Serah Terima Bandara Soekarno-Hatta (T3)'}</span>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
          ) : (
            <div>
              
            {/* Header Judul & Notifikasi di Ujung Kanan */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
              <div>
                <h1 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 700, color: '#1E293B' }}>
                  MapahTrip Partner Club (MPC)
                </h1>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748B' }}>
                  Ajak siswa LPK atau pemohon buat visa Jepang di MapahTrip, nikmati keuntungan komisi lebih besar.
                </p>
              </div>

              {/* Notifikasi di Ujung Kanan (disembunyikan di HP karena sudah ada di navbar atas) */}
              <div className="welcome-banner-notif-btn" style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowNotifPopover(!showNotifPopover)}
                  title="Notifikasi Aktivitas Pemohon"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'transparent',
                    border: 'none',
                    boxShadow: 'none',
                    padding: '6px',
                    cursor: 'pointer',
                    position: 'relative',
                    outline: 'none',
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: '24px',
                      color: unreadNotifications.length > 0 ? '#10B981' : '#64748B',
                      animation: unreadNotifications.length > 0 ? 'bellRing 3s infinite ease-in-out' : 'none',
                      display: 'block',
                    }}
                  >
                    {unreadNotifications.length > 0 ? 'notifications_active' : 'notifications'}
                  </span>

                  {unreadNotifications.length > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '-2px',
                        minWidth: '18px',
                        height: '18px',
                        borderRadius: '9px',
                        backgroundColor: '#EF4444',
                        color: '#FFFFFF',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 4px',
                        border: '2px solid #FFFFFF',
                        boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)',
                        animation: 'pulseBadge 2s infinite ease-in-out',
                        lineHeight: 1,
                        boxSizing: 'border-box',
                      }}
                    >
                      {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
                    </span>
                  )}
                </button>

                {/* Popover Dropdown Notifikasi */}
                {renderNotificationPopover()}
              </div>
            </div>

            {/* Sub-Tabs Modern: Informasi vs Insentif vs Peringkat */}
            <div
              className="mpc-subtabs-nav"
              style={{
                display: 'flex',
                gap: '8px',
                borderBottom: '1px solid #E2E8F0',
                marginBottom: '24px',
                overflowX: 'auto',
                scrollbarWidth: 'none',
              }}
            >
              <button
                type="button"
                onClick={() => setPartnerSubTab('informasi')}
                className={`mpc-subtab-btn ${partnerSubTab === 'informasi' ? 'active' : ''}`}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: partnerSubTab === 'informasi' ? '3px solid #10B981' : '3px solid transparent',
                  padding: '10px 12px 12px',
                  color: partnerSubTab === 'informasi' ? '#0F172A' : '#64748B',
                  fontWeight: partnerSubTab === 'informasi' ? 800 : 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: '15px' }}>ℹ️</span>
                <span>Informasi</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!currentUser?.isProfileComplete) {
                    setShowNotRegisteredToast(true);
                    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
                    toastTimerRef.current = setTimeout(() => {
                      setShowNotRegisteredToast(false);
                    }, 4000);
                    return;
                  }
                  setPartnerSubTab('insentif');
                }}
                className={`mpc-subtab-btn ${partnerSubTab === 'insentif' ? 'active' : ''}`}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: partnerSubTab === 'insentif' ? '3px solid #10B981' : '3px solid transparent',
                  padding: '10px 12px 12px',
                  color: partnerSubTab === 'insentif' ? '#0F172A' : '#64748B',
                  fontWeight: partnerSubTab === 'insentif' ? 800 : 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: '15px' }}>💰</span>
                <span>Insentif</span>
              </button>

              <button
                type="button"
                onClick={() => setPartnerSubTab('peringkat')}
                className={`mpc-subtab-btn ${partnerSubTab === 'peringkat' ? 'active' : ''}`}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: partnerSubTab === 'peringkat' ? '3px solid #10B981' : '3px solid transparent',
                  padding: '10px 12px 12px',
                  color: partnerSubTab === 'peringkat' ? '#0F172A' : '#64748B',
                  fontWeight: partnerSubTab === 'peringkat' ? 800 : 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: '15px' }}>🏆</span>
                <span>Peringkat<span className="mpc-tab-word-mitra"> Mitra</span></span>
              </button>
            </div>

            {/* TAB 1: INFORMASI */}
            {partnerSubTab === 'informasi' && (
              <div style={{ maxWidth: '820px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <h2 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 700, color: '#1E293B' }}>
                    Informasi
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748B' }}>
                    Daftar jadi Mitra MPC, dan dapatkan insentifnya
                  </p>
                </div>

                {/* Deskripsi Box (Sesuai Screenshot NFIC) */}
                <div
                  className="mpc-info-card"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '24px 28px',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
                    marginBottom: '20px',
                  }}
                >
                  <p className="mpc-info-desc" style={{ margin: '0 0 16px', fontSize: '0.88rem', color: '#334155', lineHeight: 1.65 }}>
                    <strong>MapahTrip Partner Club (MPC)</strong> adalah program kemitraan resmi berbasis referral untuk memperluas jangkauan layanan visa Jepang melalui para mitra dari LPK, biro travel, alumni magang, dan masyarakat umum.
                  </p>

                  {/* 3 Keuntungan Ringkas Berbasis Poin */}
                  <div className="mpc-benefit-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px', marginBottom: '18px' }}>
                    <div className="mpc-benefit-card" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', flexShrink: 0 }}>
                        ✨
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.25 }}>Tanpa Modal &amp; Biaya</div>
                        <p style={{ margin: '3px 0 0', fontSize: '0.74rem', color: '#64748B', lineHeight: 1.4 }}>
                          Cukup bagikan kode referral tanpa biaya registrasi apapun.
                        </p>
                      </div>
                    </div>

                    <div className="mpc-benefit-card" style={{ backgroundColor: '#F0FDF4', border: '1px solid #DCFCE7', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#DCFCE7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', flexShrink: 0 }}>
                        💵
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#166534', lineHeight: 1.25 }}>Komisi Rp 100.000 / Visa</div>
                        <p style={{ margin: '3px 0 0', fontSize: '0.74rem', color: '#15803D', lineHeight: 1.4 }}>
                          Ditransfer otomatis ke rekening bank Anda setelah visa terbit.
                        </p>
                      </div>
                    </div>

                    <div className="mpc-benefit-card" style={{ backgroundColor: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#DBEAFE', color: '#1E40AF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', flexShrink: 0 }}>
                        📱
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1E40AF', lineHeight: 1.25 }}>Pelacakan Transparan</div>
                        <p style={{ margin: '3px 0 0', fontSize: '0.74rem', color: '#2563EB', lineHeight: 1.4 }}>
                          Pantau status berkas pemohon &amp; riwayat pencairan secara realtime.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="mpc-terms-btn"
                    style={{
                      backgroundColor: '#F1F5F9',
                      color: '#0F172A',
                      border: '1px solid #CBD5E1',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E2E8F0')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#475569' }}>
                      description
                    </span>
                    <span>Syarat dan Ketentuan</span>
                  </button>
                </div>

                {/* Banner Motivasi Leaderboard Penghasilan Nyata Mitra */}
                <div
                  className="mpc-leaderboard-banner"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    padding: '20px 24px',
                    color: '#0F172A',
                    marginBottom: '20px',
                    boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)',
                    border: '1.5px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px',
                  }}
                >
                  <div className="mpc-leaderboard-content" style={{ flex: '1 1 280px', minWidth: 0 }}>
                    <div
                      className="mpc-winner-badge"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#FEF3C7',
                        border: '1px solid #FDE68A',
                        color: '#B45309',
                        fontSize: '0.73rem',
                        fontWeight: 800,
                        padding: '4px 12px',
                        borderRadius: '999px',
                        marginBottom: '8px',
                        lineHeight: 1.3,
                        boxShadow: '0 1px 2px rgba(245, 158, 11, 0.08)',
                      }}
                    >
                      <span style={{ fontSize: '0.9rem' }}>🏆</span>
                      <span>Top 1 Mitra: <strong>Rizky Muhammad E</strong></span>
                      <span style={{ backgroundColor: '#B45309', color: '#FEF3C7', padding: '1px 6px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 800, marginLeft: '2px' }}>
                        Rp 1.300.000
                      </span>
                    </div>
                    <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.35 }}>
                      Lihat Peringkat &amp; Penghasilan Nyata 61 Mitra MapahTrip
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748B', maxWidth: '540px', lineHeight: 1.5 }}>
                      Data transparan dari rekapan resmi. Mitra aktif telah berhasil mengantongi jutaan rupiah dari komisi visa Jepang. Mulai sekarang dan raih posisi teratas!
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPartnerSubTab('peringkat')}
                    className="mpc-leaderboard-btn"
                    style={{
                      backgroundColor: '#0F172A',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '10px',
                      fontSize: '0.84rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1E293B')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0F172A')}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#FBBF24' }}>
                      trophy
                    </span>
                    <span>Buka Peringkat Mitra</span>
                  </button>
                </div>

                {/* Tombol Hijau: Daftar Sekarang (Hanya muncul jika mitra belum menyelesaikan pendaftaran profil MPC) */}
                {!currentUser?.isProfileComplete && (
                  <div style={{ marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setOnboardingView('form')}
                      className="mpc-register-now-btn"
                      style={{
                        backgroundColor: '#10B981',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '14px 28px',
                        borderRadius: '12px',
                        fontSize: '0.95rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '10px',
                        boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#059669';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#10B981';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <span>Daftar Sekarang</span>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        open_in_new
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: INSENTIF (DESAIN RAMPING, ELEGAN & PROPORSIONAL) */}
            {partnerSubTab === 'insentif' && (
              <div style={{ maxWidth: '980px' }}>
                {/* Header Kompak */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>Skema Insentif &amp; Riwayat Pencairan</span>
                      <span style={{ fontSize: '0.72rem', backgroundColor: '#ECFDF5', color: '#047857', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, border: '1px solid #A7F3D0' }}>
                        Resmi MapahTrip
                      </span>
                    </h2>
                    <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                      Komisi flat resmi <strong>Rp 100.000 / visa terbit</strong> &bull; Bebas biaya admin transfer
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setPartnerSubTab('peringkat')}
                      style={{
                        backgroundColor: '#F8FAFC',
                        color: '#334155',
                        border: '1px solid #CBD5E1',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#64748B' }}>
                        leaderboard
                      </span>
                      <span>🏆 Lihat Peringkat Mitra Real</span>
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#64748B' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#10B981' }}>sync</span>
                      <span>Pencairan otomatis setelah visa disetujui</span>
                    </div>
                  </div>
                </div>

                {/* 3 Compact Metric Tiles: Ramping & Elegan */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                  {/* Tile 1: Sudah Ditransfer */}
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #86EFAC',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        Sudah Ditransfer
                      </span>
                      <span style={{ fontSize: '0.7rem', backgroundColor: '#DCFCE7', color: '#15803D', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        {countSudahDitransfer} Selesai
                      </span>
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0F172A', margin: '3px 0 2px' }}>
                      {formatRupiah(totalSudahDitransfer)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#16A34A', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>check_circle</span>
                      <span>Berhasil masuk ke rekening</span>
                    </div>
                  </div>

                  {/* Tile 2: Menunggu Selesai */}
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #DDD6FE',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        Menunggu Visa Selesai
                      </span>
                      <span style={{ fontSize: '0.7rem', backgroundColor: '#F3E8FF', color: '#6D28D9', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        {countMenungguTransfer} Proses
                      </span>
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0F172A', margin: '3px 0 2px' }}>
                      {formatRupiah(totalMenungguTransfer)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#8B5CF6', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>hourglass_top</span>
                      <span>Sedang proses di JVAC/Konsulat</span>
                    </div>
                  </div>

                  {/* Tile 3: Total Akumulasi */}
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #BAE6FD',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        Total Akumulasi Komisi
                      </span>
                      <span style={{ fontSize: '0.7rem', backgroundColor: '#E0F2FE', color: '#0369A1', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        {countTotalPemohon} Pemohon
                      </span>
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0F172A', margin: '3px 0 2px' }}>
                      {formatRupiah(totalAkumulasiKomisi)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#0284C7', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>group</span>
                      <span>Total pemohon terafiliasi</span>
                    </div>
                  </div>
                </div>

                {/* Info Rekening Ramping (1 Baris) */}
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                    fontSize: '0.75rem',
                    color: '#475569',
                    marginBottom: '18px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: (currentUser?.namaBank && currentUser?.nomorRekening) ? '#0284C7' : '#D97706' }}>
                      {(currentUser?.namaBank && currentUser?.nomorRekening) ? 'account_balance' : 'account_balance_wallet'}
                    </span>
                    {(currentUser?.namaBank && currentUser?.nomorRekening) ? (
                      <span>
                        Rekening Pencairan: <strong>{currentUser.namaBank}</strong> ({currentUser.nomorRekening.length > 4 ? `${currentUser.nomorRekening.slice(0, 4)}••••` : currentUser.nomorRekening}) a.n <strong>{currentUser.atasNamaRekening || currentUser.nama}</strong>
                      </span>
                    ) : (
                      <span>
                        Rekening Pencairan: <strong style={{ color: '#D97706' }}>Belum Diisi</strong> (Silakan lengkapi formulir rekening di bawah)
                      </span>
                    )}
                  </div>
                  {(currentUser?.namaBank && currentUser?.nomorRekening) ? (
                    <span style={{ color: '#059669', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>verified</span>
                      Terverifikasi
                    </span>
                  ) : (
                    <span style={{ color: '#B45309', backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>pending</span>
                      Belum Diisi
                    </span>
                  )}
                </div>

                {/* TABEL RINCIAN RIWAYAT TRANSFER: RAMPING & BERSIH */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                    marginBottom: '20px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#10B981' }}>receipt_long</span>
                      <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>
                        Riwayat Transfer Insentif
                      </h4>
                    </div>

                    {/* Filter Status Transfer Mini */}
                    <div style={{ display: 'inline-flex', backgroundColor: '#F1F5F9', padding: '2px', borderRadius: '8px', gap: '2px' }}>
                      <button
                        type="button"
                        onClick={() => setFilterTransferStatus('all')}
                        style={{
                          backgroundColor: filterTransferStatus === 'all' ? '#FFFFFF' : 'transparent',
                          color: filterTransferStatus === 'all' ? '#0F172A' : '#64748B',
                          border: 'none',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: filterTransferStatus === 'all' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                        }}
                      >
                        Semua ({riwayatTransferList.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterTransferStatus('selesai')}
                        style={{
                          backgroundColor: filterTransferStatus === 'selesai' ? '#FFFFFF' : 'transparent',
                          color: filterTransferStatus === 'selesai' ? '#15803D' : '#64748B',
                          border: 'none',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: filterTransferStatus === 'selesai' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                        }}
                      >
                        Sudah Ditransfer ({countSudahDitransfer})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterTransferStatus('pending')}
                        style={{
                          backgroundColor: filterTransferStatus === 'pending' ? '#FFFFFF' : 'transparent',
                          color: filterTransferStatus === 'pending' ? '#B45309' : '#64748B',
                          border: 'none',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: filterTransferStatus === 'pending' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                        }}
                      >
                        Menunggu ({countMenungguTransfer})
                      </button>
                    </div>
                  </div>

                  {/* Table View Ramping (Desktop) */}
                  <div className="riwayat-desktop-table" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          <th style={{ padding: '8px 10px' }}>No. Ref &amp; Waktu</th>
                          <th style={{ padding: '8px 10px' }}>Nama Pemohon / Visa</th>
                          <th style={{ padding: '8px 10px' }}>Nominal</th>
                          <th style={{ padding: '8px 10px' }}>Status</th>
                          <th style={{ padding: '8px 10px', textAlign: 'center' }}>Bukti</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRiwayatTransfer.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ padding: '36px 16px', textAlign: 'center', color: '#64748B' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#CBD5E1', display: 'block', marginBottom: '6px' }}>
                                receipt_long
                              </span>
                              <strong style={{ display: 'block', fontSize: '0.84rem', color: '#0F172A', marginBottom: '2px' }}>
                                Belum Ada Riwayat Transfer
                              </strong>
                              <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                                Riwayat transfer insentif akan otomatis tercatat setiap kali visa pemohon rujukan Anda selesai diproses.
                              </span>
                            </td>
                          </tr>
                        ) : (
                          filteredRiwayatTransfer.map((item, idx) => (
                          <tr
                            key={item.id}
                            style={{
                              borderBottom: idx !== filteredRiwayatTransfer.length - 1 ? '1px solid #F1F5F9' : 'none',
                              backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                            }}
                          >
                            <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                              <div style={{ fontWeight: 700, color: '#0F172A', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                {item.noRef}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#64748B' }}>
                                {item.tanggalTransfer}
                              </div>
                            </td>

                            <td style={{ padding: '8px 10px' }}>
                              <div style={{ fontWeight: 700, color: '#0F172A' }}>
                                {item.namaPemohon}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#0284C7' }}>
                                {item.programVisa} &bull; {item.konsulat}
                              </div>
                            </td>

                            <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                              <span style={{ fontWeight: 800, color: '#10B981', fontSize: '0.84rem' }}>
                                {formatRupiah(item.nominal)}
                              </span>
                            </td>

                            <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                              {item.status === 'Berhasil Ditransfer' ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    backgroundColor: '#DCFCE7',
                                    color: '#15803D',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                  }}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>check_circle</span>
                                  Ditransfer
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    backgroundColor: '#FEF3C7',
                                    color: '#B45309',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                  }}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>hourglass_empty</span>
                                  Menunggu
                                </span>
                              )}
                            </td>

                            <td style={{ padding: '8px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                              {item.status === 'Berhasil Ditransfer' ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedBuktiTransfer(item)}
                                  style={{
                                    backgroundColor: '#F0FDF4',
                                    color: '#047857',
                                    border: '1px solid #86EFAC',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    transition: 'all 0.15s ease',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#DCFCE7';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#F0FDF4';
                                  }}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>receipt</span>
                                  <span>Struk</span>
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                                  -
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View (Langsung Nampil Tanpa Scroll Horizontal) */}
                  <div className="riwayat-mobile-cards">
                    {filteredRiwayatTransfer.length === 0 ? (
                      <div
                        style={{
                          padding: '24px 16px',
                          textAlign: 'center',
                          color: '#64748B',
                          backgroundColor: '#F8FAFC',
                          borderRadius: '12px',
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#CBD5E1', display: 'block', marginBottom: '4px' }}>
                          receipt_long
                        </span>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>Belum Ada Riwayat Transfer</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                          Riwayat transfer insentif akan otomatis tercatat setiap kali visa selesai diproses.
                        </div>
                      </div>
                    ) : (
                      filteredRiwayatTransfer.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: '12px',
                            border: '1px solid #E2E8F0',
                            padding: '12px 14px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0F172A', fontSize: '0.78rem' }}>
                              {item.noRef}
                            </span>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '2px 8px',
                                borderRadius: '999px',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                backgroundColor: item.status === 'Berhasil Ditransfer' ? '#DCFCE7' : '#FEF3C7',
                                color: item.status === 'Berhasil Ditransfer' ? '#15803D' : '#B45309',
                                border: `1px solid ${item.status === 'Berhasil Ditransfer' ? '#BBF7D0' : '#FDE68A'}`,
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>
                                {item.status === 'Berhasil Ditransfer' ? 'check_circle' : 'hourglass_empty'}
                              </span>
                              <span>{item.status === 'Berhasil Ditransfer' ? 'Ditransfer' : 'Menunggu'}</span>
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.86rem', lineHeight: 1.3 }}>
                                {item.namaPemohon}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#0284C7', marginTop: '2px', fontWeight: 600 }}>
                                {item.programVisa} &bull; {item.konsulat}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: '2px' }}>
                                {item.tanggalTransfer}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontWeight: 800, color: '#10B981', fontSize: '0.92rem', lineHeight: 1.2 }}>
                                {formatRupiah(item.nominal)}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '2px' }}>
                                {item.namaBank}
                              </div>
                            </div>
                          </div>

                          {item.status === 'Berhasil Ditransfer' && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px', borderTop: '1px dashed #F1F5F9' }}>
                              <button
                                type="button"
                                onClick={() => setSelectedBuktiTransfer(item)}
                                style={{
                                  backgroundColor: '#F0FDF4',
                                  color: '#047857',
                                  border: '1px solid #86EFAC',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>receipt</span>
                                <span>Lihat Struk Transfer</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* SECTION: PENGISIAN BANK / E-WALLET PENCAIRAN INSENTIF */}
                <div
                  className="rekening-outer-wrapper"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: currentUser?.isProfileComplete ? '1px solid #86EFAC' : '1px dashed #CBD5E1',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    marginBottom: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div className="rekening-outer-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: currentUser?.isProfileComplete ? '#DCFCE7' : '#F1F5F9',
                          color: currentUser?.isProfileComplete ? '#16A34A' : '#64748B',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                          account_balance_wallet
                        </span>
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0F172A' }}>
                          Rekening Bank &amp; E-Wallet Pencairan Insentif
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B' }}>
                          Rekening tujuan transfer komisi Rp 100.000 / visa terbit.
                        </p>
                      </div>
                    </div>

                    {/* Status Badge & Ubah Button */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      {currentUser?.namaBank && currentUser?.nomorRekening ? (
                        <>
                          <span
                            style={{
                              backgroundColor: '#DCFCE7',
                              color: '#15803D',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: '9999px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              border: '1px solid #86EFAC',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>verified</span>
                            <span>Siap Dicairkan</span>
                          </span>

                          {!isEditingBank && (
                            <button
                              type="button"
                              onClick={() => setIsEditingBank(true)}
                              className="rekening-btn-ubah"
                              style={{
                                backgroundColor: '#FFFFFF',
                                color: '#0F172A',
                                border: '1.5px solid #CBD5E1',
                                padding: '3px 9px',
                                borderRadius: '7px',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                transition: 'all 0.2s ease',
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#005BB5' }}>edit</span>
                              <span>Ubah</span>
                            </button>
                          )}
                        </>
                      ) : currentUser?.isProfileComplete ? (
                      <span
                        style={{
                          backgroundColor: '#FEF3C7',
                          color: '#92400E',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          border: '1px solid #FCD34D',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit_note</span>
                        Belum Diisi &bull; Silakan Lengkapi Rekening
                      </span>
                    ) : (
                      <span
                        style={{
                          backgroundColor: '#FEE2E2',
                          color: '#B91C1C',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          border: '1px solid #FCA5A5',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>lock</span>
                        Terkunci &bull; Belum Isi Formulir
                      </span>
                    )}
                  </div>
                </div>

                {/* KONDISI 1: JIKA BELUM ISI FORMULIR MITRA */}
                  {!currentUser?.isProfileComplete ? (
                    <div>
                      {/* Alert Box Terkunci */}
                      <div
                        style={{
                          backgroundColor: '#FEF2F2',
                          border: '1px solid #FECACA',
                          borderRadius: '12px',
                          padding: '14px 16px',
                          marginBottom: '16px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#EF4444', flexShrink: 0, marginTop: '2px' }}>
                          lock
                        </span>
                        <div>
                          <strong style={{ fontSize: '0.86rem', color: '#991B1B', display: 'block', marginBottom: '2px' }}>
                            Pengisian Rekening Masih Terkunci
                          </strong>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: '#7F1D1D', lineHeight: 1.45 }}>
                            Pengisian rekening bank atau e-wallet baru bisa dilakukan setelah Anda melengkapi <strong>Formulir Pendaftaran Mitra</strong> &amp; memperoleh <strong>Kode Referral</strong> resmi.
                          </p>
                        </div>
                      </div>

                      {/* Form Disabled / Read-Only Display Preview */}
                      <div style={{ opacity: 0.5, pointerEvents: 'none', filter: 'grayscale(30%)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>
                              1. Jenis Pencairan
                            </label>
                            <input
                              type="text"
                              disabled
                              value="Rekening Bank / E-Wallet"
                              style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', backgroundColor: '#F1F5F9', fontSize: '0.84rem', color: '#94A3B8' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>
                              2. Nama Bank / E-Wallet
                            </label>
                            <input
                              type="text"
                              disabled
                              value="BCA, Mandiri, BRI, DANA, GoPay..."
                              style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', backgroundColor: '#F1F5F9', fontSize: '0.84rem', color: '#94A3B8' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>
                              3. Nomor Rekening / No. HP
                            </label>
                            <input
                              type="text"
                              disabled
                              value="Contoh: 1234567890 / 0812xxxx"
                              style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', backgroundColor: '#F1F5F9', fontSize: '0.84rem', color: '#94A3B8' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>
                              4. Nama Pemilik (Atas Nama)
                            </label>
                            <input
                              type="text"
                              disabled
                              value="Contoh: Sesuai Buku Tabungan / E-Wallet"
                              style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', backgroundColor: '#F1F5F9', fontSize: '0.84rem', color: '#94A3B8' }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Tombol Ajakan: Isi Formulir Terlebih Dahulu */}
                      <div style={{ marginTop: '14px', textAlign: 'left' }}>
                        <button
                          type="button"
                          onClick={() => setOnboardingView('form')}
                          style={{
                            backgroundColor: '#0F172A',
                            color: '#FFFFFF',
                            border: 'none',
                            padding: '11px 20px',
                            borderRadius: '10px',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#38BDF8' }}>
                            edit_document
                          </span>
                          <span>Isi Formulir Pendaftaran Terlebih Dahulu ➔</span>
                        </button>
                      </div>
                    </div>
                  ) : currentUser?.namaBank && currentUser?.nomorRekening && !isEditingBank ? (
                    /* KONDISI 2A: REKENING SUDAH DISIMPAN & TERVERIFIKASI (BERSIH & KOMPAK) */
                    <div>
                      {bankSavedMsg && (
                        <div
                          style={{
                            backgroundColor: '#DCFCE7',
                            border: '1px solid #86EFAC',
                            color: '#15803D',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            marginBottom: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                          <span>{bankSavedMsg}</span>
                        </div>
                      )}

                      {/* Kartu Ramping Detail Rekening Pencairan (Lebar Penuh, Tanpa Patah Baris) */}
                      <div
                        className="rekening-digital-card"
                        style={{
                          backgroundColor: '#F8FAFC',
                          border: '1.5px solid #BBF7D0',
                          borderRadius: '12px',
                          padding: '12px 14px',
                          marginBottom: '10px',
                          boxShadow: '0 1px 4px rgba(16, 185, 129, 0.05)',
                        }}
                      >
                        {/* Baris 1: Nama Bank & Jenis Pencairan */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingBottom: '8px', borderBottom: '1px dashed #CBD5E1', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#005BB5' }}>
                              {pencairanKategori === 'ewallet' ? 'smartphone' : 'account_balance'}
                            </span>
                            <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.88rem' }}>
                              {currentUser.namaBank}
                            </span>
                          </div>
                          <span
                            style={{
                              backgroundColor: '#E0F2FE',
                              color: '#0369A1',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '999px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {pencairanKategori === 'ewallet' ? 'E-Wallet' : 'Bank Transfer'}
                          </span>
                        </div>

                        {/* Baris 2: Nomor Rekening (Lebar Penuh, Tidak Patah) + Tombol Salin */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                          <div>
                            <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                              {pencairanKategori === 'ewallet' ? 'Nomor HP Akun' : 'Nomor Rekening'}
                            </div>
                            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0F172A', fontFamily: 'monospace', letterSpacing: '0.8px', whiteSpace: 'nowrap', marginTop: '1px' }}>
                              {currentUser.nomorRekening}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (currentUser.nomorRekening) {
                                navigator.clipboard.writeText(currentUser.nomorRekening);
                                setBankCopied(true);
                                setTimeout(() => setBankCopied(false), 2000);
                              }
                            }}
                            title="Salin nomor rekening"
                            style={{
                              backgroundColor: bankCopied ? '#DCFCE7' : '#FFFFFF',
                              color: bankCopied ? '#15803D' : '#334155',
                              border: `1px solid ${bankCopied ? '#86EFAC' : '#CBD5E1'}`,
                              padding: '5px 10px',
                              borderRadius: '7px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: bankCopied ? '#16A34A' : '#64748B' }}>
                              {bankCopied ? 'check' : 'content_copy'}
                            </span>
                            <span>{bankCopied ? 'Tersalin' : 'Salin'}</span>
                          </button>
                        </div>

                        {/* Baris 3: Atas Nama Rekening */}
                        <div style={{ fontSize: '0.74rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', paddingTop: '4px' }}>
                          <span style={{ color: '#64748B' }}>Atas Nama:</span>
                          <strong style={{ color: '#0F172A', fontWeight: 800 }}>{currentUser.atasNamaRekening || currentUser.nama}</strong>
                        </div>
                      </div>

                      <div className="rekening-note-footer" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#047857', fontWeight: 600 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#10B981', flexShrink: 0 }}>verified_user</span>
                        <span>Rekening aktif &bull; siap menerima transfer otomatis komisi Rp 100.000 / visa terbit.</span>
                      </div>
                    </div>
                  ) : (
                    /* KONDISI 2B: FORMULIR INPUT REKENING (BELUM DIISI ATAU SEDANG UBAH) */
                    <form onSubmit={handleSaveBank}>
                      {bankSavedMsg && (
                        <div
                          style={{
                            backgroundColor: '#DCFCE7',
                            border: '1px solid #86EFAC',
                            color: '#15803D',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            marginBottom: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                          <span>{bankSavedMsg}</span>
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                        {/* 1. Kategori: Bank atau E-Wallet */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                            1. Jenis Pencairan <span style={{ color: '#EF4444' }}>*</span>
                          </label>
                          <select
                            value={pencairanKategori}
                            onChange={(e) => {
                              const val = e.target.value as 'bank' | 'ewallet' | '';
                              setPencairanKategori(val);
                              setBankNama('');
                            }}
                            required
                            style={{
                              width: '100%',
                              padding: '11px 12px',
                              borderRadius: '10px',
                              border: '1.5px solid #005BB5',
                              backgroundColor: '#EFF6FF',
                              fontSize: '0.86rem',
                              outline: 'none',
                              color: '#005BB5',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            <option value="">-- Pilih Bank / E-Wallet --</option>
                            <option value="bank">🏦 Rekening Bank Transfer</option>
                            <option value="ewallet">📱 Dompet Digital (E-Wallet)</option>
                          </select>
                        </div>

                        {/* 2. Pilihan Bank / E-Wallet Dinamis */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                            {pencairanKategori === 'ewallet'
                              ? '2. Nama E-Wallet'
                              : pencairanKategori === 'bank'
                              ? '2. Nama Bank'
                              : '2. Nama Bank / E-Wallet'}{' '}
                            <span style={{ color: '#EF4444' }}>*</span>
                          </label>
                          {pencairanKategori === 'bank' ? (
                            <select
                              value={bankNama}
                              onChange={(e) => setBankNama(e.target.value)}
                              required
                              style={{
                                width: '100%',
                                padding: '11px 12px',
                                borderRadius: '10px',
                                border: '1px solid #CBD5E1',
                                backgroundColor: '#FFFFFF',
                                fontSize: '0.86rem',
                                outline: 'none',
                                color: '#0F172A',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <option value="">-- Pilih Bank di Indonesia --</option>
                              {BANK_INDONESIA_GROUPS.map((group) => (
                                <optgroup key={group.kategori} label={group.kategori}>
                                  {group.banks.map((b) => (
                                    <option key={b} value={b}>
                                      {b}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          ) : pencairanKategori === 'ewallet' ? (
                            <select
                              value={bankNama}
                              onChange={(e) => setBankNama(e.target.value)}
                              required
                              style={{
                                width: '100%',
                                padding: '11px 12px',
                                borderRadius: '10px',
                                border: '1px solid #CBD5E1',
                                backgroundColor: '#FFFFFF',
                                fontSize: '0.86rem',
                                outline: 'none',
                                color: '#0F172A',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <option value="">-- Pilih E-Wallet --</option>
                              {EWALLET_LIST.map((ew) => (
                                <option key={ew} value={ew}>
                                  {ew}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <select
                              disabled
                              style={{
                                width: '100%',
                                padding: '11px 12px',
                                borderRadius: '10px',
                                border: '1px solid #CBD5E1',
                                backgroundColor: '#F1F5F9',
                                fontSize: '0.86rem',
                                outline: 'none',
                                color: '#94A3B8',
                                fontWeight: 600,
                              }}
                            >
                              <option value="">-- Pilih Jenis Pencairan Dulu --</option>
                            </select>
                          )}
                        </div>

                        {/* 3. Nomor Rekening / Nomor HP */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                            {pencairanKategori === 'ewallet'
                              ? '3. No. HP Akun E-Wallet'
                              : pencairanKategori === 'bank'
                              ? '3. Nomor Rekening Bank'
                              : '3. Nomor Rekening / HP'}{' '}
                            <span style={{ color: '#EF4444' }}>*</span>
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder={
                              pencairanKategori === 'ewallet'
                                ? 'contoh: 081234567890'
                                : 'contoh: 1234567890'
                            }
                            value={bankNomor}
                            onChange={(e) => setBankNomor(e.target.value.replace(/[^0-9]/g, ''))}
                            required
                            style={{
                              width: '100%',
                              padding: '11px 12px',
                              borderRadius: '10px',
                              border: '1px solid #CBD5E1',
                              fontSize: '0.86rem',
                              outline: 'none',
                              boxSizing: 'border-box',
                              fontFamily: 'monospace',
                              fontWeight: 600,
                            }}
                          />
                        </div>

                        {/* 4. Nama Pemilik (Atas Nama) */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                            {pencairanKategori === 'ewallet'
                              ? '4. Nama Akun E-Wallet (Atas Nama)'
                              : '4. Nama Pemilik Rekening (Atas Nama)'}{' '}
                            <span style={{ color: '#EF4444' }}>*</span>
                          </label>
                          <input
                            type="text"
                            placeholder={
                              pencairanKategori === 'ewallet'
                                ? 'nama terdaftar di e-wallet'
                                : 'nama sesuai buku tabungan'
                            }
                            value={bankAtasNama}
                            onChange={(e) => setBankAtasNama(e.target.value)}
                            required
                            style={{
                              width: '100%',
                              padding: '11px 12px',
                              borderRadius: '10px',
                              border: '1px solid #CBD5E1',
                              fontSize: '0.86rem',
                              outline: 'none',
                              boxSizing: 'border-box',
                              fontWeight: 600,
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                        <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                          💡 Pastikan nama pemilik rekening sesuai dengan identitas terdaftar agar proses transfer komisi tidak terkendala.
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {currentUser?.namaBank && (
                            <button
                              type="button"
                              onClick={() => {
                                setBankNama(currentUser.namaBank || '');
                                setBankNomor(currentUser.nomorRekening || '');
                                setBankAtasNama(currentUser.atasNamaRekening || currentUser.nama || '');
                                const isEw = EWALLET_LIST.some((ew) => ew.toLowerCase() === currentUser.namaBank?.toLowerCase());
                                setPencairanKategori(isEw ? 'ewallet' : 'bank');
                                setIsEditingBank(false);
                              }}
                              style={{
                                backgroundColor: '#F1F5F9',
                                color: '#475569',
                                border: '1px solid #CBD5E1',
                                padding: '10px 18px',
                                borderRadius: '10px',
                                fontSize: '0.86rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Batal
                            </button>
                          )}
                          <button
                            type="submit"
                            style={{
                              backgroundColor: '#10B981',
                              color: '#FFFFFF',
                              border: 'none',
                              padding: '10px 20px',
                              borderRadius: '10px',
                              fontSize: '0.86rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 3px 10px rgba(16, 185, 129, 0.3)',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                              save
                            </span>
                            <span>Simpan Rekening Pencairan</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>

                {/* Format Kode Referral Info */}
                <div
                  className="mpc-referral-format-card"
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                  }}
                >
                  <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>🏷️</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.3 }}>
                      Format Kode Referral Otomatis Resmi
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '3px', lineHeight: 1.4 }}>
                      Formula standar:
                      <div style={{ marginTop: '2px' }}>
                        <span style={{ backgroundColor: '#EFF6FF', color: '#1E40AF', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontFamily: 'monospace', fontSize: '0.72rem', display: 'inline-block', whiteSpace: 'nowrap' }}>
                          MPH + (3 Digit WA) + (2 Huruf Nama)
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#0284C7', marginTop: '4px', fontWeight: 600 }}>
                      Contoh: WA akhiran <strong style={{ color: '#0F172A' }}>433</strong> &bull; nama <strong style={{ color: '#0F172A' }}>Elen</strong> &rarr; <span style={{ backgroundColor: '#DBEAFE', color: '#1E40AF', padding: '1px 6px', borderRadius: '4px', fontWeight: 800, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>MPH433EL</span>
                    </div>
                  </div>
                </div>

                {/* Tombol Hijau: Daftar Sekarang */}
                <div>
                  <button
                    type="button"
                    onClick={() => setOnboardingView('form')}
                    className="mpc-register-now-btn"
                    style={{
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '11px 22px',
                      borderRadius: '10px',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.28)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span>Daftar Sekarang</span>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      open_in_new
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: PERINGKAT MITRA (LEADERBOARD REAL SPREADSHEET MAPAHTRIP) */}
            {partnerSubTab === 'peringkat' && (
              <div style={{ maxWidth: '980px' }}>
                {/* Header & Motivasi */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
                  <div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#EFF6FF', color: '#1D4ED8', fontSize: '0.74rem', fontWeight: 800, padding: '4px 12px', borderRadius: '14px', marginBottom: '8px', border: '1px solid #DBEAFE' }}>
                      <span style={{ fontSize: '13px' }}>🏆</span> LEADERBOARD RESMI MAPAHTRIP PARTNER CLUB
                    </div>
                    <h2 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
                      Papan Peringkat Penghasilan Mitra
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748B', maxWidth: '640px', lineHeight: 1.5 }}>
                      Data real penerimaan komisi dari Google Spreadsheet resmi MapahTrip. Diurutkan dari yang tertinggi untuk menyemangati seluruh mitra. Raih komisi resmi Rp 100.000 / visa terbit tanpa batas!
                    </p>
                  </div>

                  <div className="mpc-sync-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', backgroundColor: '#F8FAFC', padding: '6px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', color: '#334155' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#0284C7' }}>verified</span>
                    <span>Tersinkron: <strong>60 Mitra Terdaftar</strong> &bull; <strong>Top 10 Ditampilkan</strong></span>
                  </div>
                </div>

                {/* PODIUM TOP 3 JUARA - DESKTOP VERSION (OLYMPIC 2 - 1 - 3) */}
                <div
                  className="mpc-podium-grid mpc-podium-desktop"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '14px',
                    marginBottom: '20px',
                  }}
                >
                  {/* Juara 2: Derryl (Perak) */}
                  <div
                    className="podium-card podium-card-2"
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '16px',
                      padding: '18px 16px',
                      textAlign: 'center',
                      position: 'relative',
                      boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
                    }}
                  >
                    <div style={{ position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#475569', color: '#FFFFFF', fontSize: '0.68rem', fontWeight: 800, padding: '2px 10px', borderRadius: '10px', letterSpacing: '0.3px' }}>
                      🥈 JUARA 2
                    </div>
                    <div style={{ width: '46px', height: '46px', borderRadius: '50%', backgroundColor: '#F8FAFC', color: '#475569', margin: '6px auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.15rem', border: '2px solid #CBD5E1' }}>
                      D
                    </div>
                    <h3 style={{ margin: '0 0 2px', fontSize: '0.98rem', fontWeight: 800, color: '#0F172A' }}>
                      Derryl
                    </h3>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontFamily: 'monospace', marginBottom: '8px' }}>
                      KODE: <strong>{currentUser?.affiliateCode === 'MPH555DE' ? 'MPH555DE' : 'MPH555***'}</strong>
                    </div>
                    <div className="podium-nominal" style={{ fontSize: '1.38rem', fontWeight: 900, color: '#0F172A', margin: '4px 0' }}>
                      Rp 600.000
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 700, backgroundColor: '#F8FAFC', display: 'inline-block', padding: '3px 10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                      ✓ 6 Visa Berhasil Terbit
                    </div>
                  </div>

                  {/* Juara 1: Rizky Muhammad E (Emas / Top Earner) */}
                  <div
                    className="podium-card podium-card-1"
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '2px solid #005BB5',
                      borderRadius: '16px',
                      padding: '20px 16px',
                      textAlign: 'center',
                      position: 'relative',
                      boxShadow: '0 10px 25px -4px rgba(0, 91, 181, 0.15)',
                    }}
                  >
                    <div style={{ position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #005BB5 0%, #2563EB 100%)', color: '#FFFFFF', fontSize: '0.74rem', fontWeight: 900, padding: '3px 14px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 2px 8px rgba(0, 91, 181, 0.35)', whiteSpace: 'nowrap' }}>
                      <span>👑</span>
                      <span>JUARA 1 &bull; TOP EARNER</span>
                    </div>
                    <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: '#EFF6FF', color: '#005BB5', margin: '6px auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.3rem', border: '2.5px solid #005BB5' }}>
                      R
                    </div>
                    <h3 style={{ margin: '0 0 2px', fontSize: '1.08rem', fontWeight: 900, color: '#0F172A' }}>
                      Rizky Muhammad E
                    </h3>
                    <div style={{ fontSize: '0.74rem', color: '#005BB5', fontFamily: 'monospace', fontWeight: 700, marginBottom: '8px' }}>
                      KODE: <strong>{currentUser?.affiliateCode === 'MPH458RI' ? 'MPH458RI' : 'MPH458***'}</strong>
                    </div>
                    <div className="podium-nominal" style={{ fontSize: '1.65rem', fontWeight: 900, color: '#005BB5', margin: '4px 0' }}>
                      Rp 1.300.000
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#005BB5', fontWeight: 800, backgroundColor: '#EFF6FF', display: 'inline-block', padding: '3px 10px', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
                      ✨ 13 Visa Berhasil Terbit
                    </div>
                  </div>

                  {/* Juara 3: Albert Lazuardy (Perunggu) */}
                  <div
                    className="podium-card podium-card-3"
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '16px',
                      padding: '18px 16px',
                      textAlign: 'center',
                      position: 'relative',
                      boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
                    }}
                  >
                    <div style={{ position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#64748B', color: '#FFFFFF', fontSize: '0.68rem', fontWeight: 800, padding: '2px 10px', borderRadius: '10px', letterSpacing: '0.3px' }}>
                      🥉 JUARA 3
                    </div>
                    <div style={{ width: '46px', height: '46px', borderRadius: '50%', backgroundColor: '#F8FAFC', color: '#64748B', margin: '6px auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.15rem', border: '2px solid #CBD5E1' }}>
                      A
                    </div>
                    <h3 style={{ margin: '0 0 2px', fontSize: '0.98rem', fontWeight: 800, color: '#0F172A' }}>
                      Albert Lazuardy
                    </h3>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontFamily: 'monospace', marginBottom: '8px' }}>
                      KODE: <strong>{currentUser?.affiliateCode === 'MPH630AL' ? 'MPH630AL' : 'MPH630***'}</strong>
                    </div>
                    <div className="podium-nominal" style={{ fontSize: '1.38rem', fontWeight: 900, color: '#0F172A', margin: '4px 0' }}>
                      Rp 600.000
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 700, backgroundColor: '#F8FAFC', display: 'inline-block', padding: '3px 10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                      ✓ 6 Visa Berhasil Terbit
                    </div>
                  </div>
                </div>

                {/* PODIUM TOP 3 JUARA - MOBILE VERSION (3 BARIS SERAGAM & PROPORSIONAL TANPA GEDE SENDIRI) */}
                <div className="mpc-podium-mobile">
                  {/* Juara 1 */}
                  <div
                    style={{
                      backgroundColor: '#EFF6FF',
                      border: '1px solid #93C5FD',
                      borderRadius: '12px',
                      padding: '9px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      boxShadow: '0 1px 4px rgba(0, 91, 181, 0.08)',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: '1.15rem', lineHeight: 1 }}>🥇</span>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: '#DBEAFE',
                          color: '#005BB5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          flexShrink: 0,
                          border: '1.5px solid #005BB5',
                        }}
                      >
                        R
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.84rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          Rizky Muhammad E
                        </div>
                        <div style={{ fontSize: '0.66rem', color: '#005BB5', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {currentUser?.affiliateCode === 'MPH458RI' ? 'MPH458RI' : 'MPH458***'} &bull; 13 Visa
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 900, color: '#005BB5', fontSize: '0.92rem', lineHeight: 1.2 }}>
                        Rp 1.300.000
                      </div>
                      <span style={{ fontSize: '0.62rem', backgroundColor: '#DBEAFE', color: '#1E40AF', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        Top 1
                      </span>
                    </div>
                  </div>

                  {/* Juara 2 */}
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '9px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: '1.15rem', lineHeight: 1 }}>🥈</span>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: '#F1F5F9',
                          color: '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          flexShrink: 0,
                          border: '1.5px solid #CBD5E1',
                        }}
                      >
                        D
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.84rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          Derryl
                        </div>
                        <div style={{ fontSize: '0.66rem', color: '#64748B', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {currentUser?.affiliateCode === 'MPH555DE' ? 'MPH555DE' : 'MPH555***'} &bull; 6 Visa
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 900, color: '#0F172A', fontSize: '0.92rem', lineHeight: 1.2 }}>
                        Rp 600.000
                      </div>
                      <span style={{ fontSize: '0.62rem', backgroundColor: '#F1F5F9', color: '#475569', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        Top 2
                      </span>
                    </div>
                  </div>

                  {/* Juara 3 */}
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '9px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: '1.15rem', lineHeight: 1 }}>🥉</span>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: '#F1F5F9',
                          color: '#64748B',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          flexShrink: 0,
                          border: '1.5px solid #CBD5E1',
                        }}
                      >
                        A
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.84rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          Albert Lazuardy
                        </div>
                        <div style={{ fontSize: '0.66rem', color: '#64748B', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {currentUser?.affiliateCode === 'MPH630AL' ? 'MPH630AL' : 'MPH630***'} &bull; 6 Visa
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 900, color: '#0F172A', fontSize: '0.92rem', lineHeight: 1.2 }}>
                        Rp 600.000
                      </div>
                      <span style={{ fontSize: '0.62rem', backgroundColor: '#F1F5F9', color: '#475569', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        Top 3
                      </span>
                    </div>
                  </div>
                </div>

                {/* Banner Tips untuk Affiliate Baru */}
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '14px',
                    padding: '14px 18px',
                    marginBottom: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '14px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#EFF6FF', color: '#005BB5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #DBEAFE' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>rocket_launch</span>
                    </div>
                    <div>
                      <strong style={{ fontSize: '0.86rem', color: '#0F172A', display: 'block', marginBottom: '2px' }}>
                        Affiliate Baru Bisa Langsung Dapatkan Komisi Hari Ini!
                      </strong>
                      <span style={{ fontSize: '0.76rem', color: '#64748B' }}>
                        Setiap 1 orang yang Anda ajak buat visa Jepang menghasilkan <strong style={{ color: '#005BB5' }}>Rp 100.000</strong> langsung cair ke rekening Anda.
                      </span>
                    </div>
                  </div>

                  {currentUser?.affiliateCode && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(currentUser.affiliateCode || '');
                        setCopiedLeaderboardCode('KODE_USER');
                        setTimeout(() => setCopiedLeaderboardCode(null), 2000);
                      }}
                      style={{
                        backgroundColor: copiedLeaderboardCode === 'KODE_USER' ? '#16A34A' : '#005BB5',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 8px rgba(0, 91, 181, 0.25)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                        {copiedLeaderboardCode === 'KODE_USER' ? 'done' : 'content_copy'}
                      </span>
                      <span>{copiedLeaderboardCode === 'KODE_USER' ? 'Kode Tersalin!' : `Salin Kode Anda (${currentUser.affiliateCode})`}</span>
                    </button>
                  )}
                </div>

                {/* Filter & Search Bar */}
                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '14px 16px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                    {/* Search */}
                    <div style={{ position: 'relative', minWidth: '260px', flex: '1 1 300px' }}>
                      <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', color: '#94A3B8' }}>
                        search
                      </span>
                      <input
                        type="text"
                        placeholder="Cari nama mitra / kode referral..."
                        value={leaderboardSearch}
                        onChange={(e) => setLeaderboardSearch(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px 8px 34px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          fontSize: '0.82rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    {/* Filter Pills */}
                    <div className="leaderboard-filter-group" style={{ display: 'inline-flex', backgroundColor: '#F1F5F9', padding: '3px', borderRadius: '8px', gap: '3px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => setLeaderboardFilter('all')}
                        style={{
                          backgroundColor: leaderboardFilter === 'all' ? '#FFFFFF' : 'transparent',
                          color: leaderboardFilter === 'all' ? '#005BB5' : '#64748B',
                          border: 'none',
                          padding: '5px 12px',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: leaderboardFilter === 'all' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                        }}
                      >
                        Top 10 Eksklusif
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeaderboardFilter('lpk')}
                        style={{
                          backgroundColor: leaderboardFilter === 'lpk' ? '#FFFFFF' : 'transparent',
                          color: leaderboardFilter === 'lpk' ? '#005BB5' : '#64748B',
                          border: 'none',
                          padding: '5px 12px',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: leaderboardFilter === 'lpk' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                        }}
                      >
                        Mitra LPK
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeaderboardFilter('individu')}
                        style={{
                          backgroundColor: leaderboardFilter === 'individu' ? '#FFFFFF' : 'transparent',
                          color: leaderboardFilter === 'individu' ? '#005BB5' : '#64748B',
                          border: 'none',
                          padding: '5px 12px',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: leaderboardFilter === 'individu' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                        }}
                      >
                        Mitra Individu
                      </button>
                    </div>
                  </div>

                  {/* TABEL PERINGKAT DESKTOP (100% AMAN & SAMA PERSIS UNTUK DESKTOP) */}
                  <div className="leaderboard-desktop-table" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          <th style={{ padding: '8px 10px', width: '70px', textAlign: 'center' }}>Peringkat</th>
                          <th style={{ padding: '8px 10px' }}>Mitra Afiliasi</th>
                          <th style={{ padding: '8px 10px' }}>Kode Referral</th>
                          <th style={{ padding: '8px 10px', textAlign: 'center' }}>Visa Selesai</th>
                          <th style={{ padding: '8px 10px' }}>Total Insentif Didapat</th>
                          <th style={{ padding: '8px 10px' }}>Status / Keterangan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLeaderboard.slice(0, 10).map((item) => {
                          const isCurrentUser = currentUser?.affiliateCode && item.code === currentUser.affiliateCode;
                          const isTop3 = item.rank <= 3;

                          return (
                            <tr
                              key={item.code}
                              style={{
                                borderBottom: '1px solid #F1F5F9',
                                backgroundColor: isCurrentUser ? '#EFF6FF' : isTop3 ? (item.rank === 1 ? '#F8FAFC' : '#FFFFFF') : '#FFFFFF',
                                fontWeight: isTop3 || isCurrentUser ? 700 : 500,
                              }}
                            >
                              {/* Kolom Peringkat */}
                              <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                {item.rank === 1 ? (
                                  <span style={{ fontSize: '1.1rem' }} title="Juara 1 Emas">🥇</span>
                                ) : item.rank === 2 ? (
                                  <span style={{ fontSize: '1.1rem' }} title="Juara 2 Perak">🥈</span>
                                ) : item.rank === 3 ? (
                                  <span style={{ fontSize: '1.1rem' }} title="Juara 3 Perunggu">🥉</span>
                                ) : (
                                  <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700 }}>#{item.rank}</span>
                                )}
                              </td>

                              {/* Kolom Nama Mitra */}
                              <td style={{ padding: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    backgroundColor: item.rank === 1 ? '#EFF6FF' : item.kategori === 'LPK' ? '#E0F2FE' : '#F1F5F9',
                                    color: item.rank === 1 ? '#005BB5' : item.kategori === 'LPK' ? '#0369A1' : '#475569',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    flexShrink: 0
                                  }}>
                                    {item.nama.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <div style={{ color: '#0F172A', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span>{item.nama}</span>
                                      {isCurrentUser && (
                                        <span style={{ fontSize: '0.65rem', backgroundColor: '#005BB5', color: '#FFFFFF', padding: '1px 6px', borderRadius: '4px' }}>
                                          Anda
                                        </span>
                                      )}
                                    </div>
                                    <span style={{ fontSize: '0.68rem', color: '#64748B' }}>
                                      {item.kategori}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Kolom Kode Referral (Privasi Terjaga: Hanya akun sendiri yang bisa disalin) */}
                              <td style={{ padding: '10px' }}>
                                {isCurrentUser ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(item.code);
                                      setCopiedLeaderboardCode(item.code);
                                      setTimeout(() => setCopiedLeaderboardCode(null), 1800);
                                    }}
                                    title="Klik untuk salin kode Anda"
                                    style={{
                                      backgroundColor: copiedLeaderboardCode === item.code ? '#DCFCE7' : '#EFF6FF',
                                      color: copiedLeaderboardCode === item.code ? '#15803D' : '#005BB5',
                                      border: '1px solid #BFDBFE',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      fontSize: '0.72rem',
                                      fontFamily: 'monospace',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                  >
                                    <span>{item.code} (Anda)</span>
                                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                                      {copiedLeaderboardCode === item.code ? 'done' : 'content_copy'}
                                    </span>
                                  </button>
                                ) : (
                                  <span
                                    style={{
                                      backgroundColor: '#F8FAFC',
                                      color: '#64748B',
                                      border: '1px solid #E2E8F0',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      fontSize: '0.72rem',
                                      fontFamily: 'monospace',
                                      fontWeight: 600,
                                      display: 'inline-block',
                                    }}
                                    title="Kode referral disamarkan demi privasi mitra"
                                  >
                                    {item.code.length > 5 ? `${item.code.slice(0, 5)}***` : `${item.code.slice(0, 3)}***`}
                                  </span>
                                )}
                              </td>

                              {/* Kolom Visa Selesai */}
                              <td style={{ padding: '10px', textAlign: 'center' }}>
                                <span style={{ fontWeight: 800, color: '#0F172A' }}>
                                  {item.totalVisaApproved}
                                </span>
                              </td>

                              {/* Kolom Total Insentif */}
                              <td style={{ padding: '10px' }}>
                                <span style={{
                                  fontSize: '0.88rem',
                                  fontWeight: 900,
                                  color: '#0F172A',
                                }}>
                                  {formatRupiah(item.nominal)}
                                </span>
                              </td>

                              {/* Kolom Status Badge */}
                              <td style={{ padding: '10px' }}>
                                <span style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: item.rank === 1
                                    ? '#EFF6FF'
                                    : '#F8FAFC',
                                  color: item.rank === 1
                                    ? '#005BB5'
                                    : '#334155',
                                  border: item.rank === 1 ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                                }}>
                                  {item.statusBadge}
                                </span>
                              </td>
                            </tr>
                          );
                        })}

                        {/* Baris Teaser #11 & #12 yang Diburamkan (Memberi kesan ramai dan bergengsi) */}
                        <tr style={{ borderBottom: '1px solid #F1F5F9', filter: 'blur(3.5px)', opacity: 0.45, userSelect: 'none', pointerEvents: 'none' }}>
                          <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, color: '#64748B' }}>#11</td>
                          <td style={{ padding: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#F1F5F9', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800 }}>M•</div>
                              <div>
                                <div style={{ color: '#0F172A', fontWeight: 800 }}>Mitra Terverifikasi</div>
                                <span style={{ fontSize: '0.68rem', color: '#64748B' }}>Individu</span>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '10px' }}><span style={{ backgroundColor: '#F8FAFC', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontFamily: 'monospace' }}>MPH••***</span></td>
                          <td style={{ padding: '10px', textAlign: 'center', fontWeight: 800, color: '#0F172A' }}>1</td>
                          <td style={{ padding: '10px', fontWeight: 900, color: '#0F172A' }}>Rp 100.000</td>
                          <td style={{ padding: '10px' }}><span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', backgroundColor: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0' }}>Mitra Aktif</span></td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #F1F5F9', filter: 'blur(5px)', opacity: 0.25, userSelect: 'none', pointerEvents: 'none' }}>
                          <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, color: '#64748B' }}>#12</td>
                          <td style={{ padding: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#F1F5F9', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800 }}>L•</div>
                              <div>
                                <div style={{ color: '#0F172A', fontWeight: 800 }}>Mitra Terverifikasi</div>
                                <span style={{ fontSize: '0.68rem', color: '#64748B' }}>LPK</span>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '10px' }}><span style={{ backgroundColor: '#F8FAFC', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontFamily: 'monospace' }}>MPH••***</span></td>
                          <td style={{ padding: '10px', textAlign: 'center', fontWeight: 800, color: '#0F172A' }}>1</td>
                          <td style={{ padding: '10px', fontWeight: 900, color: '#0F172A' }}>Rp 100.000</td>
                          <td style={{ padding: '10px' }}><span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', backgroundColor: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0' }}>Mitra LPK</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* KARTU PERINGKAT MOBILE: Khusus tampilan HP agar tidak terpotong & rapi sempurna */}
                  <div className="leaderboard-mobile-list">
                    {filteredLeaderboard.slice(0, 10).map((item) => {
                      const isCurrentUser = currentUser?.affiliateCode && item.code === currentUser.affiliateCode;
                      const isTop3 = item.rank <= 3;

                      return (
                        <div
                          key={item.code}
                          style={{
                            backgroundColor: isCurrentUser ? '#EFF6FF' : isTop3 ? (item.rank === 1 ? '#F8FAFC' : '#FFFFFF') : '#FFFFFF',
                            border: isCurrentUser ? '1.5px solid #005BB5' : isTop3 && item.rank === 1 ? '1.5px solid #BFDBFE' : '1px solid #E2E8F0',
                            borderRadius: '12px',
                            padding: '11px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            boxShadow: isCurrentUser ? '0 2px 8px rgba(0, 91, 181, 0.12)' : '0 1px 3px rgba(0,0,0,0.02)',
                          }}
                        >
                          {/* Sisi Kiri: Ranking, Avatar, Nama & Sub-info */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                            {/* Ranking */}
                            <div style={{ width: '24px', textAlign: 'center', flexShrink: 0 }}>
                              {item.rank === 1 ? (
                                <span style={{ fontSize: '1.2rem' }} title="Juara 1 Emas">🥇</span>
                              ) : item.rank === 2 ? (
                                <span style={{ fontSize: '1.2rem' }} title="Juara 2 Perak">🥈</span>
                              ) : item.rank === 3 ? (
                                <span style={{ fontSize: '1.2rem' }} title="Juara 3 Perunggu">🥉</span>
                              ) : (
                                <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 800 }}>#{item.rank}</span>
                              )}
                            </div>

                            {/* Avatar */}
                            <div
                              style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '50%',
                                backgroundColor: item.rank === 1 ? '#EFF6FF' : item.kategori === 'LPK' ? '#E0F2FE' : '#F1F5F9',
                                color: item.rank === 1 ? '#005BB5' : item.kategori === 'LPK' ? '#0369A1' : '#475569',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                flexShrink: 0,
                                border: item.rank === 1 ? '1.5px solid #BFDBFE' : '1px solid #E2E8F0',
                              }}
                            >
                              {item.nama.slice(0, 2).toUpperCase()}
                            </div>

                            {/* Detail Nama, Kode & Visa */}
                            <div style={{ minWidth: 0, overflow: 'hidden' }}>
                              <div style={{ color: '#0F172A', fontWeight: 800, fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.nama}</span>
                                {isCurrentUser && (
                                  <span style={{ fontSize: '0.6rem', backgroundColor: '#005BB5', color: '#FFFFFF', padding: '1px 4px', borderRadius: '4px', flexShrink: 0 }}>
                                    Anda
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#64748B', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#475569' }}>
                                  {isCurrentUser ? item.code : (item.code.length > 5 ? `${item.code.slice(0, 5)}***` : `${item.code.slice(0, 3)}***`)}
                                </span>
                                <span>&bull;</span>
                                <span style={{ fontWeight: 700, color: '#0F172A' }}>{item.totalVisaApproved} Visa</span>
                                <span>&bull;</span>
                                <span>{item.kategori}</span>
                              </div>
                            </div>
                          </div>

                          {/* Sisi Kanan: Total Insentif & Status Badge */}
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0F172A', whiteSpace: 'nowrap' }}>
                              {formatRupiah(item.nominal)}
                            </div>
                            <div style={{ marginTop: '2px' }}>
                              <span
                                style={{
                                  fontSize: '0.64rem',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: '5px',
                                  backgroundColor: item.rank === 1 ? '#EFF6FF' : '#F8FAFC',
                                  color: item.rank === 1 ? '#005BB5' : '#475569',
                                  border: item.rank === 1 ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                                  display: 'inline-block',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {item.statusBadge}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Locked Social Proof Banner: Memperlihatkan ada 50+ Mitra Lainnya yang Terdaftar */}
                  <div
                    className="mpc-social-proof-banner"
                    style={{
                      marginTop: '14px',
                      padding: '16px 20px',
                      borderRadius: '12px',
                      backgroundColor: '#F8FAFC',
                      border: '1.5px dashed #CBD5E1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '14px',
                    }}
                  >
                    <div className="mpc-social-proof-content" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      {/* Avatar Tumpuk (Stacked Avatars) */}
                      <div className="mpc-social-proof-avatars" style={{ display: 'flex', alignItems: 'center', marginLeft: '6px' }}>
                        {['M', 'A', 'P', 'T', 'R'].map((char, idx) => (
                          <div
                            key={idx}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: ['#EFF6FF', '#F1F5F9', '#FEF3C7', '#E0F2FE', '#F8FAFC'][idx],
                              color: ['#005BB5', '#475569', '#B45309', '#0369A1', '#334155'][idx],
                              border: '2px solid #FFFFFF',
                              marginLeft: '-8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                            }}
                          >
                            {char}
                          </div>
                        ))}
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: '#005BB5',
                            color: '#FFFFFF',
                            border: '2px solid #FFFFFF',
                            marginLeft: '-8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            boxShadow: '0 2px 6px rgba(0,91,181,0.25)',
                          }}
                        >
                          +50
                        </div>
                      </div>

                      <div className="mpc-social-proof-text">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '13px' }}>🔒</span>
                          <strong style={{ fontSize: '0.86rem', color: '#0F172A' }}>
                            +50 Mitra Lainnya Terdaftar di MapahTrip Partner Club
                          </strong>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748B', lineHeight: 1.4 }}>
                          Papan peringkat eksklusif hanya menampilkan <strong>10 Mitra Terbaik</strong>. Ajak pemohon visa Jepang dengan kode Anda untuk menembus Top 10!
                        </p>
                      </div>
                    </div>

                    <div className="mpc-social-proof-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#EFF6FF', color: '#005BB5', fontSize: '0.72rem', fontWeight: 700, padding: '6px 14px', borderRadius: '20px', border: '1px solid #DBEAFE' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>military_tech</span>
                      <span>Slot Top 10 Masih Terbuka</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div>
          )}
        </main>

        {/* Global Modals & Toasts */}
        {renderTermsModal()}
        {/* 6. Candidate Detail Modal */}
      {selectedKandidat && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setSelectedKandidat(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header (Sticky Top) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #F1F5F9', backgroundColor: '#FFFFFF' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#2563EB', fontWeight: 800, textTransform: 'uppercase' }}>
                  {selectedKandidat.noPengajuan}
                </span>
                <h3 style={{ margin: '2px 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
                  {selectedKandidat.namaPemohon}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedKandidat(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '22px',
                  cursor: 'pointer',
                  color: '#94A3B8',
                  padding: '4px',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem' }}>
              {/* Ringkasan Data Pemohon */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', padding: '12px 14px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '0.80rem' }}>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>No. Paspor:</span>
                  <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>{selectedKandidat.noPaspor}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>WhatsApp:</span>
                  <strong style={{ color: '#0F172A' }}>{selectedKandidat.noTelp || '-'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>Program:</span>
                  <strong style={{ color: '#0F172A' }}>{selectedKandidat.program}</strong>
                </div>
              </div>

              {/* 4 Tahapan Status Pengerjaan (Sampai, Proses, Selesai, Kirim) */}
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', padding: '14px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>🚀 Tahapan Pengerjaan (Klik untuk Ceklis)</span>
                  <span style={{ fontSize: '0.72rem', color: '#0284C7', fontWeight: 700 }}>
                    Status: {selectedKandidat.status}
                  </span>
                </div>
                {(() => {
                  const st = getCandidateStages(selectedKandidat);
                  const stageItems = [
                    { key: 'sampai' as const, label: '1. Sampai', ok: st.isSampai, date: st.tglSampai, color: '#0284C7', bg: '#E0F2FE', border: '#BAE6FD', desc: 'Berkas fisik sampai di kantor' },
                    { key: 'proses' as const, label: '2. Proses', ok: st.isProses, date: st.tglProses, color: '#D97706', bg: '#FEF3C7', border: '#FDE68A', desc: 'Diajukan ke Kedutaan/JVAC' },
                    { key: 'selesai' as const, label: '3. Selesai', ok: st.isSelesai, date: st.tglSelesai, color: '#16A34A', bg: '#DCFCE7', border: '#BBF7D0', desc: 'Visa Terbit / Selesai' },
                    { key: 'kirim' as const, label: '4. Kirim', ok: st.isKirim, date: st.tglKirim, color: '#7C3AED', bg: '#F3E8FF', border: '#DDD6FE', desc: st.noResi ? `Resi: ${st.noResi}` : 'Paspor dikirim ke pemohon' },
                  ];
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                      {stageItems.map((s) => (
                        <div
                          key={s.key}
                          title={s.ok ? `Tahap ${s.label} telah selesai (${s.date || '-'})` : `Tahap ${s.label} belum selesai (Dikelola oleh Tim Staf MapahTrip)`}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            backgroundColor: s.ok ? s.bg : '#F8FAFC',
                            color: s.ok ? s.color : '#64748B',
                            border: `1px solid ${s.ok ? s.border : '#E2E8F0'}`,
                            cursor: 'default',
                            textAlign: 'left',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <strong style={{ fontSize: '0.78rem' }}>{s.label}</strong>
                            <span style={{ fontSize: '0.70rem', fontWeight: 800 }}>{s.ok ? '✓ Selesai' : 'Belum'}</span>
                          </div>
                          <div style={{ fontSize: '0.68rem', opacity: 0.9, fontFamily: 'monospace', fontWeight: 700 }}>
                            Tgl: {s.ok ? (s.date || getTodayFormatted()) : '-'}
                          </div>
                          <div style={{ fontSize: '0.66rem', color: '#64748B', lineHeight: 1.2 }}>
                            {s.desc}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                <div style={{ marginTop: '8px', fontSize: '0.68rem', color: '#64748B', textAlign: 'right' }}>
                  * Klik kotak tahapan di atas untuk mengubah status pengerjaan secara langsung.
                </div>
              </div>

              {/* Rincian Kelengkapan Berkas (Arsip Dokumen) */}
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', padding: '14px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>📋 Arsip Kelengkapan Berkas (Verifikasi Internal)</span>
                </div>
                {(() => {
                  const bStatus = getCandidateBerkas(selectedKandidat);
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                      {[
                        { key: 'formVisa' as const, label: 'Formulir Visa', ok: bStatus.formVisa },
                        { key: 'ktp' as const, label: 'Fotokopi KTP', ok: bStatus.ktp },
                        { key: 'ektln' as const, label: 'E-KTLN BP2MI', ok: bStatus.ektln },
                        { key: 'coe' as const, label: 'COE Imigrasi Jepang', ok: bStatus.coe },
                        { key: 'foto' as const, label: 'Pasfoto 4.5 x 3.5 cm', ok: bStatus.foto },
                      ].map((doc, dIdx) => (
                        <button
                          key={dIdx}
                          type="button"
                          onClick={() => handleToggleBerkas(selectedKandidat, doc.key)}
                          title={`Klik untuk ${doc.ok ? 'batalkan ceklis' : 'menceklis'} ${doc.label}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '6px',
                            fontSize: '0.74rem',
                            padding: '6px 10px',
                            borderRadius: '7px',
                            backgroundColor: doc.ok ? '#DCFCE7' : '#FEE2E2',
                            color: doc.ok ? '#15803D' : '#B91C1C',
                            fontWeight: 700,
                            border: doc.ok ? '1px solid #86EFAC' : '1px solid #FECACA',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            textAlign: 'left',
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                              {doc.ok ? 'check_circle' : 'cancel'}
                            </span>
                            <span>{doc.label}</span>
                          </span>
                          <span style={{ fontSize: '0.66rem', fontWeight: 800 }}>
                            {doc.ok ? '✓' : '✕'}
                          </span>
                        </button>
                      ))}
                    </div>
                  );
                })()}
                <div style={{ marginTop: '6px', fontSize: '0.68rem', color: '#64748B', textAlign: 'right' }}>
                  * Klik berkas di atas untuk mencentang (✓) atau membatalkan (✕) kapan saja.
                </div>
              </div>

              {selectedKandidat.catatan && (
                <div style={{ backgroundColor: '#F0F9FF', padding: '10px 14px', borderRadius: '10px', color: '#0369A1', fontSize: '0.80rem', border: '1px solid #E0F2FE' }}>
                  <strong>Catatan:</strong> {selectedKandidat.catatan}
                </div>
              )}
            </div>

            {/* Footer (Sticky Bottom) */}
            <div style={{ padding: '12px 24px', borderTop: '1px solid #F1F5F9', backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedKandidat(null)}
                style={{
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '8px 22px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Syarat & Kebijakan Kemitraan MapahTrip */}
      {renderTermsModal()}

      {/* Modal Lihat / Edit Data Profil Mitra */}
      {showProfileModal && (
        <div
          onClick={() => setShowProfileModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#F8FAFC',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-symbols-outlined" style={{ color: '#005BB5', fontSize: '24px' }}>
                  badge
                </span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                    Data Identitas Mitra
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                    Terverifikasi di Sistem MapahTrip
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                style={{
                  background: '#E2E8F0',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#475569',
                }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem' }}>
              {/* Photo & Basic Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                {currentUser.fotoDiri ? (
                  <img
                    src={currentUser.fotoDiri}
                    alt="Foto Profil"
                    style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #10B981' }}
                  />
                ) : (
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#94A3B8' }}>account_circle</span>
                  </div>
                )}
                <div>
                  <strong style={{ fontSize: '1rem', color: '#0F172A', display: 'block' }}>{currentUser.nama}</strong>
                  <span style={{ fontSize: '0.78rem', color: '#0284C7', fontWeight: 700, display: 'block' }}>
                    Kode: {currentUser.affiliateCode}
                  </span>
                  <span style={{ fontSize: '0.74rem', color: '#166534', backgroundColor: '#DCFCE7', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, marginTop: '4px', display: 'inline-block' }}>
                    ✓ Mitra Terverifikasi
                  </span>
                </div>
              </div>

              {/* Data Table */}
              <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '10px 14px', padding: '6px 0' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Status Mitra:</span>
                <span style={{ color: '#0F172A', fontWeight: 700 }}>{currentUser.statusMitra || 'Mitra Lembaga'}</span>

                <span style={{ color: '#64748B', fontWeight: 600 }}>Lembaga / Instansi:</span>
                <span style={{ color: '#0F172A', fontWeight: 700 }}>{currentUser.lembaga || '-'}</span>

                <span style={{ color: '#64748B', fontWeight: 600 }}>No. WhatsApp:</span>
                <span style={{ color: '#0F172A', fontWeight: 700 }}>{currentUser.noWa || '-'}</span>

                <span style={{ color: '#64748B', fontWeight: 600 }}>Email Terdaftar:</span>
                <span style={{ color: '#0F172A' }}>{currentUser.email}</span>

                <span style={{ color: '#64748B', fontWeight: 600 }}>Provinsi:</span>
                <span style={{ color: '#0F172A', fontWeight: 700 }}>{currentUser.provinsi || '-'}</span>

                <span style={{ color: '#64748B', fontWeight: 600 }}>Alamat:</span>
                <span style={{ color: '#0F172A' }}>{currentUser.alamat || '-'}</span>

                <span style={{ color: '#64748B', fontWeight: 600 }}>Jenis Identitas:</span>
                <span style={{ color: '#0F172A', fontWeight: 700 }}>{currentUser.jenisIdentitas || 'KTP'}</span>

                <span style={{ color: '#64748B', fontWeight: 600 }}>Nomor Identitas (KTP):</span>
                <span style={{ color: '#0F172A', fontWeight: 700, fontFamily: 'monospace' }}>{currentUser.nomorIdentitas || '-'}</span>

                <span style={{ color: '#64748B', fontWeight: 600 }}>Akun IG:</span>
                <span style={{ color: '#0F172A', fontWeight: 700 }}>{currentUser.akunIg || '-'}</span>

                <span style={{ color: '#64748B', fontWeight: 600 }}>Follower IG:</span>
                <span style={{ color: '#0F172A', fontWeight: 700 }}>{currentUser.followerIg || '-'}</span>

                <span style={{ color: '#64748B', fontWeight: 600 }}>Rekening Pencairan:</span>
                <span style={{ color: currentUser.namaBank ? '#10B981' : '#94A3B8', fontWeight: 700 }}>
                  {currentUser.namaBank ? `${currentUser.namaBank} - ${currentUser.nomorRekening} (a.n ${currentUser.atasNamaRekening})` : 'Belum diatur'}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                style={{
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '8px 20px',
                  borderRadius: '8px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {showNotRegisteredToast && (
        <div
          style={{
            position: 'fixed',
            top: '28px',
            right: '32px',
            zIndex: 9999999,
            backgroundColor: '#EA580C',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 8px 30px rgba(234, 88, 12, 0.45)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            fontSize: '0.86rem',
            fontWeight: 700,
            pointerEvents: 'auto',
          }}
        >
          <span>Maaf, belum melakukan pendaftaran MPC</span>
          <button
            type="button"
            onClick={() => setShowNotRegisteredToast(false)}
            style={{
              background: 'none',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 800,
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 8. Registration Success Modal (Notifikasi Berhasil & Penyerahan Kode Referral) */}
      {registrationSuccessData && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(15, 23, 42, 0.78)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setRegistrationSuccessData(null);
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '520px',
              width: '100%',
              padding: '36px 30px',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
              textAlign: 'center',
              position: 'relative',
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close X Button */}
            <button
              type="button"
              onClick={() => setRegistrationSuccessData(null)}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: '#F1F5F9',
                border: 'none',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748B',
              }}
              title="Tutup & Masuk ke Dashboard"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
            </button>

            {/* Top Celebration Icon */}
            <div
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                backgroundColor: '#DCFCE7',
                border: '4px solid #BBF7D0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: '#16A34A',
                boxShadow: '0 10px 25px rgba(22, 163, 74, 0.25)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '42px' }}>
                verified
              </span>
            </div>

            <span
              style={{
                display: 'inline-block',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                fontSize: '0.74rem',
                fontWeight: 800,
                padding: '4px 14px',
                borderRadius: '9999px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '10px',
                border: '1px solid #A7F3D0',
              }}
            >
              🎉 Pendaftaran Berhasil
            </span>

            <h3
              style={{
                fontSize: '1.4rem',
                fontWeight: 900,
                color: '#0F172A',
                margin: '0 0 8px',
                letterSpacing: '-0.02em',
              }}
            >
              Selamat Datang di Portal Mitra!
            </h3>

            <p
              style={{
                fontSize: '0.86rem',
                color: '#64748B',
                margin: '0 0 20px',
                lineHeight: 1.5,
              }}
            >
              Data identitas Anda telah berhasil diverifikasi. Kode Referral resmi Anda telah terbit dan siap digunakan untuk pelacakan komisi visa Jepang.
            </p>

            {/* Referral Code Banner Box */}
            <div
              style={{
                background: 'linear-gradient(135deg, #064E3B 0%, #065F46 50%, #047857 100%)',
                borderRadius: '18px',
                padding: '20px',
                color: '#FFFFFF',
                marginBottom: '18px',
                boxShadow: '0 8px 24px rgba(6, 95, 70, 0.25)',
                border: '1px solid rgba(52, 211, 153, 0.3)',
              }}
            >
              <div style={{ fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#A7F3D0', fontWeight: 700, marginBottom: '6px' }}>
                Kode Referral Resmi Anda
              </div>
              <div
                style={{
                  fontSize: '1.85rem',
                  fontWeight: 900,
                  letterSpacing: '0.12em',
                  color: '#FFFFFF',
                  fontFamily: 'monospace',
                  textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  marginBottom: '12px',
                }}
              >
                {registrationSuccessData.code}
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(registrationSuccessData.code);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  style={{
                    backgroundColor: copiedCode ? '#10B981' : '#FFFFFF',
                    color: copiedCode ? '#FFFFFF' : '#065F46',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: '10px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    {copiedCode ? 'check' : 'content_copy'}
                  </span>
                  <span>{copiedCode ? 'Tersalin!' : 'Salin Kode'}</span>
                </button>
              </div>

              <div
                style={{
                  marginTop: '12px',
                  paddingTop: '10px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '0.78rem',
                  color: '#D1FAE5',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#34D399' }}>
                  payments
                </span>
                <span>Komisi: <strong>Rp 100.000 / Visa</strong> via transfer bank</span>
              </div>
            </div>

            {/* Detail Singkat Pendaftar */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '14px',
                padding: '12px 16px',
                marginBottom: '20px',
                border: '1px solid #E2E8F0',
                textAlign: 'left',
                fontSize: '0.8rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Nama Mitra</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>{registrationSuccessData.nama}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Status Mitra</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{registrationSuccessData.status}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>No. KTP / NIK (16 digit)</span>
                <span style={{ fontWeight: 700, color: '#16A34A', fontFamily: 'monospace' }}>
                  {registrationSuccessData.ktp} ✓
                </span>
              </div>
              {registrationSuccessData.akunIg && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Akun IG</span>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>{registrationSuccessData.akunIg}</span>
                </div>
              )}
            </div>

            {/* Tombol Lanjut ke Dashboard */}
            <button
              type="button"
              onClick={() => setRegistrationSuccessData(null)}
              style={{
                width: '100%',
                backgroundColor: '#10B981',
                color: '#FFFFFF',
                border: 'none',
                padding: '13px 20px',
                borderRadius: '14px',
                fontSize: '0.94rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#059669')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#10B981')}
            >
              <span>Masuk ke Dashboard Portal Mitra</span>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                arrow_forward
              </span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL STRUK BUKTI TRANSFER RESMI MAPAHTRIP */}
      {selectedBuktiTransfer && (
        <div
          onClick={() => setSelectedBuktiTransfer(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
            overflowY: 'auto',
            boxSizing: 'border-box',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '420px',
              width: '100%',
              maxHeight: 'calc(100vh - 32px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #E2E8F0',
              animation: 'modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative',
              margin: 'auto',
            }}
          >
            {/* Header Struk Hijau Ringkas */}
            <div
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                color: '#FFFFFF',
                padding: '16px 20px 14px',
                textAlign: 'center',
                position: 'relative',
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedBuktiTransfer(null)}
                title="Tutup"
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
              </button>

              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  color: '#10B981',
                  margin: '0 auto 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 3px 10px rgba(0,0,0,0.15)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '24px', fontWeight: 'bold' }}>
                  check_circle
                </span>
              </div>

              <div style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.9, fontWeight: 700 }}>
                BUKTI TRANSFER INSENTIF RESMI
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 900, margin: '4px 0 2px', letterSpacing: '-0.02em' }}>
                {formatRupiah(selectedBuktiTransfer.nominal)}
              </div>
              <div style={{ fontSize: '0.74rem', opacity: 0.95, display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '10px' }}>
                <span>✓ Berhasil Ditransfer ke Rekening</span>
              </div>
            </div>

            {/* Rincian Transaksi Scrollable */}
            <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
              {selectedBuktiTransfer.buktiTransferUrl && (
                <div style={{ marginBottom: '14px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #CBD5E1', backgroundColor: '#0F172A' }}>
                  <div style={{ padding: '6px 10px', backgroundColor: '#1E293B', color: '#94A3B8', fontSize: '0.68rem', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#4ADE80', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>verified</span>
                      <span>STRUK TRANSFER M-BANKING (ASLI)</span>
                    </span>
                    <a
                      href={selectedBuktiTransfer.buktiTransferUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#38BDF8', textDecoration: 'none', fontSize: '0.68rem', fontWeight: 700 }}
                    >
                      Buka Penuh ↗
                    </a>
                  </div>
                  <img
                    src={selectedBuktiTransfer.buktiTransferUrl}
                    alt="Bukti Transfer M-Banking"
                    style={{ width: '100%', maxHeight: '240px', objectFit: 'contain', display: 'block', backgroundColor: '#0F172A' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                  <span style={{ color: '#64748B' }}>Nomor Referensi:</span>
                  <span style={{ fontWeight: 800, color: '#0F172A', fontFamily: 'monospace' }}>{selectedBuktiTransfer.noRef}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                  <span style={{ color: '#64748B' }}>Waktu Transaksi:</span>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>{selectedBuktiTransfer.tanggalTransfer}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                  <span style={{ color: '#64748B' }}>Pengirim:</span>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>PT Mapah Trip Indonesia</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                  <span style={{ color: '#64748B' }}>Penerima:</span>
                  <span style={{ fontWeight: 800, color: '#0F172A' }}>{selectedBuktiTransfer.atasNama}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                  <span style={{ color: '#64748B' }}>Bank &amp; Rekening Tujuan:</span>
                  <span style={{ fontWeight: 800, color: '#0284C7' }}>{selectedBuktiTransfer.namaBank} &bull; {selectedBuktiTransfer.nomorRekening}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                  <span style={{ color: '#64748B' }}>Pemohon Visa Terkait:</span>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>{selectedBuktiTransfer.namaPemohon} ({selectedBuktiTransfer.programVisa})</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                  <span style={{ color: '#64748B' }}>Biaya Admin Transfer:</span>
                  <span style={{ fontWeight: 700, color: '#10B981' }}>Rp 0 (Gratis Ditanggung MapahTrip)</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '2px', fontSize: '0.86rem' }}>
                  <span style={{ fontWeight: 800, color: '#0F172A' }}>Total Diterima Mitra:</span>
                  <span style={{ fontWeight: 900, color: '#10B981' }}>{formatRupiah(selectedBuktiTransfer.nominal)}</span>
                </div>
              </div>

              {/* Watermark / Footer Struk */}
              <div
                style={{
                  marginTop: '14px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '10px',
                  padding: '10px',
                  border: '1px dashed #CBD5E1',
                  textAlign: 'center',
                  fontSize: '0.7rem',
                  color: '#64748B',
                }}
              >
                <div style={{ fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#10B981' }}>verified</span>
                  <span>Transaksi Sah &bull; MapahTrip Partner Club</span>
                </div>
                <div style={{ marginTop: '2px' }}>
                  Struk elektronik resmi yang diterbitkan otomatis oleh sistem keuangan MapahTrip.
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedBuktiTransfer(null)}
                  style={{
                    flex: 1,
                    backgroundColor: '#F1F5F9',
                    color: '#475569',
                    border: '1px solid #CBD5E1',
                    padding: '9px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Tutup Struk
                </button>
                {selectedBuktiTransfer.buktiTransferUrl ? (
                  <button
                    type="button"
                    onClick={() => {
                      const url = selectedBuktiTransfer.buktiTransferUrl;
                      if (!url) return;
                      try {
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `Struk-Payout-${selectedBuktiTransfer.noRef || 'Transfer'}.jpg`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      } catch {
                        window.open(url, '_blank');
                      }
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: '#16A34A',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '9px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
                    <span>Download Struk</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    style={{
                      flex: 1,
                      backgroundColor: '#F1F5F9',
                      color: '#94A3B8',
                      border: '1px solid #E2E8F0',
                      padding: '9px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>image_not_supported</span>
                    <span>Struk Belum Ada</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Alert saat ada Notifikasi Pemohon Masuk atau Update Tahap */}
      {showLiveCustomerToast && unreadNotifications.length > 0 && (() => {
        const latest = unreadNotifications[0];
        const isNew = latest.tipe === 'new_customer';
        const isFee = latest.tipe === 'fee_ready';
        const isVisa = latest.tipe === 'visa_ready';
        return (
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              zIndex: 9999,
              backgroundColor: '#FFFFFF',
              border: `1px solid ${isNew ? '#BBF7D0' : isFee ? '#FECACA' : '#BAE6FD'}`,
              borderRadius: '16px',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08)',
              padding: '14px 16px',
              maxWidth: '380px',
              width: 'calc(100vw - 48px)',
              animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: latest.iconBg,
                color: latest.iconColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                {latest.icon}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <strong style={{ fontSize: '0.84rem', color: '#0F172A' }}>
                  {isNew ? '🎉 Ada Pemohon Baru Masuk!' : isVisa ? '🎉 Visa Jepang Terbit!' : isFee ? '💰 Komisi Siap Ditransfer!' : '📦 Update Berkas Pemohon'}
                </strong>
                <button
                  type="button"
                  onClick={() => setShowLiveCustomerToast(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    padding: '0 0 0 6px',
                    fontSize: '16px',
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
              <p style={{ margin: '4px 0 8px', fontSize: '0.76rem', color: '#475569', lineHeight: 1.4 }}>
                <strong>{latest.judul}</strong>: {latest.pesan}
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowNotifPopover(true);
                    setShowLiveCustomerToast(false);
                  }}
                  style={{
                    backgroundColor: isNew ? '#16A34A' : isFee ? '#DC2626' : '#0284C7',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Buka Notifikasi ({unreadNotifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setShowLiveCustomerToast(false)}
                  style={{
                    backgroundColor: '#F1F5F9',
                    color: '#64748B',
                    border: 'none',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    
        {renderSuccessReferralModal()}
      </div>
    );
  }

  return null;
};
