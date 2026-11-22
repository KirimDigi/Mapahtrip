import React, { useState, useMemo } from 'react';
import type { Pengajuan, KonsjenKota } from '../types';
import { getEffectiveFeeBersih } from '../utils/financialCalculations';

interface RekapViewProps {
  pengajuanList?: Pengajuan[];
}

export const RekapView: React.FC<RekapViewProps> = ({ pengajuanList = [] }) => {
  const [activeSubTab, setActiveSubTab] = useState<'konsjen' | 'staff'>('konsjen');

  const formatRupiah = (val: number) => {
    return 'Rp\u00A0' + Number(val || 0).toLocaleString('id-ID');
  };

  const KONSJEN_CITIES: KonsjenKota[] = ['Jakarta', 'Surabaya', 'Medan', 'Denpasar', 'Makassar'];

  // Agregasi Realtime Dinamis per Wilayah Konsulat
  const rekapKonsjen = useMemo(() => {
    return KONSJEN_CITIES.map((kota) => {
      const items = pengajuanList.filter((p) => p.konsjen === kota);
      const totalPengajuan = items.length;
      const selesai = items.filter((p) => p.status === 'Selesai' || (p.tglSelesai && p.tglSelesai !== '-')).length;
      const proses = items.filter((p) =>
        p.status !== 'Selesai' &&
        (!p.tglSelesai || p.tglSelesai === '-') &&
        (p.status === 'Sedang Diproses' || p.status === 'Apply Hari Ini' || (p.tglApply && p.tglApply !== '-'))
      ).length;
      const ditolak = items.filter((p) => p.status === 'Ditolak').length;
      // Hanya menghitung transaksi lunas untuk laba bersih
      const lunasItems = items.filter((p) => p.statusPembayaran !== 'Menunggu Pembayaran');
      const feeBersih = lunasItems.reduce((sum, p) => sum + getEffectiveFeeBersih(p), 0);

      return {
        kota,
        totalPengajuan,
        selesai,
        proses,
        ditolak,
        feeBersih,
      };
    });
  }, [pengajuanList]);

  const totalKonsjenStats = useMemo(() => {
    return rekapKonsjen.reduce(
      (acc, k) => ({
        total: acc.total + k.totalPengajuan,
        selesai: acc.selesai + k.selesai,
        proses: acc.proses + k.proses,
        ditolak: acc.ditolak + k.ditolak,
        feeBersih: acc.feeBersih + k.feeBersih,
      }),
      { total: 0, selesai: 0, proses: 0, ditolak: 0, feeBersih: 0 }
    );
  }, [rekapKonsjen]);

  // Agregasi Realtime Dinamis per Staff PIC & Owner (Waiver)
  const isApplicantWaiver = (p: Pengajuan) => {
    const prog = (p.program || '').toLowerCase();
    const pic = (p.staffPic || '').toLowerCase();
    return (
      prog.includes('waiver') ||
      prog.includes('e-visa') ||
      prog.includes('evisa') ||
      pic.includes('admin') ||
      pic.includes('owner')
    );
  };

  const STAFF_CONFIG = [
    { nama: 'Admin (Owner)', inisial: '👑', wilayah: 'Online (Waiver)', isAdmin: true },
    { nama: 'Rizky', inisial: 'RZ', wilayah: 'Jakarta', isAdmin: false },
    { nama: 'Nanami Kay', inisial: 'NK', wilayah: 'Surabaya', isAdmin: false },
    { nama: 'Heru', inisial: 'HR', wilayah: 'Medan', isAdmin: false },
    { nama: 'Yulia', inisial: 'YL', wilayah: 'Denpasar', isAdmin: false },
    { nama: 'Latifah', inisial: 'LT', wilayah: 'Makassar', isAdmin: false },
    { nama: 'Ulla', inisial: 'UL', wilayah: 'Konsulat Operasional', isAdmin: false },
  ];

  const rekapStaff = useMemo(() => {
    return STAFF_CONFIG.map((staff) => {
      const items = pengajuanList.filter((p) => {
        if (staff.isAdmin) {
          return isApplicantWaiver(p);
        }
        // Staf konsulat operasional tidak menangani Waiver (waiver langsung ditangani Admin / Owner)
        if (isApplicantWaiver(p)) {
          return false;
        }
        if (p.staffPic && p.staffPic.trim() !== '') {
          return p.staffPic.toLowerCase().includes(staff.nama.toLowerCase());
        }
        return p.konsjen === staff.wilayah;
      });
      const jumlahApply = items.length;
      const selesai = items.filter((p) => p.status === 'Selesai' || (p.tglSelesai && p.tglSelesai !== '-')).length;
      const proses = items.filter((p) =>
        p.status !== 'Selesai' &&
        (!p.tglSelesai || p.tglSelesai === '-') &&
        (p.status === 'Sedang Diproses' || p.status === 'Apply Hari Ini' || (p.tglApply && p.tglApply !== '-'))
      ).length;
      // Hanya menghitung transaksi lunas untuk keuangan & laba bersih staf
      const lunasStaffItems = items.filter((p) => p.statusPembayaran !== 'Menunggu Pembayaran');
      const nominalKeluar = lunasStaffItems.reduce((sum, p) => sum + (p.nominalKeluar || 0), 0);
      const cashback = lunasStaffItems.reduce((sum, p) => sum + (p.cashback || 0), 0);
      const feeBersih = lunasStaffItems.reduce((sum, p) => sum + getEffectiveFeeBersih(p), 0);

      return {
        ...staff,
        jumlahApply,
        selesai,
        proses,
        nominalKeluar,
        cashback,
        feeBersih,
      };
    });
  }, [pengajuanList]);

  const totalStaffStats = useMemo(() => {
    return rekapStaff.reduce(
      (acc, s) => ({
        jumlahApply: acc.jumlahApply + s.jumlahApply,
        selesai: acc.selesai + s.selesai,
        proses: acc.proses + s.proses,
        nominalKeluar: acc.nominalKeluar + s.nominalKeluar,
        cashback: acc.cashback + s.cashback,
        feeBersih: acc.feeBersih + s.feeBersih,
      }),
      { jumlahApply: 0, selesai: 0, proses: 0, nominalKeluar: 0, cashback: 0, feeBersih: 0 }
    );
  }, [rekapStaff]);

  return (
    <div className="rekap-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="rekap-top-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>
              bar_chart
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary)' }}>
              Analitik &amp; Performa
            </span>
          </div>
          <h1 className="rekap-page-title font-serif" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--on-surface)', margin: '0 0 6px' }}>
            Rekap Operasional
          </h1>
          <p className="rekap-page-subtitle" style={{ color: 'var(--on-surface-variant)', fontSize: '0.9rem', margin: 0 }}>
            Performa volume, status berkas berjalan, dan keberhasilan per wilayah Konsulat Jenderal dan Staff PIC.
          </p>
        </div>

        {/* Toggle subtab */}
        <div className="rekap-subtab-toggle" style={{ display: 'flex', gap: '8px', background: 'var(--surface-container-low)', padding: '4px', borderRadius: '9999px' }}>
          <button
            onClick={() => setActiveSubTab('konsjen')}
            style={{
              padding: '6px 18px',
              borderRadius: '9999px',
              border: 'none',
              background: activeSubTab === 'konsjen' ? '#ffffff' : 'transparent',
              color: activeSubTab === 'konsjen' ? 'var(--primary)' : 'var(--on-surface-variant)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: activeSubTab === 'konsjen' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Rekap Konsjen
          </button>
          <button
            onClick={() => setActiveSubTab('staff')}
            style={{
              padding: '6px 18px',
              borderRadius: '9999px',
              border: 'none',
              background: activeSubTab === 'staff' ? '#ffffff' : 'transparent',
              color: activeSubTab === 'staff' ? 'var(--primary)' : 'var(--on-surface-variant)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: activeSubTab === 'staff' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Rekap Staff PIC
          </button>
        </div>
      </div>

      {activeSubTab === 'konsjen' ? (
        <div className="card rekap-main-card">
          <div className="rekap-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 className="rekap-section-title font-serif" style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
              Rekapitulasi 5 Konsulat Jenderal Jepang
            </h3>
            <span className="rekap-section-badge" style={{ fontSize: '0.78rem', backgroundColor: '#EFF6FF', color: '#1E40AF', padding: '4px 12px', borderRadius: '20px', fontWeight: 700, border: '1px solid #DBEAFE' }}>
              Data Real-Time ({totalKonsjenStats.total} Pengajuan)
            </span>
          </div>

          {/* Tabel Lengkap (Khusus Layar Komputer / Desktop) */}
          <div className="data-table-container rekap-desktop-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ whiteSpace: 'nowrap' }}>Wilayah Konsulat</th>
                  <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Total Apply</th>
                  <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Selesai</th>
                  <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Proses</th>
                  <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Ditolak</th>
                  <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Success Rate</th>
                  <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Fee Bersih</th>
                </tr>
              </thead>
              <tbody>
                {rekapKonsjen.map((k) => {
                  const denom = k.selesai + k.ditolak;
                  const rate = denom > 0 ? ((k.selesai / denom) * 100).toFixed(1) : '100.0';
                  return (
                    <tr key={k.kota}>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Konsjen {k.kota}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, whiteSpace: 'nowrap' }}>{k.totalPengajuan}</td>
                      <td style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 700, whiteSpace: 'nowrap' }}>{k.selesai}</td>
                      <td style={{ textAlign: 'center', color: k.proses > 0 ? '#C2410C' : '#64748B', fontWeight: k.proses > 0 ? 800 : 500, whiteSpace: 'nowrap' }}>
                        {k.proses > 0 ? (
                          <span style={{ backgroundColor: '#FFF7ED', color: '#C2410C', padding: '2px 8px', borderRadius: '12px', fontSize: '0.78rem' }}>
                            {k.proses}
                          </span>
                        ) : (
                          '0'
                        )}
                      </td>
                      <td style={{ textAlign: 'center', color: k.ditolak > 0 ? 'var(--error)' : '#94A3B8', fontWeight: k.ditolak > 0 ? 700 : 400, whiteSpace: 'nowrap' }}>
                        {k.ditolak}
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <span className="badge badge-success">{rate}%</span>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                        {formatRupiah(k.feeBersih)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#F8FAFC', borderTop: '2px solid #CBD5E1', fontWeight: 800 }}>
                  <td style={{ fontWeight: 800, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>TOTAL SELURUH KONSULAT</td>
                  <td style={{ textAlign: 'center', fontWeight: 800, whiteSpace: 'nowrap' }}>{totalKonsjenStats.total}</td>
                  <td style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 800, whiteSpace: 'nowrap' }}>{totalKonsjenStats.selesai}</td>
                  <td style={{ textAlign: 'center', color: '#C2410C', fontWeight: 800, whiteSpace: 'nowrap' }}>
                    <span style={{ backgroundColor: '#FFF7ED', color: '#C2410C', padding: '2px 10px', borderRadius: '12px', fontSize: '0.80rem' }}>
                      {totalKonsjenStats.proses}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', color: 'var(--error)', fontWeight: 800, whiteSpace: 'nowrap' }}>{totalKonsjenStats.ditolak}</td>
                  <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <span className="badge badge-success">
                      {totalKonsjenStats.selesai + totalKonsjenStats.ditolak > 0
                        ? ((totalKonsjenStats.selesai / (totalKonsjenStats.selesai + totalKonsjenStats.ditolak)) * 100).toFixed(1)
                        : '100.0'}
                      %
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                    {formatRupiah(totalKonsjenStats.feeBersih)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Kartu Khusus Layar HP / Mobile (Tanpa Scroll Horisontal & Terpotong) */}
          <div className="rekap-mobile-cards">
            {rekapKonsjen.map((k) => {
              const denom = k.selesai + k.ditolak;
              const rate = denom > 0 ? ((k.selesai / denom) * 100).toFixed(1) : '100.0';
              return (
                <div
                  key={k.kota}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '14px',
                    padding: '14px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  {/* Header: Nama Kota & Success Rate */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: '#EFF6FF',
                          color: '#2563EB',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                          location_city
                        </span>
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A' }}>Konsjen {k.kota}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Wilayah Operasional Resmi</div>
                      </div>
                    </div>
                    <span className="badge badge-success" style={{ fontSize: '0.74rem', padding: '3px 8px' }}>
                      {rate}% Sukses
                    </span>
                  </div>

                  {/* 4-Box Metrics Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                    <div style={{ backgroundColor: '#F8FAFC', padding: '8px 4px', borderRadius: '8px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '0.64rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Total</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>{k.totalPengajuan}</div>
                    </div>
                    <div style={{ backgroundColor: '#F8FAFC', padding: '8px 4px', borderRadius: '8px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '0.64rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Selesai</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>{k.selesai}</div>
                    </div>
                    <div style={{ backgroundColor: '#F8FAFC', padding: '8px 4px', borderRadius: '8px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '0.64rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Proses</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: k.proses > 0 ? '#D97706' : '#94A3B8', marginTop: '2px' }}>{k.proses}</div>
                    </div>
                    <div style={{ backgroundColor: '#F8FAFC', padding: '8px 4px', borderRadius: '8px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '0.64rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Tolak</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: k.ditolak > 0 ? '#DC2626' : '#94A3B8', marginTop: '2px' }}>{k.ditolak}</div>
                    </div>
                  </div>

                  {/* Footer: Fee Bersih */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '8px 12px',
                    }}
                  >
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                      Fee Bersih Wilayah
                    </span>
                    <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A', fontFamily: 'monospace' }}>
                      {formatRupiah(k.feeBersih)}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Card Total Seluruh Konsulat (Summary Ringkasan Nasional) */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1.5px solid #BFDBFE',
                borderRadius: '14px',
                padding: '14px',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                marginTop: '4px',
              }}
            >
              {/* Header: Total Seluruh Konsulat & Success Rate */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: '#EFF6FF',
                      color: '#2563EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      account_balance
                    </span>
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A' }}>Total Seluruh Konsulat</div>
                    <div style={{ fontSize: '0.72rem', color: '#2563EB', fontWeight: 600 }}>Rekapitulasi 4 Wilayah Konsjen</div>
                  </div>
                </div>
                <span className="badge badge-success" style={{ fontSize: '0.74rem', padding: '3px 8px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {totalKonsjenStats.selesai + totalKonsjenStats.ditolak > 0
                    ? ((totalKonsjenStats.selesai / (totalKonsjenStats.selesai + totalKonsjenStats.ditolak)) * 100).toFixed(1)
                    : '100.0'}% Selesai
                </span>
              </div>

              {/* 4-Box Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                <div style={{ backgroundColor: '#EFF6FF', padding: '8px 4px', borderRadius: '8px', textAlign: 'center', border: '1px solid #BFDBFE' }}>
                  <div style={{ fontSize: '0.64rem', color: '#1D4ED8', fontWeight: 700, textTransform: 'uppercase' }}>Total</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1E40AF', marginTop: '2px' }}>{totalKonsjenStats.total}</div>
                </div>
                <div style={{ backgroundColor: '#F0FDF4', padding: '8px 4px', borderRadius: '8px', textAlign: 'center', border: '1px solid #BBF7D0' }}>
                  <div style={{ fontSize: '0.64rem', color: '#15803D', fontWeight: 700, textTransform: 'uppercase' }}>Selesai</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#166534', marginTop: '2px' }}>{totalKonsjenStats.selesai}</div>
                </div>
                <div style={{ backgroundColor: '#FFFBEB', padding: '8px 4px', borderRadius: '8px', textAlign: 'center', border: '1px solid #FDE68A' }}>
                  <div style={{ fontSize: '0.64rem', color: '#B45309', fontWeight: 700, textTransform: 'uppercase' }}>Proses</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: totalKonsjenStats.proses > 0 ? '#D97706' : '#94A3B8', marginTop: '2px' }}>{totalKonsjenStats.proses}</div>
                </div>
                <div style={{ backgroundColor: '#FEF2F2', padding: '8px 4px', borderRadius: '8px', textAlign: 'center', border: '1px solid #FECACA' }}>
                  <div style={{ fontSize: '0.64rem', color: '#B91C1C', fontWeight: 700, textTransform: 'uppercase' }}>Tolak</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: totalKonsjenStats.ditolak > 0 ? '#DC2626' : '#94A3B8', marginTop: '2px' }}>{totalKonsjenStats.ditolak}</div>
                </div>
              </div>

              {/* Footer Total Bersih */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '8px',
                  padding: '8px 12px',
                }}
              >
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase' }}>
                  Total Fee Bersih Nasional
                </span>
                <span style={{ fontSize: '0.98rem', fontWeight: 800, color: '#1D4ED8', fontFamily: 'monospace' }}>
                  {formatRupiah(totalKonsjenStats.feeBersih)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card rekap-main-card">
          <div className="rekap-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 className="rekap-section-title font-serif" style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
              Rekapitulasi Kinerja Staff PIC
            </h3>
            <span className="rekap-section-badge" style={{ fontSize: '0.78rem', backgroundColor: '#F1F5F9', color: '#475569', padding: '4px 12px', borderRadius: '20px', fontWeight: 700 }}>
              {rekapStaff.length} Personel (6 Staf + Owner)
            </span>
          </div>

          {/* Tabel Lengkap (Khusus Layar Komputer / Desktop) */}
          <div className="data-table-container rekap-desktop-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ whiteSpace: 'nowrap' }}>Staff PIC</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Konsjen</th>
                  <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Apply</th>
                  <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Selesai</th>
                  <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Proses</th>
                  <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Modal Keluar</th>
                  <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Fee Staf</th>
                  <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Fee Bersih</th>
                </tr>
              </thead>
              <tbody>
                {rekapStaff.map((s) => (
                  <tr key={s.nama} style={{ backgroundColor: s.isAdmin ? '#FFFDF7' : undefined }}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: s.isAdmin ? '#FEF3C7' : '#F1F5F9',
                            color: s.isAdmin ? '#92400E' : '#1E293B',
                            border: s.isAdmin ? '1.5px solid #FCD34D' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: s.inisial.length > 2 ? '0.70rem' : '0.75rem',
                            flexShrink: 0,
                          }}
                        >
                          {s.inisial}
                        </div>
                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {s.nama}
                          {s.isAdmin && (
                            <span
                              style={{
                                fontSize: '0.65rem',
                                backgroundColor: '#FEF3C7',
                                color: '#92400E',
                                border: '1px solid #FCD34D',
                                borderRadius: '10px',
                                padding: '1px 6px',
                                fontWeight: 700,
                              }}
                            >
                              Owner
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 600, color: s.isAdmin ? '#D97706' : 'var(--primary)' }}>{s.wilayah}</span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, whiteSpace: 'nowrap' }}>{s.jumlahApply}</td>
                    <td style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 700, whiteSpace: 'nowrap' }}>{s.selesai}</td>
                    <td style={{ textAlign: 'center', color: s.proses > 0 ? '#C2410C' : '#64748B', fontWeight: s.proses > 0 ? 800 : 500, whiteSpace: 'nowrap' }}>
                      {s.proses > 0 ? (
                        <span style={{ backgroundColor: '#FFF7ED', color: '#C2410C', padding: '2px 8px', borderRadius: '12px', fontSize: '0.78rem' }}>
                          {s.proses}
                        </span>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {formatRupiah(s.nominalKeluar)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#15803D', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {formatRupiah(s.cashback)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>
                      {formatRupiah(s.feeBersih)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#F8FAFC', borderTop: '2px solid #CBD5E1', fontWeight: 800 }}>
                  <td colSpan={2} style={{ fontWeight: 800, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>TOTAL TIM OPERASIONAL</td>
                  <td style={{ textAlign: 'center', fontWeight: 800, whiteSpace: 'nowrap' }}>{totalStaffStats.jumlahApply}</td>
                  <td style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 800, whiteSpace: 'nowrap' }}>{totalStaffStats.selesai}</td>
                  <td style={{ textAlign: 'center', color: '#C2410C', fontWeight: 800, whiteSpace: 'nowrap' }}>
                    <span style={{ backgroundColor: '#FFF7ED', color: '#C2410C', padding: '2px 10px', borderRadius: '12px', fontSize: '0.80rem' }}>
                      {totalStaffStats.proses}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, whiteSpace: 'nowrap' }}>
                    {formatRupiah(totalStaffStats.nominalKeluar)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#15803D', whiteSpace: 'nowrap' }}>
                    {formatRupiah(totalStaffStats.cashback)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap' }}>
                    {formatRupiah(totalStaffStats.feeBersih)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Kartu Khusus Layar HP / Mobile: Rekap Staff PIC */}
          <div className="rekap-mobile-cards">
            {rekapStaff.map((s) => (
              <div
                key={s.nama}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '14px',
                  padding: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                {/* Header: Avatar, Nama & Wilayah */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: s.isAdmin ? '#FEF3C7' : '#EFF6FF',
                        color: s.isAdmin ? '#92400E' : '#1D4ED8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        border: s.isAdmin ? '1.5px solid #FCD34D' : '1.5px solid #BFDBFE',
                        flexShrink: 0,
                      }}
                    >
                      {s.inisial}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {s.nama}
                        {s.isAdmin && (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              backgroundColor: '#FEF3C7',
                              color: '#92400E',
                              border: '1px solid #FCD34D',
                              borderRadius: '10px',
                              padding: '1px 6px',
                              fontWeight: 700,
                            }}
                          >
                            Owner
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: s.isAdmin ? '#D97706' : '#2563EB', fontWeight: 600 }}>
                        {s.isAdmin ? 'Penanggung Jawab Waiver (Owner)' : `PIC Konsjen ${s.wilayah}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ backgroundColor: '#DCFCE7', color: '#15803D', fontSize: '0.74rem', fontWeight: 800, padding: '3px 8px', borderRadius: '12px' }}>
                      {s.selesai} Selesai
                    </span>
                  </div>
                </div>

                {/* Grid 2x2: Volume, Proses, Modal, Cashback */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                  <div style={{ backgroundColor: '#F8FAFC', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.64rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Volume Apply</div>
                    <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0F172A', marginTop: '1px' }}>
                      {s.jumlahApply} <span style={{ fontSize: '0.72rem', fontWeight: 500, color: '#64748B' }}>pemohon</span>
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#F8FAFC', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.64rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Sedang Proses</div>
                    <div style={{ fontSize: '0.96rem', fontWeight: 800, color: s.proses > 0 ? '#D97706' : '#64748B', marginTop: '1px' }}>
                      {s.proses} <span style={{ fontSize: '0.72rem', fontWeight: 500, color: '#64748B' }}>pemohon</span>
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#F8FAFC', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.64rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Modal Keluar</div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0F172A', fontFamily: 'monospace', marginTop: '1px' }}>
                      {formatRupiah(s.nominalKeluar)}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#F8FAFC', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.64rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Cashback Mitra</div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0F172A', fontFamily: 'monospace', marginTop: '1px' }}>
                      {formatRupiah(s.cashback)}
                    </div>
                  </div>
                </div>

                {/* Footer: Fee Bersih */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '8px 12px',
                  }}
                >
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                    Fee Bersih (Laba)
                  </span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A', fontFamily: 'monospace' }}>
                    {formatRupiah(s.feeBersih)}
                  </span>
                </div>
              </div>
            ))}

            {/* Summary Total Tim Staff (Ringkasan Bersih & Rapi) */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
                marginTop: '4px',
              }}
            >
              {/* Header Ringkasan */}
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#F8FAFC',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#2563EB' }}>
                    account_balance_wallet
                  </span>
                  <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Total Tim Operasional
                  </span>
                </div>
                <span
                  style={{
                    backgroundColor: '#DCFCE7',
                    color: '#15803D',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    border: '1px solid #BBF7D0',
                  }}
                >
                  {totalStaffStats.selesai} Selesai
                </span>
              </div>

              {/* Rincian Angka (List Key-Value yang Rapi & Sejajar) */}
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Total Pengajuan Apply</span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A' }}>
                    {totalStaffStats.jumlahApply} Pemohon
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Sedang Proses</span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: totalStaffStats.proses > 0 ? '#D97706' : '#64748B' }}>
                    {totalStaffStats.proses} Pemohon
                  </span>
                </div>

                <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '2px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Modal Konsuler</span>
                  <span style={{ fontSize: '0.90rem', fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>
                    {formatRupiah(totalStaffStats.nominalKeluar)}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Cashback Mitra</span>
                  <span style={{ fontSize: '0.90rem', fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>
                    {formatRupiah(totalStaffStats.cashback)}
                  </span>
                </div>
              </div>

              {/* Footer Total Bersih */}
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#EFF6FF',
                  borderTop: '1px solid #BFDBFE',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase' }}>
                    Total Fee Bersih Tim
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#3B82F6' }}>Akumulasi laba bersih</div>
                </div>
                <span style={{ fontSize: '1.10rem', fontWeight: 800, color: '#1D4ED8', fontFamily: 'monospace' }}>
                  {formatRupiah(totalStaffStats.feeBersih)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
