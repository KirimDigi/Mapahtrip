import { samplePasfotoBase64, sampleKtpBase64, sampleCoeBase64, sampleFormVisaBase64 } from '../data/mockData';
import React, { useState } from 'react';
import type { Pengajuan } from '../types';
import { kirimPesanWA } from '../whatsapp';
import { updatePengajuanDocumentInDB } from '../lib/supabase';

interface DetailPengajuanViewProps {
  pengajuan: Pengajuan;
  onBack: () => void;
  onUpdateStatus: (newStatus: Pengajuan['status']) => void;
  isOwner?: boolean;
}

export const DetailPengajuanView: React.FC<DetailPengajuanViewProps> = ({
  pengajuan,
  onBack,
  onUpdateStatus,
  isOwner = false,
}) => {
  const [showRealPassport, setShowRealPassport] = useState(false);
  const [isSendingWA, setIsSendingWA] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ title: string; base64: string; fileName?: string } | null>(null);
  const [currentPengajuan, setCurrentPengajuan] = useState<Pengajuan>(pengajuan);
  const [isUploadingDoc, setIsUploadingDoc] = useState<string | null>(null);

  const handleUploadDoc = async (docKey: string, file: File) => {
    setIsUploadingDoc(docKey);
    try {
      let b64 = '';
      let size = Math.round(file.size / 1024);
      if (file.type.startsWith('image/')) {
        const { compressImageUnder100KB } = await import('../utils/imageCompressor');
        const comp = await compressImageUnder100KB(file);
        b64 = comp.base64;
        size = comp.compressedSizeKB;
      } else {
        b64 = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = reject;
          r.readAsDataURL(file);
        });
      }

      await updatePengajuanDocumentInDB(currentPengajuan.id, docKey, b64, file.name, size);

      setCurrentPengajuan((prev) => ({
        ...prev,
        fotoBase64: docKey === 'foto' ? b64 : prev.fotoBase64,
        fotoSizeKB: docKey === 'foto' ? size : prev.fotoSizeKB,
        berkas: {
          ...prev.berkas,
          [docKey]: true,
        },
        uploadedDocs: {
          ...(prev.uploadedDocs || {}),
          [docKey]: { name: file.name, base64: b64, sizeKB: size },
        },
      }));
      alert(`✅ Berkas "${file.name}" berhasil diunggah dan disimpan ke Supabase!`);
    } catch (err: any) {
      alert(`Gagal mengunggah berkas: ${err.message}`);
    } finally {
      setIsUploadingDoc(null);
    }
  };

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
            {/* Avatar & Pasfoto Pemohon */}
            <div style={{ position: 'relative' }}>
              {(currentPengajuan.fotoBase64 || samplePasfotoBase64) ? (
                <div
                  onClick={() =>
                    setPreviewDoc({
                      title: `Pasfoto 4.5x3.5cm - ${currentPengajuan.namaPemohon}`,
                      base64: currentPengajuan.fotoBase64 || samplePasfotoBase64,
                      fileName: `Pasfoto_${currentPengajuan.namaPemohon.replace(/\s+/g, '_')}.jpg`,
                    })
                  }
                  style={{
                    width: '74px',
                    height: '92px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '2.5px solid #005BB5',
                    boxShadow: '0 4px 14px rgba(0, 91, 181, 0.25)',
                    cursor: 'pointer',
                    position: 'relative',
                    backgroundColor: '#FFFFFF',
                  }}
                  title="Klik untuk melihat foto ukuran penuh"
                >
                  <img
                    src={currentPengajuan.fotoBase64 || samplePasfotoBase64}
                    alt={currentPengajuan.namaPemohon}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'rgba(0, 91, 181, 0.85)',
                      color: '#ffffff',
                      fontSize: '9px',
                      fontWeight: 800,
                      textAlign: 'center',
                      padding: '2px 0',
                    }}
                  >
                    👁️ LIHAT FOTO
                  </div>
                </div>
              ) : (
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
                  {currentPengajuan.namaPemohon
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')}
                </div>
              )}
              <div
                style={{
                  position: 'absolute',
                  bottom: '-4px',
                  right: '-4px',
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                }}
                title="Tujuan Konsulat Jepang"
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
                    background: 'var(--surface-container)',
                    borderRadius: '9999px',
                    fontSize: '0.8rem',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                    badge
                  </span>
                  <span>{showRealPassport ? pengajuan.noPaspor : pengajuan.maskedPaspor}</span>
                  <button
                    onClick={() => setShowRealPassport(!showRealPassport)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      color: 'var(--primary)',
                    }}
                    title={showRealPassport ? 'Sembunyikan Paspor' : 'Lihat Paspor Lengkap'}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                      {showRealPassport ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>

                <span className="badge badge-info">{pengajuan.status}</span>
              </div>

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
              { key: 'formVisa', title: 'Formulir Aplikasi Visa Jepang', ok: currentPengajuan.berkas.formVisa, note: 'Tanda tangan asli pemohon', sample: sampleFormVisaBase64 },
              { key: 'pasporFisik', title: 'Paspor Fisik Asli', ok: currentPengajuan.berkas.pasporFisik, note: 'Masa berlaku > 12 bulan', sample: samplePasfotoBase64 },
              { key: 'ektln', title: 'E-KTLN (Tenaga Kerja Luar Negeri)', ok: currentPengajuan.berkas.ektln, note: 'Terdaftar BP2MI aktif', sample: sampleCoeBase64 },
              { key: 'coe', title: 'Certificate of Eligibility (COE)', ok: currentPengajuan.berkas.coe, note: 'Asli & legalisir dari MOJ Jepang', sample: sampleCoeBase64 },
              { key: 'foto', title: 'Pas Foto 4.5 × 3.5 cm (Background Putih)', ok: currentPengajuan.berkas.foto || !!currentPengajuan.fotoBase64, note: 'Standar konsulat (< 100KB)', sample: samplePasfotoBase64 },
              { key: 'ktp', title: 'Fotokopi KTP & Kartu Keluarga', ok: currentPengajuan.berkas.ktp, note: 'Tervalidasi Dukcapil', sample: sampleKtpBase64 },
            ].map((doc) => {
              const docFile = currentPengajuan.uploadedDocs?.[doc.key];
              const docBase64 = doc.key === 'foto' ? (currentPengajuan.fotoBase64 || docFile?.base64 || doc.sample) : (docFile?.base64 || doc.sample);
              const isRealUploaded = Boolean(doc.key === 'foto' ? (currentPengajuan.fotoBase64 || docFile?.base64) : docFile?.base64);

              return (
                <div
                  key={doc.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: isRealUploaded ? '#F0FDF4' : '#F8FAFC',
                    border: isRealUploaded ? '1.5px solid #86EFAC' : '1px solid #E2E8F0',
                    gap: '12px',
                    flexWrap: 'wrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '200px', flex: 1 }}>
                    {/* Thumbnail Preview Icon / Image */}
                    {docBase64 && (
                      <div
                        onClick={() =>
                          setPreviewDoc({
                            title: `${doc.title} - ${currentPengajuan.namaPemohon}`,
                            base64: docBase64,
                            fileName: docFile?.name || `${doc.key}_${currentPengajuan.noPengajuan}.jpg`,
                          })
                        }
                        style={{
                          width: '42px',
                          height: '52px',
                          borderRadius: '8px',
                          border: isRealUploaded ? '2px solid #16A34A' : '1.5px dashed #0284C7',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          flexShrink: 0,
                          backgroundColor: '#FFFFFF',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                          position: 'relative',
                        }}
                        title="Klik untuk membuka pratinjau dokumen"
                      >
                        <img
                          src={docBase64}
                          alt={doc.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0,0,0,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFFFFF',
                            fontSize: '12px',
                          }}
                        >
                          👁️
                        </div>
                      </div>
                    )}

                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{doc.title}</span>
                        {isRealUploaded ? (
                          <span style={{ fontSize: '0.68rem', backgroundColor: '#DCFCE7', color: '#15803D', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            ✓ Diunggah Pemohon
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.68rem', backgroundColor: '#E0F2FE', color: '#0369A1', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            Contoh Template Tersedia
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: isRealUploaded ? '#166534' : '#64748B', marginTop: '2px' }}>
                        {docFile?.name ? `📄 ${docFile.name} (${docFile.sizeKB || '?'} KB)` : doc.note}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons: LIHAT GAMBAR & UNDUH */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
                    {/* Tombol Utama: LIHAT GAMBAR */}
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewDoc({
                          title: `${doc.title} - ${currentPengajuan.namaPemohon}`,
                          base64: docBase64,
                          fileName: docFile?.name || `${doc.key}_${currentPengajuan.noPengajuan}.jpg`,
                        })
                      }
                      style={{
                        background: '#005BB5',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '7px 14px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: '0 2px 6px rgba(0, 91, 181, 0.25)',
                      }}
                      title="Lihat dokumen ukuran penuh"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                        visibility
                      </span>
                      <span>Lihat Dokumen</span>
                    </button>

                    {/* Tombol Unduh */}
                    <a
                      href={docBase64}
                      download={docFile?.name || `${doc.key}_${currentPengajuan.noPengajuan}.jpg`}
                      style={{
                        background: '#FFFFFF',
                        color: '#0F172A',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="Unduh Berkas ke Laptop"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                        download
                      </span>
                      <span>Unduh</span>
                    </a>

                    {/* Tombol Upload / Ganti Berkas untuk Staf */}
                    <label
                      style={{
                        background: '#FFFFFF',
                        color: '#475569',
                        border: '1px dashed #94A3B8',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: isUploadingDoc === doc.key ? 'wait' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="Unggah berkas baru atau ganti dokumen pemohon"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                        upload_file
                      </span>
                      <span>{isUploadingDoc === doc.key ? 'Mengunggah...' : (isRealUploaded ? 'Ganti' : 'Upload Fisik')}</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        style={{ display: 'none' }}
                        disabled={isUploadingDoc === doc.key}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadDoc(doc.key, f);
                        }}
                      />
                    </label>
                  </div>
                </div>
              );
            })}
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

        {/* Column 2: OWNER ONLY (Keuangan Pengajuan) vs STAFF (Penugasan & Jadwal Konsuler) */}
        {isOwner ? (
          <div className="card" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #FFFBEB 100%)', border: '1px solid #FDE68A' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="font-serif" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#78350F' }}>
                👑 Rincian Keuangan Pengajuan
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
                  borderTop: '2px dashed rgba(245, 158, 11, 0.4)',
                  paddingTop: '12px',
                  marginTop: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#92400E', textTransform: 'uppercase', fontWeight: 700 }}>
                    Fee Bersih MapahTrip
                  </div>
                  <div style={{ fontSize: '0.725rem', color: '#15803D', fontWeight: 600 }}>
                    Margin Laba: 38.8%
                  </div>
                </div>
                <span
                  className="font-serif"
                  style={{ fontSize: '1.45rem', fontWeight: 700, color: '#B45309', fontFamily: 'monospace' }}
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
                    background: '#FEF3C7',
                    fontSize: '0.8rem',
                    color: '#78350F',
                  }}
                >
                  Kode Mitra Terdaftar: <strong>{pengajuan.affiliateCode}</strong>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="font-serif" style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                Penugasan &amp; Jadwal Konsuler
              </h3>
              <span className="badge badge-success">✓ Terverifikasi</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--on-surface-variant)' }}>Konsulat Yurisdiksi:</span>
                <strong>Konsjen {pengajuan.konsjen}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--on-surface-variant)' }}>Staff PIC Bertugas:</span>
                <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{pengajuan.staffPic}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--on-surface-variant)' }}>Paket Layanan:</span>
                <span>{pengajuan.paket || 'Reguler'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--on-surface-variant)' }}>Tgl Apply ke Konsulat:</span>
                <span style={{ fontWeight: 600 }}>{pengajuan.tglApply}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--on-surface-variant)' }}>Estimasi Pengambilan:</span>
                <span style={{ fontWeight: 600, color: 'var(--success)' }}>{pengajuan.tglEstimasiSelesai}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--on-surface-variant)' }}>Status Administrasi:</span>
                <span style={{ color: 'var(--success)', fontWeight: 600 }}>Lunas di Sistem</span>
              </div>

              {pengajuan.affiliateCode && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--on-surface-variant)' }}>Mitra Pengirim:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{pengajuan.affiliateCode}</span>
                </div>
              )}
            </div>
          </div>
        )}

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
              onChange={(e) => {
                const nextStatus = e.target.value as Pengajuan['status'];
                if (nextStatus === 'Sedang Diproses' && pengajuan.status !== 'Sedang Diproses') {
                  const noWa = pengajuan.noTelp && pengajuan.noTelp.trim() ? pengajuan.noTelp.trim() : 'Nomor belum tersedia';
                  const konfirmasi = window.confirm(
                    `⚠️ PERINGATAN KONFIRMASI: APAKAH YAKIN SUDAH DIPROSES?\n\n` +
                    `Anda akan menandai pengajuan visa ini sebagai SEDANG DIPROSES:\n` +
                    `• Nama Pemohon : ${pengajuan.namaPemohon}\n` +
                    `• No. Paspor   : ${pengajuan.noPaspor}\n` +
                    `• No. WhatsApp : ${noWa}\n\n` +
                    `⚠️ PENTING:\n` +
                    `Setelah Anda klik OK, status akan diubah menjadi "Sedang Diproses" dan notifikasi resmi bahwa berkas visa telah diajukan ke Kedutaan / JVAC akan OTOMATIS dikirimkan melalui WhatsApp ke nomor customer (${noWa}).\n\n` +
                    `Apakah Anda yakin ingin melanjutkan kirim notifikasi WhatsApp ke customer?`
                  );
                  if (!konfirmasi) return;

                  if (pengajuan.noTelp && pengajuan.noTelp.trim()) {
                    const today = new Date().toLocaleDateString('id-ID');
                    const pesanWAProses =
                      `*PEMBERITAHUAN PENGAJUAN VISA DIPROSES - MAPAHTRIP* 🇯🇵📋\n\n` +
                      `Halo Sdr/i *${pengajuan.namaPemohon}*,\n\n` +
                      `Berkas permohonan Visa Jepang Anda saat ini telah *RESMI DIAJUKAN DAN SEDANG DIPROSES* oleh Kedutaan Besar Jepang / JVAC. 🏛️\n\n` +
                      `📋 *Rincian Pengajuan:*\n` +
                      `• No. Pengajuan: ${pengajuan.noPengajuan || '-'}\n` +
                      `• Nama Pemohon: ${pengajuan.namaPemohon}\n` +
                      `• No. Paspor: ${pengajuan.noPaspor}\n` +
                      `• Program: ${pengajuan.program || 'Visa Jepang'}\n` +
                      `• Tanggal Apply: ${today}\n` +
                      `• Status: *Sedang Diproses Kedutaan / JVAC* ⏳\n\n` +
                      `Estimasi waktu pemrosesan kedutaan sekitar 3 - 5 hari kerja. Kami akan segera mengabarkan Anda kembali begitu visa telah selesai dan terbit.\n\n` +
                      `Terima kasih atas kepercayaannya bersama MapahTrip! 🌸\n\n` +
                      `Salam hangat,\n` +
                      `*Tim Operasional MapahTrip*\n` +
                      `Website: https://mapahtrip.com`;

                    kirimPesanWA(pengajuan.noTelp, pesanWAProses)
                      .then(() => {
                        alert(
                          `✅ STATUS VISA DIPROSES!\n\nStatus pengajuan "${pengajuan.namaPemohon}" telah diubah menjadi SEDANG DIPROSES.\nNotifikasi WhatsApp resmi telah dikirimkan ke ${pengajuan.noTelp}.`
                        );
                      })
                      .catch((err) => {
                        console.warn('[WA Gateway] Gagal kirim notif proses:', err);
                      });
                  }
                } else if (nextStatus === 'Selesai' && pengajuan.status !== 'Selesai') {
                  const noWa = pengajuan.noTelp && pengajuan.noTelp.trim() ? pengajuan.noTelp.trim() : 'Nomor belum tersedia';
                  const konfirmasi = window.confirm(
                    `⚠️ PERINGATAN KONFIRMASI: APAKAH YAKIN SUDAH SELESAI?\n\n` +
                    `Anda akan menandai pengajuan visa ini sebagai SELESAI:\n` +
                    `• Nama Pemohon : ${pengajuan.namaPemohon}\n` +
                    `• No. Paspor   : ${pengajuan.noPaspor}\n` +
                    `• No. WhatsApp : ${noWa}\n\n` +
                    `⚠️ PENTING:\n` +
                    `Setelah dikonfirmasi, informasi update bahwa visa telah selesai dan terbit akan OTOMATIS dikirimkan melalui WhatsApp ke nomor customer (${noWa}).\n\n` +
                    `Apakah Anda yakin sudah selesai dan ingin melanjutkan?`
                  );
                  if (!konfirmasi) return;

                  if (pengajuan.noTelp && pengajuan.noTelp.trim()) {
                    const today = new Date().toLocaleDateString('id-ID');
                    const pesanWASelesai =
                      `*PEMBERITAHUAN VISA JEPANG SELESAI - MAPAHTRIP* 🇯🇵✨\n\n` +
                      `Halo Sdr/i *${pengajuan.namaPemohon}*,\n\n` +
                      `Kabar gembira! Pengajuan Visa Jepang Anda telah *SELESAI* diproses oleh Kedutaan / JVAC dan visa telah resmi terbit. ✅\n\n` +
                      `📋 *Rincian Pengajuan:*\n` +
                      `• No. Pengajuan: ${pengajuan.noPengajuan || '-'}\n` +
                      `• Nama Pemohon: ${pengajuan.namaPemohon}\n` +
                      `• No. Paspor: ${pengajuan.noPaspor}\n` +
                      `• Program: ${pengajuan.program || 'Visa Jepang'}\n` +
                      `• Tanggal Selesai: ${today}\n` +
                      `• Status: *SELESAI (Visa Terbit)*\n\n` +
                      `📦 Paspor fisik dan stiker visa Anda sudah siap. Informasi pengambilan atau nomor resi pengiriman akan kami perbarui segera.\n\n` +
                      `Terima kasih telah mempercayakan pengurusan visa Anda kepada MapahTrip! 🌸\n\n` +
                      `Salam hangat,\n` +
                      `*Tim Operasional MapahTrip*\n` +
                      `Website: https://mapahtrip.com`;

                    kirimPesanWA(pengajuan.noTelp, pesanWASelesai)
                      .then(() => {
                        alert(
                          `✅ STATUS VISA SELESAI!\n\nStatus pengajuan "${pengajuan.namaPemohon}" telah diubah menjadi SELESAI.\nNotifikasi WhatsApp resmi telah dikirimkan ke ${pengajuan.noTelp}.`
                        );
                      })
                      .catch((err) => {
                        console.warn('[WA Gateway] Gagal kirim notif selesai:', err);
                      });
                  }
                }
                onUpdateStatus(nextStatus);
              }}
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
      {/* Lightbox Pratinjau Dokumen / Foto */}
      {previewDoc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setPreviewDoc(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '850px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 24px',
                borderBottom: '1px solid #E2E8F0',
                background: '#F8FAFC',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-symbols-outlined" style={{ color: '#2B68E0', fontSize: '24px' }}>
                  description
                </span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A' }}>
                    {previewDoc.title}
                  </div>
                  {previewDoc.fileName && (
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      Nama Berkas: {previewDoc.fileName}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '22px',
                  cursor: 'pointer',
                  color: '#64748B',
                  lineHeight: 1,
                  padding: '6px',
                  borderRadius: '6px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Gambar atau Iframe PDF */}
            <div
              style={{
                padding: '20px',
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#0F172A',
                minHeight: '400px',
              }}
            >
              {previewDoc.base64.startsWith('data:application/pdf') ? (
                <iframe
                  src={previewDoc.base64}
                  title={previewDoc.title}
                  style={{ width: '100%', height: '65vh', border: 'none', borderRadius: '8px' }}
                />
              ) : (
                <img
                  src={previewDoc.base64}
                  alt={previewDoc.title}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '65vh',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                  }}
                />
              )}
            </div>

            {/* Footer Modal */}
            <div
              style={{
                padding: '14px 24px',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#F8FAFC',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                MapahTrip Dokumen Arsip Konsulat
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href={previewDoc.base64}
                  download={previewDoc.fileName || (previewDoc.title.replace(/[^a-zA-Z0-9_-]/g, '_') + '.jpg')}
                  className="btn btn-primary"
                  style={{
                    padding: '8px 18px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    download
                  </span>
                  <span>Unduh Dokumen</span>
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.82rem', fontWeight: 600 }}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
