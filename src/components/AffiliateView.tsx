import React from 'react';
import { mockAffiliates } from '../data/mockData';

export const AffiliateView: React.FC = () => {
  const formatRupiah = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  const totalKomisiAll = mockAffiliates.reduce((sum, a) => sum + a.totalKomisi, 0);
  const totalPemohonReferral = mockAffiliates.reduce((sum, a) => sum + a.jumlahPemohon, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>
              group
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary)' }}>
              Mitra &amp; Agen Referral
            </span>
          </div>
          <h1 className="font-serif" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--on-surface)' }}>
            Program Affiliate
          </h1>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9rem' }}>
            Pelacakan 62 kode affiliate dan komisi referral pemohon visa MapahTrip.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => alert('Membuka dialog tambah kode affiliate baru...')}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            add
          </span>
          <span>Tambah Kode Baru</span>
        </button>
      </div>

      {/* KPI stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>
            Total Kode Affiliate
          </div>
          <div className="font-serif" style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--on-surface)', margin: '6px 0 2px' }}>
            62 <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--on-surface-variant)' }}>Mitra</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>LPK, Agensi, &amp; Alumni Tokutei</div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>
            Total Pemohon via Referral
          </div>
          <div className="font-serif" style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--primary)', margin: '6px 0 2px' }}>
            {totalPemohonReferral} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--on-surface-variant)' }}>Orang</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>72% dari total pengajuan visa</div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>
            Total Komisi Terbayar
          </div>
          <div className="font-serif font-mono-tabular" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--secondary)', margin: '6px 0 2px' }}>
            {formatRupiah(totalKomisiAll)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Rata-rata Rp 200.000 - 500.000 / visa</div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <h3 className="font-serif" style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>
          Daftar Mitra Affiliate Teratas
        </h3>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Kode Referral</th>
                <th>Nama Mitra / Institusi</th>
                <th style={{ textAlign: 'center' }}>Total Pemohon</th>
                <th style={{ textAlign: 'right' }}>Total Komisi</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {mockAffiliates.map((aff) => (
                <tr key={aff.code}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                    {aff.code}
                  </td>
                  <td style={{ fontWeight: 600 }}>{aff.namaAffiliate}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{aff.jumlahPemohon} orang</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                    {formatRupiah(aff.totalKomisi)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-success">{aff.status}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => alert(`Melihat detail pemohon dari kode ${aff.code}...`)}
                      style={{ padding: '5px 12px', fontSize: '0.75rem' }}
                    >
                      Lihat Pemohon
                    </button>
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
