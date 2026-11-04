import React, { useState, useEffect, useMemo } from 'react';
import type { Pengajuan, AffiliateUser } from '../types';
import { fetchAllMitraFromDB } from '../lib/supabase';
import { REAL_SPREADSHEET_AFFILIATES } from '../data/spreadsheetData';
import { compressImageUnder100KB } from '../utils/imageCompressor';

const formatTanggalIndo = (dateStr: string) => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
  }
  return dateStr;
};

interface AffiliateViewProps {
  pengajuanList?: Pengajuan[];
  onUpdatePengajuan?: (updatedItem: Pengajuan) => void;
  onNavigateToPengajuan?: (refCode: string) => void;
  isOwner?: boolean;
  onAffiliatesCountChange?: (count: number) => void;
}

export const AffiliateView: React.FC<AffiliateViewProps> = ({
  pengajuanList = [],
  onUpdatePengajuan,
  onNavigateToPengajuan,
  isOwner = false,
  onAffiliatesCountChange,
}) => {
  const [affiliates, setAffiliates] = useState<AffiliateUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'has_applicants' | 'no_applicants'>('all');
  const [mainViewTab, setMainViewTab] = useState<'mitra' | 'payout_queue' | 'payout_history'>('mitra');
  const [selectedMitra, setSelectedMitra] = useState<any | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // State Payout Komisi oleh Owner
  const [payoutTarget, setPayoutTarget] = useState<{
    candidate: Pengajuan;
    mitra: any;
  } | null>(null);
  const [payoutTanggal, setPayoutTanggal] = useState<string>('');
  const [payoutNoRef, setPayoutNoRef] = useState<string>('');
  const [payoutBuktiFile, setPayoutBuktiFile] = useState<string | null>(null);
  const [payoutBuktiSizeKB, setPayoutBuktiSizeKB] = useState<number>(0);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [payoutSuccessModal, setPayoutSuccessModal] = useState<{
    mitraNama: string;
    nominal: number;
    pemohonNama: string;
    noWa: string;
    waUrl: string | null;
  } | null>(null);
  const [payoutCatatan, setPayoutCatatan] = useState<string>('');
  const [showAdvancedPayout, setShowAdvancedPayout] = useState(false);
  const [isCopiedRek, setIsCopiedRek] = useState(false);
  const [previewBuktiTF, setPreviewBuktiTF] = useState<{
    candidate: Pengajuan;
    mitra: any;
    payoutData: any;
  } | null>(null);

  // State untuk fitur Ganti/Edit Foto Bukti Transfer (Khusus Owner)
  const [editProofFile, setEditProofFile] = useState<string | null>(null);
  const [editProofSizeKB, setEditProofSizeKB] = useState<number | null>(null);
  const [isCompressingProof, setIsCompressingProof] = useState<boolean>(false);
  const [isSavingProof, setIsSavingProof] = useState<boolean>(false);
  const [editProofSuccess, setEditProofSuccess] = useState<boolean>(false);

  // Load live data mitra dari Supabase & LocalStorage
  const loadAffiliates = async () => {
    setIsLoading(true);
    try {
      const userMap = new Map<string, AffiliateUser>();

      // Daftar kode dummy / uji coba bawaan template lama yang wajib dibersihkan
      const DUMMY_CODES = new Set([
        'TOKUTEI-INDONESIA',
        'SUB-NIPPON-ACADEMY',
        'BALI-HIKARI-CARE',
        'LPK-JAPANCENTER',
        'MEDAN-SAKURA-TRIP',
        'MAKASSAR-NIPPON',
      ]);

      const isDummy = (code?: string, name?: string) => {
        const c = (code || '').trim().toUpperCase();
        const n = (name || '').trim().toLowerCase();
        return DUMMY_CODES.has(c) || n.includes('admin komunitas') || n.includes('kenji tanaka') || n.includes('made yuliana');
      };

      // 1. Baca data dari localStorage all affiliates (abaikan data dummy)
      try {
        const raw = localStorage.getItem('mapahtrip_all_affiliates');
        if (raw) {
          const locals: AffiliateUser[] = JSON.parse(raw);
          locals.forEach((u) => {
            const key = (u.affiliateCode || u.email || '').trim().toUpperCase();
            if (key && !isDummy(u.affiliateCode, u.nama)) userMap.set(key, u);
          });
        }
      } catch {}

      // 2. Baca current affiliate dari localStorage (misal Syafiq Abdurrahman)
      try {
        const curRaw = localStorage.getItem('mapahtrip_current_affiliate');
        if (curRaw) {
          const cur: AffiliateUser = JSON.parse(curRaw);
          const key = (cur.affiliateCode || cur.email || '').trim().toUpperCase();
          if (key && !isDummy(cur.affiliateCode, cur.nama)) userMap.set(key, cur);
        }
      } catch {}

      // 3. Ambil data real-time dari Supabase Cloud
      try {
        const dbUsers = await fetchAllMitraFromDB();
        if (dbUsers && dbUsers.length > 0) {
          dbUsers.forEach((u) => {
            const key = (u.affiliateCode || u.email || '').trim().toUpperCase();
            if (key && !isDummy(u.affiliateCode, u.nama)) userMap.set(key, u);
          });
        }
      } catch (err) {
        console.warn('Gagal memuat mitra dari Supabase:', err);
      }

      // 4. Default baseline mitra terdaftar dari data spreadsheet resmi (63 mitra)
      REAL_SPREADSHEET_AFFILIATES.forEach((m) => {
        const key = m.affiliateCode.trim().toUpperCase();
        if (!isDummy(m.affiliateCode, m.nama)) {
          if (!userMap.has(key)) {
            userMap.set(key, m);
          } else {
            // Merge data agar atribut spreadsheet (seperti totalBonus & namaBank) tetap lengkap
            userMap.set(key, { ...m, ...userMap.get(key) });
          }
        }
      });

      const finalAffiliates = Array.from(userMap.values()).filter(
        (u) => !isDummy(u.affiliateCode, u.nama)
      );
      setAffiliates(finalAffiliates);
      const externalMitraCount = finalAffiliates.filter(
        (u) => (u.affiliateCode || '').trim().toUpperCase() !== 'MAPAHTRIP' && !u.nama?.toLowerCase().includes('owner')
      ).length;
      onAffiliatesCountChange?.(externalMitraCount);

      // Simpan kembali ke localStorage untuk membersihkan data dummy secara permanen dari browser
      try {
        localStorage.setItem('mapahtrip_all_affiliates', JSON.stringify(finalAffiliates));
      } catch {}
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAffiliates();
  }, []);

  const formatRupiah = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  const handleCopyCode = (code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Hitung jumlah pemohon riil per mitra dari daftar pengajuan aktif
  const getMitraApplicants = (code: string) => {
    if (!code) return [];
    const cleanCode = code.trim().toUpperCase();
    return pengajuanList.filter((p) => {
      const pCode = (p.affiliateCode || '').trim().toUpperCase();
      return pCode && pCode === cleanCode;
    });
  };

  // Helper mendapatkan data Payout Komisi
  const getPayoutData = (candId: string) => {
    try {
      const raw = localStorage.getItem('mapahtrip_affiliate_payouts');
      if (raw) {
        const map = JSON.parse(raw);
        if (map[candId]) return map[candId];
      }
    } catch {}
    const found = pengajuanList.find((p) => p.id === candId);
    if (found && found.payoutStatus === 'Berhasil Ditransfer') {
      return {
        noRef: found.payoutNoRef || `TRX-MPC-${found.id.replace(/\D/g, '').slice(-6) || '202601'}`,
        tanggalTransfer: found.payoutTanggal || found.tglSelesai || 'Hari ini',
        buktiTransferUrl: found.payoutBuktiUrl,
        nominal: found.referralFee || 100000,
        transferredBy: found.payoutBy || 'Owner MapahTrip',
        catatanOwner: found.payoutCatatan,
        status: 'Berhasil Ditransfer',
      };
    }
    return null;
  };

  const handleOpenPayoutModal = (cand: Pengajuan, mitra: any) => {
    setPayoutTarget({ candidate: cand, mitra });
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    setPayoutTanggal(`${yyyy}-${mm}-${dd}`);
    setPayoutNoRef(`TRX-PAYOUT-${yyyy}${mm}${dd}-${Math.floor(1000 + Math.random() * 9000)}`);
    setPayoutBuktiFile(null);
    setPayoutBuktiSizeKB(0);
    setIsCompressing(false);
    setPayoutCatatan('');
    setShowAdvancedPayout(false);
    setIsCopiedRek(false);
  };

  const handleConfirmPayout = () => {
    if (!payoutTarget) return;
    const { candidate, mitra } = payoutTarget;
    const now = new Date();
    const formattedTanggal = formatTanggalIndo(payoutTanggal) || now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    const finalNoRef = payoutNoRef || `TRX-PAYOUT-${now.getFullYear()}${String(now.getMonth()+1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const payoutRecord = {
      id: `PAYOUT-${candidate.id}`,
      pengajuanId: candidate.id,
      noPengajuan: candidate.noPengajuan || `#${candidate.id}`,
      namaPemohon: candidate.namaPemohon,
      programVisa: candidate.program,
      konsulat: candidate.konsjen,
      affiliateCode: mitra.affiliateCode,
      mitraNama: mitra.nama,
      mitraBank: mitra.namaBank || 'BCA',
      mitraRekening: mitra.nomorRekening || '-',
      mitraAtasNama: mitra.atasNamaRekening || mitra.nama,
      nominal: candidate.referralFee || 100000,
      tanggalTransfer: formattedTanggal,
      waktuTransfer: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
      noRef: finalNoRef,
      buktiTransferUrl: payoutBuktiFile || undefined,
      catatanOwner: payoutCatatan || undefined,
      status: 'Berhasil Ditransfer',
      transferredBy: 'Owner MapahTrip',
    };

    // 1. Simpan ke mapahtrip_affiliate_payouts
    try {
      const raw = localStorage.getItem('mapahtrip_affiliate_payouts');
      const map = raw ? JSON.parse(raw) : {};
      map[candidate.id] = payoutRecord;
      localStorage.setItem('mapahtrip_affiliate_payouts', JSON.stringify(map));
    } catch {}

    // 2. Update candidate
    const updatedCandidate: Pengajuan = {
      ...candidate,
      payoutStatus: 'Berhasil Ditransfer',
      payoutTanggal: formattedTanggal,
      payoutNoRef: finalNoRef,
      payoutBuktiUrl: payoutBuktiFile || undefined,
      payoutBy: 'Owner MapahTrip',
      payoutCatatan: payoutCatatan || undefined,
    };

    // 3. Simpan ke local registrations
    try {
      const regRaw = localStorage.getItem('mapahtrip_local_registrations');
      if (regRaw) {
        const list: Pengajuan[] = JSON.parse(regRaw);
        const updatedList = list.map((item) => (item.id === candidate.id ? updatedCandidate : item));
        localStorage.setItem('mapahtrip_local_registrations', JSON.stringify(updatedList));
      }
    } catch {}

    if (onUpdatePengajuan) {
      onUpdatePengajuan(updatedCandidate);
    }

    // Buat link pesan WhatsApp otomatis untuk mitra
    const rawWa = (mitra.noWa || '').replace(/\D/g, '');
    const cleanWa = rawWa ? (rawWa.startsWith('0') ? '62' + rawWa.slice(1) : rawWa) : '';
    const nominalRp = new Intl.NumberFormat('id-ID').format(candidate.referralFee || 100000);
    const waText = encodeURIComponent(
      `Halo Kak ${mitra.nama} 👋,\n\n` +
      `Kabar gembira! Fee komisi referral kemitraan MapahTrip Anda sebesar *Rp ${nominalRp}* untuk pemohon visa *${candidate.namaPemohon}* telah berhasil ditransfer oleh Owner MapahTrip ke rekening *${mitra.namaBank || 'Bank'} ${mitra.nomorRekening || ''}* a.n. ${mitra.atasNamaRekening || mitra.nama}.\n\n` +
      `📌 *No. Referensi:* ${finalNoRef}\n` +
      `📅 *Tanggal:* ${formattedTanggal}\n\n` +
      `Rincian komisi & struk bukti transfer resmi dapat dicek langsung di Portal Mitra MapahTrip.\n\n` +
      `Terima kasih atas kerja samanya! 🙏\n_MapahTrip Management_`
    );
    const waUrl = cleanWa ? `https://wa.me/${cleanWa}?text=${waText}` : null;

    setPayoutSuccessModal({
      mitraNama: mitra.nama,
      nominal: candidate.referralFee || 100000,
      pemohonNama: candidate.namaPemohon,
      noWa: mitra.noWa,
      waUrl,
    });

    setPayoutTarget(null);
  };

  // Handler untuk menyimpan foto bukti transfer baru (Update/Koreksi bukti salah upload)
  const handleSaveEditedProof = () => {
    if (!previewBuktiTF || !editProofFile) return;
    setIsSavingProof(true);
    const { candidate, payoutData } = previewBuktiTF;
    const newProofUrl = editProofFile;

    try {
      // 1. Simpan ke mapahtrip_affiliate_payouts
      const raw = localStorage.getItem('mapahtrip_affiliate_payouts');
      const map = raw ? JSON.parse(raw) : {};
      if (map[candidate.id]) {
        map[candidate.id] = {
          ...map[candidate.id],
          buktiTransferUrl: newProofUrl,
          lastEditedAt: new Date().toISOString(),
        };
        localStorage.setItem('mapahtrip_affiliate_payouts', JSON.stringify(map));
      }
    } catch (e) {
      console.error('Error updating payout proof in map:', e);
    }

    // 2. Update candidate object
    const updatedCandidate: Pengajuan = {
      ...candidate,
      payoutBuktiUrl: newProofUrl,
    };

    // 3. Simpan ke mapahtrip_local_registrations
    try {
      const regRaw = localStorage.getItem('mapahtrip_local_registrations');
      if (regRaw) {
        const list: Pengajuan[] = JSON.parse(regRaw);
        const updatedList = list.map((item) => (item.id === candidate.id ? updatedCandidate : item));
        localStorage.setItem('mapahtrip_local_registrations', JSON.stringify(updatedList));
      }
    } catch (e) {
      console.error('Error updating candidate registrations:', e);
    }

    if (onUpdatePengajuan) {
      onUpdatePengajuan(updatedCandidate);
    }

    // Update modal preview state
    setPreviewBuktiTF({
      ...previewBuktiTF,
      candidate: updatedCandidate,
      payoutData: {
        ...payoutData,
        buktiTransferUrl: newProofUrl,
      },
    });

    setIsSavingProof(false);
    setEditProofFile(null);
    setEditProofSuccess(true);
    setTimeout(() => {
      setEditProofSuccess(false);
    }, 4000);
  };

  // Handler untuk menghapus foto bukti transfer jika salah upload
  const handleDeleteEditedProof = () => {
    if (!previewBuktiTF) return;
    const confirmDelete = window.confirm('Yakin ingin menghapus foto bukti transfer ini? Anda dapat mengunggah foto baru yang benar setelahnya.');
    if (!confirmDelete) return;

    const { candidate, payoutData } = previewBuktiTF;

    try {
      const raw = localStorage.getItem('mapahtrip_affiliate_payouts');
      const map = raw ? JSON.parse(raw) : {};
      if (map[candidate.id]) {
        delete map[candidate.id].buktiTransferUrl;
        localStorage.setItem('mapahtrip_affiliate_payouts', JSON.stringify(map));
      }
    } catch (e) {
      console.error('Error deleting payout proof:', e);
    }

    const updatedCandidate: Pengajuan = {
      ...candidate,
      payoutBuktiUrl: undefined,
    };

    try {
      const regRaw = localStorage.getItem('mapahtrip_local_registrations');
      if (regRaw) {
        const list: Pengajuan[] = JSON.parse(regRaw);
        const updatedList = list.map((item) => (item.id === candidate.id ? updatedCandidate : item));
        localStorage.setItem('mapahtrip_local_registrations', JSON.stringify(updatedList));
      }
    } catch (e) {
      console.error('Error deleting candidate proof in registrations:', e);
    }

    if (onUpdatePengajuan) {
      onUpdatePengajuan(updatedCandidate);
    }

    setPreviewBuktiTF({
      ...previewBuktiTF,
      candidate: updatedCandidate,
      payoutData: {
        ...payoutData,
        buktiTransferUrl: undefined,
      },
    });

    setEditProofFile(null);
    setEditProofSuccess(true);
    setTimeout(() => {
      setEditProofSuccess(false);
    }, 4000);
  };

  // Ranking data mitra yang digabungkan dengan pemohon riil (Hanya mitra eksternal, akun internal/owner disaring)
  const enrichedMitraList = useMemo(() => {
    return affiliates
      .filter((aff) => {
        const code = (aff.affiliateCode || '').trim().toUpperCase();
        return code !== 'MAPAHTRIP' && !aff.nama?.toLowerCase().includes('owner');
      })
      .map((aff) => {
      const applicants = getMitraApplicants(aff.affiliateCode);
      const bonusFromSheet = aff.totalBonus !== undefined && aff.totalBonus !== null ? Number(aff.totalBonus) : 0;
      const calculatedFromApplicants = applicants.reduce((acc, p) => {
        const fee = p.referralFee !== undefined && p.referralFee !== null && p.referralFee > 0
          ? Number(p.referralFee)
          : 100000;
        return acc + fee;
      }, 0);
      const totalKomisi = applicants.length > 0 ? calculatedFromApplicants : bonusFromSheet;
      const pemohonCount = applicants.length > 0 ? applicants.length : (bonusFromSheet > 0 ? Math.floor(bonusFromSheet / 100000) : 0);

      // Hitung statistik tahapan berkas
      const berkasSampaiCount = applicants.filter((p) => p.tglBerkasMasuk && p.tglBerkasMasuk !== '-').length;
      const prosesCount = applicants.filter((p) => p.tglApply && p.tglApply !== '-').length;
      const selesaiCount = applicants.filter((p) => p.status === 'Selesai' || (p.tglSelesai && p.tglSelesai !== '-')).length;

      // Hitung daftar pemohon binaan yang siap payout (Visa Selesai tapi belum ditransfer)
      const pendingPayoutApplicants = applicants.filter((p) => {
        if (p.status !== 'Selesai') return false;
        const payout = getPayoutData(p.id);
        return !payout && p.payoutStatus !== 'Berhasil Ditransfer';
      });
      const pendingPayoutCount = pendingPayoutApplicants.length;
      const pendingPayoutNominal = pendingPayoutCount * 100000;

      // Hitung tanggal pengajuan terbaru & status keaktifan mitra bawa customer
      let lastApplicantDate: Date | null = null;
      let lastApplicantDateStr: string | null = null;

      for (const p of applicants) {
        const rawDate = p.tglBerkasMasuk || p.tglApply;
        if (rawDate && rawDate !== '-' && rawDate.trim() !== '') {
          let parsedTime = Date.parse(rawDate);
          if (isNaN(parsedTime)) {
            const parts = rawDate.split(/[-/]/);
            if (parts.length === 3) {
              if (parts[0].length === 4) {
                parsedTime = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime();
              } else {
                parsedTime = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
              }
            }
          }
          if (!isNaN(parsedTime)) {
            const d = new Date(parsedTime);
            if (!lastApplicantDate || d.getTime() > lastApplicantDate.getTime()) {
              lastApplicantDate = d;
              lastApplicantDateStr = rawDate;
            }
          }
        }
      }

      let daysSinceLastApplicant: number | null = null;
      let activityStatus: 'active' | 'idle' | 'inactive' | 'never' = 'never';
      let lastActivityText = 'Belum pernah bawa';
      let lastApplicantDateFormatted = '-';

      if (lastApplicantDate) {
        const now = new Date();
        const diffMs = now.getTime() - lastApplicantDate.getTime();
        const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        daysSinceLastApplicant = diffDays;

        if (diffDays <= 30) {
          activityStatus = 'active'; // Aktif (baru bawa dalam 30 hari terakhir)
        } else if (diffDays <= 90) {
          activityStatus = 'idle'; // Mulai Pasif (1 - 3 bulan lalu)
        } else {
          activityStatus = 'inactive'; // Lama Pasif (> 3 bulan lalu)
        }

        try {
          lastApplicantDateFormatted = lastApplicantDate.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
        } catch {
          lastApplicantDateFormatted = lastApplicantDateStr || '-';
        }

        if (diffDays === 0) {
          lastActivityText = 'Hari ini';
        } else if (diffDays === 1) {
          lastActivityText = 'Kemarin';
        } else if (diffDays < 7) {
          lastActivityText = `${diffDays} hari lalu`;
        } else if (diffDays < 30) {
          const weeks = Math.floor(diffDays / 7);
          lastActivityText = `${weeks} minggu lalu (${diffDays} hr)`;
        } else if (diffDays < 365) {
          const months = Math.floor(diffDays / 30);
          lastActivityText = `${months} bln lalu (${diffDays} hr)`;
        } else {
          const years = Math.floor(diffDays / 365);
          lastActivityText = `${years} thn lalu (${diffDays} hr)`;
        }
      }

      return {
        ...aff,
        applicants,
        pemohonCount,
        totalKomisi,
        berkasSampaiCount,
        prosesCount,
        selesaiCount,
        pendingPayoutApplicants,
        pendingPayoutCount,
        pendingPayoutNominal,
        lastApplicantDate,
        lastApplicantDateStr,
        lastApplicantDateFormatted,
        daysSinceLastApplicant,
        activityStatus,
        lastActivityText,
      };
    });
  }, [affiliates, pengajuanList]);

  // Antrean Payout Terpusat (Semua pemohon visa selesai yang belum ditransfer oleh Owner)
  const pendingPayoutsQueue = useMemo(() => {
    const queue: Array<{
      candidate: Pengajuan;
      mitra: any;
      nominal: number;
    }> = [];

    enrichedMitraList.forEach((m) => {
      m.pendingPayoutApplicants?.forEach((cand: Pengajuan) => {
        queue.push({
          candidate: cand,
          mitra: m,
          nominal: cand.referralFee || 100000,
        });
      });
    });

    return queue;
  }, [enrichedMitraList]);

  const totalPendingPayoutNominal = useMemo(() => {
    return pendingPayoutsQueue.reduce((sum, q) => sum + q.nominal, 0);
  }, [pendingPayoutsQueue]);

  // Daftar Payout yang Sudah Selesai Ditransfer
  const completedPayoutsList = useMemo(() => {
    const list: Array<{
      candidate: Pengajuan;
      mitra: any;
      payoutData: any;
      nominal: number;
    }> = [];

    enrichedMitraList.forEach((m) => {
      m.applicants?.forEach((cand: Pengajuan) => {
        const payout = getPayoutData(cand.id);
        if (payout || cand.payoutStatus === 'Berhasil Ditransfer') {
          list.push({
            candidate: cand,
            mitra: m,
            payoutData: payout,
            nominal: cand.referralFee || 100000,
          });
        }
      });
    });

    return list;
  }, [enrichedMitraList]);

  useEffect(() => {
    onAffiliatesCountChange?.(enrichedMitraList.length);
  }, [enrichedMitraList.length, onAffiliatesCountChange]);

  // Total KPI Keseluruhan
  const totalMitraCount = enrichedMitraList.length;
  const totalPemohonViaReferral = useMemo(() => {
    return pengajuanList.filter((p) => p.affiliateCode && p.affiliateCode.trim().toUpperCase() !== 'MAPAHTRIP').length;
  }, [pengajuanList]);

  const totalKomisiAll = useMemo(() => {
    return enrichedMitraList.reduce((sum, a) => sum + a.totalKomisi, 0);
  }, [enrichedMitraList]);

  const activeMitraWithApplicants = useMemo(() => {
    return enrichedMitraList.filter((a) => a.pemohonCount > 0).length;
  }, [enrichedMitraList]);

  const inactiveMitraWithoutApplicants = useMemo(() => {
    return enrichedMitraList.filter((a) => a.pemohonCount === 0).length;
  }, [enrichedMitraList]);

  // Filter & Search
  const filteredMitra = useMemo(() => {
    return enrichedMitraList.filter((m) => {
      // 1. Search Query
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        m.nama.toLowerCase().includes(q) ||
        m.affiliateCode.toLowerCase().includes(q) ||
        (m.lembaga && m.lembaga.toLowerCase().includes(q)) ||
        (m.noWa && m.noWa.includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.provinsi && m.provinsi.toLowerCase().includes(q));

      // 2. Status Pemohon Filter
      let matchCat = true;
      if (categoryFilter === 'has_applicants') {
        matchCat = m.pemohonCount > 0;
      } else if (categoryFilter === 'no_applicants') {
        matchCat = m.pemohonCount === 0;
      }

      return matchSearch && matchCat;
    }).sort((a, b) => {
      // 1. Prioritaskan mitra yang memiliki payout tertunda paling banyak
      if (b.pendingPayoutCount !== a.pendingPayoutCount) {
        return b.pendingPayoutCount - a.pendingPayoutCount;
      }
      // 2. Prioritaskan mitra dengan total komisi tertinggi di atas
      if (b.totalKomisi !== a.totalKomisi) {
        return b.totalKomisi - a.totalKomisi;
      }
      // 3. Jika komisi sama, prioritaskan jumlah pemohon terbanyak
      if (b.pemohonCount !== a.pemohonCount) {
        return b.pemohonCount - a.pemohonCount;
      }
      // 4. Jika sama, urutkan berdasarkan abjad nama
      return a.nama.localeCompare(b.nama);
    });
  }, [enrichedMitraList, searchQuery, categoryFilter]);

  // Reset ke halaman 1 saat pencarian, kategori filter, atau ukuran halaman berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, pageSize]);

  const totalItems = filteredMitra.length;
  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = pageSize === -1 ? 0 : (activePage - 1) * pageSize;
  const endIndex = pageSize === -1 ? totalItems : Math.min(startIndex + pageSize, totalItems);

  const paginatedMitra = useMemo(() => {
    if (pageSize === -1) return filteredMitra;
    return filteredMitra.slice(startIndex, endIndex);
  }, [filteredMitra, pageSize, startIndex, endIndex]);


  return (
    <div className="affiliate-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Utama */}
      <div className="affiliate-header-wrapper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '20px', padding: '3px 10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px' }}>⛩️</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0284C7', letterSpacing: '0.02em' }}>
              {isOwner ? 'Kelola Kemitraan & Program Payout Mitra' : 'Mitra & Agen Referral MapahTrip'}
            </span>
          </div>
          <h1 className="affiliate-page-title" style={{ fontSize: '1.70rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
            Program Affiliate &amp; Kemitraan
          </h1>
          <p className="affiliate-page-subtitle" style={{ color: '#64748B', fontSize: '0.86rem', margin: '4px 0 0', lineHeight: '1.4' }}>
            Pantau kode referral, status mitra LPK/agensi, rekening pencairan komisi, dan berkas pemohon binaan.
          </p>
        </div>

        <div className="affiliate-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary affiliate-refresh-btn"
            onClick={loadAffiliates}
            title="Muat ulang data dari database"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.80rem',
              fontWeight: 600,
              padding: '8px 14px',
              borderRadius: '10px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              color: '#475569',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#64748B' }}>
              refresh
            </span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="affiliate-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
        {/* Card 1: Total Mitra */}
        <div
          className="card affiliate-kpi-card"
          style={{
            padding: '16px 18px',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Mitra
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0284C7' }}>groups</span>
            </div>
          </div>
          <div>
            <div className="affiliate-kpi-num" style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.1, marginBottom: '6px' }}>
              {totalMitraCount} <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B' }}>Mitra</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#0369A1', backgroundColor: '#F0F9FF', padding: '2px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#0284C7' }}>verified</span>
              <span>LPK, Agensi, &amp; Umum</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Pemohon via Referral */}
        <div
          className="card affiliate-kpi-card"
          style={{
            padding: '16px 18px',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Pemohon Referral
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#16A34A' }}>how_to_reg</span>
            </div>
          </div>
          <div>
            <div className="affiliate-kpi-num" style={{ fontSize: '1.65rem', fontWeight: 800, color: '#15803D', lineHeight: 1.1, marginBottom: '6px' }}>
              {totalPemohonViaReferral} <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B' }}>Orang</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
              Dari total <strong>{pengajuanList.length}</strong> visa di sistem
            </div>
          </div>
        </div>

        {/* Card 3: Total Komisi */}
        <div
          className="card affiliate-kpi-card"
          style={{
            padding: '16px 18px',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Komisi
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#16A34A' }}>payments</span>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', whiteSpace: 'nowrap', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>Rp</span>
              <span className="affiliate-kpi-num" style={{ fontSize: '1.50rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                {totalKomisiAll.toLocaleString('id-ID')}
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#15803D', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', padding: '2px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>price_check</span>
              <span>Rp 100.000 / visa flat</span>
            </div>
          </div>
        </div>

        {/* Card 4: Mitra Aktif */}
        <div
          className="card affiliate-kpi-card"
          style={{
            padding: '16px 18px',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Mitra Aktif
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#7C3AED' }}>trending_up</span>
            </div>
          </div>
          <div>
            <div className="affiliate-kpi-num" style={{ fontSize: '1.65rem', fontWeight: 800, color: '#6D28D9', lineHeight: 1.1, marginBottom: '6px' }}>
              {activeMitraWithApplicants} <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B' }}>Mitra</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
              Telah membawa minimal 1 pemohon
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigasi Mode Tampilan Terpusat */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #E2E8F0', paddingBottom: '2px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <button
          type="button"
          onClick={() => setMainViewTab('mitra')}
          style={{
            padding: '10px 16px',
            border: 'none',
            borderBottom: mainViewTab === 'mitra' ? '3px solid #0284C7' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: mainViewTab === 'mitra' ? '#0284C7' : '#64748B',
            fontWeight: 800,
            fontSize: '0.86rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>group</span>
          <span>Direktori Mitra ({totalMitraCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setMainViewTab('payout_queue')}
          style={{
            padding: '10px 16px',
            border: 'none',
            borderBottom: mainViewTab === 'payout_queue' ? '3px solid #16A34A' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: mainViewTab === 'payout_queue' ? '#16A34A' : '#64748B',
            fontWeight: 800,
            fontSize: '0.86rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>payments</span>
          <span>⚡ Antrean Payout Belum TF</span>
          {pendingPayoutsQueue.length > 0 ? (
            <span style={{ backgroundColor: '#EF4444', color: '#FFFFFF', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 900 }}>
              {pendingPayoutsQueue.length}
            </span>
          ) : (
            <span style={{ backgroundColor: '#E2E8F0', color: '#64748B', padding: '2px 7px', borderRadius: '12px', fontSize: '0.70rem' }}>
              0
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setMainViewTab('payout_history')}
          style={{
            padding: '10px 16px',
            border: 'none',
            borderBottom: mainViewTab === 'payout_history' ? '3px solid #16A34A' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: mainViewTab === 'payout_history' ? '#16A34A' : '#64748B',
            fontWeight: 800,
            fontSize: '0.86rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>history</span>
          <span>Riwayat Payout Lunas ({completedPayoutsList.length})</span>
        </button>
      </div>

      {/* Alert Banner Owner jika ada Payout yang siap ditransfer */}
      {isOwner && pendingPayoutsQueue.length > 0 && mainViewTab === 'mitra' && (
        <div
          style={{
            background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
            border: '1.5px solid #86EFAC',
            borderRadius: '14px',
            padding: '14px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 3px 12px rgba(22, 163, 74, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#BBF7D0', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>payments</span>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, color: '#14532D', fontSize: '0.90rem' }}>
                Ada {pendingPayoutsQueue.length} Payout Komisi Mitra Siap Ditransfer (Total {formatRupiah(totalPendingPayoutNominal)})
              </div>
              <div style={{ fontSize: '0.76rem', color: '#166534', marginTop: '2px' }}>
                Visa pemohon sudah Selesai/Terbit. Klik tombol di kanan untuk langsung membuka antrean transfer tanpa harus mencari mitra satu per satu.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMainViewTab('payout_queue')}
            style={{
              backgroundColor: '#16A34A',
              color: '#FFFFFF',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.80rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
              flexShrink: 0,
            }}
          >
            <span>Buka Antrean Payout</span>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
          </button>
        </div>
      )}

      {/* Main Table Card (Direktori Mitra) */}
      {mainViewTab === 'mitra' && (
      <div className="card affiliate-main-card" style={{ padding: '16px' }}>
        {/* Filter, Page Size & Search Bar */}
        <div className="affiliate-filter-bar">
          {/* Sisi Kiri / Search bar */}
          <div className="affiliate-search-wrapper" style={{ position: 'relative', minWidth: '220px', maxWidth: '300px', width: '100%' }}>
            <span
              className="material-symbols-outlined"
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '18px',
                color: '#94A3B8',
                pointerEvents: 'none',
              }}
            >
              search
            </span>
            <input
              type="text"
              placeholder="Cari nama, kode, LPK, kota..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 36px 8px 36px',
                borderRadius: '9999px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                fontSize: '0.84rem',
                color: '#0F172A',
                outline: 'none',
                boxSizing: 'border-box',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="affiliate-chips-group">
            {[
              { id: 'all', label: `Semua (${enrichedMitraList.length})` },
              { id: 'has_applicants', label: `Ada Pemohon (${activeMitraWithApplicants})` },
              { id: 'no_applicants', label: `Belum Ada (${inactiveMitraWithoutApplicants})` },
            ].map((t) => {
              const active = categoryFilter === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setCategoryFilter(t.id as any)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '0.74rem',
                    fontWeight: active ? 800 : 600,
                    border: active ? '1.5px solid #0284C7' : '1px solid #E2E8F0',
                    backgroundColor: active ? '#EFF6FF' : '#FFFFFF',
                    color: active ? '#0284C7' : '#64748B',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Tampilkan Page Size (Dropdown seperti di Pengajuan) */}
          <div className="affiliate-page-size-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.82rem', fontWeight: 500 }}>
              <span>Tampilkan:</span>
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    padding: '5px 26px 5px 12px',
                    borderRadius: '9999px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#F8FAFC',
                    fontSize: '0.80rem',
                    fontWeight: 600,
                    color: '#0F172A',
                    cursor: 'pointer',
                    outline: 'none',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  }}
                  title="Pilih jumlah mitra yang ditampilkan per halaman"
                >
                  <option value={10}>10 Data</option>
                  <option value={20}>20 Data</option>
                  <option value={50}>50 Data</option>
                  <option value={-1}>Semua</option>
                </select>
                <span
                  className="material-symbols-outlined"
                  style={{
                    position: 'absolute',
                    right: '6px',
                    pointerEvents: 'none',
                    fontSize: '16px',
                    color: '#64748B',
                  }}
                >
                  expand_more
                </span>
              </div>
            </div>
            <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>
              {filteredMitra.length} mitra ditemukan
            </span>
          </div>
        </div>

        {/* Tabel Data Mitra */}
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px', animation: 'spin 1s infinite linear' }}>
              sync
            </span>
            <p style={{ margin: '8px 0 0', fontSize: '0.84rem' }}>Memuat daftar mitra affiliate...</p>
          </div>
        ) : filteredMitra.length === 0 ? (
          <div style={{ padding: '48px 16px', textAlign: 'center', color: '#64748B' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#CBD5E1', marginBottom: '8px' }}>
              person_search
            </span>
            <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.92rem' }}>
              Tidak Ada Mitra yang Sesuai
            </div>
            <p style={{ margin: '4px 0 12px', fontSize: '0.78rem' }}>
              Coba ubah kata kunci pencarian atau ganti filter kategori.
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
              }}
              style={{ fontSize: '0.76rem', padding: '6px 14px' }}
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <>
            <div className="data-table-container affiliate-desktop-table" style={{ overflow: 'visible', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 14px rgba(0,0,0,0.03)', background: '#ffffff' }}>
            <table className="data-table table-compact" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ width: '38px', textAlign: 'center', whiteSpace: 'nowrap', position: 'sticky', top: '68px', backgroundColor: '#F8FAFC', zIndex: 25, borderBottom: '2px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', borderTopLeftRadius: '15px', padding: '8px 4px' }}>
                    No.
                  </th>
                  <th style={{ width: '90px', whiteSpace: 'nowrap', position: 'sticky', top: '68px', backgroundColor: '#F8FAFC', zIndex: 25, borderBottom: '2px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', padding: '8px 6px' }}>
                    Kode Referral
                  </th>
                  <th style={{ minWidth: '140px', whiteSpace: 'nowrap', position: 'sticky', top: '68px', backgroundColor: '#F8FAFC', zIndex: 25, borderBottom: '2px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', padding: '8px 6px' }}>
                    Mitra &amp; Lembaga
                  </th>
                  <th style={{ width: '115px', whiteSpace: 'nowrap', position: 'sticky', top: '68px', backgroundColor: '#F8FAFC', zIndex: 25, borderBottom: '2px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', padding: '8px 6px' }}>
                    Kontak &amp; WhatsApp
                  </th>
                  <th style={{ minWidth: '125px', whiteSpace: 'nowrap', position: 'sticky', top: '68px', backgroundColor: '#F8FAFC', zIndex: 25, borderBottom: '2px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', padding: '8px 6px' }}>
                    Rekening Pencairan
                  </th>
                  <th style={{ minWidth: '150px', whiteSpace: 'nowrap', position: 'sticky', top: '68px', backgroundColor: '#F8FAFC', zIndex: 25, borderBottom: '2px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', padding: '8px 6px' }}>
                    Pemohon &amp; Keaktifan
                  </th>
                  <th style={{ textAlign: 'right', width: '105px', whiteSpace: 'nowrap', position: 'sticky', top: '68px', backgroundColor: '#F8FAFC', zIndex: 25, borderBottom: '2px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', padding: '8px 6px' }}>
                    Total Komisi
                  </th>
                  <th
                    style={{
                      width: '78px',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      position: 'sticky',
                      top: '68px',
                      backgroundColor: '#F8FAFC',
                      zIndex: 25,
                      borderBottom: '2px solid #CBD5E1',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                      borderTopRightRadius: '15px',
                      padding: '8px 6px',
                    }}
                  >
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedMitra.map((mitra, index) => {
                  const isSyafiq = mitra.affiliateCode === 'MPH425SY';
                  return (
                    <tr
                      key={mitra.id || mitra.affiliateCode}
                      style={{
                        backgroundColor: isSyafiq ? '#F0F9FF' : undefined,
                      }}
                    >
                      {/* Nomor Urut */}
                      <td style={{ textAlign: 'center', fontWeight: 800, color: '#64748B', fontSize: '0.78rem', whiteSpace: 'nowrap', padding: '10px 6px' }}>
                        {startIndex + index + 1}
                      </td>

                      {/* Kode Referral */}
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 800,
                              fontSize: '0.78rem',
                              color: '#0284C7',
                              letterSpacing: '0.02em',
                              backgroundColor: '#E0F2FE',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {mitra.affiliateCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(mitra.affiliateCode)}
                            title="Salin Kode Referral"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: copiedCode === mitra.affiliateCode ? '#16A34A' : '#94A3B8',
                              cursor: 'pointer',
                              padding: '1px',
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                              {copiedCode === mitra.affiliateCode ? 'check' : 'content_copy'}
                            </span>
                          </button>
                        </div>
                      </td>

                      {/* Mitra & Lembaga */}
                      <td>
                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.80rem', lineHeight: '1.2' }}>
                          {mitra.nama}
                        </div>
                        <div style={{ fontSize: '0.70rem', color: '#475569', marginTop: '2px', lineHeight: '1.2' }}>
                          {mitra.lembaga && mitra.lembaga !== '-' ? mitra.lembaga : mitra.statusMitra || 'Mitra Independen'}
                          {mitra.provinsi && <span style={{ color: '#94A3B8' }}> • {mitra.provinsi}</span>}
                        </div>
                        <div style={{ fontSize: '0.66rem', color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                          {mitra.email}
                        </div>
                      </td>

                      {/* Kontak & WhatsApp */}
                      <td>
                        {mitra.noWa ? (
                          <a
                            href={`https://wa.me/${mitra.noWa.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              color: '#15803D',
                              textDecoration: 'none',
                              fontWeight: 600,
                              fontSize: '0.74rem',
                              whiteSpace: 'nowrap',
                            }}
                            title="Buka Chat WhatsApp dengan PIC Mitra"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#16A34A' }}>
                              chat
                            </span>
                            <span>{mitra.noWa}</span>
                          </a>
                        ) : (
                          <span style={{ color: '#CBD5E1', fontSize: '0.74rem' }}>-</span>
                        )}
                      </td>

                      {/* Rekening Pencairan */}
                      <td>
                        <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0F172A', lineHeight: '1.2' }}>
                          {mitra.namaBank || 'BCA'} {mitra.nomorRekening ? `• ${mitra.nomorRekening}` : ''}
                        </div>
                        {mitra.atasNamaRekening && (
                          <div style={{ fontSize: '0.68rem', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>
                            a.n. {mitra.atasNamaRekening}
                          </div>
                        )}
                      </td>

                      {/* Pemohon & Keaktifan */}
                      <td style={{ whiteSpace: 'nowrap', padding: '8px 6px' }}>
                        {mitra.pemohonCount > 0 ? (
                          <div>
                            {/* Baris 1: Jumlah orang + Status Chip */}
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              <span
                                style={{
                                  backgroundColor: '#DCFCE7',
                                  color: '#15803D',
                                  fontWeight: 800,
                                  fontSize: '0.74rem',
                                  padding: '2px 7px',
                                  borderRadius: '10px',
                                }}
                              >
                                {mitra.pemohonCount} orang
                              </span>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '1px 6px',
                                  borderRadius: '9999px',
                                  fontSize: '0.66rem',
                                  fontWeight: 700,
                                  backgroundColor:
                                    mitra.activityStatus === 'active'
                                      ? '#DCFCE7'
                                      : mitra.activityStatus === 'idle'
                                      ? '#FEF9C3'
                                      : '#FEE2E2',
                                  color:
                                    mitra.activityStatus === 'active'
                                      ? '#15803D'
                                      : mitra.activityStatus === 'idle'
                                      ? '#A16207'
                                      : '#B91C1C',
                                  border: `1px solid ${
                                    mitra.activityStatus === 'active'
                                      ? '#BBF7D0'
                                      : mitra.activityStatus === 'idle'
                                      ? '#FEF08A'
                                      : '#FECACA'
                                  }`,
                                }}
                              >
                                <span style={{ fontSize: '6px' }}>●</span>
                                <span>
                                  {mitra.activityStatus === 'active'
                                    ? 'Aktif'
                                    : mitra.activityStatus === 'idle'
                                    ? 'Mulai Pasif'
                                    : 'Lama Pasif'}
                                </span>
                              </span>
                            </div>

                            {/* Baris 2: Tanggal Terakhir */}
                            <div style={{ fontSize: '0.67rem', color: '#475569', marginTop: '3px', lineHeight: 1.2 }}>
                              Terakhir: <strong style={{ color: '#0F172A' }}>{mitra.lastApplicantDateFormatted}</strong>
                            </div>

                            {/* Baris 3: Durasi berapa lama (di bawahnya lagi) */}
                            <div style={{ fontSize: '0.64rem', color: '#64748B', marginTop: '1px', lineHeight: 1.2 }}>
                              ({mitra.lastActivityText})
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ color: '#94A3B8', fontSize: '0.74rem', fontWeight: 600 }}>0 orang</span>
                            <span
                              style={{
                                padding: '1px 6px',
                                borderRadius: '9999px',
                                fontSize: '0.65rem',
                                fontWeight: 500,
                                backgroundColor: '#F1F5F9',
                                color: '#94A3B8',
                                border: '1px solid #E2E8F0',
                              }}
                            >
                              Belum pernah bawa
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Total Komisi */}
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.80rem', color: mitra.totalKomisi > 0 ? '#0F172A' : '#94A3B8', whiteSpace: 'nowrap' }}>
                        {formatRupiah(mitra.totalKomisi)}
                      </td>

                      {/* Aksi */}
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap', padding: '6px 8px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setSelectedMitra(mitra)}
                          style={{
                            padding: '5px 12px',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            borderRadius: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          title="Lihat profil mitra & daftar pemohon"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>visibility</span>
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (Hanya Tampil di Layar HP / max-width: 768px via CSS) */}
          <div className="affiliate-mobile-cards">
            {paginatedMitra.map((mitra, index) => {
              const isSyafiq = mitra.affiliateCode === 'MPH425SY';
              const waClean = (mitra.noWa || '').replace(/[^0-9]/g, '');
              const waLink = waClean
                ? `https://wa.me/${waClean.startsWith('0') ? '62' + waClean.slice(1) : waClean}`
                : null;

              return (
                <div
                  key={`mobile-${mitra.id || mitra.affiliateCode}`}
                  style={{
                    backgroundColor: isSyafiq ? '#F0F9FF' : '#FFFFFF',
                    border: `1px solid ${isSyafiq ? '#BAE6FD' : '#E2E8F0'}`,
                    borderRadius: '14px',
                    padding: '14px 16px',
                    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  {/* Baris 1: Header (No, Nama & Status Badge) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            color: '#64748B',
                            backgroundColor: '#F1F5F9',
                            padding: '1px 6px',
                            borderRadius: '6px',
                            lineHeight: 1.2,
                          }}
                        >
                          #{startIndex + index + 1}
                        </span>
                        <strong
                          style={{
                            fontSize: '0.92rem',
                            color: '#0F172A',
                            fontWeight: 700,
                            wordBreak: 'break-word',
                          }}
                        >
                          {mitra.nama}
                        </strong>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                        {mitra.lembaga || 'Mitra Independen'} • {mitra.provinsi || 'Indonesia'}
                      </div>
                    </div>

                    {/* Status Keaktifan Badge */}
                    {mitra.pemohonCount > 0 ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          backgroundColor:
                            mitra.activityStatus === 'active'
                              ? '#DCFCE7'
                              : mitra.activityStatus === 'idle'
                              ? '#FEF9C3'
                              : '#FEE2E2',
                          color:
                            mitra.activityStatus === 'active'
                              ? '#15803D'
                              : mitra.activityStatus === 'idle'
                              ? '#A16207'
                              : '#B91C1C',
                          border: `1px solid ${
                            mitra.activityStatus === 'active'
                              ? '#BBF7D0'
                              : mitra.activityStatus === 'idle'
                              ? '#FEF08A'
                              : '#FECACA'
                          }`,
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ fontSize: '6px' }}>●</span>
                        <span>
                          {mitra.activityStatus === 'active'
                            ? 'Aktif'
                            : mitra.activityStatus === 'idle'
                            ? 'Mulai Pasif'
                            : 'Lama Pasif'}
                        </span>
                      </span>
                    ) : (
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          fontSize: '0.66rem',
                          fontWeight: 500,
                          backgroundColor: '#F1F5F9',
                          color: '#94A3B8',
                          border: '1px solid #E2E8F0',
                          flexShrink: 0,
                        }}
                      >
                        Belum pernah bawa
                      </span>
                    )}
                  </div>

                  {/* Baris 2: Kode Referral & Kontak WhatsApp */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Kode Referral */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          color: '#0284C7',
                          backgroundColor: '#E0F2FE',
                          padding: '3px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        {mitra.affiliateCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(mitra.affiliateCode)}
                        title="Salin Kode Referral"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: copiedCode === mitra.affiliateCode ? '#16A34A' : '#94A3B8',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'inline-flex',
                          alignItems: 'center',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                          {copiedCode === mitra.affiliateCode ? 'check' : 'content_copy'}
                        </span>
                      </button>
                    </div>

                    {/* WhatsApp Direct Link */}
                    {waLink ? (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#16A34A',
                          backgroundColor: '#F0FDF4',
                          border: '1px solid #DCFCE7',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          textDecoration: 'none',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#16A34A' }}>
                          chat
                        </span>
                        <span>{mitra.noWa}</span>
                      </a>
                    ) : (
                      <span style={{ color: '#94A3B8', fontSize: '0.74rem' }}>{mitra.noWa || '-'}</span>
                    )}
                  </div>

                  {/* Baris 3: Rekening Bank & Keaktifan */}
                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderRadius: '10px',
                      padding: '8px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      fontSize: '0.74rem',
                      border: '1px solid #F1F5F9',
                    }}
                  >
                    {/* Rekening Bank */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#64748B' }}>
                        account_balance
                      </span>
                      <span>
                        <strong>{mitra.namaBank || 'BCA'}</strong> • {mitra.nomorRekening || '-'} <span style={{ color: '#64748B' }}>(a.n. {mitra.atasNamaRekening || mitra.nama})</span>
                      </span>
                    </div>

                    {/* Histori Pemohon */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#64748B' }}>
                        group
                      </span>
                      {mitra.pemohonCount > 0 ? (
                        <span>
                          <strong>{mitra.pemohonCount} orang</strong> dibawa • Terakhir: <strong>{mitra.lastApplicantDateFormatted}</strong> ({mitra.lastActivityText})
                        </span>
                      ) : (
                        <span style={{ color: '#94A3B8' }}>0 orang pemohon dibawa</span>
                      )}
                    </div>
                  </div>

                  {/* Baris 4: Footer (Total Komisi & Tombol Detail) */}
                  <div
                    style={{
                      borderTop: '1px solid #F1F5F9',
                      paddingTop: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.70rem', color: '#64748B', display: 'block' }}>Total Komisi:</span>
                      <strong
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '0.98rem',
                          color: mitra.totalKomisi > 0 ? '#15803D' : '#64748B',
                          fontWeight: 800,
                        }}
                      >
                        {formatRupiah(mitra.totalKomisi)}
                      </strong>
                    </div>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setSelectedMitra(mitra)}
                      style={{
                        padding: '6px 14px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        borderRadius: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                        visibility
                      </span>
                      <span>Detail</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

        {/* Pagination Bar - Persis seperti di Pengajuan */}
        {!isLoading && filteredMitra.length > 0 && (
          <div
            className="affiliate-pagination-bar"
            style={{
              padding: '14px 4px 6px 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            {/* Sisi Kiri: Total X Data ditampilkan */}
            <div className="affiliate-pagination-info" style={{ fontSize: '0.84rem', color: '#64748B', fontWeight: 500 }}>
              Total <strong style={{ color: '#334155', fontWeight: 600 }}>{totalItems}</strong> Data ditampilkan (
              {totalItems === 0 ? 0 : startIndex + 1} sampai {endIndex})
            </div>

            {/* Sisi Kanan: « ‹ 1 2 3 ... › » */}
            {pageSize !== -1 && totalPages > 1 && (
              <div className="affiliate-pagination-controls" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                {/* Tombol First Page « */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={activePage === 1}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px 8px',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    color: activePage === 1 ? '#CBD5E1' : '#64748B',
                    cursor: activePage === 1 ? 'not-allowed' : 'pointer',
                    lineHeight: 1,
                    userSelect: 'none',
                  }}
                  title="Halaman pertama"
                >
                  &laquo;
                </button>

                {/* Tombol Previous ‹ */}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={activePage === 1}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px 8px',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    color: activePage === 1 ? '#CBD5E1' : '#64748B',
                    cursor: activePage === 1 ? 'not-allowed' : 'pointer',
                    lineHeight: 1,
                    userSelect: 'none',
                  }}
                  title="Halaman sebelumnya"
                >
                  &lsaquo;
                </button>

                {/* Nomor Halaman */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (p === 1 || p === totalPages) return true;
                    if (Math.abs(p - activePage) <= 2) return true;
                    return false;
                  })
                  .reduce<(number | string)[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                      acc.push('...');
                    }
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) => {
                    if (item === '...') {
                      return (
                        <span
                          key={`ellipsis-${idx}`}
                          style={{ padding: '0 6px', color: '#94A3B8', fontSize: '0.84rem' }}
                        >
                          ...
                        </span>
                      );
                    }
                    const pageNum = Number(item);
                    const isCurrent = pageNum === activePage;
                    return (
                      <button
                        key={`page-${pageNum}`}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        style={{
                          minWidth: '32px',
                          height: '32px',
                          padding: '0 8px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: isCurrent ? '#1E40AF' : 'transparent',
                          color: isCurrent ? '#FFFFFF' : '#475569',
                          fontSize: '0.84rem',
                          fontWeight: isCurrent ? 700 : 500,
                          cursor: isCurrent ? 'default' : 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                {/* Tombol Next › */}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={activePage === totalPages}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px 8px',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    color: activePage === totalPages ? '#CBD5E1' : '#64748B',
                    cursor: activePage === totalPages ? 'not-allowed' : 'pointer',
                    lineHeight: 1,
                    userSelect: 'none',
                  }}
                  title="Halaman berikutnya"
                >
                  &rsaquo;
                </button>

                {/* Tombol Last Page » */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={activePage === totalPages}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px 8px',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    color: activePage === totalPages ? '#CBD5E1' : '#64748B',
                    cursor: activePage === totalPages ? 'not-allowed' : 'pointer',
                    lineHeight: 1,
                    userSelect: 'none',
                  }}
                  title="Halaman terakhir"
                >
                  &raquo;
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* =========================================================================
          TAB 2: ANTREAN PAYOUT KOMISI MITRA TERPUSAT (BELUM DITRANSFER)
          ========================================================================= */}
      {mainViewTab === 'payout_queue' && (
        <div className="card affiliate-main-card" style={{ padding: '20px' }}>
          {/* Header Antrean */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#DCFCE7', color: '#166534', padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800, marginBottom: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>bolt</span>
                <span>Otoritas Finansial Eksklusif Owner</span>
              </div>
              <h3 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
                Antrean Payout Komisi Mitra (Belum Ditransfer)
              </h3>
              <p style={{ margin: 0, fontSize: '0.80rem', color: '#64748B' }}>
                Seluruh komisi referral dari pemohon visa yang <strong>SUDAH SELESAI / TERBIT</strong> dikumpulkan di sini. Anda dapat langsung mentransfer ke rekening mitra tanpa perlu mencari satu per satu.
              </p>
            </div>

            <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '12px 18px', textAlign: 'right' }}>
              <div style={{ fontSize: '0.70rem', color: '#15803D', fontWeight: 700, textTransform: 'uppercase' }}>
                Total Komisi Menunggu TF:
              </div>
              <div style={{ fontSize: '1.50rem', fontWeight: 900, color: '#16A34A', fontFamily: 'monospace' }}>
                {formatRupiah(totalPendingPayoutNominal)}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                {pendingPayoutsQueue.length} Transaksi Payout
              </div>
            </div>
          </div>

          {pendingPayoutsQueue.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', backgroundColor: '#F0FDF4', borderRadius: '14px', border: '1px solid #BBF7D0' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#DCFCE7', color: '#16A34A', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>check_circle</span>
              </div>
              <h4 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 800, color: '#166534' }}>
                Semua Komisi Telah Ditransfer!
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#15803D' }}>
                Tidak ada komisi mitra yang tertunda. Semua pemohon visa yang selesai sudah ditransfer lunas oleh Owner.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="modal-applicants-desktop" style={{ border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.80rem' }}>
                  <thead style={{ backgroundColor: '#F8FAFC' }}>
                    <tr>
                      <th style={{ padding: '10px 8px', width: '40px', textAlign: 'center', borderBottom: '2px solid #E2E8F0' }}>No.</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #E2E8F0' }}>Mitra Penerima Komisi</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #E2E8F0' }}>Rekening Tujuan Pencairan</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #E2E8F0' }}>Pemohon Visa Rujukan</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #E2E8F0', whiteSpace: 'nowrap' }}>Tgl Visa Selesai</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', borderBottom: '2px solid #E2E8F0', whiteSpace: 'nowrap' }}>Nominal Fee</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center', width: '150px', borderBottom: '2px solid #E2E8F0', whiteSpace: 'nowrap' }}>Aksi Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingPayoutsQueue.map((item, idx) => (
                      <tr key={`queue-${item.candidate.id}`} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 800, color: '#64748B', borderBottom: '1px solid #F1F5F9' }}>{idx + 1}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9' }}>
                          <div style={{ fontWeight: 800, color: '#0F172A' }}>{item.mitra.nama}</div>
                          <div style={{ fontSize: '0.72rem', color: '#0284C7', fontFamily: 'monospace' }}>{item.mitra.affiliateCode}</div>
                          {item.mitra.lembaga && <div style={{ fontSize: '0.68rem', color: '#64748B' }}>{item.mitra.lembaga}</div>}
                        </td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9' }}>
                          <div style={{ fontWeight: 800, color: '#0284C7', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{item.mitra.namaBank || 'BCA'} &bull; {item.mitra.nomorRekening || '-'}</span>
                            {item.mitra.nomorRekening && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(item.mitra.nomorRekening || '');
                                  alert(`Nomor rekening ${item.mitra.nomorRekening} tersalin!`);
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#64748B', display: 'inline-flex' }}
                                title="Salin No Rekening"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>content_copy</span>
                              </button>
                            )}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#334155' }}>
                            a.n. <strong>{item.mitra.atasNamaRekening || item.mitra.nama}</strong>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9' }}>
                          <div style={{ fontWeight: 700, color: '#0F172A' }}>{item.candidate.namaPemohon}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                            {item.candidate.program} ({item.candidate.konsjen})
                          </div>
                          <div style={{ fontSize: '0.70rem', color: '#0284C7', fontFamily: 'monospace' }}>
                            {item.candidate.noPengajuan || `#${item.candidate.id}`}
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '0.76rem', color: '#16A34A', fontWeight: 700, borderBottom: '1px solid #F1F5F9', whiteSpace: 'nowrap' }}>
                          {item.candidate.tglSelesai || 'Selesai'}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 900, color: '#16A34A', fontFamily: 'monospace', fontSize: '0.90rem', borderBottom: '1px solid #F1F5F9', whiteSpace: 'nowrap' }}>
                          {formatRupiah(item.nominal)}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', borderBottom: '1px solid #F1F5F9', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenPayoutModal(item.candidate, item.mitra)}
                            style={{
                              backgroundColor: '#16A34A',
                              color: '#FFFFFF',
                              border: 'none',
                              padding: '6px 14px',
                              borderRadius: '8px',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              whiteSpace: 'nowrap',
                              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>payments</span>
                            <span>Transfer Payout</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="modal-applicants-mobile" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pendingPayoutsQueue.map((item, idx) => (
                  <div
                    key={`mobile-queue-${item.candidate.id}`}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1.5px solid #86EFAC',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      boxShadow: '0 2px 6px rgba(22, 163, 74, 0.08)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '0.70rem', color: '#15803D', fontWeight: 800, textTransform: 'uppercase' }}>
                          #{idx + 1} Payout Siap Transfer
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A' }}>
                          {item.mitra.nama}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#0284C7', fontFamily: 'monospace' }}>
                          {item.mitra.affiliateCode}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.68rem', color: '#64748B' }}>Komisi:</div>
                        <div style={{ fontWeight: 900, color: '#16A34A', fontSize: '1rem', fontFamily: 'monospace' }}>
                          {formatRupiah(item.nominal)}
                        </div>
                      </div>
                    </div>

                    {/* Rekening Tujuan Box */}
                    <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '8px 10px', fontSize: '0.76rem' }}>
                      <div style={{ fontSize: '0.68rem', color: '#166534', fontWeight: 700 }}>Rekening Tujuan Mitra:</div>
                      <div style={{ fontWeight: 800, color: '#0F172A', fontFamily: 'monospace', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{item.mitra.namaBank || 'BCA'} &bull; {item.mitra.nomorRekening || '-'}</span>
                        {item.mitra.nomorRekening && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(item.mitra.nomorRekening || '');
                              alert(`Nomor rekening ${item.mitra.nomorRekening} tersalin!`);
                            }}
                            style={{ background: 'none', border: 'none', color: '#15803D', fontWeight: 700, fontSize: '0.70rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>content_copy</span>
                            <span>Salin</span>
                          </button>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#334155' }}>
                        a.n. <strong>{item.mitra.atasNamaRekening || item.mitra.nama}</strong>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.74rem', color: '#64748B', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Pemohon: <strong style={{ color: '#0F172A' }}>{item.candidate.namaPemohon}</strong></span>
                      <span style={{ color: '#16A34A', fontWeight: 700 }}>✓ Visa Terbit</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenPayoutModal(item.candidate, item.mitra)}
                      style={{
                        backgroundColor: '#16A34A',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        marginTop: '2px',
                        boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>payments</span>
                      <span>Transfer Payout Rp 100.000</span>
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: RIWAYAT PAYOUT LUNAS DITRANSFER OLEH OWNER
          ========================================================================= */}
      {mainViewTab === 'payout_history' && (
        <div className="card affiliate-main-card" style={{ padding: '20px' }}>
          {/* Header Riwayat */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#DCFCE7', color: '#15803D', padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800, marginBottom: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>verified</span>
                <span>Arsip Payout Resmi</span>
              </div>
              <h3 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
                Riwayat Payout Komisi Mitra (Lunas Ditransfer)
              </h3>
              <p style={{ margin: 0, fontSize: '0.80rem', color: '#64748B' }}>
                Daftar komisi referral yang telah berhasil ditransfer lunas oleh Owner MapahTrip ke rekening mitra.
              </p>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '12px 18px', textAlign: 'right' }}>
              <div style={{ fontSize: '0.70rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                Total Komisi Sudah Cair:
              </div>
              <div style={{ fontSize: '1.50rem', fontWeight: 900, color: '#15803D', fontFamily: 'monospace' }}>
                {formatRupiah(completedPayoutsList.length * 100000)}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                {completedPayoutsList.length} Transaksi Lunas
              </div>
            </div>
          </div>

          {completedPayoutsList.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#94A3B8', display: 'block', marginBottom: '8px' }}>
                history
              </span>
              <h4 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800, color: '#334155' }}>
                Belum Ada Riwayat Payout
              </h4>
              <p style={{ margin: 0, fontSize: '0.80rem', color: '#64748B' }}>
                Transaksi payout yang Anda konfirmasi akan otomatis tersimpan di sini lengkap dengan struk dan bukti transfernya.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="modal-applicants-desktop" style={{ border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.80rem' }}>
                  <thead style={{ backgroundColor: '#F8FAFC' }}>
                    <tr>
                      <th style={{ padding: '10px 8px', width: '40px', textAlign: 'center', borderBottom: '2px solid #E2E8F0' }}>No.</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #E2E8F0' }}>No. Referensi / Tgl Transfer</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #E2E8F0' }}>Mitra &amp; Rekening Penerima</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #E2E8F0' }}>Pemohon Visa Terkait</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', borderBottom: '2px solid #E2E8F0', whiteSpace: 'nowrap' }}>Nominal Cair</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center', width: '150px', borderBottom: '2px solid #E2E8F0', whiteSpace: 'nowrap' }}>Bukti TF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedPayoutsList.map((item, idx) => (
                      <tr key={`history-${item.candidate.id}`} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 800, color: '#64748B', borderBottom: '1px solid #F1F5F9' }}>{idx + 1}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9' }}>
                          <div style={{ fontWeight: 800, fontFamily: 'monospace', color: '#0F172A', fontSize: '0.76rem' }}>
                            {item.payoutData?.noRef || `TRX-MPC-${item.candidate.id.replace(/\D/g, '').slice(-6) || '202601'}`}
                          </div>
                          <div style={{ fontSize: '0.70rem', color: '#64748B' }}>
                            {formatTanggalIndo(item.payoutData?.tanggalTransfer || item.candidate.tglSelesai || 'Hari ini')}
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9' }}>
                          <div style={{ fontWeight: 800, color: '#0F172A' }}>{item.mitra.nama}</div>
                          <div style={{ fontSize: '0.72rem', color: '#0284C7', fontFamily: 'monospace' }}>
                            {item.mitra.namaBank || 'BCA'} &bull; {item.mitra.nomorRekening || '-'}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#64748B' }}>
                            a.n. {item.mitra.atasNamaRekening || item.mitra.nama}
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9' }}>
                          <div style={{ fontWeight: 700, color: '#0F172A' }}>{item.candidate.namaPemohon}</div>
                          <div style={{ fontSize: '0.70rem', color: '#64748B' }}>
                            {item.candidate.program} ({item.candidate.konsjen})
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 900, color: '#15803D', fontFamily: 'monospace', fontSize: '0.90rem', borderBottom: '1px solid #F1F5F9', whiteSpace: 'nowrap' }}>
                          {formatRupiah(item.nominal)}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', borderBottom: '1px solid #F1F5F9', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => setPreviewBuktiTF({ candidate: item.candidate, mitra: item.mitra, payoutData: item.payoutData })}
                              style={{
                                backgroundColor: '#EFF6FF',
                                color: '#0284C7',
                                border: '1px solid #BFDBFE',
                                padding: '5px 9px',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>receipt_long</span>
                              <span>Bukti TF</span>
                            </button>
                            {item.mitra.noWa && (
                              <a
                                href={`https://wa.me/${item.mitra.noWa.replace(/\D/g, '').startsWith('0') ? '62' + item.mitra.noWa.replace(/\D/g, '').slice(1) : item.mitra.noWa.replace(/\D/g, '')}?text=${encodeURIComponent(`Halo Kak ${item.mitra.nama} 👋,\n\nKomisi referral MapahTrip Anda sebesar *Rp ${new Intl.NumberFormat('id-ID').format(item.nominal)}* untuk pemohon *${item.candidate.namaPemohon}* sudah berhasil ditransfer lunas oleh Owner MapahTrip ke rekening ${item.mitra.namaBank || 'Bank'} ${item.mitra.nomorRekening || ''}.\n\nStruk bukti transfer resmi dapat dicek di portal mitra. Terima kasih! 🙏`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  backgroundColor: '#DCFCE7',
                                  color: '#15803D',
                                  border: '1px solid #86EFAC',
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                                title="Kirim notifikasi WhatsApp ke mitra"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#16A34A' }}>chat</span>
                                <span>WA</span>
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="modal-applicants-mobile" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {completedPayoutsList.map((item) => (
                  <div
                    key={`mobile-hist-${item.candidate.id}`}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #BBF7D0',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.70rem', fontFamily: 'monospace', color: '#0284C7', fontWeight: 800 }}>
                        {item.payoutData?.noRef || `TRX-${item.candidate.id.slice(-6)}`}
                      </span>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#15803D', backgroundColor: '#DCFCE7', padding: '2px 7px', borderRadius: '10px' }}>
                        ✓ Lunas
                      </span>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '0.90rem', color: '#0F172A' }}>
                      {item.mitra.nama}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#475569' }}>
                      {item.mitra.namaBank || 'BCA'} &bull; {item.mitra.nomorRekening || '-'} (a.n. {item.mitra.atasNamaRekening || item.mitra.nama})
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '6px', marginTop: '2px' }}>
                      <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                        Pemohon: <strong>{item.candidate.namaPemohon}</strong>
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setPreviewBuktiTF({ candidate: item.candidate, mitra: item.mitra, payoutData: item.payoutData })}
                          style={{
                            backgroundColor: '#EFF6FF',
                            color: '#0284C7',
                            border: '1px solid #BFDBFE',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.70rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Bukti TF
                        </button>
                        {item.mitra.noWa && (
                          <a
                            href={`https://wa.me/${item.mitra.noWa.replace(/\D/g, '').startsWith('0') ? '62' + item.mitra.noWa.replace(/\D/g, '').slice(1) : item.mitra.noWa.replace(/\D/g, '')}?text=${encodeURIComponent(`Halo Kak ${item.mitra.nama} 👋,\n\nKomisi referral MapahTrip Anda sebesar *Rp ${new Intl.NumberFormat('id-ID').format(item.nominal)}* untuk pemohon *${item.candidate.namaPemohon}* sudah berhasil ditransfer lunas oleh Owner MapahTrip ke rekening ${item.mitra.namaBank || 'Bank'} ${item.mitra.nomorRekening || ''}.\n\nStruk bukti transfer resmi dapat dicek di portal mitra. Terima kasih! 🙏`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              backgroundColor: '#DCFCE7',
                              color: '#15803D',
                              border: '1px solid #86EFAC',
                              padding: '3px 7px',
                              borderRadius: '6px',
                              fontSize: '0.70rem',
                              fontWeight: 700,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                            }}
                          >
                            <span>💬 WA</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* MODAL DETAIL MITRA */}
      {selectedMitra && (
        <div
          className="affiliate-modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
            backdropFilter: 'blur(3px)',
          }}
          onClick={() => setSelectedMitra(null)}
        >
          <div
            className="affiliate-modal-box"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '880px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div
              className="affiliate-modal-header"
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#F8FAFC',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: '#EFF6FF',
                    color: '#0284C7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    badge
                  </span>
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Detail Mitra
                    </span>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        fontSize: '0.70rem',
                        color: '#0284C7',
                        backgroundColor: '#E0F2FE',
                        padding: '1px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      {selectedMitra.affiliateCode}
                    </span>
                  </div>
                  <h3
                    className="affiliate-modal-title"
                    style={{
                      margin: '2px 0 0',
                      fontSize: '1rem',
                      fontWeight: 800,
                      color: '#0F172A',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={selectedMitra.nama}
                  >
                    {selectedMitra.nama}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMitra(null)}
                aria-label="Tutup modal"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: '#F1F5F9',
                  color: '#64748B',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '15px',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            {/* Isi Detail Modal */}
            <div className="affiliate-modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Info Pribadi & Kemitraan */}
              <div className="affiliate-modal-info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ backgroundColor: '#F8FAFC', padding: '10px 12px', borderRadius: '10px', border: '1px solid #F1F5F9' }}>
                  <div style={{ fontSize: '0.70rem', color: '#64748B', fontWeight: 600 }}>Nama PIC</div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                    {selectedMitra.nama}
                  </div>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '10px 12px', borderRadius: '10px', border: '1px solid #F1F5F9' }}>
                  <div style={{ fontSize: '0.70rem', color: '#64748B', fontWeight: 600 }}>Jenis Kemitraan</div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                    {selectedMitra.statusMitra || 'Umum'}
                  </div>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '10px 12px', borderRadius: '10px', border: '1px solid #F1F5F9' }}>
                  <div style={{ fontSize: '0.70rem', color: '#64748B', fontWeight: 600 }}>Lembaga / Instansi</div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                    {selectedMitra.lembaga || '-'}
                  </div>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '10px 12px', borderRadius: '10px', border: '1px solid #F1F5F9' }}>
                  <div style={{ fontSize: '0.70rem', color: '#64748B', fontWeight: 600 }}>Nomor WhatsApp</div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#16A34A', marginTop: '2px' }}>
                    {selectedMitra.noWa || '-'}
                  </div>
                </div>
              </div>

              {/* Data Rekening Pencairan Komisi (Kartu Pembayaran Modern) */}
              <div
                className="affiliate-modal-payout-card"
                style={{
                  background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
                  border: '1.5px solid #BFDBFE',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  boxShadow: '0 1px 3px rgba(37, 99, 235, 0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#2563EB' }}>
                      account_balance
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Rekening Pencairan Komisi (Payout)
                    </span>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: '0.80rem', color: '#1E3A8A', backgroundColor: '#DBEAFE', padding: '2px 8px', borderRadius: '6px' }}>
                    {selectedMitra.namaBank || 'BCA'}
                  </span>
                </div>

                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', fontFamily: 'monospace', letterSpacing: '0.04em', marginBottom: '4px' }}>
                  {selectedMitra.nomorRekening || '-'}
                </div>

                <div style={{ fontSize: '0.80rem', color: '#475569' }}>
                  a.n. <strong style={{ color: '#0F172A' }}>{selectedMitra.atasNamaRekening || selectedMitra.nama}</strong>
                </div>
              </div>

              {/* Status Keaktifan Bawa Customer */}
              <div
                className="affiliate-modal-activity-box"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                  <span style={{ fontSize: '0.70rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Status Keaktifan
                  </span>
                  <span
                    style={{
                      padding: '2px 10px',
                      borderRadius: '20px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      backgroundColor: selectedMitra.activityStatus === 'active' ? '#DCFCE7' : '#F1F5F9',
                      color: selectedMitra.activityStatus === 'active' ? '#15803D' : '#64748B',
                      border: `1px solid ${selectedMitra.activityStatus === 'active' ? '#BBF7D0' : '#E2E8F0'}`,
                    }}
                  >
                    ● {selectedMitra.activityStatus === 'active'
                      ? 'Aktif Bawa Customer'
                      : selectedMitra.activityStatus === 'idle'
                      ? 'Mulai Pasif'
                      : selectedMitra.activityStatus === 'inactive'
                      ? 'Lama Pasif / Dorman'
                      : 'Belum Pernah Bawa Customer'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.80rem', borderTop: '1px solid #F1F5F9', paddingTop: '6px' }}>
                  <span style={{ color: '#64748B' }}>Terakhir Membawa:</span>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>
                    {selectedMitra.pemohonCount > 0
                      ? `${selectedMitra.lastApplicantDateFormatted} (${selectedMitra.lastActivityText})`
                      : 'Belum pernah'}
                  </span>
                </div>
              </div>

              {/* Pemohon Binaan dari Mitra Ini */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.90rem', fontWeight: 800, color: '#0F172A' }}>
                    Daftar Pemohon Binaan ({getMitraApplicants(selectedMitra.affiliateCode).length} Orang)
                  </h4>
                  {isOwner && onNavigateToPengajuan && getMitraApplicants(selectedMitra.affiliateCode).length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMitra(null);
                        onNavigateToPengajuan(selectedMitra.affiliateCode);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0284C7',
                        fontWeight: 700,
                        fontSize: '0.76rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                      }}
                    >
                      <span>Buka di Tab Pengajuan</span>
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                        arrow_forward
                      </span>
                    </button>
                  )}
                </div>

                {getMitraApplicants(selectedMitra.affiliateCode).length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '10px', color: '#64748B', fontSize: '0.80rem' }}>
                    Belum ada pemohon visa yang mendaftar menggunakan kode ini.
                  </div>
                ) : (
                  <>
                    {/* Tampilan Desktop: Tabel Lengkap */}
                    <div className="modal-applicants-desktop" style={{ border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
                      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.80rem' }}>
                        <thead style={{ backgroundColor: '#F8FAFC' }}>
                          <tr>
                            <th style={{ padding: '10px 8px', width: '40px', textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '2px solid #E2E8F0' }}>No.</th>
                            <th style={{ padding: '10px 10px', width: '100px', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '2px solid #E2E8F0' }}>No. Registrasi</th>
                            <th style={{ padding: '10px 10px', minWidth: '160px', textAlign: 'left', borderBottom: '2px solid #E2E8F0' }}>Nama Pemohon</th>
                            <th style={{ padding: '10px 10px', minWidth: '140px', textAlign: 'left', borderBottom: '2px solid #E2E8F0' }}>Program Visa</th>
                            <th style={{ padding: '10px 10px', width: '90px', textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '2px solid #E2E8F0' }}>Status Visa</th>
                            <th style={{ padding: '10px 10px', width: '110px', textAlign: 'right', whiteSpace: 'nowrap', borderBottom: '2px solid #E2E8F0' }}>Komisi</th>
                            <th style={{ padding: '10px 12px', width: '170px', textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '2px solid #E2E8F0' }}>Status Payout Owner</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getMitraApplicants(selectedMitra.affiliateCode).map((cand, idx) => {
                            const payoutInfo = getPayoutData(cand.id);
                            const isPaid = Boolean(payoutInfo || cand.payoutStatus === 'Berhasil Ditransfer');
                            const isVisaSelesai = cand.status === 'Selesai';
                            return (
                              <tr key={cand.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                <td style={{ padding: '8px 8px', textAlign: 'center', fontWeight: 800, color: '#64748B', fontSize: '0.76rem', borderBottom: '1px solid #F1F5F9' }}>{idx + 1}</td>
                                <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 700, color: '#0284C7', whiteSpace: 'nowrap', borderBottom: '1px solid #F1F5F9' }}>{cand.noPengajuan || `#${cand.id}`}</td>
                                <td style={{ padding: '8px 10px', fontWeight: 600, borderBottom: '1px solid #F1F5F9' }}>{cand.namaPemohon}</td>
                                <td style={{ padding: '8px 10px', color: '#64748B', borderBottom: '1px solid #F1F5F9' }}>{cand.program} ({cand.konsjen})</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center', borderBottom: '1px solid #F1F5F9' }}>
                                  <span style={{ fontSize: '0.70rem', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', backgroundColor: isVisaSelesai ? '#DCFCE7' : '#EFF6FF', color: isVisaSelesai ? '#166534' : '#1D4ED8' }}>
                                    {cand.status}
                                  </span>
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', whiteSpace: 'nowrap', borderBottom: '1px solid #F1F5F9' }}>
                                  {formatRupiah(cand.referralFee || 100000)}
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '1px solid #F1F5F9' }}>
                                  {isPaid ? (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#15803D', backgroundColor: '#DCFCE7', padding: '2px 8px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>check_circle</span>
                                        <span>Lunas</span>
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setPreviewBuktiTF({ candidate: cand, mitra: selectedMitra, payoutData: payoutInfo })}
                                        style={{ backgroundColor: '#EFF6FF', color: '#0284C7', border: '1px solid #BFDBFE', padding: '3px 7px', borderRadius: '6px', fontSize: '0.70rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                                        title="Lihat Bukti Transfer & Struk"
                                      >
                                        <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>receipt_long</span>
                                        <span>Bukti TF</span>
                                      </button>
                                    </div>
                                  ) : isVisaSelesai ? (
                                    isOwner ? (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenPayoutModal(cand, selectedMitra)}
                                        style={{
                                          backgroundColor: '#16A34A',
                                          color: '#FFFFFF',
                                          border: 'none',
                                          padding: '4px 10px',
                                          borderRadius: '6px',
                                          fontSize: '0.72rem',
                                          fontWeight: 800,
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)',
                                        }}
                                      >
                                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>payments</span>
                                        <span>Transfer Payout</span>
                                      </button>
                                    ) : (
                                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#D97706', backgroundColor: '#FEF3C7', padding: '2px 8px', borderRadius: '12px' }}>
                                        Menunggu TF Owner
                                      </span>
                                    )
                                  ) : (
                                    <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748B', backgroundColor: '#F1F5F9', padding: '2px 8px', borderRadius: '12px' }}>
                                      Proses Visa (Pending)
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Tampilan HP / Mobile: List Kartu Pemohon (Lengkap 100% Tanpa Terpotong) */}
                    <div className="modal-applicants-mobile" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {getMitraApplicants(selectedMitra.affiliateCode).map((cand, idx) => {
                        const payoutInfo = getPayoutData(cand.id);
                        const isPaid = Boolean(payoutInfo || cand.payoutStatus === 'Berhasil Ditransfer');
                        const isVisaSelesai = cand.status === 'Selesai';
                        return (
                          <div
                            key={`mobile-cand-${cand.id}`}
                            style={{
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #E2E8F0',
                              borderRadius: '12px',
                              padding: '10px 12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748B', backgroundColor: '#F1F5F9', padding: '1px 5px', borderRadius: '4px' }}>
                                  #{idx + 1}
                                </span>
                                <span style={{ fontSize: '0.76rem', fontFamily: 'monospace', fontWeight: 700, color: '#0284C7' }}>
                                  {cand.noPengajuan || `#${cand.id}`}
                                </span>
                              </div>
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '20px',
                                  backgroundColor: isVisaSelesai ? '#DCFCE7' : '#EFF6FF',
                                  color: isVisaSelesai ? '#166534' : '#1D4ED8',
                                }}
                              >
                                {cand.status}
                              </span>
                            </div>

                            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A' }}>
                              {cand.namaPemohon}
                            </div>

                            <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                              {cand.program} ({cand.konsjen})
                            </div>

                            {/* Status Payout & Aksi Transfer Row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '8px', marginTop: '2px', flexWrap: 'wrap', gap: '6px' }}>
                              <div>
                                {isPaid ? (
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#15803D', backgroundColor: '#DCFCE7', padding: '2px 7px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>check_circle</span>
                                      <span>Lunas TF</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setPreviewBuktiTF({ candidate: cand, mitra: selectedMitra, payoutData: payoutInfo })}
                                      style={{ backgroundColor: '#EFF6FF', color: '#0284C7', border: '1px solid #BFDBFE', padding: '2px 6px', borderRadius: '5px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                                    >
                                      <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>receipt_long</span>
                                      <span>Bukti TF</span>
                                    </button>
                                  </div>
                                ) : isVisaSelesai ? (
                                  isOwner ? (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenPayoutModal(cand, selectedMitra)}
                                      style={{
                                        backgroundColor: '#16A34A',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        padding: '4px 9px',
                                        borderRadius: '6px',
                                        fontSize: '0.70rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)',
                                      }}
                                    >
                                      <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>payments</span>
                                      <span>Transfer Rp 100rb</span>
                                    </button>
                                  ) : (
                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#D97706', backgroundColor: '#FEF3C7', padding: '2px 6px', borderRadius: '10px' }}>
                                      Menunggu TF Owner
                                    </span>
                                  )
                                ) : (
                                  <span style={{ fontSize: '0.68rem', color: '#64748B', backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '10px' }}>
                                    Proses Visa (Pending)
                                  </span>
                                )}
                              </div>
                              <span style={{ fontWeight: 800, color: '#15803D', fontFamily: 'monospace', fontSize: '0.80rem' }}>
                                {formatRupiah(cand.referralFee || 100000)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Footer Modal */}
            <div
              style={{
                padding: '14px 24px',
                borderTop: '1px solid #F1F5F9',
                backgroundColor: '#F8FAFC',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              {selectedMitra.noWa ? (
                <a
                  href={`https://wa.me/${selectedMitra.noWa.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#16A34A' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    chat
                  </span>
                  <span>Chat WhatsApp Mitra</span>
                </a>
              ) : <div />}

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setSelectedMitra(null)}
                style={{ fontSize: '0.80rem', padding: '6px 16px' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TRANSFER PAYOUT KHUSUS OWNER */}
      {payoutTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPayoutTarget(null);
          }}
        >
          <div
            className="payout-transfer-modal"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '500px',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #E2E8F0',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                padding: '12px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(22, 163, 74, 0.2)', color: '#4ADE80', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>payments</span>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800 }}>
                    Transfer Payout Komisi Mitra
                  </h3>
                  <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>
                    Otoritas Finansial Eksklusif Owner MapahTrip
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPayoutTarget(null)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '18px', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {/* Box Rekening Mitra Tujuan */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
                  border: '1.5px solid #86EFAC',
                  borderRadius: '10px',
                  padding: '10px 14px',
                }}
              >
                <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                  Rekening Tujuan Pencairan:
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                  <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', fontFamily: 'monospace' }}>
                      {payoutTarget.mitra.namaBank || 'BCA'} &bull; {payoutTarget.mitra.nomorRekening || '-'}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#334155', marginTop: '1px' }}>
                      a.n. <strong style={{ color: '#0F172A' }}>{payoutTarget.mitra.atasNamaRekening || payoutTarget.mitra.nama}</strong>
                    </div>
                  </div>
                  {payoutTarget.mitra.nomorRekening && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(payoutTarget.mitra.nomorRekening || '');
                        setIsCopiedRek(true);
                        setTimeout(() => setIsCopiedRek(false), 2000);
                      }}
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #86EFAC',
                        color: '#15803D',
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
                      <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                        {isCopiedRek ? 'check' : 'content_copy'}
                      </span>
                      <span>{isCopiedRek ? 'Tersalin!' : 'Salin No Rek'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Rincian Pemohon & Nominal */}
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.66rem', color: '#64748B', fontWeight: 600 }}>Pemohon Visa Rujukan:</div>
                  <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.84rem' }}>
                    {payoutTarget.candidate.namaPemohon}
                  </div>
                  <div style={{ fontSize: '0.70rem', color: '#0284C7' }}>
                    {payoutTarget.candidate.program} ({payoutTarget.candidate.konsjen}) &bull; Visa Terbit
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.66rem', color: '#64748B', fontWeight: 600 }}>Nominal Komisi:</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#16A34A', fontFamily: 'monospace' }}>
                    {formatRupiah(payoutTarget.candidate.referralFee || 100000)}
                  </div>
                </div>
              </div>

              {/* Upload Bukti Transfer M-Banking (Cukup upload ini) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155' }}>
                    Upload Screenshot Struk Transfer M-Banking
                  </label>
                  <span style={{ fontSize: '0.66rem', color: '#16A34A', fontWeight: 600 }}>
                    {formatTanggalIndo(payoutTanggal)} &bull; Otomatis
                  </span>
                </div>
                {isCompressing ? (
                  <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#F0F9FF', borderRadius: '10px', border: '1.5px dashed #0284C7' }}>
                    <div style={{ fontSize: '0.74rem', color: '#0284C7', fontWeight: 800 }}>
                      ⚡ Mengompres Foto di Bawah 100 KB...
                    </div>
                    <div style={{ fontSize: '0.66rem', color: '#64748B', marginTop: '2px' }}>
                      Menjaga resolusi teks struk m-banking tetap tajam &amp; jelas
                    </div>
                  </div>
                ) : payoutBuktiFile ? (
                  <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1.5px solid #86EFAC', backgroundColor: '#F0FDF4', padding: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={payoutBuktiFile} alt="Bukti Transfer" style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '6px' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#166534' }}>Struk M-Banking Terlampir ✓</div>
                      <div style={{ fontSize: '0.68rem', color: '#64748B' }}>
                        Ukuran: <strong style={{ color: '#166534' }}>{payoutBuktiSizeKB || '< 95'} KB</strong> &bull; Otomatis di bawah 100 KB
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPayoutBuktiFile(null);
                        setPayoutBuktiSizeKB(0);
                      }}
                      style={{ backgroundColor: '#FEE2E2', color: '#DC2626', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '0.70rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Hapus / Ganti
                    </button>
                  </div>
                ) : (
                  <label
                    style={{
                      border: '1.5px dashed #0284C7',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '3px',
                      backgroundColor: '#F0F9FF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#0284C7' }}>
                      add_photo_alternate
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0369A1' }}>
                      Pilih Foto / Screenshot Struk M-Banking
                    </span>
                    <span style={{ fontSize: '0.66rem', color: '#64748B', textAlign: 'center' }}>
                      No. referensi bank &amp; waktu transfer otomatis terbaca dari foto struk
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setIsCompressing(true);
                          try {
                            const res = await compressImageUnder100KB(file, 95);
                            setPayoutBuktiFile(res.base64);
                            setPayoutBuktiSizeKB(Math.round(res.compressedSizeKB));
                          } catch (err) {
                            console.error('Kompresi gambar gagal:', err);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setPayoutBuktiFile(reader.result as string);
                              setPayoutBuktiSizeKB(Math.round(file.size / 1024));
                            };
                            reader.readAsDataURL(file);
                          } finally {
                            setIsCompressing(false);
                          }
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Opsi Tambahan (Collapsible) */}
              <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowAdvancedPayout(!showAdvancedPayout)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: '0.68rem',
                    color: '#64748B',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                    {showAdvancedPayout ? 'expand_less' : 'tune'}
                  </span>
                  <span>{showAdvancedPayout ? 'Tutup Opsi Tambahan' : 'Opsi Tambahan (Ubah Tanggal / Catatan / No. Ref Manual)'}</span>
                </button>

                {showAdvancedPayout && (
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#F8FAFC', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>
                          Tanggal Transfer
                        </label>
                        <input
                          type="date"
                          value={payoutTanggal}
                          onChange={(e) => setPayoutTanggal(e.target.value)}
                          style={{ width: '100%', padding: '5px 7px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.74rem', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>
                          No. Ref Manual (Opsional)
                        </label>
                        <input
                          type="text"
                          value={payoutNoRef}
                          onChange={(e) => setPayoutNoRef(e.target.value)}
                          placeholder="Auto-generated"
                          style={{ width: '100%', padding: '5px 7px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.74rem', fontFamily: 'monospace', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>
                        Catatan Khusus (Opsional)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Ditransfer via BCA m-banking pk 14:30"
                        value={payoutCatatan}
                        onChange={(e) => setPayoutCatatan(e.target.value)}
                        style={{ width: '100%', padding: '5px 7px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.74rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setPayoutTarget(null)}
                  style={{ backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', padding: '8px 14px', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPayout}
                  style={{
                    backgroundColor: '#16A34A',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.80rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                  <span>Konfirmasi Selesai Ditransfer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUKSES TRANSFER & NOTIFIKASI WHATSAPP */}
      {payoutSuccessModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPayoutSuccessModal(null);
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '430px',
              padding: '24px 20px',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #E2E8F0',
            }}
          >
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#DCFCE7', color: '#16A34A', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>check_circle</span>
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.10rem', fontWeight: 900, color: '#0F172A' }}>
              Transfer Payout Berhasil!
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.80rem', color: '#475569', lineHeight: 1.4 }}>
              Komisi sebesar <strong style={{ color: '#16A34A' }}>{formatRupiah(payoutSuccessModal.nominal)}</strong> untuk mitra <strong>{payoutSuccessModal.mitraNama}</strong> telah lunas &amp; bukti transfer tersimpan rapi di portal mitra.
            </p>

            {payoutSuccessModal.waUrl ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <a
                  href={payoutSuccessModal.waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    backgroundColor: '#25D366',
                    color: '#FFFFFF',
                    padding: '11px 16px',
                    borderRadius: '10px',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chat</span>
                  <span>Kirim Notifikasi ke WhatsApp Mitra</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPayoutSuccessModal(null)}
                  style={{
                    backgroundColor: '#F1F5F9',
                    color: '#64748B',
                    border: '1px solid #CBD5E1',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Selesai &amp; Tutup
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setPayoutSuccessModal(null)}
                style={{
                  backgroundColor: '#16A34A',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Selesai
              </button>
            )}
          </div>
        </div>
      )}

      {/* MODAL PREVIEW BUKTI TRANSFER UNTUK OWNER */}
      {previewBuktiTF && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewBuktiTF(null);
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '480px',
              maxHeight: '94vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #E2E8F0',
            }}
          >
            {/* Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                color: '#FFFFFF',
                padding: '20px',
                textAlign: 'center',
                position: 'relative',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setPreviewBuktiTF(null);
                  setEditProofFile(null);
                  setEditProofSizeKB(null);
                  setEditProofSuccess(false);
                }}
                style={{ position: 'absolute', top: '14px', right: '14px', background: 'none', border: 'none', color: '#FFFFFF', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>verified</span>
              </div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.9 }}>
                BUKTI TRANSFER PAYOUT RESMI
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 900, margin: '2px 0', fontFamily: 'monospace' }}>
                {formatRupiah(previewBuktiTF.payoutData?.nominal || 100000)}
              </div>
              <div style={{ fontSize: '0.74rem', backgroundColor: 'rgba(255,255,255,0.25)', display: 'inline-block', padding: '2px 10px', borderRadius: '12px' }}>
                ✓ Lunas Ditransfer oleh Owner MapahTrip
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Notifikasi Sukses Simpan / Hapus */}
              {editProofSuccess && (
                <div style={{ backgroundColor: '#DCFCE7', color: '#15803D', border: '1.5px solid #86EFAC', borderRadius: '8px', padding: '8px 12px', fontSize: '0.74rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                  <span>Foto bukti transfer berhasil diperbarui!</span>
                </div>
              )}

              {/* Hidden file input for replacing proof */}
              {isOwner && (
                <input
                  id="edit-payout-proof-file"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setIsCompressingProof(true);
                      try {
                        const res = await compressImageUnder100KB(file, 95);
                        setEditProofFile(res.base64);
                        setEditProofSizeKB(Math.round(res.compressedSizeKB));
                      } catch (err) {
                        console.error('Kompresi gambar gagal:', err);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEditProofFile(reader.result as string);
                          setEditProofSizeKB(Math.round(file.size / 1024));
                        };
                        reader.readAsDataURL(file);
                      } finally {
                        setIsCompressingProof(false);
                        e.target.value = '';
                      }
                    }
                  }}
                />
              )}

              {/* Jika sedang memilih foto baru untuk menggantikan bukti */}
              {editProofFile ? (
                <div style={{ borderRadius: '10px', overflow: 'hidden', border: '2px dashed #16A34A', backgroundColor: '#F0FDF4', padding: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>verified</span>
                      <span>Foto Pengganti Terpilih {editProofSizeKB ? `(${editProofSizeKB} KB, Otomatis Kompres)` : ''}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditProofFile(null)}
                      style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Batal
                    </button>
                  </div>
                  <img
                    src={editProofFile}
                    alt="Preview Bukti Baru"
                    style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '6px', backgroundColor: '#0F172A', display: 'block' }}
                  />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button
                      type="button"
                      disabled={isSavingProof}
                      onClick={handleSaveEditedProof}
                      style={{
                        flex: 1,
                        backgroundColor: '#16A34A',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '8px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>save</span>
                      <span>{isSavingProof ? 'Menyimpan...' : 'Simpan Foto Bukti Baru'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditProofFile(null)}
                      style={{
                        backgroundColor: '#F1F5F9',
                        color: '#64748B',
                        border: '1px solid #CBD5E1',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : previewBuktiTF.payoutData?.buktiTransferUrl ? (
                <div>
                  <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #CBD5E1', backgroundColor: '#0F172A' }}>
                    <div style={{ padding: '6px 10px', backgroundColor: '#1E293B', color: '#94A3B8', fontSize: '0.68rem', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>FOTO STRUK M-BANKING</span>
                      <a href={previewBuktiTF.payoutData.buktiTransferUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#38BDF8', fontSize: '0.68rem', textDecoration: 'none' }}>
                        Buka Penuh ↗
                      </a>
                    </div>
                    <img
                      src={previewBuktiTF.payoutData.buktiTransferUrl}
                      alt="Bukti M-Banking"
                      style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', display: 'block', backgroundColor: '#0F172A' }}
                    />
                  </div>
                  {/* Action buttons untuk Owner */}
                  {isOwner && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={handleDeleteEditedProof}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#EF4444',
                          fontSize: '0.70rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '2px 4px',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>delete</span>
                        <span>Hapus Foto</span>
                      </button>
                      <label
                        htmlFor="edit-payout-proof-file"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 10px',
                          borderRadius: '6px',
                          backgroundColor: '#F0FDF4',
                          border: '1.5px solid #86EFAC',
                          color: '#15803D',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: isCompressingProof ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                          {isCompressingProof ? 'hourglass_top' : 'photo_camera'}
                        </span>
                        <span>{isCompressingProof ? 'Mengompres...' : 'Ganti Foto Bukti'}</span>
                      </label>
                    </div>
                  )}
                </div>
              ) : (
                /* Jika belum ada foto bukti / sudah dihapus */
                isOwner ? (
                  <div style={{ borderRadius: '10px', border: '1.5px dashed #CBD5E1', padding: '14px', textAlign: 'center', backgroundColor: '#F8FAFC' }}>
                    <div style={{ color: '#64748B', fontSize: '0.74rem', marginBottom: '8px' }}>
                      Belum ada foto struk transfer yang terlampir.
                    </div>
                    <label
                      htmlFor="edit-payout-proof-file"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        backgroundColor: '#16A34A',
                        color: '#FFFFFF',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: isCompressingProof ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                        {isCompressingProof ? 'hourglass_top' : 'upload_file'}
                      </span>
                      <span>{isCompressingProof ? 'Mengompres...' : 'Unggah Foto Bukti Transfer'}</span>
                    </label>
                  </div>
                ) : null
              )}

              <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                  <span style={{ color: '#64748B' }}>No. Referensi:</span>
                  <span style={{ fontWeight: 800, fontFamily: 'monospace', color: '#0F172A' }}>
                    {previewBuktiTF.payoutData?.noRef || '-'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                  <span style={{ color: '#64748B' }}>Tanggal / Waktu:</span>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>
                    {formatTanggalIndo(previewBuktiTF.payoutData?.tanggalTransfer)} {previewBuktiTF.payoutData?.waktuTransfer ? `(${previewBuktiTF.payoutData.waktuTransfer})` : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                  <span style={{ color: '#64748B' }}>Penerima Komisi:</span>
                  <span style={{ fontWeight: 800, color: '#0F172A' }}>
                    {previewBuktiTF.mitra.nama}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                  <span style={{ color: '#64748B' }}>Rekening Tujuan:</span>
                  <span style={{ fontWeight: 800, color: '#0284C7' }}>
                    {previewBuktiTF.mitra.namaBank || 'BCA'} &bull; {previewBuktiTF.mitra.nomorRekening || '-'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                  <span style={{ color: '#64748B' }}>Pemohon Rujukan:</span>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>
                    {previewBuktiTF.candidate.namaPemohon} ({previewBuktiTF.candidate.program})
                  </span>
                </div>
                {previewBuktiTF.payoutData?.catatanOwner && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                    <span style={{ color: '#64748B' }}>Catatan Owner:</span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>
                      {previewBuktiTF.payoutData.catatanOwner}
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px' }}>
                  <span style={{ fontWeight: 800, color: '#0F172A' }}>Total Cair:</span>
                  <span style={{ fontWeight: 900, color: '#16A34A', fontSize: '0.90rem' }}>
                    {formatRupiah(previewBuktiTF.payoutData?.nominal || 100000)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPreviewBuktiTF(null);
                  setEditProofFile(null);
                  setEditProofSizeKB(null);
                  setEditProofSuccess(false);
                }}
                style={{
                  marginTop: '8px',
                  backgroundColor: '#F1F5F9',
                  color: '#475569',
                  border: '1px solid #CBD5E1',
                  padding: '9px',
                  borderRadius: '8px',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Tutup Bukti
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};
