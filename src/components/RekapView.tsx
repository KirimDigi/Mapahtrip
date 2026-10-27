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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>
              bar_chart
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary)' }}>
              Analitik &amp; Performa
            </span>
          </div>
          <h1 className="font-serif" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--on-surface)', margin: '0 0 6px' }}>
            Rekap Operasional
          </h1>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9rem', margin: 0 }}>
            Performa volume, status berkas berjalan, dan keberhasilan per wilayah Konsulat Jenderal dan Staff PIC.
          </p>
        </div>

        {/* Toggle subtab */}
        <div style={{ display: 'flex', gap: '8px', background: 'var(--surface-container-low)', padding: '4px', borderRadius: '9999px' }}>
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
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 className="font-serif" style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
              Rekapitulasi 5 Konsulat Jenderal Jepang
            </h3>
            <span style={{ fontSize: '0.78rem', backgroundColor: '#EFF6FF', color: '#1E40AF', padding: '4px 12px', borderRadius: '20px', fontWeight: 700, border: '1px solid #DBEAFE' }}>
              Data Real-Time ({totalKonsjenStats.total} Pengajuan)
            </span>
          </div>

          <div className="data-table-container">
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
        </div>
      ) : (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 className="font-serif" style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
              Rekapitulasi Kinerja Staff PIC
            </h3>
            <span style={{ fontSize: '0.78rem', backgroundColor: '#F1F5F9', color: '#475569', padding: '4px 12px', borderRadius: '20px', fontWeight: 700 }}>
              5 Personel Staf Operasional
            </span>
          </div>

          <div className="data-table-container">
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
        </div>
      )}
    </div>
  );
};
