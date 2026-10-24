import React, { useState } from 'react';
import type { Pengajuan, StatusPengajuan } from '../types';
import { supabase } from '../lib/supabase';
import { kirimPesanWA } from '../whatsapp';

interface PengajuanViewProps {
  pengajuanList: Pengajuan[];
  onSelectPengajuan: (id: string) => void;
  onOpenNewPengajuan: () => void;
  searchFilter: string;
  isOwner?: boolean;
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

export const PengajuanView: React.FC<PengajuanViewProps> = ({
  pengajuanList,
  onSelectPengajuan,
  onOpenNewPengajuan,
  searchFilter,
  isOwner = false,
  onUpdateStage,
}) => {
  const [activeStatusTab, setActiveStatusTab] = useState<string>('Semua');
  const [selectedKonsjen, setSelectedKonsjen] = useState<string>('Semua');
  const [selectedPaket, setSelectedPaket] = useState<string>('Semua');
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
          `Estimasi waktu pemrosesan kedutaan sekitar 3 - 5 hari kerja. Kami akan segera mengabarkan Anda kembali begitu visa telah selesai dan terbit.\n\n` +
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

  const statusTabs = [
    'Semua',
    'Menunggu Verifikasi',
    'Sedang Diproses',
    'Apply Hari Ini',
    'Siap Ambil',
    'Selesai',
    'Ditolak',
  ];

  const filteredData = pengajuanList.filter((item) => {
    const currentStatus = getCandidateStages(item).currentStatus;
    // Status filter
    if (activeStatusTab !== 'Semua' && currentStatus !== activeStatusTab) {
      return false;
    }
    // Konsjen filter
    if (selectedKonsjen !== 'Semua' && item.konsjen !== selectedKonsjen) {
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
  });

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
            Total <strong>{pengajuanList.length}</strong> pemohon terdata dalam sistem MapahTrip.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowMaskedPaspor(!showMaskedPaspor)}
            title="Sembunyikan/Buka sensor nomor paspor"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              {showMaskedPaspor ? 'visibility' : 'visibility_off'}
            </span>
            <span>{showMaskedPaspor ? 'Tampilkan Paspor' : 'Sensor Paspor'}</span>
          </button>

          <button className="btn btn-secondary" onClick={() => alert('Mengekspor data ke format Excel / XLSX...')}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              file_download
            </span>
            <span>Ekspor Excel</span>
          </button>

          <button className="btn btn-primary" onClick={onOpenNewPengajuan}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              person_add
            </span>
            <span>Tambah Pemohon</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs and Controls */}
      <div className="card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Status Tab Pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {statusTabs.map((tab) => {
            const isActive = activeStatusTab === tab;
            const count =
              tab === 'Semua'
                ? pengajuanList.length
                : pengajuanList.filter((p) => getCandidateStages(p).currentStatus === tab).length;

