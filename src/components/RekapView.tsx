import React, { useState, useMemo } from 'react';
import type { Pengajuan, KonsjenKota } from '../types';

interface RekapViewProps {
  pengajuanList?: Pengajuan[];
}

export const RekapView: React.FC<RekapViewProps> = ({ pengajuanList = [] }) => {
  const [activeSubTab, setActiveSubTab] = useState<'konsjen' | 'staff'>('konsjen');

  const formatRupiah = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  const KONSJEN_CITIES: KonsjenKota[] = ['Jakarta', 'Surabaya', 'Medan', 'Denpasar', 'Makassar'];

  // Agregasi Realtime Dinamis per Wilayah Konsulat
  const rekapKonsjen = useMemo(() => {
    return KONSJEN_CITIES.map((kota) => {
      const items = pengajuanList.filter((p) => p.konsjen === kota);
      const totalPengajuan = items.length;
      const selesai = items.filter((p) => p.status === 'Selesai' || (p.tglSelesai && p.tglSelesai !== '-')).length;
      const proses = items.filter((p) =>
        p.status === 'Sedang Diproses' ||
        p.status === 'Apply Hari Ini' ||
        (p.tglApply && p.tglApply !== '-' && (!p.tglSelesai || p.tglSelesai === '-'))
      ).length;
      const ditolak = items.filter((p) => p.status === 'Ditolak').length;
      const feeBersih = items.reduce((sum, p) => sum + (p.feeBersih || 0), 0);

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

  // Agregasi Realtime Dinamis per Staff PIC
  const STAFF_CONFIG = [
    { nama: 'Rizky', inisial: 'RZ', wilayah: 'Jakarta' },
    { nama: 'Nanami Kay', inisial: 'NK', wilayah: 'Surabaya' },
    { nama: 'Heru', inisial: 'HR', wilayah: 'Medan' },
    { nama: 'Yulia', inisial: 'YL', wilayah: 'Denpasar' },
    { nama: 'Latifah', inisial: 'LT', wilayah: 'Makassar' },
  ];

  const rekapStaff = useMemo(() => {
    return STAFF_CONFIG.map((staff) => {
      const items = pengajuanList.filter(
        (p) =>
          (p.staffPic && p.staffPic.toLowerCase().includes(staff.nama.toLowerCase())) ||
          p.konsjen === staff.wilayah
      );
      const jumlahApply = items.length;
      const selesai = items.filter((p) => p.status === 'Selesai' || (p.tglSelesai && p.tglSelesai !== '-')).length;
      const proses = items.filter((p) =>
        p.status === 'Sedang Diproses' ||
        p.status === 'Apply Hari Ini' ||
        (p.tglApply && p.tglApply !== '-' && (!p.tglSelesai || p.tglSelesai === '-'))
      ).length;
      const nominalKeluar = items.reduce((sum, p) => sum + (p.nominalKeluar || 0), 0);
      const cashback = items.reduce((sum, p) => sum + (p.cashback || 0), 0);
      const feeBersih = items.reduce((sum, p) => sum + (p.feeBersih || 0), 0);

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
                  <th>Wilayah Konsulat</th>
                  <th style={{ textAlign: 'center' }}>Total Pengajuan</th>
                  <th style={{ textAlign: 'center' }}>Selesai / Terbit</th>
                  <th style={{ textAlign: 'center' }}>Sedang Proses</th>
                  <th style={{ textAlign: 'center' }}>Ditolak</th>
                  <th style={{ textAlign: 'center' }}>Success Rate</th>
                  <th style={{ textAlign: 'right' }}>Total Fee Bersih</th>
                </tr>
              </thead>
              <tbody>
                {rekapKonsjen.map((k) => {
                  const denom = k.selesai + k.ditolak;
                  const rate = denom > 0 ? ((k.selesai / denom) * 100).toFixed(1) : '100.0';
                  return (
                    <tr key={k.kota}>
                      <td style={{ fontWeight: 600 }}>Konsjen {k.kota}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{k.totalPengajuan}</td>
                      <td style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 700 }}>{k.selesai}</td>
                      <td style={{ textAlign: 'center', color: k.proses > 0 ? '#C2410C' : '#64748B', fontWeight: k.proses > 0 ? 800 : 500 }}>
                        {k.proses > 0 ? (
                          <span style={{ backgroundColor: '#FFF7ED', color: '#C2410C', padding: '2px 8px', borderRadius: '12px', fontSize: '0.78rem' }}>
                            {k.proses}
                          </span>
                        ) : (
                          '0'
                        )}
                      </td>
                      <td style={{ textAlign: 'center', color: k.ditolak > 0 ? 'var(--error)' : '#94A3B8', fontWeight: k.ditolak > 0 ? 700 : 400 }}>
                        {k.ditolak}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-success">{rate}%</span>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                        {formatRupiah(k.feeBersih)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#F8FAFC', borderTop: '2px solid #CBD5E1', fontWeight: 800 }}>
                  <td style={{ fontWeight: 800, textTransform: 'uppercase' }}>TOTAL SELURUH KONSULAT</td>
                  <td style={{ textAlign: 'center', fontWeight: 800 }}>{totalKonsjenStats.total}</td>
                  <td style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 800 }}>{totalKonsjenStats.selesai}</td>
                  <td style={{ textAlign: 'center', color: '#C2410C', fontWeight: 800 }}>
                    <span style={{ backgroundColor: '#FFF7ED', color: '#C2410C', padding: '2px 10px', borderRadius: '12px', fontSize: '0.80rem' }}>
                      {totalKonsjenStats.proses}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', color: 'var(--error)', fontWeight: 800 }}>{totalKonsjenStats.ditolak}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-success">
                      {totalKonsjenStats.selesai + totalKonsjenStats.ditolak > 0
                        ? ((totalKonsjenStats.selesai / (totalKonsjenStats.selesai + totalKonsjenStats.ditolak)) * 100).toFixed(1)
                        : '100.0'}
                      %
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: 'var(--primary)' }}>
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

            {/* Card Total Seluruh Konsulat (Summary Ringkasan Bersih & Rapi) */}
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
                    account_balance
                  </span>
                  <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Total Seluruh Konsulat
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
                  {totalKonsjenStats.selesai + totalKonsjenStats.ditolak > 0
                    ? ((totalKonsjenStats.selesai / (totalKonsjenStats.selesai + totalKonsjenStats.ditolak)) * 100).toFixed(1)
                    : '100.0'}% Selesai
                </span>
              </div>

              {/* Rincian Angka Konsulat (List Sejajar Tanpa Kotak Sempit) */}
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Total Pengajuan Nasional</span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A' }}>
                    {totalKonsjenStats.total} Pemohon
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Paspor Selesai / Terbit</span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A' }}>
                    {totalKonsjenStats.selesai} Pemohon
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Sedang Diproses</span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: totalKonsjenStats.proses > 0 ? '#D97706' : '#64748B' }}>
                    {totalKonsjenStats.proses} Pemohon
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Pengajuan Ditolak</span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: totalKonsjenStats.ditolak > 0 ? '#DC2626' : '#64748B' }}>
                    {totalKonsjenStats.ditolak} Pemohon
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
                    Total Fee Bersih (Nasional)
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#3B82F6' }}>Akumulasi laba konsulat</div>
                </div>
                <span style={{ fontSize: '1.10rem', fontWeight: 800, color: '#1D4ED8', fontFamily: 'monospace' }}>
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
              5 Personel Staf Operasional
            </span>
          </div>

          {/* Tabel Lengkap (Khusus Layar Komputer / Desktop) */}
          <div className="data-table-container rekap-desktop-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Staff PIC</th>
                  <th>Konsjen</th>
                  <th style={{ textAlign: 'center' }}>Jumlah Apply</th>
                  <th style={{ textAlign: 'center' }}>Selesai</th>
                  <th style={{ textAlign: 'center' }}>Sedang Proses</th>
                  <th style={{ textAlign: 'right' }}>Nominal Keluar</th>
                  <th style={{ textAlign: 'right' }}>Cashback</th>
                  <th style={{ textAlign: 'right' }}>Fee Bersih</th>
                </tr>
              </thead>
              <tbody>
                {rekapStaff.map((s) => (
                  <tr key={s.nama}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: '#F1F5F9',
                            color: '#1E293B',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            flexShrink: 0,
                          }}
                        >
                          {s.inisial}
                        </div>
                        <div style={{ fontWeight: 600 }}>{s.nama}</div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{s.wilayah}</span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{s.jumlahApply}</td>
                    <td style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 700 }}>{s.selesai}</td>
                    <td style={{ textAlign: 'center', color: s.proses > 0 ? '#C2410C' : '#64748B', fontWeight: s.proses > 0 ? 800 : 500 }}>
                      {s.proses > 0 ? (
                        <span style={{ backgroundColor: '#FFF7ED', color: '#C2410C', padding: '2px 8px', borderRadius: '12px', fontSize: '0.78rem' }}>
                          {s.proses}
                        </span>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                      {formatRupiah(s.nominalKeluar)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#15803D', fontWeight: 600 }}>
                      {formatRupiah(s.cashback)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#0F172A' }}>
                      {formatRupiah(s.feeBersih)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#F8FAFC', borderTop: '2px solid #CBD5E1', fontWeight: 800 }}>
                  <td colSpan={2} style={{ fontWeight: 800, textTransform: 'uppercase' }}>TOTAL TIM OPERASIONAL</td>
                  <td style={{ textAlign: 'center', fontWeight: 800 }}>{totalStaffStats.jumlahApply}</td>
                  <td style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 800 }}>{totalStaffStats.selesai}</td>
                  <td style={{ textAlign: 'center', color: '#C2410C', fontWeight: 800 }}>
                    <span style={{ backgroundColor: '#FFF7ED', color: '#C2410C', padding: '2px 10px', borderRadius: '12px', fontSize: '0.80rem' }}>
                      {totalStaffStats.proses}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800 }}>
                    {formatRupiah(totalStaffStats.nominalKeluar)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#15803D' }}>
                    {formatRupiah(totalStaffStats.cashback)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#0F172A' }}>
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
                        background: '#EFF6FF',
                        color: '#1D4ED8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        border: '1.5px solid #BFDBFE',
                        flexShrink: 0,
                      }}
                    >
                      {s.inisial}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A' }}>{s.nama}</div>
                      <div style={{ fontSize: '0.72rem', color: '#2563EB', fontWeight: 600 }}>PIC Konsjen {s.wilayah}</div>
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
