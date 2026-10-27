import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import type { Pengajuan, StatusPengajuan } from '../types';
import { supabase } from '../lib/supabase';
import { kirimPesanWA } from '../whatsapp';

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
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [showMaskedPaspor, setShowMaskedPaspor] = useState<boolean>(true);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<{ url: string; title: string } | null>(null);

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

  const handleToggleStage = async (
    item: Pengajuan,
    stage: 'sampai' | 'proses' | 'selesai' | 'kirim'
  ) => {
    const stages = getCandidateStages(item);
    const today = getTodayFormatted();
    const newStages = { ...(localStageOverrides[item.id] || {}) };
    let newStatus: StatusPengajuan = stages.currentStatus;
    let shouldSendWAProses = false;
    let shouldSendWASelesai = false;
    let shouldSendWAKirim = false;

    if (stage === 'sampai') {
      if (stages.isSampai) {
        newStages.tglSampai = '';
      } else {
        newStages.tglSampai = today;
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
        const konfirmasi = window.confirm(
          `⚠️ PERINGATAN KONFIRMASI: APAKAH YAKIN SUDAH DIPROSES?\n\n` +
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
        const inputResi = window.prompt(
          `📦 Ceklis Pengiriman Paspor untuk ${item.namaPemohon}:\n\nMasukkan Nomor Resi Ekspedisi (JNE/J&T/TIKI/dll) atau ketik "Diambil Langsung":`,
          item.noResi || ''
        );
        if (inputResi === null) return;

        const resiFinal = inputResi.trim() ? inputResi.trim() : 'Diambil Langsung';
        newStages.tglKirim = today;
        newStages.noResi = resiFinal;
        if (!stages.isSampai) newStages.tglSampai = today;
        if (!stages.isProses) newStages.tglProses = today;
        if (!stages.isSelesai) newStages.tglSelesai = today;
        newStatus = 'Selesai';
        shouldSendWAKirim = true;
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
      } catch {}
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
    } catch {}

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

    // Otomatis Kirim WhatsApp ke Customer jika Proses / Selesai / Kirim
    if (shouldSendWAProses) {
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
    } else if (shouldSendWAKirim) {
      if (item.noTelp && item.noTelp.trim()) {
        const pesanWAKirim =
          `*PEMBERITAHUAN PENGIRIMAN PASPOR - MAPAHTRIP* 📦✈️\n\n` +
          `Halo Sdr/i *${item.namaPemohon}*,\n\n` +
          `Paspor dan berkas Visa Jepang Anda yang telah selesai kini telah dikirimkan / disiapkan untuk penyerahan.\n\n` +
          `📋 *Rincian Pengiriman:*\n` +
          `• No. Pengajuan: ${item.noPengajuan || '-'}\n` +
          `• Nama Pemohon: ${item.namaPemohon}\n` +
          `• No. Paspor: ${item.noPaspor}\n` +
          `• Status / Resi: *${newStages.noResi || 'Diambil Langsung'}*\n` +
          `• Tanggal Kirim: ${today}\n\n` +
          `Silakan simpan nomor resi ini untuk melacak paket Anda. Semoga perjalanan Anda ke Jepang menyenangkan dan berkesan! 🇯🇵🎌\n\n` +
          `Salam hangat,\n` +
          `*Tim Operasional MapahTrip*`;

        kirimPesanWA(item.noTelp, pesanWAKirim)
          .then((res) => {
            console.log('[WA Gateway] Sukses kirim notifikasi kirim ke:', item.noTelp, res);
          })
          .catch((err) => {
            console.warn('[WA Gateway] Gagal kirim notifikasi kirim:', err);
          });

        alert(
          `📦 STATUS PENGIRIMAN DISIMPAN!\n\n` +
          `Resi/Status: "${newStages.noResi}" berhasil disimpan.\n` +
          `Notifikasi WhatsApp pengiriman telah dikirimkan ke ${item.namaPemohon} (${item.noTelp}).`
        );
      }
    }
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
      } catch {}
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
        } catch {}
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
      } catch {}
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

    alert(
      `❌ Pengajuan "${item.namaPemohon}" berhasil ditandai DITOLAK.\nAlasan: ${alasanFinal}`
    );
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

    territoryList.forEach((item) => {
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
      total: territoryList.length,
    };
  }, [territoryList, localStageOverrides]);

  const filteredData = pengajuanList.filter((item) => {
    const candidateStages = getCandidateStages(item);

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

  const formatRupiah = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
          gap: '10px',
        }}
      >

        {/* Card 1: Total Pemohon */}
        <div
          onClick={() => setActiveStatusTab('Semua')}
          style={{
            backgroundColor: '#FFFFFF',
            padding: '12px 14px',
            borderRadius: '14px',
            border: activeStatusTab === 'Semua' ? '2px solid #2563EB' : '1px solid #E2E8F0',
            boxShadow: activeStatusTab === 'Semua' ? '0 4px 14px rgba(37, 99, 235, 0.14)' : '0 2px 8px rgba(0,0,0,0.02)',
            minWidth: 0,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            transform: activeStatusTab === 'Semua' ? 'translateY(-2px)' : 'none',
          }}
          title="Klik untuk menampilkan semua pemohon"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Total Pemohon
            </span>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#2563EB', flexShrink: 0 }}>
              groups
            </span>
          </div>
          <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0F172A', marginTop: '4px', lineHeight: 1.2 }}>
            {stageCounts.total}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {selectedKonsjen === 'Semua' ? 'Semua wilayah' : `Konsulat ${selectedKonsjen}`}
          </div>
        </div>

        {/* Card 2: Belum Verifikasi */}
        <div
          onClick={() => setActiveStatusTab('Belum Diverifikasi')}
          style={{
            backgroundColor: '#FFFFFF',
            padding: '12px 14px',
            borderRadius: '14px',
            border: activeStatusTab === 'Belum Diverifikasi' || activeStatusTab === 'Menunggu Verifikasi' ? '2px solid #D97706' : '1px solid #E2E8F0',
            boxShadow: activeStatusTab === 'Belum Diverifikasi' || activeStatusTab === 'Menunggu Verifikasi' ? '0 4px 14px rgba(217, 119, 6, 0.14)' : '0 2px 8px rgba(0,0,0,0.02)',
            minWidth: 0,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            transform: activeStatusTab === 'Belum Diverifikasi' || activeStatusTab === 'Menunggu Verifikasi' ? 'translateY(-2px)' : 'none',
          }}
          title="Klik untuk menyaring pemohon yang belum diverifikasi"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#92400E', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Belum Verif
            </span>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#D97706', flexShrink: 0 }}>
              hourglass_top
            </span>
          </div>
          <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#B45309', marginTop: '4px', lineHeight: 1.2 }}>
            {stageCounts.belumVerifikasi}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Pendaftaran baru
          </div>
        </div>

        {/* Card 3: Baru Tahap Sampai */}
        <div
          onClick={() => setActiveStatusTab('Baru Sampai')}
          style={{
            backgroundColor: '#FFFFFF',
            padding: '12px 14px',
            borderRadius: '14px',
            border: activeStatusTab === 'Baru Sampai' || activeStatusTab === 'Sampai' ? '2px solid #16A34A' : '1px solid #E2E8F0',
            boxShadow: activeStatusTab === 'Baru Sampai' || activeStatusTab === 'Sampai' ? '0 4px 14px rgba(22, 163, 74, 0.14)' : '0 2px 8px rgba(0,0,0,0.02)',
            minWidth: 0,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            transform: activeStatusTab === 'Baru Sampai' || activeStatusTab === 'Sampai' ? 'translateY(-2px)' : 'none',
          }}
          title="Klik untuk filter pemohon yang baru tahap sampai (berkas di kantor, belum diajukan)"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Baru Sampai
            </span>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#16A34A', flexShrink: 0 }}>
              inventory_2
            </span>
          </div>
          <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#15803D', marginTop: '4px', lineHeight: 1.2 }}>
            {stageCounts.baruSampai}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Berkas tiba di kantor
          </div>
        </div>

        {/* Card 4: Proses JVAC (Proses) */}
        <div
          onClick={() => setActiveStatusTab('Sedang Diproses')}
          style={{
            backgroundColor: '#FFFFFF',
            padding: '12px 14px',
            borderRadius: '14px',
            border: activeStatusTab === 'Sedang Diproses' || activeStatusTab === 'Proses' ? '2px solid #EA580C' : '1px solid #E2E8F0',
            boxShadow: activeStatusTab === 'Sedang Diproses' || activeStatusTab === 'Proses' ? '0 4px 14px rgba(234, 88, 12, 0.14)' : '0 2px 8px rgba(0,0,0,0.02)',
            minWidth: 0,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            transform: activeStatusTab === 'Sedang Diproses' || activeStatusTab === 'Proses' ? 'translateY(-2px)' : 'none',
          }}
          title="Klik untuk filter pemohon yang sedang diproses di JVAC / Kedutaan"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#9A3412', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Proses JVAC
            </span>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#EA580C', flexShrink: 0 }}>
              pending
            </span>
          </div>
          <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#C2410C', marginTop: '4px', lineHeight: 1.2 }}>
            {stageCounts.sedangProses}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Verifikasi konsulat
          </div>
        </div>

        {/* Card 5: Visa Terbit (Selesai) */}
        <div
          onClick={() => setActiveStatusTab('Selesai')}
          style={{
            backgroundColor: '#FFFFFF',
            padding: '12px 14px',
            borderRadius: '14px',
            border: activeStatusTab === 'Selesai' || activeStatusTab === 'Visa Terbit' ? '2px solid #0284C7' : '1px solid #E2E8F0',
            boxShadow: activeStatusTab === 'Selesai' || activeStatusTab === 'Visa Terbit' ? '0 4px 14px rgba(2, 132, 199, 0.14)' : '0 2px 8px rgba(0,0,0,0.02)',
            minWidth: 0,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            transform: activeStatusTab === 'Selesai' || activeStatusTab === 'Visa Terbit' ? 'translateY(-2px)' : 'none',
          }}
          title="Klik untuk filter pemohon dengan visa yang sudah terbit (siap dikirim)"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0369A1', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Visa Terbit
            </span>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0284C7', flexShrink: 0 }}>
              task_alt
            </span>
          </div>
          <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0284C7', marginTop: '4px', lineHeight: 1.2 }}>
            {stageCounts.visaTerbit}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Stiker siap dikirim
          </div>
        </div>

        {/* Card 6: Sudah Kirim (Handover) */}
        <div
          onClick={() => setActiveStatusTab('Kirim')}
          style={{
            backgroundColor: '#FFFFFF',
            padding: '12px 14px',
            borderRadius: '14px',
            border: activeStatusTab === 'Kirim' || activeStatusTab === 'Sudah Kirim' ? '2px solid #7C3AED' : '1px solid #E2E8F0',
            boxShadow: activeStatusTab === 'Kirim' || activeStatusTab === 'Sudah Kirim' ? '0 4px 14px rgba(124, 58, 237, 0.14)' : '0 2px 8px rgba(0,0,0,0.02)',
            minWidth: 0,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            transform: activeStatusTab === 'Kirim' || activeStatusTab === 'Sudah Kirim' ? 'translateY(-2px)' : 'none',
          }}
          title="Klik untuk filter pemohon yang paspornya sudah dikirim / diserahkan"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#6D28D9', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Sudah Kirim
            </span>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#7C3AED', flexShrink: 0 }}>
              flight_takeoff
            </span>
          </div>
          <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#7C3AED', marginTop: '4px', lineHeight: 1.2 }}>
            {stageCounts.sudahKirim}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                ? '#FFFBEB'
                : activeStatusTab === 'Baru Sampai' || activeStatusTab === 'Sampai'
                ? '#F0FDF4'
                : activeStatusTab === 'Sedang Diproses' || activeStatusTab === 'Proses'
                ? '#FFF7ED'
                : activeStatusTab === 'Selesai' || activeStatusTab === 'Visa Terbit'
                ? '#F0F9FF'
                : activeStatusTab === 'Kirim' || activeStatusTab === 'Sudah Kirim'
                ? '#F5F3FF'
                : '#FEF2F2',
            border: `1px solid ${
              activeStatusTab === 'Belum Diverifikasi' || activeStatusTab === 'Menunggu Verifikasi'
                ? '#FDE68A'
                : activeStatusTab === 'Baru Sampai' || activeStatusTab === 'Sampai'
                ? '#BBF7D0'
                : activeStatusTab === 'Sedang Diproses' || activeStatusTab === 'Proses'
                ? '#FED7AA'
                : activeStatusTab === 'Selesai' || activeStatusTab === 'Visa Terbit'
                ? '#BAE6FD'
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
                    ? '#D97706'
                    : activeStatusTab === 'Baru Sampai' || activeStatusTab === 'Sampai'
                    ? '#16A34A'
                    : activeStatusTab === 'Sedang Diproses' || activeStatusTab === 'Proses'
                    ? '#EA580C'
                    : activeStatusTab === 'Selesai' || activeStatusTab === 'Visa Terbit'
                    ? '#0284C7'
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 2px 14px 2px',
        }}
      >
        {/* Sisi Kiri: Tampilkan Data & Filter Konsulat/Paket */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.84rem', fontWeight: 500 }}>
            <span>Tampilkan</span>
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
                  padding: '6px 28px 6px 14px',
                  borderRadius: '9999px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#F8FAFC',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  color: '#0F172A',
                  cursor: 'pointer',
                  outline: 'none',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
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

          <div style={{ height: '18px', width: '1px', backgroundColor: '#CBD5E1' }} />

          {/* Filter Wilayah Konsulat: Khusus Owner (Bisa switch kota/nasional). Staf terkunci pada wilayah tugasnya */}
          {isOwner ? (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', fontSize: '15px', color: '#64748B', pointerEvents: 'none' }}>
                location_on
              </span>
              <select
                value={selectedKonsjen}
                onChange={(e) => setSelectedKonsjen(e.target.value)}
                style={{
                  padding: '6px 12px 6px 28px',
                  borderRadius: '9999px',
                  border: '1px solid #E2E8F0',
                  fontSize: '0.80rem',
                  fontWeight: 600,
                  color: '#0F172A',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                  outline: 'none',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
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
            </div>
          ) : (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '9999px',
                border: '1px solid #BFDBFE',
                backgroundColor: '#EFF6FF',
                color: '#1E40AF',
                fontSize: '0.80rem',
                fontWeight: 700,
              }}
              title="Wilayah tugas konsulat resmi akun Anda"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#2563EB' }}>
                location_on
              </span>
              <span>Wilayah Tugas: {currentStaff?.konsjenTugas?.join(', ') || 'Jakarta'}</span>
            </div>
          )}

          {/* Dropdown Paket */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', fontSize: '15px', color: '#64748B', pointerEvents: 'none' }}>
              stars
            </span>
            <select
              value={selectedPaket}
              onChange={(e) => setSelectedPaket(e.target.value)}
              style={{
                padding: '6px 12px 6px 28px',
                borderRadius: '9999px',
                border: '1px solid #E2E8F0',
                fontSize: '0.80rem',
                fontWeight: 600,
                color: '#0F172A',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <option value="Semua">Semua Paket</option>
              <option value="Reguler">Reguler</option>
              <option value="TAC">TAC (Tokutei)</option>
              <option value="Premium">Premium</option>
            </select>
          </div>

          {/* Dropdown Pilihan Tahapan Pengajuan */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span
              className="material-symbols-outlined"
              style={{
                position: 'absolute',
                left: '10px',
                fontSize: '15px',
                color: activeStatusTab !== 'Semua' ? '#2563EB' : '#64748B',
                pointerEvents: 'none',
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
              style={{
                appearance: 'none',
                WebkitAppearance: 'none',
                padding: '6px 28px 6px 30px',
                borderRadius: '9999px',
                border: activeStatusTab !== 'Semua' ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
                backgroundColor: activeStatusTab !== 'Semua' ? '#EFF6FF' : '#FFFFFF',
                color: activeStatusTab !== 'Semua' ? '#1E40AF' : '#0F172A',
                fontSize: '0.80rem',
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none',
                boxShadow: activeStatusTab !== 'Semua' ? '0 1px 3px rgba(37, 99, 235, 0.15)' : '0 1px 2px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease',
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

          {activeStatusTab !== 'Semua' && (
            <button
              type="button"
              onClick={() => setActiveStatusTab('Semua')}
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
              title="Reset filter tahapan ke semua data"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>restart_alt</span>
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Sisi Kanan: Input Pencarian... */}
        <div style={{ position: 'relative', minWidth: '220px', maxWidth: '300px', width: '100%' }}>
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Pencarian..."
            style={{
              width: '100%',
              padding: '8px 18px',
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
        </div>
      </div>

      {/* Main Data Table */}
      <div className="data-table-container" style={{ overflow: 'visible', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 14px rgba(0,0,0,0.03)', background: '#ffffff' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left', fontSize: '0.80rem' }}>
          <thead>
            <tr style={{ color: '#64748B', fontWeight: 700 }}>
              <th style={{ width: '46px', textAlign: 'center', padding: '10px 8px', position: 'sticky', top: '68px', backgroundColor: '#F8FAFC', zIndex: 25, borderBottom: '2px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', borderTopLeftRadius: '15px' }}>
                No.
              </th>
              <th style={{ minWidth: '160px', padding: '10px 10px', position: 'sticky', top: '68px', backgroundColor: '#F8FAFC', zIndex: 25, borderBottom: '2px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                Pemohon &amp; Identitas
              </th>
              <th style={{ minWidth: '150px', padding: '10px 10px', position: 'sticky', top: '68px', backgroundColor: '#F8FAFC', zIndex: 25, borderBottom: '2px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                Program &amp; Konsulat
              </th>
              <th style={{ minWidth: '80px', textAlign: 'center', padding: '10px 8px', position: 'sticky', top: '68px', backgroundColor: '#F8FAFC', zIndex: 25, borderBottom: '2px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                Berkas
              </th>
              <th style={{ minWidth: '320px', textAlign: 'center', padding: '8px 8px', position: 'sticky', top: '68px', backgroundColor: '#F8FAFC', zIndex: 25, borderBottom: '2px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: '4px', fontSize: '0.80rem' }}>
                  Status Pengajuan (Klik Ceklis Tahapan)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', fontSize: '0.70rem', color: '#475569', fontWeight: 700 }}>
                  <span style={{ backgroundColor: '#F1F5F9', padding: '2px 3px', borderRadius: '4px' }}>Sampai</span>
                  <span style={{ backgroundColor: '#F1F5F9', padding: '2px 3px', borderRadius: '4px' }}>Proses</span>
                  <span style={{ backgroundColor: '#F1F5F9', padding: '2px 3px', borderRadius: '4px' }}>Selesai</span>
                  <span style={{ backgroundColor: '#F1F5F9', padding: '2px 3px', borderRadius: '4px' }}>Kirim</span>
                </div>
              </th>
              {isOwner && (
                <th style={{ minWidth: '110px', textAlign: 'right', padding: '10px 10px', position: 'sticky', top: '68px', backgroundColor: '#F8FAFC', zIndex: 25, borderBottom: '2px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', whiteSpace: 'nowrap' }}>
                  Fee Bersih
                </th>
              )}
              <th
                style={{
                  width: '90px',
                  textAlign: 'center',
                  padding: '10px 8px',
                  position: 'sticky',
                  top: '68px',
                  right: 0,
                  backgroundColor: '#F8FAFC',
                  boxShadow: '-3px 2px 6px rgba(0,0,0,0.04)',
                  zIndex: 30,
                  borderBottom: '2px solid #CBD5E1',
                  borderTopRightRadius: '15px',
                }}
              >
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={isOwner ? 7 : 6} style={{ textAlign: 'center', padding: '36px', color: 'var(--on-surface-variant)' }}>
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
                    <td style={{ padding: '10px 10px' }}>
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
                    <td style={{ padding: '10px 10px' }}>
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
                    <td style={{ padding: '10px 6px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '2px', justifyContent: 'center' }}>
                        {[
                          { label: 'Form', ok: row.berkas.formVisa },
                          { label: 'KTP', ok: row.berkas.ktp },
                          { label: 'E-KTLN', ok: row.berkas.ektln },
                          { label: 'COE', ok: row.berkas.coe },
                          { label: 'Paspor', ok: row.berkas.pasporFisik },
                        ].map((b, bIdx) => (
                          <span
                            key={bIdx}
                            title={`${b.label}: ${b.ok ? 'Lengkap' : 'Kurang'}`}
                            style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '8px',
                              fontWeight: 700,
                              background: b.ok ? '#DCFCE7' : '#FEE2E2',
                              color: b.ok ? '#16A34A' : '#EF4444',
                              border: `1px solid ${b.ok ? '#BBF7D0' : '#FECACA'}`,
                            }}
                          >
                            {b.ok ? '✓' : '!'}
                          </span>
                        ))}
                      </div>
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
                            padding: '7px 10px',
                            color: '#B91C1C',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            minWidth: '320px',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#EF4444' }}>
                            cancel
                          </span>
                          <span>DITOLAK: {st.alasanPenolakan || 'Berkas Tidak Lengkap / Waktu Mepet'}</span>
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', minWidth: '320px' }}>
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
                                  style={{
                                    fontSize: '0.62rem',
                                    fontWeight: 700,
                                    color: '#6D28D9',
                                    backgroundColor: '#EDE9FE',
                                    border: '1px solid #DDD6FE',
                                    padding: '0 3px',
                                    borderRadius: '3px',
                                    marginTop: '2px',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '75px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: 'inline-block',
                                  }}
                                  title={`Nomor Resi / Status: ${st.noResi}`}
                                >
                                  📦 {st.noResi}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* 5. Khusus Mode Owner: Fee Bersih */}
                    {isOwner && (
                      <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: '#B45309', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        {formatRupiah(row.feeBersih)}
                      </td>
                    )}

                    {/* 6. Aksi: STICKY RIGHT (Rincian & Tolak) */}
                    <td
                      style={{
                        padding: '6px 8px',
                        textAlign: 'center',
                        position: 'sticky',
                        right: 0,
                        backgroundColor: '#FFFFFF',
                        boxShadow: '-3px 0 6px rgba(0,0,0,0.04)',
                        zIndex: 1,
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                        <button
                          className="btn btn-primary"
                          onClick={() => onSelectPengajuan(row.id)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '0.74rem',
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
    </div>
  );
};
