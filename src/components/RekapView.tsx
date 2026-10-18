import React, { useState } from 'react';

export const RekapView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'konsjen' | 'staff'>('konsjen');

  const formatRupiah = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  const rekapKonsjen = [
    { kota: 'Jakarta', totalPengajuan: 112, selesai: 98, proses: 12, ditolak: 2, feeBersih: 72400000 },
    { kota: 'Surabaya', totalPengajuan: 54, selesai: 46, proses: 7, ditolak: 1, feeBersih: 33800000 },
    { kota: 'Denpasar', totalPengajuan: 28, selesai: 24, proses: 4, ditolak: 0, feeBersih: 18200000 },
    { kota: 'Medan', totalPengajuan: 18, selesai: 15, proses: 3, ditolak: 0, feeBersih: 9600000 },
    { kota: 'Makassar', totalPengajuan: 11, selesai: 9, proses: 2, ditolak: 0, feeBersih: 4437000 },
  ];

  const rekapStaff = [
    { nama: 'Rizky Muhammad', inisial: 'RM', wilayah: 'Jakarta & Medan', totalHandle: 130, selesai: 113, feeDihasilkan: 82000000 },
    { nama: 'Nanami Kay', inisial: 'NK', wilayah: 'Surabaya', totalHandle: 54, selesai: 46, feeDihasilkan: 33800000 },
    { nama: 'Yulia', inisial: 'YL', wilayah: 'Denpasar (Bali)', totalHandle: 28, selesai: 24, feeDihasilkan: 18200000 },
    { nama: 'Ulla', inisial: 'UL', wilayah: 'Makassar', totalHandle: 11, selesai: 9, feeDihasilkan: 4437000 },
  ];

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
          <h1 className="font-serif" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--on-surface)' }}>
            Rekap Operasional
          </h1>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9rem' }}>
            Performa volume dan keberhasilan per wilayah Konsulat Jenderal dan Staff PIC.
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
            }}
          >
            Rekap Staff PIC
          </button>
        </div>
      </div>

      {activeSubTab === 'konsjen' ? (
        <div className="card">
          <h3 className="font-serif" style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>
            Rekapitulasi 5 Konsulat Jenderal Jepang
          </h3>
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
                  const rate = ((k.selesai / (k.selesai + k.ditolak)) * 100).toFixed(1);
                  return (
                    <tr key={k.kota}>
                      <td style={{ fontWeight: 600 }}>Konsjen {k.kota}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{k.totalPengajuan}</td>
                      <td style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 600 }}>{k.selesai}</td>
                      <td style={{ textAlign: 'center', color: 'var(--info)' }}>{k.proses}</td>
                      <td style={{ textAlign: 'center', color: 'var(--error)' }}>{k.ditolak}</td>
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
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <h3 className="font-serif" style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>
            Rekapitulasi Kinerja Staff PIC
          </h3>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Staff PIC</th>
                  <th>Wilayah Tugas</th>
                  <th style={{ textAlign: 'center' }}>Total Handle</th>
                  <th style={{ textAlign: 'center' }}>Selesai</th>
                  <th style={{ textAlign: 'right' }}>Kontribusi Fee Bersih</th>
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
                            background: 'var(--surface-container-high)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                          }}
                        >
                          {s.inisial}
                        </div>
                        <div style={{ fontWeight: 600 }}>{s.nama}</div>
                      </div>
                    </td>
                    <td>{s.wilayah}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{s.totalHandle} pemohon</td>
                    <td style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 600 }}>{s.selesai}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                      {formatRupiah(s.feeDihasilkan)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
