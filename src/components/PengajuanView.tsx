import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import type { Pengajuan, StatusPengajuan, PaketVisa } from '../types';
import { supabase, updatePengajuanPaymentInDB, findAffiliateByCode } from '../lib/supabase';
import { kirimPesanWA, removeApplicantFromWAOutbox } from '../whatsapp';
import { getVisaPrice } from '../utils/visaPricing';
import { kirimNotifikasiLunasKeStaff, kirimNotifikasiLunasKeCustomer } from '../utils/staffPaymentNotification';
import { isApplicantAssignedToStaff } from '../utils/staffAssignment';

import type { StaffMaster } from '../types';

interface PengajuanViewProps {
  pengajuanList: Pengajuan[];
  onSelectPengajuan: (id: string) => void;
  onOpenNewPengajuan?: () => void;
  searchFilter: string;
  onSearchChange?: (val: string) => void;
  isOwner?: boolean;
  currentStaff?: StaffMaster | null;
  initialStatusTab?: string;
  onUpdateStage?: (
    id: string,
    stageData: {
      tglBerkasMasuk?: string;
      tglApply?: string;
      tglSelesai?: string;
      tglKirim?: string;
      status?: StatusPengajuan;
      noResi?: string;
      alasanPenolakan?: string;
    }
  ) => void;
  onUpdatePengajuan?: (updatedItem: Pengajuan) => void;
  onDeletePengajuan?: (id: string) => void;
  onActiveCountChange?: (count: number) => void;
}

