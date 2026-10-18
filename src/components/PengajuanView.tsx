import React, { useState } from 'react';
import type { Pengajuan, StatusPengajuan } from '../types';

interface PengajuanViewProps {
  pengajuanList: Pengajuan[];
  onSelectPengajuan: (id: string) => void;
  onOpenNewPengajuan: () => void;
  searchFilter: string;
}

export const PengajuanView: React.FC<PengajuanViewProps> = ({
  pengajuanList,
  onSelectPengajuan,
  onOpenNewPengajuan,
  searchFilter,
}) => {
  const [activeStatusTab, setActiveStatusTab] = useState<string>('Semua');
  const [selectedKonsjen, setSelectedKonsjen] = useState<string>('Semua');
  const [selectedPaket, setSelectedPaket] = useState<string>('Semua');
  const [showMaskedPaspor, setShowMaskedPaspor] = useState<boolean>(true);

  const statusTabs = [
    'Semua',
    'Menunggu Verifikasi',
    'Sedang Diproses',
    'Apply Hari Ini',
    'Siap Ambil',
    'Selesai',
    'Ditolak',
  ];

  const filteredData = pengajuanList.filter((item) => {
    // Status filter
    if (activeStatusTab !== 'Semua' && item.status !== activeStatusTab) {
      return false;
    }
    // Konsjen filter
    if (selectedKonsjen !== 'Semua' && item.konsjen !== selectedKonsjen) {
      return false;
    }
    // Paket filter
    if (selectedPaket !== 'Semua' && item.paket !== selectedPaket) {
      return false;
    }
    // Search query
    if (searchFilter.trim() !== '') {
      const q = searchFilter.toLowerCase();
      const matchName = item.namaPemohon.toLowerCase().includes(q);
      const matchPaspor = item.noPaspor.toLowerCase().includes(q);
      const matchNoPengajuan = item.noPengajuan.toLowerCase().includes(q);
      const matchAffiliate = item.affiliateCode?.toLowerCase().includes(q);
      if (!matchName && !matchPaspor && !matchNoPengajuan && !matchAffiliate) {
        return false;
      }
    }
    return true;
  });

  const getStatusBadge = (status: StatusPengajuan) => {
    switch (status) {
      case 'Selesai':
        return <span className="badge badge-success">✓ Selesai</span>;
      case 'Siap Ambil':
        return <span className="badge badge-info">Siap Ambil</span>;
      case 'Sedang Diproses':
        return <span className="badge badge-info">Sedang Diproses</span>;
      case 'Apply Hari Ini':
        return <span className="badge badge-warning">Apply Hari Ini</span>;
      case 'Menunggu Verifikasi':
        return <span className="badge badge-warning">Verifikasi Berkas</span>;
      case 'Ditolak':
        return <span className="badge badge-error">✕ Ditolak</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  const getPaketBadge = (paket: string) => {
    switch (paket) {
      case 'Premium':
        return (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '9999px',
              background: '#FEF3C7',
              color: '#92400E',
              border: '1px solid #FDE68A',
              fontSize: '0.7rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
            }}
          >
            ★ Premium
          </span>
        );
      case 'TAC':
        return (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '9999px',
              background: '#EEF2FF',
              color: '#4338CA',
              border: '1px solid #E0E7FF',
              fontSize: '0.7rem',
              fontWeight: 700,
            }}
          >
            ⚡ TAC
          </span>
        );
      default:
        return (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '9999px',
              background: '#F1F5F9',
              color: '#475569',
              border: '1px solid #E2E8F0',
              fontSize: '0.7rem',
              fontWeight: 600,
            }}
          >
            {paket || 'Reguler'}
          </span>
        );
    }
  };

  const formatRupiah = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header & Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>
              folder_shared
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary)' }}>
              Manajemen Dokumen &amp; Status
            </span>
          </div>
          <h1 className="font-serif" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--on-surface)' }}>
            Daftar Pengajuan Visa
          </h1>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9rem' }}>
            Total 223 pemohon terdata dalam sistem MapahTrip.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowMaskedPaspor(!showMaskedPaspor)}
            title="Sembunyikan/Buka sensor nomor paspor"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              {showMaskedPaspor ? 'visibility' : 'visibility_off'}
            </span>
            <span>{showMaskedPaspor ? 'Tampilkan Paspor' : 'Sensor Paspor'}</span>
          </button>

          <button className="btn btn-secondary" onClick={() => alert('Mengekspor data ke format Excel / XLSX...')}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              file_download
            </span>
            <span>Ekspor Excel</span>
          </button>

          <button className="btn btn-primary" onClick={onOpenNewPengajuan}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              add
            </span>
            <span>Pengajuan Baru</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs and Controls */}
      <div className="card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Status Tab Pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {statusTabs.map((tab) => {
            const isActive = activeStatusTab === tab;
            const count =
              tab === 'Semua'
                ? pengajuanList.length
                : pengajuanList.filter((p) => p.status === tab).length;

            return (
              <button
                key={tab}
                onClick={() => setActiveStatusTab(tab)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 16px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: isActive ? 'var(--primary-container)' : 'var(--surface-container-low)',
                  color: isActive ? '#fff' : 'var(--on-surface-variant)',
                  fontSize: '0.825rem',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{tab}</span>
                <span
                  style={{
                    padding: '1px 6px',
                    borderRadius: '9999px',
                    fontSize: '0.7rem',
                    background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'rgba(195, 198, 214, 0.4)',
                    color: isActive ? '#fff' : 'var(--on-surface)',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sub-Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid rgba(195, 198, 214, 0.25)', paddingTop: '12px' }}>
          {/* Row 1: Konsulat Filter */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--on-surface-variant)', minWidth: '65px' }}>
                Konsulat:
              </span>
              {['Semua', 'Jakarta', 'Surabaya', 'Denpasar', 'Medan', 'Makassar'].map((k) => (
                <button
                  key={k}
                  onClick={() => setSelectedKonsjen(k)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    border: '1px solid',
                    borderColor: selectedKonsjen === k ? 'var(--secondary)' : 'rgba(195, 198, 214, 0.4)',
                    background: selectedKonsjen === k ? 'var(--surface-container)' : 'transparent',
                    color: selectedKonsjen === k ? 'var(--secondary)' : 'var(--on-surface-variant)',
                    fontSize: '0.78rem',
                    fontWeight: selectedKonsjen === k ? 600 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {k}
                </button>
              ))}
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>
              Menampilkan <strong>{filteredData.length}</strong> pengajuan
            </div>
          </div>

          {/* Row 2: Paket Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingTop: '4px' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--on-surface-variant)', minWidth: '65px' }}>
              Paket:
            </span>
            {[
              { id: 'Semua', label: 'Semua Paket', count: pengajuanList.length },
              { id: 'Reguler', label: 'Reguler', count: pengajuanList.filter((p) => p.paket === 'Reguler').length },
              { id: 'TAC', label: 'TAC', count: pengajuanList.filter((p) => p.paket === 'TAC').length },
              { id: 'Premium', label: 'Premium', count: pengajuanList.filter((p) => p.paket === 'Premium').length },
            ].map((pkt) => (
              <button
                key={pkt.id}
                onClick={() => setSelectedPaket(pkt.id)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  border: '1px solid',
                  borderColor: selectedPaket === pkt.id ? '#0F172A' : '#E2E8F0',
                  background: selectedPaket === pkt.id ? '#0F172A' : '#FFFFFF',
                  color: selectedPaket === pkt.id ? '#FFFFFF' : '#475569',
                  fontSize: '0.78rem',
                  fontWeight: selectedPaket === pkt.id ? 700 : 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{pkt.label}</span>
                <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>({pkt.count})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Pemohon &amp; Identitas</th>
              <th>Program &amp; Paket</th>
              <th>Konsjen &amp; PIC</th>
              <th>Berkas Fisik</th>
              <th>Tgl Apply / Jadwal</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Fee Bersih</th>
              <th style={{ textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--on-surface-variant)' }}>
                  Tidak ada pengajuan yang sesuai dengan kriteria filter saat ini.
                </td>
              </tr>
            ) : (
              filteredData.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #2b68e0, #004fc0)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          flexShrink: 0,
                        }}
                      >
                        {row.namaPemohon
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                      <div>
                        <div
                          style={{ fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}
                          onClick={() => onSelectPengajuan(row.id)}
                        >
                          {row.namaPemohon}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', display: 'flex', gap: '8px' }}>
                          <span style={{ fontFamily: 'monospace' }}>
                            {showMaskedPaspor ? row.maskedPaspor : row.noPaspor}
                          </span>
                          <span>•</span>
                          <span>{row.noPengajuan}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{row.program}</div>
                    {getPaketBadge(row.paket)}
                  </td>

                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{row.konsjen}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                      PIC: {row.staffPic.split(' ')[0]}
                    </div>
                  </td>

                  <td>
                    {/* Checklist summary */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[
                        { label: 'Form', ok: row.berkas.formVisa },
                        { label: 'KTP', ok: row.berkas.ktp },
                        { label: 'E-KTLN', ok: row.berkas.ektln },
                        { label: 'COE', ok: row.berkas.coe },
                        { label: 'Paspor', ok: row.berkas.pasporFisik },
                      ].map((b, idx) => (
                        <span
                          key={idx}
                          title={`${b.label}: ${b.ok ? 'Lengkap' : 'Kurang'}`}
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: 700,
                            background: b.ok ? 'var(--success-bg)' : 'var(--error-bg)',
                            color: b.ok ? 'var(--success)' : 'var(--error)',
                            border: `1px solid ${b.ok ? 'var(--success-border)' : 'var(--error-border)'}`,
                          }}
                        >
                          {b.ok ? '✓' : '!'}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                      Apply: {row.tglApply}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                      Est: {row.tglEstimasiSelesai}
                    </div>
                  </td>

                  <td>{getStatusBadge(row.status)}</td>

                  <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>
                    {formatRupiah(row.feeBersih)}
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => onSelectPengajuan(row.id)}
                      style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
