import logoHitam from '../assets/mapahtrip_logo_hitam.png';
import logoPutih from '../assets/mapahtrip_logo_putih.png';
import buildingPhoto from '../assets/MapahTrip.jpg';
import {
  handleImageFallback,
  getLogoHitamFallbacks,
  getLogoPutihFallbacks,
  getBuildingPhotoFallbacks,
} from '../utils/imageFallbacks';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Pengajuan, KonsjenKota, StaffMaster } from '../types';
import { searchPasporInDB, createPengajuanInDB, findAffiliateByCode, updatePengajuanDocumentInDB } from '../lib/supabase';
import { kirimPesanWA } from '../whatsapp';
import { REAL_AFFILIATE_LEADERBOARD } from '../data/affiliateLeaderboardData';
import { REAL_SPREADSHEET_AFFILIATES } from '../data/spreadsheetData';
import { mockStaff } from '../data/mockData';
import { optimizeDocumentUpload } from '../utils/documentOptimizer';
import { getApplicantAccessKey, verifyApplicantAccessKey } from '../utils/accessKey';
import { determineDefaultStaffPic } from '../utils/staffAssignment';
import { STORY_HIGHLIGHTS } from '../data/storyHighlights';
import { StoryHighlightsBar } from './StoryHighlightsBar';
import { InstagramStoryViewer } from './InstagramStoryViewer';
import { getVisaPrice, getVisaPricingList, type VisaPricingItem } from '../utils/visaPricing';

// Helper format Rupiah & Penentuan Nominal Biaya Visa
const formatRupiah = (val: number): string => 'Rp\u00A0' + (val || 0).toLocaleString('id-ID');

const getNominalVisa = (visaTitle?: string, paket?: string): number => {
  return getVisaPrice(visaTitle, paket);
};

// Rekening Bank Resmi Pembayaran Customer
const PAYMENT_BANKS = {
  BTN: {
    name: 'Bank Tabungan Negara (BTN)',
    short: 'BTN',
    noRek: '1190-0150-0015-870',
    cleanRek: '119001500015870',
    atasNama: 'Tokyo Asia Connection',
    badge: 'Rekening Resmi Pembayaran',
    color: '#00529C',
  },
};

interface CustomerHomeProps {
  pengajuanList: Pengajuan[];
  onAddNewPengajuan?: (pengajuan: Pengajuan) => void;
  onUpdatePengajuan?: (pengajuan: Pengajuan) => void;
}

// Helper validasi kode referral mitra resmi
export const validateReferralCode = (
  rawCode: string,
  pengajuanList: Pengajuan[] = []
): { isValid: boolean; partnerName: string | null; code: string } => {
  const clean = (rawCode || '').trim().toUpperCase();
  if (!clean) {
    return { isValid: false, partnerName: null, code: '' };
  }

  // 1. Akun Demo LPK / MPC
  if (clean === 'MPH425MI' || clean === 'MPC') {
    return { isValid: true, partnerName: 'Mitra Demo LPK (MPC)', code: 'MPH425MI' };
  }

  // Helper pembersih nama mitra agar tidak pernah menghasilkan tanda strip '-' atau kosong
  const sanitizePartnerName = (nama?: string | null, lembaga?: string | null): string => {
    const cleanNama = (nama || '').trim();
    const cleanLembaga = (lembaga || '').trim();
    if (cleanNama && cleanNama !== '-') return cleanNama;
    if (cleanLembaga && cleanLembaga !== '-') return cleanLembaga;
    return 'Mitra Terdaftar';
  };

  // 2. Cek Real Spreadsheet Affiliates (Database Master Mitra Mapahtrip)
  const foundSpreadsheet = REAL_SPREADSHEET_AFFILIATES.find(
    (m) => (m.affiliateCode || '').toUpperCase().trim() === clean
  );
  if (foundSpreadsheet) {
    return {
      isValid: true,
      partnerName: sanitizePartnerName(foundSpreadsheet.nama, foundSpreadsheet.lembaga),
      code: foundSpreadsheet.affiliateCode,
    };
  }

  // 3. Cek Real Affiliate Leaderboard (Spreadsheet Resmi)
  const foundLeaderboard = REAL_AFFILIATE_LEADERBOARD.find(
    (m) => m.code.toUpperCase().trim() === clean
  );
  if (foundLeaderboard) {
    return {
      isValid: true,
      partnerName: sanitizePartnerName(foundLeaderboard.nama),
      code: foundLeaderboard.code,
    };
  }

  // 4. Cek localStorage mapahtrip_all_affiliates
  try {
    const saved = localStorage.getItem('mapahtrip_all_affiliates');
    if (saved) {
      const all: any[] = JSON.parse(saved);
      const found = all.find(
        (u) => (u.affiliateCode || '').toUpperCase().trim() === clean
      );
      if (found) {
        return {
          isValid: true,
          partnerName: sanitizePartnerName(found.nama, found.lembaga),
          code: found.affiliateCode,
        };
      }
    }
  } catch {}

  // 5. Cek current logged in affiliate
  try {
    const curr = localStorage.getItem('mapahtrip_current_affiliate');
    if (curr) {
      const parsed = JSON.parse(curr);
      if ((parsed.affiliateCode || '').toUpperCase().trim() === clean) {
        return {
          isValid: true,
          partnerName: sanitizePartnerName(parsed.nama, parsed.lembaga),
          code: parsed.affiliateCode,
        };
      }
    }
  } catch {}

  // 6. Cek kode dari pengajuanList
  const foundInPengajuan = pengajuanList.find(
    (p) => (p.affiliateCode || '').toUpperCase().trim() === clean
  );
  if (foundInPengajuan && foundInPengajuan.affiliateCode) {
    return {
      isValid: true,
      partnerName: `Mitra ${foundInPengajuan.affiliateCode}`,
      code: foundInPengajuan.affiliateCode,
    };
  }

  return { isValid: false, partnerName: null, code: clean };
};

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
    pricePill: 'Mulai Rp 200rb',
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
  // Card 4: Tokutei Ginou (SSW 1) (Light)
  {
    id: 'tokutei-ginou',
    title: 'Tokutei Ginou (SSW 1)',
    subtitle: 'Specified Skilled Worker',
    theme: 'light' as const,
    topRightBadge: 'Kerja Formal',
    icon: 'engineering',
    pricePill: 'Mulai Rp 1,65jt',
    durationPill: '1 - 5 Tahun',
    desc: 'Pekerja berketerampilan spesifik: pengolahan makanan, perhotelan, perawat/kaigo, manufaktur & pertanian.',
    tags: ['CoE Kerja', 'Sertifikat SSW', 'JFT / JLPT'],
    category: 'kerja' as const,
    syaratLengkap: [
      'Paspor Asli berlaku min. 12 bulan & Pasfoto 4.5 x 3.5 cm latar putih',
      'Asli Certificate of Eligibility (CoE) Tokutei Ginou dari Imigrasi Jepang',
      'Kontrak Kerja Resmi (Koyou Keiyakusho) dengan perusahaan sponsor di Jepang',
      'Sertifikat Kelulusan Ujian Keterampilan SSW & Ujian Bahasa Jepang (JFT-Basic / JLPT N4)',
      'Surat E-KTLN dari BP2MI & Hasil MCU (Medical Check Up) resmi',
      'Fotokopi KTP, Kartu Keluarga, dan Buku Tabungan',
    ],
  },
  // Card 5: Visa Magang (Kenshuusei) (Dark)
  {
    id: 'visa-magang',
    title: 'Visa Magang (Kenshuusei)',
    subtitle: 'Trainee / Pemagangan Jepang',
    theme: 'dark' as const,
    topRightBadge: 'Pemagangan',
    icon: 'handshake',
    pricePill: 'Mulai Rp 1,65jt',
    durationPill: '1 - 3 Tahun',
    desc: 'Program pemagangan industri manufaktur, teknik, dan agrikultur Jepang via LPK / SO resmi berizin.',
    tags: ['CoE Magang', 'Izin LPK / SO', 'Kontrak'],
    category: 'kerja' as const,
    syaratLengkap: [
      'Paspor Asli pemohon berlaku min. 12 bulan & Pasfoto 4.5 x 3.5 cm latar putih',
      'Asli Certificate of Eligibility (CoE) Technical Intern Training',
      'Surat Perjanjian Pemagangan antara Sending Organization (SO/LPK) dan Accepting Organization Jepang',
      'Rencana Pelatihan Praktik Kerja & Surat Izin Operasional SO yang aktif',
      'E-KTLN BP2MI aktif & Rekening Bank',
      'Fotokopi Identitas KTP & KK',
    ],
  },
  // Card 6: Tekutei Katsudou (Light)
  {
    id: 'tekutei-katsudou',
    title: 'Tekutei Katsudou',
    subtitle: 'Designated Activities',
    theme: 'light' as const,
    topRightBadge: 'Aktivitas Khusus',
    icon: 'badge',
    pricePill: 'Mulai Rp 1,65jt',
    durationPill: '6 Bulan - 1 Tahun',
    desc: 'Aktivitas khusus magang lanjutan, transisi visa kerja, atau magang mahasiswa universitas di Jepang.',
    tags: ['CoE Khusus', 'Surat Rekomendasi'],
    category: 'kerja' as const,
    syaratLengkap: [
      'Paspor Asli pemohon min. 12 bulan & Pasfoto 4.5 x 3.5 cm',
      'Asli Certificate of Eligibility (CoE) kategori Tokutei Katsudou',
      'Surat Keterangan Aktivitas Khusus dari institusi penerima di Jepang',
      'Bukti Penjaminan Finansial & Tempat Tinggal selama di Jepang',
      'Dokumen pendukung kualifikasi akademik / sertifikat pelatihan relevan',
    ],
  },
  // Card 7: Kunjungan Keluarga / Teman (Light)
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

// Helper format milestone Visa Approved (kelipatan 50: 200+, 250+, 300+, ... >= 1000 jadi 1K+, 1.1K+)
export const formatApprovedMilestone = (count: number): string => {
  if (count >= 1000) {
    const thousands = Math.floor(count / 1000);
    const remainder = Math.floor((count % 1000) / 100);
    return remainder > 0 ? `${thousands}.${remainder}K+` : `${thousands}K+`;
  }
  const step = 50;
  const floorStep = Math.max(step, Math.floor(count / step) * step);
  return `${floorStep}+`;
};

