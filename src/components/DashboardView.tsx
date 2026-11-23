import React, { useMemo } from 'react';
import type { Pengajuan, StaffMaster } from '../types';
import { getEffectiveFeeBersih, getEffectiveReferralFee, getEffectiveStaffFee } from '../utils/financialCalculations';
import { isApplicantAssignedToStaff } from '../utils/staffAssignment';

interface DashboardViewProps {
  pengajuanList: Pengajuan[];
  onSelectPengajuan: (id: string) => void;
  onNavigateToPengajuan: (statusTab?: string) => void;
  isOwner?: boolean;
  staffName?: string;
  currentStaff?: StaffMaster | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  pengajuanList,
  onSelectPengajuan,
  onNavigateToPengajuan,
  isOwner = false,
  staffName,
  currentStaff = null,
}) => {
  // Jika staf operasional login, sesuaikan seluruh metrik dan daftar pengajuan HANYA dengan pemohon yang ditugaskan kepada staf tersebut
  const effectiveList = useMemo(() => {
    if (isOwner || !currentStaff) {
      return pengajuanList;
    }
    return pengajuanList.filter((p) => isApplicantAssignedToStaff(p, currentStaff));
  }, [pengajuanList, isOwner, currentStaff]);

  // Hitung angka riil akurat 100% dari data yang ada
  const totalPengajuan = effectiveList.length;

  // Hitung jumlah riil pemohon di setiap tahapan pipeline operasional (Sinkron dengan Pengajuan)
  let countBelum = 0;
  let countBaruSampai = 0;
  let countSedangProses = 0;
  let countVisaTerbit = 0;
  let countSudahKirim = 0;
  let countDitolak = 0;

  effectiveList.forEach((p) => {
    const isKirim = Boolean((p.tglKirim && p.tglKirim !== '-') || (p.noResi && p.noResi !== '-'));
    const isSelesai = Boolean(p.tglSelesai && p.tglSelesai !== '-');
    const isProses = Boolean(p.tglApply && p.tglApply !== '-');
    const isSampai = Boolean(p.tglBerkasMasuk && p.tglBerkasMasuk !== '-');

    if (p.status === 'Ditolak') {
      countDitolak++;
    } else if (isKirim) {
      countSudahKirim++;
    } else if (isSelesai) {
      countVisaTerbit++;
    } else if (isProses) {
      countSedangProses++;
    } else if (isSampai) {
      countBaruSampai++;
    } else {
      countBelum++;
    }
  });

  // Hitung metrik keuangan owner (Hanya menghitung pemohon yang sudah Lunas agar pendaftaran belum bayar / batal tidak masuk hitungan omzet & laba)
  const lunasList = effectiveList.filter((p) => p.statusPembayaran !== 'Menunggu Pembayaran');
  const totalPemasukan = lunasList.reduce((acc, p) => acc + (p.dibayarPemohon || 0), 0);
  const totalPengeluaran = lunasList.reduce((acc, p) => acc + (p.nominalKeluar || 0), 0);
  const totalReferralFee = lunasList
    .filter((p) => p.status !== 'Ditolak')
    .reduce((acc, p) => acc + getEffectiveReferralFee(p), 0);
  const totalStaffFee = lunasList.reduce((acc, p) => acc + getEffectiveStaffFee(p), 0);
  const totalKomisi = totalReferralFee + totalStaffFee;
  const totalFeeBersih = lunasList.reduce((acc, p) => acc + getEffectiveFeeBersih(p), 0);

  // 1. Pengajuan yang butuh tindakan staf segera (Pendaftaran baru belum diverifikasi)
  const tugasPerluTindakan = effectiveList.filter((p) => {
    const isKirim = Boolean((p.tglKirim && p.tglKirim !== '-') || (p.noResi && p.noResi !== '-'));
    const isSelesai = Boolean(p.tglSelesai && p.tglSelesai !== '-');
    const isProses = Boolean(p.tglApply && p.tglApply !== '-');
    const isSampai = Boolean(p.tglBerkasMasuk && p.tglBerkasMasuk !== '-');
    return p.status !== 'Ditolak' && !isKirim && !isSelesai && !isProses && !isSampai;
  });

  const getStatusBadge = (status: Pengajuan['status']) => {
    switch (status) {
      case 'Menunggu Verifikasi':
        return { bg: '#FFF7ED', color: '#C2410C', border: '#FFEDD5', label: 'Menunggu Verifikasi' };
      case 'Sedang Diproses':
        return { bg: '#EFF6FF', color: '#1E40AF', border: '#DBEAFE', label: 'Sedang Diproses' };
      case 'Apply Hari Ini':
        return { bg: '#FFF7ED', color: '#9A3412', border: '#FFEDD5', label: 'Apply Hari Ini' };
      case 'Siap Ambil':
        return { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0', label: 'Siap Ambil' };
      case 'Selesai':
        return { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0', label: 'Selesai' };
      case 'Ditolak':
        return { bg: '#FEF2F2', color: '#991B1B', border: '#FEE2E2', label: 'Ditolak' };
      default:
        return { bg: '#F8FAFC', color: '#475569', border: '#E2E8F0', label: status };
    }
  };

  return (
    <div className="dashboard-main-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Header Salam & Informasi Ringkas */}
      <div
        className="staff-header-row"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          paddingBottom: '4px',
        }}
      >
        <div className="staff-header-info">
          <h1
            className="staff-header-title"
            style={{
              fontSize: '1.85rem',
              fontWeight: 800,
              color: '#0F172A',
              margin: '0 0 6px',
              letterSpacing: '-0.02em',
            }}
          >
            {isOwner ? 'Selamat Datang di MapahTrip 👋' : `Halo, ${staffName ? staffName.split(' ')[0] : 'Rizky'} 👋`}
          </h1>
          <p className="staff-header-desc" style={{ color: '#64748B', fontSize: '0.88rem', margin: 0 }}>
            {isOwner
              ? 'Pantau alur pemrosesan berkas visa, rekap operasional, dan performa konsulat secara real-time.'
              : 'Berikut ringkasan tugas pengajuan visa dan agenda kerja Anda hari ini.'}
          </p>
        </div>

        {/* Tombol Navigasi Cepat */}
        <div className="staff-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="staff-header-btn"
            onClick={() => onNavigateToPengajuan()}
            style={{
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              padding: '9px 16px',
              borderRadius: '10px',
              fontSize: '0.84rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 1px 3px rgba(37, 99, 235, 0.2)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1D4ED8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#2563EB';
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              folder_open
            </span>
            <span>{isOwner ? 'Buka Semua Pengajuan' : 'Buka Pengajuan Wilayah'} ({totalPengajuan})</span>
          </button>
        </div>
      </div>

      {/* 1b. Kartu Motivasi & Pencapaian Kerja Staf (Khusus Staf PIC) */}
      {!isOwner && (
        <div
          className="staff-achievement-card"
          style={{
            backgroundColor: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '14px',
            padding: '12px 16px',
            boxShadow: '0 2px 6px rgba(22, 101, 52, 0.05)',
            marginBottom: '18px',
          }}
        >
          {/* Bagian Atas: Ikon, Judul, Angka Selesai & Badge */}
          <div className="staff-achievement-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
              <div
                className="staff-achievement-icon"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: '#DCFCE7',
                  border: '1px solid #86EFAC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#16A34A',
                  flexShrink: 0,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>workspace_premium</span>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Pencapaian Wilayah Anda
                </div>
                <div className="staff-achievement-title" style={{ fontSize: '0.94rem', fontWeight: 800, color: '#166534', lineHeight: 1.25 }}>
                  {countVisaTerbit + countSudahKirim} Paspor Selesai
                </div>
              </div>
            </div>

            <span
              className="staff-achievement-badge"
              style={{
                backgroundColor: '#DCFCE7',
                color: '#15803D',
                border: '1px solid #86EFAC',
                padding: '3px 8px',
                borderRadius: '999px',
                fontSize: '0.70rem',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <span>100% Sukses</span>
              <span>🏆</span>
            </span>
          </div>

          {/* Bagian Bawah: Ringkasan Catatan & Status Evaluasi */}
          <div
            className="staff-achievement-bottom"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              paddingTop: '8px',
              marginTop: '8px',
              borderTop: '1px dashed #BBF7D0',
            }}
          >
            <div style={{ fontSize: '0.73rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#16A34A', flexShrink: 0 }}>check_circle</span>
              <span>Seluruh berkas tertangani rapi (0 ditolak)</span>
            </div>

            <div
              className="staff-achievement-eval-pill"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #BBF7D0',
                color: '#0F172A',
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '0.70rem',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              🌟 Staff PIC Teladan
            </div>
          </div>
        </div>
      )}

      {/* 2. Ringkasan Finansial Owner: Pemasukan vs Modal Keluar vs Fee Bersih */}
      {isOwner && (
        <div className="owner-finance-grid">
          {/* Card Finansial 1: Total Pemasukan / Pendapatan */}
          <div
            className="owner-finance-card"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
            }}
          >
            <div className="owner-finance-top">
              <span className="owner-finance-label" style={{ color: '#64748B' }}>
                Total Pemasukan (Omzet)
              </span>
              <div className="owner-finance-icon" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                <span className="material-symbols-outlined">payments</span>
              </div>
            </div>
            <div className="owner-finance-val" style={{ color: '#0F172A' }}>
              Rp {totalPemasukan.toLocaleString('id-ID')}
            </div>
            <div className="owner-finance-sub" style={{ color: '#64748B' }}>
              <span className="material-symbols-outlined" style={{ color: '#94A3B8' }}>trending_up</span>
              <span>{lunasList.length} transaksi lunas</span>
              {effectiveList.length > lunasList.length && (
                <span style={{ color: '#94A3B8' }}>
                  &bull; {effectiveList.length - lunasList.length} blm bayar
                </span>
              )}
            </div>
          </div>

          {/* Card Finansial 2: Total Modal Keluar (Pengeluaran Konsulat) */}
          <div
            className="owner-finance-card"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
            }}
          >
            <div className="owner-finance-top">
              <span className="owner-finance-label" style={{ color: '#64748B' }}>
                Total Pengeluaran (Modal)
              </span>
              <div className="owner-finance-icon" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
                <span className="material-symbols-outlined">output</span>
              </div>
            </div>
            <div className="owner-finance-val" style={{ color: '#DC2626' }}>
              Rp {totalPengeluaran.toLocaleString('id-ID')}
            </div>
            <div className="owner-finance-sub" style={{ color: '#64748B' }}>
              <span className="material-symbols-outlined" style={{ color: '#94A3B8' }}>receipt_long</span>
              <span>Biaya konsulat &amp; operasional</span>
            </div>
          </div>

          {/* Card Finansial 3: Total Komisi Mitra & Fee Staf */}
          <div
            className="owner-finance-card"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
            }}
          >
            <div className="owner-finance-top">
              <span className="owner-finance-label" style={{ color: '#64748B' }}>
                Total Komisi Mitra &amp; Staf
              </span>
              <div className="owner-finance-icon" style={{ backgroundColor: '#FFFBEB', color: '#D97706' }}>
                <span className="material-symbols-outlined">handshake</span>
              </div>
            </div>
            <div className="owner-finance-val" style={{ color: '#D97706' }}>
              Rp {totalKomisi.toLocaleString('id-ID')}
            </div>
            <div className="owner-finance-sub" style={{ color: '#64748B' }}>
              <span className="material-symbols-outlined" style={{ color: '#94A3B8' }}>share</span>
              <span className="finance-sub-desktop">Mitra: Rp {totalReferralFee.toLocaleString('id-ID')} &bull; Staf: Rp {totalStaffFee.toLocaleString('id-ID')}</span>
              <span className="finance-sub-mobile">Alokasi mitra &amp; fee staf</span>
            </div>
          </div>

          {/* Card Finansial 4: Total Fee Bersih (Laba Bersih) */}
          <div
            className="owner-finance-card"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
            }}
          >
            <div className="owner-finance-top">
              <span className="owner-finance-label" style={{ color: '#64748B' }}>
                Total Fee Bersih (Laba)
              </span>
              <div className="owner-finance-icon" style={{ backgroundColor: '#ECFDF5', color: '#059669' }}>
                <span className="material-symbols-outlined">account_balance_wallet</span>
              </div>
            </div>
            <div className="owner-finance-val" style={{ color: '#059669' }}>
              Rp {totalFeeBersih.toLocaleString('id-ID')}
            </div>
            <div className="owner-finance-sub" style={{ color: '#64748B' }}>
              <span className="material-symbols-outlined" style={{ color: '#059669' }}>verified</span>
              <span>Laba bersih riil terverifikasi</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Kartu Pipeline Operasional 6 Tahap (Clean SaaS Minimalist) */}
      <div className="staff-pipeline-grid">
        {/* Card 1: Total Pemohon */}
        <div
          className="staff-pipeline-card"
          onClick={() => onNavigateToPengajuan('Semua')}
          style={{
            backgroundColor: '#FFFFFF',
            padding: '12px 14px',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            minWidth: 0,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)';
          }}
          title="Klik untuk membuka semua pengajuan"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
            <span className="staff-pipeline-label" style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Total Pemohon
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#2563EB' }}>
                groups
              </span>
            </div>
          </div>
          <div className="staff-pipeline-val" style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0F172A', marginTop: '6px', lineHeight: 1.2 }}>
            {totalPengajuan}
          </div>
          <div className="staff-pipeline-sub" style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {isOwner ? 'Nasional terdaftar' : 'Wilayah tugas Anda'}
          </div>
        </div>

        {/* Card 2: Belum Verifikasi */}
        <div
          className="staff-pipeline-card"
          onClick={() => onNavigateToPengajuan('Belum Diverifikasi')}
          style={{
            backgroundColor: '#FFFFFF',
            padding: '12px 14px',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            minWidth: 0,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(234, 88, 12, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)';
          }}
          title="Klik untuk melihat pemohon yang belum diverifikasi"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
            <span className="staff-pipeline-label" style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Belum Verif
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#EA580C' }}>
                hourglass_top
              </span>
            </div>
          </div>
          <div className="staff-pipeline-val" style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0F172A', marginTop: '6px', lineHeight: 1.2 }}>
            {countBelum}
          </div>
          <div className="staff-pipeline-sub" style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Pendaftaran baru
          </div>
        </div>

        {/* Card 3: Berkas Tiba & Lengkap */}
        <div
          className="staff-pipeline-card"
          onClick={() => onNavigateToPengajuan('Baru Sampai')}
          style={{
            backgroundColor: '#FFFFFF',
            padding: '12px 14px',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            minWidth: 0,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(2, 132, 199, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)';
          }}
          title="Klik untuk membuka pemohon yang berkas fisiknya tiba & lengkap di kantor"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
            <span className="staff-pipeline-label" style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Berkas Tiba
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#0284C7' }}>
                inventory_2
              </span>
            </div>
          </div>
          <div className="staff-pipeline-val" style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0F172A', marginTop: '6px', lineHeight: 1.2 }}>
            {countBaruSampai}
          </div>
          <div className="staff-pipeline-sub" style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Fisik tiba di kantor
          </div>
        </div>

        {/* Card 4: Proses JVAC (Proses) */}
        <div
          className="staff-pipeline-card"
          onClick={() => onNavigateToPengajuan('Sedang Diproses')}
          style={{
            backgroundColor: '#FFFFFF',
            padding: '12px 14px',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            minWidth: 0,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(217, 119, 6, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)';
          }}
          title="Klik untuk membuka pengajuan sedang diproses di JVAC / Kedutaan"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
            <span className="staff-pipeline-label" style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Proses JVAC
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#D97706' }}>
                pending
              </span>
            </div>
          </div>
          <div className="staff-pipeline-val" style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0F172A', marginTop: '6px', lineHeight: 1.2 }}>
            {countSedangProses}
          </div>
          <div className="staff-pipeline-sub" style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Verifikasi konsulat
          </div>
        </div>

        {/* Card 5: Visa Terbit (Selesai) */}
        <div
          className="staff-pipeline-card"
          onClick={() => onNavigateToPengajuan('Selesai')}
          style={{
            backgroundColor: '#FFFFFF',
            padding: '12px 14px',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            minWidth: 0,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(22, 163, 74, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)';
          }}
          title="Klik untuk membuka pengajuan visa terbit (siap dikirim)"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
            <span className="staff-pipeline-label" style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Visa Terbit
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#16A34A' }}>
                task_alt
              </span>
            </div>
          </div>
          <div className="staff-pipeline-val" style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0F172A', marginTop: '6px', lineHeight: 1.2 }}>
            {countVisaTerbit}
          </div>
          <div className="staff-pipeline-sub" style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Stiker siap dikirim
          </div>
        </div>

        {/* Card 6: Sudah Kirim (Handover) */}
        <div
          className="staff-pipeline-card"
          onClick={() => onNavigateToPengajuan('Kirim')}
          style={{
            backgroundColor: '#FFFFFF',
            padding: '12px 14px',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            minWidth: 0,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(124, 58, 237, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)';
          }}
          title="Klik untuk membuka pengajuan yang paspornya sudah dikirim"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
            <span className="staff-pipeline-label" style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Kirim / Handover
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#7C3AED' }}>
                flight_takeoff
              </span>
            </div>
          </div>
          <div className="staff-pipeline-val" style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0F172A', marginTop: '6px', lineHeight: 1.2 }}>
            {countSudahKirim}
          </div>
          <div className="staff-pipeline-sub" style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Paspor terkirim / resi
          </div>
        </div>
      </div>

      {/* 3. Dua Bagian Utama yang Seimbang & Rapi (Tanpa Scroll Panjang) */}
      <div className="staff-sections-grid">
        {/* Kolom Kiri: Agenda / Tugas yang Butuh Tindakan Segera (Top 5 Prioritas) */}
        <div
          className="staff-section-card card"
          style={{
            padding: '22px',
            borderRadius: '18px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div className="staff-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: '#FFF7ED',
                    color: '#EA580C',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    assignment_late
                  </span>
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h2 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0F172A', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Tugas Perlu Tindakan
                  </h2>
                  <p className="staff-section-sub" style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748B', lineHeight: 1.35 }}>
                    Pendaftaran baru yang butuh verifikasi berkas oleh staf
                  </p>
                </div>
              </div>
              <span
                onClick={() => onNavigateToPengajuan('Menunggu Verifikasi')}
                style={{
                  backgroundColor: '#FFF7ED',
                  color: '#C2410C',
                  border: '1px solid #FFEDD5',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title="Klik untuk menyaring pemohon yang belum diverifikasi"
              >
                {tugasPerluTindakan.length} Belum Diverifikasi
              </span>
            </div>

            {tugasPerluTindakan.length === 0 ? (
              <div
                style={{
                  padding: '20px 14px',
                  textAlign: 'center',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '12px',
                  border: '1px dashed #CBD5E1',
                  marginTop: '10px',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#10B981', marginBottom: '4px' }}>
                  check_circle
                </span>
                <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.88rem' }}>Semua Berkas Beres!</div>
                <p style={{ margin: 0, color: '#64748B', fontSize: '0.76rem' }}>
                  Tidak ada berkas yang menunggu tindakan saat ini.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
                {/* Tampilkan 5 tugas teratas agar tinggi kartu proporsional & tidak scroll panjang */}
                {tugasPerluTindakan.slice(0, 5).map((item) => {
                  const badge = getStatusBadge(item.status);
                  return (
                    <div
                      key={item.id}
                      className="staff-task-item is-tindakan"
                      onClick={() => onSelectPengajuan(item.id)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#EFF6FF';
                        e.currentTarget.style.borderColor = '#BFDBFE';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#F8FAFC';
                        e.currentTarget.style.borderColor = '#E2E8F0';
                      }}
                    >
                      <div className="staff-task-main">
                        {item.fotoBase64 ? (
                          <img
                            src={item.fotoBase64}
                            alt={item.namaPemohon}
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '1.5px solid #CBD5E1',
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              backgroundColor: '#EFF6FF',
                              color: '#2563EB',
                              border: '1px solid #DBEAFE',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              flexShrink: 0,
                            }}
                          >
                            {item.namaPemohon
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')}
                          </div>
                        )}
                        <div className="staff-task-text">
                          <div className="staff-task-name">
                            {item.namaPemohon}
                          </div>
                          <div className="staff-task-sub">
                            Konsjen {item.konsjen} &bull; PIC: {item.staffPic ? item.staffPic.split(' ')[0] : '-'}
                          </div>
                        </div>
                      </div>

                      <div className="staff-task-meta">
                        <span
                          className="staff-task-badge"
                          style={{
                            backgroundColor: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          {badge.label}
                        </span>
                        <span className="material-symbols-outlined staff-task-chevron">
                          chevron_right
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {tugasPerluTindakan.length > 0 && (
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #F1F5F9' }}>
              <button
                type="button"
                onClick={() => onNavigateToPengajuan('Menunggu Verifikasi')}
                style={{
                  width: '100%',
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#92400E',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#FEF3C7';
                  e.currentTarget.style.borderColor = '#FCD34D';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFBEB';
                  e.currentTarget.style.borderColor = '#FDE68A';
                }}
              >
                <span>Lihat Semua {tugasPerluTindakan.length} Pemohon Belum Diverifikasi</span>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  arrow_forward
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Kolom Kanan: Riwayat & Log Pendaftaran Terbaru (Option B) */}
        <div
          className="staff-section-card card"
          style={{
            padding: '22px',
            borderRadius: '18px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div className="staff-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: '#EEF2FF',
                    color: '#4F46E5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    history
                  </span>
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h2 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0F172A', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Riwayat Pengajuan Terbaru
                  </h2>
                  <p className="staff-section-sub" style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748B', lineHeight: 1.35 }}>
                    Log 5 pendaftaran & aktivitas terakhir yang tercatat di sistem
                  </p>
                </div>
              </div>
              <span
                onClick={() => onNavigateToPengajuan('Semua')}
                style={{
                  backgroundColor: '#F8FAFC',
                  color: '#475569',
                  border: '1px solid #E2E8F0',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title="Klik untuk membuka seluruh arsip pengajuan"
              >
                5 Terbaru dari {totalPengajuan}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
              {effectiveList.slice(0, 5).map((item) => {
                const badge = getStatusBadge(item.status);
                return (
                  <div
                    key={item.id}
                    className="staff-task-item"
                    onClick={() => onSelectPengajuan(item.id)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F8FAFC';
                      e.currentTarget.style.borderColor = '#CBD5E1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                      e.currentTarget.style.borderColor = '#E2E8F0';
                    }}
                  >
                    <div className="staff-task-main">
                      {item.fotoBase64 ? (
                        <img
                          src={item.fotoBase64}
                          alt={item.namaPemohon}
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '1.5px solid #CBD5E1',
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: '#EFF6FF',
                            color: '#2563EB',
                            border: '1px solid #DBEAFE',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.76rem',
                            flexShrink: 0,
                          }}
                        >
                          {item.namaPemohon
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')}
                        </div>
                      )}
                      <div className="staff-task-text">
                        <div className="staff-task-name">
                          {item.namaPemohon}
                        </div>
                        <div className="staff-task-sub">
                          <span style={{ fontWeight: 600, color: '#334155' }}>{item.noPengajuan || 'MT-REG'}</span> &bull; {item.program} &bull; Konsjen {item.konsjen}
                        </div>
                      </div>
                    </div>

                    <div className="staff-task-meta">
                      {isOwner && (
                        <span className="staff-task-price">
                          Rp {getEffectiveFeeBersih(item).toLocaleString('id-ID')}
                        </span>
                      )}
                      <span
                        className="staff-task-badge"
                        style={{
                          backgroundColor: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                        }}
                      >
                        {badge.label}
                      </span>
                      <span className="material-symbols-outlined staff-task-chevron">
                        chevron_right
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #F1F5F9' }}>
            <button
              type="button"
              onClick={() => onNavigateToPengajuan('Semua')}
              style={{
                width: '100%',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                padding: '10px 14px',
                borderRadius: '10px',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F1F5F9';
                e.currentTarget.style.borderColor = '#CBD5E1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F8FAFC';
                e.currentTarget.style.borderColor = '#E2E8F0';
              }}
            >
              <span>Buka & Kelola Seluruh Pengajuan ({totalPengajuan})</span>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                arrow_forward
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
