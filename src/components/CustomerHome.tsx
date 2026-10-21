import logoHitam from '../assets/mapahtrip_logo_hitam.png';
import logoPutih from '../assets/mapahtrip_logo_putih.png';
import buildingPhoto from '../assets/MapahTrip.jpg';
import React, { useState, useEffect } from 'react';
import type { Pengajuan, KonsjenKota } from '../types';
import { searchPasporInDB, createPengajuanInDB } from '../lib/supabase';
import { kirimPesanWA } from '../whatsapp';

interface CustomerHomeProps {
  pengajuanList: Pengajuan[];
}

// --- Official Brand Logos (High-Fidelity SVGs) ---
const InstagramBrandIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}>
    <defs>
      <radialGradient id="igBrandGrad" cx="20%" cy="105%" r="130%">
        <stop offset="0%" stopColor="#FFDD55" />
        <stop offset="10%" stopColor="#FFDD55" />
        <stop offset="35%" stopColor="#FF543E" />
        <stop offset="60%" stopColor="#C837AB" />
        <stop offset="90%" stopColor="#405DE6" />
      </radialGradient>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="5.5" fill="url(#igBrandGrad)" />
    <rect x="5.5" y="5.5" width="13" height="13" rx="3.5" stroke="#FFFFFF" strokeWidth="1.6" fill="none" />
    <circle cx="12" cy="12" r="3.2" stroke="#FFFFFF" strokeWidth="1.6" fill="none" />
    <circle cx="16.4" cy="7.6" r="0.9" fill="#FFFFFF" />
  </svg>
);

const TikTokBrandIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}>
    <rect width="24" height="24" rx="5.5" fill="#010101" />
    <path
      d="M17.8 7.2a4.4 4.4 0 0 1-2.9-1.6v8.4a3.8 3.8 0 1 1-3.8-3.8c.36 0 .7.05 1.02.15V7.7a6.2 6.2 0 0 0-1.02-.08 6.4 6.4 0 1 0 6.4 6.4V9.6a6.9 6.9 0 0 0 3.1.8V7.8a4.5 4.5 0 0 1-2.8-.6z"
      fill="#25F4EE"
      transform="translate(-0.6, -0.6)"
    />
    <path
      d="M17.8 7.2a4.4 4.4 0 0 1-2.9-1.6v8.4a3.8 3.8 0 1 1-3.8-3.8c.36 0 .7.05 1.02.15V7.7a6.2 6.2 0 0 0-1.02-.08 6.4 6.4 0 1 0 6.4 6.4V9.6a6.9 6.9 0 0 0 3.1.8V7.8a4.5 4.5 0 0 1-2.8-.6z"
      fill="#FE2C55"
      transform="translate(0.6, 0.6)"
    />
    <path
      d="M17.8 7.2a4.4 4.4 0 0 1-2.9-1.6v8.4a3.8 3.8 0 1 1-3.8-3.8c.36 0 .7.05 1.02.15V7.7a6.2 6.2 0 0 0-1.02-.08 6.4 6.4 0 1 0 6.4 6.4V9.6a6.9 6.9 0 0 0 3.1.8V7.8a4.5 4.5 0 0 1-2.8-.6z"
      fill="#FFFFFF"
    />
  </svg>
);

const GmailBrandIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}
  >
    <path
      d="M2.5 6.5C2.5 5.67 3.17 5 4 5H20C20.83 5 21.5 5.67 21.5 6.5V17.5C21.5 18.33 20.83 19 20 19H4C3.17 19 2.5 18.33 2.5 17.5V6.5Z"
      fill="#FFFFFF"
    />
    <path
      d="M2.5 6.5V17.5C2.5 18.33 3.17 19 4 19H7.2V11L2.5 7.6V6.5Z"
      fill="#4285F4"
    />
    <path
      d="M21.5 6.5V17.5C21.5 18.33 20.83 19 20 19H16.8V11L21.5 7.6V6.5Z"
      fill="#34A853"
    />
    <path
      d="M2.5 6.5C2.5 5.67 3.17 5 4 5H7.2V11L2.5 7.6V6.5Z"
      fill="#EA4335"
    />
    <path
      d="M21.5 6.5C21.5 5.67 20.83 5 20 5H16.8V11L21.5 7.6V6.5Z"
      fill="#FBBC04"
    />
    <path
      d="M7.2 5L12 8.7L16.8 5H7.2Z"
      fill="#C5221F"
    />
    <path
      d="M7.2 5V11L12 14.6L16.8 11V5L12 8.7L7.2 5Z"
      fill="#EA4335"
    />
  </svg>
);

const WhatsAppBrandIcon: React.FC<{ size?: number; inverted?: boolean }> = ({ size = 18, inverted = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}>
    <path
      d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.04 14.69 2 12.04 2Z"
      fill={inverted ? "#FFFFFF" : "#25D366"}
    />
    <path
      d="M17.52 14.33C17.22 14.18 15.75 13.45 15.47 13.35C15.2 13.25 15 13.2 14.81 13.5C14.61 13.8 14.05 14.47 13.87 14.67C13.7 14.87 13.52 14.9 13.22 14.75C12.92 14.6 11.97 14.29 10.84 13.28C9.96 12.49 9.37 11.52 9.2 11.22C9.02 10.92 9.18 10.76 9.33 10.61C9.47 10.47 9.63 10.26 9.78 10.08C9.93 9.9 9.98 9.77 10.08 9.57C10.18 9.37 10.13 9.2 10.05 9.05C9.98 8.9 9.4 7.47 9.17 6.88C8.93 6.3 8.7 6.38 8.52 6.37C8.35 6.36 8.16 6.36 7.96 6.36C7.76 6.36 7.44 6.43 7.17 6.73C6.9 7.02 6.13 7.75 6.13 9.22C6.13 10.69 7.2 12.11 7.35 12.31C7.5 12.51 9.45 15.52 12.44 16.81C13.15 17.12 13.71 17.3 14.14 17.44C14.86 17.67 15.52 17.64 16.04 17.56C16.62 17.47 17.82 16.83 18.07 16.13C18.32 15.43 18.32 14.83 18.25 14.7C18.17 14.58 17.98 14.5 17.68 14.35L17.52 14.33Z"
      fill={inverted ? "#25D366" : "#FFFFFF"}
    />
  </svg>
);

// --- 8 Master Visa Options Data ---
const VISA_OPTIONS = [
  // Card 1: Tourist Single Entry (Dark)
  {
    id: 'tourist-single',
    title: 'Tourist Single Entry',
    subtitle: 'e-Paspor & Reguler',
    theme: 'dark' as const,
    popularBadge: '★ POPULER',
    topRightBadge: 'Paling Populer',
    icon: 'flight',
    pricePill: 'Mulai Rp 750rb',
    durationPill: '15-90 Hari',
    desc: 'Liburan, jalan-jalan, Sakura/Harvest. Bantuan dummy tiket & itinerary Jepang.',
    tags: ['Paspor', 'Rek Koran 3 Bulan', 'Itinerary'],
    category: 'turis' as const,
    syaratLengkap: [
      'Paspor Asli berlaku min. 6 bulan + Paspor Lama (jika ada)',
      'Formulir Permohonan Visa Jepang & Pasfoto 4.5 x 3.5 cm (latar putih terbaru)',
      'Rekening Koran 3 Bulan Terakhir (stempel bank resmi)',
      'Jadwal Perjalanan (Itinerary) harian (kami bantu susun)',
      'Reservasi Tiket Pesawat PP & Bukti Booking Hotel (dummy kami siapkan)',
      'Fotokopi KTP & Kartu Keluarga (KK)',
    ],
  },
  // Card 2: Tourist Multiple Entry (Light)
  {
    id: 'tourist-multiple',
    title: 'Tourist Multiple Entry',
    subtitle: '5 Tahun / Multiple',
    theme: 'light' as const,
    topRightBadge: 'Hemat Jangka Panjang',
    icon: 'luggage',
    pricePill: 'Mulai Rp 1,1jt',
    durationPill: '15-90 Hari / kunjungan',
    desc: 'Untuk yang sering ke Jepang. Syarat lebih ketat, kami bantu review & strengthening.',
    tags: ['Histori Visa Jepang', 'Keuangan Kuat'],
    category: 'turis' as const,
    syaratLengkap: [
      'Paspor Asli min. 6 bulan (e-Paspor atau Reguler)',
      'Bukti Riwayat Kunjungan ke Jepang dalam 3 tahun terakhir atau negara OECD',
      'Rekening Koran 3-6 bulan terakhir dengan saldo kuat & konsisten',
      'Surat Permohonan Multiple Entry (penjelasan urgensi berkunjung rutin)',
      'Bukti Pekerjaan / SPT Tahunan & Formulir Aplikasi JVAC',
      'Fotokopi KTP & Kartu Keluarga (KK)',
    ],
  },
  // Card 3: Japan e-Visa / Waiver (Dark)
  {
    id: 'evisa-waiver',
    title: 'Japan e-Visa / Waiver',
    subtitle: 'e-Paspor & Visa Waiver Registration',
    theme: 'dark' as const,
    popularBadge: '★ POPULER',
    topRightBadge: '100% Online',
    icon: 'description',
    pricePill: 'Mulai Rp 450rb',
    durationPill: '15 Hari',
    desc: 'Registrasi bebas visa untuk e-paspor atau e-Visa turis via online. Proses 3-5 hari.',
    tags: ['e-Paspor', 'Foto Digital'],
    category: 'turis' as const,
    syaratLengkap: [
      'Wajib Paspor Elektronik RI (ada chip di cover depan)',
      'Scan Halaman Biodata Paspor resolusi tajam tanpa pantulan cahaya',
      'Pasfoto Digital 4.5 x 3.5 cm latar putih polos',
      'Proses 100% Online tanpa perlu kirim paspor fisik ke konsulat',
      'Masa berlaku registrasi 3 tahun (bebas keluar-masuk maksimal 15 hari per kunjungan)',
    ],
  },
  // Card 4: Kunjungan Keluarga / Teman (Light)
  {
    id: 'kunjungan-keluarga',
    title: 'Kunjungan Keluarga / Teman',
    subtitle: 'Family / Friend Visit',
    theme: 'light' as const,
    topRightBadge: 'Visit',
    icon: 'groups',
    pricePill: 'Mulai Rp 850rb',
    durationPill: '30-90 Hari',
    desc: 'Dikunjungi keluarga/teman di Jepang? Kami siapkan surat undangan & penjamin.',
    tags: ['Surat Undangan', 'Juminhyo Pengundang'],
    category: 'keluarga' as const,
    syaratLengkap: [
      'Paspor Asli pemohon berlaku min. 6 bulan & Pasfoto 4.5 x 3.5 cm',
      'Surat Undangan Resmi (Shouheiriyuusho) dari pihak pengundang di Jepang',
      'Surat Penjamin (Mimoto Hoshousho) jika akomodasi/biaya ditanggung pengundang',
      'Juminhyo (Surat Kependudukan Jepang) & Bukti Pajak/Penghasilan Pengundang',
      'Bukti Hubungan (Buku Nikah / Akta Lahir / Dokumentasi foto bersama)',
      'Jadwal Perjalanan (Taizai Yoteihyo) selama tinggal di Jepang',
    ],
  },
  // Card 5: Visa Bisnis (Light)
  {
    id: 'visa-bisnis',
    title: 'Visa Bisnis',
    subtitle: 'Business / Meeting',
    theme: 'light' as const,
    topRightBadge: 'Business',
    icon: 'business_center',
    pricePill: 'Mulai Rp 950rb',
    durationPill: '15-90 Hari',
    desc: 'Meeting, conference, negosiasi. Dokumen perusahaan Jepang & Indonesia kami cek lengkap.',
    tags: ['Surat Tugas', 'Undangan Bisnis'],
    category: 'bisnis' as const,
    syaratLengkap: [
      'Paspor Asli pemohon min. 6 bulan & Pasfoto 4.5 x 3.5 cm',
      'Surat Tugas / Perjalanan Dinas resmi dari perusahaan di Indonesia',
      'Surat Undangan Bisnis resmi dari mitra / counterpart di Jepang',
      'Jadwal Kegiatan Bisnis harian (Taizai Yoteihyo) di Jepang',
      'Bukti Legalitas Perusahaan (SIUP/NIB) & Rekening Koran Perusahaan/Pribadi',
    ],
  },
  // Card 6: Visa Pelajar / Student (Dark)
  {
    id: 'visa-pelajar',
    title: 'Visa Pelajar / Student',
    subtitle: 'Student & Language School',
    theme: 'dark' as const,
    topRightBadge: 'Long Stay',
    icon: 'school',
    pricePill: 'Mulai Rp 1,2jt',
    durationPill: '3 Bulan - 2 Tahun',
    desc: 'Untuk sekolah bahasa, kuliah, dan research. Bantuan CoE & dokumen pendukung.',
    tags: ['CoE', 'Ijazah', 'Bukti Keuangan'],
    category: 'bisnis' as const,
    syaratLengkap: [
      'Paspor Asli pemohon & Pasfoto 4.5 x 3.5 cm',
      'Asli Certificate of Eligibility (CoE) bidang Student dari Imigrasi Jepang',
      'Surat Penerimaan (Letter of Acceptance) dari Universitas atau Sekolah Bahasa Jepang',
      'Ijazah & Transkrip Akademik Terakhir yang telah dilegalisasi',
      'Bukti Kemampuan Finansial Penjamin Studi (Rekening Koran 3 bulan, Bukti Kerja/SPT)',
    ],
  },
  // Card 7: Visa Transit (Light)
  {
    id: 'visa-transit',
    title: 'Visa Transit',
    subtitle: 'Transit & Shore Pass',
    theme: 'light' as const,
    topRightBadge: 'Transit',
    icon: 'schedule',
    pricePill: 'Mulai Rp 550rb',
    durationPill: '3-15 Hari',
    desc: 'Transit Jepang atau stopover. Proses cepat, tidak perlu dummy hotel lama.',
    tags: ['Tiket Transit', 'Visa Tujuan'],
    category: 'keluarga' as const,
    syaratLengkap: [
      'Paspor Asli berlaku min. 6 bulan & Pasfoto 4.5 x 3.5 cm',
      'Tiket Pesawat Onward / Lanjutan ke negara tujuan ketiga (pemberhentian maks. 15 hari)',
      'Visa Negara Tujuan Ketiga yang masih aktif (misal: Visa USA, Kanada, dll)',
      'Bukti Reservasi Akomodasi Hotel transit selama berada di Jepang',
    ],
  },
  // Card 8: Visa Dependent / Spouse (Dark)
  {
    id: 'visa-dependent',
    title: 'Visa Dependent / Spouse',
    subtitle: 'Spouse / Child of Japanese',
    theme: 'dark' as const,
    topRightBadge: 'Keluarga',
    icon: 'favorite',
    pricePill: 'Mulai Rp 1,3jt',
    durationPill: 'Long Term',
    desc: 'Pendamping keluarga, spouse of Japanese, COE dependent. Pendampingan dokumen sensitif.',
    tags: ['Koseki / CoE', 'Buku Nikah'],
    category: 'keluarga' as const,
    syaratLengkap: [
      'Paspor Asli pemohon & Pasfoto 4.5 x 3.5 cm',
      'Asli Certificate of Eligibility (CoE) Dependent / Spouse of Japanese',
      'Salinan Koseki Tohon (bila pasangan WN Jepang) atau Juminhyo penjamin di Jepang',
      'Buku Nikah Resmi / Akta Perkawinan Catatan Sipil',
      'Bukti Penghasilan & Pajak Penjamin di Jepang (Gensen Choshuhyo / Nouzeishoumeisho)',
    ],
  },
];