            return (
              <button
                key={tab}
                onClick={() => setActiveStatusTab(tab)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: isActive ? 'var(--primary)' : 'var(--surface-container-low)',
                  color: isActive ? '#fff' : 'var(--on-surface-variant)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.825rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{tab}</span>
                <span
                  style={{
                    padding: '1px 6px',
                    borderRadius: '9999px',
                    fontSize: '0.7rem',
                    background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'var(--surface-container-high)',
                    color: isActive ? '#fff' : 'var(--on-surface)',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sub-Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid rgba(195, 198, 214, 0.25)', paddingTop: '12px' }}>
          {/* Row 1: Konsulat Filter */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--on-surface-variant)', minWidth: '65px' }}>
                Konsulat:
              </span>
              {['Semua', 'Jakarta', 'Surabaya', 'Denpasar', 'Medan', 'Makassar'].map((k) => (
                <button
                  key={k}
                  onClick={() => setSelectedKonsjen(k)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    border: '1px solid',
                    borderColor: selectedKonsjen === k ? 'var(--secondary)' : 'rgba(195, 198, 214, 0.4)',
                    background: selectedKonsjen === k ? 'var(--surface-container)' : 'transparent',
                    color: selectedKonsjen === k ? 'var(--secondary)' : 'var(--on-surface-variant)',
                    fontSize: '0.78rem',
                    fontWeight: selectedKonsjen === k ? 600 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {k}
                </button>
              ))}
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>
              Menampilkan <strong>{filteredData.length}</strong> pengajuan
            </div>
          </div>

          {/* Row 2: Paket Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingTop: '4px' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--on-surface-variant)', minWidth: '65px' }}>
              Paket:
            </span>
            {[
              { id: 'Semua', label: 'Semua Paket', count: pengajuanList.length },
              { id: 'Reguler', label: 'Reguler', count: pengajuanList.filter((p) => p.paket === 'Reguler').length },
              { id: 'TAC', label: 'TAC', count: pengajuanList.filter((p) => p.paket === 'TAC').length },
              { id: 'Premium', label: 'Premium', count: pengajuanList.filter((p) => p.paket === 'Premium').length },
            ].map((pkt) => (
              <button
                key={pkt.id}
                onClick={() => setSelectedPaket(pkt.id)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  border: '1px solid',
                  borderColor: selectedPaket === pkt.id ? '#0F172A' : '#E2E8F0',
                  background: selectedPaket === pkt.id ? '#0F172A' : '#FFFFFF',
                  color: selectedPaket === pkt.id ? '#FFFFFF' : '#475569',
                  fontSize: '0.78rem',
                  fontWeight: selectedPaket === pkt.id ? 700 : 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{pkt.label}</span>
                <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>({pkt.count})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="data-table-container" style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.80rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700 }}>
              <th style={{ padding: '12px 10px', minWidth: '170px' }}>Pemohon &amp; Identitas</th>
              <th style={{ padding: '12px 10px', minWidth: '130px' }}>Program &amp; Paket</th>
              <th style={{ padding: '12px 10px', minWidth: '110px' }}>Konsjen &amp; PIC</th>
              <th style={{ padding: '12px 10px', minWidth: '100px', textAlign: 'center' }}>Berkas Fisik</th>
              <th style={{ padding: '8px 10px', textAlign: 'center', minWidth: '380px' }}>
                <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: '4px', fontSize: '0.82rem' }}>
                  Status Pengajuan (Klik Ceklis Tahapan)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', fontSize: '0.72rem', color: '#475569', fontWeight: 700 }}>
                  <span style={{ backgroundColor: '#F1F5F9', padding: '2px 4px', borderRadius: '4px' }}>Sampai</span>
                  <span style={{ backgroundColor: '#F1F5F9', padding: '2px 4px', borderRadius: '4px' }}>Proses</span>
                  <span style={{ backgroundColor: '#F1F5F9', padding: '2px 4px', borderRadius: '4px' }}>Selesai</span>
                  <span style={{ backgroundColor: '#F1F5F9', padding: '2px 4px', borderRadius: '4px' }}>Kirim</span>
                </div>
              </th>
              {isOwner ? (
                <th style={{ padding: '12px 10px', textAlign: 'right', minWidth: '100px' }}>Fee Bersih</th>
              ) : (
                <th style={{ padding: '12px 10px', minWidth: '120px' }}>Resi / Pengiriman</th>
              )}
              <th style={{ padding: '12px 10px', textAlign: 'center', width: '80px' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={isOwner ? 7 : 7} style={{ textAlign: 'center', padding: '36px', color: 'var(--on-surface-variant)' }}>
                  Tidak ada pengajuan yang sesuai dengan kriteria filter saat ini.
                </td>
              </tr>
            ) : (
              filteredData.map((row) => {
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

                    {/* 2. Program & Paket */}
                    <td style={{ padding: '10px 10px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#0F172A' }}>{row.program}</div>
                      <div style={{ marginTop: '2px' }}>{getPaketBadge(row.paket)}</div>
                    </td>

                    {/* 3. Konsjen & PIC */}
                    <td style={{ padding: '10px 10px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F172A' }}>{row.konsjen}</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                        PIC: {row.staffPic.split(' ')[0]}
                      </div>
                    </td>

                    {/* 4. Berkas Fisik (Checklist Dots) */}
                    <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '3px', justifyContent: 'center' }}>
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
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '9px',
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

                    {/* 5. Status Pengajuan 4 Tahapan Ceklis: Sampai | Proses | Selesai | Kirim */}
                    <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', minWidth: '360px' }}>
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
                              padding: '4px 3px',
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
                                fontSize: '0.73rem',
                                fontWeight: 800,
                                color: s.ok ? s.color : '#94A3B8',
                                padding: '2px 0',
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
                                fontSize: '0.67rem',
                                fontFamily: 'monospace',
                                color: s.ok ? s.color : '#CBD5E1',
                                fontWeight: s.ok ? 700 : 500,
                                cursor: s.ok ? 'pointer' : 'default',
                                textDecoration: s.ok ? 'underline dotted' : 'none',
                                lineHeight: 1.2,
                                marginTop: '1px',
                              }}
                            >
                              {s.ok ? (s.date || getTodayFormatted()) : '-'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* 6. Resi / Pengiriman (or Fee Bersih if isOwner) */}
                    {isOwner ? (
                      <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: '#B45309', fontSize: '0.85rem' }}>
                        {formatRupiah(row.feeBersih)}
                      </td>
                    ) : (
                      <td style={{ padding: '10px 10px' }}>
                        {st.noResi ? (
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              color: '#1E40AF',
                              background: '#EFF6FF',
                              border: '1px solid #DBEAFE',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              display: 'inline-block',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {st.noResi}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                            {st.currentStatus === 'Selesai' ? 'Diserahkan' : 'Dalam Proses'}
                          </span>
                        )}
                      </td>
                    )}

                    {/* 7. Aksi */}
                    <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => onSelectPengajuan(row.id)}
                        style={{ padding: '5px 12px', fontSize: '0.76rem', fontWeight: 700 }}
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
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
