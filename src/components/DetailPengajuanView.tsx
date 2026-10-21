import React, { useState } from 'react';
import type { Pengajuan } from '../types';
import { kirimPesanWA } from '../whatsapp';

interface DetailPengajuanViewProps {
  pengajuan: Pengajuan;
  onBack: () => void;
  onUpdateStatus: (newStatus: Pengajuan['status']) => void;
}

export const DetailPengajuanView: React.FC<DetailPengajuanViewProps> = ({
  pengajuan,
  onBack,
  onUpdateStatus,
}) => {
  const [showRealPassport, setShowRealPassport] = useState(false);
  const [isSendingWA, setIsSendingWA] = useState(false);

  const handleKirimNotifWA = async () => {
    if (!confirm(`Kirim notifikasi update status "${pengajuan.status}" via WhatsApp Gateway ke ${pengajuan.namaPemohon} (${pengajuan.noTelp})?`)) return;
    setIsSendingWA(true);
    try {
      const pesan = `Halo Sdr/i ${pengajuan.namaPemohon},\n\nUpdate status pengajuan visa Jepang Anda di MapahTrip:\n• No. Pengajuan: ${pengajuan.noPengajuan}\n• Status Saat Ini: *${pengajuan.status}*\n• Konsulat: ${pengajuan.konsjen}\n• Estimasi Selesai: ${pengajuan.tglEstimasiSelesai}\n\nTerima kasih atas kepercayaannya.\nTim Operasional MapahTrip`;
      const res = await kirimPesanWA(pengajuan.noTelp, pesan);
      if (res && (res.success || res.status === 'success' || !res.error)) {
        alert(`Notifikasi WhatsApp berhasil dikirim ke ${pengajuan.namaPemohon}!`);
      } else {
        alert(`Gagal mengirim WhatsApp via Gateway: ${res?.message || 'Pastikan gateway aktif di komputer.'}`);
      }
    } catch (err: any) {
      alert(`Terjadi error saat menghubungi gateway: ${err.message}`);
    } finally {
      setIsSendingWA(false);
    }
  };

  const formatRupiah = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Breadcrumb & Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Pengajuan
          </button>
          <span style={{ color: 'var(--outline-variant)' }}>/</span>
          <span style={{ color: 'var(--on-surface-variant)' }}>Detail Pengajuan</span>
          <span style={{ color: 'var(--outline-variant)' }}>/</span>
          <span
            style={{
              padding: '2px 10px',
              borderRadius: '9999px',
              background: 'var(--surface-container)',
              fontWeight: 600,
              color: 'var(--on-surface)',
            }}
          >
            {pengajuan.namaPemohon} ({showRealPassport ? pengajuan.noPaspor : pengajuan.maskedPaspor})
          </span>
        </div>

        <button className="btn btn-secondary" onClick={onBack}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            arrow_back
          </span>
          <span>Kembali ke Daftar</span>
        </button>
      </div>

      {/* Main Applicant Header Card */}
      <div
        className="card"
        style={{
          padding: '28px',
          background: 'linear-gradient(180deg, #ffffff 0%, #f9fbff 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Avatar */}
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #004fc0, #2b68e0)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  boxShadow: '0 4px 14px rgba(0, 79, 192, 0.25)',
                }}
                className="font-serif"
              >
                {pengajuan.namaPemohon
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                }}
                title="Tujuan Jepang"
              >
                🇯🇵
              </div>
            </div>

            {/* Title & Passport */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <h1 className="font-serif" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--on-surface)' }}>
                  {pengajuan.namaPemohon}
                </h1>

                {/* Passport pill toggle */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    background: 'var(--surface-container-low)',
                    border: '1px solid rgba(195, 198, 214, 0.4)',
                    fontSize: '0.8rem',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--outline)' }}>
                    badge
                  </span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {showRealPassport ? pengajuan.noPaspor : pengajuan.maskedPaspor}
                  </span>
                  <button
                    onClick={() => setShowRealPassport(!showRealPassport)}
                    title={showRealPassport ? 'Sembunyikan' : 'Buka sensor'}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      padding: 0,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                      {showRealPassport ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>

                <span className="badge badge-success" style={{ fontSize: '0.8rem' }}>
                  {pengajuan.status}
                </span>
              </div>

              {/* Quick meta */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  flexWrap: 'wrap',
                  color: 'var(--on-surface-variant)',
                  fontSize: '0.85rem',
                }}
              >
                <div>
                  Konsulat: <strong>Konsjen {pengajuan.konsjen}</strong>
                </div>
                <span>•</span>
                <div>
                  PIC: <strong>{pengajuan.staffPic}</strong>
                </div>
                <span>•</span>
                <div>
                  Paket: <strong>{pengajuan.paket}</strong>
                </div>
                <span>•</span>
                <div>
                  Program: <strong style={{ color: 'var(--primary)' }}>{pengajuan.program}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              className="btn btn-secondary"
              onClick={handleKirimNotifWA}
              disabled={isSendingWA}
              style={{
                color: '#047857',
                borderColor: '#a7f3d0',
                background: '#ecfdf5',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Kirim notifikasi update status langsung via Gateway WhatsApp Mapahtrip"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                {isSendingWA ? 'sync' : 'send_and_archive'}
              </span>
              <span>{isSendingWA ? 'Mengirim...' : 'Kirim Notif WA (Gateway)'}</span>
            </button>

            <a
              href={`https://wa.me/${pengajuan.noTelp.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{
                color: '#334155',
                borderColor: 'rgba(195, 198, 214, 0.4)',
                background: 'var(--surface-container-low)',
              }}
              title="Buka WhatsApp Web Manual"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                chat
              </span>
              <span>Buka WA Web</span>
            </a>

            <button
              className="btn btn-primary"
              onClick={() => alert(`Mencetak Tanda Terima Resmi untuk ${pengajuan.namaPemohon}...`)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                print
              </span>
              <span>Cetak Berkas</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid: 3 Analytical Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        {/* Column 1: Kelengkapan Dokumen Fisik */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="font-serif" style={{ fontSize: '1.15rem', fontWeight: 700 }}>
              Kelengkapan Dokumen Fisik
            </h3>
            <span className="badge badge-info">Verifikasi 6/6</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { title: 'Formulir Aplikasi Visa Jepang', ok: pengajuan.berkas.formVisa, note: 'Tanda tangan asli pemohon' },
              { title: 'Paspor Fisik Asli', ok: pengajuan.berkas.pasporFisik, note: 'Masa berlaku > 12 bulan' },
              { title: 'E-KTLN (Tenaga Kerja Luar Negeri)', ok: pengajuan.berkas.ektln, note: 'Terdaftar BP2MI aktif' },
              { title: 'Certificate of Eligibility (COE)', ok: pengajuan.berkas.coe, note: 'Asli & legalisir' },
              { title: 'Pas Foto 4.5 x 3.5 cm (Background Putih)', ok: pengajuan.berkas.foto, note: '2 lembar standar konsulat' },
              { title: 'Fotokopi KTP & Kartu Keluarga', ok: pengajuan.berkas.ktp, note: 'Tervalidasi' },
            ].map((doc, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'var(--surface-container-low)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{doc.title}</div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--on-surface-variant)' }}>{doc.note}</div>
                </div>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: doc.ok ? 'var(--success-bg)' : 'var(--error-bg)',
                    color: doc.ok ? 'var(--success)' : 'var(--error)',
                  }}
                >
                  {doc.ok ? 'Lengkap' : 'Belum Ada'}
                </span>
              </div>
            ))}
          </div>

          {pengajuan.noResi && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                borderRadius: '10px',
                background: 'var(--surface-container)',
                fontSize: '0.8rem',
              }}
            >
              <div style={{ color: 'var(--on-surface-variant)' }}>Nomor Resi Kurir Pengiriman:</div>
              <div style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary)', marginTop: '2px' }}>
                {pengajuan.noResi}
              </div>
            </div>
          )}
        </div>

        {/* Column 2: Rincian Keuangan & Konsulat */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="font-serif" style={{ fontSize: '1.15rem', fontWeight: 700 }}>
              Rincian Keuangan Pengajuan
            </h3>
            <span className="badge badge-success">Lunas</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--on-surface-variant)' }}>Dibayar Pemohon:</span>
              <strong style={{ fontFamily: 'monospace' }}>{formatRupiah(pengajuan.dibayarPemohon)}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--on-surface-variant)' }}>Biaya Konsulat &amp; Nominal Keluar:</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--error)' }}>
                - {formatRupiah(pengajuan.nominalKeluar)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--on-surface-variant)' }}>Cashback Mitra:</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--success)' }}>
                + {formatRupiah(pengajuan.cashback)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--on-surface-variant)' }}>Referral / Affiliate Fee:</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--warning)' }}>
                - {formatRupiah(pengajuan.referralFee)}
              </span>
            </div>

            <div
              style={{
                borderTop: '2px dashed rgba(195, 198, 214, 0.4)',
                paddingTop: '12px',
                marginTop: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Fee Bersih MapahTrip
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--success)', fontWeight: 600 }}>
                  Margin Laba: 38.8%
                </div>
              </div>
              <span
                className="font-serif"
                style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}
              >
                {formatRupiah(pengajuan.feeBersih)}
              </span>
            </div>

            {pengajuan.affiliateCode && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '10px',
                  borderRadius: '10px',
                  background: 'var(--surface-container-low)',
                  fontSize: '0.8rem',
                }}
              >
                Kode Affiliate Terdaftar: <strong>{pengajuan.affiliateCode}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Log Tahapan Operasional & Ubah Status */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="font-serif" style={{ fontSize: '1.15rem', fontWeight: 700 }}>
              Tahapan &amp; Status
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
              Update Terakhir Hari Ini
            </span>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>
              Ubah Status Tahap:
            </label>
            <select
              value={pengajuan.status}
              onChange={(e) => onUpdateStatus(e.target.value as Pengajuan['status'])}
              style={{
                width: '100%',
                marginTop: '6px',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(195, 198, 214, 0.5)',
                background: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--on-surface)',
              }}
            >
              <option value="Menunggu Verifikasi">Menunggu Verifikasi Berkas</option>
              <option value="Apply Hari Ini">Apply Hari Ini ke Konsulat</option>
              <option value="Sedang Diproses">Sedang Diproses Konsjen</option>
              <option value="Siap Ambil">Paspor Siap Ambil</option>
              <option value="Selesai">Selesai (Visa Terbit &amp; Dikirim)</option>
              <option value="Ditolak">Ditolak Konsulat</option>
            </select>
          </div>

          {/* Timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
            {[
              { title: 'Berkas Masuk ke MapahTrip', date: pengajuan.tglBerkasMasuk, done: true },
              { title: 'Diajukan ke Konsulat Jepang', date: pengajuan.tglApply, done: true },
              { title: 'Verifikasi & Stamping Konsuler', date: 'Dalam 5 Hari Kerja', done: pengajuan.status === 'Selesai' || pengajuan.status === 'Siap Ambil' },
              { title: 'Paspor Diterima & Pengiriman', date: pengajuan.tglSelesai || pengajuan.tglEstimasiSelesai, done: pengajuan.status === 'Selesai' },
            ].map((step, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '12px' }}>
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: step.done ? 'var(--primary)' : 'var(--surface-container-high)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {step.done ? '✓' : idx + 1}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{step.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{step.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