export const CustomerHome: React.FC<CustomerHomeProps> = ({ pengajuanList, onAddNewPengajuan, onUpdatePengajuan }) => {
  // Hitung otomatis milestone Visa Approved dari data riil pengajuan (kelipatan 50, saat ini 250+, nanti 301 jadi 300+, 1000 jadi 1k+)
  const approvedMilestoneDisplay = useMemo(() => {
    const selesaiCount = pengajuanList && pengajuanList.length > 0
      ? pengajuanList.filter((p) => p.status === 'Selesai' || (p.status as any) === 'Approved').length
      : 268;
    return formatApprovedMilestone(selesaiCount > 0 ? selesaiCount : 268);
  }, [pengajuanList]);

  // Dynamic Visa List synced directly with Master Tarif (Supabase Cloud & localStorage)
  const [currentPricingList, setCurrentPricingList] = useState<VisaPricingItem[]>(() => getVisaPricingList());

  useEffect(() => {
    const handlePricesUpdated = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setCurrentPricingList(e.detail);
      } else {
        setCurrentPricingList(getVisaPricingList());
      }
    };
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mapahtrip_visa_prices' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCurrentPricingList(parsed);
          }
        } catch {
          setCurrentPricingList(getVisaPricingList());
        }
      }
    };

    window.addEventListener('mapahtrip:visa-prices-updated', handlePricesUpdated);
    window.addEventListener('storage', handleStorageChange);
    setCurrentPricingList(getVisaPricingList());

    return () => {
      window.removeEventListener('mapahtrip:visa-prices-updated', handlePricesUpdated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const dynamicVisaOptions = useMemo(() => {
    if (!currentPricingList || currentPricingList.length === 0) {
      return VISA_OPTIONS;
    }

    const formatShort = (val: number) => {
      if (!val) return 'Rp 0';
      if (val >= 1000000) {
        const jt = (val / 1000000).toFixed(1).replace('.0', '');
        return `Rp ${jt}jt`;
      }
      return `Rp ${Math.round(val / 1000)}rb`;
    };

    return currentPricingList.map((item, index) => {
      const base = VISA_OPTIONS.find(
        (v) =>
          v.id === item.id ||
          v.title.toLowerCase().trim() === item.title.toLowerCase().trim()
      );

      const defaultIcon =
        item.category === 'turis'
          ? 'flight'
          : item.category === 'kerja'
          ? 'engineering'
          : item.category === 'magang'
          ? 'handshake'
          : item.category === 'studi'
          ? 'school'
          : item.category === 'transit'
          ? 'schedule'
          : item.category === 'keluarga'
          ? 'groups'
          : item.category === 'medis'
          ? 'local_hospital'
          : item.category === 'khusus'
          ? 'badge'
          : 'business_center';

      return {
        id: item.id,
        title: item.title,
        subtitle: item.subtitle || base?.subtitle || item.keterangan || 'Layanan Visa Jepang',
        theme: base?.theme || (index % 2 === 0 ? ('dark' as const) : ('light' as const)),
        popularBadge: item.popularBadge || base?.popularBadge,
        topRightBadge: item.topRightBadge || base?.topRightBadge || (item.isCustom ? 'Layanan Baru' : 'Resmi'),
        icon: base?.icon || defaultIcon,
        pricePill: `Mulai ${formatShort(item.regulerPrice)}`,
        durationPill: item.durationPill || base?.durationPill || '15-90 Hari',
        desc: item.desc || item.keterangan || base?.desc || 'Layanan pengurusan dan pendampingan visa Jepang resmi.',
        tags: base?.tags || ['Paspor', 'Dokumen Pendukung'],
        category: item.category,
        syaratLengkap: base?.syaratLengkap || [
          'Paspor Asli berlaku min. 6 bulan + Paspor Lama (jika ada)',
          'Pasfoto 4.5 x 3.5 cm latar putih terbaru',
          'Formulir Aplikasi Visa Jepang',
          'Fotokopi KTP & Kartu Keluarga (KK)',
          'Dokumen pendukung sesuai ketentuan konsulat',
        ],
      };
    });
  }, [currentPricingList]);

  const [trackingPaspor, setTrackingPaspor] = useState('');
  const [trackingResult, setTrackingResult] = useState<Pengajuan | null | 'NOT_FOUND'>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedVisaModal, setSelectedVisaModal] = useState<any | null>(null);
  const [activeStoryHighlightId, setActiveStoryHighlightId] = useState<string | null>(null);

  // Kunci Rahasia Verifikasi Akses Dokumen (Mencegah Tebak IDOR MT-0280 -> MT-0281)
  const [currentAccessKey, setCurrentAccessKey] = useState<string>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      let k = urlParams.get('key') || urlParams.get('token') || '';
      if (!k && window.location.hash.includes('?')) {
        const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
        k = hashParams.get('key') || hashParams.get('token') || '';
      }
      return k.trim().toUpperCase();
    } catch {
      return '';
    }
  });

  const isAccessAuthorized = useMemo(() => {
    if (!trackingResult || trackingResult === 'NOT_FOUND') return false;
    return verifyApplicantAccessKey(trackingResult, currentAccessKey);
  }, [trackingResult, currentAccessKey]);

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

  // Berkas pendaftaran diinput mandiri oleh staf/owner di portal internal (rahasia bisnis)
  const formFiles = {
    formVisa: null,
    pasporFisik: null,
    ktp: null,
    ektln: null,
    coe: null,
    foto: null,
  };
  const formUploadedDocs: Record<string, { name: string; base64: string; sizeKB?: number }> = {};

  const [formSubmitting, setFormSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [modalStep, setModalStep] = useState<'detail' | 'form' | 'success'>('detail');

  // State Permohonan Baru
  const [newSubmittedApplicant, setNewSubmittedApplicant] = useState<Pengajuan | null>(null);
  const [copiedRekening, setCopiedRekening] = useState<string | null>(null);

  const handleCopyRekening = (noRek: string, label: string) => {
    try {
      navigator.clipboard.writeText(noRek.replace(/[^0-9]/g, ''));
      setCopiedRekening(label);
      setTimeout(() => setCopiedRekening(null), 2500);
    } catch {}
  };

  const getWhatsAppPaymentConfirmationUrl = (
    bankKey: 'BTN' = 'BTN',
    nominal: number,
    applicant: Pengajuan | null
  ) => {
    const bank = PAYMENT_BANKS[bankKey] || PAYMENT_BANKS.BTN;
    const idPend = applicant?.noPengajuan || 'MT-XXXX';
    const nama = applicant?.namaPemohon || formNama.trim();
    const visaTitle = applicant?.program || selectedVisaModal?.title || 'Visa Jepang';
    const paket = applicant?.paket || formPaket;
    const nominalStr = formatRupiah(nominal);

    const text =
`Halo Admin MapahTrip, saya ingin konfirmasi pembayaran visa:

📋 *Detail Pembayaran:*
• *ID Pengajuan:* *${idPend}*
• *Nama Pemohon:* ${nama}
• *Program Visa:* ${visaTitle} (${paket})
• *Nominal Transfer:* *${nominalStr}*
• *Bank Tujuan:* ${bank.name}
• *No. Rekening Tujuan:* ${bank.noRek} a.n. ${bank.atasNama}
• *Status Bukti:* Bukti struk transfer terlampir di WhatsApp ini

Mohon untuk segera diverifikasi dan diproses berkas permohonan visa saya. Terima kasih! 🙏🇯🇵`;

    return `https://wa.me/6281214104332?text=${encodeURIComponent(text)}`;
  };

  const getWhatsAppConfirmShipmentUrl = (applicant: Pengajuan | null) => {
    const idPend = applicant?.noPengajuan || 'MT-XXXX';
    const nama = applicant?.namaPemohon || formNama.trim();
    const visaTitle = applicant?.program || selectedVisaModal?.title || 'Visa Jepang';
    const paket = applicant?.paket || formPaket;
    const konsjen = applicant?.konsjen || formKonsjen;

    const text =
`Halo Admin MapahTrip, saya sudah mendaftar pengajuan visa secara online:

📋 *Data Pendaftaran:*
• *ID Pengajuan:* *${idPend}*
• *Nama Pemohon:* ${nama}
• *Program Visa:* ${visaTitle} (${paket})
• *Konsulat Tujuan:* Konsjen ${konsjen}

Saya ingin konfirmasi alamat kantor operasional tujuan pengiriman berkas fisik & paspor asli via kurir ekspedisi. Mohon panduan alamat lengkap & nama penerimanya ya min. Terima kasih! 🙏⛩️🌸`;

    return `https://wa.me/6281214104332?text=${encodeURIComponent(text)}`;
  };

  const handleDoneAndTrack = (submitted?: Pengajuan | null) => {
    const code = submitted?.noPengajuan || submitted?.noPaspor || '';
    setSelectedVisaModal(null);
    if (code) {
      setTrackingPaspor(code);
      if (submitted) {
        setTrackingResult(submitted);
        setCurrentAccessKey(getApplicantAccessKey(submitted));
      }
    }
    setTimeout(() => {
      const el = document.getElementById('tracking');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 120);
  };

  const handleOpenVisaModal = (item: any) => {
    setSelectedVisaModal(item);
    setModalStep('detail');
    setFormSuccessMessage(null);
    setFormError(null);
    setNewSubmittedApplicant(null);
    setCopiedRekening(null);
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

  // Status Validasi Kode Referral (Khusus jika memilih "Ya, Punya Kode")
  const referralValidation = useMemo(() => {
    if (hasRefChoice !== 'yes') {
      return { isValid: true, partnerName: null, code: '' };
    }
    return validateReferralCode(customerRefCode, pengajuanList);
  }, [hasRefChoice, customerRefCode, pengajuanList]);

  const [activeVisaTab, setActiveVisaTab] = useState<'all' | 'turis' | 'kerja' | 'bisnis' | 'keluarga'>('all');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);



  const getCustomerStages = (item: Pengajuan) => {
    let stageOverrides: Record<string, any> = {};
    try {
      const saved = localStorage.getItem('mapahtrip_stage_overrides');
      if (saved) stageOverrides = JSON.parse(saved);
    } catch {}

    const ov = stageOverrides[item.id] || {};
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

  // State Unggah Berkas Mandiri dari Halaman Lacak Customer
  const [uploadingDocKey, setUploadingDocKey] = useState<string | null>(null);
  const [uploadDocSuccessNotice, setUploadDocSuccessNotice] = useState<string | null>(null);
  const [previewCustomerDoc, setPreviewCustomerDoc] = useState<{ title: string; url: string; isPdf?: boolean } | null>(null);
  const [copiedTrackingLink, setCopiedTrackingLink] = useState(false);

  const executeTracking = async (targetQuery: string) => {
    if (!targetQuery || !targetQuery.trim()) return;
    setIsSearching(true);
    const cleanQuery = targetQuery.trim().toLowerCase();
    const numOnly = cleanQuery.replace(/[^0-9]/g, '');

    // 1. Baca data lokal & stage overrides agar sinkron instan
    let localList: Pengajuan[] = [];
    let stageOverrides: Record<string, any> = {};
    try {
      const raw = localStorage.getItem('mapahtrip_local_registrations');
      if (raw) localList = JSON.parse(raw);
      const ovRaw = localStorage.getItem('mapahtrip_stage_overrides');
      if (ovRaw) stageOverrides = JSON.parse(ovRaw);
    } catch {}

    const mergeWithOverrides = (item: Pengajuan): Pengajuan => {
      const ov = stageOverrides[item.id] || {};
      return {
        ...item,
        tglBerkasMasuk: ov.tglSampai !== undefined ? ov.tglSampai : item.tglBerkasMasuk,
        tglApply: ov.tglProses !== undefined ? ov.tglProses : item.tglApply,
        tglSelesai: ov.tglSelesai !== undefined ? ov.tglSelesai : item.tglSelesai,
        tglKirim: ov.tglKirim !== undefined ? ov.tglKirim : item.tglKirim,
        noResi: ov.noResi !== undefined ? ov.noResi : item.noResi,
        status: ov.status || item.status,
      };
    };

    // Cari di data resmi pengajuanList dan pendaftaran lokal valid
    const liveIds = new Set(pengajuanList.map((p) => String(p.id)));
    const liveNos = new Set(pengajuanList.map((p) => p.noPengajuan).filter(Boolean));
    const validLocalList = localList.filter((p) => {
      const hasOfficialId = !isNaN(Number(p.id)) || (p.noPengajuan && p.noPengajuan.startsWith('MT-'));
      if (hasOfficialId && pengajuanList.length > 0) {
        return liveIds.has(String(p.id)) || (p.noPengajuan && liveNos.has(p.noPengajuan));
      }
      return true;
    });

    const all = [...pengajuanList, ...validLocalList];
    const found = all.find((p) => {
      const pPaspor = (p.noPaspor || '').toLowerCase();
      const pPengajuan = (p.noPengajuan || '').toLowerCase();
      const pId = (p.id || '').toLowerCase();
      const pNama = (p.namaPemohon || '').toLowerCase();
      return (
        pPaspor === cleanQuery ||
        pPengajuan === cleanQuery ||
        pId === cleanQuery ||
        (numOnly && (pPengajuan.includes(numOnly) || pId === numOnly)) ||
        pNama.includes(cleanQuery)
      );
    });

    if (found) {
      setTrackingResult(mergeWithOverrides(found));
      setIsSearching(false);
      return;
    }

    // 2. Query live Supabase database
    try {
      const dbResult = await searchPasporInDB(cleanQuery);
      if (dbResult) {
        setTrackingResult(mergeWithOverrides(dbResult));
      } else {
        setTrackingResult('NOT_FOUND');
      }
    } catch {
      setTrackingResult('NOT_FOUND');
    } finally {
      setIsSearching(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeTracking(trackingPaspor);
  };

  const hasAutoTracked = useRef(false);
  const isVisaModalBackdropMouseDown = useRef(false);

  // Auto-search jika customer membuka URL khusus dengan parameter ?lacak=... / ?tracking=... / ?no=... / ?paspor=...
  // Hanya dijalankan 1x saat awal halaman dimuat, TIDAK dijalankan ulang saat customer upload berkas
  useEffect(() => {
    if (hasAutoTracked.current) return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      let trackQuery =
        urlParams.get('lacak') ||
        urlParams.get('tracking') ||
        urlParams.get('no') ||
        urlParams.get('paspor') ||
        urlParams.get('q');

      if (!trackQuery && window.location.hash.includes('?')) {
        const hashQuery = window.location.hash.split('?')[1];
        const hashParams = new URLSearchParams(hashQuery);
        trackQuery =
          hashParams.get('lacak') ||
          hashParams.get('tracking') ||
          hashParams.get('no') ||
          hashParams.get('paspor') ||
          hashParams.get('q');
      }

      let urlKey = urlParams.get('key') || urlParams.get('token');
      if (!urlKey && window.location.hash.includes('?')) {
        const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
        urlKey = hashParams.get('key') || hashParams.get('token');
      }
      if (urlKey) {
        setCurrentAccessKey(urlKey.trim().toUpperCase());
      }

      if (trackQuery) {
        hasAutoTracked.current = true;
        const clean = trackQuery.trim();
        setTrackingPaspor(clean);
        executeTracking(clean);
        setTimeout(() => {
          const el = document.getElementById('tracking');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          }
        }, 300);
      }
    } catch {
      // ignore
    }
  }, []);

  // Handler Unggah Berkas Susulan oleh Customer
  const handleCustomerUploadDoc = async (docKey: string, file: File) => {
    if (!trackingResult || trackingResult === 'NOT_FOUND') return;
    if (!isAccessAuthorized) {
      alert('Akses tidak diizinkan. Pengunggahan berkas hanya dapat diakses melalui tautan resmi yang dikirimkan oleh staf MapahTrip ke WhatsApp Anda.');
      return;
    }
    const st = getCustomerStages(trackingResult);
    if (st.isSampai || st.isProses || st.isSelesai || st.isKirim || (trackingResult.status !== 'Menunggu Verifikasi' && trackingResult.status !== 'Ditolak')) {
      alert('Berkas telah diverifikasi & dikonfirmasi oleh staf operasional MapahTrip. Pengubahan berkas telah dikunci demi keamanan dan keabsahan berkas konsulat. Silakan hubungi staf PIC jika ada revisi mendesak.');
      return;
    }
    setUploadingDocKey(docKey);
    try {
      const optimized = await optimizeDocumentUpload(file);
      const base64 = optimized.base64;
      const sizeKB = optimized.sizeKB;
      const finalFileName = optimized.file.name;

      // 1. Simpan ke Supabase Cloud & Local Storage
      const uploadResult = await updatePengajuanDocumentInDB(trackingResult.id, docKey, base64, finalFileName, sizeKB);
      const uploadedCloudUrl = uploadResult?.url;

      // 2. Buat objek data terbarukan
      const updatedItem: Pengajuan = {
        ...trackingResult,
        fotoUrl: docKey === 'foto' ? (uploadedCloudUrl || trackingResult.fotoUrl) : trackingResult.fotoUrl,
        berkas: {
          ...trackingResult.berkas,
          [docKey]: true,
        },
        uploadedDocs: {
          ...(trackingResult.uploadedDocs || {}),
          [docKey]: {
            name: finalFileName,
            base64: base64,
            sizeKB: sizeKB,
            ...(uploadedCloudUrl ? { url: uploadedCloudUrl } : {}),
          },
        },
        ...(docKey === 'foto' ? { fotoBase64: base64, fotoSizeKB: sizeKB } : {}),
      };

      setTrackingResult(updatedItem);

      if (onUpdatePengajuan) {
        onUpdatePengajuan(updatedItem);
      }

      const savingsMsg = optimized.reductionPercent > 0 ? ` (Kompresi hemat ${optimized.reductionPercent}%)` : '';
      setUploadDocSuccessNotice(`✅ Berkas "${finalFileName}" berhasil diunggah${savingsMsg}! Status berkas Anda telah otomatis tercentang di sistem staf operasional.`);
      setTimeout(() => setUploadDocSuccessNotice(null), 5000);
    } catch (err: any) {
      alert('Gagal mengunggah berkas: ' + (err?.message || 'Terjadi kesalahan sistem.'));
    } finally {
      setUploadingDocKey(null);
    }
  };

  const handleCopyTrackingLink = (itemOrCode: any) => {
    try {
      let code = '';
      let key = '';
      if (typeof itemOrCode === 'object' && itemOrCode) {
        code = itemOrCode.noPengajuan || itemOrCode.noPaspor || itemOrCode.id || '';
        key = getApplicantAccessKey(itemOrCode);
      } else if (trackingResult && trackingResult !== 'NOT_FOUND') {
        code = trackingResult.noPengajuan || trackingResult.noPaspor || trackingResult.id || '';
        key = getApplicantAccessKey(trackingResult);
      } else {
        code = String(itemOrCode || '');
      }

      const url = key
        ? `${window.location.origin}/?lacak=${encodeURIComponent(code)}&key=${encodeURIComponent(key)}`
        : `${window.location.origin}/?lacak=${encodeURIComponent(code)}`;
      navigator.clipboard.writeText(url);
      setCopiedTrackingLink(true);
      setTimeout(() => setCopiedTrackingLink(false), 2500);
    } catch {
      // fallback
    }
  };



  const handleKirimPendaftaran = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmittingRef.current || formSubmitting) return;
    if (!formNama.trim()) {
      setFormError('Nama Lengkap wajib diisi.');
      return;
    }
    if (!formNoWa.trim() || formNoWa.length < 8) {
      setFormError('Nomor WhatsApp wajib diisi angka dengan benar (minimal 8 digit).');
      return;
    }

    // Validasi Kode Referral (Khusus pemohon yang memilih punya kode)
    if (hasRefChoice === 'yes') {
      const check = validateReferralCode(customerRefCode, pengajuanList);
      if (!check.isValid) {
        setFormError(
          `Kode referral "${customerRefCode}" tidak valid atau tidak terdaftar. Harap masukkan kode mitra resmi yang valid (contoh: MPH425MI).`
        );
        return;
      }
    }

    const finalDomisili =
      formDomisili === 'Lainnya' ? formDomisiliLainnya.trim() || 'Lainnya' : formDomisili;

    const cleanInputCode = customerRefCode.trim().toUpperCase();
    let finalRefCode = 'MAPAHTRIP';
    if (cleanInputCode) {
      const check = validateReferralCode(cleanInputCode, pengajuanList);
      finalRefCode = check.isValid ? check.code : cleanInputCode;
    }

    isSubmittingRef.current = true;
    setFormSubmitting(true);
    setFormError(null);

    const programVisa = selectedVisaModal?.title || 'Visa Jepang';
    const visaNominal = getNominalVisa(programVisa, formPaket);
    // Pengeluaran (modal konsulat), fee staf & fee mitra belum diisi owner di awal pendaftaran
    const feeBersihCalc = 0;

    // 1. Simpan pendaftaran langsung dan aman ke database Supabase Cloud
    const savedDb = await createPengajuanInDB({
      nama: formNama.trim(),
      domisili_ktp: finalDomisili,
      konsjen: formKonsjen,
      staff_pic: (determineDefaultStaffPic(programVisa, formKonsjen) as string) || undefined,
      no_wa: formNoWa.trim(),
      no_paspor: formNoPaspor.trim() || '-',
      code_referral: finalRefCode,
      form_visa: !!formFiles.formVisa || Boolean(formUploadedDocs.formVisa),
      ktp: !!formFiles.ktp || Boolean(formUploadedDocs.ktp),
      ektln: !!formFiles.ektln || Boolean(formUploadedDocs.ektln),
      coe: !!formFiles.coe || Boolean(formUploadedDocs.coe),
      foto: !!formFiles.foto || Boolean(formUploadedDocs.foto),
      program: programVisa,
      paket: formPaket,
      status_pembayaran: 'Menunggu Pembayaran',
      nominal_dibayar: visaNominal,
      fee_bersih: feeBersihCalc,
      foto_base64: undefined,
      original_size_kb: undefined,
      compressed_size_kb: undefined,
      uploaded_docs: formUploadedDocs,
    }).catch((err) => {
      console.warn('Gagal mencatat pengajuan ke Supabase:', err);
      return null;
    });

    const dbRow = savedDb as any;
    const rawNumber = dbRow?.no_urut || dbRow?.id || (pengajuanList.length + 1);
    const idPendaftaran = `MT-${String(rawNumber).padStart(4, '0')}`;
    const newApplicantId = dbRow?.id ? String(dbRow.id) : `MT-REG-${Date.now()}`;

    // 2. Kirim notifikasi WhatsApp otomatis via Gateway API (Session: Mapahtrip)
    const namaPendaftar = formNama.trim();
    const noPasporText = formNoPaspor.trim() && formNoPaspor.trim() !== '-' ? formNoPaspor.trim().toUpperCase() : '-';
    const isWaiver = (programVisa || '').toLowerCase().includes('waiver') || (selectedVisaModal?.title || '').toLowerCase().includes('waiver');

    const waMessage = isWaiver ?
`Halo Kak *${namaPendaftar}*! 👋🇯🇵

Terima kasih telah mendaftar layanan pengurusan *Visa Waiver Jepang* di *Mapah Trip*. ✨

Pendaftaran Kakak telah kami terima dengan detail:

📋 *Detail Pendaftaran:*
• *Program Visa:* ${programVisa}
• *Pilihan Paket:* Paket ${formPaket}
• *Biaya Layanan:* *${formatRupiah(visaNominal)}*
• *Jalur Pengurusan:* Layanan Khusus MapahTrip (Tanpa Kirim Paspor Fisik)
• *Domisili KTP:* ${finalDomisili}
• *No. Paspor:* ${noPasporText}
• *Kode Referral:* ${finalRefCode}
• *ID Pendaftaran:* *${idPendaftaran}*

📌 *Status:* Menunggu Verifikasi Dokumen Tim Pusat

━━━━━━━━━━━━━━━━━━━━
📍 *PANDUAN PROSES SELANJUTNYA:*
━━━━━━━━━━━━━━━━━━━━
Kakak *tidak perlu repot antre ke kedutaan atau mengirim paspor fisik*:

1️⃣ *Pemeriksaan & Verifikasi Dokumen oleh Tim MapahTrip*
Tim konsultan kami akan segera menghubungi WhatsApp Kakak untuk pengecekan data dan verifikasi kelayakan paspor elektronik (e-paspor) Kakak.

2️⃣ *Proses Registrasi Resmi ke Kedutaan*
Seluruh administrasi dan registrasi resmi ke pihak Kedutaan Jepang akan ditangani langsung dari awal sampai tuntas oleh tim ahli MapahTrip.

3️⃣ *Penyerahan Sertifikat Bebas Visa (Visa Waiver)*
Begitu disetujui oleh pihak Kedutaan Jepang, sertifikat resmi Visa Waiver akan langsung kami serahkan kepada Kakak via WhatsApp / Email.

🙏 *Catatan Penting:*
• Pastikan nomor WhatsApp Kakak selalu aktif agar tim kami dapat segera terhubung.

Terima kasih atas kepercayaannya bersama Mapah Trip! 🇯🇵

*Mapah Trip*
_Spesialis Pengajuan Visa Jepang Resmi_`
:
`Halo Kak *${namaPendaftar}*! 👋🇯🇵

Terima kasih telah mendaftar layanan pengajuan visa Jepang di *Mapah Trip*. ✨

Pendaftaran Kakak telah kami terima dengan detail:

📋 *Detail Pendaftaran:*
• *Program Visa:* ${programVisa}
• *Pilihan Paket:* Paket ${formPaket}
• *Konsulat Tujuan:* Konsulat Jenderal Jepang di ${formKonsjen}
• *Domisili KTP:* ${finalDomisili}
• *No. Paspor:* ${noPasporText}
• *Kode Referral:* ${finalRefCode}
• *ID Pendaftaran:* *${idPendaftaran}*

📌 *Status:* Menunggu Dihubungi Staf Konsulat

━━━━━━━━━━━━━━━━━━━━
📍 *PANDUAN PROSES SELANJUTNYA:*
━━━━━━━━━━━━━━━━━━━━
Kakak *tidak perlu upload berkas di website*. Seluruh proses dokumen dipandu langsung via WhatsApp:

1️⃣ *Staf Wilayah Segera Menghubungi*
Staf konsultan resmi kami untuk wilayah *Konsulat Jenderal ${formKonsjen}* akan segera menghubungi WhatsApp Kakak secara personal untuk memandu daftar dokumen persyaratan yang dibutuhkan. *Mohon ditunggu ya Kak.* 🙏

2️⃣ *Kirimkan Foto / Scan Dokumen ke Staf Terkait*
Begitu dihubungi oleh staf PIC wilayah Kakak, Kakak cukup mengirimkan foto/scan dokumen persyaratan langsung ke chat WhatsApp staf tersebut.

3️⃣ *Verifikasi & Input Resmi oleh Tim*
Tim staf kami yang akan memeriksa kelengkapan, menyiapkan formulir resmi kedutaan, dan menginput berkas Kakak ke sistem secara aman & rahasia.

🙏 *Catatan Penting:*
• Pastikan nomor WhatsApp Kakak selalu aktif agar staf wilayah kami dapat segera terhubung.
• Jangan ragu berkonsultasi saat staf kami menghubungi ya. 🌸

Terima kasih atas kepercayaannya bersama Mapah Trip! 🇯🇵

*Mapah Trip*
_Spesialis Pengajuan Visa Jepang Resmi_`;

    kirimPesanWA(formNoWa.trim(), waMessage, {
      namaPemohon: namaPendaftar,
      tahap: 'Pendaftaran',
    }).catch((waErr) => {
      console.warn('Catatan pengiriman WhatsApp Gateway ke pemohon:', waErr);
      return null;
    });

    // 2b. Otomatis kirim WhatsApp ke Mitra Affiliate jika pemohon menggunakan kode referral
    if (finalRefCode && finalRefCode.toUpperCase() !== 'MAPAHTRIP') {
      findAffiliateByCode(finalRefCode).then((affiliate) => {
        if (affiliate && affiliate.noWa && affiliate.noWa.trim()) {
          const tanggalDaftar = new Date().toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          });

          const pesanWAAffiliate =
`*PEMBERITAHUAN PENDAFTARAN BARU (KODE REFERRAL ANDA)* 🇯🇵🎉

Halo Kak *${affiliate.nama}*,

Kabar gembira! Ada pemohon visa baru yang baru saja mendaftar di *MapahTrip* menggunakan kode referral Anda (*${finalRefCode}*):

📋 *Data Pemohon Binaan Anda:*
• *ID Pengajuan:* *${idPendaftaran}*
• *Nama Pemohon:* ${namaPendaftar}
• *Program Visa:* ${programVisa} (${formPaket})
• *Biaya Layanan:* ${formatRupiah(visaNominal)}
• *Konsulat Tujuan:* Konsjen ${formKonsjen}
• *Tanggal Daftar:* ${tanggalDaftar}

💰 *Estimasi Komisi Referral:*
• *Nominal Bonus:* *Rp 100.000*
• *Status Komisi:* Tercatat di sistem (Menunggu verifikasi berkas & proses visa)

Anda dapat memantau status pemohon binaan dan akumulasi komisi Anda secara realtime melalui Portal Affiliate MapahTrip:
🌐 https://mapahtrip.id (Masuk ke menu Portal Affiliate)

Terima kasih atas rekomendasi dan kerja samanya bersama MapahTrip! 🌸🤝

Salam hangat,
*Tim Kemitraan MapahTrip*`;

          kirimPesanWA(affiliate.noWa.trim(), pesanWAAffiliate, {
            namaPemohon: `Mitra (${affiliate.nama})`,
            tahap: 'Notif Mitra',
          })
            .then((res) => {
              console.log('[WA Gateway] Sukses kirim notifikasi pendaftar baru ke Mitra Affiliate:', affiliate.noWa, res);
            })
            .catch((err) => {
              console.warn('[WA Gateway] Gagal kirim notifikasi ke Mitra Affiliate:', err);
            });
        }
      }).catch((err) => {
        console.warn('Gagal mencari data affiliate untuk notifikasi:', err);
      });
    }

    // 2c. Otomatis kirim WhatsApp ke Admin/Staf PIC MapahTrip (HANYA jika bukan Visa Waiver)
    // Khusus Visa Waiver: 100% online diproses langsung oleh Owner/Pusat di sistem JAVES, Staf PIC Daerah tidak perlu dinotifikasi.
    let assignedStaff: StaffMaster | undefined;
    if (!isWaiver) {
      try {
        let regionalStaffList = mockStaff;
        if (typeof window !== 'undefined') {
          const savedStaff = localStorage.getItem('mapahtrip_staff_list');
          if (savedStaff) {
            const parsed: StaffMaster[] = JSON.parse(savedStaff);
            regionalStaffList = parsed.map((p) => {
              const def = mockStaff.find((ms) => ms.id === p.id);
              return { ...p, noWa: p.noWa || def?.noWa || '' };
            });
          }
        }

        const isKunjunganProgram = (selectedVisaModal?.title || '').toLowerCase().includes('kunjungan');
        assignedStaff = isKunjunganProgram
          ? (regionalStaffList.find((s) => s.nama.toLowerCase().includes('ulla') || s.nama.toLowerCase().includes('ulya')) ||
             regionalStaffList.find((s) => s.role && s.role.toLowerCase().includes('kunjungan')))
          : (regionalStaffList.find((s) => s.aktif && s.konsjenTugas && s.konsjenTugas.includes(formKonsjen as KonsjenKota)) ||
             regionalStaffList.find((s) => s.konsjenTugas && s.konsjenTugas.includes(formKonsjen as KonsjenKota)));

        if (assignedStaff && assignedStaff.noWa && assignedStaff.noWa.trim()) {
          const pesanWAStaff =
`*PENDAFTARAN BARU* 🇯🇵📋

Halo Kak *${assignedStaff.nama}*, ada pemohon visa baru:

• *ID:* *${idPendaftaran}*
• *Nama:* ${namaPendaftar}
• *Program:* ${programVisa} (${formPaket})
• *Konsulat:* Konsjen ${formKonsjen}
• *Paspor:* ${formNoPaspor.trim() || '-'}
• *WA:* ${formNoWa.trim()}

👉 Hubungi pemohon: https://wa.me/${formNoWa.trim().replace(/^0/, '62').replace(/\D/g, '')}
Pandu berkas & infokan alamat kirim paspor.`;

          kirimPesanWA(assignedStaff.noWa.trim(), pesanWAStaff, {
            namaPemohon: `Staf PIC (${assignedStaff.nama})`,
            tahap: 'Notif Staf',
          })
            .then((res) => {
              console.log(`[WA Gateway] Sukses kirim notifikasi pendaftar baru ke PIC ${formKonsjen} (${assignedStaff?.nama}):`, assignedStaff?.noWa, res);
            })
            .catch((err) => {
              console.warn(`[WA Gateway] Gagal kirim notifikasi ke PIC ${formKonsjen}:`, err);
            });
        }
      } catch (staffErr) {
        console.warn('Gagal memproses notifikasi staff wilayah:', staffErr);
      }
    }

    // 2d. Otomatis kirim WhatsApp ke Owner MapahTrip (Notifikasi Eksekutif Seluruh Wilayah)
    try {
      let ownerWa = '081214104332';
      let isOwnerNotifyActive = true;
      if (typeof window !== 'undefined') {
        const savedWa = localStorage.getItem('mapahtrip_owner_wa');
        if (savedWa && savedWa.trim()) {
          ownerWa = savedWa.trim();
        }
        const savedNotify = localStorage.getItem('mapahtrip_owner_notify');
        if (savedNotify === 'false') {
          isOwnerNotifyActive = false;
        }
      }

      if (isOwnerNotifyActive && ownerWa && ownerWa.trim()) {
        const pesanWAOwner =
`*PENDAFTARAN BARU (OWNER)* 👑📋

Pendaftar baru masuk ke sistem:

• *ID:* *${idPendaftaran}*
• *Nama:* ${namaPendaftar}
• *Program:* ${programVisa} (${formPaket})
• *Konsulat:* Konsjen ${formKonsjen} (PIC: ${assignedStaff?.nama || 'Staf'})
• *WA Pemohon:* ${formNoWa.trim()}
• *Biaya:* ${formatRupiah(visaNominal)}
${finalRefCode && finalRefCode.toUpperCase() !== 'MAPAHTRIP' ? `• *Mitra:* ${finalRefCode}\n` : ''}
🌐 Kelola: https://mapahtrip.id/#owner`;

        kirimPesanWA(ownerWa.trim(), pesanWAOwner, {
          namaPemohon: 'Owner MapahTrip',
          tahap: 'Notif Owner',
        })
          .then((res) => {
            console.log('[WA Gateway] Sukses kirim notifikasi pendaftar baru ke Owner MapahTrip:', ownerWa, res);
          })
          .catch((err) => {
            console.warn('[WA Gateway] Gagal kirim notifikasi ke Owner MapahTrip:', err);
          });
      }
    } catch (ownerErr) {
      console.warn('Gagal memproses notifikasi Owner:', ownerErr);
    }

    const paspor =
      formNoPaspor.trim() && formNoPaspor.trim() !== '-'
        ? formNoPaspor.trim().toUpperCase()
        : `MT${Math.floor(100000 + Math.random() * 900000)}`;
    const masked = paspor.length > 4 ? `${paspor.slice(0, 3)}***${paspor.slice(-2)}` : paspor;

    const newPengajuan: Pengajuan = {
      id: newApplicantId,
      noPengajuan: idPendaftaran,
      namaPemohon: formNama.trim(),
      noPaspor: paspor,
      maskedPaspor: masked,
      noTelp: formNoWa.trim(),
      konsjen: formKonsjen,
      staffPic: (determineDefaultStaffPic(programVisa, formKonsjen) as any),
      program: programVisa,
      paket: formPaket,
      tglBerkasMasuk: '-',
      tglApply: '-',
      tglEstimasiSelesai: 'Menunggu Verifikasi Berkas',
      status: 'Menunggu Verifikasi',
      statusPembayaran: 'Menunggu Pembayaran',
      metodePembayaran: 'Transfer Bank',
      affiliateCode: finalRefCode,
      dibayarPemohon: visaNominal,
      nominalKeluar: 0,
      cashback: 0,
      feeBersih: 0,
      referralFee: 0,
      staffFee: 0,
      berkas: {
        formVisa: !!formFiles.formVisa || Boolean(formUploadedDocs.formVisa),
        pasporFisik: !!formFiles.pasporFisik || Boolean(formUploadedDocs.pasporFisik),
        ktp: !!formFiles.ktp || Boolean(formUploadedDocs.ktp),
        ektln: !!formFiles.ektln || Boolean(formUploadedDocs.ektln),
        coe: !!formFiles.coe || Boolean(formUploadedDocs.coe),
        foto: !!formFiles.foto || Boolean(formUploadedDocs.foto),
      },
      catatan: `Pendaftaran mandiri via Website. Domisili: ${finalDomisili}`,
      fotoBase64: undefined,
      fotoSizeKB: undefined,
      uploadedDocs: formUploadedDocs,
    };

    // Simpan ke localStorage agar data pendaftar tersinkron instan di semua portal
    try {
      const localSaved = localStorage.getItem('mapahtrip_local_registrations');
      const list: Pengajuan[] = localSaved ? JSON.parse(localSaved) : [];
      const filtered = list.filter((p) => p.id !== newPengajuan.id);
      filtered.unshift(newPengajuan);
      localStorage.setItem('mapahtrip_local_registrations', JSON.stringify(filtered));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('mapahtrip:new_applicant', { detail: newPengajuan }));
    } catch {}

    // Panggil callback agar state pengajuanList di App.tsx terupdate secara realtime
    if (onAddNewPengajuan) {
      onAddNewPengajuan(newPengajuan);
    }

    setNewSubmittedApplicant(newPengajuan);
    setFormSubmitting(false);
    isSubmittingRef.current = false;
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
              onError={(e) =>
                handleImageFallback(
                  e,
                  isDarkMode ? getLogoPutihFallbacks() : getLogoHitamFallbacks()
                )
              }
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
              { label: 'Lacak Status', href: '#tracking', id: 'tracking' },
              { label: 'FAQ', href: '#faq', id: 'faq' },
            ].map((item, idx) => (
              <a
                key={idx}
                href={item.href}
                onClick={(e) => handleNavScroll(e, item.id)}
                className="nav-link-premium"
              >
                <span>{item.label}</span>
              </a>
            ))}
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

          {/* Primary CTA: Ajukan Visa */}
          <a
            href="#jenis-visa"
            onClick={(e) => handleNavScroll(e, 'jenis-visa')}
            className="header-btn-daftar"
            title="Klik untuk memilih jenis visa dan mulai pengajuan"
          >
            <span>Ajukan Visa</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
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
            { label: 'Lacak Status Paspor', href: '#tracking', id: 'tracking', icon: 'search' },
            { label: 'Tanya Jawab (FAQ)', href: '#faq', id: 'faq', icon: 'help_outline' },
            { label: 'Ajukan Visa Jepang', href: '#jenis-visa', id: 'jenis-visa', icon: 'edit_document' },
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
                fontSize: 'clamp(1.85rem, 5vw, 3.5rem)',
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                wordBreak: 'break-word',
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
                  wordBreak: 'break-word',
                }}
              >
                Simpel, Mudah &amp; Cepat
              </span>
            </h1>

            <p style={{ fontSize: '1.02rem', color: '#475569', lineHeight: 1.6, maxWidth: '600px', wordBreak: 'break-word' }}>
              Fokus <strong style={{ color: isDarkMode ? '#60A5FA' : '#0F172A' }}>100% Visa Jepang</strong>. Semua jenis visa kami urus — dari tourist, visa waiver, bisnis, sampai student, <strong style={{ color: '#0077F6' }}>Tokutei Ginou (SSW)</strong> &amp; <strong style={{ color: '#0077F6' }}>Magang</strong>. Dokumen &amp; itinerary Jepang kami siapkan, kamu tinggal tunggu jadi.
            </p>

            {/* CTAs */}
            <div className="hero-cta-buttons" style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginTop: '6px' }}>
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
                onClick={() => handleOpenVisaModal(dynamicVisaOptions[0] || VISA_OPTIONS[0])}
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
                <span className="cta-btn-text-full">Daftar Visa Sekarang</span>
                <span className="cta-btn-text-mobile">Daftar Visa</span>
              </button>

            </div>

            {/* 3 Metric Badges: Samakan Font Serif & Data Riil Pemohon */}
            <div className="hero-metric-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '14px', width: '100%' }}>
              <div className="metric-card" style={{ padding: '16px 18px', borderRadius: '18px', background: '#ffffff', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <div className="font-serif" style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '2rem', fontWeight: 700, color: '#0B1220', lineHeight: 1.1 }}>
                  100%
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>Approval Rate</div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>screening ketat</div>
              </div>

              <div className="metric-card" style={{ padding: '16px 18px', borderRadius: '18px', background: '#ffffff', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <div className="font-serif" style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '2rem', fontWeight: 700, color: '#0B1220', lineHeight: 1.1 }}>
                  {approvedMilestoneDisplay}
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
                  minWidth: 0,
                  flex: 1,
                  wordBreak: 'break-word',
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
              {/* Background Image: MapahTrip.jpg with 100% Embedded Fallback */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 0,
                  background: 'linear-gradient(135deg, #0b1220 0%, #0f172a 40%, #0369a1 100%)',
                }}
              >
                <img
                  src={buildingPhoto || './MapahTrip.jpg'}
                  alt=""
                  loading="eager"
                  onError={(e) => handleImageFallback(e, getBuildingPhotoFallbacks())}
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
              <div className="trust-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined trust-icon" style={{ fontSize: '18px', color: '#0047BA' }}>
                  verified
                </span>
                <span className="trust-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>
                  2x Review Dokumen
                </span>
                <span className="trust-tag">Resmi JVAC</span>
              </div>

              <span className="trust-dot-sep" style={{ color: '#CBD5E1', fontWeight: 300 }}>•</span>

              <div className="trust-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined trust-icon" style={{ fontSize: '18px', color: '#0047BA' }}>
                  event_available
                </span>
                <span className="trust-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>
                  Itinerary Harian JVAC
                </span>
                <span className="trust-tag">Format Kedutaan</span>
              </div>

              <span className="trust-dot-sep" style={{ color: '#CBD5E1', fontWeight: 300 }}>•</span>

              <div className="trust-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined trust-icon" style={{ fontSize: '18px', color: '#0047BA' }}>
                  lock
                </span>
                <span className="trust-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>
                  Privasi Terenkripsi
                </span>
                <span className="trust-tag">100% Rahasia</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sorotan Cerita & Testimoni Video (Instagram Stories Style) */}
      <StoryHighlightsBar
        highlights={STORY_HIGHLIGHTS}
        onSelectHighlight={(id) => setActiveStoryHighlightId(id)}
      />

      {/* 3. Section Cek Status / Tracking Paspor Customer */}
      <section id="tracking" style={{ backgroundColor: '#F8FAFC', padding: '60px 24px', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: '780px', margin: '0 auto', textAlign: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#2B68E0', letterSpacing: '0.08em' }}>
            Pelacakan Online 24/7
          </span>
          <h2 className="font-serif" style={{ fontSize: '2.2rem', fontWeight: 700, color: '#0F172A', marginTop: '6px' }}>
            Cek Status Pengajuan Paspor Anda
          </h2>
          <p className="tracking-subtitle" style={{ color: '#64748B', fontSize: '0.95rem', marginTop: '6px' }}>
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

          {typeof trackingResult === 'object' && trackingResult !== null && (() => {
            const st = getCustomerStages(trackingResult);
            const resiLower = (st.noResi || '').toLowerCase();
            const isAirport = resiLower.includes('soetta') || resiLower.includes('soehatta') || resiLower.includes('soekarno') || resiLower.includes('bandara') || resiLower.includes('flight') || resiLower.includes('handover');
            const isOffice = resiLower.includes('kantor') || resiLower.includes('langsung') || resiLower.includes('diambil');

            const stageSteps = [
              { key: 'sampai', label: '1. Berkas Sampai', ok: st.isSampai, date: st.tglSampai, desc: 'Dokumen & paspor fisik diterima di kantor MapahTrip', icon: 'inventory_2', color: '#0284C7', bg: '#E0F2FE' },
              { key: 'proses', label: '2. Diproses', ok: st.isProses, date: st.tglProses, desc: 'Diajukan & diproses di Kedutaan/JVAC', icon: 'sync', color: '#D97706', bg: '#FEF3C7' },
              { key: 'selesai', label: '3. Visa Terbit', ok: st.isSelesai, date: st.tglSelesai, desc: 'Visa resmi Jepang disetujui & tertempel', icon: 'verified', color: '#16A34A', bg: '#DCFCE7' },
              {
                key: 'kirim',
                label: isAirport ? '4. Serah Terima Bandara' : isOffice ? '4. Paspor Siap Diambil' : '4. Paspor Dikirim',
                ok: st.isKirim,
                date: st.tglKirim,
                desc: st.noResi ? (isAirport ? `Jadwal Bandara: ${st.noResi}` : isOffice ? `Lokasi: ${st.noResi}` : `Resi: ${st.noResi}`) : 'Diserahkan di bandara / kurir / kantor',
                icon: isAirport ? 'flight_takeoff' : isOffice ? 'storefront' : 'local_shipping',
                color: isAirport ? '#1D4ED8' : isOffice ? '#15803D' : '#7C3AED',
                bg: isAirport ? '#EFF6FF' : isOffice ? '#F0FDF4' : '#F3E8FF',
              },
            ];

            const completedCount = stageSteps.filter(s => s.ok).length;

            return (
              <div
                style={{
                  marginTop: '28px',
                  padding: '28px',
                  borderRadius: '20px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  textAlign: 'left',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
                }}
              >
                {/* Header Info Pemohon & Status Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid #F1F5F9' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Nama Pemohon:</span>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>
                      {trackingResult.namaPemohon}
                    </div>
                    <div style={{ fontSize: '0.80rem', color: '#64748B', fontFamily: 'monospace', marginTop: '2px' }}>
                      No. Paspor: <strong>{trackingResult.noPaspor}</strong> • ID: <strong>{trackingResult.noPengajuan}</strong>
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        padding: '6px 16px',
                        borderRadius: '9999px',
                        background: st.isKirim
                          ? '#F3E8FF'
                          : st.isSelesai
                          ? '#ECFDF5'
                          : st.isProses
                          ? '#FEF3C7'
                          : st.isSampai
                          ? '#E0F2FE'
                          : '#F1F5F9',
                        color: st.isKirim
                          ? '#6B21A8'
                          : st.isSelesai
                          ? '#047857'
                          : st.isProses
                          ? '#B45309'
                          : st.isSampai
                          ? '#0369A1'
                          : '#475569',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'currentColor' }} />
                      <span>
                        {st.isKirim
                          ? 'Selesai & Paspor Dikirim'
                          : st.isSelesai
                          ? 'Visa Telah Terbit'
                          : st.isProses
                          ? 'Sedang Diproses Konsulat'
                          : st.isSampai
                          ? 'Berkas Diterima di Kantor'
                          : 'Pendaftaran Diterima'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4-Tahapan Progress Stepper Timeline */}
                <div style={{ marginTop: '22px', padding: '18px 16px', backgroundColor: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#2563EB' }}>timeline</span>
                      <span>Tahapan Pengerjaan Dokumen ({completedCount}/4 Tahap Selesai)</span>
                    </div>
                    <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                      Program: <strong style={{ color: '#0F172A' }}>{trackingResult.program}</strong>
                    </span>
                  </div>

                  {/* 4 Cards Grid Stepper */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                    {stageSteps.map((s, sIdx) => (
                      <div
                        key={s.key}
                        style={{
                          backgroundColor: '#FFFFFF',
                          border: s.ok ? `2px solid ${s.color}` : '1px solid #E2E8F0',
                          borderRadius: '12px',
                          padding: '12px 10px',
                          position: 'relative',
                          boxShadow: s.ok ? '0 2px 6px rgba(0,0,0,0.04)' : 'none',
                          opacity: s.ok ? 1 : 0.65,
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              backgroundColor: s.ok ? s.color : '#E2E8F0',
                              color: s.ok ? '#FFFFFF' : '#64748B',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                            }}
                          >
                            {s.ok ? '✓' : sIdx + 1}
                          </span>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: s.ok ? s.bg : '#F1F5F9',
                              color: s.ok ? s.color : '#64748B',
                            }}
                          >
                            {s.ok ? 'Selesai' : 'Menunggu'}
                          </span>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '0.82rem', color: s.ok ? '#0F172A' : '#64748B' }}>
                          {s.label}
                        </div>
                        <div style={{ fontSize: '0.70rem', color: s.ok ? s.color : '#94A3B8', fontFamily: 'monospace', fontWeight: 700, marginTop: '2px' }}>
                          {s.ok ? (s.date || 'Selesai') : '-'}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '4px', lineHeight: 1.3 }}>
                          {s.desc}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Detail Info Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginTop: '18px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: '#64748B' }}>Nomor Pengajuan:</span>
                    <div style={{ fontWeight: 700, fontFamily: 'monospace', color: '#0F172A' }}>{trackingResult.noPengajuan}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748B' }}>Konsulat Tujuan:</span>
                    <div style={{ fontWeight: 700, color: '#0F172A' }}>Konsjen {trackingResult.konsjen}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748B' }}>Program Visa:</span>
                    <div style={{ fontWeight: 700, color: '#0F172A' }}>{trackingResult.program}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748B' }}>Status Pembayaran:</span>
                    <div style={{ marginTop: '2px' }}>
                      {trackingResult.statusPembayaran === 'Lunas' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '6px', backgroundColor: '#DCFCE7', color: '#15803D', fontWeight: 700, fontSize: '0.78rem' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>check_circle</span>
                          Lunas
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '6px', backgroundColor: '#FEF3C7', color: '#B45309', fontWeight: 700, fontSize: '0.78rem' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>pending</span>
                          Menunggu Pembayaran
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#64748B' }}>Nomor Resi / Pengiriman:</span>
                    <div style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                      {st.isKirim && st.noResi ? (() => {
                        const lower = st.noResi.toLowerCase();
                        const isAirportResi = lower.includes('soetta') || lower.includes('soehatta') || lower.includes('soekarno') || lower.includes('bandara') || lower.includes('flight') || lower.includes('handover');
                        const isOfficeResi = lower.includes('kantor') || lower.includes('langsung') || lower.includes('diambil');
                        const icon = isAirportResi ? 'flight_takeoff' : isOfficeResi ? 'storefront' : 'local_shipping';
                        const bg = isAirportResi ? '#EFF6FF' : isOfficeResi ? '#F0FDF4' : '#F3E8FF';
                        const color = isAirportResi ? '#1D4ED8' : isOfficeResi ? '#15803D' : '#6B21A8';

                        return (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', backgroundColor: bg, color: color }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{icon}</span>
                            <span>{st.noResi}</span>
                          </span>
                        );
                      })() : (
                        <span style={{ color: '#94A3B8' }}>Belum Dikirim</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* SECTION: STATUS KELENGKAPAN BERKAS & UPLOAD SUSULAN MANDIRI */}
                {(() => {
                  const docItems = [
                    {
                      key: 'formVisa',
                      label: 'Formulir Visa Jepang',
                      desc: 'Formulir resmi kedutaan (diisi & ditandatangani pemohon)',
                      icon: 'assignment',
                      isOk: Boolean(trackingResult.berkas?.formVisa || trackingResult.uploadedDocs?.formVisa),
                      fileData: trackingResult.uploadedDocs?.formVisa,
                    },
                    {
                      key: 'ktp',
                      label: 'KTP & Kartu Keluarga',
                      desc: 'Foto/scan jelas e-KTP dan Kartu Keluarga pemohon',
                      icon: 'badge',
                      isOk: Boolean(trackingResult.berkas?.ktp || trackingResult.uploadedDocs?.ktp),
                      fileData: trackingResult.uploadedDocs?.ktp,
                    },
                    {
                      key: 'ektln',
                      label: 'E-KTLN / Bukti Keuangan',
                      desc: 'Rekening koran 3 bulan terakhir / E-KTLN BP2MI aktif',
                      icon: 'account_balance',
                      isOk: Boolean(trackingResult.berkas?.ektln || trackingResult.uploadedDocs?.ektln),
                      fileData: trackingResult.uploadedDocs?.ektln,
                    },
                    {
                      key: 'coe',
                      label: 'COE / Bukti Akomodasi',
                      desc: 'Certificate of Eligibility (kerja/magang) atau bukti tiket & hotel',
                      icon: 'apartment',
                      isOk: Boolean(trackingResult.berkas?.coe || trackingResult.uploadedDocs?.coe),
                      fileData: trackingResult.uploadedDocs?.coe,
                    },
                    {
                      key: 'pasporFisik',
                      label: 'Paspor Fisik / Scan Paspor',
                      desc: 'Foto halaman identitas paspor asli (berlaku > 6-12 bulan)',
                      icon: 'menu_book',
                      isOk: Boolean(trackingResult.berkas?.pasporFisik || trackingResult.uploadedDocs?.pasporFisik),
                      fileData: trackingResult.uploadedDocs?.pasporFisik,
                    },
                    {
                      key: 'foto',
                      label: 'Pas Foto 4.5 × 3.5 cm',
                      desc: 'Background putih polos kualitas tajam standar konsulat',
                      icon: 'photo_camera',
                      isOk: Boolean(trackingResult.berkas?.foto || trackingResult.fotoBase64 || trackingResult.uploadedDocs?.foto),
                      fileData: trackingResult.uploadedDocs?.foto || (trackingResult.fotoBase64 ? { name: 'Pasfoto.jpg', base64: trackingResult.fotoBase64 } : undefined),
                    },
                  ];

                  const totalDocs = docItems.length;
                  const completeDocs = docItems.filter((d) => d.isOk).length;
                  const isAllUploaded = completeDocs === totalDocs;
                  const applicantKey = getApplicantAccessKey(trackingResult);
                  const trackingLink = `${window.location.origin}/?lacak=${encodeURIComponent(trackingResult.noPengajuan || trackingResult.noPaspor)}&key=${encodeURIComponent(applicantKey)}`;
                  const isDocLocked = Boolean(st.isSampai || st.isProses || st.isSelesai || st.isKirim || (trackingResult.status !== 'Menunggu Verifikasi' && trackingResult.status !== 'Ditolak'));

                  if (!isAccessAuthorized) {
                    return (
                      <div
                        style={{
                          marginTop: '20px',
                          padding: '24px 20px',
                          borderRadius: '16px',
                          backgroundColor: '#F8FAFC',
                          border: '1.5px dashed #CBD5E1',
                          textAlign: 'center',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                        }}
                      >
                        <div
                          style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '50%',
                            backgroundColor: '#EFF6FF',
                            color: '#2563EB',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 10px',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                            lock
                          </span>
                        </div>
                        <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                          Akses Unggah Berkas Dilindungi Kunci Keamanan
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748B', maxWidth: '480px', margin: '0 auto 12px', lineHeight: 1.5 }}>
                          Untuk menjaga kerahasiaan identitas dan mencegah penyalahgunaan dokumen pribadi, formulir unggah berkas hanya dapat diakses melalui <strong>tautan resmi ber-kunci khusus</strong> yang dikirimkan oleh staf MapahTrip ke WhatsApp Anda.
                        </div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: '#16A34A', backgroundColor: '#F0FDF4', padding: '4px 12px', borderRadius: '999px', border: '1px solid #BBF7D0', fontWeight: 700 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>verified_user</span>
                          Perlindungan Dokumen &amp; Privasi Terenkripsi MapahTrip
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      style={{
                        marginTop: '20px',
                        padding: '20px',
                        borderRadius: '16px',
                        backgroundColor: '#FFFFFF',
                        border: isAllUploaded ? '1.5px solid #86EFAC' : '1.5px solid #CBD5E1',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                      }}
                    >
                      {/* Header Section Berkas */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '10px',
                          paddingBottom: '14px',
                          borderBottom: '1px solid #F1F5F9',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              backgroundColor: isAllUploaded ? '#DCFCE7' : '#EFF6FF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: isAllUploaded ? '#16A34A' : '#2563EB',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                              {isAllUploaded ? 'task_alt' : 'folder_open'}
                            </span>
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0F172A' }}>
                                Kelengkapan Berkas Persyaratan ({completeDocs}/{totalDocs})
                              </div>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  fontSize: '0.66rem',
                                  color: '#15803D',
                                  backgroundColor: '#DCFCE7',
                                  border: '1px solid #BBF7D0',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 700,
                                }}
                                title="Tautan terverifikasi dengan kunci pengamanan resmi"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>verified_user</span>
                                Akses Terverifikasi
                              </span>
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                              {isDocLocked
                                ? 'Dokumen telah divalidasi oleh staf operasional dan dikunci demi kepatuhan pengajuan konsulat.'
                                : isAllUploaded
                                ? 'Seluruh berkas persyaratan telah lengkap dan tersinkronisasi di sistem'
                                : 'Upload dokumen susulan langsung dari HP tanpa perlu kirim ke WhatsApp'}
                            </div>
                          </div>
                        </div>

                        <div>
                          {isDocLocked ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '5px 12px',
                                borderRadius: '999px',
                                backgroundColor: '#DCFCE7',
                                color: '#15803D',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                border: '1px solid #86EFAC',
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>lock</span>
                              Berkas Terverifikasi &amp; Terkunci
                            </span>
                          ) : isAllUploaded ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '5px 12px',
                                borderRadius: '999px',
                                backgroundColor: '#DCFCE7',
                                color: '#15803D',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>verified</span>
                              Semua Berkas Lengkap ✓
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '5px 12px',
                                borderRadius: '999px',
                                backgroundColor: '#FEF3C7',
                                color: '#B45309',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>pending_actions</span>
                              Kurang {totalDocs - completeDocs} Berkas Lagi
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Banner Kunci Berkas jika sudah diverifikasi / diproses staf */}
                      {isDocLocked && (
                        <div
                          style={{
                            marginTop: '12px',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            backgroundColor: '#F0FDF4',
                            border: '1.5px solid #86EFAC',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            boxShadow: '0 2px 6px rgba(22, 163, 74, 0.05)',
                          }}
                        >
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              backgroundColor: '#DCFCE7',
                              color: '#15803D',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>lock</span>
                          </div>
                          <div style={{ flex: 1, fontSize: '0.80rem', lineHeight: 1.45 }}>
                            <div style={{ fontWeight: 800, color: '#14532D', marginBottom: '2px' }}>
                              🔒 Berkas Telah Diverifikasi &amp; Dikunci oleh Tim Operasional
                            </div>
                            <div style={{ color: '#166534' }}>
                              Seluruh berkas persyaratan telah divalidasi dan sedang diproses resmi di Kedutaan/JVAC. Pengunggahan berkas baru atau pengubahan dokumen telah dikunci secara otomatis demi menjaga keabsahan di loket konsulat.
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Toast Notice saat baru berhasil upload */}
                      {uploadDocSuccessNotice && (
                        <div
                          style={{
                            marginTop: '12px',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            backgroundColor: '#DCFCE7',
                            border: '1px solid #86EFAC',
                            color: '#166534',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                          <span>{uploadDocSuccessNotice}</span>
                        </div>
                      )}

                      {/* Grid Dokumen Interaktif */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                          gap: '10px',
                          marginTop: '14px',
                        }}
                      >
                        {docItems.map((doc) => {
                          const isUploadingThis = uploadingDocKey === doc.key;
                          const fileB64 = doc.fileData?.base64;
                          const isPdf = Boolean(doc.fileData?.name?.toLowerCase().endsWith('.pdf') || (fileB64 && fileB64.startsWith('data:application/pdf')));

                          return (
                            <div
                              key={doc.key}
                              style={{
                                padding: '12px 14px',
                                borderRadius: '12px',
                                backgroundColor: doc.isOk ? '#F0FDF4' : '#FFF7ED',
                                border: `1.5px solid ${doc.isOk ? '#BBF7D0' : '#FED7AA'}`,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                gap: '10px',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span
                                      className="material-symbols-outlined"
                                      style={{
                                        fontSize: '18px',
                                        color: doc.isOk ? '#16A34A' : '#EA580C',
                                      }}
                                    >
                                      {doc.icon}
                                    </span>
                                    <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0F172A' }}>
                                      {doc.label}
                                    </span>
                                  </div>

                                  <span
                                    style={{
                                      fontSize: '0.68rem',
                                      fontWeight: 800,
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                      backgroundColor: doc.isOk ? '#DCFCE7' : '#FEE2E2',
                                      color: doc.isOk ? '#15803D' : '#DC2626',
                                      border: `1px solid ${doc.isOk ? '#BBF7D0' : '#FECACA'}`,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {doc.isOk ? '✓ Lengkap' : '! Belum Ada'}
                                  </span>
                                </div>

                                <div style={{ fontSize: '0.73rem', color: '#64748B', marginTop: '4px', lineHeight: 1.35 }}>
                                  {doc.desc}
                                </div>

                                {doc.fileData?.name && (
                                  <div style={{ fontSize: '0.70rem', color: '#16A34A', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>📄 {doc.fileData.name}</span>
                                    {doc.fileData.sizeKB ? <span>({doc.fileData.sizeKB} KB)</span> : null}
                                  </div>
                                )}
                              </div>

                              {/* Action Buttons */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                {doc.isOk && fileB64 && (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewCustomerDoc({ title: doc.label, url: fileB64, isPdf })}
                                    style={{
                                      flex: isDocLocked ? 1 : undefined,
                                      padding: isDocLocked ? '7px 12px' : '5px 10px',
                                      fontSize: '0.74rem',
                                      fontWeight: 700,
                                      borderRadius: '6px',
                                      border: '1px solid #CBD5E1',
                                      backgroundColor: '#FFFFFF',
                                      color: '#334155',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: isDocLocked ? 'center' : 'flex-start',
                                      gap: '5px',
                                    }}
                                  >
                                    <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#2563EB' }}>visibility</span>
                                    <span>Lihat Dokumen</span>
                                  </button>
                                )}

                                {isDocLocked ? (
                                  doc.isOk && !fileB64 ? (
                                    <div
                                      style={{
                                        flex: 1,
                                        padding: '7px 10px',
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        borderRadius: '6px',
                                        backgroundColor: '#F0FDF4',
                                        color: '#15803D',
                                        border: '1px solid #BBF7D0',
                                        textAlign: 'center',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '5px',
                                      }}
                                    >
                                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>verified</span>
                                      <span>Fisik Diterima &amp; Terverifikasi</span>
                                    </div>
                                  ) : !doc.isOk ? (
                                    <div
                                      style={{
                                        flex: 1,
                                        padding: '7px 10px',
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        borderRadius: '6px',
                                        backgroundColor: '#F8FAFC',
                                        color: '#64748B',
                                        border: '1px dashed #CBD5E1',
                                        textAlign: 'center',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '5px',
                                      }}
                                    >
                                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>lock</span>
                                      <span>Terkunci (Hubungi Tim)</span>
                                    </div>
                                  ) : null
                                ) : (
                                  <label
                                    style={{
                                      flex: 1,
                                      padding: '6px 12px',
                                      fontSize: '0.74rem',
                                      fontWeight: 700,
                                      borderRadius: '6px',
                                      border: doc.isOk ? '1px solid #CBD5E1' : 'none',
                                      backgroundColor: doc.isOk ? '#FFFFFF' : '#2563EB',
                                      color: doc.isOk ? '#475569' : '#FFFFFF',
                                      cursor: isUploadingThis ? 'wait' : 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '5px',
                                      boxShadow: doc.isOk ? 'none' : '0 2px 6px rgba(37, 99, 235, 0.25)',
                                      opacity: isUploadingThis ? 0.7 : 1,
                                    }}
                                  >
                                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                                      {isUploadingThis ? 'sync' : (doc.isOk ? 'cached' : 'upload_file')}
                                    </span>
                                    <span>
                                      {isUploadingThis
                                        ? 'Memproses...'
                                        : (doc.isOk ? 'Ganti File' : 'Unggah Berkas')}
                                    </span>
                                    <input
                                      type="file"
                                      accept="image/*,application/pdf"
                                      disabled={isUploadingThis}
                                      style={{ display: 'none' }}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          handleCustomerUploadDoc(doc.key, file);
                                        }
                                        e.target.value = '';
                                      }}
                                    />
                                  </label>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Tautan Khusus Mandiri untuk Customer */}
                      <div
                        style={{
                          marginTop: '16px',
                          padding: '12px 14px',
                          borderRadius: '12px',
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '10px',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: '220px' }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#2563EB' }}>link</span>
                            <span>Tautan Khusus Pelacakan &amp; Upload Berkas Anda:</span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                            {trackingLink}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopyTrackingLink(trackingResult.noPengajuan || trackingResult.noPaspor)}
                          style={{
                            padding: '7px 14px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: copiedTrackingLink ? '#16A34A' : '#0F172A',
                            color: '#FFFFFF',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                            {copiedTrackingLink ? 'check' : 'content_copy'}
                          </span>
                          <span>{copiedTrackingLink ? 'Tautan Tersalin ✓' : 'Salin Tautan'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Box Instruksi Pembayaran Khusus yang Belum Lunas */}
                {trackingResult.statusPembayaran !== 'Lunas' && (
                  !st.isSampai ? (
                    /* Kondisi 1: Berkas fisik belum sampai di kantor */
                    <div
                      style={{
                        marginTop: '16px',
                        padding: '16px',
                        borderRadius: '14px',
                        background: '#F8FAFC',
                        border: '1.5px solid #BFDBFE',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="material-symbols-outlined" style={{ color: '#2563EB', fontSize: '24px' }}>
                            local_shipping
                          </span>
                          <div>
                            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#1E3A8A' }}>
                              Status: Menunggu Berkas Fisik Tiba di Kantor MapahTrip
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#475569' }}>
                              Pendaftaran online Anda telah diterima di sistem kami
                            </div>
                          </div>
                        </div>

                        <a
                          href={getWhatsAppConfirmShipmentUrl(trackingResult)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '7px 14px',
                            borderRadius: '8px',
                            backgroundColor: '#16A34A',
                            color: '#FFFFFF',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            textDecoration: 'none',
                            boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                          }}
                        >
                          <WhatsAppBrandIcon size={16} inverted />
                          <span>Kirim Resi / Tanya Alamat Kantor</span>
                        </a>
                      </div>

                      <div
                        style={{
                          backgroundColor: '#EFF6FF',
                          borderRadius: '10px',
                          padding: '12px 14px',
                          border: '1px solid #DBEAFE',
                          fontSize: '0.78rem',
                          color: '#1E40AF',
                          lineHeight: 1.5,
                        }}
                      >
                        <div style={{ fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#2563EB' }}>info</span>
                          <span>Alur Pembayaran Biaya Layanan:</span>
                        </div>
                        <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                          <li>Kirimkan berkas fisik & paspor asli ke kantor operasional MapahTrip via kurir ekspedisi atau serah langsung.</li>
                          <li>Setelah berkas fisik tiba di kantor dan dikonfirmasi <strong>"Sampai"</strong> oleh staf operasional, Anda akan <strong>otomatis menerima notifikasi WhatsApp resmi</strong> berisi konfirmasi berkas tiba, rincian invoice resmi, dan nomor rekening pembayaran resmi (Bank BTN a.n Tokyo Asia Connection).</li>
                          <li>Pembayaran baru dilakukan setelah paspor fisik dipastikan sampai dengan aman di kantor kami.</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    /* Kondisi 2: Berkas fisik sudah sampai di kantor, silakan transfer */
                    <div
                      style={{
                        marginTop: '16px',
                        padding: '16px',
                        borderRadius: '14px',
                        background: '#FFFBEB',
                        border: '1.5px solid #FDE68A',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="material-symbols-outlined" style={{ color: '#D97706', fontSize: '24px' }}>
                            account_balance_wallet
                          </span>
                          <div>
                            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#92400E' }}>
                              Berkas Fisik Telah Tiba di Kantor MapahTrip
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#B45309' }}>
                              Silakan transfer ke rekening resmi Tokyo Asia Connection berikut:
                            </div>
                          </div>
                        </div>

                        <a
                          href={getWhatsAppPaymentConfirmationUrl(
                            'BTN',
                            trackingResult.dibayarPemohon || 1650000,
                            trackingResult
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            backgroundColor: '#16A34A',
                            color: '#FFFFFF',
                            fontSize: '0.80rem',
                            fontWeight: 700,
                            textDecoration: 'none',
                            boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                          }}
                        >
                          <WhatsAppBrandIcon size={16} inverted />
                          <span>Konfirmasi Pembayaran WA</span>
                        </a>
                      </div>

                      <div style={{ paddingTop: '8px', borderTop: '1px dashed #FCD34D' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #FDE68A', flexWrap: 'wrap', gap: '12px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 800, color: '#00529C', fontSize: '0.88rem' }}>BANK BTN</span>
                              <span style={{ fontSize: '0.68rem', backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>Rekening Resmi</span>
                            </div>
                            <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.2rem', color: '#0F172A', letterSpacing: '0.04em', margin: '4px 0' }}>
                              1190-0150-0015-870
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                              Atas Nama: <strong style={{ color: '#0F172A' }}>Tokyo Asia Connection</strong>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyRekening('119001500015870', 'track_btn')}
                            style={{
                              background: copiedRekening === 'track_btn' ? '#DCFCE7' : '#00529C',
                              color: copiedRekening === 'track_btn' ? '#15803D' : '#FFFFFF',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '8px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <span>{copiedRekening === 'track_btn' ? '✓ No. Rekening Tersalin' : 'Salin No. Rekening'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                )}

                {trackingResult.catatan && (
                  <div style={{ marginTop: '14px', padding: '10px 14px', borderRadius: '10px', background: '#eff6ff', fontSize: '0.825rem', color: '#1e40af' }}>
                    <strong>Catatan:</strong> {trackingResult.catatan}
                  </div>
                )}
              </div>
            );
          })()}
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
          <p className="jenis-visa-subtitle" style={{ color: '#64748B', fontSize: '1rem', marginTop: '6px', maxWidth: '640px', margin: '6px auto 0' }}>
            Layanan pengajuan resmi sesuai standar Kedutaan Besar Jepang &amp; VFS JVAC dengan pendampingan dokumen lengkap sampai approved.
          </p>

          {/* Category Tabs */}
          <div className="visa-category-tabs">
            {[
              { id: 'all', label: `Semua Visa (${dynamicVisaOptions.length})` },
              { id: 'turis', label: 'Turis & Waiver' },
              { id: 'kerja', label: 'Kerja Formal' },
              { id: 'magang', label: 'Pemagangan' },
              { id: 'studi', label: 'Studi (Long Stay)' },
              { id: 'transit', label: 'Transit' },
              { id: 'keluarga', label: 'Keluarga' },
              { id: 'bisnis', label: 'Bisnis' },
              { id: 'medis', label: 'Medis' },
            ].filter((tab) => {
              if (tab.id === 'all') return true;
              return dynamicVisaOptions.some((item) => {
                if (item.category === tab.id) return true;
                if (tab.id === 'kerja' && (item.category === 'khusus' || item.category === 'kerja')) return true;
                return false;
              });
            }).map((tab) => (
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

          {/* Mobile Swipe Indicator (Geser Kesamping) */}
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <div className="mobile-swipe-hint">
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>swipe_left</span>
              <span>Geser ke samping untuk pilihan visa lainnya &rarr;</span>
            </div>
          </div>
        </div>

        {/* Dynamic Visa Cards synced directly from Master Tarif */}
        <div className="visa-cards-grid">
          {dynamicVisaOptions
            .filter((item) => {
              if (activeVisaTab === 'all') return true;
              if (item.category === activeVisaTab) return true;
              if (activeVisaTab === 'kerja' && item.category === 'khusus') return true;
              return false;
            }).map((item) => {
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
                      className="visa-card-desc"
                      style={{
                        fontSize: '0.82rem',
                        color: '#475569',
                        lineHeight: 1.5,
                        marginBottom: '16px',
                        minHeight: '56px',
                        display: 'block',
                        textAlign: 'justify',
                        textJustify: 'inter-word',
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
          onMouseDown={(e) => {
            isVisaModalBackdropMouseDown.current = e.target === e.currentTarget;
          }}
          onClick={(e) => {
            // Hanya tangani jika klik dimulai dan berakhir tepat di backdrop luar
            if (e.target !== e.currentTarget || !isVisaModalBackdropMouseDown.current) {
              isVisaModalBackdropMouseDown.current = false;
              return;
            }
            isVisaModalBackdropMouseDown.current = false;

            // Jika sedang di tahap pengisian formulir pendaftaran, JANGAN pernah tutup otomatis via klik luar
            // agar data yang diketik pemohon tidak hilang tanpa sengaja saat scrolling / tap dropdown / keyboard muncul
            if (modalStep === 'form') {
              return;
            }

            setSelectedVisaModal(null);
          }}
        >
          <div
            className="modal-apply-dialog"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              position: 'relative',
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0, paddingRight: '4px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                    {selectedVisaModal.icon}
                  </span>
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3 className="modal-header-title font-serif" style={{ fontSize: '1.20rem', fontWeight: 800, color: '#0F172A', margin: 0, lineHeight: 1.25 }}>
                    {selectedVisaModal.title}
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
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

                {/* Keunggulan & Layanan Pendampingan (Rahasia Dokumen Terlindungi) */}
                <div style={{ marginBottom: '18px' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#005BB5' }}>
                      verified_user
                    </span>
                    <span>Layanan Pengurusan Visa MapahTrip:</span>
                  </h4>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '14px',
                      border: '1px solid #E2E8F0',
                      padding: '2px 14px',
                    }}
                  >
                    {[
                      'Screening & Verifikasi Berkas Sesuai SOP JVAC',
                      'Itinerary Harian & Formulir Resmi Disiapkan Tim',
                      'Panduan & Pengiriman Dokumen Praktis via WhatsApp',
                      '100% Kerahasiaan Data & Paspor Terenkripsi Aman',
                    ].map((text, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '11px 0',
                          borderBottom: idx < 3 ? '1px solid #EDF2F7' : 'none',
                          fontSize: '0.82rem',
                          color: '#1E293B',
                          fontWeight: 600,
                          lineHeight: 1.4,
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ color: '#16A34A', fontSize: '18px', flexShrink: 0 }}>
                          check_circle
                        </span>
                        <span>{text}</span>
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
                    border: hasRefChoice === 'yes'
                      ? customerRefCode.trim()
                        ? referralValidation.isValid
                          ? '1.5px solid #10B981'
                          : '1.5px solid #EF4444'
                        : '1.5px solid #005BB5'
                      : '1.5px solid #E2E8F0',
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
                    {hasRefChoice === 'yes' && (
                      customerRefCode.trim() ? (
                        referralValidation.isValid ? (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              backgroundColor: '#DCFCE7',
                              color: '#15803D',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            ✓ Kode Valid
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              backgroundColor: '#FEE2E2',
                              color: '#DC2626',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            ✕ Kode Tidak Valid
                          </span>
                        )
                      ) : (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            backgroundColor: '#FEF3C7',
                            color: '#D97706',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                          }}
                        >
                          Wajib Isi Kode
                        </span>
                      )
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
                        placeholder="Masukkan Kode Referral Resmi (contoh: MPH425MI)"
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: customerRefCode.trim()
                            ? referralValidation.isValid
                              ? '1.5px solid #10B981'
                              : '1.5px solid #EF4444'
                            : '1.5px solid #005BB5',
                          backgroundColor: '#FFFFFF',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: '#0F172A',
                          outline: 'none',
                          boxSizing: 'border-box',
                          textTransform: 'uppercase',
                        }}
                      />

                      {/* Feedback Text Real-time di Bawah Input */}
                      {customerRefCode.trim() ? (
                        referralValidation.isValid ? (
                          <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#16A34A', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>verified</span>
                            <span>Kode valid milik <strong>{referralValidation.partnerName}</strong>. Pengajuan Anda otomatis terhubung ke portal affiliate mitra.</span>
                          </div>
                        ) : (
                          <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#DC2626', display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '15px', marginTop: '1px' }}>error</span>
                            <span>Kode referral <strong>"{customerRefCode}"</strong> tidak terdaftar. Kode harus sama/sesuai kode mitra resmi (contoh: <strong>MPH425MI</strong>) agar masuk ke affiliate.</span>
                          </div>
                        )
                      ) : (
                        <div style={{ marginTop: '6px', fontSize: '0.74rem', color: '#64748B' }}>
                          Harap masukkan kode referral mitra Anda. Jika tidak punya, silakan pilih "Tidak Punya".
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* CTA BUTTON: PENGGANTI KONSULTASI VIA WHATSAPP -> DAFTAR (ISI FORMULIR) */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    disabled={hasRefChoice === 'yes' && (!customerRefCode.trim() || !referralValidation.isValid)}
                    onClick={() => {
                      if (hasRefChoice === 'yes') {
                        if (!customerRefCode.trim()) {
                          alert('Silakan masukkan kode referral mitra terlebih dahulu, atau pilih opsi "Tidak Punya".');
                          return;
                        }
                        if (!referralValidation.isValid) {
                          alert(`Kode referral "${customerRefCode}" tidak terdaftar. Harap masukkan kode referral mitra yang valid agar masuk ke affiliate.`);
                          return;
                        }
                      }
                      setModalStep('form');
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: (hasRefChoice === 'yes' && (!customerRefCode.trim() || !referralValidation.isValid)) ? '#94A3B8' : '#005BB5',
                      color: '#FFFFFF',
                      padding: '14px 20px',
                      borderRadius: '9999px',
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      border: 'none',
                      cursor: (hasRefChoice === 'yes' && (!customerRefCode.trim() || !referralValidation.isValid)) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: (hasRefChoice === 'yes' && (!customerRefCode.trim() || !referralValidation.isValid)) ? 'none' : '0 4px 14px rgba(0, 91, 181, 0.28)',
                      transition: 'all 0.15s ease',
                      opacity: (hasRefChoice === 'yes' && (!customerRefCode.trim() || !referralValidation.isValid)) ? 0.7 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!(hasRefChoice === 'yes' && (!customerRefCode.trim() || !referralValidation.isValid))) {
                        e.currentTarget.style.backgroundColor = '#00478F';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!(hasRefChoice === 'yes' && (!customerRefCode.trim() || !referralValidation.isValid))) {
                        e.currentTarget.style.backgroundColor = '#005BB5';
                      }
                    }}
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

                {hasRefChoice === 'yes' && referralValidation.isValid && (
                  <div
                    style={{
                      backgroundColor: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      marginBottom: '16px',
                      fontSize: '0.8rem',
                      color: '#1E40AF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#2563EB' }}>
                        loyalty
                      </span>
                      <span>
                        Mitra Affiliate: <strong>{referralValidation.code}</strong> {referralValidation.partnerName && referralValidation.partnerName !== '-' ? `(${referralValidation.partnerName})` : ''}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        backgroundColor: '#DCFCE7',
                        color: '#15803D',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      ✓ Terhubung ke Affiliate
                    </span>
                  </div>
                )}

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

                      {/* Input Kode Referral Mitra (Affiliate) */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
                          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>
                            Kode Referral Mitra (Opsional)
                          </label>
                          {customerRefCode.trim() && (
                            referralValidation.isValid ? (
                              <span style={{ fontSize: '0.7rem', color: '#16A34A', fontWeight: 700, backgroundColor: '#DCFCE7', padding: '2px 8px', borderRadius: '9999px', whiteSpace: 'nowrap' }}>
                                ✓ {referralValidation.partnerName && referralValidation.partnerName !== '-' ? `Mitra: ${referralValidation.partnerName}` : 'Mitra Terhubung'}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.7rem', color: '#DC2626', fontWeight: 700, backgroundColor: '#FEE2E2', padding: '2px 8px', borderRadius: '9999px', whiteSpace: 'nowrap' }}>
                                ✕ Kode Tidak Dikenali
                              </span>
                            )
                          )}
                        </div>
                        <input
                          type="text"
                          value={customerRefCode}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            setCustomerRefCode(val);
                            setHasRefChoice(val.trim() ? 'yes' : 'no');
                            if (val.trim()) {
                              localStorage.setItem('mapahtrip_customer_ref', val);
                            } else {
                              localStorage.removeItem('mapahtrip_customer_ref');
                            }
                          }}
                          placeholder="Masukkan kode mitra jika ada (contoh: MPH425MI atau MPC)"
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: customerRefCode.trim()
                              ? referralValidation.isValid
                                ? '1.5px solid #10B981'
                                : '1.5px solid #EF4444'
                              : '1px solid #CBD5E1',
                            fontSize: '0.88rem',
                            fontWeight: customerRefCode.trim() ? 700 : 400,
                            outline: 'none',
                            boxSizing: 'border-box',
                            backgroundColor: '#F8FAFC',
                            color: '#0F172A',
                            textTransform: 'uppercase',
                          }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = '#005BB5')}
                          onBlur={(e) => {
                            if (customerRefCode.trim()) {
                              e.currentTarget.style.borderColor = referralValidation.isValid ? '#10B981' : '#EF4444';
                            } else {
                              e.currentTarget.style.borderColor = '#CBD5E1';
                            }
                          }}
                        />
                        <div style={{ marginTop: '4px', fontSize: '0.72rem', color: '#64748B' }}>
                          💡 Pemohon yang menggunakan kode mitra akan otomatis terhubung ke portal mitra &amp; staf operasional.
                        </div>
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

                      {/* Program Khusus Visa Waiver: 100% Online JAVES Pusat, Tidak Perlu Konsulat Fisik */}
                      {((selectedVisaModal?.title || '').toLowerCase().includes('waiver') || (selectedVisaModal?.id || '').toLowerCase().includes('waiver')) ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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

                          <div
                            style={{
                              backgroundColor: '#F0FDF4',
                              border: '1.5px solid #86EFAC',
                              borderRadius: '12px',
                              padding: '12px 14px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                            }}
                          >
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                backgroundColor: '#DCFCE7',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                color: '#16A34A',
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                                cloud_done
                              </span>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#166534' }}>
                                Layanan Pengurusan Khusus (Tanpa Kirim Paspor Fisik)
                              </div>
                              <div style={{ fontSize: '0.74rem', color: '#15803D', marginTop: '2px', lineHeight: 1.4 }}>
                                Bebas antre konsulat &amp; tanpa kirim paspor fisik. Pengurusan diproses langsung oleh Tim Konsultan Pusat MapahTrip.
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
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
                              PIC Konsuler: <strong>{selectedVisaModal?.title?.toLowerCase().includes('kunjungan')
                                ? 'Ulla (Spesialis Visa Kunjungan Seluruh Wilayah)'
                                : (formKonsjen === 'Surabaya'
                                  ? 'Nanami Kay'
                                  : formKonsjen === 'Denpasar'
                                  ? 'Yulia'
                                  : formKonsjen === 'Medan'
                                  ? 'Heru'
                                  : formKonsjen === 'Makassar'
                                  ? 'Latifah'
                                  : 'Rizky')}</strong>
                            </span>
                          </div>
                        </>
                      )}

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

                    <div className="modal-paket-grid">
                      {[
                        { id: 'Reguler' as const, title: 'Reguler', desc: 'Standar QC & Submit', price: getNominalVisa(selectedVisaModal?.title, 'Reguler') },
                        { id: 'Premium' as const, title: 'Premium', desc: 'Prioritas & Cepat', price: getNominalVisa(selectedVisaModal?.title, 'Premium') },
                        { id: 'TAC' as const, title: 'TAC', desc: 'Pendampingan All-in', price: getNominalVisa(selectedVisaModal?.title, 'TAC') },
                      ].map((pkg) => {
                        const isSelected = formPaket === pkg.id;
                        return (
                          <div
                            key={pkg.id}
                            className="modal-paket-card"
                            onClick={() => setFormPaket(pkg.id)}
                            style={{
                              border: isSelected ? '2px solid #005BB5' : '1px solid #E2E8F0',
                              backgroundColor: isSelected ? '#EFF6FF' : '#F8FAFC',
                              boxShadow: isSelected ? '0 2px 8px rgba(0, 91, 181, 0.15)' : 'none',
                            }}
                          >
                            <div className="modal-paket-card-left">
                              <div
                                className="modal-paket-card-radio"
                                style={{
                                  border: isSelected ? '5px solid #005BB5' : '2px solid #CBD5E1',
                                  backgroundColor: '#FFFFFF',
                                }}
                              />
                              <div className="modal-paket-card-info">
                                <div className="modal-paket-title" style={{ color: isSelected ? '#005BB5' : '#1E293B' }}>
                                  {pkg.title}
                                </div>
                                <div className="modal-paket-desc" style={{ color: isSelected ? '#1E40AF' : '#64748B' }}>
                                  {pkg.desc}
                                </div>
                              </div>
                            </div>
                            <div
                              className="modal-paket-card-price"
                              style={{
                                color: isSelected ? '#005BB5' : '#15803D',
                                fontFamily: 'monospace',
                              }}
                            >
                              {formatRupiah(pkg.price)}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Total Biaya Card Sesuai Paket Terpilih */}
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        backgroundColor: '#F8FAFC',
                        border: '1.5px solid #E2E8F0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Total Biaya Layanan ({formPaket})
                        </div>
                        <div style={{ fontSize: '1.20rem', fontWeight: 900, color: '#0F172A', fontFamily: 'monospace', marginTop: '2px', whiteSpace: 'nowrap' }}>
                          {formatRupiah(getNominalVisa(selectedVisaModal?.title, formPaket))}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: '#15803D',
                          backgroundColor: '#DCFCE7',
                          border: '1px solid #86EFAC',
                          borderRadius: '9999px',
                          padding: '4px 10px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>verified</span>
                        <span>Resmi &amp; Transparan</span>
                      </div>
                    </div>

                    {/* Catatan Transparansi Biaya & Penyesuaian Kasus (Opsi B) */}
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        backgroundColor: '#F8FAFC',
                        border: '1px dashed #CBD5E1',
                        fontSize: '0.72rem',
                        color: '#475569',
                        lineHeight: 1.45,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '6px',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#0284C7', marginTop: '1px', flexShrink: 0 }}>
                        info
                      </span>
                      <div>
                        <strong>Estimasi Biaya Layanan:</strong> Nominal di atas merupakan tarif dasar jasa pengurusan. Total biaya akhir dapat disesuaikan oleh tim konsultan MapahTrip berdasarkan jenis program visa, kelengkapan dokumen persyaratan, serta biaya resmi loket Kedutaan/JVAC saat konsultasi berkas via WhatsApp.
                      </div>
                    </div>
                  </div>

                  {/* PANDUAN PENGIRIMAN BERKAS LANGSUNG VIA WHATSAPP */}
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      backgroundColor: '#F0FDF4',
                      border: '1px solid #BBF7D0',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: '#DCFCE7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#16A34A' }}>
                        chat
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#15803D', lineHeight: 1.45, flex: 1, textAlign: 'left' }}>
                      <strong>Pengiriman Berkas Praktis via WhatsApp:</strong>
                      <div style={{ color: '#475569', marginTop: '2px', textAlign: 'left' }}>
                        Tidak perlu unggah berkas di website. Tim konsultan kami akan menghubungi Anda via WhatsApp untuk panduan &amp; penerimaan dokumen.
                      </div>
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <button
                      type="submit"
                      disabled={formSubmitting}
                      style={{
                        flex: 1,
                        backgroundColor: '#005BB5',
                        color: '#FFFFFF',
                        minHeight: '46px',
                        padding: '10px 16px',
                        borderRadius: '9999px',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        border: 'none',
                        cursor: formSubmitting ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 14px rgba(0, 91, 181, 0.25)',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                        opacity: formSubmitting ? 0.7 : 1,
                        boxSizing: 'border-box',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#00478F')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#005BB5')}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        send
                      </span>
                      <span>
                        {formSubmitting ? 'Memproses...' : 'Kirim Pendaftaran'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalStep('detail')}
                      style={{
                        minHeight: '46px',
                        padding: '10px 18px',
                        borderRadius: '9999px',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#FFFFFF',
                        color: '#475569',
                        fontWeight: 600,
                        fontSize: '0.86rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        whiteSpace: 'nowrap',
                        boxSizing: 'border-box',
                      }}
                    >
                      Kembali
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 3: SUKSES PENDAFTARAN & PANDUAN PENGIRIMAN BERKAS FISIK */}
            {modalStep === 'success' && (
              <div style={{ textAlign: 'center', padding: '6px 2px' }}>
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 14px',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.15)',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>
                    mark_email_read
                  </span>
                </div>

                <h3 className="font-serif" style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                  Pendaftaran Berhasil Diterima!
                </h3>
                <p style={{ fontSize: '0.84rem', color: '#64748B', lineHeight: 1.5, maxWidth: '520px', margin: '0 auto 18px' }}>
                  Data permohonan visa Anda telah tercatat aman di sistem MapahTrip. Silakan ikuti panduan pengiriman berkas fisik di bawah ini.
                </p>

                {/* Card ID Pengajuan & Estimasi Tagihan */}
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1.5px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '16px',
                    textAlign: 'left',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#005BB5', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        ID Pendaftaran Anda:
                      </span>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'monospace', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        {newSubmittedApplicant?.noPengajuan || 'MT-XXXX'}
                        <button
                          type="button"
                          onClick={() => handleCopyRekening(newSubmittedApplicant?.noPengajuan || '', 'id_pengajuan')}
                          style={{
                            background: copiedRekening === 'id_pengajuan' ? '#DCFCE7' : '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            cursor: 'pointer',
                            color: copiedRekening === 'id_pengajuan' ? '#15803D' : '#475569',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                          }}
                          title="Salin ID Pendaftaran"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                            {copiedRekening === 'id_pengajuan' ? 'check' : 'content_copy'}
                          </span>
                          <span>{copiedRekening === 'id_pengajuan' ? 'Tersalin' : 'Salin'}</span>
                        </button>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block' }}>
                        Estimasi Biaya Visa:
                      </span>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
                        {formatRupiah(newSubmittedApplicant?.dibayarPemohon || 1650000)}
                      </div>
                      <span style={{ fontSize: '0.68rem', color: '#16A34A', fontWeight: 600 }}>
                        (Dibayar setelah berkas sampai &amp; diverifikasi)
                      </span>
                    </div>
                  </div>

                  {/* Ringkasan Singkat */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', paddingTop: '10px', borderTop: '1px solid #E2E8F0', fontSize: '0.78rem' }}>
                    <div>
                      <span style={{ color: '#64748B' }}>Pemohon:</span>{' '}
                      <strong style={{ color: '#0F172A' }}>{newSubmittedApplicant?.namaPemohon || formNama}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Program:</span>{' '}
                      <strong style={{ color: '#0F172A' }}>{newSubmittedApplicant?.program || selectedVisaModal?.title}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Paket:</span>{' '}
                      <strong style={{ color: '#005BB5' }}>{newSubmittedApplicant?.paket || formPaket}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Konsulat Tujuan:</span>{' '}
                      <strong style={{ color: '#0F172A' }}>Konsjen {newSubmittedApplicant?.konsjen || formKonsjen}</strong>
                    </div>
                  </div>
                </div>

                {/* Box Panduan Alur Pengiriman Berkas & Pembayaran */}
                <div
                  style={{
                    backgroundColor: '#F0FDF4',
                    border: '1.5px solid #BBF7D0',
                    borderRadius: '16px',
                    padding: '16px',
                    textAlign: 'left',
                    marginBottom: '18px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 800, fontSize: '0.88rem', marginBottom: '12px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#16A34A' }}>
                      local_shipping
                    </span>
                    <span>Langkah Selanjutnya: Pengiriman Berkas &amp; Pembayaran</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.80rem', color: '#334155', lineHeight: 1.5 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#DCFCE7', color: '#15803D', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.75rem' }}>1</span>
                      <div>
                        <strong style={{ color: '#0F172A' }}>Kirim Berkas Fisik &amp; Paspor Asli:</strong>
                        <div style={{ color: '#64748B', marginTop: '2px' }}>
                          Kirimkan paspor asli &amp; berkas fisik persyaratan ke kantor operasional MapahTrip (Ruko Palumboncity, Jl. Manunggal VII No. 3, Palumbonsari, Karawang Timur, Jawa Barat 41314) via kurir ekspedisi (JNE, J&amp;T, TIKI, Gosend/Grab) atau diserahkan langsung.
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#DCFCE7', color: '#15803D', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.75rem' }}>2</span>
                      <div>
                        <strong style={{ color: '#0F172A' }}>Verifikasi Berkas oleh Staf Operasional:</strong>
                        <div style={{ color: '#64748B', marginTop: '2px' }}>
                          Setibanya dokumen di kantor, tim staf kami akan melakukan pengecekan keaslian, kelengkapan, dan foto paspor Anda sesuai standar resmi Konsulat Jepang.
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#DCFCE7', color: '#15803D', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.75rem' }}>3</span>
                      <div>
                        <strong style={{ color: '#15803D' }}>Notifikasi WhatsApp &amp; Tagihan Resmi Dikirimkan:</strong>
                        <div style={{ color: '#166534', marginTop: '2px', backgroundColor: '#FFFFFF', padding: '8px 12px', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
                          💬 <strong>PENTING:</strong> Begitu berkas fisik telah tiba &amp; dikonfirmasi <em>"Sampai"</em> oleh staf kami, Anda akan <strong>otomatis menerima WhatsApp resmi</strong> berisi konfirmasi berkas tiba, rincian invoice tagihan, dan nomor rekening transfer resmi (Bank BTN a.n Tokyo Asia Connection).
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#DCFCE7', color: '#15803D', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.75rem' }}>4</span>
                      <div>
                        <strong style={{ color: '#0F172A' }}>Pembayaran Dilakukan Setelah Berkas Sampai:</strong>
                        <div style={{ color: '#64748B', marginTop: '2px' }}>
                          Anda tidak perlu membayar sekarang. Pembayaran baru ditransfer setelah berkas fisik dipastikan sampai dengan aman di kantor kami.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tombol Aksi WhatsApp & Lacak Paspor */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <a
                    href={getWhatsAppConfirmShipmentUrl(newSubmittedApplicant)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      backgroundColor: '#16A34A',
                      color: '#FFFFFF',
                      padding: '13px 20px',
                      borderRadius: '9999px',
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      textDecoration: 'none',
                      boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#15803D')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#16A34A')}
                  >
                    <WhatsAppBrandIcon size={20} inverted />
                    <span>Konfirmasi Pengiriman Berkas / Tanya Alamat via WhatsApp</span>
                  </a>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => handleDoneAndTrack(newSubmittedApplicant)}
                      style={{
                        flex: 1,
                        backgroundColor: '#005BB5',
                        color: '#FFFFFF',
                        padding: '12px 18px',
                        borderRadius: '9999px',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(0, 91, 181, 0.25)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#00478F')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#005BB5')}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        search_check
                      </span>
                      <span>Lacak Status Paspor</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedVisaModal(null)}
                      style={{
                        padding: '12px 18px',
                        borderRadius: '9999px',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#FFFFFF',
                        color: '#64748B',
                        fontWeight: 600,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                      }}
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Email Contact Modal */}
      {showEmailModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEmailModal(false);
          }}
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
                  fontSize: 'clamp(1.65rem, 3.6vw, 3.4rem)',
                  fontWeight: 900,
                  color: isDarkMode ? '#FFFFFF' : '#0B1220',
                  lineHeight: 1.15,
                  letterSpacing: '-0.025em',
                  margin: '0 0 6px',
                  textAlign: 'left',
                  textWrap: 'balance',
                }}
              >
                Kami bukan travel umum
              </h2>
              <div
                style={{
                  fontSize: 'clamp(1.65rem, 3.6vw, 3.4rem)',
                  fontWeight: 900,
                  color: '#0284c7',
                  lineHeight: 1.15,
                  letterSpacing: '-0.025em',
                  margin: '0 0 20px',
                  textAlign: 'left',
                  textWrap: 'balance',
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
              className="faq-subtitle"
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

          {/* Mobile Swipe Indicator (Geser Kesamping) */}
          <div style={{ textAlign: 'center', marginTop: '16px', marginBottom: '8px' }}>
            <div className="mobile-swipe-hint">
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>swipe_left</span>
              <span>Geser ke samping untuk pertanyaan lainnya &rarr;</span>
            </div>
          </div>

          {/* FAQ Cards Grid (Desktop: 2 Columns, Mobile: Horizontal Swipe Carousel) */}
          <div className="faq-cards-grid">
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
              {
                idx: 3,
                q: 'Apakah MAPAHTRIP menyediakan reservasi tiket pesawat & hotel sementara?',
                a: 'Ya, 100% sudah termasuk. Kami siapkan bukti reservasi tiket pesawat PP Jepang dan pemesanan hotel sementara + itinerary harian dalam bahasa Inggris/Jepang sesuai standar Kedutaan. Anda tidak perlu beli tiket pesawat lunas sebelum visa disetujui.',
              },
              {
                idx: 4,
                q: 'Bagaimana jika visa ditolak?',
                a: 'Approval rate kami 100% karena screening ketat di awal. Jika ditolak karena kesalahan kami, biaya jasa kami refund. Biaya JVAC/Kedutaan mengikuti aturan kedutaan.',
              },
            ].map((item) => {
              const isOpen = openFaqIndex === item.idx;
              return (
                <div
                  key={item.idx}
                  className={`faq-accordion-item faq-card-item ${isOpen ? 'is-open' : ''}`}
                  style={{
                    backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
                    borderRadius: '16px',
                    border: isOpen ? '1.5px solid #005bb5' : (isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0'),
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
                          backgroundColor: isOpen ? '#005bb5' : (isDarkMode ? '#0F172A' : '#F1F5F9'),
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
                      className="material-symbols-outlined faq-chevron-icon"
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

                  <div
                    className={`faq-answer-content ${isOpen ? 'is-open' : ''}`}
                    style={{
                      padding: '0 20px 18px 60px',
                      color: isDarkMode ? '#CBD5E1' : '#475569',
                      fontSize: '0.9rem',
                      lineHeight: 1.6,
                      borderTop: isDarkMode ? '1px dashed #334155' : '1px dashed #F1F5F9',
                      paddingTop: '12px',
                      textAlign: 'justify',
                      textJustify: 'inter-word',
                    }}
                  >
                    {item.a}
                  </div>
                </div>
              );
            })}
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
                  className="duo-card-title"
                  style={{
                    color: isDarkMode ? '#FFFFFF' : '#0F172A',
                  }}
                >
                  <span>Siap Berangkat ke Jepang?</span><br />
                  <span style={{ color: isDarkMode ? '#93C5FD' : '#005BB5' }}>Chat Japan Expert Sekarang.</span>
                </h3>

                {/* Subtitle */}
                <p
                  className="duo-card-desc"
                  style={{
                    color: isDarkMode ? '#94A3B8' : '#475569',
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
              <div className="duo-card-actions">
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
                  className="duo-card-title"
                  style={{
                    color: isDarkMode ? '#FFFFFF' : '#0F172A',
                  }}
                >
                  <span>Punya Rekan atau Siswa LPK?</span><br />
                  <span style={{ color: isDarkMode ? '#93C5FD' : '#005BB5' }}>Dapatkan Komisi Resmi <span style={{ whiteSpace: 'nowrap' }}>via Transfer.</span></span>
                </h3>

                {/* Subtitle */}
                <p
                  className="duo-card-desc"
                  style={{
                    color: isDarkMode ? '#94A3B8' : '#475569',
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
              <div className="duo-card-actions duo-card-actions-mitra">
                <a
                  href="#affiliate-register"
                  className="duo-btn-primary"
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

                <div className="duo-btn-subgroup">
                  <a
                    href="#affiliate-login"
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

                  <a
                    href="#affiliate-demo"
                    style={{
                      backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.14)' : '#FFFBEB',
                      color: isDarkMode ? '#FCD34D' : '#B45309',
                      border: isDarkMode ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid #FDE68A',
                      padding: '12px 20px',
                      borderRadius: '9999px',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      textDecoration: 'none',
                      boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(180, 83, 9, 0.08)',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(245, 158, 11, 0.25)' : '#FEF3C7';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(245, 158, 11, 0.14)' : '#FFFBEB';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#D97706' }}>
                      visibility
                    </span>
                    <span>
                      <span className="duo-text-mobile">Coba Demo</span>
                      <span className="duo-text-desktop">Coba Demo Dashboard</span>
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Footer Utama Sebelumnya (Dark) */}
      <footer className="customer-main-footer" style={{ backgroundColor: '#0B1220', color: '#ffffff', padding: '60px 24px 30px' }}>
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
          <div className="footer-brand-col" style={{ flex: '1 1 360px', maxWidth: '480px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <img
                src={logoPutih}
                alt="Mapahtrip.id"
                onError={(e) => handleImageFallback(e, getLogoPutihFallbacks())}
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
            <p className="footer-brand-desc" style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.6, marginTop: '8px', maxWidth: '100%' }}>
              Layanan jasa pengurusan visa Jepang independen &amp; profesional. Fokus 100% visa Jepang: Tourist, Waiver, e-Visa, Bisnis, Kunjungan Keluarga, Pelajar, Transit, dan Dependent.
            </p>
            <div style={{ marginTop: '14px' }}>
              <a
                href="https://wa.me/6281401735648?text=Halo%20MapahTrip,%20saya%20ingin%20konsultasi%20pengajuan%20Visa%20Jepang"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-wa-link"
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
            <div className="footer-col-visa" style={{ flex: '0 0 auto', minWidth: '140px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '14px', color: '#ffffff' }}>Jenis Visa</div>
              <div className="footer-visa-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                {dynamicVisaOptions.map((item) => (
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

            {/* Column 3: Sosial Media & Kontak */}
            <div className="footer-col-social" style={{ flex: '0 0 auto', minWidth: '150px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '14px', color: '#ffffff' }}>Sosial Media &amp; Kontak</div>
              <div className="footer-social-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
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
                  <span>
                    <span style={{ color: '#94A3B8', fontWeight: 500, marginRight: '4px' }}>Instagram:</span>
                    <strong style={{ color: 'inherit' }}>@mapahtrip.id</strong>
                  </span>
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
                  <span>
                    <span style={{ color: '#94A3B8', fontWeight: 500, marginRight: '4px' }}>TikTok:</span>
                    <strong style={{ color: 'inherit' }}>@mapahtrip.id</strong>
                  </span>
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
                  <span>
                    <span style={{ color: '#94A3B8', fontWeight: 500, marginRight: '4px' }}>Email:</span>
                    <strong style={{ color: 'inherit', fontFamily: 'monospace' }}>mapahtripid@gmail.com</strong>
                  </span>
                </a>
              </div>
            </div>

            {/* Column 4: Bantuan */}
            <div className="footer-col-bantuan" style={{ flex: '0 0 auto', minWidth: '120px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '14px', color: '#ffffff' }}>Bantuan</div>
              <div className="footer-bantuan-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                <a
                  href="#kenapa-kami"
                  style={{ color: '#cbd5e1', textDecoration: 'none', transition: 'color 0.15s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#cbd5e1')}
                >
                  Kenapa Kami
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
            <div className="footer-col-kantor" style={{ flex: '0 0 auto', minWidth: '190px', maxWidth: '100%' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  marginBottom: '14px',
                  color: '#ffffff',
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="10" r="2.5" fill="#0ea5e9" />
                  <path d="M12 12.5v3.5" />
                </svg>
                <span>Kantor Operasional Mapahtrip</span>
              </div>
              <div className="footer-kantor-details" style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                <div
                  className="footer-kantor-cardlet"
                  style={{ display: 'block' }}
                >
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Lokasi kantor</span>
                  </div>
                  <div style={{ color: '#ffffff', fontWeight: 600 }}>Ruko Palumboncity</div>
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Jl. Manunggal VII No. 3, Palumbonsari, Kec. Karawang Timur, Kab. Karawang, Jawa Barat 41314</div>
                </div>

                <div className="footer-kantor-cardlet">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '3px' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="#0ea5e9" style={{ flexShrink: 0 }}>
                      <path d="M21 3L3 10.53v.98l6.84 2.65L12.48 21h.99L21 3z" />
                    </svg>
                    <span>Wilayah &amp; Akses</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Karawang Timur (Penerimaan berkas fisik &amp; koordinasi konsulat se-Indonesia).</div>
                </div>

                <div className="footer-kantor-cardlet">
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
          className="footer-bottom-bar"
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
          <div style={{ maxWidth: '720px', fontSize: '0.74rem', color: '#64748B', lineHeight: 1.6, textAlign: 'justify', textJustify: 'inter-word' }}>
            Disclaimer: Mapahtrip.id adalah penyedia jasa bantuan pengurusan visa Jepang independen dan tidak berafiliasi dengan Kedutaan Besar Jepang, JVAC, atau VFS Global. Keputusan pemberian visa sepenuhnya kewenangan Kedutaan Besar Jepang. Kami membantu menyiapkan dokumen sesuai standar terbaru 2026.
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748B', whiteSpace: 'nowrap', textAlign: 'right' }}>
            &copy; {new Date().getFullYear()} Mapahtrip.id &bull; Made for Japan Lovers ⛩️ 🌸
          </div>
        </div>
      </footer>
      {/* Floating Customer Service Avatar with WhatsApp Badge (Pojok Kanan Bawah) */}
      <a
        href="https://wa.me/6281401735648?text=Halo%20MapahTrip,%20saya%20ingin%20konsultasi%20pengajuan%20Visa%20Jepang"
        target="_blank"
        rel="noopener noreferrer"
        className="floating-cs-button"
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

      {/* Preview Dokumen Upload Customer Modal */}
      {previewCustomerDoc && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewCustomerDoc(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
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
              borderRadius: '18px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>
                {previewCustomerDoc.title}
              </div>
              <button
                type="button"
                onClick={() => setPreviewCustomerDoc(null)}
                style={{
                  border: 'none',
                  background: '#F1F5F9',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#475569',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', textAlign: 'center', backgroundColor: '#F8FAFC' }}>
              {previewCustomerDoc.isPdf ? (
                <iframe
                  src={previewCustomerDoc.url}
                  title={previewCustomerDoc.title}
                  style={{ width: '100%', height: '500px', border: 'none', borderRadius: '8px' }}
                />
              ) : (
                <img
                  src={previewCustomerDoc.url}
                  alt={previewCustomerDoc.title}
                  style={{ maxWidth: '100%', maxHeight: '550px', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
              )}
            </div>

            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={() => setPreviewCustomerDoc(null)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.825rem',
                  cursor: 'pointer',
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instagram Story Viewer Modal */}
      {activeStoryHighlightId && (
        <InstagramStoryViewer
          highlights={STORY_HIGHLIGHTS}
          activeHighlightId={activeStoryHighlightId}
          onClose={() => setActiveStoryHighlightId(null)}
          onSelectHighlight={(id) => setActiveStoryHighlightId(id)}
        />
      )}

    </div>
  );
};
