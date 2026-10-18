import React, { useState } from 'react';
import type { Pengajuan } from '../types';

interface DashboardViewProps {
  pengajuanList: Pengajuan[];
  onSelectPengajuan: (id: string) => void;
  onNavigateToPengajuan: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  pengajuanList,
  onSelectPengajuan,
  onNavigateToPengajuan,
}) => {
  const [selectedPeriod] = useState('Okt 2026');

  const applyToday = pengajuanList.filter((p) => p.status === 'Apply Hari Ini');
  const readyToPick = pengajuanList.filter((p) => p.status === 'Siap Ambil');
  const inProgress = pengajuanList.filter(
    (p) => p.status === 'Sedang Diproses' || p.status === 'Apply Hari Ini'
  );
  const totalFeeThisMonth = pengajuanList
    .filter((p) => p.status === 'Selesai')
    .reduce((sum, p) => sum + p.feeBersih, 0);

  const formatRupiah = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* 1. Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--secondary)' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--secondary)' }}>
              Operasional Konsuler Terpadu
            </span>
          </div>
          <h1 className="font-serif" style={{ fontSize: '2.1rem', fontWeight: 700, color: 'var(--on-surface)', letterSpacing: '-0.02em' }}>
            Halo, Rizky
          </h1>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.95rem' }}>
            Berikut agenda pengajuan dan ringkasan operasional visa hari ini.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Period selector */}
          <div
            style={{
              padding: '8px 16px',
              borderRadius: '9999px',
              background: '#fff',
              border: '1px solid rgba(195, 198, 214, 0.4)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--secondary)' }}>
              calendar_today
            </span>
            <span>{selectedPeriod}</span>
          </div>

          <button
            className="btn btn-secondary"
            title="Segarkan Data"
            onClick={() => alert('Data operasional diperbarui.')}
            style={{ padding: '8px 12px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              refresh
            </span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => alert('Mengunduh laporan rekap konsuler bulanan...')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--secondary)' }}>
              file_download
            </span>
            <span>Unduh Laporan</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>
              Pengajuan Aktif
            </span>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '20px' }}>
              sync
            </span>
          </div>
          <div className="font-serif" style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--on-surface)' }}>
            {inProgress.length + applyToday.length + 32}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '4px' }}>
            Di 5 Konsulat Jepang se-Indonesia
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>
              Apply Hari Ini
            </span>
            <span className="material-symbols-outlined" style={{ color: 'var(--warning)', fontSize: '20px' }}>
              send_time_extension
            </span>
          </div>
          <div className="font-serif" style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--warning)' }}>
            {applyToday.length + 4}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '4px' }}>
            Jakarta: 3 • Surabaya: 2
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>
              Ambil Visa Besok
            </span>
            <span className="material-symbols-outlined" style={{ color: 'var(--success)', fontSize: '20px' }}>
              assignment_turned_in
            </span>
          </div>
          <div className="font-serif" style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--success)' }}>
            {readyToPick.length + 3}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '4px' }}>
            Siap diambil staff di JVAC &amp; Konsjen
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>
              Fee Bersih Periode Ini
            </span>
            <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '20px' }}>
              payments
            </span>
          </div>
          <div className="font-serif font-mono-tabular" style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--primary)' }}>
            {formatRupiah(totalFeeThisMonth > 0 ? totalFeeThisMonth : 24850000)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '4px', fontWeight: 600 }}>
            ↑ Margin rata-rata 39.2%
          </div>
        </div>
      </div>

      {/* 3. Dual Agenda Cards (Apply Visa vs Ambil Visa) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Left: Apply Visa */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', borderBottom: '1px solid rgba(195, 198, 214, 0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--surface-container-low)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <span className="material-symbols-outlined">send_time_extension</span>
                </div>
                <div>
                  <h2 className="font-serif" style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--on-surface)' }}>
                    Agenda Apply Visa
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>
                    Jadwal pengajuan berkas ke Konsjen
                  </p>
                </div>
              </div>
              <span className="badge badge-info">5 Pengajuan</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
              {pengajuanList
                .filter((p) => p.status === 'Apply Hari Ini' || p.status === 'Menunggu Verifikasi')
                .slice(0, 3)
                .map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onSelectPengajuan(item.id)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: 'var(--surface-container-low)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-container)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface-container-low)')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: 'var(--surface-container-high)',
                          color: 'var(--on-surface)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                        }}
                      >
                        {item.namaPemohon
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.namaPemohon}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                          {item.konsjen} • {item.program}
                        </div>
                      </div>
                    </div>
                    <span className="badge badge-warning">{item.status}</span>
                  </div>
                ))}
            </div>
          </div>

          <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(195, 198, 214, 0.25)', marginTop: '16px' }}>
            <button
              onClick={onNavigateToPengajuan}
              className="btn btn-secondary"
              style={{ width: '100%', fontSize: '0.8rem' }}
            >
              Lihat Seluruh Antrean Apply →
            </button>
          </div>
        </div>

        {/* Right: Ambil Visa */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', borderBottom: '1px solid rgba(195, 198, 214, 0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
                  <span className="material-symbols-outlined">assignment_turned_in</span>
                </div>
                <div>
                  <h2 className="font-serif" style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--on-surface)' }}>
                    Agenda Ambil Visa
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>
                    Paspor siap diambil &amp; dikirimkan ke pemohon
                  </p>
                </div>
              </div>
              <span className="badge badge-success">3 Siap Ambil</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
              {pengajuanList
                .filter((p) => p.status === 'Siap Ambil' || p.status === 'Selesai')
                .slice(0, 3)
                .map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onSelectPengajuan(item.id)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: 'var(--surface-container-low)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-container)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface-container-low)')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: 'var(--success-bg)',
                          color: 'var(--success)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                        }}
                      >
                        {item.namaPemohon
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.namaPemohon}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                          Konsjen {item.konsjen} • Estimasi: {item.tglEstimasiSelesai}
                        </div>
                      </div>
                    </div>
                    <span className="badge badge-success">{item.status}</span>
                  </div>
                ))}
            </div>
          </div>

          <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(195, 198, 214, 0.25)', marginTop: '16px' }}>
            <button
              onClick={onNavigateToPengajuan}
              className="btn btn-secondary"
              style={{ width: '100%', fontSize: '0.8rem' }}
            >
              Lihat Seluruh Paspor Selesai →
            </button>
          </div>
        </div>
      </div>

      {/* 4. Konsjen Operational Overview */}
      <div className="card">
        <h3 className="font-serif" style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>
          Status Kuota &amp; Antrean per Konsulat
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          {[
            { kota: 'Jakarta', total: 112, pic: 'Rizky Muhammad', sla: '5 Hari Kerja', status: 'Lancar' },
            { kota: 'Surabaya', total: 54, pic: 'Nanami Kay', sla: '5 Hari Kerja', status: 'Lancar' },
            { kota: 'Denpasar', total: 28, pic: 'Yulia', sla: '4 Hari Kerja', status: 'Cepat' },
            { kota: 'Medan', total: 18, pic: 'Rizky Muhammad', sla: '6 Hari Kerja', status: 'Normal' },
            { kota: 'Makassar', total: 11, pic: 'Ulla', sla: '6 Hari Kerja', status: 'Normal' },
          ].map((k) => (
            <div
              key={k.kota}
              style={{
                padding: '16px',
                borderRadius: '14px',
                background: 'var(--surface-container-low)',
                border: '1px solid rgba(195, 198, 214, 0.25)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{k.kota}</span>
                <span className="badge badge-success" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                  {k.status}
                </span>
              </div>
              <div className="font-serif" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)', margin: '8px 0 4px' }}>
                {k.total} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--on-surface-variant)' }}>pengajuan</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                PIC: <strong>{k.pic}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
