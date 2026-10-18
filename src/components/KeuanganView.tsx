import React from 'react';
import type { Pengajuan } from '../types';

interface KeuanganViewProps {
  pengajuanList: Pengajuan[];
}

export const KeuanganView: React.FC<KeuanganViewProps> = ({ pengajuanList }) => {
  const formatRupiah = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  // Aggregated data from File A & File B
  const stats = {
    totalDibayar: 513690000,
    totalNominalKeluar: 346487000,
    totalCashback: 28106000,
    totalFeeBersih: 138437000,
    rataRataMargin: '26.9%',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>
              account_balance_wallet
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary)' }}>
              Arus Kas &amp; Finansial Visa
            </span>
          </div>
          <h1 className="font-serif" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--on-surface)' }}>
            Laporan Keuangan
          </h1>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9rem' }}>
            Rekapitulasi total dana masuk pemohon, biaya keluar konsuler, cashback, dan laba bersih.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={() => alert('Mengunduh Laporan Keuangan Excel...')}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            download
          </span>
          <span>Unduh Buku Kas</span>
        </button>
      </div>

      {/* 4 Financial Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>
            Total Dibayar Pemohon
          </div>
          <div className="font-serif font-mono-tabular" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--on-surface)', margin: '8px 0 4px', whiteSpace: 'nowrap' }}>
            {formatRupiah(stats.totalDibayar)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
            Dari 221 transaksi terverifikasi
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>
            Total Nominal Keluar
          </div>
          <div className="font-serif font-mono-tabular" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--error)', margin: '8px 0 4px', whiteSpace: 'nowrap' }}>
            {formatRupiah(stats.totalNominalKeluar)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
            Biaya visa konsulat &amp; operasional
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>
            Total Cashback Mitra
          </div>
          <div className="font-serif font-mono-tabular" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)', margin: '8px 0 4px', whiteSpace: 'nowrap' }}>
            {formatRupiah(stats.totalCashback)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
            Insentif &amp; return volume
          </div>
        </div>

        <div className="card" style={{ padding: '20px', background: 'linear-gradient(135deg, #eff4ff 0%, #ffffff 100%)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>
            Total Fee Bersih (Laba Bersih)
          </div>
          <div className="font-serif font-mono-tabular" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)', margin: '8px 0 4px', whiteSpace: 'nowrap' }}>
            {formatRupiah(stats.totalFeeBersih)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>
            Margin Laba Rata-rata: {stats.rataRataMargin}
          </div>
        </div>
      </div>

      {/* Financial Transactions List */}
      <div className="card">
        <h3 className="font-serif" style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>
          Rincian Transaksi per Pengajuan
        </h3>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>No. Pengajuan</th>
                <th>Pemohon</th>
                <th>Konsjen</th>
                <th style={{ textAlign: 'right' }}>Dibayar Pemohon</th>
                <th style={{ textAlign: 'right' }}>Nominal Keluar</th>
                <th style={{ textAlign: 'right' }}>Cashback</th>
                <th style={{ textAlign: 'right' }}>Komisi Affiliate</th>
                <th style={{ textAlign: 'right' }}>Fee Bersih</th>
              </tr>
            </thead>
            <tbody>
              {pengajuanList.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.noPengajuan}</td>
                  <td>{item.namaPemohon}</td>
                  <td>Konsjen {item.konsjen}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{formatRupiah(item.dibayarPemohon)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--error)' }}>
                    - {formatRupiah(item.nominalKeluar)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--success)' }}>
                    + {formatRupiah(item.cashback)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--warning)' }}>
                    - {formatRupiah(item.referralFee)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                    {formatRupiah(item.feeBersih)}
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