export const PengajuanView: React.FC<PengajuanViewProps> = ({
  pengajuanList,
  onSelectPengajuan,
  searchFilter,
  onSearchChange,
  isOwner = false,
  currentStaff = null,
  initialStatusTab = 'Semua',
  onUpdateStage,
  onUpdatePengajuan,
  onDeletePengajuan,
  onActiveCountChange,
}) => {
  const [activeStatusTab, setActiveStatusTab] = useState<string>(initialStatusTab || 'Semua');

  useEffect(() => {
    if (initialStatusTab) {
      setActiveStatusTab(initialStatusTab);
    }
  }, [initialStatusTab]);
  // Wilayah konsulat tugas staf: default ke wilayah tugas jika staf login, atau 'Semua' jika owner
  const defaultTerritory = useMemo(() => {
    if (isOwner || !currentStaff?.konsjenTugas || currentStaff.konsjenTugas.length === 0) {
      return 'Semua';
    }
    if (currentStaff.konsjenTugas.length === 1) {
      return currentStaff.konsjenTugas[0];
    }
    return 'Tugas Staf';
  }, [isOwner, currentStaff]);

  const [selectedKonsjen, setSelectedKonsjen] = useState<string>(defaultTerritory);

  // Perbarui saat pergantian akun staf login
  useEffect(() => {
    setSelectedKonsjen(defaultTerritory);
  }, [defaultTerritory]);
  const [selectedPaket, setSelectedPaket] = useState<string>('Semua');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('Semua');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [showMaskedPaspor, setShowMaskedPaspor] = useState<boolean>(true);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // State Modal Pengiriman & Serah Terima Paspor di Bandara Soetta
  const [kirimModalItem, setKirimModalItem] = useState<Pengajuan | null>(null);
  const [kirimMetode, setKirimMetode] = useState<'soetta' | 'ekspedisi' | 'kantor'>('soetta');
  const [ekspedisiKurir, setEkspedisiKurir] = useState<string>('JNE');
  const [ekspedisiResi, setEkspedisiResi] = useState<string>('');
  const [soettaFlight, setSoettaFlight] = useState<string>('ANA NH836');
  const [soettaTanggalJam, setSoettaTanggalJam] = useState<string>('');
  const [soettaDate, setSoettaDate] = useState<string>('');
  const [soettaTime, setSoettaTime] = useState<string>('21:00');
  const [soettaTitikTemu, setSoettaTitikTemu] = useState<string>('Terminal 3 Keberangkatan Internasional Gate 1');
  const [kantorPengambil, setKantorPengambil] = useState<string>('Pemohon Sendiri');
  const [kirimKirimWA, setKirimKirimWA] = useState<boolean>(true);
  const [isSavingKirim, setIsSavingKirim] = useState<boolean>(false);
  const [showWAPreview, setShowWAPreview] = useState<boolean>(false);

  // State Modal Ubah Paket Layanan Visa & Pengaturan Keuangan
  const [editingPaketTarget, setEditingPaketTarget] = useState<Pengajuan | null>(null);
  const [newSelectedPaket, setNewSelectedPaket] = useState<PaketVisa>('Reguler');
  const [newNominalBiaya, setNewNominalBiaya] = useState<number>(0);
  const [newNominalKeluar, setNewNominalKeluar] = useState<number>(0);
  const [newStaffFee, setNewStaffFee] = useState<number>(50000);
  const [newReferralFee, setNewReferralFee] = useState<number>(100000);
  const [catatanPerubahanPaket, setCatatanPerubahanPaket] = useState<string>('');

  // Handler tombol Esc / Escape untuk menutup modal secara instan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingPaketTarget) {
          setEditingPaketTarget(null);
        } else if (selectedPreviewImage) {
          setSelectedPreviewImage(null);
        } else if (kirimModalItem && !isSavingKirim) {
          setKirimModalItem(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingPaketTarget, selectedPreviewImage, kirimModalItem, isSavingKirim]);

  // State override tahapan pengajuan (Sampai, Proses, Selesai, Kirim) secara realtime
  const [localStageOverrides, setLocalStageOverrides] = useState<
    Record<
      string,
      {
        tglSampai?: string;
        tglProses?: string;
        tglSelesai?: string;
        tglKirim?: string;
        noResi?: string;
        alasanPenolakan?: string;
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
    let tglKirim = ov.tglKirim !== undefined ? ov.tglKirim : (item.tglKirim || '');
    const noResi = ov.noResi !== undefined ? ov.noResi : (item.noResi || '');
    const alasanPenolakan = ov.alasanPenolakan !== undefined ? ov.alasanPenolakan : (item.alasanPenolakan || item.catatan || '');
    const currentStatus = ov.status || item.status;

    // Sinkronkan tglKirim dengan tanggal serah terima bandara jika ada keterangan di dalam noResi
    if (noResi) {
      const lower = noResi.toLowerCase();
      if (lower.includes('soetta') || lower.includes('soehatta') || lower.includes('flight') || lower.includes('bandara')) {
        const timeMatch = noResi.match(/\(([^)]+)\)/);
        if (timeMatch && timeMatch[1]) {
          const dmy = timeMatch[1].match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
          if (dmy) {
            tglKirim = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
          }
        }
      }
    }

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
      alasanPenolakan,
      currentStatus,
    };
  };

  const handleSendCustomerWALink = (e: React.MouseEvent, item: Pengajuan) => {
    e.stopPropagation();
    const noWa = item.noTelp?.trim();
    if (!noWa) {
      alert(`Nomor WhatsApp untuk pemohon "${item.namaPemohon}" belum tersedia.`);
      return;
    }

    const berkasList = [
      { name: 'Formulir Aplikasi Visa Jepang', ok: Boolean(item.berkas?.formVisa || item.uploadedDocs?.formVisa) },
      { name: 'Scan / Foto Paspor Asli', ok: Boolean(item.berkas?.pasporFisik || item.uploadedDocs?.pasporFisik) },
      { name: 'Pas Foto 4.5 × 3.5 cm (Background Putih)', ok: Boolean(item.berkas?.foto || item.fotoBase64 || item.uploadedDocs?.foto) },
      { name: 'Fotokopi / Scan KTP & Kartu Keluarga', ok: Boolean(item.berkas?.ktp || item.uploadedDocs?.ktp) },
      { name: 'COE / Bukti Booking Hotel & Tiket', ok: Boolean(item.berkas?.coe || item.uploadedDocs?.coe) },
      { name: 'Bukti Keuangan / Rekening Koran / E-KTLN', ok: Boolean(item.berkas?.ektln || item.uploadedDocs?.ektln) },
      { name: 'Surat Tugas & Perizinan', ok: Boolean(item.berkas?.suratTugas || item.uploadedDocs?.suratTugas) },
    ];
    const missing = berkasList.filter((b) => !b.ok).map((b) => `• ${b.name}`).join('\n');

    const pesan =
`*PEMBERITAHUAN KELENGKAPAN BERKAS VISA JEPANG - MAPAHTRIP*\n\n` +
`Halo Sdr/i *${item.namaPemohon}*,\n\n` +
`Pendaftaran pengajuan Visa Jepang Anda telah kami terima (*${item.noPengajuan || '-'}*).\n\n` +
(missing ? `Berikut berkas persyaratan yang masih perlu Anda lengkapi:\n${missing}\n\n` : '') +
`Silakan kirimkan foto / scan dokumen tersebut langsung dengan membalas pesan WhatsApp ini. Tim staf kami yang akan memverifikasi dan menginput kelengkapan berkas ke sistem.\n\n` +
`Terima kasih.\n\n` +
`Salam hangat,\n` +
`*Tim Operasional MapahTrip (${item.konsjen || 'Indonesia'})*`;

    const cleanNum = noWa.replace(/[^0-9]/g, '');
    const finalPhone = cleanNum.startsWith('0') ? '62' + cleanNum.substring(1) : cleanNum.startsWith('62') ? cleanNum : '62' + cleanNum;
    window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(pesan)}`, '_blank');
  };

  // Fitur Ekspor Data Spreadsheet Excel (.xlsx) - Otomatis terpisah kolom & sesuai wilayah
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const handleExportExcel = (dataToExport: Pengajuan[], scopeLabel: string) => {
    if (!dataToExport || dataToExport.length === 0) {
      alert('Tidak ada data pemohon yang dapat diekspor.');
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const fileName = `MapahTrip_Pengajuan_Visa_${scopeLabel}_${todayStr}.xlsx`;

    const headers = [
      'No',
      'No Registrasi',
      'Nama Pemohon',
      'Nomor Paspor',
      'No WhatsApp',
      'Konsulat Wilayah',
      'Staff PIC',
      'Program Permohonan Visa',
      'Paket Layanan',
      'Status Tahapan Saat Ini',
      'Tgl Berkas Masuk (Sampai)',
      'Tgl Diajukan (Proses JVAC)',
      'Tgl Selesai (Visa Terbit)',
      'Tgl Pengiriman Paspor',
      'No Resi Pengiriman',
      'Dibayar Pemohon (Rp)',
      'Modal Konsuler (Rp)',
      'Fee Bersih MapahTrip (Rp)',
      'Komisi Mitra (Rp)',
      'Kode Mitra / Affiliate',
      'Formulir Visa',
      'KTP Pemohon',
      'Paspor Fisik',
      'Pasfoto',
      'COE Asli',
      'Catatan / Alasan Penolakan',
    ];

    // Urutkan data secara menurun: data paling baru (ID / nomor registrasi terbesar) selalu di paling atas (No. 1)
    const sortedData = [...dataToExport].sort((a, b) => {
      const numA = parseInt(a.noPengajuan.replace(/[^0-9]/g, '') || a.id.replace(/[^0-9]/g, '') || '0', 10);
      const numB = parseInt(b.noPengajuan.replace(/[^0-9]/g, '') || b.id.replace(/[^0-9]/g, '') || '0', 10);
      return numB - numA;
    });

    const rows = sortedData.map((item, index) => {
      const stages = getCandidateStages(item);
      return [
        index + 1, // Nomor 1 untuk data terbaru di paling atas
        item.noPengajuan || '-',
        item.namaPemohon || '-',
        item.noPaspor || '-',
        item.noTelp || '-',
        item.konsjen || '-',
        item.staffPic || '-',
        item.program || '-',
        item.paket || '-',
        stages.currentStatus || item.status || '-',
        stages.tglSampai || item.tglBerkasMasuk || '-',
        stages.tglProses || item.tglApply || '-',
        stages.tglSelesai || item.tglSelesai || '-',
        stages.tglKirim || item.tglKirim || '-',
        stages.noResi || item.noResi || '-',
        item.dibayarPemohon || 0,
        item.nominalKeluar || 0,
        item.feeBersih || 0,
        item.referralFee || 0,
        item.affiliateCode || '-',
        item.berkas?.formVisa ? 'Lengkap' : 'Belum',
        item.berkas?.ktp ? 'Lengkap' : 'Belum',
        item.berkas?.pasporFisik ? 'Lengkap' : 'Belum',
        item.berkas?.foto ? 'Lengkap' : 'Belum',
        item.berkas?.coe ? 'Lengkap' : 'Belum',
        stages.alasanPenolakan || item.catatan || '-',
      ];
    });

    const worksheetData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    // Atur lebar kolom agar tidak terpotong saat dibuka di Microsoft Excel
    ws['!cols'] = [
      { wch: 6 },  // No
      { wch: 14 }, // No Registrasi
      { wch: 30 }, // Nama Pemohon
      { wch: 14 }, // Nomor Paspor
      { wch: 18 }, // No WhatsApp
      { wch: 16 }, // Konsulat Wilayah
      { wch: 20 }, // Staff PIC
      { wch: 24 }, // Program Permohonan
      { wch: 14 }, // Paket
      { wch: 22 }, // Status Saat Ini
      { wch: 16 }, // Tgl Berkas Masuk
      { wch: 16 }, // Tgl JVAC
      { wch: 16 }, // Tgl Selesai
      { wch: 16 }, // Tgl Kirim
      { wch: 24 }, // No Resi
      { wch: 18 }, // Dibayar Pemohon
      { wch: 18 }, // Modal Konsuler
      { wch: 18 }, // Fee Bersih
      { wch: 16 }, // Komisi Mitra
      { wch: 16 }, // Kode Affiliate
      { wch: 14 }, // Form Visa
      { wch: 14 }, // KTP
      { wch: 14 }, // Paspor Fisik
      { wch: 14 }, // Pasfoto
      { wch: 14 }, // COE
      { wch: 32 }, // Catatan / Alasan
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pengajuan Visa');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportNotice(`Berhasil mengunduh ${dataToExport.length} data pemohon wilayah (${scopeLabel.replace(/_/g, ', ')}) ke file Excel "${fileName}"`);
    setTimeout(() => setExportNotice(null), 6000);
  };

  const formatRupiah = (val: number) => {
    return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
  };

  const isRowFinanceInputted = (r: Pengajuan) => {
    // 1. Seluruh data historis spreadsheet resmi (MT-0001 s/d MT-0299 atau catatan spreadsheet)
    const numUrut = Number((r.noPengajuan || '').replace(/[^0-9]/g, ''));
    const isHistorical = (!isNaN(numUrut) && numUrut > 0 && numUrut <= 299) || Boolean(r.catatan && r.catatan.includes('Spreadsheet'));
    if (isHistorical) return true;

    // 2. Program Japan e-Visa / Waiver (bebas biaya modal konsulat & tanpa fee staf konsulat)
    const isW = (r.program || '').toLowerCase().includes('waiver');
    if (isW) return true;

    // 3. Untuk program visa konsulat/stiker lainnya (ada modal konsulat & fee staf):
    // Fee bersih HANYA dihitung jika Owner sudah menginput modal keluar (> 0)
    // ATAU sudah menginput fee staf / menyimpan rincian lewat tombol edit ✏️
    const hasCatatanUbah = Boolean(r.catatan && r.catatan.includes('Ubah paket/keuangan'));
    const hasModal = Boolean(r.nominalKeluar && r.nominalKeluar > 0);
    const hasStaffFee = Boolean(r.staffFee && r.staffFee > 0);
    return hasModal || hasStaffFee || hasCatatanUbah;
  };

  const getRowEffectiveFee = (r: Pengajuan) => {
    if (!isRowFinanceInputted(r)) {
      return 0;
    }
    const hasM = Boolean(r.affiliateCode && r.affiliateCode.trim() !== '' && r.affiliateCode.toUpperCase() !== 'MAPAHTRIP');
    const refF = hasM ? (r.referralFee || 100000) : 0;
    const isW = (r.program || '').toLowerCase().includes('waiver');
    const stF = isW ? 0 : (r.staffFee !== undefined && r.staffFee !== null ? r.staffFee : (r.cashback !== undefined && r.cashback !== null ? r.cashback : 0));
    return Math.max(0, (r.dibayarPemohon || 0) - (r.nominalKeluar || 0) - refF - stF);
  };

  const handleOpenEditPaket = (e: React.MouseEvent, item: Pengajuan) => {
    e.stopPropagation();
    setEditingPaketTarget(item);
    const initialPaket = (item.paket as PaketVisa) || 'Reguler';
    setNewSelectedPaket(initialPaket);
    setNewNominalBiaya(item.dibayarPemohon || getVisaPrice(item.program, initialPaket));
    setNewNominalKeluar(item.nominalKeluar || 0);
    const currStaffFee = item.staffFee !== undefined && item.staffFee !== null
      ? item.staffFee
      : (item.cashback !== undefined && item.cashback !== null ? item.cashback : 0);
    setNewStaffFee(currStaffFee);

    const hasMitra = Boolean(
      item.affiliateCode &&
      item.affiliateCode.trim() !== '' &&
      item.affiliateCode.toUpperCase() !== 'MAPAHTRIP'
    );
    const currRefFee = item.referralFee !== undefined && item.referralFee !== null
      ? item.referralFee
      : (hasMitra ? 100000 : 0);
    setNewReferralFee(currRefFee);

    setCatatanPerubahanPaket('');
  };

  const handleSelectNewPaket = (pkt: PaketVisa) => {
    setNewSelectedPaket(pkt);
    if (editingPaketTarget) {
      const price = getVisaPrice(editingPaketTarget.program, pkt);
      setNewNominalBiaya(price);
    }
  };

  const handleSaveNewPaket = async () => {
    if (!editingPaketTarget) return;

    const oldPaket = editingPaketTarget.paket || 'Reguler';

    // Hitung ulang fee bersih secara simpel & akurat: Dibayar - Modal Keluar - Referral Mitra - Fee Staf
    const hasMitra = Boolean(
      editingPaketTarget.affiliateCode &&
      editingPaketTarget.affiliateCode.trim() !== '' &&
      editingPaketTarget.affiliateCode.toUpperCase() !== 'MAPAHTRIP'
    );
    const refFee = hasMitra ? newReferralFee : 0;
    const newFeeBersih = Math.max(0, newNominalBiaya - newNominalKeluar - refFee - newStaffFee);

    const updatedItem: Pengajuan = {
      ...editingPaketTarget,
      paket: newSelectedPaket,
      dibayarPemohon: newNominalBiaya,
      nominalKeluar: newNominalKeluar,
      staffFee: newStaffFee,
      referralFee: refFee,
      feeBersih: newFeeBersih,
      catatan: catatanPerubahanPaket
        ? `${editingPaketTarget.catatan ? editingPaketTarget.catatan + ' | ' : ''}Ubah paket/keuangan (${oldPaket} -> ${newSelectedPaket}): ${catatanPerubahanPaket}`
        : `${editingPaketTarget.catatan ? editingPaketTarget.catatan + ' | ' : ''}Ubah paket/keuangan oleh Owner`,
    };

    if (onUpdatePengajuan) {
      onUpdatePengajuan(updatedItem);
    }

    try {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('mapahtrip:pengajuan-updated', { detail: updatedItem }));
    } catch {}

    updatePengajuanPaymentInDB(editingPaketTarget.id, {
      dibayarPemohon: newNominalBiaya,
      nominalKeluar: newNominalKeluar,
      staffFee: newStaffFee,
      referralFee: refFee,
      feeBersih: newFeeBersih,
    }).catch((e) => console.warn('Supabase sync error:', e));

    setEditingPaketTarget(null);
  };

  const handleKirimWAPaket = () => {
    if (!editingPaketTarget || !editingPaketTarget.noTelp) {
      alert(`Nomor WhatsApp untuk pemohon "${editingPaketTarget?.namaPemohon || ''}" belum tersedia.`);
      return;
    }

    const oldBiaya = editingPaketTarget.dibayarPemohon || 0;
    const selisih = newNominalBiaya - oldBiaya;

    let benefitDesc = '';
    if (newSelectedPaket === 'TAC') {
      benefitDesc = '⚡ *Paket TAC (Total Assistance Care)*: Penanganan berkas komprehensif, asistensi pengisian form lengkap, dan prioritas konsultasi konsuler.';
    } else if (newSelectedPaket === 'Premium') {
      benefitDesc = '★ *Paket Premium*: Jalur cepat asistensi berkas, cross-check dokumen teliti oleh tim senior, dan prioritas update status.';
    } else {
      benefitDesc = '📋 *Paket Reguler*: Pemrosesan berkas standar sesuai jadwal antrean konsulat resmi.';
    }

    let infoBayar = `💰 *Biaya Layanan:* ${formatRupiah(newNominalBiaya)}`;
    if (editingPaketTarget.statusPembayaran === 'Lunas' && selisih > 0) {
      infoBayar += `\n⚠️ *Kekurangan Pembayaran:* ${formatRupiah(selisih)} (sebelumnya lunas ${formatRupiah(oldBiaya)})`;
    } else if (editingPaketTarget.statusPembayaran === 'Lunas' && selisih < 0) {
      infoBayar += `\nℹ️ *Kelebihan Pembayaran (Refund):* ${formatRupiah(Math.abs(selisih))} (akan dikembalikan oleh admin)`;
    }

    const pesanWA =
`*PERUBAHAN PAKET LAYANAN VISA JEPANG - MAPAHTRIP* 🇯🇵✨\n\n` +
`Halo Sdr/i *${editingPaketTarget.namaPemohon}*,\n` +
`Paket layanan pengajuan visa Anda telah diperbarui di sistem kami:\n\n` +
`📄 *No. Registrasi:* ${editingPaketTarget.noPengajuan || '-'}\n` +
`🗾 *Program:* ${editingPaketTarget.program} (${editingPaketTarget.konsjen})\n` +
`📦 *Paket Baru:* *${newSelectedPaket}*\n` +
`${infoBayar}\n\n` +
`${benefitDesc}\n` +
(catatanPerubahanPaket ? `\n📝 *Catatan:* ${catatanPerubahanPaket}\n` : '') +
`\nJika ada pertanyaan mengenai perubahan ini, silakan hubungi tim kami. Terima kasih atas kepercayaan Anda memilih MapahTrip! 🙏\n\n` +
`*Tim Layanan MapahTrip*`;

    const cleanNum = editingPaketTarget.noTelp.replace(/[^0-9]/g, '');
    const finalPhone = cleanNum.startsWith('0') ? '62' + cleanNum.substring(1) : cleanNum.startsWith('62') ? cleanNum : '62' + cleanNum;
    window.open(`https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodeURIComponent(pesanWA)}`, '_blank');
  };

  // Notifikasi 1: Laporan Berkas Fisik Tiba di Kantor (HANYA dikirimkan ke OWNER saat tombol Sampai diklik)
  // Dibuat singkat & to-the-point agar Owner cepat membaca status & langsung siap nagih
  const getPesanWASampai = (item: Pengajuan, _dateStr: string) => {
    return (
      `*BERKAS SAMPAI (SIAP DITAGIH)* 👑📑\n\n` +
      `Berkas fisik tiba di kantor & telah dicek Staf PIC:\n\n` +
      `• *ID:* *${item.noPengajuan || '-'}*\n` +
      `• *Nama:* ${item.namaPemohon}\n` +
      `• *Program:* ${item.program || 'Visa Jepang'} (${item.paket || 'Reguler'})\n` +
      `• *PIC:* ${item.staffPic || 'Staf Wilayah'} (${item.konsjen || '-'})\n` +
      `• *WA:* ${item.noTelp || '-'}\n\n` +
      `👉 Siap kirim tagihan di Dashboard Owner:\n` +
      `🌐 https://mapahtrip.id/#owner`
    );
  };

  // Notifikasi 2: Invoice & Tagihan Resmi (Dikirimkan oleh OWNER via tombol "Kirim Tagihan")
  // Format ringkas, bersih, dan to-the-point agar pemohon langsung paham rincian pembayaran
  const getPesanWATagihanResmi = (item: Pengajuan, nominalTagihan: number) => {
    return (
      `*INVOICE & TAGIHAN VISA JEPANG - MAPAHTRIP* 🇯🇵💳\n\n` +
      `Halo Kak *${item.namaPemohon}*,\n` +
      `Dokumen fisik Anda telah tiba di kantor kami dan selesai diverifikasi. ✅\n\n` +
      `📋 *Rincian Pengajuan:*\n` +
      `• ID: *${item.noPengajuan || '-'}*\n` +
      `• Program: ${item.program || 'Visa Jepang'} (${item.paket || 'Reguler'})\n` +
      `• Total Tagihan: *${formatRupiah(nominalTagihan)}*\n\n` +
      `🏦 *Rekening Resmi Pembayaran:*\n` +
      `*Bank BTN (Bank Tabungan Negara)*\n` +
      `No. Rekening: *1190-0150-0015-870*\n` +
      `A/N: *Tokyo Asia Connection*\n\n` +
      `Mohon balas chat ini dengan melampirkan *foto bukti transfer* agar pembayaran langsung diverifikasi dan berkas segera diserahkan ke Konsulat / JVAC. 🙏\n\n` +
      `Terima kasih! 🌸\n` +
      `*MapahTrip*`
    );
  };

  const getPesanWAProses = (item: Pengajuan, dateStr: string) => {
    return (
      `*PEMBERITAHUAN PENGAJUAN VISA DIPROSES - MAPAHTRIP* 🇯🇵📋\n\n` +
      `Halo Sdr/i *${item.namaPemohon}*,\n\n` +
      `Berkas permohonan Visa Jepang Anda saat ini telah *RESMI DIAJUKAN DAN SEDANG DIPROSES* oleh Kedutaan Besar Jepang / JVAC. 🏛️\n\n` +
      `📋 *Rincian Pengajuan:*\n` +
      `• No. Pengajuan: ${item.noPengajuan || '-'}\n` +
      `• Nama Pemohon: ${item.namaPemohon}\n` +
      `• No. Paspor: ${item.noPaspor}\n` +
      `• Program: ${item.program || 'Visa Jepang'}\n` +
      `• Tanggal Apply: ${dateStr}\n` +
      `• Status: *Sedang Diproses Kedutaan / JVAC* ⏳\n\n` +
      `Estimasi waktu pemrosesan kedutaan sekitar 6 hari kerja. Kami akan segera mengabarkan Anda kembali begitu visa telah selesai dan terbit.\n\n` +
      `Terima kasih atas kepercayaannya bersama MapahTrip! 🌸\n\n` +
      `Salam hangat,\n` +
      `*Tim Operasional MapahTrip*\n` +
      `Website: https://mapahtrip.id`
    );
  };

  const getPesanWASelesai = (item: Pengajuan, dateStr: string) => {
    return (
      `*PEMBERITAHUAN VISA JEPANG SELESAI - MAPAHTRIP* 🇯🇵✨\n\n` +
      `Halo Sdr/i *${item.namaPemohon}*,\n\n` +
      `Kabar gembira! Pengajuan Visa Jepang Anda telah *SELESAI* diproses oleh Kedutaan / JVAC dan visa telah resmi terbit. ✅\n\n` +
      `📋 *Rincian Pengajuan:*\n` +
      `• No. Pengajuan: ${item.noPengajuan || '-'}\n` +
      `• Nama Pemohon: ${item.namaPemohon}\n` +
      `• No. Paspor: ${item.noPaspor}\n` +
      `• Program: ${item.program || 'Visa Jepang'}\n` +
      `• Tanggal Selesai: ${dateStr}\n` +
      `• Status: *SELESAI (Visa Terbit)*\n\n` +
      `📦 Paspor fisik dan stiker visa Anda sudah siap. Informasi penyerahan langsung atau nomor resi pengiriman akan kami informasikan lebih lanjut.\n\n` +
      `Terima kasih telah mempercayakan pengurusan visa Anda kepada MapahTrip! 🌸\n\n` +
      `Salam hangat,\n` +
      `*Tim Operasional MapahTrip*\n` +
      `Website: https://mapahtrip.id`
    );
  };

  const handleKirimUlangWA = async (item: Pengajuan, stageName: 'sampai' | 'proses' | 'selesai') => {
    if (!item.noTelp || !item.noTelp.trim()) {
      alert(`Nomor WhatsApp untuk "${item.namaPemohon}" belum tersedia.`);
      return;
    }

    const stages = getCandidateStages(item);
    const dateStr = stageName === 'sampai' ? (stages.tglSampai || getTodayFormatted())
      : stageName === 'proses' ? (stages.tglProses || getTodayFormatted())
      : (stages.tglSelesai || getTodayFormatted());

    const pesan = stageName === 'sampai' ? getPesanWASampai(item, dateStr)
      : stageName === 'proses' ? getPesanWAProses(item, dateStr)
      : getPesanWASelesai(item, dateStr);

    const labelTahap = stageName === 'sampai' ? 'BERKAS FISIK TIBA'
      : stageName === 'proses' ? 'SEDANG DIPROSES'
      : 'SELESAI (VISA TERBIT)';

    const res = await kirimPesanWA(item.noTelp, pesan, {
      namaPemohon: item.namaPemohon,
      tahap: labelTahap,
    });

    if (res && res.success) {
      alert(`✅ SUKSES!\n\nNotifikasi WhatsApp (${labelTahap}) berhasil dikirimkan ulang ke ${item.namaPemohon} (${item.noTelp}).`);
    } else {
      alert(
        `⚠️ GATEWAY SEDANG CONNECTING / OFFLINE!\n\n` +
        `Notifikasi WhatsApp (${labelTahap}) untuk "${item.namaPemohon}" telah OTOMATIS DISIMPAN DI ANTREAN OUTBOX.\n\n` +
        `Sistem akan langsung mengirimkannya otomatis begitu gateway online kembali.\n\n` +
        `Anda juga dapat membuka pesan via WhatsApp Web melalui indikator [WA Gateway] di pojok kanan atas.`
      );
    }
  };

  // Handler Khusus Owner: Mengirimkan Tagihan Resmi & Rekening Transfer via WhatsApp
  const handleKirimTagihanWA = async (item: Pengajuan) => {
    if (!item.noTelp || !item.noTelp.trim()) {
      alert(`Nomor WhatsApp untuk "${item.namaPemohon}" belum tersedia.`);
      return;
    }

    const currentNominal = item.dibayarPemohon || 1650000;
    const inputNominal = window.prompt(
      `💳 KONFIRMASI & KIRIM TAGIHAN RESMI (KHUSUS OWNER)\n\n` +
      `Pemohon: ${item.namaPemohon} (${item.noPengajuan || '-'})\n` +
      `Program: ${item.program || 'Visa Jepang'} (${item.paket || 'Reguler'})\n` +
      `No. WhatsApp: ${item.noTelp}\n\n` +
      `Masukkan Total Nominal Tagihan Resmi untuk Customer (Rp):\n` +
      `(Anda dapat menyesuaikan nominal ini jika ada biaya tambahan berkas penjamin/konsulat. Nominal ini yang akan dicatat di sistem dan dikirim ke WhatsApp customer beserta no rekening BTN)`,
      String(currentNominal)
    );

    if (inputNominal === null) return; // Owner membatalkan

    const parsed = parseInt(inputNominal.replace(/[^0-9]/g, ''), 10);
    const nominalFinal = !isNaN(parsed) && parsed > 0 ? parsed : currentNominal;

    // Jika nominal diubah oleh Owner, update data pemohon di Supabase DB dan state aplikasi
    if (nominalFinal !== item.dibayarPemohon) {
      const refFee = item.referralFee || 0;
      const staffFee = item.staffFee || 0;
      const modalKeluar = item.nominalKeluar || 0;
      const newFeeBersih = Math.max(0, nominalFinal - modalKeluar - refFee - staffFee);

      try {
        await updatePengajuanPaymentInDB(item.id, {
          dibayarPemohon: nominalFinal,
          feeBersih: newFeeBersih,
        });
        if (onUpdatePengajuan) {
          onUpdatePengajuan({
            ...item,
            dibayarPemohon: nominalFinal,
            feeBersih: newFeeBersih,
          });
        }
      } catch (err) {
        console.warn('Gagal update nominal tagihan ke Supabase:', err);
      }
    }

    const updatedItem = { ...item, dibayarPemohon: nominalFinal };
    const pesanTagihan = getPesanWATagihanResmi(updatedItem, nominalFinal);

    const res = await kirimPesanWA(item.noTelp, pesanTagihan, {
      namaPemohon: item.namaPemohon,
      tahap: 'Tagihan Resmi',
    });

    if (res && res.success) {
      alert(`✅ TAGIHAN TERKIRIM!\n\nInvoice tagihan resmi sebesar ${formatRupiah(nominalFinal)} berhasil dikirimkan via WhatsApp ke ${item.namaPemohon} (${item.noTelp}).`);
    } else {
      alert(
        `⚠️ GATEWAY SEDANG CONNECTING / OFFLINE!\n\n` +
        `Pesan tagihan resmi sebesar ${formatRupiah(nominalFinal)} untuk "${item.namaPemohon}" telah OTOMATIS DISIMPAN DI ANTREAN OUTBOX.\n\n` +
        `Sistem akan langsung mengirimkannya begitu koneksi gateway online kembali.`
      );
    }
  };

  const handleToggleStage = async (
    item: Pengajuan,
    stage: 'sampai' | 'proses' | 'selesai' | 'kirim'
  ) => {
    const stages = getCandidateStages(item);
    const today = getTodayFormatted();
    const newStages = { ...(localStageOverrides[item.id] || {}) };
    let newStatus: StatusPengajuan = stages.currentStatus;
    let shouldSendWASampai = false;
    let shouldSendWAProses = false;
    let shouldSendWASelesai = false;

    if (stage === 'sampai') {
      if (stages.isSampai) {
        // Cek apakah tahap berikutnya masih aktif
        if (stages.isProses || stages.isSelesai || stages.isKirim) {
          const nextStage = stages.isKirim ? 'Kirim' : stages.isSelesai ? 'Selesai' : 'Proses';
          alert(
            `⚠️ Tidak Dapat Membatalkan Tahap 1 (Sampai)!\n\n` +
            `Pengajuan berkas atas nama "${item.namaPemohon}" saat ini sudah berada di tahap selanjutnya (${nextStage}).\n\n` +
            `Harap batalkan tahap "${nextStage}" terlebih dahulu secara berurutan.`
          );
          return;
        }

        const confirmAksi = window.confirm(
          `ℹ️ TAHAPAN BERKAS SAMPAI SUDAH TERCATAT (${stages.tglSampai})!\n\n` +
          `Pemohon: ${item.namaPemohon}\n` +
          `No. WhatsApp: ${item.noTelp || '-'}\n\n` +
          `PILIH AKSI:\n` +
          `• Klik [OK] untuk KIRIM ULANG notifikasi WhatsApp & rincian tagihan ke customer.\n` +
          `• Klik [Cancel] jika Anda ingin opsi MEMBATALKAN / MERESET status sampai.`
        );

        if (confirmAksi) {
          handleKirimUlangWA(item, 'sampai');
          return;
        }

        const confirmBatal = window.confirm(
          `⚠️ Batalkan Status Berkas Sampai?\n\nApakah Anda yakin ingin membatalkan status berkas fisik sampai untuk pengajuan atas nama "${item.namaPemohon}"?`
        );
        if (!confirmBatal) return;
        newStages.tglSampai = '';
        if (newStatus === 'Sedang Diproses') {
          newStatus = 'Menunggu Verifikasi';
        }
      } else {
        const noWa = item.noTelp && item.noTelp.trim() ? item.noTelp.trim() : 'Nomor belum tersedia';
        const konfirmasi = window.confirm(
          `📦 KONFIRMASI PENERIMAAN BERKAS FISIK (TAHAP 1)\n\n` +
          `Tandai bahwa paspor & dokumen fisik telah TIBA di kantor konsulat:\n` +
          `• Nama Pemohon : ${item.namaPemohon}\n` +
          `• No. Paspor   : ${item.noPaspor}\n` +
          `• No. WhatsApp : ${noWa}\n\n` +
          `Setelah Anda klik OK:\n` +
          `1. Status berkas ditandai "Sampai".\n` +
          `2. Sistem otomatis mengirimkan laporan berkas tiba ke WhatsApp OWNER MapahTrip agar Owner mengetahui berkas sudah sampai dan Owner yang akan menerbitkan/mengirimkan tagihan resmi ke customer.\n\n` +
          `(Catatan: Customer tidak menerima WA sekarang; customer akan menerima WA konfirmasi berkas tiba beserta invoice resmi saat Owner mengirim tagihan).\n\n` +
          `Apakah Anda yakin berkas fisik sudah tiba di kantor?`
        );
        if (!konfirmasi) return;

        newStages.tglSampai = today;
        if (!newStatus) {
          newStatus = 'Menunggu Verifikasi';
        }
        shouldSendWASampai = true;
      }
    } else if (stage === 'proses') {
      if (stages.isProses) {
        // Cek apakah tahap berikutnya masih aktif
        if (stages.isSelesai || stages.isKirim) {
          const nextStage = stages.isKirim ? 'Kirim' : 'Selesai';
          alert(
            `⚠️ Tidak Dapat Membatalkan Tahap 2 (Proses)!\n\n` +
            `Pengajuan visa atas nama "${item.namaPemohon}" saat ini sudah berada di tahap selanjutnya (${nextStage}).\n\n` +
            `Harap batalkan tahap "${nextStage}" terlebih dahulu secara berurutan.`
          );
          return;
        }

        const confirmAksi = window.confirm(
          `ℹ️ TAHAPAN PROSES SUDAH TERCATAT (${stages.tglProses})!\n\n` +
          `Pemohon: ${item.namaPemohon}\n` +
          `No. WhatsApp: ${item.noTelp || '-'}\n\n` +
          `PILIH AKSI:\n` +
          `• Klik [OK] untuk KIRIM ULANG notifikasi WhatsApp bahwa berkas sedang diproses di kedutaan.\n` +
          `• Klik [Cancel] jika Anda ingin opsi MEMBATALKAN / MERESET tanggal proses.`
        );

        if (confirmAksi) {
          handleKirimUlangWA(item, 'proses');
          return;
        }

        const confirmBatal = window.confirm(
          `⚠️ Batalkan Status Proses?\n\nApakah Anda yakin ingin membatalkan status SEDANG DIPROSES untuk pengajuan atas nama "${item.namaPemohon}"?`
        );
        if (!confirmBatal) return;
        newStages.tglProses = '';
        if (newStatus === 'Sedang Diproses' || newStatus === 'Apply Hari Ini') {
          newStatus = 'Menunggu Verifikasi';
        }
      } else {
        // VALIDASI STATUS PEMBAYARAN: Staf dilarang proses berkas sebelum pembayaran lunas
        const isBelumLunas = item.statusPembayaran === 'Menunggu Pembayaran';
        if (!isOwner && isBelumLunas) {
          alert(
            `⛔ BERKAS DITAHAN (PEMBAYARAN BELUM LUNAS)!\n\n` +
            `Pengajuan visa atas nama "${item.namaPemohon}" saat ini berstatus BELUM LUNAS (Menunggu Pembayaran).\n\n` +
            `SOP Operasional MapahTrip:\n` +
            `Berkas fisik ditahan di kantor dan staf TIDAK DAPAT mengajukan berkas ke JVAC/Kedutaan sebelum pembayaran diverifikasi lunas oleh Owner.`
          );
          return;
        }

        // VALIDASI URUTAN: Tahap 1 (Sampai) harus selesai terlebih dahulu
        if (!stages.isSampai) {
          alert(
            `⚠️ TAHAPAN HARUS BERURUTAN!\n\n` +
            `Tahap 1 (Berkas Sampai di Kantor) harus diselesaikan terlebih dahulu sebelum dapat melanjutkan ke Tahap 2 (Sedang Diproses di Kedutaan/JVAC).\n\n` +
            `Silakan tandai Berkas Sampai terlebih dahulu.`
          );
          return;
        }

        const noWa = item.noTelp && item.noTelp.trim() ? item.noTelp.trim() : 'Nomor belum tersedia';
        const konfirmasi = window.confirm(
          `⚠️ PERINGATAN KONFIRMASI: APAKAH YAKIN SUDAH DIPROSES? (TAHAP 2)\n\n` +
          `Anda akan menandai pengajuan visa ini sebagai SEDANG DIPROSES:\n` +
          `• Nama Pemohon : ${item.namaPemohon}\n` +
          `• No. Paspor   : ${item.noPaspor}\n` +
          `• No. WhatsApp : ${noWa}\n\n` +
          `⚠️ PENTING:\n` +
          `Setelah Anda klik OK, status akan diubah menjadi "Sedang Diproses" dan notifikasi resmi bahwa berkas visa telah diajukan ke Kedutaan / JVAC akan OTOMATIS dikirimkan melalui WhatsApp ke nomor customer (${noWa}).\n\n` +
          `Apakah Anda yakin ingin melanjutkan kirim notifikasi WhatsApp ke customer?`
        );
        if (!konfirmasi) return;

        newStages.tglProses = today;
        newStatus = 'Sedang Diproses';
        shouldSendWAProses = true;
      }
    } else if (stage === 'selesai') {
      if (stages.isSelesai) {
        // Cek apakah tahap Kirim sudah aktif
        if (stages.isKirim) {
          alert(
            `⚠️ Tidak Dapat Membatalkan Tahap 3 (Selesai)!\n\n` +
            `Paspor atas nama "${item.namaPemohon}" saat ini sudah berstatus Kirim / Handover.\n\n` +
            `Harap batalkan status Kirim terlebih dahulu sebelum membatalkan status Selesai.`
          );
          return;
        }

        const confirmAksi = window.confirm(
          `ℹ️ TAHAPAN SELESAI SUDAH TERCATAT (${stages.tglSelesai})!\n\n` +
          `Pemohon: ${item.namaPemohon}\n` +
          `No. WhatsApp: ${item.noTelp || '-'}\n\n` +
          `PILIH AKSI:\n` +
          `• Klik [OK] untuk KIRIM ULANG notifikasi WhatsApp bahwa visa telah terbit.\n` +
          `• Klik [Cancel] jika Anda ingin opsi MEMBATALKAN / MERESET status selesai.`
        );

        if (confirmAksi) {
          handleKirimUlangWA(item, 'selesai');
          return;
        }

        const confirmBatal = window.confirm(
          `⚠️ Batalkan Status Selesai?\n\nApakah Anda yakin ingin membatalkan status SELESAI untuk pengajuan atas nama "${item.namaPemohon}"?`
        );
        if (!confirmBatal) return;
        newStages.tglSelesai = '';
        if (newStatus === 'Selesai') {
          newStatus = stages.isProses ? 'Sedang Diproses' : 'Menunggu Verifikasi';
        }
      } else {
        // VALIDASI STATUS PEMBAYARAN: Staf dilarang menandai selesai sebelum lunas
        const isBelumLunas = item.statusPembayaran === 'Menunggu Pembayaran';
        if (!isOwner && isBelumLunas) {
          alert(
            `⛔ BERKAS DITAHAN (PEMBAYARAN BELUM LUNAS)!\n\n` +
            `Pengajuan visa atas nama "${item.namaPemohon}" saat ini berstatus BELUM LUNAS.\n\n` +
            `SOP Operasional MapahTrip:\n` +
            `Staf tidak dapat menandai visa terbit/selesai sebelum pembayaran lunas.`
          );
          return;
        }

        // VALIDASI URUTAN: Tahap 2 (Proses) harus selesai terlebih dahulu
        if (!stages.isProses) {
          alert(
            `⚠️ TAHAPAN HARUS BERURUTAN!\n\n` +
            `Tahap 2 (Sedang Diproses di Kedutaan) harus diselesaikan terlebih dahulu sebelum menandai Visa Terbit / Selesai (Tahap 3).\n\n` +
            `Silakan selesaikan Tahap 2 (Proses) terlebih dahulu.`
          );
          return;
        }

        const noWa = item.noTelp && item.noTelp.trim() ? item.noTelp.trim() : 'Nomor belum tersedia';
        const konfirmasi = window.confirm(
          `⚠️ PERINGATAN KONFIRMASI: APAKAH YAKIN SUDAH SELESAI? (TAHAP 3)\n\n` +
          `Anda akan menandai pengajuan visa ini sebagai SELESAI (Visa Terbit):\n` +
          `• Nama Pemohon : ${item.namaPemohon}\n` +
          `• No. Paspor   : ${item.noPaspor}\n` +
          `• No. WhatsApp : ${noWa}\n\n` +
          `⚠️ PENTING:\n` +
          `Setelah Anda klik OK, status akan diubah menjadi "Selesai" dan notifikasi resmi bahwa visa telah terbit akan OTOMATIS dikirimkan melalui WhatsApp ke nomor customer (${noWa}).\n\n` +
          `Apakah Anda yakin sudah selesai dan ingin melanjutkan kirim notifikasi WhatsApp ke customer?`
        );
        if (!konfirmasi) return;

        newStages.tglSelesai = today;
        newStatus = 'Selesai';
        shouldSendWASelesai = true;
      }
    } else if (stage === 'kirim') {
      if (stages.isKirim) {
        const confirmBatal = window.confirm(
          `⚠️ Batalkan Status Kirim?\n\nApakah Anda yakin ingin membatalkan status pengiriman paspor untuk "${item.namaPemohon}"?`
        );
        if (!confirmBatal) return;
        newStages.tglKirim = '';
        newStages.noResi = '';
        newStatus = 'Selesai';
      } else {
        // VALIDASI STATUS PEMBAYARAN: Dilarang kirim paspor jika belum lunas
        const isBelumLunas = item.statusPembayaran === 'Menunggu Pembayaran';
        if (!isOwner && isBelumLunas) {
          alert(
            `⛔ PASPOR DITAHAN (PEMBAYARAN BELUM LUNAS)!\n\n` +
            `Paspor atas nama "${item.namaPemohon}" TIDAK DAPAT dikirimkan atau diserahkan ke customer sebelum pembayaran diverifikasi lunas oleh Owner.`
          );
          return;
        }

        // VALIDASI URUTAN: Tahap 3 (Selesai) harus selesai terlebih dahulu
        if (!stages.isSelesai) {
          alert(
            `⚠️ TAHAPAN HARUS BERURUTAN!\n\n` +
            `Tahap 3 (Visa Terbit / Selesai) harus diselesaikan terlebih dahulu sebelum paspor dapat dikirimkan ke customer atau diserahterimakan (Tahap 4).\n\n` +
            `Silakan selesaikan Tahap 3 (Selesai) terlebih dahulu.`
          );
          return;
        }

        openKirimModal(item);
        return;
      }
    }

    newStages.status = newStatus;

    // 1. Simpan ke local state override instan
    setLocalStageOverrides((prev) => {
      const updated = {
        ...prev,
        [item.id]: {
          ...(prev[item.id] || {}),
          ...newStages,
        },
      };
      try {
        localStorage.setItem('mapahtrip_stage_overrides', JSON.stringify(updated));
      } catch { }
      return updated;
    });

    // 2. Beritahu App.tsx
    if (onUpdateStage) {
      onUpdateStage(item.id, {
        tglBerkasMasuk: newStages.tglSampai,
        tglApply: newStages.tglProses,
        tglSelesai: newStages.tglSelesai,
        tglKirim: newStages.tglKirim,
        noResi: newStages.noResi,
        status: newStatus,
      });
    }

    // 3. Simpan ke localStorage registrations
    try {
      const raw = localStorage.getItem('mapahtrip_local_registrations');
      if (raw) {
        const list: Pengajuan[] = JSON.parse(raw);
        const updatedList = list.map((p) =>
          p.id === item.id
            ? {
              ...p,
              tglBerkasMasuk: newStages.tglSampai !== undefined ? newStages.tglSampai : p.tglBerkasMasuk,
              tglApply: newStages.tglProses !== undefined ? newStages.tglProses : p.tglApply,
              tglSelesai: newStages.tglSelesai !== undefined ? newStages.tglSelesai : p.tglSelesai,
              tglKirim: newStages.tglKirim !== undefined ? newStages.tglKirim : p.tglKirim,
              noResi: newStages.noResi !== undefined ? newStages.noResi : p.noResi,
              status: newStatus,
            }
            : p
        );
        localStorage.setItem('mapahtrip_local_registrations', JSON.stringify(updatedList));
      }
    } catch { }

    // 4. Sinkronisasi ke Supabase Cloud
    try {
      const numId = Number(item.id);
      if (!isNaN(numId)) {
        const finalSampai = newStages.tglSampai !== undefined ? newStages.tglSampai : (stages.tglSampai || '');
        const finalProses = newStages.tglProses !== undefined ? newStages.tglProses : (stages.tglProses || '');
        const finalSelesai = newStages.tglSelesai !== undefined ? newStages.tglSelesai : (stages.tglSelesai || '');
        const finalKirim = newStages.tglKirim !== undefined ? newStages.tglKirim : (stages.tglKirim || '');
        const finalResi = newStages.noResi !== undefined ? newStages.noResi : (stages.noResi || '');

        await supabase
          .from('pengajuan_visa')
          .update({
            tgl_sampai: finalSampai || null,
            tgl_proses: finalProses || null,
            tgl_selesai: finalSelesai || null,
            tgl_kirim: finalKirim || null,
            resi_pengiriman: finalResi || null,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', numId);
      }
    } catch (e) {
      console.warn('Sync stage to Supabase failed:', e);
    }

    // Otomatis Kirim WhatsApp Laporan ke Owner saat Staf / Admin klik "Sampai"
    // Customer TIDAK dikirimi WA saat ini agar tidak spam; customer baru dikirimi saat Owner klik "Kirim Tagihan".
    if (shouldSendWASampai) {
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
        const pesanWASampaiOwner = getPesanWASampai(item, today);
        const waRes = await kirimPesanWA(ownerWa.trim(), pesanWASampaiOwner, {
          namaPemohon: 'Owner MapahTrip',
          tahap: 'Laporan Berkas Sampai',
        });

        if (waRes && waRes.success) {
          alert(
            `✅ STATUS BERKAS SAMPAI!\n\n` +
            `Pengajuan atas nama "${item.namaPemohon}" telah ditandai BERKAS SAMPAI.\n\n` +
            `👑 Notifikasi laporan berkas tiba telah BERHASIL TERKIRIM ke WhatsApp Owner MapahTrip.\n\n` +
            `ℹ️ Customer belum ditagih. Notifikasi berkas tiba beserta rincian tagihan resmi akan dikirimkan ke customer saat Owner mengklik tombol [💳 Kirim Tagihan].`
          );
        } else {
          alert(
            `✅ STATUS BERKAS SAMPAI TERSIMPAN!\n\n` +
            `Pengajuan atas nama "${item.namaPemohon}" telah ditandai BERKAS SAMPAI.\n\n` +
            `⏳ Laporan berkas tiba ke Owner disimpan di antrean outbox (menunggu gateway online).`
          );
        }
      } else {
        alert(
          `✅ STATUS BERKAS SAMPAI!\n\n` +
          `Pengajuan atas nama "${item.namaPemohon}" telah ditandai BERKAS SAMPAI.\n\n` +
          `Customer akan menerima konfirmasi berkas tiba beserta invoice saat Owner mengklik tombol [💳 Kirim Tagihan].`
        );
      }
    } else if (shouldSendWAProses) {
      if (item.noTelp && item.noTelp.trim()) {
        const pesanWAProses = getPesanWAProses(item, today);
        const waRes = await kirimPesanWA(item.noTelp, pesanWAProses, {
          namaPemohon: item.namaPemohon,
          tahap: 'Sedang Diproses',
        });

        if (waRes && waRes.success) {
          alert(
            `✅ STATUS VISA DIPROSES!\n\n` +
            `Pengajuan atas nama "${item.namaPemohon}" telah diubah menjadi SEDANG DIPROSES.\n\n` +
            `✅ Notifikasi WhatsApp resmi bahwa berkas sedang diproses telah BERHASIL TERKIRIM ke nomor customer (${item.noTelp}).`
          );
        } else {
          alert(
            `⚠️ STATUS VISA DIPROSES TERSIMPAN!\n\n` +
            `Pengajuan atas nama "${item.namaPemohon}" berhasil disimpan sebagai SEDANG DIPROSES.\n\n` +
            `📡 KONDISI GATEWAY: WhatsApp Gateway sedang connecting / offline.\n\n` +
            `⏳ Pesan notifikasi telah OTOMATIS DISIMPAN KE ANTREAN OUTBOX.\n` +
            `Sistem akan langsung mengirimkannya otomatis begitu gateway online kembali.\n\n` +
            `Anda juga dapat memantau antrean via tombol [WA Gateway] di pojok kanan atas.`
          );
        }
      } else {
        alert(
          `✅ STATUS VISA DIPROSES!\n\n` +
          `Pengajuan atas nama "${item.namaPemohon}" telah diubah menjadi SEDANG DIPROSES.\n\n` +
          `⚠️ Catatan: Nomor WhatsApp pemohon belum tersedia, sehingga pesan WA tidak terkirim.`
        );
      }
    } else if (shouldSendWASelesai) {
      if (item.noTelp && item.noTelp.trim()) {
        const pesanWASelesai = getPesanWASelesai(item, today);
        const waRes = await kirimPesanWA(item.noTelp, pesanWASelesai, {
          namaPemohon: item.namaPemohon,
          tahap: 'Visa Selesai',
        });

        if (waRes && waRes.success) {
          alert(
            `✅ STATUS VISA SELESAI!\n\n` +
            `Pengajuan atas nama "${item.namaPemohon}" telah diubah menjadi SELESAI.\n\n` +
            `✅ Notifikasi WhatsApp resmi bahwa visa telah terbit telah BERHASIL TERKIRIM ke nomor customer (${item.noTelp}).`
          );
        } else {
          alert(
            `⚠️ STATUS VISA SELESAI TERSIMPAN!\n\n` +
            `Pengajuan atas nama "${item.namaPemohon}" berhasil disimpan sebagai SELESAI (Visa Terbit).\n\n` +
            `📡 KONDISI GATEWAY: WhatsApp Gateway sedang connecting / offline.\n\n` +
            `⏳ Pesan resmi telah OTOMATIS DISIMPAN KE ANTREAN OUTBOX.\n` +
            `Sistem akan langsung mengirimkannya otomatis begitu gateway online kembali.\n\n` +
            `Anda juga dapat memantau antrean via tombol [WA Gateway] di pojok kanan atas.`
          );
        }
      } else {
        alert(
          `✅ STATUS VISA SELESAI!\n\n` +
          `Pengajuan atas nama "${item.namaPemohon}" telah diubah menjadi SELESAI.\n\n` +
          `⚠️ Catatan: Nomor WhatsApp pemohon belum tersedia, sehingga pesan WA tidak terkirim.`
        );
      }
    }
  };

  const openKirimModal = (item: Pengajuan) => {
    const stages = getCandidateStages(item);
    const existingResi = stages.noResi || '';
    const resiLower = existingResi.toLowerCase();

    if (
      resiLower.includes('soetta') ||
      resiLower.includes('soehatta') ||
      resiLower.includes('soekarno') ||
      resiLower.includes('bandara') ||
      resiLower.includes('flight') ||
      resiLower.includes('handover')
    ) {
      setKirimMetode('soetta');
      const flightMatch = existingResi.match(/(?:handover\s*soetta\s*t3\s*-\s*|flight\s*)([^(]+)/i);
      if (flightMatch && flightMatch[1]) {
        setSoettaFlight(flightMatch[1].trim());
      } else if (resiLower.includes('soehatta') || resiLower.includes('soetta')) {
        setSoettaFlight('Keberangkatan Soekarno-Hatta T3');
      } else {
        setSoettaFlight('ANA NH836');
      }

      // Inisialisasi Tanggal & Jam Temu Bandara
      let initDate = '';
      let initTime = '21:00';
      const timeMatch = existingResi.match(/\(([^)]+)\)/);
      const rawTimeText = timeMatch ? timeMatch[1].trim() : (resiLower.includes('soehatta') ? (stages.tglKirim || '') : '');

      const isoM = rawTimeText.match(/(\d{4})-(\d{2})-(\d{2})/);
      const dmyM = rawTimeText.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (isoM) {
        initDate = `${isoM[1]}-${isoM[2]}-${isoM[3]}`;
      } else if (dmyM) {
        initDate = `${dmyM[3]}-${dmyM[2].padStart(2, '0')}-${dmyM[1].padStart(2, '0')}`;
      } else if (stages.tglKirim && stages.tglKirim.includes('-')) {
        initDate = stages.tglKirim;
      } else {
        const now = new Date();
        initDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      }

      const tM = rawTimeText.match(/(\d{1,2}):(\d{2})/);
      if (tM) {
        initTime = `${tM[1].padStart(2, '0')}:${tM[2]}`;
      }

      setSoettaDate(initDate);
      setSoettaTime(initTime);
      const dateParts = initDate.split('-');
      const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : initDate;
      setSoettaTanggalJam(`${formattedDate}, ${initTime} WIB`);

      const gateMatch = existingResi.match(/\[([^\]]+)\]/);
      if (gateMatch && gateMatch[1]) {
        setSoettaTitikTemu(gateMatch[1].trim());
      } else {
        setSoettaTitikTemu('Terminal 3 Keberangkatan Internasional Gate 1');
      }
    } else if (resiLower.includes('kantor') || resiLower.includes('langsung') || resiLower.includes('diambil')) {
      setKirimMetode('kantor');
      const pengambilMatch = existingResi.match(/\(([^)]+)\)/);
      setKantorPengambil(pengambilMatch ? pengambilMatch[1].trim() : 'Pemohon Sendiri');
    } else {
      setKirimMetode('ekspedisi');
      const parts = existingResi.split('-');
      if (parts.length > 1) {
        setEkspedisiKurir(parts[0].trim() || 'JNE');
        setEkspedisiResi(parts.slice(1).join('-').trim());
      } else {
        setEkspedisiKurir('JNE');
        setEkspedisiResi(existingResi);
      }
    }

    if (!soettaTanggalJam) {
      setSoettaTanggalJam(`${getTodayFormatted()}, 21:00 WIB`);
    }

    setKirimKirimWA(Boolean(item.noTelp && item.noTelp.trim()));
    setKirimModalItem(item);
  };

  const handleSoettaDateChange = (newDate: string) => {
    setSoettaDate(newDate);
    if (newDate) {
      const parts = newDate.split('-');
      if (parts.length === 3) {
        const formatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
        setSoettaTanggalJam(`${formatted}, ${soettaTime || '21:00'} WIB`);
      }
    }
  };

  const handleSoettaTimeChange = (newTime: string) => {
    setSoettaTime(newTime);
    const dateToUse = soettaDate || new Date().toISOString().split('T')[0];
    const parts = dateToUse.split('-');
    const formatted = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateToUse;
    setSoettaTanggalJam(`${formatted}, ${newTime} WIB`);
  };

  const getKirimWAMessage = (item: Pengajuan) => {
    const today = getTodayFormatted();
    if (kirimMetode === 'soetta') {
      return (
        `*PEMBERITAHUAN SERAH TERIMA PASPOR DI BANDARA - MAPAHTRIP* ✈️🇯🇵\n\n` +
        `Halo Sdr/i *${item.namaPemohon}*,\n\n` +
        `Kabar gembira! Visa Jepang Anda telah selesai terbit. Paspor fisik Anda telah dijadwalkan untuk *SERAH TERIMA LANGSUNG DI BANDARA SOEKARNO-HATTA (TERMINAL 3)* sebelum jadwal keberangkatan Anda ke Jepang. 🌸🎌\n\n` +
        `📋 *Rincian Serah Terima Bandara:*\n` +
        `• No. Pengajuan: ${item.noPengajuan || '-'}\n` +
        `• Nama Pemohon: ${item.namaPemohon}\n` +
        `• No. Paspor: ${item.noPaspor}\n` +
        `• Program: ${item.program || 'Visa Jepang'}\n` +
        `• Penerbangan: *${soettaFlight.trim() || 'Penerbangan Internasional'}*\n` +
        (soettaTanggalJam.trim() ? `• Jadwal / Jam Temu: *${soettaTanggalJam.trim()}*\n` : '') +
        `• Titik Temu: *${soettaTitikTemu.trim() || 'Terminal 3 Keberangkatan Internasional Gate 1'}*\n\n` +
        `📍 Tim Handover MapahTrip akan berada di titik temu untuk menyerahkan langsung paspor dan visa Anda. Mohon pastikan nomor WhatsApp ini tetap aktif.\n\n` +
        `Semoga penerbangan dan perjalanan Anda ke Jepang menyenangkan, lancar, dan berkesan! 🇯🇵✨\n\n` +
        `Salam hangat,\n` +
        `*Tim Operasional MapahTrip*\n` +
        `Website: https://mapahtrip.id`
      );
    } else if (kirimMetode === 'ekspedisi') {
      return (
        `*PEMBERITAHUAN PENGIRIMAN PASPOR - MAPAHTRIP* 📦🚚\n\n` +
        `Halo Sdr/i *${item.namaPemohon}*,\n\n` +
        `Paspor dan berkas Visa Jepang Anda yang telah selesai kini telah resmi dikirimkan via ekspedisi. 🌸\n\n` +
        `📋 *Rincian Pengiriman:*\n` +
        `• No. Pengajuan: ${item.noPengajuan || '-'}\n` +
        `• Nama Pemohon: ${item.namaPemohon}\n` +
        `• No. Paspor: ${item.noPaspor}\n` +
        `• Kurir / Ekspedisi: *${ekspedisiKurir}*\n` +
        `• Nomor Resi: *${ekspedisiResi.trim() || 'Sedang diproses ekspedisi'}*\n` +
        `• Tanggal Kirim: ${today}\n\n` +
        `Silakan simpan nomor resi tersebut untuk melacak paket paspor Anda. Terima kasih atas kepercayaan Anda bersama MapahTrip! 🇯🇵✨\n\n` +
        `Salam hangat,\n` +
        `*Tim Operasional MapahTrip*`
      );
    } else {
      return (
        `*PEMBERITAHUAN PENGAMBILAN PASPOR - MAPAHTRIP* 🏢📋\n\n` +
        `Halo Sdr/i *${item.namaPemohon}*,\n\n` +
        `Paspor dan berkas Visa Jepang Anda yang telah selesai kini *SIAP DIAMBIL LANGSUNG* di Kantor Operasional MapahTrip. 🌸\n\n` +
        `📋 *Rincian Pengambilan:*\n` +
        `• No. Pengajuan: ${item.noPengajuan || '-'}\n` +
        `• Nama Pemohon: ${item.namaPemohon}\n` +
        `• No. Paspor: ${item.noPaspor}\n` +
        `• Pengambil: *${kantorPengambil.trim() || 'Pemohon Sendiri'}*\n` +
        `• Status: Siap Diambil di Kantor\n` +
        `• Jam Layanan: Jam Operasional Kantor MapahTrip (Senin - Sabtu)\n\n` +
        `Harap menunjukkan identitas diri saat pengambilan paspor fisik. Terima kasih atas kerja sama dan kepercayaan Anda! 🇯🇵✨\n\n` +
        `Salam hangat,\n` +
        `*Tim Operasional MapahTrip*`
      );
    }
  };

  const handleConfirmKirim = async () => {
    if (!kirimModalItem) return;
    const stages = getCandidateStages(kirimModalItem);

    if (!stages.isSelesai) {
      alert(
        `⚠️ TAHAPAN HARUS BERURUTAN!\n\n` +
        `Tahap 3 (Visa Terbit / Selesai) harus diselesaikan terlebih dahulu sebelum paspor dapat disimpan sebagai Kirim/Handover (Tahap 4).`
      );
      return;
    }

    setIsSavingKirim(true);

    const today = getTodayFormatted();
    const newStages = { ...(localStageOverrides[kirimModalItem.id] || {}) };
    let resiFinal = '';
    let targetTglKirim = stages.tglKirim || today;

    if (kirimMetode === 'soetta') {
      const flightText = soettaFlight.trim() || 'Flight Internasional';
      const timeText = soettaTanggalJam.trim() ? ` (${soettaTanggalJam.trim()})` : '';
      const gateText = soettaTitikTemu.trim() ? ` [${soettaTitikTemu.trim()}]` : '';
      resiFinal = `Handover Soetta T3 - ${flightText}${timeText}${gateText}`;
      if (soettaDate) {
        targetTglKirim = soettaDate;
      }
    } else if (kirimMetode === 'ekspedisi') {
      const kurir = ekspedisiKurir.trim() || 'Ekspedisi';
      const noResi = ekspedisiResi.trim() || 'Resi Menyusul';
      resiFinal = `${kurir} - ${noResi}`;
      targetTglKirim = today;
    } else {
      const pengambil = kantorPengambil.trim() || 'Pemohon Sendiri';
      resiFinal = `Diambil Langsung di Kantor (${pengambil})`;
      targetTglKirim = today;
    }

    newStages.tglKirim = targetTglKirim;
    newStages.noResi = resiFinal;
    const newStatus: StatusPengajuan = 'Selesai';
    newStages.status = newStatus;

    // 1. Simpan ke local state override instan
    setLocalStageOverrides((prev) => {
      const updated = {
        ...prev,
        [kirimModalItem.id]: {
          ...(prev[kirimModalItem.id] || {}),
          ...newStages,
        },
      };
      try {
        localStorage.setItem('mapahtrip_stage_overrides', JSON.stringify(updated));
      } catch { }
      return updated;
    });

    // 2. Beritahu App.tsx
    if (onUpdateStage) {
      onUpdateStage(kirimModalItem.id, {
        tglBerkasMasuk: newStages.tglSampai,
        tglApply: newStages.tglProses,
        tglSelesai: newStages.tglSelesai,
        tglKirim: targetTglKirim,
        noResi: resiFinal,
        status: newStatus,
      });
    }

    // 3. Simpan ke localStorage registrations
    try {
      const raw = localStorage.getItem('mapahtrip_local_registrations');
      if (raw) {
        const list: Pengajuan[] = JSON.parse(raw);
        const updatedList = list.map((p) =>
          p.id === kirimModalItem.id
            ? {
              ...p,
              tglBerkasMasuk: newStages.tglSampai !== undefined ? newStages.tglSampai : p.tglBerkasMasuk,
              tglApply: newStages.tglProses !== undefined ? newStages.tglProses : p.tglApply,
              tglSelesai: newStages.tglSelesai !== undefined ? newStages.tglSelesai : p.tglSelesai,
              tglKirim: targetTglKirim,
              noResi: resiFinal,
              status: newStatus,
            }
            : p
        );
        localStorage.setItem('mapahtrip_local_registrations', JSON.stringify(updatedList));
      }
    } catch { }

    // 4. Sinkronisasi ke Supabase Cloud
    try {
      const numId = Number(kirimModalItem.id);
      if (!isNaN(numId)) {
        const finalSampai = newStages.tglSampai !== undefined ? newStages.tglSampai : (stages.tglSampai || '');
        const finalProses = newStages.tglProses !== undefined ? newStages.tglProses : (stages.tglProses || '');
        const finalSelesai = newStages.tglSelesai !== undefined ? newStages.tglSelesai : (stages.tglSelesai || '');

        await supabase
          .from('pengajuan_visa')
          .update({
            tgl_sampai: finalSampai || null,
            tgl_proses: finalProses || null,
            tgl_selesai: finalSelesai || null,
            tgl_kirim: targetTglKirim,
            resi_pengiriman: resiFinal,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', numId);
      }
    } catch (e) {
      console.warn('Sync stage to Supabase failed:', e);
    }

    // 5. Kirim Notifikasi WhatsApp jika dicentang dan nomor WA ada
    if (kirimKirimWA && kirimModalItem.noTelp && kirimModalItem.noTelp.trim()) {
      const pesanWAKirim = getKirimWAMessage(kirimModalItem);
      kirimPesanWA(kirimModalItem.noTelp, pesanWAKirim)
        .then((res) => {
          console.log('[WA Gateway] Sukses kirim notifikasi kirim/handover ke:', kirimModalItem.noTelp, res);
        })
        .catch((err) => {
          console.warn('[WA Gateway] Gagal kirim notifikasi kirim/handover:', err);
        });
    }

    setIsSavingKirim(false);
    setKirimModalItem(null);
  };

  const handleEditStageDate = (
    item: Pengajuan,
    stage: 'sampai' | 'proses' | 'selesai' | 'kirim',
    currentDate: string
  ) => {
    const stageNames = {
      sampai: 'Sampai (Berkas Diterima)',
      proses: 'Proses (Diajukan ke Kedutaan/JVAC)',
      selesai: 'Selesai (Visa Terbit)',
      kirim: 'Kirim (Paspor Dikirim)',
    };
    const input = window.prompt(
      `Ubah tanggal tahap "${stageNames[stage]}" untuk ${item.namaPemohon} (Format: DD/MM/YYYY):`,
      currentDate || getTodayFormatted()
    );
    if (input === null) return;
    const cleanDate = input.trim();

    const keyMap = {
      sampai: 'tglSampai',
      proses: 'tglProses',
      selesai: 'tglSelesai',
      kirim: 'tglKirim',
    } as const;

    setLocalStageOverrides((prev) => {
      const updated = {
        ...prev,
        [item.id]: {
          ...(prev[item.id] || {}),
          [keyMap[stage]]: cleanDate,
        },
      };
      try {
        localStorage.setItem('mapahtrip_stage_overrides', JSON.stringify(updated));
      } catch { }
      return updated;
    });

    const dbKeyMap = {
      sampai: 'tgl_sampai',
      proses: 'tgl_proses',
      selesai: 'tgl_selesai',
      kirim: 'tgl_kirim',
    };
    const numId = Number(item.id);
    if (!isNaN(numId)) {
      supabase
        .from('pengajuan_visa')
        .update({ [dbKeyMap[stage]]: cleanDate || null })
        .eq('id', numId)
        .then();
    }
  };

  const handleTolakPengajuan = async (item: Pengajuan) => {
    const isCurrentlyDitolak = (localStageOverrides[item.id]?.status || item.status) === 'Ditolak';

    if (isCurrentlyDitolak) {
      const confirmPulihkan = window.confirm(
        `🔄 PULIHKAN PENGAJUAN:\n\nApakah Anda ingin membatalkan status Ditolak dan mengembalikan pengajuan atas nama "${item.namaPemohon}" ke status aktif?`
      );
      if (!confirmPulihkan) return;

      const newStages = { ...(localStageOverrides[item.id] || {}) };
      newStages.status = 'Menunggu Verifikasi';
      newStages.alasanPenolakan = '';

      setLocalStageOverrides((prev) => {
        const updated = {
          ...prev,
          [item.id]: {
            ...(prev[item.id] || {}),
            ...newStages,
          },
        };
        try {
          localStorage.setItem('mapahtrip_stage_overrides', JSON.stringify(updated));
        } catch { }
        return updated;
      });

      if (onUpdateStage) {
        onUpdateStage(item.id, {
          status: 'Menunggu Verifikasi',
          alasanPenolakan: '',
        });
      }

      const numId = Number(item.id);
      if (!isNaN(numId)) {
        await supabase
          .from('pengajuan_visa')
          .update({
            status: 'Menunggu Verifikasi',
            catatan: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', numId);
      }
      return;
    }

    const inputAlasan = window.prompt(
      `⚠️ PENOLAKAN PENGAJUAN VISA: "${item.namaPemohon}"\n\n` +
      `Pilih atau ketik alasan penolakan:\n` +
      `1 = Ditolak di Awal (Berkas tidak lengkap / Waktu mepet)\n` +
      `2 = Ditolak oleh Konsulat Jepang\n` +
      `3 = Ketik alasan khusus sendiri\n\n` +
      `Ketik angka 1, 2, atau langsung ketik alasan Anda di kotak ini:`,
      '1'
    );

    if (inputAlasan === null) return;

    let alasanFinal = 'Ditolak di Awal (Berkas tidak lengkap / Waktu mepet)';
    const trimmed = inputAlasan.trim();
    if (trimmed === '1') {
      alasanFinal = 'Ditolak di Awal (Berkas tidak lengkap / Waktu mepet)';
    } else if (trimmed === '2') {
      alasanFinal = 'Ditolak oleh Konsulat Jepang';
    } else if (trimmed === '3') {
      const customInput = window.prompt(
        `Ketik alasan penolakan khusus untuk "${item.namaPemohon}":`,
        'Customer membatalkan pengajuan'
      );
      if (customInput === null) return;
      alasanFinal = customInput.trim() || 'Dibatalkan oleh pemohon';
    } else if (trimmed.length > 0) {
      alasanFinal = trimmed;
    }

    const noWa = item.noTelp && item.noTelp.trim() ? item.noTelp.trim() : '';

    if (noWa) {
      const confirmKirim = window.confirm(
        `⚠️ KONFIRMASI PENOLAKAN & KIRIM WHATSAPP:\n\n` +
        `Anda akan menandai pengajuan visa ini sebagai DITOLAK:\n` +
        `  • Nama Pemohon : ${item.namaPemohon}\n` +
        `  • Alasan        : ${alasanFinal}\n` +
        `  • No. WhatsApp : ${noWa}\n\n` +
        `Pemberitahuan resmi penolakan beserta alasan akan OTOMATIS dikirimkan ke WhatsApp customer (${noWa}).\n\n` +
        `Apakah Anda yakin ingin melanjutkan dan mengirim notifikasi WhatsApp ke customer?`
      );
      if (!confirmKirim) return;
    }

    const newStages = { ...(localStageOverrides[item.id] || {}) };
    newStages.status = 'Ditolak';
    newStages.alasanPenolakan = alasanFinal;

    setLocalStageOverrides((prev) => {
      const updated = {
        ...prev,
        [item.id]: {
          ...(prev[item.id] || {}),
          ...newStages,
        },
      };
      try {
        localStorage.setItem('mapahtrip_stage_overrides', JSON.stringify(updated));
      } catch { }
      return updated;
    });

    if (onUpdateStage) {
      onUpdateStage(item.id, {
        status: 'Ditolak',
        alasanPenolakan: alasanFinal,
      });
    }

    const numId = Number(item.id);
    if (!isNaN(numId)) {
      await supabase
        .from('pengajuan_visa')
        .update({
          status: 'Ditolak',
          catatan: alasanFinal,
          updated_at: new Date().toISOString(),
        })
        .eq('id', numId);
    }

    // Otomatis Kirim WhatsApp ke Customer
    if (noWa) {
      const isDitolakKonsulat = alasanFinal.toLowerCase().includes('konsulat');
      const pesanWATolak =
        `*PEMBERITAHUAN STATUS PENGAJUAN VISA - MAPAHTRIP* 🇯🇵⚠️\n\n` +
        `Halo Sdr/i *${item.namaPemohon}*,\n\n` +
        `Melalui pesan ini, kami dari *MapahTrip* menginformasikan bahwa pengajuan Visa Jepang Anda saat ini *TIDAK DAPAT DIPROSES LEBIH LANJUT / DITOLAK*.\n\n` +
        `📋 *Rincian Pengajuan:*\n` +
        `• No. Pengajuan : ${item.noPengajuan || '-'}\n` +
        `• Nama Pemohon  : ${item.namaPemohon}\n` +
        `• No. Paspor    : ${item.noPaspor || '-'}\n` +
        `• Program       : ${item.program || 'Visa Jepang'}\n` +
        `• Status        : *DITOLAK* ❌\n` +
        `• Alasan/Catatan: *${alasanFinal}*\n\n` +
        (isDitolakKonsulat
          ? `📌 *Catatan Penting:*\nKeputusan persetujuan atau penolakan visa sepenuhnya merupakan hak prerogatif dan wewenang mutlak pihak Kedutaan Besar / Konsulat Jenderal Jepang. Paspor fisik asli Anda tetap aman dan akan segera kami kembalikan / kirimkan kembali kepada Anda.\n\n`
          : `📌 *Catatan Penting:*\nPengajuan berkas Anda belum dapat kami teruskan ke Kedutaan/JVAC dikarenakan dokumen belum memenuhi persyaratan resmi atau jadwal keberangkatan yang terlalu mepet dengan batas waktu pemrosesan kedutaan. Dokumen fisik asli Anda tetap aman bersama kami.\n\n`) +
        `Untuk informasi pengembalian dokumen atau konsultasi pengajuan ulang, silakan balas pesan WhatsApp ini atau hubungi tim layanan kami.\n\n` +
        `Terima kasih atas pengertian dan kerja sama Anda.\n\n` +
        `Salam hormat,\n` +
        `*Tim Operasional MapahTrip*\n` +
        `Website: https://mapahtrip.id`;

      kirimPesanWA(noWa, pesanWATolak)
        .then((res) => {
          console.log('[WA Gateway] Sukses kirim notifikasi penolakan ke:', noWa, res);
        })
        .catch((err) => {
          console.warn('[WA Gateway] Gagal kirim notifikasi penolakan:', err);
        });

      // Otomatis Kirim WhatsApp ke Mitra Affiliate jika pemohon ini menggunakan kode referral
      const cleanAffCode = (item.affiliateCode || '').trim().toUpperCase();
      if (cleanAffCode && cleanAffCode !== 'MAPAHTRIP') {
        findAffiliateByCode(cleanAffCode)
          .then((affiliate) => {
            if (affiliate && affiliate.noWa && affiliate.noWa.trim()) {
              const pesanWAAffiliateTolak =
`*PEMBERITAHUAN UPDATE STATUS PEMOHON BINAAN - MAPAHTRIP* 🇯🇵⚠️

Halo Kak *${affiliate.nama}*,

Melalui pesan ini, kami menginformasikan pembaruan status pemohon visa Jepang yang terdaftar menggunakan kode referral Anda (*${cleanAffCode}*):

📋 *Data Pemohon Binaan:*
• *ID Pengajuan:* *${item.noPengajuan || '-'}*
• *Nama Pemohon:* ${item.namaPemohon}
• *Program Visa:* ${item.program || 'Visa Jepang'}
• *Status:* *DITOLAK / TIDAK DAPAT DIPROSES* ❌
• *Alasan/Keterangan:* ${alasanFinal}

📌 *Catatan Transparansi:*
Dikarenakan permohonan visa pemohon yang bersangkutan tidak dapat dilanjutkan atau ditolak, maka komisi referral atas pengajuan ini belum dapat dicairkan.

Anda dapat memantau rekapan seluruh pemohon dan status referral Anda di Portal Affiliate:
🌐 https://mapahtrip.id

Terima kasih atas kerja sama dan pengertiannya. Tetap semangat merekomendasikan calon pemohon visa lainnya bersama MapahTrip! 🌸🤝

*Tim Kemitraan MapahTrip*`;

              kirimPesanWA(affiliate.noWa.trim(), pesanWAAffiliateTolak)
                .then((r) => {
                  console.log(`[WA Gateway] Sukses kirim notifikasi penolakan ke Mitra Affiliate ${affiliate.nama}:`, affiliate.noWa, r);
                })
                .catch((e) => {
                  console.warn(`[WA Gateway] Gagal kirim notifikasi penolakan ke Mitra Affiliate:`, e);
                });
            }
          })
          .catch((err) => {
            console.warn('Gagal mencari mitra affiliate saat tolak:', err);
          });
      }

      alert(
        `❌ STATUS PENGAJUAN DITOLAK!\n\n` +
        `Pengajuan atas nama "${item.namaPemohon}" telah ditandai DITOLAK.\n\n` +
        `Alasan: ${alasanFinal}\n\n` +
        `Notifikasi WhatsApp resmi telah OTOMATIS dikirimkan ke nomor customer (${noWa}).`
      );
    } else {
      alert(
        `❌ STATUS PENGAJUAN DITOLAK!\n\n` +
        `Pengajuan atas nama "${item.namaPemohon}" telah ditandai DITOLAK.\n\n` +
        `Alasan: ${alasanFinal}\n\n` +
        `⚠️ Catatan: Nomor WhatsApp customer belum tersedia, sehingga pesan WA tidak terkirim.`
      );
    }
  };

  const handleHapusPengajuan = (item: Pengajuan) => {
    const nama = item.namaPemohon || 'Pemohon';
    const no = item.noPengajuan ? ` (${item.noPengajuan})` : '';
    const konfirmasi = window.confirm(
      `🗑️ HAPUS / BATALKAN PENDAFTARAN:\n\n` +
      `Apakah Anda yakin ingin menghapus data pengajuan ${nama}${no}?\n\n` +
      `Gunakan opsi ini jika pemohon batal mendaftar atau tidak jadi melanjutkan berkas.\n` +
      `Data pengajuan dan seluruh antrean pesan WhatsApp terkait akan dihapus secara permanen.`
    );
    if (!konfirmasi) return;

    // Bersihkan seluruh pesan WhatsApp pending dari pemohon ini di antrean outbox (customer, staf, owner, mitra)
    removeApplicantFromWAOutbox({
      namaPemohon: item.namaPemohon,
      noPengajuan: item.noPengajuan,
      noTelp: item.noTelp,
    });

    // Hapus override stage lokal jika ada
    setLocalStageOverrides((prev) => {
      const updated = { ...prev };
      delete updated[item.id];
      try {
        localStorage.setItem('mapahtrip_stage_overrides', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (onDeletePengajuan) {
      onDeletePengajuan(item.id);
    }
  };

  // Daftar pemohon yang masuk ke wilayah konsulat yang dipilih / tugas staf
  const territoryList = useMemo(() => {
    return pengajuanList.filter((item) => {
      if (!isOwner && currentStaff) {
        return isApplicantAssignedToStaff(item, currentStaff);
      }
      const prog = (item.program || '').toLowerCase();
      const isWaiver = prog.includes('waiver') || prog.includes('e-visa') || prog.includes('evisa');
      if (selectedKonsjen === 'Tugas Staf' && currentStaff?.konsjenTugas) {
        if (isWaiver) return false;
        return isApplicantAssignedToStaff(item, currentStaff);
      }
      if (selectedKonsjen !== 'Semua') {
        return item.konsjen === selectedKonsjen;
      }
      return true;
    }).sort((a, b) => {
      const numA = parseInt(a.noPengajuan.replace(/[^0-9]/g, '') || a.id.replace(/[^0-9]/g, '') || '0', 10);
      const numB = parseInt(b.noPengajuan.replace(/[^0-9]/g, '') || b.id.replace(/[^0-9]/g, '') || '0', 10);
      return numB - numA;
    });
  }, [pengajuanList, selectedKonsjen, currentStaff, isOwner]);

  // Hitung jumlah riil pemohon di setiap tahapan pipeline operasional
  const stageCounts = useMemo(() => {
    let belumVerifikasi = 0;
    let baruSampai = 0;
    let sedangProses = 0;
    let visaTerbit = 0;
    let sudahKirim = 0;
    let ditolak = 0;
    let lunas = 0;
    let belumBayar = 0;

    territoryList.forEach((item) => {
      if (item.statusPembayaran === 'Menunggu Pembayaran') {
        belumBayar++;
      } else {
        lunas++;
      }

      const stages = getCandidateStages(item);
      if (stages.currentStatus === 'Ditolak') {
        ditolak++;
      } else if (stages.isKirim) {
        sudahKirim++;
      } else if (stages.isSelesai) {
        visaTerbit++;
      } else if (stages.isProses) {
        sedangProses++;
      } else if (stages.isSampai) {
        baruSampai++;
      } else {
        belumVerifikasi++;
      }
    });

    return {
      belumVerifikasi,
      baruSampai,
      sedangProses,
      visaTerbit,
      sudahKirim,
      ditolak,
      lunas,
      belumBayar,
      total: territoryList.length,
    };
  }, [territoryList, localStageOverrides]);

  // Laporkan jumlah berkas belum tertangani (aktif) ke sidebar utama
  useEffect(() => {
    if (onActiveCountChange) {
      const activeCount = stageCounts.belumVerifikasi + stageCounts.baruSampai + stageCounts.sedangProses;
      onActiveCountChange(activeCount);
    }
  }, [stageCounts.belumVerifikasi, stageCounts.baruSampai, stageCounts.sedangProses, onActiveCountChange]);

  const handleTogglePaymentStatus = async (item: Pengajuan) => {
    if (!isOwner) return;
    const current = item.statusPembayaran || 'Lunas';
    const nextStatus = current === 'Menunggu Pembayaran' ? 'Lunas' : 'Menunggu Pembayaran';

    let nominalFinal = item.dibayarPemohon || 0;
    if (nextStatus === 'Lunas') {
      const defaultNominal = nominalFinal > 0 ? String(nominalFinal) : '';
      const input = window.prompt(
        `✅ KONFIRMASI PEMBAYARAN LUNAS: ${item.namaPemohon}\n\n` +
        `Total Tagihan Resmi Terkirim: ${formatRupiah(nominalFinal)}\n\n` +
        `• Jika customer transfer PAS sesuai tagihan, cukup tekan [OK / Enter].\n` +
        `• Jika nominal yang diterima BERBEDA (misal ada potongan / biaya tambahan), silakan sesuaikan angkanya di bawah:`,
        defaultNominal
      );
      if (input === null) return; // Owner membatalkan
      const parsed = parseInt(input.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsed) && parsed > 0) {
        nominalFinal = parsed;
      }
    } else {
      const konfirm = window.confirm(
        `Ubah status pembayaran ${item.namaPemohon} menjadi "Menunggu Pembayaran"?`
      );
      if (!konfirm) return;
    }

    const refFee = item.referralFee || 0;
    const staffFee = item.staffFee || 0;
    const modalKeluar = item.nominalKeluar || 0;
    const newFeeBersih = Math.max(0, nominalFinal - modalKeluar - refFee - staffFee);

    try {
      await updatePengajuanPaymentInDB(item.id, {
        statusPembayaran: nextStatus,
        dibayarPemohon: nominalFinal,
        feeBersih: newFeeBersih,
      });
      const updated: Pengajuan = {
        ...item,
        statusPembayaran: nextStatus,
        dibayarPemohon: nominalFinal,
        feeBersih: newFeeBersih,
      };
      if (onUpdatePengajuan) {
        onUpdatePengajuan(updated);
      }
      if (nextStatus === 'Lunas') {
        kirimNotifikasiLunasKeStaff(updated).catch(() => {});
        kirimNotifikasiLunasKeCustomer(updated).catch(() => {});
      }
    } catch (err) {
      console.warn('Gagal update status pembayaran:', err);
      if (onUpdatePengajuan) {
        onUpdatePengajuan({ ...item, statusPembayaran: nextStatus, dibayarPemohon: nominalFinal, feeBersih: newFeeBersih });
      }
    }
  };

  const filteredData = useMemo(() => {
    return pengajuanList.filter((item) => {
      const candidateStages = getCandidateStages(item);

      // Filter Status Pembayaran
      if (selectedPaymentStatus === 'Lunas') {
        if (item.statusPembayaran === 'Menunggu Pembayaran') return false;
      } else if (selectedPaymentStatus === 'Menunggu Pembayaran') {
        if (item.statusPembayaran !== 'Menunggu Pembayaran') return false;
      }

      // Status / Tahapan Pengajuan Filter
      if (activeStatusTab !== 'Semua') {
        const stages = candidateStages;
        if (activeStatusTab === 'Belum Diverifikasi' || activeStatusTab === 'Menunggu Verifikasi') {
          if (stages.currentStatus === 'Ditolak' || stages.isSampai || stages.isProses || stages.isSelesai || stages.isKirim) {
            return false;
          }
        } else if (activeStatusTab === 'Baru Sampai' || activeStatusTab === 'Sampai') {
          // Baru tahap sampai: berkas fisik sudah sampai, belum diajukan ke JVAC/Proses
          if (!stages.isSampai || stages.isProses || stages.isSelesai || stages.isKirim || stages.currentStatus === 'Ditolak') {
            return false;
          }
        } else if (activeStatusTab === 'Sedang Diproses' || activeStatusTab === 'Proses') {
          // Tahap proses: sedang diproses di JVAC/Kedutaan, belum selesai
          if (!stages.isProses || stages.isSelesai || stages.isKirim || stages.currentStatus === 'Ditolak') {
            return false;
          }
        } else if (activeStatusTab === 'Selesai' || activeStatusTab === 'Visa Terbit') {
          // Tahap selesai: visa sudah terbit, belum dikirim
          if (!stages.isSelesai || stages.isKirim || stages.currentStatus === 'Ditolak') {
            return false;
          }
        } else if (activeStatusTab === 'Kirim' || activeStatusTab === 'Sudah Kirim') {
          // Tahap udah kirim: paspor sudah dikirim / diserahkan
          if (!stages.isKirim || stages.currentStatus === 'Ditolak') {
            return false;
          }
        } else if (activeStatusTab === 'Ditolak') {
          if (stages.currentStatus !== 'Ditolak') {
            return false;
          }
        }
      }

      // Filter kepemilikan berkas staf vs owner
      if (!isOwner && currentStaff) {
        if (!isApplicantAssignedToStaff(item, currentStaff)) return false;
      } else if (selectedKonsjen === 'Tugas Staf' && currentStaff?.konsjenTugas) {
        if (!isApplicantAssignedToStaff(item, currentStaff)) return false;
      } else if (selectedKonsjen !== 'Semua' && item.konsjen !== selectedKonsjen) {
        return false;
      }

      // Paket filter
      if (selectedPaket !== 'Semua' && item.paket !== selectedPaket) {
        return false;
      }

      // Search query
      if (searchFilter.trim() !== '') {
        const q = searchFilter.toLowerCase();
        const matchName = item.namaPemohon.toLowerCase().includes(q);
        const matchPaspor = item.noPaspor.toLowerCase().includes(q);
        const matchNoPengajuan = item.noPengajuan.toLowerCase().includes(q);
        const matchAffiliate = item.affiliateCode?.toLowerCase().includes(q);
        if (!matchName && !matchPaspor && !matchNoPengajuan && !matchAffiliate) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      // Data paling baru (nomor urut / ID terbesar) selalu di bagian atas
      const numA = parseInt(a.noPengajuan.replace(/[^0-9]/g, '') || a.id.replace(/[^0-9]/g, '') || '0', 10);
      const numB = parseInt(b.noPengajuan.replace(/[^0-9]/g, '') || b.id.replace(/[^0-9]/g, '') || '0', 10);
      return numB - numA;
    });
  }, [pengajuanList, selectedPaymentStatus, activeStatusTab, isOwner, currentStaff, selectedKonsjen, selectedPaket, searchFilter, localStageOverrides]);

  // Reset ke halaman 1 saat filter atau pencarian berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [activeStatusTab, selectedKonsjen, selectedPaket, searchFilter]);

  const totalItems = filteredData.length;
  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = pageSize === -1 ? 0 : (activePage - 1) * pageSize;
  const endIndex = pageSize === -1 ? totalItems : Math.min(startIndex + pageSize, totalItems);

  const paginatedData = useMemo(() => {
    if (pageSize === -1) return filteredData;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, pageSize, startIndex, endIndex]);

  const getPaketBadge = (paket: string, item?: Pengajuan) => {
    const isInteractive = Boolean(item);
    const cursor = isInteractive ? 'pointer' : 'default';
    const onClickHandler = isInteractive && item ? (e: React.MouseEvent) => handleOpenEditPaket(e, item) : undefined;
    const titleText = isInteractive ? `Klik untuk ubah paket layanan pemohon "${item?.namaPemohon}"` : undefined;

    switch (paket) {
      case 'Premium':
        return (
          <span
            onClick={onClickHandler}
            title={titleText}
            style={{
              padding: '2px 8px',
              borderRadius: '9999px',
              background: '#FEF3C7',
              color: '#92400E',
              border: '1px solid #FCD34D',
              fontSize: '0.7rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              cursor,
              userSelect: 'none',
              transition: 'all 0.15s ease',
            }}
          >
            ★ Premium
            {isInteractive && (
              <span className="material-symbols-outlined" style={{ fontSize: '11px', opacity: 0.7, marginLeft: '1px' }}>
                edit
              </span>
            )}
          </span>
        );
      case 'TAC':
        return (
          <span
            onClick={onClickHandler}
            title={titleText}
            style={{
              padding: '2px 8px',
              borderRadius: '9999px',
              background: '#EEF2FF',
              color: '#4338CA',
              border: '1px solid #C7D2FE',
              fontSize: '0.7rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              cursor,
              userSelect: 'none',
              transition: 'all 0.15s ease',
            }}
          >
            ⚡ TAC
            {isInteractive && (
              <span className="material-symbols-outlined" style={{ fontSize: '11px', opacity: 0.7, marginLeft: '1px' }}>
                edit
              </span>
            )}
          </span>
        );
      default:
        return (
          <span
            onClick={onClickHandler}
            title={titleText}
            style={{
              padding: '2px 8px',
              borderRadius: '9999px',
              background: '#F1F5F9',
              color: '#475569',
              border: '1px solid #CBD5E1',
              fontSize: '0.7rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              cursor,
              userSelect: 'none',
              transition: 'all 0.15s ease',
            }}
          >
            {paket || 'Reguler'}
            {isInteractive && (
              <span className="material-symbols-outlined" style={{ fontSize: '11px', opacity: 0.6, marginLeft: '1px' }}>
                edit
              </span>
            )}
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header & Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="font-serif" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--on-surface)' }}>
            Daftar Pengajuan Visa
          </h1>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9rem' }}>
            {!isOwner && currentStaff ? (
              <>Total <strong>{territoryList.length}</strong> pemohon yang ditugaskan kepada Anda ({currentStaff.nama}).</>
            ) : selectedKonsjen !== 'Semua' ? (
              <>Total <strong>{territoryList.length}</strong> pemohon di Konsulat {selectedKonsjen}.</>
            ) : (
              <>Total <strong>{pengajuanList.length}</strong> pemohon terdata dalam sistem MapahTrip.</>
            )}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowMaskedPaspor(!showMaskedPaspor)}
            style={{ padding: '7px 12px', fontSize: '0.78rem', borderRadius: '8px' }}
            title="Sembunyikan/Buka sensor nomor paspor"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              {showMaskedPaspor ? 'visibility' : 'visibility_off'}
            </span>
            <span>{showMaskedPaspor ? 'Buka Paspor' : 'Sensor'}</span>
          </button>

          {/* Tombol Ekspor Data ke Spreadsheet Excel (.xlsx) - Sesuai wilayah tugas staf */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              const territoryLabel = (!isOwner && currentStaff?.konsjenTugas && currentStaff.konsjenTugas.length > 0)
                ? currentStaff.konsjenTugas.join('_')
                : selectedKonsjen === 'Tugas Staf' && currentStaff?.konsjenTugas && currentStaff.konsjenTugas.length > 0
                  ? currentStaff.konsjenTugas.join('_')
                  : selectedKonsjen !== 'Semua'
                    ? selectedKonsjen
                    : 'Wilayah_Tugas';
              handleExportExcel(territoryList, territoryLabel);
            }}
            style={{
              padding: '7px 12px',
              fontSize: '0.78rem',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Unduh data pemohon sesuai wilayah tugas ke format Excel (.xlsx)"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              file_download
            </span>
            <span>Ekspor</span>
          </button>
        </div>
      </div>

      {/* Notifikasi Sukses Ekspor */}
      {exportNotice && (
        <div
          style={{
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: '10px',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            color: '#065F46',
            fontSize: '0.82rem',
            fontWeight: 600,
            boxShadow: '0 2px 6px rgba(16, 185, 129, 0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#059669' }}>
              check_circle
            </span>
            <span>{exportNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setExportNotice(null)}
            style={{ background: 'none', border: 'none', color: '#059669', cursor: 'pointer', padding: '2px' }}
            title="Tutup pesan"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
          </button>
        </div>
      )}

      {/* 6 Kartu Pipeline Operasional Interaktif Sebaris Rapi (Klik Kartu untuk Menyaring Tabel) */}
      <div className="staff-pipeline-grid">
        {/* Card 1: Total Pemohon */}
        <div
          className="staff-pipeline-card"
          onClick={() => setActiveStatusTab('Semua')}
          style={{
            backgroundColor: '#FFFFFF',
            padding: '12px 14px',
            borderRadius: '14px',
            border: activeStatusTab === 'Semua' ? '2px solid #2563EB' : '1px solid #E2E8F0',
            boxShadow: activeStatusTab === 'Semua' ? '0 4px 14px rgba(37, 99, 235, 0.12)' : '0 2px 8px rgba(0,0,0,0.02)',
            minWidth: 0,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            transform: activeStatusTab === 'Semua' ? 'translateY(-2px)' : 'none',
          }}
          title="Klik untuk menampilkan semua pemohon"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
            <span className="staff-pipeline-label" style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Total Pemohon
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#2563EB' }}>
                groups
              </span>
            </div>
          </div>
          <div className="staff-pipeline-val" style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0F172A', marginTop: '6px', lineHeight: 1.2 }}>
            {stageCounts.total}
          </div>
          <div className="staff-pipeline-sub" style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: '3px' }}>
            {selectedKonsjen === 'Semua' ? 'Semua wilayah' : `Konsulat ${selectedKonsjen}`}
          </div>
        </div>

        {/* Card 2: Belum Verifikasi */}
        <div
          className="staff-pipeline-card"
          onClick={() => setActiveStatusTab('Belum Diverifikasi')}
          style={{
            backgroundColor: '#FFFFFF',
            padding: '12px 14px',
            borderRadius: '14px',
            border: activeStatusTab === 'Belum Diverifikasi' || activeStatusTab === 'Menunggu Verifikasi' ? '2px solid #EA580C' : '1px solid #E2E8F0',
            boxShadow: activeStatusTab === 'Belum Diverifikasi' || activeStatusTab === 'Menunggu Verifikasi' ? '0 4px 14px rgba(234, 88, 12, 0.12)' : '0 2px 8px rgba(0,0,0,0.02)',
            minWidth: 0,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            transform: activeStatusTab === 'Belum Diverifikasi' || activeStatusTab === 'Menunggu Verifikasi' ? 'translateY(-2px)' : 'none',
          }}
          title="Klik untuk menyaring pemohon yang belum diverifikasi"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
            <span className="staff-pipeline-label" style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Belum Verif
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#EA580C' }}>
                hourglass_top
              </span>
            </div>
          </div>
          <div className="staff-pipeline-val" style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0F172A', marginTop: '6px', lineHeight: 1.2 }}>
            {stageCounts.belumVerifikasi}
          </div>
          <div className="staff-pipeline-sub" style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: '3px' }}>
            Pendaftaran baru
          </div>
        </div>

        {/* Card 3: Baru Tahap Sampai */}
        <div
          className="staff-pipeline-card"
          onClick={() => setActiveStatusTab('Baru Sampai')}
          style={{
            backgroundColor: '#FFFFFF',
            padding: '12px 14px',
            borderRadius: '14px',
            border: activeStatusTab === 'Baru Sampai' || activeStatusTab === 'Sampai' ? '2px solid #0284C7' : '1px solid #E2E8F0',
            boxShadow: activeStatusTab === 'Baru Sampai' || activeStatusTab === 'Sampai' ? '0 4px 14px rgba(2, 132, 199, 0.12)' : '0 2px 8px rgba(0,0,0,0.02)',
            minWidth: 0,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            transform: activeStatusTab === 'Baru Sampai' || activeStatusTab === 'Sampai' ? 'translateY(-2px)' : 'none',
          }}
          title="Klik untuk filter pemohon yang baru tahap sampai (berkas di kantor, belum diajukan)"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
            <span className="staff-pipeline-label" style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Berkas Tiba
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#0284C7' }}>
                inventory_2
              </span>
            </div>
          </div>
          <div className="staff-pipeline-val" style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0F172A', marginTop: '6px', lineHeight: 1.2 }}>
            {stageCounts.baruSampai}
          </div>
          <div className="staff-pipeline-sub" style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: '3px' }}>
            Berkas tiba di kantor
          </div>
        </div>

        {/* Card 4: Proses JVAC (Proses) */}
        <div
          className="staff-pipeline-card"
          onClick={() => setActiveStatusTab('Sedang Diproses')}
          style={{
            backgroundColor: '#FFFFFF',
            padding: '12px 14px',
            borderRadius: '14px',
            border: activeStatusTab === 'Sedang Diproses' || activeStatusTab === 'Proses' ? '2px solid #D97706' : '1px solid #E2E8F0',
            boxShadow: activeStatusTab === 'Sedang Diproses' || activeStatusTab === 'Proses' ? '0 4px 14px rgba(217, 119, 6, 0.12)' : '0 2px 8px rgba(0,0,0,0.02)',
            minWidth: 0,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            transform: activeStatusTab === 'Sedang Diproses' || activeStatusTab === 'Proses' ? 'translateY(-2px)' : 'none',
          }}
          title="Klik untuk filter pemohon yang sedang diproses di JVAC / Kedutaan"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
            <span className="staff-pipeline-label" style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Proses JVAC
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#D97706' }}>
                pending
              </span>
            </div>
          </div>
          <div className="staff-pipeline-val" style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0F172A', marginTop: '6px', lineHeight: 1.2 }}>
            {stageCounts.sedangProses}
          </div>
          <div className="staff-pipeline-sub" style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: '3px' }}>
            Verifikasi konsulat
          </div>
        </div>

        {/* Card 5: Visa Terbit (Selesai) */}
        <div
          className="staff-pipeline-card"
          onClick={() => setActiveStatusTab('Selesai')}
          style={{
            backgroundColor: '#FFFFFF',
            padding: '12px 14px',
            borderRadius: '14px',
            border: activeStatusTab === 'Selesai' || activeStatusTab === 'Visa Terbit' ? '2px solid #16A34A' : '1px solid #E2E8F0',
            boxShadow: activeStatusTab === 'Selesai' || activeStatusTab === 'Visa Terbit' ? '0 4px 14px rgba(22, 163, 74, 0.12)' : '0 2px 8px rgba(0,0,0,0.02)',
            minWidth: 0,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            transform: activeStatusTab === 'Selesai' || activeStatusTab === 'Visa Terbit' ? 'translateY(-2px)' : 'none',
          }}
          title="Klik untuk filter pemohon dengan visa yang sudah terbit (siap dikirim)"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
            <span className="staff-pipeline-label" style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Visa Terbit
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#16A34A' }}>
                task_alt
              </span>
            </div>
          </div>
          <div className="staff-pipeline-val" style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0F172A', marginTop: '6px', lineHeight: 1.2 }}>
            {stageCounts.visaTerbit}
          </div>
          <div className="staff-pipeline-sub" style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: '3px' }}>
            Stiker siap dikirim
          </div>
        </div>

        {/* Card 6: Sudah Kirim (Handover) */}
        <div
          className="staff-pipeline-card"
          onClick={() => setActiveStatusTab('Kirim')}
          style={{
            backgroundColor: '#FFFFFF',
            padding: '12px 14px',
            borderRadius: '14px',
            border: activeStatusTab === 'Kirim' || activeStatusTab === 'Sudah Kirim' ? '2px solid #7C3AED' : '1px solid #E2E8F0',
            boxShadow: activeStatusTab === 'Kirim' || activeStatusTab === 'Sudah Kirim' ? '0 4px 14px rgba(124, 58, 237, 0.12)' : '0 2px 8px rgba(0,0,0,0.02)',
            minWidth: 0,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            transform: activeStatusTab === 'Kirim' || activeStatusTab === 'Sudah Kirim' ? 'translateY(-2px)' : 'none',
          }}
          title="Klik untuk filter pemohon yang paspornya sudah dikirim / diserahkan"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
            <span className="staff-pipeline-label" style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Sudah Kirim
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#7C3AED' }}>
                flight_takeoff
              </span>
            </div>
          </div>
          <div className="staff-pipeline-val" style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0F172A', marginTop: '6px', lineHeight: 1.2 }}>
            {stageCounts.sudahKirim}
          </div>
          <div className="staff-pipeline-sub" style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: '3px' }}>
            Paspor terkirim / resi
          </div>
        </div>
      </div>

      {/* Banner Khusus saat Filter Tahapan Aktif */}
      {activeStatusTab !== 'Semua' && (() => {
        const getActiveStageTheme = () => {
          if (activeStatusTab === 'Belum Diverifikasi' || activeStatusTab === 'Menunggu Verifikasi') {
            return {
              name: 'Belum Diverifikasi',
              badge: 'Tahap 1',
              icon: 'hourglass_top',
              bg: '#FFF7ED',
              border: '#FFEDD5',
              color: '#EA580C',
              iconBg: '#FFEDD5',
            };
          }
          if (activeStatusTab === 'Baru Sampai' || activeStatusTab === 'Sampai') {
            return {
              name: 'Berkas Tiba di Kantor',
              badge: 'Tahap 2',
              icon: 'inventory_2',
              bg: '#F0F9FF',
              border: '#BAE6FD',
              color: '#0284C7',
              iconBg: '#E0F2FE',
            };
          }
          if (activeStatusTab === 'Sedang Diproses' || activeStatusTab === 'Proses') {
            return {
              name: 'Proses JVAC Konsulat',
              badge: 'Tahap 3',
              icon: 'pending',
              bg: '#FFFBEB',
              border: '#FDE68A',
              color: '#D97706',
              iconBg: '#FEF3C7',
            };
          }
          if (activeStatusTab === 'Selesai' || activeStatusTab === 'Visa Terbit') {
            return {
              name: 'Visa Terbit (Selesai)',
              badge: 'Tahap 4',
              icon: 'check_circle',
              bg: '#F0FDF4',
              border: '#BBF7D0',
              color: '#16A34A',
              iconBg: '#DCFCE7',
            };
          }
          if (activeStatusTab === 'Kirim' || activeStatusTab === 'Sudah Kirim') {
            return {
              name: 'Paspor Terkirim / Resi',
              badge: 'Tahap 5',
              icon: 'flight_takeoff',
              bg: '#FAF5FF',
              border: '#DDD6FE',
              color: '#7C3AED',
              iconBg: '#F3E8FF',
            };
          }
          return {
            name: activeStatusTab,
            badge: 'Filter',
            icon: 'filter_alt',
            bg: '#FEF2F2',
            border: '#FECACA',
            color: '#DC2626',
            iconBg: '#FEE2E2',
          };
        };

        const stageTheme = getActiveStageTheme();

        return (
          <div
            className="active-stage-banner"
            style={{
              backgroundColor: stageTheme.bg,
              borderColor: stageTheme.border,
            }}
          >
            <div className="active-stage-info-wrap">
              <div
                className="active-stage-icon-box"
                style={{ backgroundColor: stageTheme.iconBg, color: stageTheme.color }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  {stageTheme.icon}
                </span>
              </div>
              <div className="active-stage-text-group">
                <div className="active-stage-title-line">
                  <span
                    className="active-stage-badge"
                    style={{ backgroundColor: stageTheme.iconBg, color: stageTheme.color }}
                  >
                    {stageTheme.badge}
                  </span>
                  <span style={{ color: '#0F172A', fontWeight: 800 }}>
                    Filter: {stageTheme.name}
                  </span>
                </div>
                <div className="active-stage-subtext">
                  Menampilkan <strong>{filteredData.length} pemohon</strong> pada tahapan ini
                  {selectedKonsjen !== 'Semua' ? ` (${selectedKonsjen})` : ' (Semua Wilayah)'}.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveStatusTab('Semua')}
              className="active-stage-reset-btn"
              title="Tampilkan semua pemohon"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>close</span>
              <span>Tampilkan Semua ({stageCounts.total})</span>
            </button>
          </div>
        );
      })()}

      {/* Bar Kontrol Atas Tabel (Tampilkan Data, Filter Konsulat, Filter Paket, Pencarian) */}
      <div className="pengajuan-filter-bar">
        {/* Sisi Kiri / Atas: Input Pencarian */}
        <div className="pengajuan-search-wrapper">
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
            value={searchFilter}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Pencarian nama, no. paspor, resi..."
            className="pengajuan-search-input"
          />
          {searchFilter && (
            <button
              type="button"
              onClick={() => onSearchChange?.('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: '#E2E8F0',
                border: 'none',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#475569',
                cursor: 'pointer',
                padding: 0,
              }}
              title="Hapus pencarian"
              aria-label="Hapus teks pencarian"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>close</span>
            </button>
          )}
        </div>

        {/* Grup Filter (Wilayah, Paket, Tahapan, Page Size) */}
        <div className="pengajuan-filter-controls">
          {/* Tampilkan Data (Khusus Desktop) */}
          <div className="pengajuan-page-size-desktop">
            <span>Tampilkan</span>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="pengajuan-filter-select"
                style={{
                  padding: '6px 28px 6px 14px',
                  backgroundColor: '#F8FAFC',
                }}
                title="Pilih jumlah data yang ditampilkan"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={-1}>Semua</option>
              </select>
              <span
                className="material-symbols-outlined"
                style={{
                  position: 'absolute',
                  right: '8px',
                  fontSize: '16px',
                  color: '#64748B',
                  pointerEvents: 'none',
                }}
              >
                keyboard_arrow_down
              </span>
            </div>
            <span>Data</span>
          </div>

          <div className="pengajuan-filter-divider" />

          {/* Filter Wilayah Konsulat: Khusus Owner (Bisa switch kota/nasional). Staf terkunci pada wilayah tugasnya */}
          {isOwner ? (
            <div className="pengajuan-filter-item filter-item-wilayah">
              <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', fontSize: '15px', color: '#64748B', pointerEvents: 'none', zIndex: 1 }}>
                location_on
              </span>
              <select
                value={selectedKonsjen}
                onChange={(e) => setSelectedKonsjen(e.target.value)}
                className="pengajuan-filter-select"
                style={{
                  padding: '6px 26px 6px 28px',
                }}
                title="Pilih konsulat atau pantau seluruh Indonesia"
              >
                <option value="Semua">🌐 Semua Wilayah (Nasional)</option>
                <option value="Jakarta">Jakarta</option>
                <option value="Surabaya">Surabaya</option>
                <option value="Denpasar">Denpasar / Bali</option>
                <option value="Medan">Medan</option>
                <option value="Makassar">Makassar</option>
              </select>
              <span
                className="material-symbols-outlined"
                style={{
                  position: 'absolute',
                  right: '8px',
                  fontSize: '16px',
                  color: '#64748B',
                  pointerEvents: 'none',
                }}
              >
                keyboard_arrow_down
              </span>
            </div>
          ) : (
            <div
              className="pengajuan-filter-item filter-item-wilayah"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '10px',
                border: '1px solid #BFDBFE',
                backgroundColor: '#EFF6FF',
                color: '#1E40AF',
                fontSize: '0.80rem',
                fontWeight: 700,
                boxSizing: 'border-box',
              }}
              title="Wilayah tugas konsulat resmi akun Anda"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#2563EB', flexShrink: 0 }}>
                location_on
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Wilayah: {currentStaff?.konsjenTugas?.join(', ') || 'Jakarta'}
              </span>
            </div>
          )}

          {/* Dropdown Paket */}
          <div className="pengajuan-filter-item filter-item-paket">
            <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', fontSize: '15px', color: '#64748B', pointerEvents: 'none', zIndex: 1 }}>
              stars
            </span>
            <select
              value={selectedPaket}
              onChange={(e) => setSelectedPaket(e.target.value)}
              className="pengajuan-filter-select"
              style={{
                padding: '6px 26px 6px 28px',
              }}
              title="Filter jenis paket pengajuan"
            >
              <option value="Semua">Semua Paket</option>
              <option value="Reguler">Reguler</option>
              <option value="TAC">TAC (Tokutei)</option>
              <option value="Premium">Premium</option>
            </select>
            <span
              className="material-symbols-outlined"
              style={{
                position: 'absolute',
                right: '8px',
                fontSize: '16px',
                color: '#64748B',
                pointerEvents: 'none',
              }}
            >
              keyboard_arrow_down
            </span>
          </div>

          {/* Dropdown Status Pembayaran */}
          <div className="pengajuan-filter-item filter-item-bayar">
            <span
              className="material-symbols-outlined"
              style={{
                position: 'absolute',
                left: '10px',
                fontSize: '15px',
                color: selectedPaymentStatus !== 'Semua' ? '#16A34A' : '#64748B',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            >
              payments
            </span>
            <select
              value={selectedPaymentStatus}
              onChange={(e) => {
                setSelectedPaymentStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="pengajuan-filter-select"
              style={{
                padding: '6px 26px 6px 28px',
                border: selectedPaymentStatus !== 'Semua' ? '1.5px solid #16A34A' : '1px solid #E2E8F0',
                backgroundColor: selectedPaymentStatus !== 'Semua' ? '#F0FDF4' : '#FFFFFF',
                color: selectedPaymentStatus !== 'Semua' ? '#15803D' : '#0F172A',
                fontWeight: 700,
              }}
              title="Filter status pembayaran pemohon"
            >
              <option value="Semua">Status Bayar</option>
              <option value="Lunas">✓ Lunas ({stageCounts.lunas})</option>
              <option value="Menunggu Pembayaran">⏳ Belum ({stageCounts.belumBayar})</option>
            </select>
            <span
              className="material-symbols-outlined"
              style={{
                position: 'absolute',
                right: '8px',
                fontSize: '16px',
                color: selectedPaymentStatus !== 'Semua' ? '#16A34A' : '#64748B',
                pointerEvents: 'none',
              }}
            >
              keyboard_arrow_down
            </span>
          </div>

          {/* Dropdown Pilihan Tahapan Pengajuan */}
          <div className="pengajuan-filter-item filter-item-tahapan">
            <span
              className="material-symbols-outlined"
              style={{
                position: 'absolute',
                left: '10px',
                fontSize: '15px',
                color: activeStatusTab !== 'Semua' ? '#2563EB' : '#64748B',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            >
              tune
            </span>
            <select
              value={
                activeStatusTab === 'Menunggu Verifikasi' ? 'Belum Diverifikasi' :
                  activeStatusTab === 'Sampai' ? 'Baru Sampai' :
                    activeStatusTab === 'Proses' ? 'Sedang Diproses' :
                      activeStatusTab === 'Visa Terbit' ? 'Selesai' :
                        activeStatusTab === 'Sudah Kirim' ? 'Kirim' :
                          activeStatusTab
              }
              onChange={(e) => {
                setActiveStatusTab(e.target.value);
                setCurrentPage(1);
              }}
              className="pengajuan-filter-select"
              style={{
                padding: '6px 28px 6px 30px',
                border: activeStatusTab !== 'Semua' ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
                backgroundColor: activeStatusTab !== 'Semua' ? '#EFF6FF' : '#FFFFFF',
                color: activeStatusTab !== 'Semua' ? '#1E40AF' : '#0F172A',
                fontWeight: 700,
                boxShadow: activeStatusTab !== 'Semua' ? '0 1px 3px rgba(37, 99, 235, 0.15)' : '0 1px 2px rgba(0,0,0,0.02)',
              }}
              title="Pilih tahapan pengajuan yang ingin ditampilkan"
            >
              <option value="Semua">Semua Tahapan ({stageCounts.total})</option>
              <option value="Belum Diverifikasi">⏳ Belum Diverifikasi ({stageCounts.belumVerifikasi})</option>
              <option value="Baru Sampai">📥 Berkas Tiba & Lengkap ({stageCounts.baruSampai})</option>
              <option value="Sedang Diproses">⚙️ Tahap Proses JVAC ({stageCounts.sedangProses})</option>
              <option value="Selesai">✅ Tahap Selesai / Terbit ({stageCounts.visaTerbit})</option>
              <option value="Kirim">✈️ Kirim / Handover Paspor ({stageCounts.sudahKirim})</option>
              {stageCounts.ditolak > 0 && <option value="Ditolak">❌ Ditolak ({stageCounts.ditolak})</option>}
            </select>
            <span
              className="material-symbols-outlined"
              style={{
                position: 'absolute',
                right: '8px',
                fontSize: '16px',
                color: activeStatusTab !== 'Semua' ? '#2563EB' : '#64748B',
                pointerEvents: 'none',
              }}
            >
              keyboard_arrow_down
            </span>
          </div>

          {/* Tombol Reset Khusus Desktop */}
          {(activeStatusTab !== 'Semua' || selectedPaymentStatus !== 'Semua') && (
            <button
              type="button"
              onClick={() => {
                setActiveStatusTab('Semua');
                setSelectedPaymentStatus('Semua');
              }}
              className="pengajuan-desktop-reset-btn"
              style={{
                background: 'none',
                border: 'none',
                color: '#EF4444',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                padding: '4px 6px',
                borderRadius: '6px',
              }}
              title="Reset filter tahapan & pembayaran ke semua data"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>restart_alt</span>
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Baris Bawah Khusus Tampilan HP: Info/Reset & Page Size */}
        <div className="pengajuan-filter-bottom-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            {activeStatusTab !== 'Semua' || selectedKonsjen !== 'Semua' || selectedPaket !== 'Semua' || selectedPaymentStatus !== 'Semua' || Boolean(searchFilter && searchFilter.trim()) ? (
              <button
                type="button"
                onClick={() => {
                  setActiveStatusTab('Semua');
                  setSelectedKonsjen('Semua');
                  setSelectedPaket('Semua');
                  setSelectedPaymentStatus('Semua');
                  onSearchChange?.('');
                  setCurrentPage(1);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#DC2626',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                title="Reset semua filter ke awal"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>restart_alt</span>
                <span>Reset Filter</span>
              </button>
            ) : (
              <span style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 600 }}>
                Total <strong>{filteredData.length}</strong> Pemohon
              </span>
            )}
          </div>

          <div className="pengajuan-mobile-page-size">
            <span>Tampilkan:</span>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                title="Jumlah data per halaman"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={-1}>Semua</option>
              </select>
              <span
                className="material-symbols-outlined"
                style={{
                  position: 'absolute',
                  right: '4px',
                  fontSize: '14px',
                  color: '#64748B',
                  pointerEvents: 'none',
                }}
              >
                keyboard_arrow_down
              </span>
            </div>
            <span>data</span>
          </div>
        </div>
      </div>

      {/* Main Data Table (Desktop View) */}
      <div className="data-table-container pengajuan-table-container pengajuan-desktop-table" style={{ width: '100%', overflowX: 'auto', overflowY: 'visible', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 14px rgba(0,0,0,0.03)', background: '#ffffff' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left', fontSize: '0.78rem' }}>
          <thead>
            <tr style={{ color: '#64748B', fontWeight: 700 }}>
              <th style={{ width: '28px', minWidth: '24px', textAlign: 'center', padding: '8px 2px', backgroundColor: '#F8FAFC', borderBottom: '2px solid #CBD5E1', borderTopLeftRadius: '15px' }}>
                No.
              </th>
              <th style={{ minWidth: '140px', padding: '8px 6px', backgroundColor: '#F8FAFC', borderBottom: '2px solid #CBD5E1' }}>
                Pemohon &amp; Identitas
              </th>
              <th style={{ minWidth: '120px', padding: '8px 6px', backgroundColor: '#F8FAFC', borderBottom: '2px solid #CBD5E1' }}>
                Program &amp; Konsulat
              </th>
              <th style={{ width: '98px', minWidth: '95px', textAlign: 'center', padding: '8px 2px', backgroundColor: '#F8FAFC', borderBottom: '2px solid #CBD5E1' }}>
                Berkas
              </th>
              <th style={{ width: '230px', minWidth: '220px', textAlign: 'center', padding: '8px 2px', backgroundColor: '#F8FAFC', borderBottom: '2px solid #CBD5E1' }}>
                <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: '3px', fontSize: '0.72rem' }}>
                  Status Pengajuan
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '2px', fontSize: '0.64rem', color: '#475569', fontWeight: 700, width: '100%' }}>
                  <span style={{ backgroundColor: '#F1F5F9', padding: '2px 1px', borderRadius: '4px' }}>Sampai</span>
                  <span style={{ backgroundColor: '#F1F5F9', padding: '2px 1px', borderRadius: '4px' }}>Proses</span>
                  <span style={{ backgroundColor: '#F1F5F9', padding: '2px 1px', borderRadius: '4px' }}>Selesai</span>
                  <span style={{ backgroundColor: '#F1F5F9', padding: '2px 1px', borderRadius: '4px' }}>Kirim</span>
                </div>
              </th>
              {isOwner ? (
                <th
                  style={{
                    width: '112px',
                    minWidth: '106px',
                    textAlign: 'center',
                    padding: '8px 2px',
                    backgroundColor: '#F8FAFC',
                    borderBottom: '2px solid #CBD5E1',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Keuangan &amp; Bayar
                </th>
              ) : (
                <th
                  style={{
                    width: '112px',
                    minWidth: '106px',
                    textAlign: 'center',
                    padding: '8px 2px',
                    backgroundColor: '#F8FAFC',
                    borderBottom: '2px solid #CBD5E1',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Status Bayar
                </th>
              )}
              <th
                className="table-col-aksi"
                style={{
                  width: '72px',
                  minWidth: '68px',
                  textAlign: 'center',
                  padding: '8px 2px',
                  backgroundColor: '#F8FAFC',
                  borderBottom: '2px solid #CBD5E1',
                  borderTopRightRadius: '15px',
                  whiteSpace: 'nowrap',
                }}
              >
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--on-surface-variant)' }}>
                  Tidak ada pengajuan yang sesuai dengan kriteria filter saat ini.
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => {
                const st = getCandidateStages(row);
                const isBelumLunas = row.statusPembayaran === 'Menunggu Pembayaran';
                const isProsesLocked = (!isOwner && isBelumLunas && !st.isProses) || (!st.isSampai && !st.isProses);
                const isSelesaiLocked = (!isOwner && isBelumLunas && !st.isSelesai) || (!st.isProses && !st.isSelesai);
                const isKirimLocked = (!isOwner && isBelumLunas && !st.isKirim) || (!st.isSelesai && !st.isKirim);

                const stageItems = [
                  { key: 'sampai' as const, label: 'Sampai', ok: st.isSampai, date: st.tglSampai, color: '#0284C7', isLocked: false, lockTooltip: '' },
                  {
                    key: 'proses' as const,
                    label: 'Proses',
                    ok: st.isProses,
                    date: st.tglProses,
                    color: '#D97706',
                    isLocked: isProsesLocked,
                    lockTooltip: (!isOwner && isBelumLunas && !st.isProses)
                      ? '⚠️ Pembayaran Belum Lunas (Tahan Berkas: Staf dilarang proses berkas sebelum lunas)'
                      : (!st.isSampai ? '⚠️ Tahap 1 (Sampai) belum selesai (Wajib berurutan)' : '')
                  },
                  {
                    key: 'selesai' as const,
                    label: 'Selesai',
                    ok: st.isSelesai,
                    date: st.tglSelesai,
                    color: '#16A34A',
                    isLocked: isSelesaiLocked,
                    lockTooltip: (!isOwner && isBelumLunas && !st.isSelesai)
                      ? '⚠️ Pembayaran Belum Lunas (Berkas Ditahan)'
                      : (!st.isProses ? '⚠️ Tahap 2 (Proses) belum selesai (Wajib berurutan)' : '')
                  },
                  {
                    key: 'kirim' as const,
                    label: 'Kirim',
                    ok: st.isKirim,
                    date: st.tglKirim,
                    color: '#7C3AED',
                    isLocked: isKirimLocked,
                    lockTooltip: (!isOwner && isBelumLunas && !st.isKirim)
                      ? '⚠️ Pembayaran Belum Lunas (Paspor Ditahan: Dilarang kirim sebelum lunas)'
                      : (!st.isSelesai ? '⚠️ Tahap 3 (Selesai) belum selesai (Wajib berurutan)' : '')
                  },
                ];

                const officialMasterNo = Number((row.noPengajuan || '').replace(/[^0-9]/g, '')) || Number(row.id) || (startIndex + index + 1);
                const staffListNo = startIndex + index + 1;
                const displayRowNo = isOwner ? officialMasterNo : staffListNo;

                return (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                  >
                    {/* No. Urut (Owner: Nomor Resmi Master Spreadsheet | Staf: Nomor Urut Antrean Berkas Staf) */}
                    <td
                      style={{ padding: '6px 2px', textAlign: 'center', fontWeight: 800, color: '#64748B', fontSize: '0.76rem' }}
                      title={isOwner ? `Nomor Urut Resmi: No. ${officialMasterNo}` : `No. Antrean Tugas: #${staffListNo} (ID Master: ${row.noPengajuan})`}
                    >
                      {displayRowNo}
                    </td>

                    {/* 1. Pemohon & Identitas */}
                    <td style={{ padding: '6px 4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {row.fotoBase64 ? (
                          <img
                            src={row.fotoBase64}
                            alt={row.namaPemohon}
                            onClick={() => setSelectedPreviewImage({ url: row.fotoBase64!, title: `Pasfoto: ${row.namaPemohon}` })}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              objectFit: 'cover',
                              border: '1px solid #CBD5E1',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                              cursor: 'pointer',
                              flexShrink: 0,
                            }}
                            title="Klik untuk melihat pasfoto ukuran penuh"
                          />
                        ) : (
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              backgroundColor: '#EFF6FF',
                              border: '1px solid #DBEAFE',
                              color: '#1D4ED8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.80rem',
                              flexShrink: 0,
                              boxShadow: '0 1px 2px rgba(37, 99, 235, 0.06)',
                            }}
                          >
                            {row.namaPemohon
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')}
                          </div>
                        )}
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <div
                            style={{ fontWeight: 800, color: '#0F172A', cursor: 'pointer', fontSize: '0.84rem', transition: 'color 0.15s', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            onClick={() => onSelectPengajuan(row.id)}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#2563EB')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#0F172A')}
                            title={row.namaPemohon}
                          >
                            {row.namaPemohon}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B', display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                              {showMaskedPaspor ? row.maskedPaspor : row.noPaspor}
                            </span>
                            <span>•</span>
                            <span>{row.noPengajuan}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
                            {row.noTelp && (
                              <a
                                href={`https://wa.me/${row.noTelp.replace(/[^0-9]/g, '').replace(/^0/, '62')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  fontSize: '0.70rem',
                                  color: '#475569',
                                  fontWeight: 600,
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  cursor: 'pointer',
                                  transition: 'color 0.15s ease',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = '#15803D')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
                                title="Klik untuk langsung chat WhatsApp pemohon"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="#25D366" style={{ flexShrink: 0 }}>
                                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.54 1.769.782 2.791.782h.005c3.18 0 5.767-2.587 5.768-5.766.001-3.182-2.585-5.768-5.769-5.768zm3.376 8.163c-.141.396-.713.725-1.021.76-.299.034-.689.147-2.27-.478-1.579-.623-2.58-2.23-2.658-2.336-.079-.105-.639-.851-.639-1.624 0-.773.407-1.154.551-1.31.144-.156.315-.195.42-.195.105 0 .21.001.302.006.098.005.228-.037.356.271.132.316.452 1.104.492 1.185.04.081.066.176.013.281-.053.106-.079.172-.158.264-.079.092-.166.205-.237.276-.08.079-.163.165-.07.325.093.16.413.681.887 1.102.61.543 1.124.71 1.284.79.16.08.254.067.348-.04.094-.107.404-.47.512-.631.108-.161.216-.134.364-.08.148.054.938.442 1.099.522.16.08.267.12.306.186.039.066.039.382-.102.778z"/>
                                  <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.98-1.306A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.156c-1.636 0-3.155-.472-4.436-1.285l-.318-.202-2.955.775.789-2.88-.22-.35A8.109 8.109 0 013.844 12c0-4.497 3.659-8.156 8.156-8.156 4.497 0 8.156 3.659 8.156 8.156 0 4.497-3.659 8.156-8.156 8.156z"/>
                                </svg>
                                <span>{row.noTelp}</span>
                              </a>
                            )}
                            {row.fotoBase64 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPreviewImage({ url: row.fotoBase64!, title: `Pasfoto: ${row.namaPemohon}` });
                                }}
                                style={{
                                  background: '#F1F5F9',
                                  color: '#334155',
                                  border: '1px solid #CBD5E1',
                                  borderRadius: '4px',
                                  padding: '1px 4px',
                                  fontSize: '0.66rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                }}
                                title="Lihat Foto Penuh"
                              >
                                <span>📷 Foto</span>
                              </button>
                            )}
                            {row.uploadedDocs && Object.keys(row.uploadedDocs).length > 0 && (
                              <span
                                style={{
                                  background: '#F8FAFC',
                                  color: '#334155',
                                  border: '1px solid #E2E8F0',
                                  borderRadius: '4px',
                                  padding: '1px 4px',
                                  fontSize: '0.66rem',
                                  fontWeight: 700,
                                }}
                              >
                                📁 {Object.keys(row.uploadedDocs).length}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Program, Paket & Konsulat (Digabung Rapi & Hemat Ruang) */}
                    <td style={{ padding: '6px 4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#0F172A' }}>{row.program}</span>
                        {getPaketBadge(row.paket, row)}
                      </div>
                      <div style={{ fontSize: '0.70rem', color: '#64748B', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        {(row.program || '').toLowerCase().includes('waiver') ? (
                          <span style={{ color: '#059669', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>cloud_done</span>
                            100% Online • Ditangani Owner
                          </span>
                        ) : (
                          <>
                            <span style={{ color: '#0F172A', fontWeight: 700 }}>{row.konsjen}</span>
                            <span>•</span>
                            <span>PIC: {row.staffPic ? row.staffPic.split(' ')[0] : 'Tim Pusat'}</span>
                          </>
                        )}
                      </div>
                      {row.catatan && (
                        <div
                          style={{
                            fontSize: '0.67rem',
                            color: '#475569',
                            marginTop: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                          title={`Catatan: ${row.catatan}`}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '12px', color: '#005BB5' }}>sticky_note_2</span>
                          <span style={{ maxWidth: '115px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {row.catatan}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* 3. Berkas Fisik (Checklist Dots Ringkas) */}
                    <td style={{ padding: '6px 2px', textAlign: 'center', width: '98px' }}>
                      {(() => {
                        const berkasList = [
                          { label: 'Form', ok: Boolean(row.berkas?.formVisa || row.uploadedDocs?.formVisa) },
                          { label: 'Paspor', ok: Boolean(row.berkas?.pasporFisik || row.uploadedDocs?.pasporFisik) },
                          { label: 'Foto', ok: Boolean(row.berkas?.foto || row.fotoBase64 || row.uploadedDocs?.foto) },
                          { label: 'KTP', ok: Boolean(row.berkas?.ktp || row.uploadedDocs?.ktp) },
                          { label: 'COE', ok: Boolean(row.berkas?.coe || row.uploadedDocs?.coe) },
                          { label: 'E-KTLN', ok: Boolean(row.berkas?.ektln || row.uploadedDocs?.ektln) },
                          { label: 'Tugas', ok: Boolean(row.berkas?.suratTugas || row.uploadedDocs?.suratTugas) },
                        ];
                        const completeCount = berkasList.filter((b) => b.ok).length;
                        const isAllComplete = completeCount === berkasList.length;
                        const missingCount = berkasList.length - completeCount;

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                            {/* 6 Dots Bulat */}
                            <div style={{ display: 'flex', gap: '2px', justifyContent: 'center' }}>
                              {berkasList.map((b, bIdx) => (
                                <span
                                  key={bIdx}
                                  title={`${b.label}: ${b.ok ? 'Lengkap' : 'Kurang'}`}
                                  style={{
                                    width: '13px',
                                    height: '13px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '8px',
                                    fontWeight: 800,
                                    background: '#F8FAFC',
                                    color: b.ok ? '#16A34A' : '#DC2626',
                                    border: '1px solid #E2E8F0',
                                  }}
                                >
                                  {b.ok ? '✓' : '✕'}
                                </span>
                              ))}
                            </div>

                            {/* Status Kelengkapan & Tombol Aksi */}
                            {isAllComplete ? (
                              <span
                                style={{
                                  fontSize: '0.62rem',
                                  fontWeight: 700,
                                  color: '#059669',
                                  backgroundColor: '#ECFDF5',
                                  border: '1px solid #A7F3D0',
                                  borderRadius: '6px',
                                  padding: '1px 5px',
                                  whiteSpace: 'nowrap',
                                  marginTop: '1px',
                                }}
                              >
                                ✓ Lengkap (6/6)
                              </span>
                            ) : (
                              <>
                                {/* Badge Kurang X Berkas */}
                                <span
                                  style={{
                                    fontSize: '0.60rem',
                                    fontWeight: 700,
                                    color: '#E11D48',
                                    backgroundColor: '#FFF1F2',
                                    border: '1px solid #FFE4E6',
                                    borderRadius: '5px',
                                    padding: '1px 5px',
                                    whiteSpace: 'nowrap',
                                    marginTop: '1px',
                                  }}
                                >
                                  Kurang {missingCount} Berkas
                                </span>

                                {/* Tombol Aksi Cepat: Seragam, Netral & Rapi */}
                                {row.noTelp && (
                                  <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', marginTop: '2px', flexWrap: 'wrap' }}>
                                    <button
                                      type="button"
                                      onClick={(e) => handleSendCustomerWALink(e, row)}
                                      style={{
                                        padding: '1px 6px',
                                        fontSize: '0.60rem',
                                        fontWeight: 700,
                                        borderRadius: '4px',
                                        backgroundColor: '#F8FAFC',
                                        border: '1px solid #CBD5E1',
                                        color: '#334155',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '2px',
                                        whiteSpace: 'nowrap',
                                        transition: 'all 0.15s ease',
                                      }}
                                      title="Kirim pesan WhatsApp pengingat berkas yang kurang ke customer"
                                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                                    >
                                      <span>📲</span>
                                      <span>Minta via WA</span>
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </td>

                    {/* 4. Status Pengajuan 4 Tahapan Ceklis: Sampai | Proses | Selesai | Kirim */}
                    <td style={{ padding: '6px 2px', textAlign: 'center', width: '230px', minWidth: '220px' }}>
                      {st.currentStatus === 'Ditolak' ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            backgroundColor: 'rgba(239, 68, 68, 0.04)',
                            border: '1px solid rgba(239, 68, 68, 0.22)',
                            borderRadius: '8px',
                            padding: '4px 6px',
                            maxWidth: '220px',
                            margin: '0 auto',
                            lineHeight: 1.3,
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              color: '#DC2626',
                              fontWeight: 800,
                              fontSize: '0.66rem',
                              flexShrink: 0,
                              backgroundColor: 'rgba(239, 68, 68, 0.12)',
                              padding: '2px 5px',
                              borderRadius: '4px',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '12px', color: '#DC2626' }}>
                              cancel
                            </span>
                            DITOLAK
                          </span>
                          <span style={{ color: '#334155', fontWeight: 600, fontSize: '0.70rem', textAlign: 'left', wordBreak: 'break-word' }}>
                            {st.alasanPenolakan || 'Berkas Tidak Lengkap / Waktu Mepet'}
                          </span>
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '2px', width: '100%' }}>
                          {stageItems.map((s) => (
                            <div
                              key={s.key}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                backgroundColor: s.ok ? '#FFFFFF' : '#F8FAFC',
                                border: s.ok ? `1.5px solid ${s.color}75` : '1px solid #E2E8F0',
                                borderRadius: '5px',
                                padding: '2px 1px',
                                transition: 'all 0.15s ease',
                                boxSizing: 'border-box',
                                boxShadow: s.ok ? '0 1px 2px rgba(0,0,0,0.03)' : 'none',
                                opacity: s.isLocked ? 0.6 : 1,
                              }}
                            >
                              <button
                                type="button"
                                disabled={s.isLocked}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!s.isLocked) {
                                    handleToggleStage(row, s.key);
                                  }
                                }}
                                title={
                                  s.isLocked
                                    ? (s.lockTooltip || `⚠️ Tahap sebelumnya belum selesai (Wajib berurutan)`)
                                    : `Klik untuk ${s.ok ? 'membatalkan' : 'menceklis'} tahap ${s.label}`
                                }
                                style={{
                                  width: '100%',
                                  border: 'none',
                                  background: 'transparent',
                                  cursor: s.isLocked ? 'not-allowed' : 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '2px',
                                  fontSize: '0.66rem',
                                  fontWeight: 700,
                                  letterSpacing: '-0.2px',
                                  color: s.ok ? '#0F172A' : (s.isLocked ? '#CBD5E1' : '#94A3B8'),
                                  padding: '1px 0',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <span style={{ color: s.ok ? s.color : (s.isLocked ? '#CBD5E1' : '#CBD5E1'), fontSize: '0.65rem', fontWeight: 900 }}>{s.ok ? '✓' : '○'}</span>
                                <span style={{ color: s.ok ? '#0F172A' : (s.isLocked ? '#94A3B8' : '#64748B'), whiteSpace: 'nowrap' }}>{s.label}</span>
                              </button>
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (s.ok) handleEditStageDate(row, s.key, s.date || '');
                                }}
                                title={s.ok ? 'Klik untuk ubah tanggal' : ''}
                                style={{
                                  fontSize: '0.58rem',
                                  fontFamily: 'monospace',
                                  color: s.ok ? '#475569' : '#CBD5E1',
                                  fontWeight: s.ok ? 700 : 500,
                                  cursor: s.ok ? 'pointer' : 'default',
                                  textDecoration: s.ok ? 'underline dotted' : 'none',
                                  lineHeight: 1.1,
                                  marginTop: '1px',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {s.ok ? (s.date || getTodayFormatted()) : '-'}
                              </span>
                              {/* Jika tahap Kirim aktif, tampilkan nomor resi / status pengiriman di dalam kotak */}
                              {s.key === 'kirim' && st.noResi && (() => {
                                const rLower = st.noResi.toLowerCase();
                                const isAirport = rLower.includes('soehatta') || rLower.includes('soetta') || rLower.includes('soekarno') || rLower.includes('bandara') || rLower.includes('flight') || rLower.includes('airport');
                                const isOffice = rLower.includes('diambil') || rLower.includes('kantor') || rLower.includes('langsung');
                                const isSent = rLower.includes('terkirim');

                                const icon = isAirport ? '✈️' : isOffice ? '🏢' : isSent ? '✓' : '📦';
                                const badgeText = isAirport ? 'Soetta' : isOffice ? 'Diambil' : isSent ? 'Terkirim' : (st.noResi.length > 8 ? st.noResi.slice(0, 7) + '..' : st.noResi);
                                const badgeBg = isAirport ? '#EFF6FF' : isOffice ? '#ECFDF5' : isSent ? '#F0FDF4' : '#F8FAFC';
                                const badgeBorder = isAirport ? '#BFDBFE' : isOffice ? '#A7F3D0' : isSent ? '#BBF7D0' : '#E2E8F0';
                                const badgeColor = isAirport ? '#1D4ED8' : isOffice ? '#065F46' : isSent ? '#15803D' : '#0F172A';

                                return (
                                  <span
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openKirimModal(row);
                                    }}
                                    style={{
                                      fontSize: '0.58rem',
                                      fontWeight: 700,
                                      color: badgeColor,
                                      backgroundColor: badgeBg,
                                      border: `1px solid ${badgeBorder}`,
                                      padding: '0 2px',
                                      borderRadius: '3px',
                                      marginTop: '1px',
                                      whiteSpace: 'nowrap',
                                      maxWidth: '100%',
                                      boxSizing: 'border-box',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      display: 'inline-block',
                                      cursor: 'pointer',
                                    }}
                                    title={`Status Pengiriman: ${st.noResi} (Klik untuk ubah / lihat rincian)`}
                                  >
                                    {icon} {badgeText}
                                  </span>
                                );
                              })()}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* 5. Kolom Finansial & Status Bayar: Mode Owner (Finansial & Margin) vs Mode Staf (Indikator Kesiapan Kerja) */}
                    {isOwner ? (
                      <td style={{ width: '120px', minWidth: '110px', padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        {(() => {
                          const isWaitingWithStruk = row.statusPembayaran === 'Menunggu Pembayaran' && Boolean(row.buktiBayarPemohon);
                          const isLunas = row.statusPembayaran === 'Lunas';
                          const isFinanceReady = isRowFinanceInputted(row);
                          const effectiveFee = isFinanceReady ? getRowEffectiveFee(row) : 0;
                          const hasMitra = Boolean(row.affiliateCode && row.affiliateCode.trim() !== '' && row.affiliateCode.toUpperCase() !== 'MAPAHTRIP');
                          const hasModal = Boolean(row.nominalKeluar && row.nominalKeluar > 0);
                          const hasStaffFee = Boolean(row.staffFee && row.staffFee > 0);
                          const hasRefFee = hasMitra && Boolean(row.referralFee && row.referralFee > 0);
                          const refFee = hasMitra ? (row.referralFee || 100000) : 0;
                          const isWaiver = (row.program || '').toLowerCase().includes('waiver');
                          const staffFee = isWaiver ? 0 : (row.staffFee !== undefined && row.staffFee !== null ? row.staffFee : (row.cashback !== undefined && row.cashback !== null ? row.cashback : 0));

                          const tooltipLines = [
                            `Pemasukan (Tagihan): ${formatRupiah(row.dibayarPemohon || 0)}`,
                            `Modal Konsulat: ${isWaiver ? '-Rp 0 (Waiver)' : (hasModal ? '-' + formatRupiah(row.nominalKeluar || 0) : (isFinanceReady ? '-Rp 0' : 'Belum diinput Owner'))}`,
                            `Fee Staf PIC (${row.staffPic || 'PIC'}): ${isWaiver ? '-Rp 0 (Owner Langsung)' : (hasStaffFee ? '-' + formatRupiah(staffFee) : (isFinanceReady ? '-' + formatRupiah(staffFee) : 'Belum ditentukan Owner'))}`,
                          ];
                          if (hasMitra) {
                            tooltipLines.push(`Komisi Mitra (${row.affiliateCode}): ${hasRefFee ? '-' + formatRupiah(refFee) : (isFinanceReady ? '-' + formatRupiah(refFee) : 'Belum ditentukan Owner')}`);
                          }
                          if (isFinanceReady) {
                            tooltipLines.push(`Fee Bersih MapahTrip: ${formatRupiah(effectiveFee)}`);
                          } else {
                            tooltipLines.push(`Fee Bersih MapahTrip: Belum Ada (Menunggu input pengeluaran & fee oleh Owner)`);
                          }
                          tooltipLines.push(`(Klik status untuk ubah, klik ✏️ untuk edit/input pengeluaran & fee)`);

                          return (
                            <div
                              style={{
                                backgroundColor: isWaitingWithStruk ? '#FFFBEB' : (isLunas ? '#F0FDF4' : '#F8FAFC'),
                                border: isWaitingWithStruk ? '1.5px solid #F59E0B' : (isLunas ? '1px solid #BBF7D0' : '1px solid #E2E8F0'),
                                borderRadius: '10px',
                                padding: '6px 6px',
                                display: 'inline-flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '4px',
                                width: '100%',
                                maxWidth: '116px',
                                boxSizing: 'border-box',
                                transition: 'all 0.15s ease',
                                boxShadow: isWaitingWithStruk ? '0 0 10px rgba(245, 158, 11, 0.25)' : '0 1px 3px rgba(0,0,0,0.03)',
                              }}
                              title={tooltipLines.join('\n')}
                            >
                              {/* 1. Baris Status Pembayaran */}
                              <button
                                type="button"
                                onClick={() => isOwner && handleTogglePaymentStatus(row)}
                                disabled={!isOwner}
                                style={{
                                  border: 'none',
                                  background: 'none',
                                  padding: 0,
                                  cursor: isOwner ? 'pointer' : 'default',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                                title={isOwner ? "Klik untuk mengubah status pembayaran" : undefined}
                              >
                                {isWaitingWithStruk ? (
                                  <span style={{ backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D', padding: '1px 6px', borderRadius: '5px', fontSize: '0.62rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#EA580C' }} />
                                    <span>⚡ Verif Struk</span>
                                  </span>
                                ) : isLunas ? (
                                  <span style={{ backgroundColor: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', padding: '1px 6px', borderRadius: '5px', fontSize: '0.62rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#16A34A' }} />
                                    <span>✓ Lunas</span>
                                  </span>
                                ) : (
                                  <span style={{ backgroundColor: '#F1F5F9', color: '#64748B', border: '1px solid #CBD5E1', padding: '1px 6px', borderRadius: '5px', fontSize: '0.62rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#D97706' }} />
                                    <span>⏳ Belum Lunas</span>
                                  </span>
                                )}
                              </button>

                              {/* 2. Baris Nominal Masuk + Tombol Edit Pensil */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.78rem', color: '#0F172A', lineHeight: 1 }}>
                                  {formatRupiah(row.dibayarPemohon || 0)}
                                </span>
                                {isOwner && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenEditPaket(e, row)}
                                    style={{
                                      border: 'none',
                                      background: '#EFF6FF',
                                      color: '#0284C7',
                                      borderRadius: '4px',
                                      padding: '1px 4px',
                                      fontSize: '0.60rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      lineHeight: 1,
                                    }}
                                    title="Edit rincian modal & fee pemohon ini"
                                  >
                                    ✏️
                                  </button>
                                )}
                              </div>

                              {/* 3. Baris Badge Laba Bersih (+ Struk button jika ada) */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'center' }}>
                                {isFinanceReady ? (
                                  <span
                                    style={{
                                      backgroundColor: '#ECFDF5',
                                      color: '#047857',
                                      border: '1px solid #A7F3D0',
                                      borderRadius: '5px',
                                      padding: '1px 5px',
                                      fontSize: '0.62rem',
                                      fontWeight: 700,
                                      fontFamily: 'monospace',
                                      whiteSpace: 'nowrap',
                                    }}
                                    title={`Fee Bersih MapahTrip: ${formatRupiah(effectiveFee)}`}
                                  >
                                    Laba: {formatRupiah(effectiveFee)}
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenEditPaket(e, row)}
                                    style={{
                                      backgroundColor: '#F8FAFC',
                                      color: '#64748B',
                                      border: '1px dashed #CBD5E1',
                                      borderRadius: '5px',
                                      padding: '1px 5px',
                                      fontSize: '0.60rem',
                                      fontWeight: 700,
                                      whiteSpace: 'nowrap',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '2px',
                                    }}
                                    title="Fee bersih belum dihitung karena Owner belum menginput pengeluaran & fee. Klik untuk menginput."
                                  >
                                    Laba: Belum Ada
                                  </button>
                                )}

                                {row.buktiBayarPemohon && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedPreviewImage({ url: row.buktiBayarPemohon!, title: `Bukti Struk Transfer: ${row.namaPemohon}` });
                                    }}
                                    style={{
                                      background: '#EFF6FF',
                                      color: '#1D4ED8',
                                      border: '1px solid #BFDBFE',
                                      borderRadius: '4px',
                                      padding: '1px 3px',
                                      fontSize: '0.58rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      lineHeight: 1,
                                    }}
                                    title="Lihat struk transfer"
                                  >
                                    📄
                                  </button>
                                )}
                              </div>

                              {/* 4. Tombol Khusus Owner: Kirim Tagihan Resmi via WA */}
                              {isOwner && !isLunas && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleKirimTagihanWA(row);
                                  }}
                                  style={{
                                    marginTop: '2px',
                                    backgroundColor: '#EFF6FF',
                                    color: '#1D4ED8',
                                    border: '1px solid #BFDBFE',
                                    borderRadius: '5px',
                                    padding: '2px 5px',
                                    fontSize: '0.62rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '3px',
                                    width: '100%',
                                    transition: 'all 0.15s ease',
                                  }}
                                  title="Kirim rincian tagihan resmi & no rekening BTN ke WhatsApp customer (bisa edit nominal)"
                                >
                                  <span>💳 Kirim Tagihan</span>
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                    ) : (
                      <td style={{ width: '112px', minWidth: '106px', padding: '6px 2px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        {(() => {
                          const isLunas = row.statusPembayaran === 'Lunas';
                          const hasStruk = Boolean(row.buktiBayarPemohon);

                          if (isLunas) {
                            return (
                              <div
                                style={{
                                  backgroundColor: '#ECFDF5',
                                  border: '1.5px solid #A7F3D0',
                                  borderRadius: '8px',
                                  padding: '3px 4px',
                                  display: 'inline-flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '2px',
                                  width: '100%',
                                  maxWidth: '108px',
                                  boxSizing: 'border-box',
                                }}
                                title="Pembayaran telah lunas & terverifikasi. Berkas aman diajukan ke JVAC."
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#059669', display: 'inline-block' }} />
                                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#065F46' }}>
                                    LUNAS
                                  </span>
                                </div>
                                <span style={{ fontSize: '0.60rem', color: '#059669', fontWeight: 700 }}>
                                  ✓ Siap JVAC
                                </span>
                              </div>
                            );
                          }

                          return (
                            <div
                              style={{
                                backgroundColor: '#FFFBEB',
                                border: '1.5px solid #FCD34D',
                                borderRadius: '8px',
                                padding: '3px 4px',
                                display: 'inline-flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '2px',
                                width: '100%',
                                maxWidth: '108px',
                                boxSizing: 'border-box',
                              }}
                              title="Customer belum lunas. Tahan pengajuan berkas ke JVAC sampai status diverifikasi oleh Owner."
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#D97706', display: 'inline-block' }} />
                                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#92400E' }}>
                                  BELUM BAYAR
                                </span>
                              </div>
                              {hasStruk ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPreviewImage({ url: row.buktiBayarPemohon!, title: `Bukti Struk Transfer: ${row.namaPemohon}` });
                                  }}
                                  style={{
                                    background: '#FEF3C7',
                                    color: '#B45309',
                                    border: '1px solid #F59E0B',
                                    borderRadius: '4px',
                                    padding: '1px 4px',
                                    fontSize: '0.58rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '2px',
                                    marginTop: '1px',
                                  }}
                                  title="Customer telah mengunggah bukti struk transfer"
                                >
                                  <span>📄 Cek Struk</span>
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.58rem', color: '#DC2626', fontWeight: 700 }}>
                                  ⚠️ Tahan Berkas
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                    )}

                    {/* 6. Aksi (Rincian & Tolak) */}
                    <td
                      className="table-col-aksi"
                      style={{
                        width: '72px',
                        minWidth: '68px',
                        padding: '6px 2px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center', width: '100%' }}>
                        <button
                          className="btn btn-primary"
                          onClick={() => onSelectPengajuan(row.id)}
                          style={{
                            padding: '3px 4px',
                            fontSize: '0.70rem',
                            fontWeight: 700,
                            borderRadius: '5px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                            boxShadow: '0 1px 3px rgba(37, 99, 235, 0.2)',
                            whiteSpace: 'nowrap',
                            width: '100%',
                            justifyContent: 'center',
                          }}
                          title="Buka rincian lengkap pemohon"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                            visibility
                          </span>
                          <span>Rincian</span>
                        </button>

                        {st.currentStatus === 'Ditolak' ? (
                          <button
                            type="button"
                            onClick={() => handleTolakPengajuan(row)}
                            style={{
                              padding: '2px 4px',
                              fontSize: '0.66rem',
                              borderRadius: '5px',
                              backgroundColor: '#F1F5F9',
                              border: '1px solid #CBD5E1',
                              color: '#334155',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              whiteSpace: 'nowrap',
                              width: '100%',
                              justifyContent: 'center',
                            }}
                            title="Pulihkan status berkas dari Ditolak"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>
                              refresh
                            </span>
                            <span>Pulihkan</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleTolakPengajuan(row)}
                            style={{
                              padding: '2px 4px',
                              fontSize: '0.66rem',
                              borderRadius: '5px',
                              backgroundColor: 'rgba(239, 68, 68, 0.08)',
                              border: '1px solid rgba(239, 68, 68, 0.22)',
                              color: '#DC2626',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              whiteSpace: 'nowrap',
                              width: '100%',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease',
                            }}
                            title="Tolak berkas di awal atau karena ditolak konsulat"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.16)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>
                              close
                            </span>
                            <span>Tolak</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleHapusPengajuan(row)}
                          style={{
                            padding: '2px 4px',
                            fontSize: '0.66rem',
                            borderRadius: '5px',
                            backgroundColor: '#FEF2F2',
                            border: '1px solid #FECACA',
                            color: '#DC2626',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                            whiteSpace: 'nowrap',
                            width: '100%',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                          }}
                          title="Hapus / batalkan pendaftaran pemohon ini"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#FEE2E2';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#FEF2F2';
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>
                            delete
                          </span>
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards View (Khusus Tampilan HP / Layar <= 768px) */}
      <div className="pengajuan-mobile-cards">
        {filteredData.length === 0 ? (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              padding: '36px 16px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: '#EFF6FF',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 10px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>folder_off</span>
            </div>
            <h4 style={{ margin: '0 0 4px', fontSize: '0.92rem', fontWeight: 800, color: '#0F172A' }}>
              Tidak Ada Pengajuan Sesuai Filter
            </h4>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B', lineHeight: 1.5 }}>
              Coba sesuaikan kata kunci pencarian atau ubah filter tahapan.
            </p>
          </div>
        ) : (
          paginatedData.map((row, index) => {
            const st = getCandidateStages(row);
            const isBelumLunas = row.statusPembayaran === 'Menunggu Pembayaran';
            const isProsesLocked = (!isOwner && isBelumLunas && !st.isProses) || (!st.isSampai && !st.isProses);
            const isSelesaiLocked = (!isOwner && isBelumLunas && !st.isSelesai) || (!st.isProses && !st.isSelesai);
            const isKirimLocked = (!isOwner && isBelumLunas && !st.isKirim) || (!st.isSelesai && !st.isKirim);

            const stageItems = [
              { key: 'sampai' as const, label: 'Sampai', ok: st.isSampai, date: st.tglSampai, color: '#0284C7', bg: '#E0F2FE', border: '#BAE6FD', isLocked: false, lockTooltip: '' },
              {
                key: 'proses' as const,
                label: 'Proses',
                ok: st.isProses,
                date: st.tglProses,
                color: '#D97706',
                bg: '#FEF3C7',
                border: '#FDE68A',
                isLocked: isProsesLocked,
                lockTooltip: (!isOwner && isBelumLunas && !st.isProses)
                  ? '⚠️ Pembayaran Belum Lunas (Tahan Berkas: Dilarang proses sebelum lunas)'
                  : (!st.isSampai ? '⚠️ Tahap 1 (Sampai) belum selesai' : '')
              },
              {
                key: 'selesai' as const,
                label: 'Selesai',
                ok: st.isSelesai,
                date: st.tglSelesai,
                color: '#16A34A',
                bg: '#DCFCE7',
                border: '#BBF7D0',
                isLocked: isSelesaiLocked,
                lockTooltip: (!isOwner && isBelumLunas && !st.isSelesai)
                  ? '⚠️ Pembayaran Belum Lunas (Berkas Ditahan)'
                  : (!st.isProses ? '⚠️ Tahap 2 (Proses) belum selesai' : '')
              },
              {
                key: 'kirim' as const,
                label: 'Kirim',
                ok: st.isKirim,
                date: st.tglKirim,
                color: '#7C3AED',
                bg: '#F3E8FF',
                border: '#DDD6FE',
                isLocked: isKirimLocked,
                lockTooltip: (!isOwner && isBelumLunas && !st.isKirim)
                  ? '⚠️ Pembayaran Belum Lunas (Paspor Ditahan: Dilarang kirim sebelum lunas)'
                  : (!st.isSelesai ? '⚠️ Tahap 3 (Selesai) belum selesai' : '')
              },
            ];

            const officialMasterNo = Number((row.noPengajuan || '').replace(/[^0-9]/g, '')) || Number(row.id) || (startIndex + index + 1);
            const staffListNo = startIndex + index + 1;
            const displayRowNo = isOwner ? officialMasterNo : staffListNo;

            return (
              <div
                key={`mob-${row.id}`}
                className="pengajuan-mobile-card-item"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '16px',
                  padding: '12px 12px 0 12px',
                  boxShadow: '0 3px 12px rgba(15, 23, 42, 0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {/* 1. Header Strip Soft: Pemohon No, ID, Program & Paket */}
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    margin: '-12px -12px 2px -12px',
                    padding: '8px 12px',
                    borderBottom: '1.5px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
                    <span
                      style={{
                        fontWeight: 800,
                        color: '#1D4ED8',
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        padding: '2px 7px',
                        borderRadius: '5px',
                        fontSize: '0.72rem',
                        flexShrink: 0,
                      }}
                      title={isOwner ? `Nomor Urut Resmi: No. ${officialMasterNo}` : `No. Antrean Tugas: #${staffListNo} (ID Master: ${row.noPengajuan})`}
                    >
                      #{displayRowNo}
                    </span>
                    <span style={{ fontWeight: 800, color: '#1E293B', fontFamily: 'monospace', fontSize: '0.78rem', flexShrink: 0 }}>
                      {row.noPengajuan}
                    </span>
                    <span style={{ color: '#94A3B8', flexShrink: 0 }}>•</span>
                    <span style={{ fontWeight: 600, color: '#475569', fontSize: '0.73rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {row.program}
                    </span>
                  </div>

                  <div style={{ flexShrink: 0 }}>
                    {getPaketBadge(row.paket, row)}
                  </div>
                </div>

                {/* 2. Identitas Customer: Foto & Nama Lengkap (Full Width & Word-Break, Tidak Terpotong) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {row.fotoBase64 ? (
                    <img
                      src={row.fotoBase64}
                      alt={row.namaPemohon}
                      onClick={() => setSelectedPreviewImage({ url: row.fotoBase64!, title: `Pasfoto: ${row.namaPemohon}` })}
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        objectFit: 'cover',
                        border: '1.5px solid #CBD5E1',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                      title="Klik untuk melihat foto ukuran penuh"
                    />
                  ) : (
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: '#EFF6FF',
                        border: '1.5px solid #DBEAFE',
                        color: '#1D4ED8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.92rem',
                        flexShrink: 0,
                      }}
                    >
                      {row.namaPemohon
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')}
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* NAMA CUSTOMER LENGKAP: wordBreak break-word dan whiteSpace normal agar TIDAK TERPOTONG */}
                    <div
                      style={{
                        fontWeight: 800,
                        color: '#0F172A',
                        fontSize: '0.96rem',
                        lineHeight: 1.3,
                        cursor: 'pointer',
                        wordBreak: 'break-word',
                        whiteSpace: 'normal',
                      }}
                      onClick={() => onSelectPengajuan(row.id)}
                      title={row.namaPemohon}
                    >
                      {row.namaPemohon}
                    </div>

                    {/* Paspor & WhatsApp */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: '0.70rem',
                          color: '#334155',
                          backgroundColor: '#F1F5F9',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          border: '1px solid #E2E8F0',
                        }}
                        title="Nomor Paspor"
                      >
                        🛂 {showMaskedPaspor ? row.maskedPaspor : row.noPaspor}
                      </span>

                      {row.noTelp && (
                        <a
                          href={`https://wa.me/${row.noTelp.replace(/[^0-9]/g, '').replace(/^0/, '62')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '0.70rem',
                            color: '#166534',
                            backgroundColor: '#F0FDF4',
                            border: '1px solid #BBF7D0',
                            padding: '1px 7px',
                            borderRadius: '4px',
                            fontWeight: 700,
                            textDecoration: 'none',
                          }}
                          title="Chat WhatsApp pemohon"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="#25D366" style={{ flexShrink: 0 }}>
                            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.54 1.769.782 2.791.782h.005c3.18 0 5.767-2.587 5.768-5.766.001-3.182-2.585-5.768-5.769-5.768zm3.376 8.163c-.141.396-.713.725-1.021.76-.299.034-.689.147-2.27-.478-1.579-.623-2.58-2.23-2.658-2.336-.079-.105-.639-.851-.639-1.624 0-.773.407-1.154.551-1.31.144-.156.315-.195.42-.195.105 0 .21.001.302.006.098.005.228-.037.356.271.132.316.452 1.104.492 1.185.04.081.066.176.013.281-.053.106-.079.172-.158.264-.079.092-.166.205-.237.276-.08.079-.163.165-.07.325.093.16.413.681.887 1.102.61.543 1.124.71 1.284.79.16.08.254.067.348-.04.094-.107.404-.47.512-.631.108-.161.216-.134.364-.08.148.054.938.442 1.099.522.16.08.267.12.306.186.039.066.039.382-.102.778z"/>
                            <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.98-1.306A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.156c-1.636 0-3.155-.472-4.436-1.285l-.318-.202-2.955.775.789-2.88-.22-.35A8.109 8.109 0 013.844 12c0-4.497 3.659-8.156 8.156-8.156 4.497 0 8.156 3.659 8.156 8.156 0 4.497-3.659 8.156-8.156 8.156z"/>
                          </svg>
                          <span>{row.noTelp}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Catatan (Jika Ada) */}
                {row.catatan && (
                  <div
                    style={{
                      fontSize: '0.70rem',
                      color: '#475569',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '5px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#005BB5', flexShrink: 0 }}>sticky_note_2</span>
                    <span style={{ wordBreak: 'break-word', lineHeight: 1.3, color: '#334155' }}>
                      {row.catatan}
                    </span>
                  </div>
                )}

                {/* 3. Status Pembayaran & Ringkasan Finansial */}
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  {/* Baris Status Pembayaran */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Pembayaran:</span>
                      <button
                        type="button"
                        onClick={() => isOwner && handleTogglePaymentStatus(row)}
                        disabled={!isOwner}
                        style={{ border: 'none', background: 'none', padding: 0, cursor: isOwner ? 'pointer' : 'default' }}
                        title={isOwner ? "Klik untuk ubah status pembayaran" : undefined}
                      >
                        {row.statusPembayaran === 'Menunggu Pembayaran' ? (
                          <span style={{ backgroundColor: '#FFFBEB', color: '#92400E', border: '1px solid #FCD34D', padding: '2px 7px', borderRadius: '5px', fontSize: '0.68rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <span>⏳ Belum Lunas</span>
                            {isOwner && <span style={{ fontSize: '10px' }}>✎</span>}
                          </span>
                        ) : (
                          <span style={{ backgroundColor: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', padding: '2px 7px', borderRadius: '5px', fontSize: '0.68rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <span>✓ Lunas</span>
                            {isOwner && <span style={{ fontSize: '10px' }}>✎</span>}
                          </span>
                        )}
                      </button>
                      {row.buktiBayarPemohon && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPreviewImage({ url: row.buktiBayarPemohon!, title: `Bukti Transfer: ${row.namaPemohon}` });
                          }}
                          style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', borderRadius: '5px', padding: '2px 6px', fontSize: '0.66rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          📄 Struk
                        </button>
                      )}
                    </div>

                    {isOwner ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {row.statusPembayaran !== 'Lunas' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleKirimTagihanWA(row);
                            }}
                            style={{
                              border: '1px solid #BFDBFE',
                              backgroundColor: '#EFF6FF',
                              color: '#1D4ED8',
                              padding: '2px 7px',
                              borderRadius: '5px',
                              fontSize: '0.66rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                            title="Kirim rincian tagihan resmi ke WA customer"
                          >
                            <span>💳 Tagihan</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditPaket(e, row)}
                          style={{
                            border: '1px solid #BAE6FD',
                            backgroundColor: '#F0F9FF',
                            color: '#0284C7',
                            padding: '2px 7px',
                            borderRadius: '5px',
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <span>✏️ Biaya</span>
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.70rem', color: '#64748B', fontWeight: 600 }}>
                        {(row.program || '').toLowerCase().includes('waiver') ? (
                          <span style={{ color: '#059669', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>cloud_done</span>
                            100% Online
                          </span>
                        ) : (
                          <span style={{ color: '#0F172A', fontWeight: 700 }}>{row.konsjen}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 3 Angka Keuangan (Strip Bersih) */}
                  {isOwner && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '6px',
                        paddingTop: '6px',
                        borderTop: '1px dashed #E2E8F0',
                        textAlign: 'center',
                      }}
                    >
                      <div
                        onClick={(e) => handleOpenEditPaket(e, row)}
                        style={{ backgroundColor: '#FFFFFF', padding: '5px 4px', borderRadius: '6px', border: '1px solid #E2E8F0', cursor: 'pointer' }}
                        title="Klik untuk ubah nominal pemasukan"
                      >
                        <div style={{ fontSize: '0.60rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Masuk</div>
                        <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0F172A', marginTop: '1px', whiteSpace: 'nowrap' }}>
                          {formatRupiah(row.dibayarPemohon || 0)}
                        </div>
                      </div>
                      <div
                        onClick={(e) => handleOpenEditPaket(e, row)}
                        style={{ backgroundColor: '#FFFFFF', padding: '5px 4px', borderRadius: '6px', border: '1px solid #E2E8F0', cursor: 'pointer' }}
                        title="Klik untuk ubah modal pengeluaran"
                      >
                        <div style={{ fontSize: '0.60rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Modal</div>
                        <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginTop: '1px', whiteSpace: 'nowrap' }}>
                          {(row.nominalKeluar && row.nominalKeluar > 0) ? `-${formatRupiah(row.nominalKeluar)}` : ((isRowFinanceInputted(row) || (row.program || '').toLowerCase().includes('waiver')) ? 'Rp 0' : 'Belum Ada')}
                        </div>
                      </div>
                      <div
                        onClick={(e) => handleOpenEditPaket(e, row)}
                        style={{
                          backgroundColor: '#FFFFFF',
                          padding: '5px 4px',
                          borderRadius: '6px',
                          border: '1px solid #E2E8F0',
                          cursor: 'pointer'
                        }}
                        title={isRowFinanceInputted(row) ? "Fee Bersih MapahTrip" : "Fee bersih belum dihitung"}
                      >
                        <div style={{ fontSize: '0.60rem', color: '#059669', fontWeight: 700, textTransform: 'uppercase' }}>Fee Bersih</div>
                        <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#059669', marginTop: '1px', whiteSpace: 'nowrap' }}>
                          {isRowFinanceInputted(row) ? formatRupiah(getRowEffectiveFee(row)) : 'Belum Ada'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Berkas Fisik Checklist */}
                {(() => {
                  const berkasList = [
                    { label: 'Formulir Visa', short: 'Form', ok: Boolean(row.berkas?.formVisa || row.uploadedDocs?.formVisa) },
                    { label: 'Paspor Fisik', short: 'Paspor', ok: Boolean(row.berkas?.pasporFisik || row.uploadedDocs?.pasporFisik) },
                    { label: 'Pasfoto 3.5x4.5', short: 'Foto', ok: Boolean(row.berkas?.foto || row.fotoBase64 || row.uploadedDocs?.foto) },
                    { label: 'KTP Asli / Scan', short: 'KTP', ok: Boolean(row.berkas?.ktp || row.uploadedDocs?.ktp) },
                    { label: 'COE Dokumen', short: 'COE', ok: Boolean(row.berkas?.coe || row.uploadedDocs?.coe) },
                    { label: 'E-KTLN Dokumen', short: 'E-KTLN', ok: Boolean(row.berkas?.ektln || row.uploadedDocs?.ektln) },
                    { label: 'Surat Tugas & Izin', short: 'Tugas', ok: Boolean(row.berkas?.suratTugas || row.uploadedDocs?.suratTugas) },
                  ];
                  const completeCount = berkasList.filter((b) => b.ok).length;
                  const isAllComplete = completeCount === berkasList.length;
                  const missingCount = berkasList.length - completeCount;

                  return (
                    <div
                      style={{
                        backgroundColor: '#F8FAFC',
                        padding: '8px 10px',
                        borderRadius: '10px',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '6px',
                        }}
                      >
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155' }}>
                          Kelengkapan Dokumen Fisik:
                        </span>
                        <span
                          style={{
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            color: isAllComplete ? '#059669' : '#E11D48',
                            backgroundColor: isAllComplete ? '#ECFDF5' : '#FFF1F2',
                            padding: '1px 6px',
                            borderRadius: '5px',
                            border: `1px solid ${isAllComplete ? '#A7F3D0' : '#FFE4E6'}`,
                          }}
                        >
                          {isAllComplete ? '✓ Lengkap (6/6)' : `Kurang ${missingCount} Dokumen`}
                        </span>
                      </div>

                      {/* 6 Circle Dots */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '4px',
                          padding: '2px 0',
                        }}
                      >
                        {berkasList.map((b, bIdx) => (
                          <div
                            key={bIdx}
                            title={`${b.label}: ${b.ok ? 'Sudah Ada' : 'Belum Ada'}`}
                            style={{
                              flex: 1,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '2px',
                            }}
                          >
                            <span
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.70rem',
                                fontWeight: 800,
                                background: b.ok ? '#F1F5F9' : '#FEF2F2',
                                color: b.ok ? '#059669' : '#DC2626',
                                border: `1px solid ${b.ok ? '#E2E8F0' : '#FECACA'}`,
                              }}
                            >
                              {b.ok ? '✓' : '✕'}
                            </span>
                            <span
                              style={{
                                fontSize: '0.60rem',
                                color: b.ok ? '#475569' : '#94A3B8',
                                fontWeight: b.ok ? 700 : 500,
                              }}
                            >
                              {b.short}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Tombol Aksi Cepat jika ada berkas kurang */}
                      {!isAllComplete && row.noTelp && (
                        <div style={{ marginTop: '6px' }}>
                          <button
                            type="button"
                            onClick={(e) => handleSendCustomerWALink(e, row)}
                            style={{
                              width: '100%',
                              padding: '5px 8px',
                              fontSize: '0.70rem',
                              fontWeight: 700,
                              borderRadius: '6px',
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              color: '#334155',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease',
                            }}
                            title="Kirim pesan WhatsApp pengingat berkas yang kurang ke customer"
                          >
                            <span>📲</span>
                            <span>Minta via WA</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Status 4 Tahapan Ceklis (2x2 Grid Elegan & Mudah Ditap) */}
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Tahapan Status (Klik untuk Update):
                  </div>
                  {st.currentStatus === 'Ditolak' ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: 'rgba(239, 68, 68, 0.04)',
                        border: '1px solid rgba(239, 68, 68, 0.22)',
                        borderRadius: '10px',
                        padding: '8px 12px',
                        fontSize: '0.76rem',
                        lineHeight: 1.35,
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#DC2626',
                          fontWeight: 800,
                          fontSize: '0.70rem',
                          flexShrink: 0,
                          backgroundColor: 'rgba(239, 68, 68, 0.12)',
                          padding: '3px 7px',
                          borderRadius: '5px',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#DC2626' }}>cancel</span>
                        DITOLAK
                      </span>
                      <span style={{ color: '#334155', fontWeight: 600, flex: 1, wordBreak: 'break-word' }}>
                        {st.alasanPenolakan || 'Berkas Tidak Lengkap'}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                        {stageItems.map((s, sIdx) => (
                          <div
                            key={s.key}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!s.isLocked) {
                                handleToggleStage(row, s.key);
                              }
                            }}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              backgroundColor: s.ok ? '#FFFFFF' : '#F8FAFC',
                              border: s.ok ? '1.5px solid #CBD5E1' : '1px solid #E2E8F0',
                              borderRadius: '10px',
                              padding: '8px 10px',
                              cursor: s.isLocked ? 'not-allowed' : 'pointer',
                              transition: 'all 0.15s ease',
                              minHeight: '52px',
                              boxSizing: 'border-box',
                              boxShadow: s.ok ? '0 1px 3px rgba(0,0,0,0.03)' : 'none',
                              opacity: s.isLocked ? 0.6 : 1,
                            }}
                            title={s.isLocked ? (s.lockTooltip || "⚠️ Tahap sebelumnya belum selesai (Wajib berurutan)") : "Klik untuk ubah status tahapan"}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span
                                  style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    backgroundColor: s.ok ? '#059669' : '#F1F5F9',
                                    color: s.ok ? '#FFFFFF' : (s.isLocked ? '#CBD5E1' : '#94A3B8'),
                                    border: s.ok ? 'none' : '1px solid #CBD5E1',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.65rem',
                                    fontWeight: 800,
                                    flexShrink: 0,
                                    boxShadow: s.ok ? '0 1px 2px rgba(5, 150, 105, 0.2)' : 'none',
                                  }}
                                >
                                  {s.ok ? '✓' : sIdx + 1}
                                </span>
                                <span style={{ fontSize: '0.80rem', fontWeight: 700, color: s.ok ? '#0F172A' : (s.isLocked ? '#94A3B8' : '#64748B') }}>
                                  {s.label}
                                </span>
                              </div>
                              {s.ok && (
                                <span style={{ fontSize: '0.70rem', color: '#94A3B8' }} title="Ubah tanggal">
                                  ✎
                                </span>
                              )}
                            </div>

                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                if (s.ok) handleEditStageDate(row, s.key, s.date || '');
                              }}
                              style={{
                                fontSize: '0.70rem',
                                fontFamily: 'monospace',
                                color: s.ok ? '#475569' : '#94A3B8',
                                fontWeight: s.ok ? 600 : 500,
                                marginTop: '4px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                cursor: s.ok ? 'pointer' : 'default',
                              }}
                              title={s.ok ? "Klik untuk ubah tanggal" : undefined}
                            >
                              {s.ok ? `📅 ${s.date || getTodayFormatted()}` : 'Belum'}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Baris Khusus Nomor Resi / Serah Terima Bandara */}
                      {st.noResi && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            openKirimModal(row);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px',
                            padding: '7px 10px',
                            marginTop: '6px',
                            cursor: 'pointer',
                          }}
                          title="Klik untuk ubah nomor resi atau serah terima bandara"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                            <span style={{ fontSize: '0.82rem' }}>
                              {(() => {
                                const rLower = (st.noResi || '').toLowerCase();
                                if (rLower.includes('soehatta') || rLower.includes('soetta') || rLower.includes('soekarno') || rLower.includes('bandara') || rLower.includes('flight')) return '✈️';
                                if (rLower.includes('diambil') || rLower.includes('kantor') || rLower.includes('langsung')) return '🏢';
                                return '📦';
                              })()}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>
                              {(() => {
                                const rLower = (st.noResi || '').toLowerCase();
                                if (rLower.includes('soehatta') || rLower.includes('soetta') || rLower.includes('soekarno') || rLower.includes('bandara') || rLower.includes('flight')) return 'Bandara:';
                                if (rLower.includes('diambil') || rLower.includes('kantor') || rLower.includes('langsung')) return 'Status:';
                                return 'Resi:';
                              })()}
                            </span>
                            <span style={{ fontSize: '0.74rem', color: '#0F172A', fontWeight: 700, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', backgroundColor: '#FFFFFF', padding: '1px 6px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                              {st.noResi}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.68rem', color: '#2563EB', fontWeight: 700, flexShrink: 0, paddingLeft: '6px' }}>
                            Ubah ✎
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Tombol Aksi: Buka Rincian, Tolak/Pulihkan, & Hapus (Docked Card Footer) */}
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    margin: '4px -12px 0 -12px',
                    padding: '10px 12px',
                    borderTop: '1px solid #E2E8F0',
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1fr 1fr',
                    gap: '6px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onSelectPengajuan(row.id)}
                    style={{
                      height: '38px',
                      backgroundColor: '#2563EB',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 4px rgba(37, 99, 235, 0.18)',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>visibility</span>
                    <span>Rincian</span>
                  </button>

                  {st.currentStatus === 'Ditolak' ? (
                    <button
                      type="button"
                      onClick={() => handleTolakPengajuan(row)}
                      style={{
                        height: '38px',
                        backgroundColor: '#F1F5F9',
                        border: '1px solid #CBD5E1',
                        color: '#334155',
                        borderRadius: '8px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>refresh</span>
                      <span>Pulihkan</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleTolakPengajuan(row)}
                      style={{
                        height: '38px',
                        backgroundColor: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.22)',
                        color: '#DC2626',
                        borderRadius: '8px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.16)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>close</span>
                      <span>Tolak</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleHapusPengajuan(row)}
                    style={{
                      height: '38px',
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FECACA',
                      color: '#DC2626',
                      borderRadius: '8px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#FEE2E2';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FEF2F2';
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bar Bawah Pagination (Sesuai Referensi Gambar 2) */}
      {filteredData.length > 0 && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px 4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Sisi Kiri: Total X Data ditampilkan (1 sampai 20) */}
          <div style={{ fontSize: '0.84rem', color: '#64748B', fontWeight: 500 }}>
            Total <strong style={{ color: '#334155', fontWeight: 600 }}>{totalItems}</strong> Data ditampilkan (
            {totalItems === 0 ? 0 : startIndex + 1} sampai {endIndex})
          </div>

          {/* Sisi Kanan: « ‹ 1 2 3 4 5 ... 12 › » */}
          {pageSize !== -1 && totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
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

              {/* Nomor-nomor Halaman */}
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

      {/* Lightbox Preview Pasfoto Pemohon */}
      {selectedPreviewImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setSelectedPreviewImage(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '520px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid #E2E8F0',
                background: '#F8FAFC',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-symbols-outlined" style={{ color: '#2B68E0', fontSize: '22px' }}>
                  account_box
                </span>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A' }}>
                  {selectedPreviewImage.title}
                </span>
              </div>
              <button
                onClick={() => setSelectedPreviewImage(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#64748B',
                  lineHeight: 1,
                  padding: '4px',
                  borderRadius: '6px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Image Body */}
            <div
              style={{
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#0F172A',
                minHeight: '360px',
              }}
            >
              <img
                src={selectedPreviewImage.url}
                alt={selectedPreviewImage.title}
                style={{
                  maxWidth: '100%',
                  maxHeight: '60vh',
                  objectFit: 'contain',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                }}
              />
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '16px 20px',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#F8FAFC',
              }}
            >
              <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                Format Resmi Standar Konsulat Jepang
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href={selectedPreviewImage.url}
                  download={selectedPreviewImage.title.replace(/[^a-zA-Z0-9_-]/g, '_') + '.jpg'}
                  className="btn btn-primary"
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    download
                  </span>
                  <span>Unduh Foto</span>
                </a>
                <button
                  onClick={() => setSelectedPreviewImage(null)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '0.82rem', fontWeight: 600 }}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal Pengiriman & Serah Terima Paspor di Bandara Soekarno-Hatta */}
      {kirimModalItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => {
            if (!isSavingKirim) setKirimModalItem(null);
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid #E2E8F0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)',
                borderTopLeftRadius: '20px',
                borderTopRightRadius: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    backgroundColor: kirimMetode === 'soetta' ? '#EFF6FF' : kirimMetode === 'ekspedisi' ? '#F3E8FF' : '#F0FDF4',
                    color: kirimMetode === 'soetta' ? '#2563EB' : kirimMetode === 'ekspedisi' ? '#7C3AED' : '#16A34A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                    flexShrink: 0,
                  }}
                >
                  <span className="material-symbols-outlined">
                    {kirimMetode === 'soetta' ? 'flight_takeoff' : kirimMetode === 'ekspedisi' ? 'local_shipping' : 'storefront'}
                  </span>
                </div>
                <div>
                  <h3 style={{ margin: '0 0 3px', fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                    Metode Pengiriman / Penyerahan Paspor
                  </h3>
                  <div style={{ fontSize: '0.80rem', color: '#64748B' }}>
                    <strong>{kirimModalItem.namaPemohon}</strong> • Paspor: <span style={{ fontFamily: 'monospace', color: '#0F172A', fontWeight: 700 }}>{kirimModalItem.noPaspor}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setKirimModalItem(null)}
                disabled={isSavingKirim}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#94A3B8',
                  padding: '4px',
                  borderRadius: '6px',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

              {/* 3 Opsi Kartu Pilihan Metode */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  Pilih Cara Penyerahan Paspor:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {/* Opsi 1: Bandara Soetta */}
                  <div
                    onClick={() => setKirimMetode('soetta')}
                    style={{
                      border: kirimMetode === 'soetta' ? '2px solid #2563EB' : '1px solid #E2E8F0',
                      backgroundColor: kirimMetode === 'soetta' ? '#EFF6FF' : '#FFFFFF',
                      borderRadius: '12px',
                      padding: '12px 10px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease',
                      boxShadow: kirimMetode === 'soetta' ? '0 2px 8px rgba(37, 99, 235, 0.12)' : 'none',
                    }}
                  >
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>✈️</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: kirimMetode === 'soetta' ? '#1E40AF' : '#1E293B' }}>
                      Bandara Soetta
                    </div>
                    <div style={{ fontSize: '0.70rem', color: kirimMetode === 'soetta' ? '#3B82F6' : '#64748B', marginTop: '2px' }}>
                      Terminal 3 (T3)
                    </div>
                  </div>

                  {/* Opsi 2: Ekspedisi / Kurir */}
                  <div
                    onClick={() => setKirimMetode('ekspedisi')}
                    style={{
                      border: kirimMetode === 'ekspedisi' ? '2px solid #7C3AED' : '1px solid #E2E8F0',
                      backgroundColor: kirimMetode === 'ekspedisi' ? '#F5F3FF' : '#FFFFFF',
                      borderRadius: '12px',
                      padding: '12px 10px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease',
                      boxShadow: kirimMetode === 'ekspedisi' ? '0 2px 8px rgba(124, 58, 237, 0.12)' : 'none',
                    }}
                  >
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>📦</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: kirimMetode === 'ekspedisi' ? '#6D28D9' : '#1E293B' }}>
                      Ekspedisi
                    </div>
                    <div style={{ fontSize: '0.70rem', color: kirimMetode === 'ekspedisi' ? '#8B5CF6' : '#64748B', marginTop: '2px' }}>
                      JNE, J&amp;T, TIKI
                    </div>
                  </div>

                  {/* Opsi 3: Diambil di Kantor */}
                  <div
                    onClick={() => setKirimMetode('kantor')}
                    style={{
                      border: kirimMetode === 'kantor' ? '2px solid #16A34A' : '1px solid #E2E8F0',
                      backgroundColor: kirimMetode === 'kantor' ? '#F0FDF4' : '#FFFFFF',
                      borderRadius: '12px',
                      padding: '12px 10px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease',
                      boxShadow: kirimMetode === 'kantor' ? '0 2px 8px rgba(22, 163, 74, 0.12)' : 'none',
                    }}
                  >
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>🏢</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: kirimMetode === 'kantor' ? '#15803D' : '#1E293B' }}>
                      Ambil di Kantor
                    </div>
                    <div style={{ fontSize: '0.70rem', color: kirimMetode === 'kantor' ? '#22C55E' : '#64748B', marginTop: '2px' }}>
                      MapahTrip Office
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Input Sesuai Metode */}
              {kirimMetode === 'soetta' && (
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #DBEAFE',
                    borderRadius: '14px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1D4ED8', fontSize: '0.78rem', fontWeight: 700 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>connecting_airports</span>
                    <span>Rincian Serah Terima Terminal 3 Soekarno-Hatta:</span>
                  </div>

                  {/* Flight & Maskapai */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Maskapai &amp; Nomor Penerbangan:
                    </label>
                    <input
                      type="text"
                      value={soettaFlight}
                      onChange={(e) => setSoettaFlight(e.target.value)}
                      placeholder="Contoh: ANA NH836, GA874, JAL JL726..."
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                    {/* Quick Suggestions Chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                      {['ANA NH836', 'Garuda GA874', 'JAL JL726', 'Batik Air', 'Scoot', 'AirAsia'].map((fl) => (
                        <button
                          key={fl}
                          type="button"
                          onClick={() => setSoettaFlight(fl)}
                          style={{
                            background: soettaFlight === fl ? '#2563EB' : '#FFFFFF',
                            color: soettaFlight === fl ? '#FFFFFF' : '#475569',
                            border: '1px solid #CBD5E1',
                            borderRadius: '9999px',
                            padding: '2px 8px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {fl}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tanggal & Jam Penerbangan */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                      📅 Tanggal &amp; Waktu Serah Terima / Flight:
                    </label>

                    {/* 2 Input Pilihan: Tanggal Kalender & Jam Waktu */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <span style={{ display: 'block', fontSize: '0.70rem', color: '#64748B', marginBottom: '3px', fontWeight: 600 }}>Pilih Tanggal:</span>
                        <input
                          type="date"
                          value={soettaDate}
                          onChange={(e) => handleSoettaDateChange(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: '1.5px solid #CBD5E1',
                            fontSize: '0.85rem',
                            boxSizing: 'border-box',
                            outline: 'none',
                            backgroundColor: '#FFFFFF',
                            fontWeight: 600,
                            color: '#0F172A',
                            cursor: 'pointer',
                          }}
                        />
                      </div>
                      <div>
                        <span style={{ display: 'block', fontSize: '0.70rem', color: '#64748B', marginBottom: '3px', fontWeight: 600 }}>Pilih Jam Temu:</span>
                        <input
                          type="time"
                          value={soettaTime}
                          onChange={(e) => handleSoettaTimeChange(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: '1.5px solid #CBD5E1',
                            fontSize: '0.85rem',
                            boxSizing: 'border-box',
                            outline: 'none',
                            backgroundColor: '#FFFFFF',
                            fontWeight: 600,
                            color: '#0F172A',
                            cursor: 'pointer',
                          }}
                        />
                      </div>
                    </div>

                    {/* Pilihan Cepat Tanggal & Jam */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 600, marginRight: '2px' }}>Cepat:</span>
                      {[
                        {
                          label: 'Hari Ini',
                          action: () => {
                            const now = new Date();
                            const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                            handleSoettaDateChange(todayIso);
                          },
                        },
                        {
                          label: 'Besok',
                          action: () => {
                            const tom = new Date();
                            tom.setDate(tom.getDate() + 1);
                            const tomIso = `${tom.getFullYear()}-${String(tom.getMonth() + 1).padStart(2, '0')}-${String(tom.getDate()).padStart(2, '0')}`;
                            handleSoettaDateChange(tomIso);
                          },
                        },
                      ].map((dBtn) => (
                        <button
                          key={dBtn.label}
                          type="button"
                          onClick={dBtn.action}
                          style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            border: '1px solid #CBD5E1',
                            backgroundColor: '#F8FAFC',
                            fontSize: '0.68rem',
                            color: '#334155',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {dBtn.label}
                        </button>
                      ))}

                      <span style={{ fontSize: '0.68rem', color: '#CBD5E1', margin: '0 2px' }}>|</span>

                      {['21:00', '19:00', '23:00', '06:00', '10:00', '14:00'].map((tm) => (
                        <button
                          key={tm}
                          type="button"
                          onClick={() => handleSoettaTimeChange(tm)}
                          style={{
                            padding: '2px 7px',
                            borderRadius: '12px',
                            border: soettaTime === tm ? '1.5px solid #2563EB' : '1px solid #CBD5E1',
                            backgroundColor: soettaTime === tm ? '#EFF6FF' : '#FFFFFF',
                            fontSize: '0.68rem',
                            color: soettaTime === tm ? '#1D4ED8' : '#475569',
                            fontWeight: soettaTime === tm ? 700 : 600,
                            cursor: 'pointer',
                          }}
                        >
                          {tm} WIB
                        </button>
                      ))}
                    </div>

                    {/* Ringkasan Format Otomatis */}
                    <div style={{ marginTop: '6px', padding: '6px 10px', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <div style={{ fontSize: '0.72rem', color: '#0369A1', fontWeight: 600 }}>
                        Hasil Jadwal: <span style={{ fontWeight: 800, color: '#0C4A6E', fontFamily: 'monospace' }}>{soettaTanggalJam || 'Belum dipilih'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Titik Temu */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Titik Temu di Terminal 3:
                    </label>
                    <input
                      type="text"
                      value={soettaTitikTemu}
                      onChange={(e) => setSoettaTitikTemu(e.target.value)}
                      placeholder="Terminal 3 Keberangkatan Internasional Gate 1"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                      {[
                        'Gate 1 Keberangkatan Internasional',
                        "Depan Roti'O Terminal 3",
                        'Check-in Island A/B',
                      ].map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => setSoettaTitikTemu(loc)}
                          style={{
                            background: soettaTitikTemu === loc ? '#EFF6FF' : '#FFFFFF',
                            color: soettaTitikTemu === loc ? '#1E40AF' : '#64748B',
                            border: `1px solid ${soettaTitikTemu === loc ? '#93C5FD' : '#E2E8F0'}`,
                            borderRadius: '9999px',
                            padding: '2px 8px',
                            fontSize: '0.70rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#EFF6FF', borderRadius: '8px', padding: '8px 10px', fontSize: '0.75rem', color: '#1E40AF', display: 'flex', gap: '6px' }}>
                    <span>✨</span>
                    <span>
                      Data ini otomatis tampil di tab <strong>✈️ Jadwal Bandara</strong> pada Portal Mitra (LPK/Agensi) untuk pemohon ini.
                    </span>
                  </div>
                </div>
              )}

              {kirimMetode === 'ekspedisi' && (
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E9D5FF',
                    borderRadius: '14px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6D28D9', fontSize: '0.78rem', fontWeight: 700 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>local_shipping</span>
                    <span>Informasi Resi Ekspedisi Pengiriman:</span>
                  </div>

                  {/* Pilihan Ekspedisi */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Pilih Jasa Kurir:
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {['JNE', 'J&T', 'SiCepat', 'TIKI', 'Pos Indonesia', 'Paxel', 'Lalamove', 'Gojek/Grab'].map((kr) => (
                        <button
                          key={kr}
                          type="button"
                          onClick={() => setEkspedisiKurir(kr)}
                          style={{
                            backgroundColor: ekspedisiKurir === kr ? '#7C3AED' : '#FFFFFF',
                            color: ekspedisiKurir === kr ? '#FFFFFF' : '#475569',
                            border: `1px solid ${ekspedisiKurir === kr ? '#7C3AED' : '#CBD5E1'}`,
                            borderRadius: '8px',
                            padding: '4px 10px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {kr}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Nomor Resi */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Nomor Resi / AWB:
                    </label>
                    <input
                      type="text"
                      value={ekspedisiResi}
                      onChange={(e) => setEkspedisiResi(e.target.value)}
                      placeholder="Masukkan nomor resi ekspedisi..."
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                        outline: 'none',
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>
                </div>
              )}

              {kirimMetode === 'kantor' && (
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #BBF7D0',
                    borderRadius: '14px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#15803D', fontSize: '0.78rem', fontWeight: 700 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>storefront</span>
                    <span>Diambil Langsung di Kantor Operasional MapahTrip:</span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Nama Pengambil / Perwakilan:
                    </label>
                    <input
                      type="text"
                      value={kantorPengambil}
                      onChange={(e) => setKantorPengambil(e.target.value)}
                      placeholder="Contoh: Pemohon Sendiri / Keluarga / LPK"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Opsi Kirim WhatsApp */}
              <div
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>
                    <input
                      type="checkbox"
                      checked={kirimKirimWA}
                      onChange={(e) => setKirimKirimWA(e.target.checked)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <span>Kirim notifikasi otomatis via WhatsApp ke customer</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowWAPreview(!showWAPreview)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563EB',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                    }}
                  >
                    <span>{showWAPreview ? 'Sembunyikan' : 'Lihat'} Pesan</span>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                      {showWAPreview ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                </div>

                <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '4px', marginLeft: '24px' }}>
                  Nomor Tujuan: <strong style={{ color: '#0F172A' }}>{kirimModalItem.noTelp || '(Nomor WA belum terisi)'}</strong>
                </div>

                {showWAPreview && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '10px 12px',
                      backgroundColor: '#F0FDF4',
                      border: '1px solid #DCFCE7',
                      borderRadius: '8px',
                      fontSize: '0.74rem',
                      color: '#166534',
                      whiteSpace: 'pre-wrap',
                      maxHeight: '160px',
                      overflowY: 'auto',
                      lineHeight: 1.4,
                      fontFamily: 'sans-serif',
                    }}
                  >
                    {getKirimWAMessage(kirimModalItem)}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '14px 24px',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '10px',
                backgroundColor: '#F8FAFC',
                borderBottomLeftRadius: '20px',
                borderBottomRightRadius: '20px',
              }}
            >
              <button
                type="button"
                onClick={() => setKirimModalItem(null)}
                disabled={isSavingKirim}
                style={{
                  padding: '9px 16px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmKirim}
                disabled={isSavingKirim}
                style={{
                  padding: '9px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  color: '#FFFFFF',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: isSavingKirim ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  {isSavingKirim ? 'hourglass_top' : 'check_circle'}
                </span>
                <span>{isSavingKirim ? 'Menyimpan...' : 'Simpan & Konfirmasi Kirim 📦'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ubah Paket Layanan Visa */}
      {editingPaketTarget && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={() => setEditingPaketTarget(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'modalSlideUp 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid #E2E8F0',
                background: 'linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#005BB5',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>inventory_2</span>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: '#0F172A' }}>
                    Ubah Paket &amp; Atur Keuangan Pemohon
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: '#64748B' }}>
                    Sesuaikan paket, uang dibayar pemohon (pemasukan), dan modal keluar konsulat (pengeluaran)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPaketTarget(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Info Pemohon */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '8px',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block' }}>Nama Pemohon</span>
                  <strong style={{ fontSize: '0.82rem', color: '#0F172A' }}>{editingPaketTarget.namaPemohon}</strong>
                  <span style={{ fontSize: '0.68rem', color: '#94A3B8', display: 'block', fontFamily: 'monospace' }}>
                    {editingPaketTarget.noPengajuan || editingPaketTarget.noPaspor}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block' }}>Program &amp; Wilayah</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1E40AF' }}>{editingPaketTarget.program}</span>
                  <span style={{ fontSize: '0.70rem', color: '#64748B', display: 'block' }}>Konsjen {editingPaketTarget.konsjen}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block' }}>Paket Saat Ini</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        backgroundColor: '#E2E8F0',
                        color: '#334155',
                      }}
                    >
                      {editingPaketTarget.paket || 'Reguler'}
                    </span>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0F172A' }}>
                      {formatRupiah(editingPaketTarget.dibayarPemohon || 0)}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: editingPaketTarget.statusPembayaran === 'Lunas' ? '#16A34A' : '#D97706', fontWeight: 600 }}>
                    ● {editingPaketTarget.statusPembayaran || 'Menunggu Bayar'}
                  </span>
                </div>

                {editingPaketTarget.catatan && (
                  <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed #CBD5E1', paddingTop: '6px', marginTop: '2px' }}>
                    <span style={{ fontSize: '0.66rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#005BB5' }}>sticky_note_2</span>
                      Catatan Sebelumnya:
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#334155', fontWeight: 600 }}>
                      {editingPaketTarget.catatan}
                    </span>
                  </div>
                )}
              </div>

              {/* Pilihan 2 Paket Layanan */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
                  PILIH PAKET LAYANAN BARU:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {(['Reguler', 'Premium'] as PaketVisa[]).map((pkt) => {
                    const isSelected = newSelectedPaket === pkt;
                    const pktPrice = getVisaPrice(editingPaketTarget.program, pkt, editingPaketTarget.konsjen);
                    const isCurrent = (editingPaketTarget.paket || 'Reguler') === pkt;

                    return (
                      <div
                        key={pkt}
                        onClick={() => handleSelectNewPaket(pkt)}
                        style={{
                          border: isSelected ? '2px solid #005BB5' : '1px solid #E2E8F0',
                          backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                          borderRadius: '12px',
                          padding: '10px 6px',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          boxShadow: isSelected ? '0 4px 12px rgba(0, 91, 181, 0.12)' : 'none',
                          minWidth: 0,
                        }}
                      >
                        {isCurrent && (
                          <span
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: isSelected ? '24px' : '6px',
                              backgroundColor: '#64748B',
                              color: '#FFFFFF',
                              fontSize: '0.54rem',
                              fontWeight: 800,
                              padding: '1px 5px',
                              borderRadius: '4px',
                            }}
                          >
                            Aktif
                          </span>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <span
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              color: pkt === 'TAC' ? '#4338CA' : pkt === 'Premium' ? '#B45309' : '#334155',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {pkt === 'TAC' ? '⚡ TAC' : pkt === 'Premium' ? '★ Premium' : '📋 Reguler'}
                          </span>
                          {isSelected && (
                            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#005BB5' }}>
                              check_circle
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.64rem', color: '#64748B', marginBottom: '6px', lineHeight: 1.25 }}>
                          {pkt === 'TAC'
                            ? 'All-in & VIP'
                            : pkt === 'Premium'
                            ? 'Fast-track'
                            : 'Standar'}
                        </div>

                        <div style={{ marginTop: 'auto', paddingTop: '6px', borderTop: '1px dashed #E2E8F0' }}>
                          <span style={{ fontSize: '0.60rem', color: '#94A3B8', display: 'block', whiteSpace: 'nowrap' }}>Master Tarif:</span>
                          <strong
                            style={{
                              fontSize: 'clamp(0.68rem, 2.5vw, 0.78rem)',
                              color: '#0F172A',
                              whiteSpace: 'nowrap',
                              display: 'block',
                              letterSpacing: '-0.3px',
                            }}
                          >
                            Rp&nbsp;{Number(pktPrice || 0).toLocaleString('id-ID')}
                          </strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Input Dua Kolom: Pemasukan (Dibayar Pemohon) & Pengeluaran (Modal Keluar) */}
              <div className="modal-finance-inputs-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                {/* Kolom 1: Pemasukan Dibayar Pemohon */}
                <div className="modal-finance-col">
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                    1. Nominal Dibayar Pemohon (Pemasukan):
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <span
                        style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontWeight: 700,
                          fontSize: '0.80rem',
                          color: '#64748B',
                        }}
                      >
                        Rp
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={newNominalBiaya === 0 ? '' : newNominalBiaya}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/[^0-9]/g, '');
                          setNewNominalBiaya(clean === '' ? 0 : Number(clean));
                        }}
                        placeholder="0"
                        style={{
                          width: '100%',
                          padding: '8px 10px 8px 36px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          fontSize: '0.88rem',
                          fontWeight: 700,
                          color: '#0F172A',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const master = getVisaPrice(editingPaketTarget.program, newSelectedPaket);
                        setNewNominalBiaya(master);
                      }}
                      style={{
                        padding: '8px 10px',
                        backgroundColor: '#F1F5F9',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        fontSize: '0.70rem',
                        fontWeight: 700,
                        color: '#475569',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                      title="Kembalikan ke Master Tarif Paket"
                    >
                      Reset Master
                    </button>
                  </div>
                  <div style={{ fontSize: '0.66rem', color: '#64748B', marginTop: '3px', fontFamily: 'monospace' }}>
                    Terbaca: <strong>Rp {newNominalBiaya.toLocaleString('id-ID')}</strong>
                  </div>
                </div>

                {/* Kolom 2: Modal Keluar / Pengeluaran Konsulat */}
                <div className="modal-finance-col">
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#DC2626', marginBottom: '4px' }}>
                    2. Modal Keluar Konsulat (Pengeluaran):
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <span
                        style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontWeight: 700,
                          fontSize: '0.80rem',
                          color: '#DC2626',
                        }}
                      >
                        Rp
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={newNominalKeluar === 0 ? '' : newNominalKeluar}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/[^0-9]/g, '');
                          setNewNominalKeluar(clean === '' ? 0 : Number(clean));
                        }}
                        placeholder="0"
                        style={{
                          width: '100%',
                          padding: '8px 10px 8px 36px',
                          borderRadius: '8px',
                          border: '1px solid #FCA5A5',
                          backgroundColor: '#FEF2F2',
                          fontSize: '0.88rem',
                          fontWeight: 700,
                          color: '#DC2626',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewNominalKeluar(1940000)}
                      style={{
                        padding: '8px 10px',
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        borderRadius: '8px',
                        fontSize: '0.70rem',
                        fontWeight: 700,
                        color: '#1D4ED8',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                      title="Set standar modal konsulat 1.940.000"
                    >
                      1.94 jt
                    </button>
                  </div>
                  <div style={{ fontSize: '0.66rem', color: '#DC2626', marginTop: '3px', fontFamily: 'monospace' }}>
                    Pengeluaran: <strong>-Rp {newNominalKeluar.toLocaleString('id-ID')}</strong>
                  </div>
                </div>

                {/* Kolom 3: Fee Staf PIC (Operasional Pengurangan Laba) */}
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#4338CA', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>badge</span>
                      3. Fee Staf PIC ({editingPaketTarget.staffPic || 'Staf'}):
                    </label>
                    <span style={{ fontSize: '0.66rem', color: '#6366F1', fontWeight: 600, backgroundColor: '#EEF2FF', padding: '1px 6px', borderRadius: '4px' }}>
                      Bisa Rp 0 (Opsional)
                    </span>
                  </div>
                  <div style={{ position: 'relative', width: '100%', marginBottom: '6px' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontWeight: 700,
                        fontSize: '0.80rem',
                        color: '#4F46E5',
                        userSelect: 'none',
                      }}
                    >
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={newStaffFee === 0 ? '' : newStaffFee}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/[^0-9]/g, '');
                        setNewStaffFee(clean === '' ? 0 : Number(clean));
                      }}
                      placeholder="0"
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 38px',
                        borderRadius: '8px',
                        border: '1.5px solid #C7D2FE',
                        backgroundColor: '#EEF2FF',
                        fontSize: '0.90rem',
                        fontWeight: 700,
                        color: '#4338CA',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  {/* Preset Nominal Cepat: Grid 4 Kolom Rapi */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                    {[
                      { val: 0, label: 'Rp 0' },
                      { val: 25000, label: '25 rb' },
                      { val: 50000, label: '50 rb (Std)' },
                      { val: 75000, label: '75 rb' },
                    ].map((btn) => (
                      <button
                        key={btn.val}
                        type="button"
                        onClick={() => setNewStaffFee(btn.val)}
                        style={{
                          padding: '7px 2px',
                          backgroundColor: newStaffFee === btn.val ? '#4F46E5' : '#FFFFFF',
                          color: newStaffFee === btn.val ? '#FFFFFF' : '#475569',
                          border: newStaffFee === btn.val ? '1.5px solid #4338CA' : '1px solid #CBD5E1',
                          borderRadius: '7px',
                          fontSize: '0.70rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                          boxShadow: newStaffFee === btn.val ? '0 2px 4px rgba(79, 70, 229, 0.2)' : 'none',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.66rem', color: '#4F46E5', marginTop: '5px', fontFamily: 'monospace' }}>
                    <span style={{ whiteSpace: 'nowrap' }}>
                      Alokasi Staf: <strong>-Rp&nbsp;{newStaffFee.toLocaleString('id-ID')}</strong>
                    </span>
                    <span style={{ color: '#64748B', whiteSpace: 'nowrap' }}>
                      {newStaffFee === 0 ? '(Tanpa potongan laba)' : `(Untuk ${editingPaketTarget.staffPic || 'Staf'})`}
                    </span>
                  </div>
                </div>

                {/* Kolom 4: Komisi Referral Mitra (Hanya jika mendaftar dengan kode mitra) */}
                {(() => {
                  const hasMitra = Boolean(
                    editingPaketTarget.affiliateCode &&
                    editingPaketTarget.affiliateCode.trim() !== '' &&
                    editingPaketTarget.affiliateCode.toUpperCase() !== 'MAPAHTRIP'
                  );
                  if (!hasMitra) return null;
                  return (
                    <div style={{ gridColumn: 'span 2' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '4px' }}>
                        <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#D97706' }}>
                          4. Komisi Referral Mitra ({editingPaketTarget.affiliateCode}):
                        </label>
                        <span style={{ fontSize: '0.66rem', color: '#64748B' }}>
                          Bisa disesuaikan jika ada kenaikan fee mitra
                        </span>
                      </div>
                      <div style={{ position: 'relative', width: '100%', marginBottom: '6px' }}>
                        <span
                          style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontWeight: 700,
                            fontSize: '0.80rem',
                            color: '#D97706',
                          }}
                        >
                          Rp
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={newReferralFee === 0 ? '' : newReferralFee}
                          onChange={(e) => {
                            const clean = e.target.value.replace(/[^0-9]/g, '');
                            setNewReferralFee(clean === '' ? 0 : Number(clean));
                          }}
                          placeholder="0"
                          style={{
                            width: '100%',
                            padding: '8px 10px 8px 36px',
                            borderRadius: '8px',
                            border: '1px solid #FDE68A',
                            backgroundColor: '#FFFBEB',
                            fontSize: '0.88rem',
                            fontWeight: 700,
                            color: '#B45309',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                      {/* Preset Cepat 5 Kolom Rapi */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '5px' }}>
                        <button
                          type="button"
                          onClick={() => setNewReferralFee(0)}
                          style={{
                            padding: '7px 3px',
                            backgroundColor: newReferralFee === 0 ? '#D97706' : '#F1F5F9',
                            color: newReferralFee === 0 ? '#FFFFFF' : '#475569',
                            border: '1px solid #CBD5E1',
                            borderRadius: '7px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Rp 0
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewReferralFee(50000)}
                          style={{
                            padding: '7px 3px',
                            backgroundColor: newReferralFee === 50000 ? '#D97706' : '#F1F5F9',
                            color: newReferralFee === 50000 ? '#FFFFFF' : '#475569',
                            border: '1px solid #CBD5E1',
                            borderRadius: '7px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          50 rb
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewReferralFee(100000)}
                          style={{
                            padding: '7px 3px',
                            backgroundColor: newReferralFee === 100000 ? '#D97706' : '#FFFBEB',
                            color: newReferralFee === 100000 ? '#FFFFFF' : '#B45309',
                            border: '1px solid #FDE68A',
                            borderRadius: '7px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                          }}
                          title="Standar umum komisi referral mitra Rp 100.000"
                        >
                          100 rb
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewReferralFee(150000)}
                          style={{
                            padding: '7px 3px',
                            backgroundColor: newReferralFee === 150000 ? '#D97706' : '#F1F5F9',
                            color: newReferralFee === 150000 ? '#FFFFFF' : '#475569',
                            border: '1px solid #CBD5E1',
                            borderRadius: '7px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          150 rb
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewReferralFee(200000)}
                          style={{
                            padding: '7px 3px',
                            backgroundColor: newReferralFee === 200000 ? '#D97706' : '#F1F5F9',
                            color: newReferralFee === 200000 ? '#FFFFFF' : '#475569',
                            border: '1px solid #CBD5E1',
                            borderRadius: '7px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          200 rb
                        </button>
                      </div>
                      <div style={{ fontSize: '0.66rem', color: '#D97706', marginTop: '4px', fontFamily: 'monospace' }}>
                        Komisi Mitra: <strong>-Rp {newReferralFee.toLocaleString('id-ID')}</strong> (Diberikan ke mitra {editingPaketTarget.affiliateCode})
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Live Preview Finansial: Rincian Struk Rapi & Transparan */}
              {(() => {
                const hasMitra = Boolean(
                  editingPaketTarget.affiliateCode &&
                  editingPaketTarget.affiliateCode.trim() !== '' &&
                  editingPaketTarget.affiliateCode.toUpperCase() !== 'MAPAHTRIP'
                );
                const refFee = hasMitra ? newReferralFee : 0;
                const liveFee = Math.max(0, newNominalBiaya - newNominalKeluar - refFee - newStaffFee);
                return (
                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '1.5px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '7px',
                    }}
                  >
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                      Ringkasan Pembagian Keuangan:
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', gap: '8px' }}>
                      <span style={{ color: '#475569', minWidth: 0 }}>1. Pemasukan Pemohon</span>
                      <strong style={{ color: '#0F172A', fontFamily: 'monospace', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        +Rp&nbsp;{newNominalBiaya.toLocaleString('id-ID')}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', gap: '8px' }}>
                      <span style={{ color: '#DC2626', minWidth: 0 }}>2. Modal Keluar Konsulat</span>
                      <strong style={{ color: '#DC2626', fontFamily: 'monospace', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        -Rp&nbsp;{newNominalKeluar.toLocaleString('id-ID')}
                      </strong>
                    </div>
                    {hasMitra && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', gap: '8px' }}>
                        <span style={{ color: '#D97706', minWidth: 0 }}>3. Komisi Referral ({editingPaketTarget.affiliateCode})</span>
                        <strong style={{ color: '#D97706', fontFamily: 'monospace', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          -Rp&nbsp;{refFee.toLocaleString('id-ID')}
                        </strong>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', gap: '8px' }}>
                      <span style={{ color: '#4F46E5', minWidth: 0 }}>{hasMitra ? '4' : '3'}. Fee Staf PIC ({editingPaketTarget.staffPic || 'Staf'})</span>
                      <strong style={{ color: '#4F46E5', fontFamily: 'monospace', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        -Rp&nbsp;{newStaffFee.toLocaleString('id-ID')}
                      </strong>
                    </div>

                    {/* Banner Total Fee Bersih: Anti-Tabrakan & Jelas di HP */}
                    <div
                      style={{
                        backgroundColor: '#ECFDF5',
                        border: '1.5px solid #86EFAC',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        marginTop: '6px',
                      }}
                    >
                      <div style={{ fontSize: '0.68rem', color: '#166534', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                        FEE BERSIH MAPAHTRIP:
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                        <div style={{ fontSize: '1.30rem', color: '#15803D', fontFamily: 'monospace', fontWeight: 900, whiteSpace: 'nowrap' }}>
                          Rp&nbsp;{liveFee.toLocaleString('id-ID')}
                        </div>
                        <div style={{ fontSize: '0.64rem', color: '#166534', textAlign: 'right' }}>
                          Laba bersih setelah semua beban
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Status Pembayaran & Alert Selisih */}
              {(() => {
                const isLunas = editingPaketTarget.statusPembayaran === 'Lunas';
                const selisih = newNominalBiaya - (editingPaketTarget.dibayarPemohon || 0);

                if (isLunas) {
                  if (selisih > 0) {
                    return (
                      <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '8px', padding: '10px 12px', fontSize: '0.74rem', color: '#92400E' }}>
                        <strong>⚠️ Catatan Pembayaran:</strong> Status pemohon saat ini sudah <strong>Lunas ({formatRupiah(editingPaketTarget.dibayarPemohon || 0)})</strong>. Karena upgrade paket, ada kekurangan bayar sebesar <strong>{formatRupiah(selisih)}</strong> untuk ditagihkan.
                      </div>
                    );
                  }
                  if (selisih < 0) {
                    return (
                      <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '10px 12px', fontSize: '0.74rem', color: '#1E40AF' }}>
                        <strong>ℹ️ Catatan Pembayaran:</strong> Status pemohon saat ini sudah <strong>Lunas ({formatRupiah(editingPaketTarget.dibayarPemohon || 0)})</strong>. Karena penurunan paket, terdapat kelebihan bayar <strong>{formatRupiah(Math.abs(selisih))}</strong> untuk di-refund.
                      </div>
                    );
                  }
                }
                return (
                  <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '10px 12px', fontSize: '0.74rem', color: '#15803D' }}>
                    ✓ Tagihan otomatis diperbarui menjadi <strong>{formatRupiah(newNominalBiaya)}</strong> untuk Paket {newSelectedPaket}.
                  </div>
                );
              })()}

              {/* Catatan Perubahan (Opsional) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                  Catatan Alasan Perubahan (Opsional):
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Pemohon minta upgrade ke TAC untuk penanganan berkas all-in"
                  value={catatanPerubahanPaket}
                  onChange={(e) => setCatatanPerubahanPaket(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.75rem', boxSizing: 'border-box' }}
                />
              </div>

              {/* Action Buttons: Rapi, Sejajar & Responsif */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={handleKirimWAPaket}
                  style={{
                    width: '100%',
                    backgroundColor: '#ECFDF5',
                    color: '#047857',
                    border: '1px solid #A7F3D0',
                    padding: '9px 14px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                  title="Kirim pesan rincian paket ke WhatsApp pemohon (Opsional)"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#10B981' }}>chat</span>
                  <span>Kirim Pesan ke WA (Opsional)</span>
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', width: '100%' }}>
                  <button
                    type="button"
                    onClick={() => setEditingPaketTarget(null)}
                    style={{
                      height: '42px',
                      backgroundColor: '#F1F5F9',
                      color: '#475569',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNewPaket}
                    style={{
                      height: '42px',
                      backgroundColor: '#005BB5',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.84rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0, 91, 181, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                    <span>Simpan Perubahan</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
