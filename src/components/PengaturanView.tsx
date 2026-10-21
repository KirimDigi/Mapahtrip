import React from 'react';
import { mockKonsjen, mockStaff } from '../data/mockData';

export const PengaturanView: React.FC = () => {

  const formatRupiah = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>
            settings
          </span>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary)' }}>
            Konfigurasi &amp; Master Data
          </span>
        </div>
        <h1 className="font-serif" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--on-surface)' }}>
          Pengaturan Sistem
        </h1>
        <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9rem' }}>
          Kelola master data Konsulat Jenderal, daftar Staff PIC, tarif konsuler, dan parameter operasional.
        </p>
      </div>

      {/* Konsjen Master Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 className="font-serif" style={{ fontSize: '1.2rem', fontWeight: 700 }}>
            Master Data Konsulat Jenderal (Konsjen)
          </h3>
          <span className="badge badge-success">5 Konsulat Terhubung</span>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Kota Konsulat</th>
                <th>Lokasi Kantor Konsuler</th>
                <th>Staff PIC Default</th>
                <th style={{ textAlign: 'right' }}>Biaya Konsulat</th>
                <th style={{ textAlign: 'center' }}>SLA / Estimasi</th>
                <th style={{ textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {mockKonsjen.map((k) => (
                <tr key={k.id}>
                  <td style={{ fontWeight: 700 }}>{k.kota}</td>
                  <td>{k.lokasi}</td>
                  <td style={{ fontWeight: 600 }}>{k.staffPicDefault}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{formatRupiah(k.biayaKonsulat)}</td>
                  <td style={{ textAlign: 'center' }}>{k.estimasiHariKerja} Hari Kerja</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-success">Aktif</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Master Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 className="font-serif" style={{ fontSize: '1.2rem', fontWeight: 700 }}>
            Master Data Staff Operasional (PIC)
          </h3>
          <span className="badge badge-info">6 Staff Terdaftar</span>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama Staff</th>
                <th>Inisial</th>
                <th>Role &amp; Tanggung Jawab</th>
                <th>Wilayah Konsjen Tugas</th>
                <th style={{ textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {mockStaff.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.nama}</td>
                  <td>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--surface-container)', fontWeight: 700, fontSize: '0.75rem' }}>
                      {s.inisial}
                    </span>
                  </td>
                  <td>{s.role}</td>
                  <td>
                    {s.konsjenTugas.map((t) => (
                      <span
                        key={t}
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          background: 'var(--surface-container-low)',
                          border: '1px solid rgba(195, 198, 214, 0.4)',
                          fontSize: '0.75rem',
                          marginRight: '4px',
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-success">Aktif</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