export const CustomerHome: React.FC<CustomerHomeProps> = ({ pengajuanList }) => {
  const [trackingPaspor, setTrackingPaspor] = useState('');
  const [trackingResult, setTrackingResult] = useState<Pengajuan | null | 'NOT_FOUND'>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedVisaModal, setSelectedVisaModal] = useState<any | null>(null);

  // Form Fields Sesuai Kolom Spreadsheet "Data Pengaju" (Gambar 4) & Konsulat (Status Antrean)
  const [formNama, setFormNama] = useState('');
  const [formNoWa, setFormNoWa] = useState('');
  const [formKonsjen, setFormKonsjen] = useState<KonsjenKota>('Jakarta');
  const [formDomisili, setFormDomisili] = useState('Jawa Barat');
  const [formDomisiliLainnya, setFormDomisiliLainnya] = useState('');
  const [formNoPaspor, setFormNoPaspor] = useState('');
  const [formPaket, setFormPaket] = useState<'Reguler' | 'Premium' | 'TAC'>('Reguler');

  const handleSelectDomisili = (selected: string) => {
    setFormDomisili(selected);
    if (selected.includes('Surabaya') || selected.includes('Jawa Timur') || selected.includes('Kalimantan')) {
      setFormKonsjen('Surabaya');
    } else if (selected.includes('Denpasar') || selected.includes('Bali') || selected.includes('Nusa Tenggara')) {
      setFormKonsjen('Denpasar');
    } else if (selected.includes('Medan') || selected.includes('Sumatera Utara') || selected.includes('Sumatera Barat') || selected.includes('Riau') || selected.includes('Aceh')) {
      setFormKonsjen('Medan');
    } else if (selected.includes('Makassar') || selected.includes('Sulawesi') || selected.includes('Maluku') || selected.includes('Papua')) {
      setFormKonsjen('Makassar');
    } else {
      setFormKonsjen('Jakarta');
    }
  };

  // Form Fields Sesuai Kolom Spreadsheet "Kelengkapan Berkas" (Upload File Berkas)
  const [formFiles, setFormFiles] = useState<{
    formVisa: File | null;
    ktp: File | null;
    ektln: File | null;
    coe: File | null;
    foto: File | null;
  }>({
    formVisa: null,
    ktp: null,
    ektln: null,
    coe: null,
    foto: null,
  });

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [modalStep, setModalStep] = useState<'detail' | 'form' | 'success'>('detail');

  const handleOpenVisaModal = (item: any) => {
    setSelectedVisaModal(item);
    setModalStep('detail');
    setFormSuccessMessage(null);
    setFormError(null);
  };

  // Navigasi Scroll Presisi Tepat di Garis Batas Section (Bebas Glitch Offset Sticky Header)
  const handleNavScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      const headerEl = document.querySelector('.customer-header');
      const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 72;
      const rect = element.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      // Posisi target persis di bawah garis header (offset tepat di batas garis section)
      const targetY = Math.round(rect.top + scrollTop - headerHeight + 1);

      window.scrollTo({
        top: targetY,
        behavior: 'smooth',
      });

      if (window.history.pushState) {
        window.history.pushState(null, '', `#${targetId}`);
      }
    }
  };

  // Pertanyaan & Input Kode Referral Pengunjung
  const [customerRefCode, setCustomerRefCode] = useState<string>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('ref') || localStorage.getItem('mapahtrip_customer_ref') || '';
    } catch {
      return '';
    }
  });

  const [hasRefChoice, setHasRefChoice] = useState<'yes' | 'no'>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('ref') || localStorage.getItem('mapahtrip_customer_ref');
      return ref ? 'yes' : 'no';
    } catch {
      return 'no';
    }
  });

  // Sync kode referral jika dibuka dari URL link khusus (cth: mapahtrip.id/?ref=MT-ALUMNI123)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const refUrl = urlParams.get('ref');
      if (refUrl) {
        const cleanRef = refUrl.toUpperCase().trim();
        setCustomerRefCode(cleanRef);
        setHasRefChoice('yes');
        localStorage.setItem('mapahtrip_customer_ref', cleanRef);
      }
    } catch {
      // ignore
    }
  }, []);
  const [activeVisaTab, setActiveVisaTab] = useState<'all' | 'turis' | 'bisnis' | 'keluarga'>('all');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);



  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingPaspor.trim()) return;
    setIsSearching(true);
    const cleanQuery = trackingPaspor.trim().toLowerCase();

    // 1. Check in loaded list first
    const found = pengajuanList.find(
      (p) =>
        p.noPaspor.toLowerCase() === cleanQuery ||
        p.noPengajuan.toLowerCase() === cleanQuery ||
        p.namaPemohon.toLowerCase().includes(cleanQuery)
    );

    if (found) {
      setTrackingResult(found);
      setIsSearching(false);
      return;
    }

    // 2. Query live Supabase database
    try {
      const dbResult = await searchPasporInDB(cleanQuery);
      if (dbResult) {
        setTrackingResult(dbResult);
      } else {
        setTrackingResult('NOT_FOUND');
      }
    } catch {
      setTrackingResult('NOT_FOUND');
    } finally {
      setIsSearching(false);
    }
  };

  // Helper untuk mengonversi berkas dokumen/gambar menjadi base64 (dengan kompresi ultra-cepat)
  const processFileForUpload = (
    file: File | null
  ): Promise<{ name: string; type: string; base64: string } | null> => {
    if (!file) return Promise.resolve(null);
    return new Promise((resolve) => {
      // Jika berkas berupa gambar, kompres dengan ukuran ideal (max 1200px, ~80-120 KB) agar upload super cepat
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const maxDim = 1200;
            let w = img.width;
            let h = img.height;
            if (w > maxDim || h > maxDim) {
              if (w > h) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
              } else {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
              const base64 = dataUrl.split(',')[1] || '';
              resolve({
                name: file.name.replace(/\.[^/.]+$/, '') + '.jpg',
                type: 'image/jpeg',
                base64,
              });
              return;
            }
            const rawBase64 = ((e.target?.result as string) || '').split(',')[1] || '';
            resolve({ name: file.name, type: file.type || 'image/jpeg', base64: rawBase64 });
          };
          img.onerror = () => {
            const rawBase64 = ((e.target?.result as string) || '').split(',')[1] || '';
            resolve({ name: file.name, type: file.type || 'application/octet-stream', base64: rawBase64 });
          };
          img.src = e.target?.result as string;
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      } else {
        // PDF atau dokumen lainnya
        const reader = new FileReader();
        reader.onload = () => {
          const res = (reader.result as string).split(',')[1] || '';
          resolve({
            name: file.name,
            type: file.type || 'application/pdf',
            base64: res,
          });
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      }
    });
  };

  const handleKirimPendaftaran = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formNama.trim()) {
      setFormError('Nama Lengkap wajib diisi.');
      return;
    }
    if (!formNoWa.trim() || formNoWa.length < 8) {
      setFormError('Nomor WhatsApp wajib diisi angka dengan benar (minimal 8 digit).');
      return;
    }

    const finalDomisili =
      formDomisili === 'Lainnya' ? formDomisiliLainnya.trim() || 'Lainnya' : formDomisili;

    const finalRefCode =
      hasRefChoice === 'yes' && customerRefCode.trim()
        ? customerRefCode.trim().toUpperCase()
        : 'MAPAHTRIP';

    setFormSubmitting(true);
    setFormError(null);

    // 1. Siapkan file berkas untuk diunggah (kompresi lokal sangat cepat secara paralel)
    let fileFormVisa = null;
    let fileKtp = null;
    let fileEktln = null;
    let fileCoe = null;
    let fileFoto = null;

    try {
      [fileFormVisa, fileKtp, fileEktln, fileCoe, fileFoto] = await Promise.all([
        processFileForUpload(formFiles.formVisa),
        processFileForUpload(formFiles.ktp),
        processFileForUpload(formFiles.ektln),
        processFileForUpload(formFiles.coe),
        processFileForUpload(formFiles.foto),
      ]);
    } catch (fileErr) {
      console.warn('Catatan pemrosesan file upload:', fileErr);
    }

    // 2. Jalankan penyimpanan Database Supabase dan pengiriman Google Apps Script secara SIMULTAN / PARALEL
    const sheetsWebhookUrl =
      (import.meta as any).env?.VITE_GOOGLE_SHEETS_WEBHOOK_URL ||
      localStorage.getItem('mapahtrip_sheets_webhook_url') ||
      'https://script.google.com/macros/s/AKfycbz789i6peUgtZwAaGb35BvpT2jR7-DnvZou5I6xvLkSsPnE3w_bnAyEIu08wdcU1T2Reg/exec';

    const saveToSupabase = createPengajuanInDB({
      nama: formNama.trim(),
      domisili_ktp: finalDomisili,
      konsjen: formKonsjen,
      no_wa: formNoWa.trim(),
      no_paspor: formNoPaspor.trim() || '-',
      code_referral: finalRefCode,
      form_visa: !!formFiles.formVisa,
      ktp: !!formFiles.ktp,
      ektln: !!formFiles.ektln,
      coe: !!formFiles.coe,
      foto: !!formFiles.foto,
      program: selectedVisaModal?.title || 'Visa Jepang',
      paket: formPaket,
    }).catch((err) => {
      console.warn('Gagal mencatat pengajuan ke DB:', err);
    });

    const sendToGoogleSheets = sheetsWebhookUrl
      ? fetch(sheetsWebhookUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            timestamp: new Date().toLocaleString('id-ID'),
            nama: formNama.trim(),
            domisili_ktp: finalDomisili,
            konsjen: formKonsjen,
            no_wa: formNoWa.trim(),
            no_paspor: formNoPaspor.trim() || '-',
            code_referral: finalRefCode,
            program: selectedVisaModal?.title || 'Visa Jepang',
            paket: formPaket,
            form_visa: fileFormVisa || (formFiles.formVisa ? formFiles.formVisa.name : '-'),
            ktp: fileKtp || (formFiles.ktp ? formFiles.ktp.name : '-'),
            ektln: fileEktln || (formFiles.ektln ? formFiles.ektln.name : '-'),
            coe: fileCoe || (formFiles.coe ? formFiles.coe.name : '-'),
            foto: fileFoto || (formFiles.foto ? formFiles.foto.name : '-'),
          }),
        }).catch((sheetErr) => {
          console.warn('Google Sheets Webhook note:', sheetErr);
        })
      : Promise.resolve();

    // 3. Kirim notifikasi WhatsApp otomatis via Gateway API (Session: Mapahtrip)
    const namaPendaftar = formNama.trim();
    const programVisa = selectedVisaModal?.title || 'Visa Jepang';
    const noPasporText = formNoPaspor.trim() && formNoPaspor.trim() !== '-' ? formNoPaspor.trim() : '-';

    const waMessage =
      `Halo Kak *${namaPendaftar}*, terima kasih sudah mendaftar di *Mapah Trip*! 🇯🇵✨\n\n` +
      `Data pendaftaran pengajuan visa Anda telah berhasil kami terima:\n` +
      `📋 *Program:* ${programVisa} (${formPaket})\n` +
      `🏛️ *Konsulat Tujuan:* Konsjen ${formKonsjen}\n` +
      `📍 *Domisili KTP:* ${finalDomisili}\n` +
      (noPasporText !== '-' ? `🛂 *No. Paspor:* ${noPasporText}\n` : '') +
      `🏷️ *Kode Referral:* ${finalRefCode}\n\n` +
      `Tim operasional Mapah Trip akan segera memverifikasi kelengkapan berkas Anda dan memberikan arahan tahapan berikutnya.\n\n` +
      `Jika ada berkas tambahan atau pertanyaan seputar proses visa Jepang, silakan langsung membalas pesan WhatsApp ini ya Kak. Terima kasih! 🙏\n\n` +
      `_Mapah Trip - Layanan Pengajuan Visa Jepang Resmi & Terpercaya_`;

    const sendToWhatsApp = kirimPesanWA(formNoWa.trim(), waMessage).catch((waErr) => {
      console.warn('Catatan pengiriman WhatsApp Gateway:', waErr);
      return null;
    });

    await Promise.all([saveToSupabase, sendToGoogleSheets, sendToWhatsApp]);

    setFormSubmitting(false);
    setModalStep('success');
  };


  return (
    <div className={isDarkMode ? 'dark-theme' : ''} style={{ backgroundColor: isDarkMode ? '#070C15' : '#FCFDFF', minHeight: '100vh', color: isDarkMode ? '#F8FAFC' : '#0F172A', transition: 'background-color 0.3s ease, color 0.3s ease' }}>

      {/* 1. Customer Navigation Header */}
      <header
        className="customer-header"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: isDarkMode ? 'rgba(7, 12, 21, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: isDarkMode ? '1px solid #1E293B' : '1px solid #E2E8F0',
        }}
      >
        <div className="header-left-group">
          {/* Brand Logo */}
          <a
            href="#beranda"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
              if (window.location.hash) {
                window.history.pushState(null, '', window.location.pathname);
              }
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}
          >
            <img
              src={isDarkMode ? logoPutih : logoHitam}
              alt="Logo MapahTrip"
              style={{
                width: '36px',
                height: '36px',
                objectFit: 'contain',
              }}
            />
            <div
              className="header-japan-pill"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '4px 11px 4px 8px',
                borderRadius: '9999px',
                backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
                border: isDarkMode ? '1px solid #334155' : '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              }}
            >
              {/* Japan Flag Round Accent */}
              <div
                style={{
                  width: '15px',
                  height: '15px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 0.5px 1.5px rgba(0, 0, 0, 0.06)',
                }}
              >
                <div
                  style={{
                    width: '6.5px',
                    height: '6.5px',
                    borderRadius: '50%',
                    backgroundColor: '#BC002D',
                  }}
                />
              </div>
              <span
                style={{
                  color: isDarkMode ? '#F8FAFC' : '#0F172A',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}
              >
                Japan Visa Only
              </span>
            </div>
          </a>

          {/* Nav links (Desktop) */}
          <nav
            className="desktop-nav"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {[
              { label: 'Jenis Visa', href: '#jenis-visa', id: 'jenis-visa' },
              { label: 'Alur Proses', href: '#alur', id: 'alur' },
              { label: 'Lacak Status', href: '#tracking', id: 'tracking' },
              { label: 'FAQ', href: '#faq', id: 'faq' },
              { label: 'Daftar', href: '#jenis-visa', id: 'jenis-visa', isDaftar: true },
            ].map((item, idx) =>
              item.isDaftar ? (
                <a
                  key={idx}
                  href={item.href}
                  onClick={(e) => handleNavScroll(e, item.id)}
                  className="nav-link-daftar-inline"
                  style={{
                    backgroundColor: '#005BB5',
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    padding: '6px 16px',
                    borderRadius: '9999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: '4px',
                    boxShadow: '0 2px 6px rgba(0, 91, 181, 0.25)',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                  }}
                >
                  <span>{item.label}</span>
                </a>
              ) : (
                <a
                  key={idx}
                  href={item.href}
                  onClick={(e) => handleNavScroll(e, item.id)}
                  className="nav-link-premium"
                >
                  <span>{item.label}</span>
                </a>
              )
            )}
          </nav>
        </div>

        {/* Right CTA: Live Status Pill, Dark Mode Toggle & Mobile Hamburger */}
        <div className="header-right-group">
          {/* Dark / Light Mode Toggle Button */}
          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '9999px',
              background: isDarkMode ? '#1E293B' : '#F1F5F9',
              border: isDarkMode ? '1px solid #334155' : '1px solid #E2E8F0',
              color: isDarkMode ? '#F59E0B' : '#475569',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              outline: 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
            title={isDarkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
            aria-label="Toggle Mode Gelap / Terang"
          >
            {isDarkMode ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          {/* JVAC Live Status Pill */}
          <a
            href="https://wa.me/6281401735648?text=Halo%20MapahTrip,%20saya%20ingin%20konsultasi%20pengajuan%20Visa%20Jepang"
            target="_blank"
            rel="noopener noreferrer"
            className="header-jvac-pill"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 13px',
              borderRadius: '9999px',
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              color: '#166534',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.02em',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 4px rgba(22, 101, 52, 0.06)',
            }}
            title="Klik untuk konsultasi slot JVAC hari ini"
          >
            <span
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '8px',
                height: '8px',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  animation: 'beaconPing 2s cubic-bezier(0, 0, 0.2, 1) infinite',
                }}
              />
              <span
                style={{
                  position: 'relative',
                  width: '6.5px',
                  height: '6.5px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  display: 'inline-block',
                }}
              />
            </span>
            <span>JVAC OPEN</span>
            <span className="jvac-dot-separator" style={{ color: '#86EFAC' }}>•</span>
            <span className="jvac-slot-text" style={{ color: '#15803D', fontWeight: 600 }}>Slot Hari Ini</span>
          </a>

          {/* Mobile Menu Hamburger Button */}
          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: isDarkMode ? '#1E293B' : '#F1F5F9',
              border: isDarkMode ? '1px solid #334155' : '1px solid #CBD5E1',
              color: isDarkMode ? '#F8FAFC' : '#0F172A',
              cursor: 'pointer',
              outline: 'none',
            }}
            aria-label="Toggle Navigasi Mobile"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer">
          {[
            { label: 'Jenis Visa Jepang', href: '#jenis-visa', id: 'jenis-visa', icon: 'flight' },
            { label: 'Alur Proses & Syarat', href: '#alur', id: 'alur', icon: 'sync_alt' },
            { label: 'Lacak Status Paspor', href: '#tracking', id: 'tracking', icon: 'search' },
            { label: 'Tanya Jawab (FAQ)', href: '#faq', id: 'faq', icon: 'help_outline' },
            { label: 'Daftar Visa Jepang', href: '#jenis-visa', id: 'jenis-visa', icon: 'how_to_reg' },
          ].map((item, idx) => (
            <a
              key={idx}
              href={item.href}
              className="mobile-nav-link"
              onClick={(e) => {
                setMobileMenuOpen(false);
                handleNavScroll(e, item.id);
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#005bb5' }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </span>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#94A3B8' }}>
                chevron_right
              </span>
            </a>
          ))}
          <a
            href="https://wa.me/6281401735648?text=Halo%20MapahTrip,%20saya%20ingin%20konsultasi%20pengajuan%20Visa%20Jepang"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              borderRadius: '12px',
              background: '#25D366',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.9rem',
              textDecoration: 'none',
              marginTop: '4px',
            }}
          >
            <WhatsAppBrandIcon size={18} inverted={true} />
            <span>Konsultasi Gratis via WhatsApp</span>
          </a>
        </div>
      )}

      {/* 2. Hero Section */}
      <section id="beranda" style={{ padding: '60px 24px 80px', maxWidth: '1240px', margin: '0 auto' }}>
        <div className="hero-grid">
          {/* Left Column: Headline & Value Prop */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: '#0369A1',
                fontSize: '0.78rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                width: 'fit-content',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#0284C7',
                }}
              />
              <span>Spesialis Visa Jepang</span>
              <span style={{ color: '#CBD5E1' }}>•</span>
              <span>Standar JVAC 2025</span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(2.3rem, 3.8vw, 3.5rem)',
                lineHeight: 1.12,
                letterSpacing: '-0.03em',
              }}
            >
              <span
                className="font-serif"
                style={{
                  display: 'block',
                  fontWeight: 800,
                  color: '#0B1220',
                }}
              >
                Daftar Visa Jepang
              </span>
              <span
                style={{
                  display: 'block',
                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
                  fontWeight: 800,
                  color: '#0090FF',
                  letterSpacing: '-0.03em',
                }}
              >
                Simpel, Mudah &amp; Cepat
              </span>
            </h1>

            <p style={{ fontSize: '1.05rem', color: '#475569', lineHeight: 1.6, maxWidth: '600px' }}>
              Fokus <strong style={{ color: isDarkMode ? '#60A5FA' : '#0F172A' }}>100% Visa Jepang</strong>. Semua jenis visa kami urus — dari tourist, visa waiver, bisnis, sampai student, <strong style={{ color: '#0077F6' }}>Tokutei Ginou (SSW)</strong> &amp; <strong style={{ color: '#0077F6' }}>Magang</strong>. Dokumen &amp; itinerary Jepang kami siapkan, kamu tinggal tunggu jadi.
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginTop: '6px' }}>
              <a
                href="#jenis-visa"
                onClick={(e) => handleNavScroll(e, 'jenis-visa')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '13px 26px',
                  borderRadius: '9999px',
                  background: '#0B1220',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(11, 18, 32, 0.2)',
                }}
              >
                <span>Cek Jenis Visa</span>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  arrow_forward
                </span>
              </a>

              <button
                type="button"
                onClick={() => handleOpenVisaModal(VISA_OPTIONS[0])}
                className="wa-cta-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '13px 24px',
                  borderRadius: '9999px',
                  background: '#005BB5',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0, 91, 181, 0.25)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  edit_document
                </span>
                <span>Daftar Visa Sekarang</span>
              </button>

            </div>

            {/* 3 Metric Badges: Samakan Font Serif & Data Riil Pemohon */}
            <div className="hero-metric-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', width: '100%' }}>
              <div className="metric-card" style={{ padding: '16px 18px', borderRadius: '18px', background: '#ffffff', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <div className="font-serif" style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '2rem', fontWeight: 700, color: '#0B1220', lineHeight: 1.1 }}>
                  99%
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>Approval Rate</div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>screening ketat</div>
              </div>

              <div className="metric-card" style={{ padding: '16px 18px', borderRadius: '18px', background: '#ffffff', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <div className="font-serif" style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '2rem', fontWeight: 700, color: '#0B1220', lineHeight: 1.1 }}>
                  200+
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>Visa Approved</div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>data riil pemohon</div>
              </div>

              <div className="metric-card" style={{ padding: '16px 18px', borderRadius: '18px', background: '#ffffff', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <div className="font-serif" style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '2rem', fontWeight: 700, color: '#0B1220', lineHeight: 1.1 }}>
                  100%
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>Fokus Jepang</div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>bukan campur</div>
              </div>
            </div>

            {/* Social Trust Line: Dipercaya pemohon berbagai kota */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginTop: '16px',
                padding: '2px 0',
                flexWrap: 'wrap',
              }}
            >
              {/* Overlapping Avatars (Japan Visa Holders) */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: '#E0F2FE',
                    color: '#0284C7',
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #ffffff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  }}
                  title="Pekerja / Magang"
                >
                  JP
                </div>
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: '#EFF6FF',
                    color: '#2563EB',
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #ffffff',
                    marginLeft: '-7px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  }}
                  title="Mahasiswa"
                >
                  JP
                </div>
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: isDarkMode ? '#1E293B' : '#F1F5F9',
                    color: isDarkMode ? '#F8FAFC' : '#0F172A',
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: isDarkMode ? '2px solid #0F172A' : '2px solid #ffffff',
                    marginLeft: '-7px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  }}
                  title="Keluarga / Turis"
                >
                  JP
                </div>
              </div>

              {/* Text */}
              <div
                className="hero-social-proof-text"
                style={{
                  fontSize: '0.8rem',
                  color: isDarkMode ? '#94A3B8' : '#64748B',
                  lineHeight: 1.4,
                }}
              >
                Dipercaya pekerja, mahasiswa &amp; keluarga di{' '}
                <span
                  style={{
                    color: isDarkMode ? '#F8FAFC' : '#0F172A',
                    fontWeight: 600,
                  }}
                >
                  Jabodetabek, Surabaya, Medan
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Composite Card & 3 Mini Feature Badges */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            <div
              style={{
                borderRadius: '24px',
                backgroundColor: '#0b1220',
                padding: '18px',
                color: '#ffffff',
                boxShadow: '0 16px 36px -10px rgba(11, 18, 32, 0.35)',
                border: '1px solid #1e293b',
                position: 'relative',
                overflow: 'hidden',
                minHeight: '440px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              {/* Background Image: MapahTrip.jpg */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 0,
                }}
              >
                <img
                  src={buildingPhoto}
                  alt="MapahTrip.id"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: 'brightness(0.95) contrast(1.05)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(180deg, rgba(11, 18, 32, 0.35) 0%, rgba(11, 18, 32, 0.1) 40%, rgba(11, 18, 32, 0.75) 100%)',
                  }}
                />
              </div>

              {/* Top Pills Header */}
              <div style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'flex-end' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    background: 'rgba(11, 18, 32, 0.75)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: 'rgba(255, 255, 255, 0.85)',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    letterSpacing: '0.03em',
                  }}
                >
                  <span>Tokyo • Osaka • Kyoto</span>
                </div>
              </div>

              {/* Spacer for clear view of MapahTrip.id sign on the building */}
              <div style={{ flex: 1, minHeight: '130px' }} />

              {/* Bottom Two Overlay Cards */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 10,
                  display: 'grid',
                  gridTemplateColumns: '1.6fr 1fr',
                  gap: '10px',
                  alignItems: 'stretch',
                }}
              >
                {/* Left Card: Visa Approved (White in light, dark glass in dark mode) */}
                <div
                  className="building-overlay-white-card"
                  style={{
                    borderRadius: '16px',
                    background: 'rgba(255, 255, 255, 0.96)',
                    backdropFilter: 'blur(12px)',
                    color: '#0F172A',
                    padding: '12px 14px',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        color: '#0284c7',
                        letterSpacing: '0.06em',
                      }}
                    >
                      VISA APPROVED
                    </div>
                    <h4 style={{ fontWeight: 800, fontSize: '0.875rem', color: '#0F172A', margin: '3px 0 1px' }}>
                      Raisa A. - Tourist Single
                    </h4>
                    <p style={{ fontSize: '0.7rem', color: '#64748B', margin: 0 }}>
                      Issued 4 hari kerja • 90 days
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        background: '#e0f2fe',
                        color: '#0369a1',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                      }}
                    >
                      e-Paspor
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        background: '#0b1220',
                        color: '#ffffff',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        letterSpacing: '0.03em',
                      }}
                    >
                      GRANTED
                    </span>
                  </div>
                </div>

                {/* Right Card: Estimasi (Dark) */}
                <div
                  style={{
                    borderRadius: '16px',
                    background: 'rgba(11, 18, 32, 0.92)',
                    backdropFilter: 'blur(12px)',
                    color: '#ffffff',
                    padding: '12px 14px',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: '#94a3b8',
                      letterSpacing: '0.06em',
                    }}
                  >
                    ESTIMASI
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '1.4rem',
                        fontWeight: 900,
                        color: '#ffffff',
                        letterSpacing: '-0.02em',
                        lineHeight: 1.1,
                        margin: '2px 0',
                      }}
                    >
                      5-7 Hari
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>
                      dari submit JVAC
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cohesive Trust Bar: Satu baris terpadu mewah menggantikan 3 kotak kecil yang bertumpuk */}
            <div
              className="hero-trust-bar"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                borderRadius: '16px',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                padding: '12px 18px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0047BA' }}>
                  verified
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>
                  2x Review Dokumen
                </span>
              </div>

              <span className="trust-dot-sep" style={{ color: '#CBD5E1', fontWeight: 300 }}>•</span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0047BA' }}>
                  event_available
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>
                  Itinerary Harian JVAC
                </span>
              </div>

              <span className="trust-dot-sep" style={{ color: '#CBD5E1', fontWeight: 300 }}>•</span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0047BA' }}>
                  lock
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>
                  Privasi Terenkripsi
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Section Cek Status / Tracking Paspor Customer */}
      <section id="tracking" style={{ backgroundColor: '#F8FAFC', padding: '60px 24px', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: '780px', margin: '0 auto', textAlign: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#2B68E0', letterSpacing: '0.08em' }}>
            Pelacakan Online 24/7
          </span>
          <h2 className="font-serif" style={{ fontSize: '2.2rem', fontWeight: 700, color: '#0F172A', marginTop: '6px' }}>
            Cek Status Pengajuan Paspor Anda
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.95rem', marginTop: '6px' }}>
            Masukkan nomor paspor (contoh: <code>E68291049</code>) atau nomor pengajuan untuk mengecek status berkas secara langsung.
          </p>

          <form onSubmit={handleTrack} style={{ marginTop: '24px', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Masukkan Nomor Paspor atau ID Pengajuan..."
              value={trackingPaspor}
              onChange={(e) => setTrackingPaspor(e.target.value)}
              style={{
                width: '100%',
                maxWidth: '460px',
                padding: '14px 20px',
                borderRadius: '9999px',
                border: '1px solid #cbd5e1',
                fontSize: '0.95rem',
                outline: 'none',
                background: '#ffffff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}
            />
            <button
              type="submit"
              disabled={isSearching}
              style={{
                padding: '14px 28px',
                borderRadius: '9999px',
                background: '#2B68E0',
                color: '#ffffff',
                fontSize: '0.95rem',
                fontWeight: 600,
                border: 'none',
                cursor: isSearching ? 'not-allowed' : 'pointer',
                opacity: isSearching ? 0.7 : 1,
                boxShadow: '0 2px 8px rgba(43, 104, 224, 0.25)',
              }}
            >
              {isSearching ? 'Mencari Data...' : 'Lacak Status'}
            </button>
          </form>

          {/* Tracking Result Card */}
          {trackingResult === 'NOT_FOUND' && (
            <div
              style={{
                marginTop: '24px',
                padding: '20px',
                borderRadius: '16px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                fontSize: '0.9rem',
              }}
            >
              Nomor paspor atau ID pengajuan tidak ditemukan. Silakan periksa kembali atau hubungi admin MapahTrip melalui WhatsApp.
            </div>
          )}

          {typeof trackingResult === 'object' && trackingResult !== null && (
            <div
              style={{
                marginTop: '28px',
                padding: '24px',
                borderRadius: '20px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                textAlign: 'left',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Nama Pemohon</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A' }}>
                    {trackingResult.namaPemohon}
                  </div>
                </div>
                <div style={{ padding: '4px 14px', borderRadius: '9999px', background: '#ecfdf5', color: '#047857', fontWeight: 700, fontSize: '0.85rem' }}>
                  Status: {trackingResult.status}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginTop: '18px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: '#64748B' }}>Nomor Pengajuan:</span>
                  <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{trackingResult.noPengajuan}</div>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Konsulat Tujuan:</span>
                  <div style={{ fontWeight: 600 }}>Konsjen {trackingResult.konsjen}</div>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Program:</span>
                  <div style={{ fontWeight: 600 }}>{trackingResult.program}</div>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Nomor Resi / Paspor:</span>
                  <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{trackingResult.noResi || 'Sedang Diproses'}</div>
                </div>
              </div>

              {trackingResult.catatan && (
                <div style={{ marginTop: '14px', padding: '10px 14px', borderRadius: '10px', background: '#eff6ff', fontSize: '0.825rem', color: '#1e40af' }}>
                  <strong>Catatan Operasional:</strong> {trackingResult.catatan}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 4. Section Jenis Visa & Layanan */}
      <section id="jenis-visa" style={{ padding: '80px 24px', maxWidth: '1240px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#2B68E0', letterSpacing: '0.08em' }}>
            Pilihan Layanan Resmi
          </span>
          <h2 className="font-serif" style={{ fontSize: '2.4rem', fontWeight: 700, color: '#0F172A', marginTop: '6px' }}>
            Jenis Visa Jepang yang Kami Tangani
          </h2>
          <p style={{ color: '#64748B', fontSize: '1rem', marginTop: '6px', maxWidth: '640px', margin: '6px auto 0' }}>
            Layanan pengajuan resmi sesuai standar Kedutaan Besar Jepang &amp; VFS JVAC dengan pendampingan dokumen lengkap sampai approved.
          </p>

          {/* Category Tabs */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '24px' }}>
            {[
              { id: 'all', label: 'Semua Visa (8)' },
              { id: 'turis', label: 'Turis & Waiver' },
              { id: 'bisnis', label: 'Bisnis & Studi' },
              { id: 'keluarga', label: 'Keluarga & Transit' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveVisaTab(tab.id as any)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '9999px',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: activeVisaTab === tab.id ? '1px solid #0F172A' : '1px solid #E2E8F0',
                  backgroundColor: activeVisaTab === tab.id ? '#0F172A' : '#FFFFFF',
                  color: activeVisaTab === tab.id ? '#FFFFFF' : '#475569',
                  transition: 'all 0.15s ease',
                  boxShadow: activeVisaTab === tab.id ? '0 2px 8px rgba(15, 23, 42, 0.15)' : 'none',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 8 Cards: Luxury Editorial Service Catalog (No Checkerboard, Unified Bespoke Layout) */}
        <div className="visa-cards-grid">
          {VISA_OPTIONS
            .filter((item) => activeVisaTab === 'all' || item.category === activeVisaTab).map((item) => {
              const isFeatured = item.id === 'tourist-single' || item.id === 'evisa-waiver';

              return (
                <div
                  id={'visa-' + item.id}
                  key={item.id}
                  className="visa-card-item"
                  style={{
                    borderRadius: '20px',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                    border: isFeatured ? '1.5px solid #BFDBFE' : '1px solid #E2E8F0',
                    boxShadow: isFeatured
                      ? '0 8px 24px -4px rgba(2, 132, 199, 0.08), 0 2px 6px rgba(0, 0, 0, 0.02)'
                      : '0 4px 16px rgba(0, 0, 0, 0.03)',
                    padding: '22px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.borderColor = '#0284C7';
                    e.currentTarget.style.boxShadow = '0 14px 30px -6px rgba(2, 132, 199, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = isFeatured ? '#BFDBFE' : '#E2E8F0';
                    e.currentTarget.style.boxShadow = isFeatured
                      ? '0 8px 24px -4px rgba(2, 132, 199, 0.08), 0 2px 6px rgba(0, 0, 0, 0.02)'
                      : '0 4px 16px rgba(0, 0, 0, 0.03)';
                  }}
                >
                  <div>
                    {/* Top Row: Icon + Status Tag */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px',
                      }}
                    >
                      {/* Refined Icon Container */}
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          backgroundColor: isFeatured ? '#EFF6FF' : '#F8FAFC',
                          border: isFeatured ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                          color: isFeatured ? '#005BB5' : '#0F172A',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                          {item.icon}
                        </span>
                      </div>

                      {/* Subtle Badge */}
                      {isFeatured ? (
                        <span
                          style={{
                            background: '#EFF6FF',
                            color: '#005BB5',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            letterSpacing: '0.04em',
                            border: '1px solid #BFDBFE',
                          }}
                        >
                          ★ TERPOPULER
                        </span>
                      ) : (
                        <span
                          style={{
                            background: '#F8FAFC',
                            color: '#64748B',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '3px 9px',
                            borderRadius: '9999px',
                            border: '1px solid #E2E8F0',
                          }}
                        >
                          {item.topRightBadge}
                        </span>
                      )}
                    </div>

                    {/* Title & Subtitle (Aligned with Fixed Min-Heights) */}
                    <h3
                      style={{
                        fontSize: '1.15rem',
                        fontWeight: 800,
                        color: '#0F172A',
                        lineHeight: 1.3,
                        margin: '0 0 4px',
                        letterSpacing: '-0.02em',
                        minHeight: '48px',
                        display: 'flex',
                        alignItems: 'flex-start',
                      }}
                    >
                      {item.title}
                    </h3>
                    <div
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: '#64748B',
                        marginBottom: '10px',
                        minHeight: '34px',
                        display: 'flex',
                        alignItems: 'flex-start',
                      }}
                    >
                      {item.subtitle}
                    </div>

                    {/* Description (Strictly Aligned) */}
                    <p
                      style={{
                        fontSize: '0.82rem',
                        color: '#475569',
                        lineHeight: 1.5,
                        marginBottom: '16px',
                        minHeight: '56px',
                        display: 'flex',
                        alignItems: 'flex-start',
                      }}
                    >
                      {item.desc}
                    </p>

                    {/* Fee & Stay Duration: Spacious Single-Line Layout */}
                    <div
                      className="visa-fee-box"
                      style={{
                        padding: '10px 14px',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '12px',
                        border: '1px solid #F1F5F9',
                        marginBottom: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      {/* Row 1: Biaya (Lega & Sebaris) */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '16px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.78rem',
                            color: '#64748B',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Biaya
                        </span>
                        <span
                          style={{
                            fontSize: '0.96rem',
                            fontWeight: 800,
                            color: '#0F172A',
                            letterSpacing: '-0.02em',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.pricePill}
                        </span>
                      </div>

                      {/* Row 2: Durasi (Lega & Sebaris) */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: '6px',
                          borderTop: '1px solid #EDF2F7',
                          gap: '16px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.78rem',
                            color: '#64748B',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Durasi
                        </span>
                        <span
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: '#0284C7',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.durationPill}
                        </span>
                      </div>
                    </div>

                    {/* Requirements Micro-Tags (Aligned with Fixed Min-Height) */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '18px', minHeight: '52px', alignContent: 'flex-start' }}>
                      {item.tags.map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          className="visa-tag-pill"
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            color: '#475569',
                          }}
                        >
                          ✓ {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Button Cek Syarat & Detail */}
                  <button
                    onClick={() => handleOpenVisaModal(item)}
                    style={{
                      width: '100%',
                      padding: '11px 16px',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: '1px solid #0F172A',
                      backgroundColor: '#0F172A',
                      color: '#FFFFFF',
                      transition: 'all 0.2s ease',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#005BB5';
                      e.currentTarget.style.borderColor = '#005BB5';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#0F172A';
                      e.currentTarget.style.borderColor = '#0F172A';
                    }}
                  >
                    <span>Cek Syarat &amp; Detail</span>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                      arrow_forward
                    </span>
                  </button>
                </div>
              );
            })}
        </div>
      </section>

      {/* Modal Detail Syarat Lengkap & Formulir Pendaftaran Visa */}
      {selectedVisaModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setSelectedVisaModal(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              padding: '28px',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>
                    {selectedVisaModal.icon}
                  </span>
                </div>
                <div>
                  <h3 className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    {selectedVisaModal.title}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span>{selectedVisaModal.subtitle}</span>
                    <span>&bull;</span>
                    <strong style={{ color: '#005BB5' }}>{selectedVisaModal.pricePill}</strong>
                    <span>&bull;</span>
                    <span style={{ color: '#0F172A', fontWeight: 600 }}>{selectedVisaModal.durationPill}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedVisaModal(null)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748B',
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            {/* STEP 1: DETAIL PERSYARATAN LENGKAP (Tampilan Awal Saat Klik Cek Syarat & Detail) */}
            {modalStep === 'detail' && (
              <div>
                {/* Estimasi Durasi */}
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '14px',
                    padding: '12px 16px',
                    marginBottom: '18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                      Estimasi Masa Tinggal
                    </span>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>
                      {selectedVisaModal.durationPill}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                      Proses Konsulat
                    </span>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#2563EB' }}>
                      3-7 Hari Kerja
                    </div>
                  </div>
                </div>

                {/* Checklist Persyaratan */}
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '0.925rem', fontWeight: 700, color: '#0F172A', marginBottom: '10px' }}>
                    📋 Dokumen Persyaratan yang Diperlukan:
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedVisaModal.syaratLengkap.map((syarat: string, sIdx: number) => (
                      <div
                        key={sIdx}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          fontSize: '0.85rem',
                          color: '#334155',
                          lineHeight: 1.45,
                          backgroundColor: '#F8FAFC',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: '1px solid #EDF2F7',
                        }}
                      >
                        <span style={{ color: '#16A34A', fontWeight: 800, marginTop: '1px' }}>✓</span>
                        <span>{syarat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Info Tambahan */}
                <div
                  style={{
                    fontSize: '0.8rem',
                    color: '#64748B',
                    lineHeight: 1.5,
                    backgroundColor: '#EFF6FF',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    marginBottom: '18px',
                    border: '1px solid #DBEAFE',
                  }}
                >
                  💡 <strong>Layanan MapahTrip:</strong> Tim konsultan kami akan memverifikasi seluruh dokumen Anda sebelum disubmit ke VFS JVAC / Konsulat untuk menjamin kelengkapan dan meminimalisir risiko penolakan.
                </div>

                {/* Pertanyaan & Form Kode Referral Mitra */}
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: hasRefChoice === 'yes' ? '1.5px solid #005BB5' : '1.5px solid #E2E8F0',
                    borderRadius: '14px',
                    padding: '12px 14px',
                    marginBottom: '20px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#005BB5' }}>
                        loyalty
                      </span>
                      Apakah kamu punya kode referral mitra?
                    </span>
                    {hasRefChoice === 'yes' && customerRefCode.trim() && (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          backgroundColor: '#DCFCE7',
                          color: '#15803D',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '9999px',
                        }}
                      >
                        ✓ Kode Terpasang
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginBottom: hasRefChoice === 'yes' ? '10px' : '0' }}>
                    <button
                      type="button"
                      onClick={() => setHasRefChoice('yes')}
                      style={{
                        flex: 1,
                        padding: '7px 12px',
                        borderRadius: '9px',
                        border: hasRefChoice === 'yes' ? '2px solid #005BB5' : '1px solid #CBD5E1',
                        backgroundColor: hasRefChoice === 'yes' ? '#EFF6FF' : '#FFFFFF',
                        color: hasRefChoice === 'yes' ? '#005BB5' : '#475569',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                        {hasRefChoice === 'yes' ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <span>Ya, Punya Kode</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setHasRefChoice('no');
                        setCustomerRefCode('');
                        localStorage.removeItem('mapahtrip_customer_ref');
                      }}
                      style={{
                        flex: 1,
                        padding: '7px 12px',
                        borderRadius: '9px',
                        border: hasRefChoice === 'no' ? '2px solid #64748B' : '1px solid #CBD5E1',
                        backgroundColor: hasRefChoice === 'no' ? '#F1F5F9' : '#FFFFFF',
                        color: hasRefChoice === 'no' ? '#0F172A' : '#475569',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                        {hasRefChoice === 'no' ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <span>Tidak Punya</span>
                    </button>
                  </div>

                  {hasRefChoice === 'yes' && (
                    <div style={{ marginTop: '8px' }}>
                      <input
                        type="text"
                        value={customerRefCode}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setCustomerRefCode(val);
                          localStorage.setItem('mapahtrip_customer_ref', val);
                        }}
                        placeholder="Masukkan Kode Referral (cth: MT-AGUS482)"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1.5px solid #005BB5',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: '#0F172A',
                          outline: 'none',
                          boxSizing: 'border-box',
                          textTransform: 'uppercase',
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* CTA BUTTON: PENGGANTI KONSULTASI VIA WHATSAPP -> DAFTAR (ISI FORMULIR) */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setModalStep('form')}
                    style={{
                      flex: 1,
                      backgroundColor: '#005BB5',
                      color: '#FFFFFF',
                      padding: '14px 20px',
                      borderRadius: '9999px',
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(0, 91, 181, 0.28)',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#00478F')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#005BB5')}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      assignment
                    </span>
                    <span>Daftar (Isi Formulir)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedVisaModal(null)}
                    style={{
                      padding: '14px 20px',
                      borderRadius: '9999px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#FFFFFF',
                      color: '#475569',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                    }}
                  >
                    Tutup
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: FORMULIR PENDAFTARAN & UPLOAD BERKAS */}
            {modalStep === 'form' && (
              <div>
                {/* Back to detail button */}
                <button
                  type="button"
                  onClick={() => setModalStep('detail')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#005BB5',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginBottom: '14px',
                    padding: 0,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    arrow_back
                  </span>
                  <span>Kembali ke Detail Persyaratan</span>
                </button>

                <div
                  style={{
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    marginBottom: '16px',
                    fontSize: '0.8rem',
                    color: '#166534',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#16A34A', flexShrink: 0 }}>
                    how_to_reg
                  </span>
                  <span>
                    <strong>Formulir Pendaftaran.</strong> Lengkapi data di bawah ini untuk memulai pengajuan visa Anda.
                  </span>
                </div>

                <form onSubmit={handleKirimPendaftaran}>
                  {/* Error Banner */}
                  {formError && (
                    <div
                      style={{
                        backgroundColor: '#FEF2F2',
                        border: '1px solid #FECACA',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        marginBottom: '16px',
                        fontSize: '0.82rem',
                        color: '#B91C1C',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        error
                      </span>
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Success Banner */}
                  {formSuccessMessage && (
                    <div
                      style={{
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        marginBottom: '16px',
                        fontSize: '0.82rem',
                        color: '#1E40AF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#2563EB' }}>
                          check_circle
                        </span>
                        <span>{formSuccessMessage}</span>
                      </div>
                    </div>
                  )}

                  {/* SECTION 1: DATA PENGAJU */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#005BB5' }}>
                        badge
                      </span>
                      <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                        1. Data Pengaju (Sesuai KTP)
                      </h4>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Nama Lengkap */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                          Nama Lengkap <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formNama}
                          onChange={(e) => setFormNama(e.target.value)}
                          placeholder="Contoh: Budi Santoso"
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.88rem',
                            outline: 'none',
                            boxSizing: 'border-box',
                            backgroundColor: '#F8FAFC',
                            color: '#0F172A',
                          }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = '#005BB5')}
                          onBlur={(e) => (e.currentTarget.style.borderColor = '#CBD5E1')}
                        />
                      </div>

                      {/* Baris 2 Kolom: No WA & No Paspor */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {/* No. WA */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                            No. WhatsApp <span style={{ color: '#EF4444' }}>*</span>
                          </label>
                          <input
                            type="tel"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            required
                            value={formNoWa}
                            onKeyDown={(e) => {
                              // Izinkan tombol kontrol: Backspace, Delete, Tab, Escape, Enter, panah navigasi, dan kombinasi Ctrl/Cmd (Copy/Paste/Select All)
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
                              // Jika tombol yang ditekan bukan angka 0-9, cegah input langsung
                              if (!/^[0-9]$/.test(e.key)) {
                                e.preventDefault();
                              }
                            }}
                            onInput={(e: React.FormEvent<HTMLInputElement>) => {
                              // Pastikan nilai di elemen input langsung dibersihkan dari non-digit
                              e.currentTarget.value = e.currentTarget.value.replace(/\D/g, '');
                            }}
                            onPaste={(e) => {
                              e.preventDefault();
                              const pasteData = e.clipboardData.getData('text') || '';
                              const cleanDigits = pasteData.replace(/\D/g, '').slice(0, 16);
                              setFormNoWa(cleanDigits);
                            }}
                            onChange={(e) => setFormNoWa(e.target.value.replace(/\D/g, ''))}
                            placeholder="08123456789"
                            maxLength={16}
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              borderRadius: '10px',
                              border: '1px solid #CBD5E1',
                              fontSize: '0.88rem',
                              outline: 'none',
                              boxSizing: 'border-box',
                              backgroundColor: '#F8FAFC',
                              color: '#0F172A',
                            }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = '#005BB5')}
                            onBlur={(e) => (e.currentTarget.style.borderColor = '#CBD5E1')}
                          />
                        </div>

                        {/* No. Paspor */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                            No. Paspor <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>(opsional)</span>
                          </label>
                          <input
                            type="text"
                            value={formNoPaspor}
                            onChange={(e) => setFormNoPaspor(e.target.value.toUpperCase())}
                            placeholder="E6811789 atau -"
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              borderRadius: '10px',
                              border: '1px solid #CBD5E1',
                              fontSize: '0.88rem',
                              outline: 'none',
                              boxSizing: 'border-box',
                              backgroundColor: '#F8FAFC',
                              color: '#0F172A',
                              textTransform: 'uppercase',
                            }}
                          />
                        </div>
                      </div>

                      {/* Baris 2 Kolom: Wilayah Konsulat & Domisili KTP */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {/* Wilayah Konsulat Pengajuan (Konsjen) */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                            Wilayah Konsulat <span style={{ color: '#EF4444' }}>*</span>
                          </label>
                          <select
                            value={formKonsjen}
                            onChange={(e) => setFormKonsjen(e.target.value as KonsjenKota)}
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              borderRadius: '10px',
                              border: '1.5px solid #005BB5',
                              fontSize: '0.86rem',
                              fontWeight: 600,
                              outline: 'none',
                              boxSizing: 'border-box',
                              backgroundColor: '#EFF6FF',
                              color: '#005BB5',
                              cursor: 'pointer',
                            }}
                          >
                            <option value="Jakarta">Jakarta (Kedutaan / JVAC Kuningan)</option>
                            <option value="Surabaya">Surabaya (Konsulat Jenderal Surabaya)</option>
                            <option value="Denpasar">Denpasar (Konsulat Jenderal Bali)</option>
                            <option value="Medan">Medan (Konsulat Jenderal Medan)</option>
                            <option value="Makassar">Makassar (Kantor Konsuler Makassar)</option>
                          </select>
                        </div>

                        {/* Domisili KTP */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                            Domisili KTP <span style={{ color: '#EF4444' }}>*</span>
                          </label>
                          <select
                            value={formDomisili}
                            onChange={(e) => handleSelectDomisili(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              borderRadius: '10px',
                              border: '1px solid #CBD5E1',
                              fontSize: '0.86rem',
                              outline: 'none',
                              boxSizing: 'border-box',
                              backgroundColor: '#F8FAFC',
                              color: '#0F172A',
                              cursor: 'pointer',
                            }}
                          >
                            <optgroup label="Konsulat Jakarta & Sekitarnya">
                              <option value="DKI Jakarta">DKI Jakarta / Jakarta</option>
                              <option value="Jawa Barat">Jawa Barat</option>
                              <option value="Banten">Banten</option>
                              <option value="Jawa Tengah">Jawa Tengah</option>
                              <option value="DI Yogyakarta">DI Yogyakarta</option>
                              <option value="Lampung">Lampung</option>
                              <option value="Sumatera Selatan">Sumatera Selatan</option>
                            </optgroup>
                            <optgroup label="Konsulat Surabaya & Sekitarnya">
                              <option value="Surabaya">Surabaya</option>
                              <option value="Jawa Timur">Jawa Timur</option>
                              <option value="Kalimantan Timur">Kalimantan Timur</option>
                              <option value="Kalimantan Barat / Selatan">Kalimantan Barat / Selatan</option>
                            </optgroup>
                            <optgroup label="Konsulat Denpasar & Sekitarnya">
                              <option value="Denpasar">Denpasar</option>
                              <option value="Bali">Bali</option>
                              <option value="Nusa Tenggara Barat (NTB)">Nusa Tenggara Barat (NTB)</option>
                              <option value="Nusa Tenggara Timur (NTT)">Nusa Tenggara Timur (NTT)</option>
                            </optgroup>
                            <optgroup label="Konsulat Medan & Sekitarnya">
                              <option value="Medan">Medan</option>
                              <option value="Sumatera Utara">Sumatera Utara</option>
                              <option value="Sumatera Barat">Sumatera Barat</option>
                              <option value="Riau / Kepulauan Riau">Riau / Kepulauan Riau</option>
                              <option value="Aceh">Aceh</option>
                            </optgroup>
                            <optgroup label="Kantor Konsuler Makassar & Sekitarnya">
                              <option value="Makassar">Makassar</option>
                              <option value="Sulawesi Selatan">Sulawesi Selatan</option>
                              <option value="Sulawesi Utara / Tengah">Sulawesi Utara / Tengah</option>
                              <option value="Maluku / Papua">Maluku / Papua</option>
                            </optgroup>
                            <optgroup label="Lainnya">
                              <option value="Lainnya">Lainnya / Tulis Sendiri...</option>
                            </optgroup>
                          </select>
                        </div>
                      </div>

                      {/* Notifikasi PIC & Status Antrean Konsulat Terpilih */}
                      <div
                        style={{
                          backgroundColor: '#F0F9FF',
                          border: '1px solid #BAE6FD',
                          borderRadius: '10px',
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.78rem',
                          color: '#0369A1',
                          flexWrap: 'wrap',
                          gap: '6px',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#0284C7' }}>
                            domain
                          </span>
                          <span>Konsulat Pengajuan: <strong>{formKonsjen}</strong></span>
                        </span>
                        <span style={{ fontWeight: 600, color: '#0369A1' }}>
                          PIC Konsuler: <strong>{formKonsjen === 'Surabaya' ? 'Nanami Kay' : formKonsjen === 'Denpasar' ? 'Yulia' : formKonsjen === 'Makassar' ? 'Ulla' : 'Rizky Muhammad'}</strong>
                        </span>
                      </div>

                      {formDomisili === 'Lainnya' && (
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                            Tuliskan Domisili KTP Anda
                          </label>
                          <input
                            type="text"
                            value={formDomisiliLainnya}
                            onChange={(e) => setFormDomisiliLainnya(e.target.value)}
                            placeholder="Tuliskan Provinsi / Domisili KTP Anda"
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              borderRadius: '10px',
                              border: '1.5px solid #005BB5',
                              fontSize: '0.88rem',
                              outline: 'none',
                              boxSizing: 'border-box',
                              backgroundColor: '#FFFFFF',
                              color: '#0F172A',
                            }}
                          />
                        </div>
                      )}

                      {/* Kode Referral Mitra */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>
                            Kode Referral Mitra
                          </label>
                          <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                            Default: <strong>MAPAHTRIP</strong>
                          </span>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            border: '1px solid #CBD5E1',
                            backgroundColor: '#F8FAFC',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#005BB5' }}>
                            loyalty
                          </span>
                          <input
                            type="text"
                            value={customerRefCode}
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase();
                              setCustomerRefCode(val);
                              localStorage.setItem('mapahtrip_customer_ref', val);
                            }}
                            placeholder="MAPAHTRIP atau Kode Mitra Anda"
                            style={{
                              border: 'none',
                              outline: 'none',
                              width: '100%',
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              color: '#0F172A',
                              backgroundColor: 'transparent',
                              textTransform: 'uppercase',
                            }}
                          />
                          {customerRefCode && (
                            <button
                              type="button"
                              onClick={() => {
                                setCustomerRefCode('');
                                localStorage.removeItem('mapahtrip_customer_ref');
                              }}
                              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0 }}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: PILIHAN PAKET */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#005BB5' }}>
                        workspace_premium
                      </span>
                      <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                        2. Pilihan Paket Layanan
                      </h4>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {[
                        { id: 'Reguler' as const, title: 'Reguler', desc: 'Standar QC & Submit' },
                        { id: 'Premium' as const, title: 'Premium', desc: 'Prioritas & Cepat' },
                        { id: 'TAC' as const, title: 'TAC', desc: 'Pendampingan All-in' },
                      ].map((pkg) => {
                        const isSelected = formPaket === pkg.id;
                        return (
                          <div
                            key={pkg.id}
                            onClick={() => setFormPaket(pkg.id)}
                            style={{
                              padding: '10px 8px',
                              borderRadius: '12px',
                              border: isSelected ? '2px solid #005BB5' : '1px solid #E2E8F0',
                              backgroundColor: isSelected ? '#EFF6FF' : '#F8FAFC',
                              cursor: 'pointer',
                              textAlign: 'center',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isSelected ? '#005BB5' : '#1E293B' }}>
                              {pkg.title}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: isSelected ? '#1E40AF' : '#64748B', marginTop: '2px' }}>
                              {pkg.desc}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* SECTION 3: KELENGKAPAN BERKAS DENGAN FILE UPLOAD */}
                  <div style={{ marginBottom: '22px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#005BB5' }}>
                          upload_file
                        </span>
                        <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                          3. Kelengkapan Berkas (Unggah Dokumen)
                        </h4>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Pilih / Upload File:</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[
                        { key: 'formVisa' as const, label: 'Form Visa', sub: 'Formulir permohonan visa', accept: '.pdf,image/*' },
                        { key: 'ktp' as const, label: 'KTP', sub: 'Fotokopi / scan e-KTP', accept: 'image/*,.pdf' },
                        { key: 'ektln' as const, label: 'E-KTLN', sub: 'Elektronik Kartu Tenaga Kerja Luar Negeri', accept: '.pdf,image/*' },
                        { key: 'coe' as const, label: 'COE', sub: 'Certificate of Eligibility', accept: '.pdf,image/*' },
                        { key: 'foto' as const, label: 'Foto', sub: 'Pasfoto 4.5 × 3.5 cm latar putih', accept: 'image/*' },
                      ].map((item) => {
                        const file = formFiles[item.key];
                        return (
                          <div
                            key={item.key}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 14px',
                              borderRadius: '12px',
                              border: file ? '1.5px solid #86EFAC' : '1px solid #E2E8F0',
                              backgroundColor: file ? '#F0FDF4' : '#F8FAFC',
                              transition: 'all 0.15s ease',
                              gap: '10px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                              <span
                                className="material-symbols-outlined"
                                style={{
                                  fontSize: '20px',
                                  color: file ? '#16A34A' : '#005BB5',
                                  flexShrink: 0,
                                }}
                              >
                                {file ? 'check_circle' : 'attach_file'}
                              </span>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <strong style={{ fontSize: '0.85rem', color: '#0F172A' }}>
                                    {item.label}
                                  </strong>
                                  <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                                    &bull; {item.sub}
                                  </span>
                                </div>
                                {file && (
                                  <div style={{ fontSize: '0.72rem', color: '#15803D', fontWeight: 600, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    📄 {file.name} ({(file.size / 1024).toFixed(0)} KB)
                                  </div>
                                )}
                              </div>
                            </div>

                            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input
                                type="file"
                                id={`upload-${item.key}`}
                                accept={item.accept}
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                  const f = e.target.files?.[0] || null;
                                  setFormFiles((prev) => ({ ...prev, [item.key]: f }));
                                }}
                              />
                              {file ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span
                                    style={{
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      color: '#15803D',
                                      backgroundColor: '#DCFCE7',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                    }}
                                  >
                                    Terunggah
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setFormFiles((prev) => ({ ...prev, [item.key]: null }))}
                                    style={{
                                      border: 'none',
                                      background: '#FEE2E2',
                                      color: '#EF4444',
                                      borderRadius: '50%',
                                      width: '24px',
                                      height: '24px',
                                      cursor: 'pointer',
                                      fontSize: '12px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                    title="Hapus file"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <label
                                  htmlFor={`upload-${item.key}`}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    backgroundColor: '#FFFFFF',
                                    border: '1.5px solid #005BB5',
                                    fontSize: '0.76rem',
                                    fontWeight: 700,
                                    color: '#005BB5',
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                                    upload
                                  </span>
                                  <span>Pilih File</span>
                                </label>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '8px' }}>
                      💡 Unggah berkas yang sudah Anda miliki (Format: PDF, JPG, PNG). Dokumen yang belum siap dapat dibimbing penyusunannya oleh tim MapahTrip.
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button
                      type="submit"
                      disabled={formSubmitting}
                      style={{
                        flex: 1,
                        backgroundColor: '#005BB5',
                        color: '#FFFFFF',
                        padding: '14px 20px',
                        borderRadius: '9999px',
                        fontWeight: 700,
                        fontSize: '0.92rem',
                        border: 'none',
                        cursor: formSubmitting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 14px rgba(0, 91, 181, 0.28)',
                        transition: 'all 0.15s ease',
                        opacity: formSubmitting ? 0.7 : 1,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#00478F')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#005BB5')}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        send
                      </span>
                      <span>
                        {formSubmitting ? 'Mengunggah Berkas & Mendaftar...' : 'Kirim Formulir Pendaftaran'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalStep('detail')}
                      style={{
                        padding: '14px 20px',
                        borderRadius: '9999px',
                        border: '1px solid #E2E8F0',
                        backgroundColor: '#FFFFFF',
                        color: '#64748B',
                        fontWeight: 600,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                      }}
                    >
                      Kembali
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 3: SUKSES PENDAFTARAN KE SPREADSHEET */}
            {modalStep === 'success' && (
              <div style={{ textAlign: 'center', padding: '10px 4px' }}>
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: '#DCFCE7',
                    color: '#16A34A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>
                    task_alt
                  </span>
                </div>

                <h3 className="font-serif" style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                  Pendaftaran Berhasil Masuk!
                </h3>
                <p style={{ fontSize: '0.86rem', color: '#64748B', lineHeight: 1.5, maxWidth: '460px', margin: '0 auto 18px' }}>
                  Data pendaftaran Anda telah berhasil dicatat dan masuk ke antrean database &amp; lembar kerja spreadsheet.
                </p>

                {/* Ringkasan Data yang Masuk */}
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '16px',
                    textAlign: 'left',
                    marginBottom: '20px',
                  }}
                >
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#005BB5' }}>
                      description
                    </span>
                    Ringkasan Data Pengajuan:
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.82rem' }}>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>Nama Pemohon:</span>
                      <strong style={{ color: '#0F172A' }}>{formNama}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>No. WhatsApp:</span>
                      <strong style={{ color: '#0F172A' }}>{formNoWa}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>Konsulat Tujuan:</span>
                      <strong style={{ color: '#005BB5' }}>{formKonsjen}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>Domisili KTP:</span>
                      <strong style={{ color: '#0F172A' }}>{formDomisili === 'Lainnya' ? formDomisiliLainnya : formDomisili}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>Paket Layanan:</span>
                      <strong style={{ color: '#0F172A' }}>{formPaket}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>Kode Referral:</span>
                      <strong style={{ color: '#16A34A' }}>{hasRefChoice === 'yes' && customerRefCode.trim() ? customerRefCode.trim().toUpperCase() : 'MAPAHTRIP'}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedVisaModal(null)}
                    style={{
                      flex: 1,
                      backgroundColor: '#005BB5',
                      color: '#FFFFFF',
                      padding: '13px 20px',
                      borderRadius: '9999px',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(0, 91, 181, 0.28)',
                    }}
                  >
                    Selesai &amp; Tutup
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Email Contact Modal */}
      {showEmailModal && (
        <div
          onClick={() => setShowEmailModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
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
              maxWidth: '420px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E2E8F0',
              textAlign: 'center',
            }}
          >
            {/* Header Icon */}
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                backgroundColor: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                border: '1px solid #DBEAFE',
              }}
            >
              <GmailBrandIcon size={32} />
            </div>

            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
              Hubungi via Email
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '0 0 20px', lineHeight: 1.5 }}>
              Kirimkan pertanyaan atau dokumen pengajuan visa Jepang Anda ke email resmi MapahTrip:
            </p>

            {/* Email Address Display Box with Copy Button */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1.5px dashed #CBD5E1',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                marginBottom: '18px',
              }}
            >
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1E293B', wordBreak: 'break-all' }}>
                mapahtripid@gmail.com
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText('mapahtripid@gmail.com');
                  setCopiedEmail(true);
                  setTimeout(() => setCopiedEmail(false), 2500);
                }}
                style={{
                  backgroundColor: copiedEmail ? '#10B981' : '#2B68E0',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
              >
                {copiedEmail ? '✓ Tersalin!' : 'Salin Email'}
              </button>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a
                href="mailto:mapahtripid@gmail.com"
                style={{
                  backgroundColor: '#2B68E0',
                  color: '#FFFFFF',
                  padding: '11px 16px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(43, 104, 224, 0.25)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  mail
                </span>
                <span>Buka Aplikasi Email Bawaan</span>
              </a>

              <a
                href="https://mail.google.com/mail/?extsrc=mailto&url=mailto%3Amapahtripid%40gmail.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#0F172A',
                  padding: '11px 16px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
              >
                <GmailBrandIcon size={16} />
                <span>Buka di Web Gmail</span>
              </a>

              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                style={{
                  marginTop: '4px',
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '6px',
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KENAPA MAPAHTRIP.ID SECTION (Side-by-side using .kenapa-split-grid) */}
      <section
        id="kenapa-kami"
        style={{
          backgroundColor: '#F8FAFC',
          borderTop: '1px solid #E2E8F0',
          borderBottom: '1px solid #E2E8F0',
          padding: '80px 24px',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div className="kenapa-split-grid">

            {/* LEFT COLUMN: Text Headline & Manifesto */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              {/* Pill Badge */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 18px',
                  borderRadius: '9999px',
                  background: '#e0f2fe',
                  border: '1px solid #bae6fd',
                  color: '#0284c7',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: '18px',
                }}
              >
                <span>KENAPA MAPAHTRIP.ID?</span>
              </div>

              {/* Big Impact Headline (Ekstra Besar & Tetap Sebaris) */}
              <h2
                style={{
                  fontFamily: "'Source Serif 4', Georgia, serif",
                  fontSize: 'clamp(2.45rem, 3.8vw, 3.6rem)',
                  fontWeight: 900,
                  color: '#0B1220',
                  lineHeight: 1.12,
                  letterSpacing: '-0.03em',
                  margin: '0 0 8px',
                  textAlign: 'left',
                }}
              >
                Kami bukan travel umum
              </h2>
              <div
                style={{
                  fontSize: 'clamp(2.45rem, 3.8vw, 3.6rem)',
                  fontWeight: 900,
                  color: '#0284c7',
                  lineHeight: 1.12,
                  letterSpacing: '-0.03em',
                  margin: '0 0 24px',
                  textAlign: 'left',
                }}
              >
                Kami hidup di aturan JVAC
              </div>

              {/* Description */}
              <p
                style={{
                  fontSize: '1rem',
                  color: '#64748B',
                  lineHeight: 1.7,
                  maxWidth: '480px',
                  margin: 0,
                  textAlign: 'left',
                }}
              >
                Sama seperti GoVisa fokus Schengen/US, kami fokus 1 negara. Jadi update terbaru, template dokumen, bahkan gaya itinerary yang disukai kedutaan — kami hafal.
              </p>

              {/* Trust Metric Stats (Pilihan 1: Pengisi Ruang Bawah Agar Sejajar) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '14px',
                  width: '100%',
                  maxWidth: '480px',
                  marginTop: '28px',
                }}
              >
                {/* Stat 1: Kelulusan */}
                <div
                  className="kenapa-stat-card"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    border: '1.5px solid #E2E8F0',
                    padding: '18px 20px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#005bb5';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Source Serif 4', Georgia, serif",
                      fontSize: '1.85rem',
                      fontWeight: 900,
                      color: '#005bb5',
                      lineHeight: 1.1,
                      marginBottom: '4px',
                    }}
                  >
                    99.2%
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0B1220', marginBottom: '2px' }}>
                    Tingkat Kelulusan
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', lineHeight: 1.45 }}>
                    Asistensi dokumen presisi sesuai standar Kedutaan
                  </div>
                </div>

                {/* Stat 2: Spesialisasi */}
                <div
                  className="kenapa-stat-card"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    border: '1.5px solid #E2E8F0',
                    padding: '18px 20px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#0284c7';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div
                    style={{
                      fontSize: '1.85rem',
                      fontWeight: 900,
                      color: '#0284c7',
                      lineHeight: 1.1,
                      marginBottom: '4px',
                    }}
                  >
                    100%
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0B1220', marginBottom: '2px' }}>
                    Fokus Jepang
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', lineHeight: 1.45 }}>
                    Hafal luar-dalam aturan resmi JVAC &amp; e-Visa
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: 4 Feature Cards (Berjejer Tepat Di Samping Kanan Tulisan) */}
            <div className="kenapa-cards-wrapper">
              {/* Mobile Horizontal Swipe Indicator Hint */}
              <div
                className="kenapa-mobile-swipe-hint"
                style={{
                  display: 'none',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '12px',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  background: '#e0f2fe',
                  color: '#0284c7',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  width: 'fit-content',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  swipe
                </span>
                <span>Geser ke samping (01 - 04)</span>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  arrow_forward
                </span>
              </div>

              <div className="kenapa-cards-grid">
                {[
                  {
                    num: '01',
                    title: 'Mudah & Praktis',
                    desc: 'Dari cek dokumen, isi form berbahasa Jepang, sampai submit JVAC - semua kami handle.',
                  },
                  {
                    num: '02',
                    title: 'Dokumen Lengkap Tanpa Ribet',
                    desc: 'Template surat kerja, itinerary harian detail, serta dummy tiket pesawat & hotel resmi standar JVAC (tanpa harus beli tiket asli).',
                  },
                  {
                    num: '03',
                    title: 'Spesialis Visa Jepang ONLY',
                    desc: 'Bukan campur negara lain. Kami hafal update aturan JVAC 2024-2025, e-Visa & waiver terbaru.',
                  },
                  {
                    num: '04',
                    title: 'Privasi & Paspor Aman',
                    desc: 'Data dienkripsi, paspor disimpan di brankas. Tracking status real-time via WhatsApp.',
                  },
                ].map((card, idx) => (
                  <div
                    key={idx}
                    className="kenapa-feature-card"
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '20px',
                      border: '1.5px solid #E2E8F0',
                      padding: '24px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)',
                      transition: 'all 0.25s ease',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.borderColor = '#0284c7';
                      e.currentTarget.style.boxShadow = '0 12px 28px -6px rgba(2, 132, 199, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = '#E2E8F0';
                      e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.03)';
                    }}
                  >
                    <div>
                      {/* Top Row: Title on Left, Number 01-04 on Right (disamping kanan tulisan kartu) */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '12px',
                          marginBottom: '10px',
                        }}
                      >
                        <h3
                          style={{
                            fontSize: '1.05rem',
                            fontWeight: 800,
                            color: '#0B1220',
                            lineHeight: 1.35,
                            margin: 0,
                          }}
                        >
                          {card.title}
                        </h3>

                        {/* Number Badge (Di samping kanan judul) */}
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '38px',
                            height: '32px',
                            padding: '0 8px',
                            borderRadius: '10px',
                            backgroundColor: '#EFF6FF',
                            color: '#005bb5',
                            fontWeight: 800,
                            fontSize: '0.88rem',
                            letterSpacing: '-0.02em',
                            border: '1px solid #BFDBFE',
                            flexShrink: 0,
                          }}
                        >
                          {card.num}
                        </div>
                      </div>

                      {/* Card Description */}
                      <p
                        style={{
                          fontSize: '0.88rem',
                          color: '#64748B',
                          lineHeight: 1.55,
                          margin: '0 0 16px',
                        }}
                      >
                        {card.desc}
                      </p>
                    </div>

                    {/* Bottom Feature Pill Badge (Option 1: Sleek Micro-Pill) */}
                    <div
                      style={{
                        paddingTop: '14px',
                        borderTop: '1px solid #F1F5F9',
                      }}
                    >
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '7px',
                          padding: '5px 12px 5px 6px',
                          borderRadius: '9999px',
                          backgroundColor: '#F0F9FF',
                          border: '1px solid #BAE6FD',
                          color: '#0369A1',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            backgroundColor: '#0284C7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: '12px', fontWeight: 900, color: '#FFFFFF' }}
                          >
                            check
                          </span>
                        </div>
                        <span>Sudah Termasuk Layanan</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. ALUR PENGAJUAN / CARA KERJA SECTION */}
      <section
        id="alur"
        style={{
          padding: '80px 24px',
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '44px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: '9999px',
              background: '#e0f2fe',
              border: '1px solid #bae6fd',
              color: '#0284c7',
              fontSize: '0.78rem',
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            <span>ALUR PENGAJUAN</span>
            <span>•</span>
            <span>CARA KERJA</span>
          </div>
          <h2
            className="font-serif"
            style={{
              fontSize: 'clamp(1.9rem, 3.4vw, 2.6rem)',
              fontWeight: 800,
              color: '#0B1220',
              letterSpacing: '-0.025em',
              margin: '0 0 12px',
            }}
          >
            4 Langkah, Visa Jepang Jadi.
          </h2>
          <p
            style={{
              fontSize: '1rem',
              color: '#64748B',
              maxWidth: '580px',
              margin: '0 auto',
              lineHeight: 1.55,
            }}
          >
            Tanpa antri, tanpa bingung form Jepang. Semua via WhatsApp &amp; online.
          </p>

          {/* Mobile Horizontal Swipe Indicator Hint */}
          <div
            className="alur-mobile-swipe-hint"
            style={{
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginTop: '12px',
              padding: '4px 12px',
              borderRadius: '9999px',
              background: '#e0f2fe',
              color: '#0284c7',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              swipe
            </span>
            <span>Geser ke samping (Langkah 01 - 04)</span>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              arrow_forward
            </span>
          </div>
        </div>

        {/* 4 Steps Container (Garis Alur di Tengah Antar Kotak) */}
        <div className="alur-scroll-wrapper">
          <div className="alur-steps-inner">
            {/* Horizontal Guide Line through center of cards */}
            <div
              className="alur-steps-line"
              style={{
                position: 'absolute',
                top: '50%',
                left: '60px',
                right: '60px',
                height: '2px',
                borderTop: '2px dashed #CBD5E1',
                transform: 'translateY(-50%)',
                zIndex: 0,
              }}
            />

            {/* 4 Steps Grid */}
            <div className="alur-steps-grid">
              {[
                {
                  step: '01',
                  title: 'Konsultasi Gratis',
                  desc: 'Chat WA, ceritakan tujuan & paspor kamu (e-paspor/reguler). Kami rekomendasikan jenis visa terbaik.',
                  icon: 'chat',
                },
                {
                  step: '02',
                  title: 'Kumpulkan & Cek Dokumen',
                  desc: 'Kirim foto dokumen. Expert kami cek, revisi itinerary, dan buatkan dummy jika perlu.',
                  icon: 'fact_check',
                },
                {
                  step: '03',
                  title: 'Kami Urus ke JVAC / Kedutaan',
                  desc: 'Tim MAPAHTRIP datang ke JVAC Jakarta, submit biometrik, bayar PNBP. Kamu nggak perlu cuti.',
                  icon: 'account_balance',
                },
                {
                  step: '04',
                  title: 'Visa Jadi, Paspor Dikirim',
                  desc: 'Approval rata-rata 5-7 hari kerja. Paspor kami kirim balik dengan kurir aman + e-visa PDF.',
                  icon: 'verified',
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="step-card"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '20px',
                    border: '1.5px solid #E2E8F0',
                    padding: '28px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.borderColor = '#005bb5';
                    e.currentTarget.style.boxShadow = '0 12px 28px -6px rgba(0, 91, 181, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.03)';
                  }}
                >
                  {/* Connector Arrow to next card (Di tengah tinggi kotak) */}
                  {idx < 3 && (
                    <div
                      style={{
                        position: 'absolute',
                        right: '-16px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 10,
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                        border: '1.5px solid #005bb5',
                        color: '#005bb5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0, 91, 181, 0.15)',
                        pointerEvents: 'none',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', fontWeight: 800 }}>
                        arrow_forward
                      </span>
                    </div>
                  )}

                  {/* Top Row: Step Number & Icon */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                      <span
                        style={{
                          fontFamily: "'Source Serif 4', Georgia, serif",
                          fontSize: '1.75rem',
                          fontWeight: 900,
                          color: '#005bb5',
                          lineHeight: 1,
                        }}
                      >
                        {item.step}
                      </span>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          backgroundColor: '#EFF6FF',
                          color: '#005bb5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                          {item.icon}
                        </span>
                      </div>
                    </div>

                    <h3
                      style={{
                        fontSize: '1.1rem',
                        fontWeight: 800,
                        color: '#0B1220',
                        lineHeight: 1.35,
                        margin: '0 0 10px',
                      }}
                    >
                      {item.title}
                    </h3>

                    <p
                      style={{
                        fontSize: '0.88rem',
                        color: '#64748B',
                        lineHeight: 1.55,
                        margin: 0,
                      }}
                    >
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ VISA JEPANG SECTION (2-Column Grid) */}
      <section
        id="faq"
        style={{
          borderTop: '1px solid #E2E8F0',
          padding: '70px 24px',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Section Header */}
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div
              className="faq-header-pill"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 16px',
                borderRadius: '9999px',
                background: isDarkMode ? 'rgba(2, 132, 199, 0.18)' : '#e0f2fe',
                border: isDarkMode ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid #bae6fd',
                color: isDarkMode ? '#38BDF8' : '#0284c7',
                fontSize: '0.78rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: '12px',
              }}
            >
              <span style={{ color: isDarkMode ? '#38BDF8' : '#0284c7' }}>TANYA JAWAB</span>
              <span style={{ color: isDarkMode ? 'rgba(56, 189, 248, 0.5)' : '#bae6fd' }}>•</span>
              <span style={{ color: isDarkMode ? '#38BDF8' : '#0284c7' }}>FAQ VISA JEPANG</span>
            </div>
            <h2
              className="font-serif"
              style={{
                fontSize: 'clamp(1.75rem, 3vw, 2.3rem)',
                fontWeight: 800,
                color: '#0B1220',
                letterSpacing: '-0.025em',
                margin: '0 0 10px',
              }}
            >
              Pertanyaan yang Sering Diajukan
            </h2>
            <p
              style={{
                fontSize: '0.94rem',
                color: '#64748B',
                maxWidth: '560px',
                margin: '0 auto',
                lineHeight: 1.5,
              }}
            >
              Semua hal penting seputar pembuatan visa Jepang bersama MAPAHTRIP, transparan tanpa biaya tersembunyi.
            </p>
          </div>

          {/* 2-Column Responsive Layout */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '16px',
              alignItems: 'start',
            }}
          >
            {/* Kolom Kiri: Pertanyaan 01, 02, 03 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                {
                  idx: 0,
                  q: 'Apa bedanya e-Paspor dan paspor biasa untuk visa Jepang?',
                  a: 'e-Paspor bisa daftar Visa Waiver (bebas visa 15 hari, registrasi online 2-3 hari) atau e-Visa. Paspor biasa wajib apply stiker visa single/multiple via JVAC. Kami cekkan gratis paspor kamu termasuk yang mana.',
                },
                {
                  idx: 1,
                  q: 'Berapa lama proses visa Jepang di MAPAHTRIP?',
                  a: 'Setelah dokumen lengkap, proses di JVAC 5-7 hari kerja (single), 7-10 hari (multiple/bisnis). Plus 1-2 hari pengecekan dokumen oleh kami sebelum submit.',
                },
                {
                  idx: 2,
                  q: 'Apakah harus datang ke JVAC?',
                  a: 'Tidak perlu. Kecuali diminta interview khusus (sangat jarang). Kami yang wakili submit & pengambilan. Untuk yang di luar Jakarta, kirim paspor via kurir aman.',
                },
              ].map((item) => {
                const isOpen = openFaqIndex === item.idx;
                return (
                  <div
                    key={item.idx}
                    className="faq-accordion-item"
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '16px',
                      border: isOpen ? '1.5px solid #005bb5' : '1px solid #E2E8F0',
                      boxShadow: isOpen
                        ? '0 10px 25px -5px rgba(0, 91, 181, 0.1), 0 4px 10px rgba(0, 0, 0, 0.03)'
                        : '0 2px 6px rgba(0, 0, 0, 0.02)',
                      transition: 'all 0.2s ease',
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : item.idx)}
                      style={{
                        width: '100%',
                        padding: '18px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '14px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span
                          className={isOpen ? "faq-num-badge is-open" : "faq-num-badge"}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            backgroundColor: isOpen ? '#005bb5' : (isDarkMode ? '#1E293B' : '#F1F5F9'),
                            color: isOpen ? '#FFFFFF' : (isDarkMode ? '#94A3B8' : '#64748B'),
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'all 0.2s ease',
                          }}
                        >
                          0{item.idx + 1}
                        </span>
                        <span
                          className="faq-question-text"
                          style={{
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            color: isOpen ? (isDarkMode ? '#60A5FA' : '#005bb5') : (isDarkMode ? '#F8FAFC' : '#0F172A'),
                            lineHeight: 1.4,
                          }}
                        >
                          {item.q}
                        </span>
                      </div>

                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: '22px',
                          color: isOpen ? '#005bb5' : '#94A3B8',
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.25s ease, color 0.2s ease',
                          flexShrink: 0,
                        }}
                      >
                        expand_more
                      </span>
                    </button>

                    {isOpen && (
                      <div
                        className="faq-answer-content"
                        style={{
                          padding: '0 20px 18px 60px',
                          color: isDarkMode ? '#CBD5E1' : '#475569',
                          fontSize: '0.9rem',
                          lineHeight: 1.6,
                          borderTop: isDarkMode ? '1px dashed #1E293B' : '1px dashed #F1F5F9',
                          paddingTop: '12px',
                        }}
                      >
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Kolom Kanan: Pertanyaan 04, 05 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                {
                  idx: 3,
                  q: 'Apakah MAPAHTRIP menyediakan reservasi tiket pesawat & hotel sementara?',
                  a: 'Ya, 100% sudah termasuk. Kami siapkan bukti reservasi tiket pesawat PP Jepang dan pemesanan hotel sementara + itinerary harian dalam bahasa Inggris/Jepang sesuai standar Kedutaan. Anda tidak perlu beli tiket pesawat lunas sebelum visa disetujui.',
                },
                {
                  idx: 4,
                  q: 'Bagaimana jika visa ditolak?',
                  a: 'Approval rate kami 99% karena screening ketat di awal. Jika ditolak karena kesalahan kami, biaya jasa kami refund. Biaya JVAC/Kedutaan mengikuti aturan kedutaan.',
                },
              ].map((item) => {
                const isOpen = openFaqIndex === item.idx;
                return (
                  <div
                    key={item.idx}
                    className="faq-accordion-item"
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '16px',
                      border: isOpen ? '1.5px solid #005bb5' : '1px solid #E2E8F0',
                      boxShadow: isOpen
                        ? '0 10px 25px -5px rgba(0, 91, 181, 0.1), 0 4px 10px rgba(0, 0, 0, 0.03)'
                        : '0 2px 6px rgba(0, 0, 0, 0.02)',
                      transition: 'all 0.2s ease',
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : item.idx)}
                      style={{
                        width: '100%',
                        padding: '18px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '14px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span
                          className={isOpen ? "faq-num-badge is-open" : "faq-num-badge"}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            backgroundColor: isOpen ? '#005bb5' : (isDarkMode ? '#1E293B' : '#F1F5F9'),
                            color: isOpen ? '#FFFFFF' : (isDarkMode ? '#94A3B8' : '#64748B'),
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'all 0.2s ease',
                          }}
                        >
                          0{item.idx + 1}
                        </span>
                        <span
                          className="faq-question-text"
                          style={{
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            color: isOpen ? (isDarkMode ? '#60A5FA' : '#005bb5') : (isDarkMode ? '#F8FAFC' : '#0F172A'),
                            lineHeight: 1.4,
                          }}
                        >
                          {item.q}
                        </span>
                      </div>

                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: '22px',
                          color: isOpen ? '#005bb5' : '#94A3B8',
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.25s ease, color 0.2s ease',
                          flexShrink: 0,
                        }}
                      >
                        expand_more
                      </span>
                    </button>

                    {isOpen && (
                      <div
                        className="faq-answer-content"
                        style={{
                          padding: '0 20px 18px 60px',
                          color: isDarkMode ? '#CBD5E1' : '#475569',
                          fontSize: '0.9rem',
                          lineHeight: 1.6,
                          borderTop: isDarkMode ? '1px dashed #1E293B' : '1px dashed #F1F5F9',
                          paddingTop: '12px',
                        }}
                      >
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ======================================================== */}
          {/* ======================================================== */}
          {/* ======================================================== */}
          {/* ======================================================== */}
          {/* ======================================================== */}
          {/* UNIFIED LUXURY DUO CARDS: KONSULTASI VISA & PROGRAM MITRA */}
          {/* Harmonious Jewel-Toned Bento Grid (No Black-vs-White Clash) */}
          {/* ======================================================== */}
          <div className="duo-bento-grid">
            {/* Card 1: Konsultasi Visa Jepang (Clean Pearl White Theme) */}
            <div
              style={{
                background: isDarkMode
                  ? 'linear-gradient(145deg, #1E293B 0%, #0F172A 100%)'
                  : 'linear-gradient(145deg, #FFFFFF 0%, #F8FAFC 100%)',
                borderRadius: '24px',
                border: isDarkMode ? '1px solid #334155' : '1px solid #E2E8F0',
                padding: '36px 32px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: isDarkMode
                  ? '0 20px 40px -15px rgba(0, 0, 0, 0.4)'
                  : '0 20px 40px -15px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.02)',
                position: 'relative',
                overflow: 'hidden',
                minHeight: '270px',
              }}
            >
              {/* Ambient Background Glow */}
              <div
                style={{
                  position: 'absolute',
                  top: '-50px',
                  right: '-50px',
                  width: '180px',
                  height: '180px',
                  borderRadius: '50%',
                  background: isDarkMode
                    ? 'radial-gradient(circle, rgba(0, 91, 181, 0.15) 0%, rgba(0, 91, 181, 0) 70%)'
                    : 'radial-gradient(circle, rgba(0, 91, 181, 0.06) 0%, rgba(0, 91, 181, 0) 70%)',
                  pointerEvents: 'none',
                }}
              />

              <div>
                {/* Top Tag */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: isDarkMode ? '#60A5FA' : '#005BB5',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '14px',
                    backgroundColor: isDarkMode ? 'rgba(0, 91, 181, 0.2)' : 'rgba(0, 91, 181, 0.06)',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    border: isDarkMode ? '1px solid rgba(0, 91, 181, 0.35)' : '1px solid rgba(0, 91, 181, 0.16)',
                  }}
                >
                  <span>🇯🇵 KONSULTASI RESMI JVAC</span>
                </div>

                {/* Title */}
                <h3
                  style={{
                    color: isDarkMode ? '#FFFFFF' : '#0F172A',
                    fontSize: '1.45rem',
                    fontWeight: 800,
                    margin: '0 0 10px',
                    lineHeight: 1.3,
                    letterSpacing: '-0.02em',
                  }}
                >
                  Siap Berangkat ke Jepang?<br />
                  <span style={{ color: isDarkMode ? '#93C5FD' : '#005BB5' }}>Chat Japan Expert Sekarang.</span>
                </h3>

                {/* Subtitle */}
                <p
                  style={{
                    margin: '0 0 16px',
                    fontSize: '0.88rem',
                    color: isDarkMode ? '#94A3B8' : '#475569',
                    lineHeight: 1.5,
                  }}
                >
                  Konsultasikan jadwal proses, verifikasi dokumen, dan slot kuota VFS JVAC langsung dengan konsultan kami.
                </p>

                {/* Live Indicator */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: isDarkMode ? '#CBD5E1' : '#334155', fontSize: '0.82rem', marginBottom: '24px' }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#10B981',
                      boxShadow: '0 0 8px #10B981',
                      display: 'inline-block',
                    }}
                  />
                  <span>Online sekarang • Respon cepat &lt; 5 menit</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <a
                  href="https://wa.me/6281401735648?text=Halo%20MapahTrip,%20saya%20siap%20berangkat%20ke%20Jepang%20dan%20ingin%20konsultasi%20visa"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    backgroundColor: '#25D366',
                    color: '#FFFFFF',
                    padding: '12px 22px',
                    borderRadius: '9999px',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(37, 211, 102, 0.3)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.backgroundColor = '#20BA5A';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.backgroundColor = '#25D366';
                  }}
                >
                  <WhatsAppBrandIcon size={20} inverted={true} />
                  <span>WhatsApp Expert</span>
                </a>

                <a
                  href="#jenis-visa"
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF',
                    color: isDarkMode ? '#FFFFFF' : '#334155',
                    border: isDarkMode ? '1px solid #475569' : '1px solid #CBD5E1',
                    padding: '12px 20px',
                    borderRadius: '9999px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255, 255, 255, 0.15)' : '#F1F5F9';
                    e.currentTarget.style.borderColor = isDarkMode ? '#64748B' : '#94A3B8';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF';
                    e.currentTarget.style.borderColor = isDarkMode ? '#475569' : '#CBD5E1';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <span>Lihat Jenis Visa</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    arrow_forward
                  </span>
                </a>
              </div>
            </div>

            {/* Card 2: Program Mitra & Affiliate (Clean Pearl White Theme) */}
            <div
              style={{
                background: isDarkMode
                  ? 'linear-gradient(145deg, #1E293B 0%, #0F172A 100%)'
                  : 'linear-gradient(145deg, #FFFFFF 0%, #F8FAFC 100%)',
                borderRadius: '24px',
                border: isDarkMode ? '1px solid #334155' : '1px solid #E2E8F0',
                padding: '36px 32px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: isDarkMode
                  ? '0 20px 40px -15px rgba(0, 0, 0, 0.4)'
                  : '0 20px 40px -15px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.02)',
                position: 'relative',
                overflow: 'hidden',
                minHeight: '270px',
              }}
            >
              {/* Ambient Background Glow */}
              <div
                style={{
                  position: 'absolute',
                  top: '-50px',
                  right: '-50px',
                  width: '180px',
                  height: '180px',
                  borderRadius: '50%',
                  background: isDarkMode
                    ? 'radial-gradient(circle, rgba(0, 91, 181, 0.15) 0%, rgba(0, 91, 181, 0) 70%)'
                    : 'radial-gradient(circle, rgba(0, 91, 181, 0.06) 0%, rgba(0, 91, 181, 0) 70%)',
                  pointerEvents: 'none',
                }}
              />

              <div>
                {/* Top Tag */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: isDarkMode ? '#60A5FA' : '#005BB5',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '14px',
                    backgroundColor: isDarkMode ? 'rgba(0, 91, 181, 0.2)' : 'rgba(0, 91, 181, 0.06)',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    border: isDarkMode ? '1px solid rgba(0, 91, 181, 0.35)' : '1px solid rgba(0, 91, 181, 0.16)',
                  }}
                >
                  <span>🤝 PROGRAM MITRA &amp; AFFILIATE 2026</span>
                </div>

                {/* Title */}
                <h3
                  style={{
                    color: isDarkMode ? '#FFFFFF' : '#0F172A',
                    fontSize: '1.45rem',
                    fontWeight: 800,
                    margin: '0 0 10px',
                    lineHeight: 1.3,
                    letterSpacing: '-0.02em',
                  }}
                >
                  Punya Rekan atau Siswa LPK?<br />
                  <span style={{ color: isDarkMode ? '#93C5FD' : '#005BB5' }}>Dapatkan Komisi Resmi via Transfer.</span>
                </h3>

                {/* Subtitle */}
                <p
                  style={{
                    margin: '0 0 16px',
                    fontSize: '0.88rem',
                    color: isDarkMode ? '#94A3B8' : '#475569',
                    lineHeight: 1.5,
                  }}
                >
                  Daftar akun mitra &amp; miliki kode referral resmi. Dapatkan komisi transfer <strong style={{ color: isDarkMode ? '#60A5FA' : '#005BB5', whiteSpace: 'nowrap' }}>Rp 100.000</strong> per visa terbit.
                </p>

                {/* Live Indicator */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: isDarkMode ? '#CBD5E1' : '#334155', fontSize: '0.82rem', marginBottom: '24px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#10B981' }}>
                    paid
                  </span>
                  <span>Pendaftaran gratis 100% • Pencairan berkala transparan</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <a
                  href="#affiliate"
                  style={{
                    backgroundColor: '#005BB5',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '12px 22px',
                    borderRadius: '9999px',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    textDecoration: 'none',
                    boxShadow: '0 4px 14px rgba(0, 91, 181, 0.3)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#004A94';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#005BB5';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <span>Daftar Akun Mitra</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    arrow_forward
                  </span>
                </a>

                <a
                  href="#affiliate"
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF',
                    color: isDarkMode ? '#FFFFFF' : '#334155',
                    border: isDarkMode ? '1px solid #475569' : '1px solid #CBD5E1',
                    padding: '12px 20px',
                    borderRadius: '9999px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    textDecoration: 'none',
                    boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255, 255, 255, 0.15)' : '#F1F5F9';
                    e.currentTarget.style.borderColor = isDarkMode ? '#64748B' : '#94A3B8';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF';
                    e.currentTarget.style.borderColor = isDarkMode ? '#475569' : '#CBD5E1';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <span>Masuk Akun</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Footer Utama Sebelumnya (Dark) */}
      <footer style={{ backgroundColor: '#0B1220', color: '#ffffff', padding: '60px 24px 30px' }}>
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '20px',
            flexWrap: 'wrap',
          }}
        >
          {/* Column 1: Brand & WhatsApp */}
          <div style={{ flex: '1 1 360px', maxWidth: '480px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <img
                src={logoPutih}
                alt="Mapahtrip.id"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '6px',
                  objectFit: 'contain',
                }}
              />
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '4px 11px 4px 8px',
                  borderRadius: '9999px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.9)',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
                }}
              >
                {/* Japan Flag Round Accent */}
                <div
                  style={{
                    width: '15px',
                    height: '15px',
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 0.5px 1.5px rgba(0, 0, 0, 0.06)',
                  }}
                >
                  <div
                    style={{
                      width: '6.5px',
                      height: '6.5px',
                      borderRadius: '50%',
                      backgroundColor: '#BC002D',
                    }}
                  />
                </div>
                <span
                  style={{
                    color: '#0F172A',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Japan Visa Only
                </span>
              </div>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.6, marginTop: '8px', maxWidth: '440px' }}>
              Layanan jasa pengurusan visa Jepang independen. Fokus 100% visa Jepang: tourist, waiver, e-Visa, bisnis, keluarga, pelajar, transit, dependent.
            </p>
            <div style={{ marginTop: '14px' }}>
              <a
                href="https://wa.me/6281401735648?text=Halo%20MapahTrip,%20saya%20ingin%20konsultasi%20pengajuan%20Visa%20Jepang"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#ffffff',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.88rem',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#ffffff')}
              >
                <WhatsAppBrandIcon size={18} />
                <strong style={{ color: 'inherit' }}>0814-0173-5648</strong>
              </a>
            </div>
          </div>

          {/* Right Columns Group: Jenis Visa, Sosial Media, Bantuan, Kantor & JVAC */}
          <div className="footer-columns-group" style={{ display: 'flex', gap: '36px', flexWrap: 'wrap', flex: '0 1 auto' }}>
            {/* Column 2: Jenis Visa */}
            <div style={{ flex: '0 0 auto', minWidth: '140px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '14px', color: '#ffffff' }}>Jenis Visa</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                {VISA_OPTIONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveVisaTab('all');
                      setTimeout(() => {
                        const el = document.getElementById('visa-' + item.id) || document.getElementById('jenis-visa');
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          el.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
                          el.style.transform = 'scale(1.025)';
                          el.style.boxShadow = '0 0 0 3px #005bb5, 0 12px 28px rgba(0, 91, 181, 0.25)';
                          setTimeout(() => {
                            el.style.transform = 'scale(1)';
                            el.style.boxShadow = '';
                          }, 1400);
                        }
                      }, 50);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      margin: 0,
                      color: '#cbd5e1',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      transition: 'color 0.15s ease',
                      outline: 'none',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#cbd5e1')}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Column 3: Sosial Media */}
            <div style={{ flex: '0 0 auto', minWidth: '150px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '14px', color: '#ffffff' }}>Sosial Media</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                <a
                  href="https://www.instagram.com/mapahtrip.id/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#ffffff',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#ffffff')}
                >
                  <InstagramBrandIcon size={18} />
                  <strong style={{ color: 'inherit' }}>@mapahtrip.id</strong>
                </a>
                <a
                  href="https://www.tiktok.com/@mapahtrip.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#ffffff',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#ffffff')}
                >
                  <TikTokBrandIcon size={18} />
                  <strong style={{ color: 'inherit' }}>@mapahtrip.id</strong>
                </a>
                <a
                  href="https://mail.google.com/mail/?extsrc=mailto&url=mailto%3Amapahtripid%40gmail.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                      window.location.href = 'mailto:mapahtripid@gmail.com';
                      e.preventDefault();
                    }
                  }}
                  style={{
                    color: '#ffffff',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#ffffff')}
                  title="Kirim Email via Gmail (mapahtripid@gmail.com)"
                >
                  <GmailBrandIcon size={18} />
                  <strong style={{ color: 'inherit' }}>mapahtripid@gmail.com</strong>
                </a>
              </div>
            </div>

            {/* Column 4: Bantuan */}
            <div style={{ flex: '0 0 auto', minWidth: '120px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '14px', color: '#ffffff' }}>Bantuan</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                <a
                  href="#kenapa-kami"
                  style={{ color: '#cbd5e1', textDecoration: 'none', transition: 'color 0.15s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#cbd5e1')}
                >
                  Kenapa Kami
                </a>
                <a
                  href="#alur"
                  style={{ color: '#cbd5e1', textDecoration: 'none', transition: 'color 0.15s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#cbd5e1')}
                >
                  Cara Kerja
                </a>
                <a
                  href="#faq"
                  style={{ color: '#cbd5e1', textDecoration: 'none', transition: 'color 0.15s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#cbd5e1')}
                >
                  FAQ
                </a>
                <span
                  style={{ color: '#cbd5e1', cursor: 'pointer', transition: 'color 0.15s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#cbd5e1')}
                  onClick={() =>
                    alert(
                      'Syarat & Ketentuan Layanan Mapahtrip.id:\n\n1. Kami membantu penyiapan dokumen, verifikasi, dan asistensi penyerahan berkas visa ke JVAC/Kedutaan.\n2. Keputusan persetujuan visa sepenuhnya merupakan wewenang pihak Kedutaan Besar Jepang.\n3. Pembayaran jasa dilakukan secara transparan sesuai tarif resmi yang tertera.'
                    )
                  }
                >
                  Syarat &amp; Ketentuan
                </span>
                <span
                  style={{ color: '#cbd5e1', cursor: 'pointer', transition: 'color 0.15s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#cbd5e1')}
                  onClick={() =>
                    alert(
                      'Kebijakan Privasi Mapahtrip.id:\n\n1. Seluruh data identitas pemohon dan dokumen paspor dienkripsi dan dijaga kerahasiaannya dengan standar keamanan tinggi.\n2. Dokumen hanya digunakan untuk keperluan aplikasi pengajuan visa resmi ke perwakilan diplomatik Jepang.\n3. Data paspor tidak pernah dibagikan kepada pihak ketiga di luar keperluan pengajuan visa.'
                    )
                  }
                >
                  Kebijakan Privasi
                </span>
              </div>
            </div>

            {/* Column 5: Kantor & JVAC */}
            <div style={{ flex: '0 0 auto', minWidth: '190px', maxWidth: '240px' }}>
              <a
                href="https://maps.app.goo.gl/7vuLeQV1Km1PzGu68"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  marginBottom: '14px',
                  color: '#ffffff',
                  textDecoration: 'none',
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#ffffff')}
                title="Buka Lokasi di Google Maps"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="10" r="2.5" fill="#0ea5e9" />
                  <path d="M12 12.5v3.5" />
                </svg>
                <span>Kantor Mapahtrip &amp; JVAC</span>
              </a>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                <a
                  href="https://maps.app.goo.gl/7vuLeQV1Km1PzGu68"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                  title="Lihat di Google Maps"
                >
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Lokasi kantor</span>
                    <span style={{ fontSize: '0.7rem', color: '#38bdf8' }}>↗</span>
                  </div>
                  <div style={{ color: '#ffffff', fontWeight: 600 }}>Satrio Tower, Jakarta Selatan</div>
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Kuningan, Jakarta Selatan, DKI Jakarta 12950</div>
                </a>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '3px' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="#0ea5e9" style={{ flexShrink: 0 }}>
                      <path d="M21 3L3 10.53v.98l6.84 2.65L12.48 21h.99L21 3z" />
                    </svg>
                    <span>Patokan lokasi</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Dekat Japan Visa Application Center (JVAC), Kuningan.</div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '3px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 15 14" />
                    </svg>
                    <span>Jam operasional</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Senin–Sabtu</div>
                  <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.85rem' }}>09.00–18.00 WIB</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            maxWidth: '1240px',
            margin: '40px auto 0',
            paddingTop: '20px',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px',
          }}
        >
          <div style={{ maxWidth: '720px', fontSize: '0.74rem', color: '#64748B', lineHeight: 1.6, textAlign: 'left' }}>
            Disclaimer: Mapahtrip.id adalah penyedia jasa bantuan pengurusan visa Jepang independen dan tidak berafiliasi dengan Kedutaan Besar Jepang, JVAC, atau VFS Global. Keputusan pemberian visa sepenuhnya kewenangan Kedutaan Besar Jepang. Kami membantu menyiapkan dokumen sesuai standar terbaru 2025.
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748B', whiteSpace: 'nowrap', textAlign: 'right' }}>
            &copy; 2025 Mapahtrip.id &bull; Made for Japan Lovers ⛩️ 🌸
          </div>
        </div>
      </footer>
      {/* Floating Customer Service Avatar with WhatsApp Badge (Pojok Kanan Bawah) */}
      <a
        href="https://wa.me/6281401735648?text=Halo%20MapahTrip,%20saya%20ingin%20konsultasi%20pengajuan%20Visa%20Jepang"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 90,
          width: '54px',
          height: '54px',
          borderRadius: '50%',
          backgroundColor: '#005bb5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          textDecoration: 'none',
          boxShadow: '0 0 0 6px rgba(0, 91, 181, 0.15), 0 8px 24px rgba(0, 91, 181, 0.45)',
          transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1) translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 0 0 8px rgba(0, 91, 181, 0.2), 0 12px 28px rgba(0, 91, 181, 0.55)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1) translateY(0)';
          e.currentTarget.style.boxShadow = '0 0 0 6px rgba(0, 91, 181, 0.15), 0 8px 24px rgba(0, 91, 181, 0.45)';
        }}
        title="Konsultasi CS via WhatsApp"
        aria-label="Konsultasi CS via WhatsApp"
      >
        {/* CS Headset Agent Icon */}
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: '28px',
            color: '#ffffff',
            lineHeight: 1,
          }}
        >
          support_agent
        </span>

        {/* WhatsApp Green Badge at bottom right */}
        <span
          style={{
            position: 'absolute',
            bottom: '-1px',
            right: '-1px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: '#25D366',
            border: '2px solid #ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 5px rgba(0,0,0,0.25)',
          }}
        >
          <WhatsAppBrandIcon size={11} />
        </span>
      </a>


    </div>
  );
};
