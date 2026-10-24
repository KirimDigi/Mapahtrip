import React from 'react';
import type { Pengajuan } from '../types';

interface DashboardViewProps {
  pengajuanList: Pengajuan[];
  onSelectPengajuan: (id: string) => void;
  onNavigateToPengajuan: () => void;
  isOwner?: boolean;
  staffName?: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  pengajuanList,
  onSelectPengajuan,
  onNavigateToPengajuan,
  isOwner = false,
  staffName,
}) => {
  // Hitung angka riil akurat 100% dari data yang ada
  const totalPengajuan = pengajuanList.length;
  const listMenungguVerifikasi = pengajuanList.filter((p) => p.status === 'Menunggu Verifikasi');
  const listApplyHariIni = pengajuanList.filter((p) => p.status === 'Apply Hari Ini');
  const listSedangDiproses = pengajuanList.filter((p) => p.status === 'Sedang Diproses');
  const listSiapAmbil = pengajuanList.filter((p) => p.status === 'Siap Ambil');
  const listSelesai = pengajuanList.filter((p) => p.status === 'Selesai');

  // Pengajuan yang butuh tindakan staf segera
  const tugasPerluTindakan = pengajuanList.filter(
    (p) => p.status === 'Menunggu Verifikasi' || p.status === 'Apply Hari Ini' || p.status === 'Siap Ambil'
  );

  const completedList = pengajuanList.filter((p) => p.status === 'Selesai');
  const totalFeeThisMonth = completedList.reduce((sum, p) => sum + (p.feeBersih || 0), 0);

  const formatRupiah = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  const getStatusBadge = (status: Pengajuan['status']) => {
    switch (status) {
      case 'Menunggu Verifikasi':
        return { bg: '#FEF3C7', color: '#B45309', border: '#FDE68A', label: 'Menunggu Verifikasi' };
      case 'Sedang Diproses':
        return { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', label: 'Sedang Diproses' };
      case 'Apply Hari Ini':
        return { bg: '#FFF7ED', color: '#C2410C', border: '#FFEDD5', label: 'Apply Hari Ini' };
      case 'Siap Ambil':
        return { bg: '#ECFDF5', color: '#047857', border: '#A7F3D0', label: 'Siap Ambil' };
      case 'Selesai':
        return { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0', label: 'Selesai' };
      case 'Ditolak':
        return { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA', label: 'Ditolak' };
      default:
        return { bg: '#F1F5F9', color: '#475569', border: '#E2E8F0', label: status };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Header Salam & Informasi Ringkas */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          paddingBottom: '8px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isOwner ? '#F59E0B' : '#005BB5',
              }}
            />
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: isOwner ? '#D97706' : '#005BB5',
              }}
            >
              {isOwner ? '👑 Dashboard Pemilik Bisnis (Owner)' : 'Ringkasan Kerja Staf Operasional'}
            </span>
          </div>

          <h1
            style={{
              fontSize: '1.9rem',
              fontWeight: 800,
              color: '#0F172A',
              margin: '0 0 4px',
              letterSpacing: '-0.02em',
            }}
          >
            {isOwner ? 'Halo, Owner MapahTrip 👋' : `Halo, ${staffName ? staffName.split(' ')[0] : 'Rizky'} 👋`}
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.9rem', margin: 0 }}>
            {isOwner
              ? 'Pantau pergerakan berkas visa, rekap omset, dan pembagian tugas staf secara real-time.'
              : 'Berikut ringkasan tugas pengajuan visa dan agenda kerja Anda hari ini.'}
          </p>
        </div>

        {/* Tombol Navigasi Cepat */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={onNavigateToPengajuan}
            style={{
              backgroundColor: '#005BB5',
              color: '#FFFFFF',
              border: 'none',
              padding: '9px 16px',
              borderRadius: '10px',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(0, 91, 181, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              folder_open
            </span>
            <span>Buka Semua Pengajuan ({totalPengajuan})</span>
          </button>
        </div>
      </div>

      {/* 2. Kartu Status Riil (Angka 100% Sesuai Data Nyata) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Card 1: Total Pengajuan */}
        <div
          className="card"
          style={{
            padding: '20px',
            borderRadius: '16px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B' }}>
              Total Semua Pengajuan
            </span>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                backgroundColor: '#EFF6FF',
                color: '#005BB5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                description
              </span>
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
            {totalPengajuan}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '6px' }}>
            Berkas terdaftar di sistem
          </div>
        </div>

        {/* Card 2: Menunggu Verifikasi */}
        <div
          className="card"
          style={{
            padding: '20px',
            borderRadius: '16px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B' }}>
              Perlu Verifikasi
            </span>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                backgroundColor: '#FEF3C7',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                pending_actions
              </span>
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#D97706', lineHeight: 1 }}>
            {listMenungguVerifikasi.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '6px' }}>
            Berkas pemohon yang perlu dicek
          </div>
        </div>

        {/* Card 3: Sedang Diproses & Apply */}
        <div
          className="card"
          style={{
            padding: '20px',
            borderRadius: '16px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B' }}>
              Proses di Konsulat
            </span>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                backgroundColor: '#EFF6FF',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                sync
              </span>
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#2563EB', lineHeight: 1 }}>
            {listApplyHariIni.length + listSedangDiproses.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '6px' }}>
            {listApplyHariIni.length} apply hari ini &bull; {listSedangDiproses.length} diproses
          </div>
        </div>

        {/* Card 4: Selesai / Terbit / Siap Ambil (atau Keuangan jika Owner) */}
        {isOwner ? (
          <div
            className="card"
            style={{
              padding: '20px',
              borderRadius: '16px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #FDE68A',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.08)',
              background: 'linear-gradient(135deg, #FFFDF5 0%, #FEF9C3 100%)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400E' }}>
                Total Fee Bersih (Bulan Ini)
              </span>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(217, 119, 6, 0.2)',
                  color: '#B45309',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  account_balance_wallet
                </span>
              </div>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#B45309', lineHeight: 1 }}>
              {formatRupiah(totalFeeThisMonth)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#92400E', marginTop: '6px' }}>
              Dari {completedList.length} transaksi visa selesai
            </div>
          </div>
        ) : (
          <div
            className="card"
            style={{
              padding: '20px',
              borderRadius: '16px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B' }}>
                Visa Selesai / Terbit
              </span>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  backgroundColor: '#ECFDF5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  verified
                </span>
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#059669', lineHeight: 1 }}>
              {listSelesai.length + listSiapAmbil.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '6px' }}>
              {listSiapAmbil.length} siap ambil &bull; {listSelesai.length} selesai
            </div>
          </div>
        )}
      </div>

      {/* 3. Dua Bagian Utama yang Sangat Jelas & Mudah Dipahami */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Kolom Kiri: Agenda / Tugas yang Butuh Tindakan Hari Ini */}
        <div
          className="card"
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: '#FEF3C7',
                    color: '#B45309',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    assignment_late
                  </span>
                </div>
                <div>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Tugas Perlu Tindakan
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B' }}>
                    Pemohon yang butuh verifikasi, apply, atau ambil paspor
                  </p>
                </div>
              </div>
              <span
                style={{
                  backgroundColor: tugasPerluTindakan.length > 0 ? '#EFF6FF' : '#F1F5F9',
                  color: tugasPerluTindakan.length > 0 ? '#1D4ED8' : '#64748B',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  padding: '3px 10px',
                  borderRadius: '9999px',
                }}
              >
                {tugasPerluTindakan.length} Tugas
              </span>
            </div>

            {tugasPerluTindakan.length === 0 ? (
              <div
                style={{
                  padding: '28px 16px',
                  textAlign: 'center',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '12px',
                  border: '1px dashed #CBD5E1',
                  marginTop: '12px',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#10B981', marginBottom: '6px' }}>
                  check_circle
                </span>
                <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem' }}>Semua Berkas Beres!</div>
                <p style={{ margin: 0, color: '#64748B', fontSize: '0.78rem' }}>
                  Tidak ada berkas yang menunggu tindakan saat ini.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
                {tugasPerluTindakan.map((item) => {
                  const badge = getStatusBadge(item.status);
                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectPengajuan(item.id)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '12px',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#EFF6FF';
                        e.currentTarget.style.borderColor = '#BFDBFE';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#F8FAFC';
                        e.currentTarget.style.borderColor = '#E2E8F0';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: '#E2E8F0',
                            color: '#1E293B',
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
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: '0.88rem',
                              color: '#0F172A',
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                              overflow: 'hidden',
                            }}
                          >
                            {item.namaPemohon}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                            Konsjen {item.konsjen} &bull; PIC: {item.staffPic ? item.staffPic.split(' ')[0] : '-'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <span
                          style={{
                            backgroundColor: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                          }}
                        >
                          {badge.label}
                        </span>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#94A3B8' }}>
                          chevron_right
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #F1F5F9' }}>
            <button
              type="button"
              onClick={onNavigateToPengajuan}
              style={{
                width: '100%',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                padding: '9px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <span>Buka Halaman Pengajuan Lengkap</span>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                arrow_forward
              </span>
            </button>
          </div>
        </div>

        {/* Kolom Kanan: Daftar 5 Pengajuan Terkini */}
        <div
          className="card"
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: '#F0FDF4',
                    color: '#15803D',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    history
                  </span>
                </div>
                <div>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Pengajuan Terkini
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B' }}>
                    Daftar pemohon yang sedang aktif di sistem
                  </p>
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
                {Math.min(5, pengajuanList.length)} dari {totalPengajuan}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
              {pengajuanList.slice(0, 5).map((item) => {
                const badge = getStatusBadge(item.status);
                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectPengajuan(item.id)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F8FAFC';
                      e.currentTarget.style.borderColor = '#CBD5E1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                      e.currentTarget.style.borderColor = '#E2E8F0';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          backgroundColor: '#F1F5F9',
                          color: '#0F172A',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          flexShrink: 0,
                        }}
                      >
                        {item.namaPemohon
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                      <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: '0.86rem',
                            color: '#0F172A',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                          }}
                        >
                          {item.namaPemohon}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                          {item.program} &bull; {item.konsjen}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span
                        style={{
                          backgroundColor: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                        }}
                      >
                        {badge.label}
                      </span>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#94A3B8' }}>
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
              onClick={onNavigateToPengajuan}
              style={{
                width: '100%',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                padding: '9px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <span>Kelola Seluruh Pengajuan ({totalPengajuan})</span>
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
