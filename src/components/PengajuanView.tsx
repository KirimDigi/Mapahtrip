import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import type { Pengajuan, StatusPengajuan } from '../types';
import { supabase, updatePengajuanPaymentInDB } from '../lib/supabase';
import { kirimPesanWA } from '../whatsapp';
import { getApplicantAccessKey } from '../utils/accessKey';

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
  const [soettaTitikTemu, setSoettaTitikTemu] = useState<string>('Terminal 3 Keberangkatan Internasional Gate 1');
  const [kantorPengambil, setKantorPengambil] = useState<string>('Pemohon Sendiri');
  const [kirimKirimWA, setKirimKirimWA] = useState<boolean>(true);
  const [isSavingKirim, setIsSavingKirim] = useState<boolean>(false);
  const [showWAPreview, setShowWAPreview] = useState<boolean>(false);

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
    const tglKirim = ov.tglKirim !== undefined ? ov.tglKirim : (item.tglKirim || '');
    const noResi = ov.noResi !== undefined ? ov.noResi : (item.noResi || '');
    const alasanPenolakan = ov.alasanPenolakan !== undefined ? ov.alasanPenolakan : (item.alasanPenolakan || item.catatan || '');
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
      alasanPenolakan,
      currentStatus,
    };
  };

  const [copiedLinkRowId, setCopiedLinkRowId] = useState<string | null>(null);

  const getCustomerUploadLink = (item: Pengajuan) => {
    const code = item.noPengajuan || item.noPaspor || item.id;
    const key = getApplicantAccessKey(item);
    return `${window.location.origin}/?lacak=${encodeURIComponent(code)}&key=${encodeURIComponent(key)}`;
  };

  const handleCopyCustomerLink = (e: React.MouseEvent, item: Pengajuan) => {
    e.stopPropagation();
    try {
      const link = getCustomerUploadLink(item);
      navigator.clipboard.writeText(link);
      setCopiedLinkRowId(item.id);
      setTimeout(() => setCopiedLinkRowId(null), 2500);
      alert(`🔗 Tautan upload mandiri untuk "${item.namaPemohon}" berhasil disalin:\n\n${link}\n\nAnda dapat mengirimkan link ini ke WhatsApp customer agar mereka dapat mengunggah berkas yang kurang langsung dari HP.`);
    } catch {
      // fallback
    }
  };

  const handleSendCustomerWALink = (e: React.MouseEvent, item: Pengajuan) => {
    e.stopPropagation();
    const link = getCustomerUploadLink(item);
    const noWa = item.noTelp?.trim();
    if (!noWa) {
      alert(`Nomor WhatsApp untuk pemohon "${item.namaPemohon}" belum tersedia. Silakan salin tautan secara manual.`);
      return;
    }

    const berkasList = [
      { name: 'Formulir Aplikasi Visa Jepang', ok: Boolean(item.berkas?.formVisa || item.uploadedDocs?.formVisa) },
      { name: 'Scan / Foto Paspor Asli', ok: Boolean(item.berkas?.pasporFisik || item.uploadedDocs?.pasporFisik) },
      { name: 'Pas Foto 4.5 × 3.5 cm (Background Putih)', ok: Boolean(item.berkas?.foto || item.fotoBase64 || item.uploadedDocs?.foto) },
      { name: 'Fotokopi / Scan KTP & Kartu Keluarga', ok: Boolean(item.berkas?.ktp || item.uploadedDocs?.ktp) },
      { name: 'COE / Bukti Booking Hotel & Tiket', ok: Boolean(item.berkas?.coe || item.uploadedDocs?.coe) },
      { name: 'Bukti Keuangan / Rekening Koran / E-KTLN', ok: Boolean(item.berkas?.ektln || item.uploadedDocs?.ektln) },
    ];
    const missing = berkasList.filter((b) => !b.ok).map((b) => `• ${b.name}`).join('\n');

    const pesan =
`*PEMBERITAHUAN KELENGKAPAN BERKAS VISA JEPANG - MAPAHTRIP*\n\n` +
`Halo Sdr/i *${item.namaPemohon}*,\n\n` +
`Pendaftaran pengajuan Visa Jepang Anda telah kami terima (*${item.noPengajuan || '-'}*).\n\n` +
(missing ? `Berikut berkas persyaratan yang masih perlu Anda lengkapi:\n${missing}\n\n` : '') +
`Silakan ambil foto / unggah berkas langsung dari HP melalui tautan resmi berikut:\n\n` +
`${link}\n\n` +
`Setelah Anda unggah, berkas akan otomatis terverifikasi di sistem staf kami tanpa perlu dikirim manual ke WhatsApp.\n\n` +
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
        const confirmBatal = window.confirm(
          `⚠️ Batalkan Status Berkas Sampai?\n\nApakah Anda yakin ingin membatalkan status berkas fisik sampai untuk pengajuan atas nama "${item.namaPemohon}"?`
        );
        if (!confirmBatal) return;
        newStages.tglSampai = '';
      } else {
        const noWa = item.noTelp && item.noTelp.trim() ? item.noTelp.trim() : 'Nomor belum tersedia';
        const konfirmasi = window.confirm(
          `⚠️ KONFIRMASI BERKAS FISIK SAMPAI DI KANTOR\n\n` +
          `Anda akan menandai bahwa berkas fisik & paspor asli telah SAMPAI di kantor MapahTrip:\n` +
          `• Nama Pemohon : ${item.namaPemohon}\n` +
          `• No. Paspor   : ${item.noPaspor}\n` +
          `• No. WhatsApp : ${noWa}\n\n` +
          `⚠️ PENTING:\n` +
          `Setelah Anda klik OK, status berkas fisik akan ditandai "Sampai" dan notifikasi resmi bahwa berkas telah tiba beserta RINCIAN TAGIHAN & REKENING RESMI MAPAHTRIP akan OTOMATIS dikirimkan melalui WhatsApp ke nomor customer (${noWa}).\n\n` +
          `Apakah Anda yakin berkas fisik sudah sampai dan ingin mengirim notifikasi & tagihan ke customer?`
        );
        if (!konfirmasi) return;

        newStages.tglSampai = today;
        shouldSendWASampai = true;
      }
    } else if (stage === 'proses') {
      if (stages.isProses) {
        const confirmBatal = window.confirm(
          `⚠️ Batalkan Status Proses?\n\nApakah Anda yakin ingin membatalkan status SEDANG DIPROSES untuk pengajuan atas nama "${item.namaPemohon}"?`
        );
        if (!confirmBatal) return;
        newStages.tglProses = '';
        if (newStatus === 'Sedang Diproses' || newStatus === 'Apply Hari Ini') {
          newStatus = 'Menunggu Verifikasi';
        }
      } else {
        const noWa = item.noTelp && item.noTelp.trim() ? item.noTelp.trim() : 'Nomor belum tersedia';
        const isBelumLunas = item.statusPembayaran === 'Menunggu Pembayaran';
        const warningBayar = isBelumLunas
          ? `\n\n⚠️ PERHATIAN STATUS PEMBAYARAN:\nStatus pemohon ini masih "Menunggu Pembayaran" (Belum Lunas).\nPastikan pembayaran telah dikonfirmasi kantor sebelum berkas diajukan ke JVAC/Kedutaan!`
          : '';
        const konfirmasi = window.confirm(
          `⚠️ PERINGATAN KONFIRMASI: APAKAH YAKIN SUDAH DIPROSES?\n\n` +
          `Anda akan menandai pengajuan visa ini sebagai SEDANG DIPROSES:\n` +
          `• Nama Pemohon : ${item.namaPemohon}\n` +
          `• No. Paspor   : ${item.noPaspor}\n` +
          `• No. WhatsApp : ${noWa}` +
          warningBayar +
          `\n\n⚠️ PENTING:\n` +
          `Setelah Anda klik OK, status akan diubah menjadi "Sedang Diproses" dan notifikasi resmi bahwa berkas visa telah diajukan ke Kedutaan / JVAC akan OTOMATIS dikirimkan melalui WhatsApp ke nomor customer (${noWa}).\n\n` +
          `Apakah Anda yakin ingin melanjutkan kirim notifikasi WhatsApp ke customer?`
        );
        if (!konfirmasi) return;

        newStages.tglProses = today;
        if (!stages.isSampai) newStages.tglSampai = today;
        newStatus = 'Sedang Diproses';
        shouldSendWAProses = true;
      }
    } else if (stage === 'selesai') {
      if (stages.isSelesai) {
        const confirmBatal = window.confirm(
          `⚠️ Batalkan Status Selesai?\n\nApakah Anda yakin ingin membatalkan status SELESAI untuk pengajuan atas nama "${item.namaPemohon}"?`
        );
        if (!confirmBatal) return;
        newStages.tglSelesai = '';
        if (newStatus === 'Selesai') {
          newStatus = stages.isProses ? 'Sedang Diproses' : 'Menunggu Verifikasi';
        }
      } else {
        const noWa = item.noTelp && item.noTelp.trim() ? item.noTelp.trim() : 'Nomor belum tersedia';
        const konfirmasi = window.confirm(
          `⚠️ PERINGATAN KONFIRMASI: APAKAH YAKIN SUDAH SELESAI?\n\n` +
          `Anda akan menandai pengajuan visa ini sebagai SELESAI:\n` +
          `• Nama Pemohon : ${item.namaPemohon}\n` +
          `• No. Paspor   : ${item.noPaspor}\n` +
          `• No. WhatsApp : ${noWa}\n\n` +
          `⚠️ PENTING:\n` +
          `Setelah Anda klik OK, status akan diubah menjadi "Selesai" dan notifikasi resmi bahwa visa telah terbit akan OTOMATIS dikirimkan melalui WhatsApp ke nomor customer (${noWa}).\n\n` +
          `Apakah Anda yakin sudah selesai dan ingin melanjutkan kirim notifikasi WhatsApp ke customer?`
        );
        if (!konfirmasi) return;

        newStages.tglSelesai = today;
        if (!stages.isSampai) newStages.tglSampai = today;
        if (!stages.isProses) newStages.tglProses = today;
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
      } else {
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
        await supabase
          .from('pengajuan_visa')
          .update({
            tgl_sampai: newStages.tglSampai || null,
            tgl_proses: newStages.tglProses || null,
            tgl_selesai: newStages.tglSelesai || null,
            tgl_kirim: newStages.tglKirim || null,
            resi_pengiriman: newStages.noResi || null,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', numId);
      }
    } catch (e) {
      console.warn('Sync stage to Supabase failed:', e);
    }

    // Otomatis Kirim WhatsApp ke Customer jika Sampai (Tagihan Resmi) / Proses / Selesai
    if (shouldSendWASampai) {
      if (item.noTelp && item.noTelp.trim()) {
        const nominalTagihan = item.dibayarPemohon || 1650000;
        const pesanWASampai =
          `*KONFIRMASI BERKAS FISIK TIBA & TAGIHAN RESMI - MAPAHTRIP* 🇯🇵📦\n\n` +
          `Halo Sdr/i *${item.namaPemohon}*,\n\n` +
          `Kabar baik! Berkas fisik dan dokumen paspor asli Anda telah *SAMPAI DENGAN AMAN* di kantor operasional MapahTrip dan telah diverifikasi oleh tim kami. ✅\n\n` +
          `📋 *Rincian Pengajuan Visa:*\n` +
          `• No. Pengajuan: ${item.noPengajuan || '-'}\n` +
          `• Nama Pemohon: ${item.namaPemohon}\n` +
          `• No. Paspor: ${item.noPaspor}\n` +
          `• Program: ${item.program || 'Visa Jepang'}\n` +
          `• Tanggal Tiba: ${today}\n\n` +
          `💳 *Rincian Tagihan Pembayaran:*\n` +
          `• Total Biaya: *${formatRupiah(nominalTagihan)}*\n` +
          `• Status: *Menunggu Pembayaran*\n\n` +
          `Silakan lakukan transfer pembayaran ke Rekening Resmi berikut:\n\n` +
          `🏦 *Bank BTN (Bank Tabungan Negara)*\n` +
          `No. Rekening: *1190-0150-0015-870*\n` +
          `Atas Nama: *Tokyo Asia Connection*\n\n` +
          `⚠️ *Catatan Penting:*\n` +
          `Setelah transfer, mohon balas pesan WhatsApp ini dengan melampirkan screenshot / foto bukti transfer Anda agar dapat segera diverifikasi oleh tim finance dan berkas Anda langsung diproses ke Kedutaan / JVAC.\n\n` +
          `Terima kasih telah mempercayakan pengurusan visa Anda bersama MapahTrip! 🌸\n\n` +
          `Salam hangat,\n` +
          `*Tim Operasional MapahTrip*\n` +
          `Website: https://mapahtrip.com`;

        kirimPesanWA(item.noTelp, pesanWASampai)
          .then((res) => {
            console.log('[WA Gateway] Sukses kirim notifikasi berkas sampai & tagihan ke:', item.noTelp, res);
          })
          .catch((err) => {
            console.warn('[WA Gateway] Gagal kirim notifikasi berkas sampai:', err);
          });

        alert(
          `✅ STATUS BERKAS SAMPAI!\n\n` +
          `Pengajuan atas nama "${item.namaPemohon}" telah ditandai BERKAS SAMPAI.\n\n` +
          `Notifikasi WhatsApp konfirmasi berkas tiba beserta rincian tagihan & rekening resmi (Bank BTN - Tokyo Asia Connection) telah OTOMATIS dikirimkan ke nomor customer (${item.noTelp}).`
        );
      } else {
        alert(
          `✅ STATUS BERKAS SAMPAI!\n\n` +
          `Pengajuan atas nama "${item.namaPemohon}" telah ditandai BERKAS SAMPAI.\n\n` +
          `⚠️ Catatan: Nomor WhatsApp pemohon belum tersedia, sehingga pesan WA rincian tagihan tidak terkirim.`
        );
      }
    } else if (shouldSendWAProses) {
      if (item.noTelp && item.noTelp.trim()) {
        const pesanWAProses =
          `*PEMBERITAHUAN PENGAJUAN VISA DIPROSES - MAPAHTRIP* 🇯🇵📋\n\n` +
          `Halo Sdr/i *${item.namaPemohon}*,\n\n` +
          `Berkas permohonan Visa Jepang Anda saat ini telah *RESMI DIAJUKAN DAN SEDANG DIPROSES* oleh Kedutaan Besar Jepang / JVAC. 🏛️\n\n` +
          `📋 *Rincian Pengajuan:*\n` +
          `• No. Pengajuan: ${item.noPengajuan || '-'}\n` +
          `• Nama Pemohon: ${item.namaPemohon}\n` +
          `• No. Paspor: ${item.noPaspor}\n` +
          `• Program: ${item.program || 'Visa Jepang'}\n` +
          `• Tanggal Apply: ${today}\n` +
          `• Status: *Sedang Diproses Kedutaan / JVAC* ⏳\n\n` +
          `Estimasi waktu pemrosesan kedutaan sekitar 6 hari kerja. Kami akan segera mengabarkan Anda kembali begitu visa telah selesai dan terbit.\n\n` +
          `Terima kasih atas kepercayaannya bersama MapahTrip! 🌸\n\n` +
          `Salam hangat,\n` +
          `*Tim Operasional MapahTrip*\n` +
          `Website: https://mapahtrip.com`;

        kirimPesanWA(item.noTelp, pesanWAProses)
          .then((res) => {
            console.log('[WA Gateway] Sukses kirim notifikasi proses ke:', item.noTelp, res);
          })
          .catch((err) => {
            console.warn('[WA Gateway] Gagal kirim notifikasi proses:', err);
          });

        alert(
          `✅ STATUS VISA DIPROSES!\n\n` +
          `Pengajuan atas nama "${item.namaPemohon}" telah diubah menjadi SEDANG DIPROSES.\n\n` +
          `Notifikasi WhatsApp resmi telah otomatis dikirimkan ke nomor customer (${item.noTelp}).`
        );
      } else {
        alert(
          `✅ STATUS VISA DIPROSES!\n\n` +
          `Pengajuan atas nama "${item.namaPemohon}" telah diubah menjadi SEDANG DIPROSES.\n\n` +
          `⚠️ Catatan: Nomor WhatsApp pemohon belum tersedia, sehingga pesan WA tidak terkirim.`
        );
      }
    } else if (shouldSendWASelesai) {
      if (item.noTelp && item.noTelp.trim()) {
        const pesanWASelesai =
          `*PEMBERITAHUAN VISA JEPANG SELESAI - MAPAHTRIP* 🇯🇵✨\n\n` +
          `Halo Sdr/i *${item.namaPemohon}*,\n\n` +
          `Kabar gembira! Pengajuan Visa Jepang Anda telah *SELESAI* diproses oleh Kedutaan / JVAC dan visa telah resmi terbit. ✅\n\n` +
          `📋 *Rincian Pengajuan:*\n` +
          `• No. Pengajuan: ${item.noPengajuan || '-'}\n` +
          `• Nama Pemohon: ${item.namaPemohon}\n` +
          `• No. Paspor: ${item.noPaspor}\n` +
          `• Program: ${item.program || 'Visa Jepang'}\n` +
          `• Tanggal Selesai: ${today}\n` +
          `• Status: *SELESAI (Visa Terbit)*\n\n` +
          `📦 Paspor fisik dan stiker visa Anda sudah siap. Informasi penyerahan langsung atau nomor resi pengiriman akan kami informasikan lebih lanjut.\n\n` +
          `Terima kasih telah mempercayakan pengurusan visa Anda kepada MapahTrip! 🌸\n\n` +
          `Salam hangat,\n` +
          `*Tim Operasional MapahTrip*\n` +
          `Website: https://mapahtrip.com`;

        kirimPesanWA(item.noTelp, pesanWASelesai)
          .then((res) => {
            console.log('[WA Gateway] Sukses kirim notifikasi selesai ke:', item.noTelp, res);
          })
          .catch((err) => {
            console.warn('[WA Gateway] Gagal kirim notifikasi selesai:', err);
          });

        alert(
          `✅ STATUS VISA SELESAI!\n\n` +
          `Pengajuan atas nama "${item.namaPemohon}" telah diubah menjadi SELESAI.\n\n` +
          `Notifikasi WhatsApp resmi telah otomatis dikirimkan ke nomor customer (${item.noTelp}).`
        );
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

    if (
      existingResi.toLowerCase().includes('soetta') ||
      existingResi.toLowerCase().includes('bandara') ||
      existingResi.toLowerCase().includes('flight') ||
      existingResi.toLowerCase().includes('handover')
    ) {
      setKirimMetode('soetta');
      const flightMatch = existingResi.match(/(?:handover\s*soetta\s*t3\s*-\s*|flight\s*)([^(]+)/i);
      if (flightMatch && flightMatch[1]) {
        setSoettaFlight(flightMatch[1].trim());
      } else {
        setSoettaFlight('ANA NH836');
      }
      const timeMatch = existingResi.match(/\(([^)]+)\)/);
      if (timeMatch && timeMatch[1]) {
        setSoettaTanggalJam(timeMatch[1].trim());
      } else {
        setSoettaTanggalJam(`${getTodayFormatted()}, 21:00 WIB`);
      }
      const gateMatch = existingResi.match(/\[([^\]]+)\]/);
      if (gateMatch && gateMatch[1]) {
        setSoettaTitikTemu(gateMatch[1].trim());
      } else {
        setSoettaTitikTemu('Terminal 3 Keberangkatan Internasional Gate 1');
      }
    } else if (existingResi.toLowerCase().includes('kantor') || existingResi.toLowerCase().includes('langsung')) {
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
        `Website: https://mapahtrip.com`
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
    setIsSavingKirim(true);

    const today = getTodayFormatted();
    const stages = getCandidateStages(kirimModalItem);
    const newStages = { ...(localStageOverrides[kirimModalItem.id] || {}) };
    let resiFinal = '';

    if (kirimMetode === 'soetta') {
      const flightText = soettaFlight.trim() || 'Flight Internasional';
      const timeText = soettaTanggalJam.trim() ? ` (${soettaTanggalJam.trim()})` : '';
      const gateText = soettaTitikTemu.trim() ? ` [${soettaTitikTemu.trim()}]` : '';
      resiFinal = `Handover Soetta T3 - ${flightText}${timeText}${gateText}`;
    } else if (kirimMetode === 'ekspedisi') {
      const kurir = ekspedisiKurir.trim() || 'Ekspedisi';
      const noResi = ekspedisiResi.trim() || 'Resi Menyusul';
      resiFinal = `${kurir} - ${noResi}`;
    } else {
      const pengambil = kantorPengambil.trim() || 'Pemohon Sendiri';
      resiFinal = `Diambil Langsung di Kantor (${pengambil})`;
    }

    newStages.tglKirim = today;
    newStages.noResi = resiFinal;
    if (!stages.isSampai) newStages.tglSampai = today;
    if (!stages.isProses) newStages.tglProses = today;
    if (!stages.isSelesai) newStages.tglSelesai = today;
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
        tglKirim: newStages.tglKirim,
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
              tglKirim: today,
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
        await supabase
          .from('pengajuan_visa')
          .update({
            tgl_sampai: newStages.tglSampai || null,
            tgl_proses: newStages.tglProses || null,
            tgl_selesai: newStages.tglSelesai || null,
            tgl_kirim: today,
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
      `Pilih / ketik alasan penolakan:\n` +
      `1 = Ditolak di Awal (Berkas tidak lengkap / Waktu mepet)\n` +
      `2 = Ditolak oleh Konsulat Jepang\n\n` +
      `Ketik angka 1, 2, atau ketik alasan penolakan:`,
      '1'
    );

    if (inputAlasan === null) return;

    let alasanFinal = 'Ditolak di Awal (Berkas tidak lengkap / Waktu mepet)';
    const trimmed = inputAlasan.trim();
    if (trimmed === '1') {
      alasanFinal = 'Ditolak di Awal (Berkas tidak lengkap / Waktu mepet)';
    } else if (trimmed === '2') {
      alasanFinal = 'Ditolak oleh Konsulat Jepang';
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
        `Website: https://mapahtrip.com`;

      kirimPesanWA(noWa, pesanWATolak)
        .then((res) => {
          console.log('[WA Gateway] Sukses kirim notifikasi penolakan ke:', noWa, res);
        })
        .catch((err) => {
          console.warn('[WA Gateway] Gagal kirim notifikasi penolakan:', err);
        });

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

  // Daftar pemohon yang masuk ke wilayah konsulat yang dipilih / tugas staf
  const territoryList = useMemo(() => {
    return pengajuanList.filter((item) => {
      if (!isOwner && currentStaff?.konsjenTugas) {
        return currentStaff.konsjenTugas.includes(item.konsjen);
      }
      if (selectedKonsjen === 'Tugas Staf' && currentStaff?.konsjenTugas) {
        return currentStaff.konsjenTugas.includes(item.konsjen);
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

  const handleTogglePaymentStatus = async (item: Pengajuan) => {
    if (!isOwner) return;
    const current = item.statusPembayaran || 'Lunas';
    const nextStatus = current === 'Menunggu Pembayaran' ? 'Lunas' : 'Menunggu Pembayaran';

    const konfirm = window.confirm(
      `Ubah status pembayaran ${item.namaPemohon} menjadi "${nextStatus === 'Lunas' ? 'Lunas (100%)' : 'Menunggu Pembayaran'}"?`
    );
    if (!konfirm) return;

    try {
      await updatePengajuanPaymentInDB(item.id, {
        statusPembayaran: nextStatus,
      });
      const updated: Pengajuan = {
        ...item,
        statusPembayaran: nextStatus,
      };
      if (onUpdatePengajuan) {
        onUpdatePengajuan(updated);
      }
    } catch (err) {
      console.warn('Gagal update status pembayaran:', err);
      if (onUpdatePengajuan) {
        onUpdatePengajuan({ ...item, statusPembayaran: nextStatus });
      }
    }
  };

  const filteredData = pengajuanList.filter((item) => {
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

    // Konsjen filter (Jika staf login: kunci mutlak ke wilayah tugasnya)
    if (!isOwner && currentStaff?.konsjenTugas) {
      if (!currentStaff.konsjenTugas.includes(item.konsjen)) return false;
    } else if (selectedKonsjen === 'Tugas Staf' && currentStaff?.konsjenTugas) {
      if (!currentStaff.konsjenTugas.includes(item.konsjen)) return false;
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

  const getPaketBadge = (paket: string) => {
    switch (paket) {
      case 'Premium':
        return (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '9999px',
              background: '#FEF3C7',
              color: '#92400E',
              border: '1px solid #FDE68A',
              fontSize: '0.7rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
            }}
          >
            ★ Premium
          </span>
        );
      case 'TAC':
        return (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '9999px',
              background: '#EEF2FF',
              color: '#4338CA',
              border: '1px solid #E0E7FF',
              fontSize: '0.7rem',
              fontWeight: 700,
            }}
          >
            ⚡ TAC
          </span>
        );
      default:
        return (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '9999px',
              background: '#F1F5F9',
              color: '#475569',
              border: '1px solid #E2E8F0',
              fontSize: '0.7rem',
              fontWeight: 600,
            }}
          >
            {paket || 'Reguler'}
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header & Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>
              folder_shared
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary)' }}>
              Manajemen Dokumen &amp; Status
            </span>
          </div>
          <h1 className="font-serif" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--on-surface)' }}>
            Daftar Pengajuan Visa
          </h1>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9rem' }}>
            {selectedKonsjen === 'Tugas Staf' ? (
              <>Total <strong>{territoryList.length}</strong> pemohon di wilayah tugas Anda ({currentStaff?.konsjenTugas?.join(', ')}).</>
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
      {activeStatusTab !== 'Semua' && (
        <div
          style={{
            backgroundColor:
              activeStatusTab === 'Belum Diverifikasi' || activeStatusTab === 'Menunggu Verifikasi'
                ? '#FFF7ED'
                : activeStatusTab === 'Baru Sampai' || activeStatusTab === 'Sampai'
                  ? '#E0F2FE'
                  : activeStatusTab === 'Sedang Diproses' || activeStatusTab === 'Proses'
                    ? '#FEF3C7'
                    : activeStatusTab === 'Selesai' || activeStatusTab === 'Visa Terbit'
                      ? '#DCFCE7'
                      : activeStatusTab === 'Kirim' || activeStatusTab === 'Sudah Kirim'
                        ? '#F3E8FF'
                        : '#FEF2F2',
            border: `1px solid ${activeStatusTab === 'Belum Diverifikasi' || activeStatusTab === 'Menunggu Verifikasi'
                ? '#FFEDD5'
                : activeStatusTab === 'Baru Sampai' || activeStatusTab === 'Sampai'
                  ? '#BAE6FD'
                  : activeStatusTab === 'Sedang Diproses' || activeStatusTab === 'Proses'
                    ? '#FDE68A'
                    : activeStatusTab === 'Selesai' || activeStatusTab === 'Visa Terbit'
                      ? '#BBF7D0'
                      : activeStatusTab === 'Kirim' || activeStatusTab === 'Sudah Kirim'
                        ? '#DDD6FE'
                        : '#FECACA'
              }`,
            borderRadius: '12px',
            padding: '11px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            fontSize: '0.86rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: '22px',
                color:
                  activeStatusTab === 'Belum Diverifikasi' || activeStatusTab === 'Menunggu Verifikasi'
                    ? '#EA580C'
                    : activeStatusTab === 'Baru Sampai' || activeStatusTab === 'Sampai'
                      ? '#0284C7'
                      : activeStatusTab === 'Sedang Diproses' || activeStatusTab === 'Proses'
                        ? '#D97706'
                        : activeStatusTab === 'Selesai' || activeStatusTab === 'Visa Terbit'
                          ? '#16A34A'
                          : activeStatusTab === 'Kirim' || activeStatusTab === 'Sudah Kirim'
                            ? '#7C3AED'
                            : '#DC2626',
              }}
            >
              filter_alt
            </span>
            <div>
              <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.88rem' }}>
                Filter Tahap Aktif: {
                  activeStatusTab === 'Belum Diverifikasi' || activeStatusTab === 'Menunggu Verifikasi' ? 'Belum Diverifikasi' :
                    activeStatusTab === 'Baru Sampai' || activeStatusTab === 'Sampai' ? 'Baru Tahap Sampai (Berkas Masuk)' :
                      activeStatusTab === 'Sedang Diproses' || activeStatusTab === 'Proses' ? 'Sedang Diproses (JVAC)' :
                        activeStatusTab === 'Selesai' || activeStatusTab === 'Visa Terbit' ? 'Tahap Selesai (Visa Terbit)' :
                          activeStatusTab === 'Kirim' || activeStatusTab === 'Sudah Kirim' ? 'Sudah Kirim Paspor' : activeStatusTab
                }
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                Menampilkan <strong>{filteredData.length} pemohon</strong> pada tahapan ini di wilayah tugas Anda.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveStatusTab('Semua')}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#334155',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              flexShrink: 0,
            }}
          >
            <span>Tampilkan Semua ({stageCounts.total})</span>
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>close</span>
          </button>
        </div>
      )}

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
              <option value="Semua">Semua Status Bayar</option>
              <option value="Lunas">✓ Sudah Lunas ({stageCounts.lunas})</option>
              <option value="Menunggu Pembayaran">⏳ Belum Bayar ({stageCounts.belumBayar})</option>
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
              <th style={{ width: '38px', textAlign: 'center', padding: '10px 4px', backgroundColor: '#F8FAFC', borderBottom: '2px solid #CBD5E1', borderTopLeftRadius: '15px' }}>
                No.
              </th>
              <th style={{ minWidth: '150px', padding: '10px 8px', backgroundColor: '#F8FAFC', borderBottom: '2px solid #CBD5E1' }}>
                Pemohon &amp; Identitas
              </th>
              <th style={{ minWidth: '130px', padding: '10px 8px', backgroundColor: '#F8FAFC', borderBottom: '2px solid #CBD5E1' }}>
                Program &amp; Konsulat
              </th>
              <th style={{ width: '135px', minWidth: '125px', textAlign: 'center', padding: '10px 4px', backgroundColor: '#F8FAFC', borderBottom: '2px solid #CBD5E1' }}>
                Berkas
              </th>
              <th style={{ minWidth: '240px', textAlign: 'center', padding: '8px 4px', backgroundColor: '#F8FAFC', borderBottom: '2px solid #CBD5E1' }}>
                <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: '3px', fontSize: '0.74rem' }}>
                  Status Pengajuan
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '3px', fontSize: '0.65rem', color: '#475569', fontWeight: 700, width: '100%' }}>
                  <span style={{ backgroundColor: '#F1F5F9', padding: '2px 1px', borderRadius: '4px' }}>Sampai</span>
                  <span style={{ backgroundColor: '#F1F5F9', padding: '2px 1px', borderRadius: '4px' }}>Proses</span>
                  <span style={{ backgroundColor: '#F1F5F9', padding: '2px 1px', borderRadius: '4px' }}>Selesai</span>
                  <span style={{ backgroundColor: '#F1F5F9', padding: '2px 1px', borderRadius: '4px' }}>Kirim</span>
                </div>
              </th>
              {isOwner ? (
                <th
                  style={{
                    width: '140px',
                    minWidth: '135px',
                    textAlign: 'center',
                    padding: '10px 4px',
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
                    width: '135px',
                    minWidth: '130px',
                    textAlign: 'center',
                    padding: '10px 4px',
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
                  width: '70px',
                  minWidth: '65px',
                  textAlign: 'center',
                  padding: '10px 4px',
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
                const stageItems = [
                  { key: 'sampai' as const, label: 'Sampai', ok: st.isSampai, date: st.tglSampai, color: '#0284C7', bg: '#E0F2FE', border: '#BAE6FD' },
                  { key: 'proses' as const, label: 'Proses', ok: st.isProses, date: st.tglProses, color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
                  { key: 'selesai' as const, label: 'Selesai', ok: st.isSelesai, date: st.tglSelesai, color: '#16A34A', bg: '#DCFCE7', border: '#BBF7D0' },
                  { key: 'kirim' as const, label: 'Kirim', ok: st.isKirim, date: st.tglKirim, color: '#7C3AED', bg: '#F3E8FF', border: '#DDD6FE' },
                ];

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
                    {/* No. Urut (Data terbaru di nomor 1) */}
                    <td style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 800, color: '#64748B', fontSize: '0.78rem' }}>
                      {(activePage - 1) * pageSize + index + 1}
                    </td>

                    {/* 1. Pemohon & Identitas */}
                    <td style={{ padding: '8px 6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {row.fotoBase64 ? (
                          <img
                            src={row.fotoBase64}
                            alt={row.namaPemohon}
                            onClick={() => setSelectedPreviewImage({ url: row.fotoBase64!, title: `Pasfoto: ${row.namaPemohon}` })}
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '2px solid #16A34A',
                              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                              cursor: 'pointer',
                              flexShrink: 0,
                            }}
                            title="Klik untuk melihat pasfoto ukuran penuh"
                          />
                        ) : (
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #2b68e0, #004fc0)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.8rem',
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
                        <div>
                          <div
                            style={{ fontWeight: 700, color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem' }}
                            onClick={() => onSelectPengajuan(row.id)}
                            title="Klik untuk lihat detail"
                          >
                            {row.namaPemohon}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748B', display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                              {showMaskedPaspor ? row.maskedPaspor : row.noPaspor}
                            </span>
                            <span>•</span>
                            <span>{row.noPengajuan}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                            {row.noTelp && (
                              <span style={{ fontSize: '0.72rem', color: '#16A34A', fontWeight: 600 }}>
                                WA: {row.noTelp}
                              </span>
                            )}
                            {row.fotoBase64 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPreviewImage({ url: row.fotoBase64!, title: `Pasfoto: ${row.namaPemohon}` });
                                }}
                                style={{
                                  background: '#DCFCE7',
                                  color: '#15803D',
                                  border: '1px solid #BBF7D0',
                                  borderRadius: '4px',
                                  padding: '1px 5px',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                }}
                                title="Lihat Foto Penuh"
                              >
                                <span>📷 Pasfoto</span>
                              </button>
                            )}
                            {row.uploadedDocs && Object.keys(row.uploadedDocs).length > 0 && (
                              <span
                                style={{
                                  background: '#EFF6FF',
                                  color: '#1E40AF',
                                  border: '1px solid #DBEAFE',
                                  borderRadius: '4px',
                                  padding: '1px 5px',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                }}
                              >
                                📁 {Object.keys(row.uploadedDocs).length} Berkas
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Program, Paket & Konsulat (Digabung Rapi & Hemat Ruang) */}
                    <td style={{ padding: '8px 6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.80rem', color: '#0F172A' }}>{row.program}</span>
                        {getPaketBadge(row.paket)}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: '#0F172A', fontWeight: 600 }}>📍 {row.konsjen}</span>
                        <span>•</span>
                        <span>PIC: {row.staffPic.split(' ')[0]}</span>
                      </div>
                    </td>

                    {/* 3. Berkas Fisik (Checklist Dots Ringkas) */}
                    <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                      {(() => {
                        const berkasList = [
                          { label: 'Form', ok: Boolean(row.berkas?.formVisa || row.uploadedDocs?.formVisa) },
                          { label: 'Paspor', ok: Boolean(row.berkas?.pasporFisik || row.uploadedDocs?.pasporFisik) },
                          { label: 'Foto', ok: Boolean(row.berkas?.foto || row.fotoBase64 || row.uploadedDocs?.foto) },
                          { label: 'KTP', ok: Boolean(row.berkas?.ktp || row.uploadedDocs?.ktp) },
                          { label: 'COE', ok: Boolean(row.berkas?.coe || row.uploadedDocs?.coe) },
                          { label: 'E-KTLN', ok: Boolean(row.berkas?.ektln || row.uploadedDocs?.ektln) },
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
                                    width: '15px',
                                    height: '15px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '8px',
                                    fontWeight: 800,
                                    background: b.ok ? '#DCFCE7' : '#FEE2E2',
                                    color: b.ok ? '#16A34A' : '#EF4444',
                                    border: `1px solid ${b.ok ? '#BBF7D0' : '#FECACA'}`,
                                  }}
                                >
                                  {b.ok ? '✓' : '!'}
                                </span>
                              ))}
                            </div>

                            {/* Status Kelengkapan & Tombol Aksi */}
                            {isAllComplete ? (
                              <span
                                style={{
                                  fontSize: '0.62rem',
                                  fontWeight: 800,
                                  color: '#15803D',
                                  backgroundColor: '#DCFCE7',
                                  border: '1px solid #BBF7D0',
                                  borderRadius: '4px',
                                  padding: '1px 6px',
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
                                    fontWeight: 800,
                                    color: '#B91C1C',
                                    backgroundColor: '#FEF2F2',
                                    border: '1px solid #FECACA',
                                    borderRadius: '4px',
                                    padding: '1px 5px',
                                    whiteSpace: 'nowrap',
                                    marginTop: '1px',
                                  }}
                                >
                                  Kurang {missingCount} Berkas
                                </span>

                                {/* Tombol Aksi Cepat: Minta via WA & Salin Link */}
                                <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', marginTop: '2px', flexWrap: 'wrap' }}>
                                  {row.noTelp && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleSendCustomerWALink(e, row)}
                                      style={{
                                        padding: '2px 5px',
                                        fontSize: '0.62rem',
                                        fontWeight: 700,
                                        borderRadius: '4px',
                                        backgroundColor: '#F0FDF4',
                                        border: '1px solid #86EFAC',
                                        color: '#15803D',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '2px',
                                        whiteSpace: 'nowrap',
                                      }}
                                      title="Kirim pesan WhatsApp pengingat berkas yang kurang & tautan upload mandiri untuk customer"
                                    >
                                      <span>📲</span>
                                      <span>Minta via WA</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => handleCopyCustomerLink(e, row)}
                                    style={{
                                      padding: '2px 5px',
                                      fontSize: '0.62rem',
                                      fontWeight: 700,
                                      borderRadius: '4px',
                                      backgroundColor: copiedLinkRowId === row.id ? '#DCFCE7' : '#EFF6FF',
                                      border: `1px solid ${copiedLinkRowId === row.id ? '#86EFAC' : '#BFDBFE'}`,
                                      color: copiedLinkRowId === row.id ? '#15803D' : '#1D4ED8',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '2px',
                                      whiteSpace: 'nowrap',
                                    }}
                                    title="Salin tautan upload mandiri untuk customer"
                                  >
                                    <span>{copiedLinkRowId === row.id ? '✓' : '🔗'}</span>
                                    <span>{copiedLinkRowId === row.id ? 'Tersalin' : 'Salin Link'}</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </td>

                    {/* 4. Status Pengajuan 4 Tahapan Ceklis: Sampai | Proses | Selesai | Kirim */}
                    <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                      {st.currentStatus === 'Ditolak' ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            backgroundColor: '#FEF2F2',
                            border: '1px solid #FECACA',
                            borderRadius: '8px',
                            padding: '6px 8px',
                            color: '#B91C1C',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            maxWidth: '260px',
                            margin: '0 auto',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#EF4444' }}>
                            cancel
                          </span>
                          <span>DITOLAK: {st.alasanPenolakan || 'Berkas Tidak Lengkap / Waktu Mepet'}</span>
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '3px', width: '100%' }}>
                          {stageItems.map((s) => (
                            <div
                              key={s.key}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                backgroundColor: s.ok ? s.bg : '#F8FAFC',
                                border: `1px solid ${s.ok ? s.border : '#E2E8F0'}`,
                                borderRadius: '6px',
                                padding: '3px 2px',
                                transition: 'all 0.15s ease',
                                minWidth: 0,
                                overflow: 'hidden',
                                boxSizing: 'border-box',
                              }}
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleStage(row, s.key);
                                }}
                                title={`Klik untuk ${s.ok ? 'membatalkan' : 'menceklis'} tahap ${s.label}`}
                                style={{
                                  width: '100%',
                                  border: 'none',
                                  background: 'transparent',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '2px',
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  color: s.ok ? s.color : '#94A3B8',
                                  padding: '1px 0',
                                }}
                              >
                                <span>{s.ok ? '✓' : '○'}</span>
                                <span>{s.label}</span>
                              </button>
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (s.ok) handleEditStageDate(row, s.key, s.date || '');
                                }}
                                title={s.ok ? 'Klik untuk ubah tanggal' : ''}
                                style={{
                                  fontSize: '0.65rem',
                                  fontFamily: 'monospace',
                                  color: s.ok ? s.color : '#CBD5E1',
                                  fontWeight: s.ok ? 700 : 500,
                                  cursor: s.ok ? 'pointer' : 'default',
                                  textDecoration: s.ok ? 'underline dotted' : 'none',
                                  lineHeight: 1.1,
                                  marginTop: '1px',
                                }}
                              >
                                {s.ok ? (s.date || getTodayFormatted()) : '-'}
                              </span>
                              {/* Jika tahap Kirim aktif, tampilkan nomor resi / status pengiriman di dalam kotak */}
                              {s.key === 'kirim' && st.noResi && (
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openKirimModal(row);
                                  }}
                                  style={{
                                    fontSize: '0.62rem',
                                    fontWeight: 700,
                                    color: (st.noResi.toLowerCase().includes('soetta') || st.noResi.toLowerCase().includes('bandara') || st.noResi.toLowerCase().includes('flight')) ? '#1E40AF' : '#6D28D9',
                                    backgroundColor: (st.noResi.toLowerCase().includes('soetta') || st.noResi.toLowerCase().includes('bandara') || st.noResi.toLowerCase().includes('flight')) ? '#EFF6FF' : '#EDE9FE',
                                    border: `1px solid ${(st.noResi.toLowerCase().includes('soetta') || st.noResi.toLowerCase().includes('bandara') || st.noResi.toLowerCase().includes('flight')) ? '#BFDBFE' : '#DDD6FE'}`,
                                    padding: '0 4px',
                                    borderRadius: '3px',
                                    marginTop: '2px',
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
                                  {(st.noResi.toLowerCase().includes('soetta') || st.noResi.toLowerCase().includes('bandara') || st.noResi.toLowerCase().includes('flight')) ? '✈️' : '📦'} {st.noResi}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* 5. Kolom Finansial & Status Bayar: Mode Owner (Finansial & Margin) vs Mode Staf (Indikator Kesiapan Kerja) */}
                    {isOwner ? (
                      <td style={{ width: '140px', minWidth: '135px', padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        {(() => {
                          const isWaitingWithStruk = row.statusPembayaran === 'Menunggu Pembayaran' && Boolean(row.buktiBayarPemohon);
                          return (
                            <div
                              onClick={() => handleTogglePaymentStatus(row)}
                              className={isWaitingWithStruk ? 'box-struk-waiting' : undefined}
                              style={{
                                backgroundColor: isWaitingWithStruk ? '#FFFBEB' : (row.statusPembayaran === 'Menunggu Pembayaran' ? '#FFFBEB' : '#F0FDF4'),
                                border: isWaitingWithStruk ? '1.5px solid #F59E0B' : `1.5px solid ${row.statusPembayaran === 'Menunggu Pembayaran' ? '#FCD34D' : '#86EFAC'}`,
                                borderRadius: '8px',
                                padding: '4px 6px',
                                display: 'inline-flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '2px',
                                width: '100%',
                                maxWidth: '120px',
                                boxSizing: 'border-box',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                boxShadow: isWaitingWithStruk ? '0 0 10px rgba(245, 158, 11, 0.25)' : (row.statusPembayaran === 'Menunggu Pembayaran' ? '0 1px 3px rgba(245, 158, 11, 0.08)' : '0 1px 3px rgba(16, 185, 129, 0.08)'),
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.08)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = isWaitingWithStruk ? '0 0 10px rgba(245, 158, 11, 0.25)' : (row.statusPembayaran === 'Menunggu Pembayaran' ? '0 1px 3px rgba(245, 158, 11, 0.08)' : '0 1px 3px rgba(16, 185, 129, 0.08)');
                              }}
                              title={
                                isWaitingWithStruk
                                  ? 'Customer telah mengunggah bukti struk transfer! Klik untuk verifikasi & ubah status jadi Lunas'
                                  : 'Klik untuk ubah status pembayaran pemohon'
                              }
                            >
                              {/* Status Indikator Bulat Halus + Teks */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span
                                  style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    backgroundColor: isWaitingWithStruk ? '#EA580C' : (row.statusPembayaran === 'Menunggu Pembayaran' ? '#D97706' : '#16A34A'),
                                  }}
                                />
                                <span
                                  style={{
                                    fontSize: '0.67rem',
                                    fontWeight: 800,
                                    color: isWaitingWithStruk ? '#C2410C' : (row.statusPembayaran === 'Menunggu Pembayaran' ? '#92400E' : '#14532D'),
                                    letterSpacing: '0.01em',
                                  }}
                                >
                                  {isWaitingWithStruk ? '⚡ Struk' : (row.statusPembayaran === 'Menunggu Pembayaran' ? 'Menunggu Bayar' : 'Lunas (100%)')}
                                </span>
                              </div>

                              {/* Fee Bersih Amount */}
                              <div
                                style={{
                                  fontFamily: 'monospace',
                                  fontWeight: 800,
                                  fontSize: '0.80rem',
                                  color: '#0F172A',
                                  marginTop: '1px',
                                }}
                              >
                                {formatRupiah(row.feeBersih)}
                              </div>

                              {/* Struk Badge or Subtle Label */}
                              {row.buktiBayarPemohon ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPreviewImage({ url: row.buktiBayarPemohon!, title: `Bukti Struk Transfer: ${row.namaPemohon}` });
                                  }}
                                  style={{
                                    background: isWaitingWithStruk ? '#FEF3C7' : '#EFF6FF',
                                    color: isWaitingWithStruk ? '#B45309' : '#1D4ED8',
                                    border: isWaitingWithStruk ? '1px solid #FCD34D' : '1px solid #BFDBFE',
                                    borderRadius: '4px',
                                    padding: '1px 5px',
                                    fontSize: '0.60rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '2px',
                                    marginTop: '1px',
                                  }}
                                  title="Klik untuk melihat foto struk transfer"
                                >
                                  <span>📄</span>
                                  <span>Lihat Struk</span>
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.60rem', color: '#64748B', fontWeight: 600 }}>
                                  Fee Bersih
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                    ) : (
                      <td style={{ width: '135px', minWidth: '130px', padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        {(() => {
                          const isLunas = row.statusPembayaran === 'Lunas';
                          const hasStruk = Boolean(row.buktiBayarPemohon);

                          if (isLunas) {
                            return (
                              <div
                                style={{
                                  backgroundColor: '#F0FDF4',
                                  border: '1.5px solid #86EFAC',
                                  borderRadius: '8px',
                                  padding: '4px 6px',
                                  display: 'inline-flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '2px',
                                  width: '100%',
                                  maxWidth: '115px',
                                  boxSizing: 'border-box',
                                }}
                                title="Pembayaran telah lunas & terverifikasi. Berkas aman diajukan ke JVAC."
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16A34A', display: 'inline-block' }} />
                                  <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#15803D' }}>
                                    LUNAS
                                  </span>
                                </div>
                                <span style={{ fontSize: '0.62rem', color: '#16A34A', fontWeight: 700 }}>
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
                                padding: '4px 6px',
                                display: 'inline-flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '2px',
                                width: '100%',
                                maxWidth: '115px',
                                boxSizing: 'border-box',
                              }}
                              title="Customer belum lunas. Tahan pengajuan berkas ke JVAC sampai status diverifikasi oleh Owner."
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#D97706', display: 'inline-block' }} />
                                <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#B45309' }}>
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
                                    padding: '1px 5px',
                                    fontSize: '0.60rem',
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
                                <span style={{ fontSize: '0.60rem', color: '#DC2626', fontWeight: 700 }}>
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
                        width: '76px',
                        padding: '6px 6px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center', width: '100%' }}>
                        <button
                          className="btn btn-primary"
                          onClick={() => onSelectPengajuan(row.id)}
                          style={{
                            padding: '3px 6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            boxShadow: '0 1px 3px rgba(37, 99, 235, 0.2)',
                            whiteSpace: 'nowrap',
                            width: '100%',
                            justifyContent: 'center',
                          }}
                          title="Buka rincian lengkap pemohon"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                            visibility
                          </span>
                          <span>Rincian</span>
                        </button>

                        {st.currentStatus === 'Ditolak' ? (
                          <button
                            type="button"
                            onClick={() => handleTolakPengajuan(row)}
                            style={{
                              padding: '2px 6px',
                              fontSize: '0.68rem',
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
                            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                              refresh
                            </span>
                            <span>Pulihkan</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleTolakPengajuan(row)}
                            style={{
                              padding: '2px 6px',
                              fontSize: '0.68rem',
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
                            title="Tolak berkas di awal atau karena ditolak konsulat"
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEE2E2')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                              close
                            </span>
                            <span>Tolak</span>
                          </button>
                        )}
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
            const stageItems = [
              { key: 'sampai' as const, label: 'Sampai', ok: st.isSampai, date: st.tglSampai, color: '#0284C7', bg: '#E0F2FE', border: '#BAE6FD' },
              { key: 'proses' as const, label: 'Proses', ok: st.isProses, date: st.tglProses, color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
              { key: 'selesai' as const, label: 'Selesai', ok: st.isSelesai, date: st.tglSelesai, color: '#16A34A', bg: '#DCFCE7', border: '#BBF7D0' },
              { key: 'kirim' as const, label: 'Kirim', ok: st.isKirim, date: st.tglKirim, color: '#7C3AED', bg: '#F3E8FF', border: '#DDD6FE' },
            ];

            return (
              <div
                key={`mob-${row.id}`}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {/* Header: No Urut, ID Pengajuan, Program & Paket */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748B', backgroundColor: '#F1F5F9', padding: '2px 7px', borderRadius: '6px' }}>
                      #{(activePage - 1) * pageSize + index + 1}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', fontFamily: 'monospace' }}>
                      {row.noPengajuan}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.75rem', color: '#1E40AF', backgroundColor: '#EFF6FF', padding: '2px 8px', borderRadius: '6px' }}>
                      {row.program}
                    </span>
                    {getPaketBadge(row.paket)}
                  </div>
                </div>

                {/* Status Pembayaran & Ringkasan Fee */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                    backgroundColor: row.statusPembayaran === 'Menunggu Pembayaran' ? '#FFFBEB' : '#F0FDF4',
                    border: `1px solid ${row.statusPembayaran === 'Menunggu Pembayaran' ? '#FDE68A' : '#BBF7D0'}`,
                    borderRadius: '8px',
                    padding: '8px 12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.70rem', color: '#64748B', fontWeight: 600 }}>Pembayaran:</span>
                    <button
                      type="button"
                      onClick={() => isOwner && handleTogglePaymentStatus(row)}
                      disabled={!isOwner}
                      style={{ border: 'none', background: 'none', padding: 0, cursor: isOwner ? 'pointer' : 'default' }}
                      title={isOwner ? "Klik untuk ubah status pembayaran" : undefined}
                    >
                      {row.statusPembayaran === 'Menunggu Pembayaran' ? (
                        <span style={{ backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D', padding: '2px 7px', borderRadius: '5px', fontSize: '0.70rem', fontWeight: 800 }}>
                          ⏳ Menunggu Bayar {isOwner && '✎'}
                        </span>
                      ) : (
                        <span style={{ backgroundColor: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', padding: '2px 7px', borderRadius: '5px', fontSize: '0.70rem', fontWeight: 800 }}>
                          ✓ Lunas (100%) {isOwner && '✎'}
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
                        style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', borderRadius: '4px', padding: '1px 5px', fontSize: '0.64rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        📄 Struk
                      </button>
                    )}
                  </div>

                  {isOwner && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.68rem', color: '#166534', fontWeight: 700 }}>Fee Bersih:</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#15803D' }}>
                        {formatRupiah(row.feeBersih || 0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Pemohon Info: Foto/Inisial, Nama, Paspor, WA, Konsulat */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  {row.fotoBase64 ? (
                    <img
                      src={row.fotoBase64}
                      alt={row.namaPemohon}
                      onClick={() => setSelectedPreviewImage({ url: row.fotoBase64!, title: `Pasfoto: ${row.namaPemohon}` })}
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid #16A34A',
                        boxShadow: '0 2px 6px rgba(22, 163, 74, 0.2)',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                      title="Klik untuk melihat foto ukuran penuh"
                    />
                  ) : (
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #2b68e0, #004fc0)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.88rem',
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
                    <div
                      style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.94rem', lineHeight: 1.3, cursor: 'pointer' }}
                      onClick={() => onSelectPengajuan(row.id)}
                    >
                      {row.namaPemohon}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: '3px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0F172A' }}>
                        {showMaskedPaspor ? row.maskedPaspor : row.noPaspor}
                      </span>
                    </div>
                    {row.noTelp && (
                      <div style={{ fontSize: '0.74rem', color: '#16A34A', fontWeight: 600, marginTop: '2px' }}>
                        WA: {row.noTelp}
                      </div>
                    )}
                    <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontWeight: 600, color: '#0F172A' }}>📍 {row.konsjen}</span>
                      <span>•</span>
                      <span>PIC: {row.staffPic}</span>
                    </div>
                  </div>
                </div>

                {/* Berkas Fisik Checklist (Option 1 Rapi Bersih Mobile) */}
                {(() => {
                  const berkasList = [
                    { label: 'Formulir Visa', short: 'Form', ok: Boolean(row.berkas?.formVisa || row.uploadedDocs?.formVisa) },
                    { label: 'Paspor Fisik', short: 'Paspor', ok: Boolean(row.berkas?.pasporFisik || row.uploadedDocs?.pasporFisik) },
                    { label: 'Pasfoto 3.5x4.5', short: 'Foto', ok: Boolean(row.berkas?.foto || row.fotoBase64 || row.uploadedDocs?.foto) },
                    { label: 'KTP Asli / Scan', short: 'KTP', ok: Boolean(row.berkas?.ktp || row.uploadedDocs?.ktp) },
                    { label: 'COE Dokumen', short: 'COE', ok: Boolean(row.berkas?.coe || row.uploadedDocs?.coe) },
                    { label: 'E-KTLN Dokumen', short: 'E-KTLN', ok: Boolean(row.berkas?.ektln || row.uploadedDocs?.ektln) },
                  ];
                  const completeCount = berkasList.filter((b) => b.ok).length;
                  const isAllComplete = completeCount === berkasList.length;
                  const missingCount = berkasList.length - completeCount;

                  return (
                    <div
                      style={{
                        backgroundColor: '#F8FAFC',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '8px',
                        }}
                      >
                        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569' }}>
                          Kelengkapan Dokumen Fisik:
                        </span>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            color: isAllComplete ? '#15803D' : '#B91C1C',
                            backgroundColor: isAllComplete ? '#DCFCE7' : '#FEE2E2',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            border: `1px solid ${isAllComplete ? '#BBF7D0' : '#FECACA'}`,
                          }}
                        >
                          {isAllComplete ? '✓ Lengkap (6/6)' : `Kurang ${missingCount} Dokumen`}
                        </span>
                      </div>

                      {/* 6 Circle Dots with tooltips */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px',
                          padding: '6px 8px',
                          backgroundColor: '#FFFFFF',
                          borderRadius: '8px',
                          border: '1px solid #EEF2F6',
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
                              gap: '3px',
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
                                background: b.ok ? '#DCFCE7' : '#FEE2E2',
                                color: b.ok ? '#16A34A' : '#EF4444',
                                border: `1px solid ${b.ok ? '#BBF7D0' : '#FECACA'}`,
                              }}
                            >
                              {b.ok ? '✓' : '!'}
                            </span>
                            <span
                              style={{
                                fontSize: '0.62rem',
                                color: b.ok ? '#15803D' : '#64748B',
                                fontWeight: b.ok ? 700 : 500,
                              }}
                            >
                              {b.short}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Tombol Aksi Cepat jika ada berkas kurang */}
                      {!isAllComplete && (
                        <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                          {row.noTelp && (
                            <button
                              type="button"
                              onClick={(e) => handleSendCustomerWALink(e, row)}
                              style={{
                                flex: 1,
                                padding: '6px 8px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                borderRadius: '6px',
                                backgroundColor: '#F0FDF4',
                                border: '1px solid #86EFAC',
                                color: '#15803D',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                              }}
                              title="Kirim pesan WhatsApp pengingat berkas yang kurang & tautan upload mandiri untuk customer"
                            >
                              <span>📲</span>
                              <span>Minta via WA</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleCopyCustomerLink(e, row)}
                            style={{
                              flex: 1,
                              padding: '6px 8px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              borderRadius: '6px',
                              backgroundColor: copiedLinkRowId === row.id ? '#DCFCE7' : '#EFF6FF',
                              border: `1px solid ${copiedLinkRowId === row.id ? '#86EFAC' : '#BFDBFE'}`,
                              color: copiedLinkRowId === row.id ? '#15803D' : '#1D4ED8',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                            }}
                            title="Salin tautan upload mandiri untuk customer"
                          >
                            <span>{copiedLinkRowId === row.id ? '✓' : '🔗'}</span>
                            <span>{copiedLinkRowId === row.id ? 'Link Tersalin' : 'Salin Link Upload'}</span>
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
                        gap: '6px',
                        backgroundColor: '#FEF2F2',
                        border: '1px solid #FECACA',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: '#B91C1C',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#EF4444' }}>cancel</span>
                      <span>DITOLAK: {st.alasanPenolakan || 'Berkas Tidak Lengkap'}</span>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                      {stageItems.map((s, sIdx) => (
                        <div
                          key={s.key}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            backgroundColor: s.ok ? s.bg : '#F8FAFC',
                            border: `1px solid ${s.ok ? s.border : '#E2E8F0'}`,
                            borderRadius: '10px',
                            padding: '8px 10px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleStage(row, s.key);
                              }}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                color: s.ok ? s.color : '#64748B',
                                padding: 0,
                              }}
                            >
                              <span
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '50%',
                                  backgroundColor: s.ok ? s.color : '#CBD5E1',
                                  color: '#FFFFFF',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                }}
                              >
                                {s.ok ? '✓' : sIdx + 1}
                              </span>
                              <span>{s.label}</span>
                            </button>

                            {s.ok && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditStageDate(row, s.key, s.date || '');
                                }}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  cursor: 'pointer',
                                  fontSize: '0.68rem',
                                  color: s.color,
                                  padding: '2px',
                                  borderRadius: '4px',
                                }}
                                title="Ubah tanggal"
                              >
                                ✎
                              </button>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', minHeight: '18px' }}>
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                if (s.ok) handleEditStageDate(row, s.key, s.date || '');
                              }}
                              style={{
                                fontSize: '0.68rem',
                                fontFamily: 'monospace',
                                color: s.ok ? s.color : '#94A3B8',
                                fontWeight: s.ok ? 700 : 500,
                                cursor: s.ok ? 'pointer' : 'default',
                              }}
                            >
                              {s.ok ? (s.date || getTodayFormatted()) : 'Belum'}
                            </span>

                            {s.key === 'kirim' && st.noResi && (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openKirimModal(row);
                                }}
                                style={{
                                  fontSize: '0.62rem',
                                  fontWeight: 700,
                                  color: (st.noResi.toLowerCase().includes('soetta') || st.noResi.toLowerCase().includes('bandara')) ? '#1E40AF' : '#6D28D9',
                                  backgroundColor: (st.noResi.toLowerCase().includes('soetta') || st.noResi.toLowerCase().includes('bandara')) ? '#EFF6FF' : '#EDE9FE',
                                  border: `1px solid ${(st.noResi.toLowerCase().includes('soetta') || st.noResi.toLowerCase().includes('bandara')) ? '#BFDBFE' : '#DDD6FE'}`,
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  maxWidth: '85px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={st.noResi}
                              >
                                ✈️ {st.noResi}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tombol Aksi: Buka Rincian & Tolak/Pulihkan */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px', paddingTop: '8px', borderTop: '1px solid #F1F5F9' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => onSelectPengajuan(row.id)}
                    style={{
                      flex: 2,
                      padding: '8px 12px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>visibility</span>
                    <span>Buka Rincian</span>
                  </button>

                  {st.currentStatus === 'Ditolak' ? (
                    <button
                      type="button"
                      onClick={() => handleTolakPengajuan(row)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        fontSize: '0.78rem',
                        borderRadius: '8px',
                        backgroundColor: '#F1F5F9',
                        border: '1px solid #CBD5E1',
                        color: '#334155',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span>
                      <span>Pulihkan</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleTolakPengajuan(row)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        fontSize: '0.78rem',
                        borderRadius: '8px',
                        backgroundColor: '#FEF2F2',
                        border: '1px solid #FECACA',
                        color: '#DC2626',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                      <span>Tolak</span>
                    </button>
                  )}
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
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Tanggal &amp; Waktu Serah Terima / Flight:
                    </label>
                    <input
                      type="text"
                      value={soettaTanggalJam}
                      onChange={(e) => setSoettaTanggalJam(e.target.value)}
                      placeholder="Contoh: 28/10/2026, 21:00 WIB"
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
    </div>
  );
};
