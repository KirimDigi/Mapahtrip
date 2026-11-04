import { samplePasfotoBase64, sampleKtpBase64, sampleCoeBase64, sampleFormVisaBase64 } from '../data/mockData';
import React, { useState, useEffect } from 'react';
import type { Pengajuan } from '../types';
import { kirimPesanWA } from '../whatsapp';
import { updatePengajuanDocumentInDB, updatePengajuanPaymentInDB } from '../lib/supabase';

interface DetailPengajuanViewProps {
  pengajuan: Pengajuan;
  onBack: () => void;
  onUpdateStatus?: (newStatus: Pengajuan['status']) => void;
  onUpdateStage?: (id: string, stageData: any) => void;
  onUpdatePengajuan?: (updatedPengajuan: Pengajuan) => void;
  isOwner?: boolean;
}

export const DetailPengajuanView: React.FC<DetailPengajuanViewProps> = ({
  pengajuan,
  onBack,
  onUpdatePengajuan,
  isOwner = false,
}) => {
  const [showRealPassport, setShowRealPassport] = useState(false);
  const [isSendingWA, setIsSendingWA] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ title: string; base64: string; fileName?: string; isSample?: boolean } | null>(null);
  const [currentPengajuan, setCurrentPengajuan] = useState<Pengajuan>(pengajuan);
  const [isUploadingDoc, setIsUploadingDoc] = useState<string | null>(null);
  const [copiedUploadLink, setCopiedUploadLink] = useState(false);

  const getCustomerUploadLink = () => {
    const code = currentPengajuan.noPengajuan || currentPengajuan.noPaspor || currentPengajuan.id;
    return `${window.location.origin}/?lacak=${encodeURIComponent(code)}`;
  };

  const handleCopyUploadLink = () => {
    try {
      const link = getCustomerUploadLink();
      navigator.clipboard.writeText(link);
      setCopiedUploadLink(true);
      setTimeout(() => setCopiedUploadLink(false), 2500);
      alert(`🔗 Tautan upload mandiri pemohon berhasil disalin:\n\n${link}\n\nKirimkan tautan ini ke customer melalui WhatsApp agar mereka dapat langsung mengunggah foto/scan berkas dari HP.`);
    } catch {
      // fallback
    }
  };

  const handleSendWALink = () => {
    const link = getCustomerUploadLink();
    const noWa = currentPengajuan.noTelp?.trim();
    if (!noWa) {
      alert(`Nomor WhatsApp untuk "${currentPengajuan.namaPemohon}" belum tersedia. Silakan gunakan tombol Salin Link.`);
      return;
    }

    const docList = [
      { name: 'Formulir Aplikasi Visa Jepang', isOk: !!currentPengajuan.uploadedDocs?.formVisa?.base64 },
      { name: 'Scan / Foto Paspor Asli', isOk: !!currentPengajuan.uploadedDocs?.pasporFisik?.base64 },
      { name: 'E-KTLN / Rekening Koran', isOk: !!currentPengajuan.uploadedDocs?.ektln?.base64 },
      { name: 'Certificate of Eligibility (COE) / Bukti Booking', isOk: !!currentPengajuan.uploadedDocs?.coe?.base64 },
      { name: 'Pas Foto 4.5 × 3.5 cm (Background Putih)', isOk: !!(currentPengajuan.fotoBase64 || currentPengajuan.uploadedDocs?.foto?.base64) },
      { name: 'Fotokopi / Scan KTP & Kartu Keluarga', isOk: !!currentPengajuan.uploadedDocs?.ktp?.base64 },
    ];
    const missing = docList.filter((d) => !d.isOk).map((d) => `• ${d.name}`).join('\n');

    const pesan =
`*PEMBERITAHUAN KELENGKAPAN BERKAS VISA JEPANG - MAPAHTRIP* 🇯🇵📋\n\n` +
`Halo Sdr/i *${currentPengajuan.namaPemohon}*,\n\n` +
`Pendaftaran pengajuan Visa Jepang Anda telah kami terima (*${currentPengajuan.noPengajuan || '-'}*).\n\n` +
(missing ? `Berikut berkas persyaratan yang masih perlu Anda lengkapi:\n${missing}\n\n` : '') +
`Anda dapat langsung mengambil foto / mengunggah berkas dari HP melalui tautan resmi khusus berikut:\n` +
`👉 ${link}\n\n` +
`Setelah Anda unggah, berkas akan otomatis terverifikasi oleh staf kami tanpa perlu dikirim ke WhatsApp. Terima kasih! 🙏✨\n\n` +
`Salam hangat,\n` +
`*Tim Operasional MapahTrip (${currentPengajuan.konsjen || 'Indonesia'})*`;

    const cleanNum = noWa.replace(/[^0-9]/g, '');
    const finalPhone = cleanNum.startsWith('0') ? '62' + cleanNum.substring(1) : cleanNum.startsWith('62') ? cleanNum : '62' + cleanNum;
    window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(pesan)}`, '_blank');
  };

  useEffect(() => {
    setCurrentPengajuan(pengajuan);
  }, [pengajuan]);

  const handleDownloadDoc = (docTitle: string, base64Data?: string, fileName?: string) => {
    if (!base64Data) {
      alert(`Pemohon belum mengunggah dokumen "${docTitle}". Silakan unggah foto/scan fisik dokumen pemohon terlebih dahulu via tombol "Upload Fisik".`);
      return;
    }

    let ext = '.jpg';
    if (base64Data.startsWith('data:application/pdf')) ext = '.pdf';
    else if (base64Data.startsWith('data:image/png')) ext = '.png';
    else if (base64Data.startsWith('data:image/jpeg') || base64Data.startsWith('data:image/jpg')) ext = '.jpg';

    const safeApplicant = currentPengajuan.namaPemohon.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeDoc = docTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
    const finalName = fileName || `${safeDoc}_${safeApplicant}${ext}`;

    const link = document.createElement('a');
    link.href = base64Data;
    link.download = finalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

      const updatedPengajuanItem: Pengajuan = {
        ...currentPengajuan,
        fotoBase64: docKey === 'foto' ? b64 : currentPengajuan.fotoBase64,
        fotoSizeKB: docKey === 'foto' ? size : currentPengajuan.fotoSizeKB,
        berkas: {
          ...currentPengajuan.berkas,
          [docKey]: true,
        },
        uploadedDocs: {
          ...(currentPengajuan.uploadedDocs || {}),
          [docKey]: { name: file.name, base64: b64, sizeKB: size },
        },
      };

      setCurrentPengajuan(updatedPengajuanItem);
      if (onUpdatePengajuan) {
        onUpdatePengajuan(updatedPengajuanItem);
      }
      alert(`✅ Berkas "${file.name}" berhasil diunggah dan tersimpan ke sistem untuk pemohon ${currentPengajuan.namaPemohon}!`);
    } catch (err: any) {
      alert(`Gagal mengunggah berkas: ${err.message}`);
    } finally {
      setIsUploadingDoc(null);
    }
  };

  const handleUploadBuktiBayar = async (file: File) => {
    setIsUploadingDoc('bukti_bayar');
    try {
      let b64 = '';
      if (file.type.startsWith('image/')) {
        const { compressImageUnder100KB } = await import('../utils/imageCompressor');
        const comp = await compressImageUnder100KB(file);
        b64 = comp.base64;
      } else {
        b64 = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = reject;
          r.readAsDataURL(file);
        });
      }

      await updatePengajuanPaymentInDB(currentPengajuan.id, {
        buktiBayarPemohon: b64,
        buktiBayarNama: file.name,
      });

      const updated: Pengajuan = {
        ...currentPengajuan,
        buktiBayarPemohon: b64,
        buktiBayarNama: file.name,
      };
      setCurrentPengajuan(updated);
      if (onUpdatePengajuan) onUpdatePengajuan(updated);
      alert(`✅ Bukti transfer "${file.name}" berhasil diunggah untuk pemohon ${currentPengajuan.namaPemohon}!`);
    } catch (err: any) {
      alert(`Gagal mengunggah bukti transfer: ${err.message}`);
    } finally {
      setIsUploadingDoc(null);
    }
  };

  const handleToggleStatusBayar = async () => {
    const nextStatus = currentPengajuan.statusPembayaran === 'Menunggu Pembayaran' ? 'Lunas' : 'Menunggu Pembayaran';

    const konfirm = window.confirm(
      `Ubah status pembayaran ${currentPengajuan.namaPemohon} menjadi "${nextStatus === 'Lunas' ? 'Lunas (100%)' : 'Menunggu Pembayaran'}"?`
    );
    if (!konfirm) return;

    await updatePengajuanPaymentInDB(currentPengajuan.id, {
      statusPembayaran: nextStatus,
    });
    const updated: Pengajuan = {
      ...currentPengajuan,
      statusPembayaran: nextStatus,
    };
    setCurrentPengajuan(updated);
    if (onUpdatePengajuan) onUpdatePengajuan(updated);
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
      <div className="detail-breadcrumb-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div className="detail-breadcrumb-nav" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              cursor: 'pointer',
              fontWeight: 500,
              padding: 0,
            }}
          >
            Pengajuan
          </button>
          <span style={{ color: 'var(--outline-variant)' }}>/</span>
          <span style={{ color: 'var(--on-surface-variant)' }}>Detail Pengajuan</span>
          <span style={{ color: 'var(--outline-variant)' }}>/</span>
          <span
            className="detail-breadcrumb-pill"
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

        <button className="btn btn-secondary detail-back-btn" onClick={onBack}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            arrow_back
          </span>
          <span>Kembali ke Daftar</span>
        </button>
      </div>

      {/* Main Applicant Header Card */}
      <div
        className="card detail-applicant-card"
        style={{
          padding: '24px',
          background: 'linear-gradient(180deg, #ffffff 0%, #f9fbff 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          className="detail-applicant-body"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '20px',
          }}
        >
          <div className="detail-applicant-info" style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, minWidth: 0 }}>
            {/* Top row: Photo + Name/Passport/Status */}
            <div className="detail-applicant-header-row" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Avatar & Pasfoto Pemohon */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
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

              {/* Title & Passport & Status */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <h1 className="font-serif detail-applicant-name" style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--on-surface)', margin: '0 0 6px 0', lineHeight: 1.2 }}>
                  {pengajuan.namaPemohon}
                </h1>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {/* Passport pill toggle */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '3px 10px',
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

                  {pengajuan.status === 'Ditolak' ? (
                    <span
                      className="badge badge-error"
                      style={{
                        background: '#FEE2E2',
                        color: '#B91C1C',
                        border: '1px solid #FECACA',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '6px',
                      }}
                    >
                      ⛔ Ditolak: {pengajuan.alasanPenolakan || 'Di Awal'}
                    </span>
                  ) : (
                    <span className="badge badge-info">{pengajuan.status}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="detail-applicant-meta-grid">
              <div className="detail-meta-pill detail-meta-full">
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#64748B' }}>location_on</span>
                <span>Konsulat: <strong>Konsjen {pengajuan.konsjen}</strong></span>
              </div>
              <div className="detail-meta-pill">
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#64748B' }}>person</span>
                <span>PIC: <strong>{pengajuan.staffPic}</strong></span>
              </div>
              <div className="detail-meta-pill">
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#64748B' }}>inventory_2</span>
                <span>Paket: <strong>{pengajuan.paket}</strong></span>
              </div>
              <div className="detail-meta-pill detail-meta-full">
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--primary)' }}>stars</span>
                <span>Program: <strong style={{ color: 'var(--primary)' }}>{pengajuan.program}</strong></span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="detail-action-ctas" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
      <div className="detail-columns-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Column 1: Kelengkapan Dokumen Fisik */}
        <div className="card">
          <div className="detail-doc-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '8px' }}>
            <h3 className="font-serif detail-doc-card-title" style={{ fontSize: '1.08rem', fontWeight: 700, margin: 0, minWidth: 0 }}>
              Kelengkapan Dokumen Fisik
            </h3>
            {(() => {
              const docList = [
                { key: 'formVisa', isOk: !!currentPengajuan.uploadedDocs?.formVisa?.base64 },
                { key: 'pasporFisik', isOk: !!currentPengajuan.uploadedDocs?.pasporFisik?.base64 },
                { key: 'ektln', isOk: !!currentPengajuan.uploadedDocs?.ektln?.base64 },
                { key: 'coe', isOk: !!currentPengajuan.uploadedDocs?.coe?.base64 },
                { key: 'foto', isOk: !!(currentPengajuan.fotoBase64 || currentPengajuan.uploadedDocs?.foto?.base64) },
                { key: 'ktp', isOk: !!currentPengajuan.uploadedDocs?.ktp?.base64 },
              ];
              const totalUploaded = docList.filter((d) => d.isOk).length;
              return (
                <span
                  className="badge detail-doc-card-badge"
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '999px',
                    backgroundColor: totalUploaded === 6 ? '#EFF6FF' : '#F1F5F9',
                    color: totalUploaded === 6 ? '#1D4ED8' : '#475569',
                    border: '1px solid #DBEAFE',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {totalUploaded === 6 ? '✓ Lengkap 6/6 Berkas' : `Terunggah ${totalUploaded}/6 Berkas`}
                </span>
              );
            })()}
          </div>

          {/* Tautan Upload Mandiri Khusus Pemohon */}
          <div
            style={{
              marginBottom: '16px',
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#16A34A' }}>link</span>
                <span>Tautan Upload Mandiri Pemohon</span>
              </div>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button
                  type="button"
                  onClick={handleCopyUploadLink}
                  style={{
                    padding: '4px 9px',
                    fontSize: '0.70rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    backgroundColor: copiedUploadLink ? '#15803D' : '#FFFFFF',
                    color: copiedUploadLink ? '#FFFFFF' : '#166534',
                    border: '1px solid #86EFAC',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Salin link upload dokumen untuk pemohon"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                    {copiedUploadLink ? 'check' : 'content_copy'}
                  </span>
                  <span>{copiedUploadLink ? 'Tersalin' : 'Salin Link'}</span>
                </button>
                {currentPengajuan.noTelp && (
                  <button
                    type="button"
                    onClick={handleSendWALink}
                    style={{
                      padding: '4px 9px',
                      fontSize: '0.70rem',
                      fontWeight: 700,
                      borderRadius: '6px',
                      backgroundColor: '#16A34A',
                      color: '#FFFFFF',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title="Kirim link berkas via WhatsApp langsung"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>send</span>
                    <span>Kirim WA</span>
                  </button>
                )}
              </div>
            </div>
            <div style={{ fontSize: '0.71rem', color: '#15803D', lineHeight: 1.35 }}>
              Bagikan link ini ke pemohon agar mereka dapat mengunggah berkas yang kurang langsung dari HP. Berkas akan otomatis tercentang di sistem.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              { key: 'formVisa', title: 'Formulir Aplikasi Visa Jepang', note: 'Tanda tangan asli pemohon', sample: sampleFormVisaBase64 },
              { key: 'pasporFisik', title: 'Paspor Fisik Asli', note: 'Masa berlaku > 12 bulan', sample: samplePasfotoBase64 },
              { key: 'ektln', title: 'E-KTLN (Tenaga Kerja Luar Negeri)', note: 'Terdaftar BP2MI aktif', sample: sampleCoeBase64 },
              { key: 'coe', title: 'Certificate of Eligibility (COE)', note: 'Asli & legalisir dari MOJ Jepang', sample: sampleCoeBase64 },
              { key: 'foto', title: 'Pas Foto 4.5 × 3.5 cm (Background Putih)', note: 'Standar konsulat (< 100KB)', sample: samplePasfotoBase64 },
              { key: 'ktp', title: 'Fotokopi KTP & Kartu Keluarga', note: 'Tervalidasi Dukcapil', sample: sampleKtpBase64 },
            ].map((doc, docIdx) => {
              const docFile = currentPengajuan.uploadedDocs?.[doc.key];
              const realBase64 = doc.key === 'foto' ? (currentPengajuan.fotoBase64 || docFile?.base64) : docFile?.base64;
              const isRealUploaded = Boolean(realBase64);
              const activeBase64 = realBase64 || doc.sample;
              const isPdf = Boolean((docFile?.name && docFile.name.toLowerCase().endsWith('.pdf')) || (realBase64 && realBase64.startsWith('data:application/pdf')));

              return (
                <div
                  key={doc.key}
                  className="detail-doc-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 10px',
                    borderRadius: '8px',
                    background: 'transparent',
                    borderBottom: docIdx < 5 ? '1px solid #F1F5F9' : 'none',
                    gap: '12px',
                    flexWrap: 'wrap',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div className="detail-doc-info" style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '160px', flex: 1 }}>
                    {/* Thumbnail Preview Icon / Image */}
                    {isRealUploaded ? (
                      <div
                        onClick={() =>
                          setPreviewDoc({
                            title: `${doc.title} - ${currentPengajuan.namaPemohon}`,
                            base64: realBase64!,
                            fileName: docFile?.name || `${doc.key}_${currentPengajuan.namaPemohon}.jpg`,
                            isSample: false,
                          })
                        }
                        style={{
                          width: '44px',
                          height: '52px',
                          borderRadius: '8px',
                          border: '1.5px solid #CBD5E1',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          flexShrink: 0,
                          backgroundColor: '#FFFFFF',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Klik untuk membuka dokumen asli pemohon"
                      >
                        {isPdf ? (
                          <div style={{ textAlign: 'center', color: '#DC2626' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>picture_as_pdf</span>
                            <div style={{ fontSize: '0.6rem', fontWeight: 800 }}>PDF</div>
                          </div>
                        ) : (
                          <>
                            <img
                              src={realBase64!}
                              alt={doc.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'rgba(0,0,0,0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#FFFFFF',
                                fontSize: '13px',
                              }}
                            >
                              👁️
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div
                        style={{
                          width: '44px',
                          height: '52px',
                          borderRadius: '8px',
                          border: '1.5px dashed #CBD5E1',
                          overflow: 'hidden',
                          flexShrink: 0,
                          backgroundColor: '#F1F5F9',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#94A3B8',
                          gap: '2px',
                        }}
                        title="Dokumen belum diunggah oleh pemohon"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                          note_add
                        </span>
                        <span style={{ fontSize: '0.6rem', fontWeight: 600 }}>Kosong</span>
                      </div>
                    )}

                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{docIdx + 1}. {doc.title}</span>
                        {isRealUploaded ? (
                          <span style={{ fontSize: '0.68rem', backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0', padding: '1px 8px', borderRadius: '4px', fontWeight: 600 }}>
                            ✓ Diunggah Pemohon
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.68rem', backgroundColor: '#FEF3C7', color: '#B45309', padding: '1px 8px', borderRadius: '4px', fontWeight: 600 }}>
                            Belum Diunggah
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                        {isRealUploaded ? (
                          <span>
                            📄 {docFile?.name || 'Dokumen Asli'} ({docFile?.sizeKB || Math.round((realBase64!.length * 0.75) / 1024)} KB)
                          </span>
                        ) : (
                          <span>{doc.note}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons: LIHAT DOKUMEN, UNDUH & UPLOAD FISIK */}
                  <div className="detail-doc-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
                    {/* Tombol Utama: LIHAT DOKUMEN */}
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewDoc({
                          title: isRealUploaded
                            ? `${doc.title} - ${currentPengajuan.namaPemohon}`
                            : `[Contoh Template] ${doc.title}`,
                          base64: activeBase64,
                          fileName: docFile?.name || `${doc.key}_${currentPengajuan.namaPemohon}.jpg`,
                          isSample: !isRealUploaded,
                        })
                      }
                      style={{
                        background: isRealUploaded ? '#005BB5' : '#FFFFFF',
                        color: isRealUploaded ? '#FFFFFF' : '#005BB5',
                        border: isRealUploaded ? 'none' : '1px solid #005BB5',
                        borderRadius: '8px',
                        padding: '7px 14px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: isRealUploaded ? '0 2px 6px rgba(0, 91, 181, 0.25)' : 'none',
                      }}
                      title={isRealUploaded ? "Lihat dokumen asli yang diunggah pemohon" : "Lihat contoh template format acuan"}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                        {isRealUploaded ? 'visibility' : 'description'}
                      </span>
                      <span>{isRealUploaded ? 'Lihat Dokumen' : 'Contoh Template'}</span>
                    </button>

                    {/* Tombol Unduh */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isRealUploaded && realBase64) {
                          handleDownloadDoc(doc.title, realBase64, docFile?.name);
                        } else {
                          // Jika belum ada, tawarkan unduh contoh template
                          if (confirm(`Pemohon belum mengunggah dokumen "${doc.title}". Apakah Anda ingin mengunduh lembar contoh template resmi untuk diberikan kepada pemohon?`)) {
                            handleDownloadDoc(`Contoh_Template_${doc.title}`, doc.sample, `Contoh_Template_${doc.key}.jpg`);
                          }
                        }
                      }}
                      style={{
                        background: '#FFFFFF',
                        color: isRealUploaded ? '#0F172A' : '#64748B',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title={isRealUploaded ? "Unduh dokumen asli pemohon ke laptop" : "Unduh lembar template resmi"}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                        download
                      </span>
                      <span>Unduh</span>
                    </button>

                    {/* Tombol Upload Fisik / Ganti Berkas untuk Staf */}
                    <label
                      style={{
                        background: isRealUploaded ? '#FFFFFF' : '#EFF6FF',
                        color: isRealUploaded ? '#475569' : '#005BB5',
                        border: isRealUploaded ? '1px dashed #94A3B8' : '1.5px solid #005BB5',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: isUploadingDoc === doc.key ? 'wait' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: !isRealUploaded ? '0 1px 4px rgba(0, 91, 181, 0.15)' : 'none',
                      }}
                      title="Unggah scan/foto berkas fisik pemohon langsung ke database MapahTrip"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
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

        {/* Column 2: OWNER ONLY (Keuangan Pengajuan & Verifikasi Pembayaran) vs STAFF (Penugasan & Jadwal Konsuler) */}
        {isOwner ? (
          <div className="card" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #F0FDF4 100%)', border: '1px solid #A7F3D0', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#059669' }}>
                  payments
                </span>
                <h3 className="font-serif" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#064E3B', margin: 0 }}>
                  Verifikasi Pembayaran &amp; Keuangan
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {currentPengajuan.statusPembayaran === 'Menunggu Pembayaran' ? (
                  currentPengajuan.buktiBayarPemohon ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          backgroundColor: '#FFFBEB',
                          color: '#B45309',
                          border: '1px solid #FCD34D',
                          padding: '5px 10px',
                          borderRadius: '8px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#D97706', display: 'inline-block' }} />
                        <span>Struk Terunggah</span>
                      </span>

                      <button
                        type="button"
                        onClick={handleToggleStatusBayar}
                        className="btn-struk-verify"
                        style={{
                          background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                          color: '#FFFFFF',
                          border: 'none',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          padding: '6px 14px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                        title="Customer telah mengunggah bukti struk transfer! Klik di sini untuk mengonfirmasi status menjadi Lunas"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>verified</span>
                        <span>Verifikasi Lunas ✓</span>
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        className="badge badge-warning"
                        style={{ cursor: 'pointer', fontWeight: 700 }}
                        onClick={handleToggleStatusBayar}
                        title="Klik untuk ubah status pembayaran"
                      >
                        ⏳ Menunggu Bayar
                      </span>
                      <button
                        type="button"
                        onClick={handleToggleStatusBayar}
                        style={{
                          background: '#F1F5F9',
                          border: '1px solid #CBD5E1',
                          color: '#475569',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '5px',
                          cursor: 'pointer',
                        }}
                        title="Ubah status bayar manual"
                      >
                        Ubah
                      </button>
                    </div>
                  )
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        backgroundColor: '#DCFCE7',
                        color: '#15803D',
                        border: '1px solid #86EFAC',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        cursor: 'pointer',
                      }}
                      onClick={handleToggleStatusBayar}
                      title="Status Lunas (100%). Klik jika ingin mengubah kembali."
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>check_circle</span>
                      <span>Lunas (100%)</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleToggleStatusBayar}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        color: '#64748B',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        padding: '2px 7px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                      title="Batalkan status lunas"
                    >
                      Ubah
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Uang Masuk Pemohon */}
              <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '10px', border: '1px solid #A7F3D0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--on-surface-variant)', fontWeight: 600 }}>Nominal Dibayar Pemohon:</span>
                  <strong style={{ fontFamily: 'monospace', fontSize: '1.05rem', color: '#0F172A' }}>
                    {formatRupiah(currentPengajuan.dibayarPemohon)}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#64748B' }}>
                  <span>Rekening / Metode:</span>
                  <span style={{ fontWeight: 600, color: '#1E293B' }}>
                    {currentPengajuan.metodePembayaran || 'Transfer BTN (119001500015870) - Tokyo Asia Connection'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#64748B' }}>
                  <span>Tgl Pembayaran:</span>
                  <span style={{ fontWeight: 600, color: '#1E293B' }}>
                    {currentPengajuan.tglBayarPemohon || currentPengajuan.tglBerkasMasuk || 'Hari Ini'}
                  </span>
                </div>

                {/* Struk Bukti Transfer Pemohon */}
                <div style={{ marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 600 }}>Bukti Struk Transfer:</span>
                    {currentPengajuan.buktiBayarPemohon && currentPengajuan.statusPembayaran === 'Menunggu Pembayaran' && (
                      <span style={{ backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D', fontSize: '0.66rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                        ⚡ Butuh Verifikasi
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {currentPengajuan.buktiBayarPemohon ? (
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewDoc({
                            title: `Struk Transfer - ${currentPengajuan.namaPemohon}`,
                            base64: currentPengajuan.buktiBayarPemohon!,
                            fileName: currentPengajuan.buktiBayarNama || 'Struk_Pembayaran.jpg',
                          })
                        }
                        style={{
                          background: '#ECFDF5',
                          border: '1px solid #A7F3D0',
                          color: '#065F46',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                          visibility
                        </span>
                        <span>Lihat Struk</span>
                      </button>
                    ) : null}

                    <label
                      style={{
                        background: currentPengajuan.buktiBayarPemohon ? '#F8FAFC' : '#EFF6FF',
                        border: currentPengajuan.buktiBayarPemohon ? '1px solid #CBD5E1' : '1px solid #BFDBFE',
                        color: currentPengajuan.buktiBayarPemohon ? '#475569' : '#1D4ED8',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                        upload_file
                      </span>
                      <span>{currentPengajuan.buktiBayarPemohon ? 'Ganti' : '+ Upload Struk'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadBuktiBayar(file);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Rincian Biaya Modal & Komisi Referral */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--on-surface-variant)' }}>Biaya Konsulat &amp; Nominal Keluar:</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--error)', fontWeight: 600 }}>
                  - {formatRupiah(currentPengajuan.nominalKeluar)}
                </span>
              </div>

              {/* Komisi Referral untuk Mitra Affiliate Pemilik Kode */}
              {(() => {
                const hasMitra = Boolean(
                  currentPengajuan.affiliateCode &&
                  currentPengajuan.affiliateCode.trim() !== '' &&
                  currentPengajuan.affiliateCode.toUpperCase() !== 'MAPAHTRIP'
                );
                const refFeeVal = currentPengajuan.referralFee > 0
                  ? currentPengajuan.referralFee
                  : (hasMitra ? 100000 : 0);

                if (hasMitra || refFeeVal > 0) {
                  return (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--on-surface-variant)' }}>
                        Komisi Referral Mitra ({currentPengajuan.affiliateCode || 'Mitra'}):
                      </span>
                      <span style={{ fontFamily: 'monospace', color: '#D97706', fontWeight: 700 }}>
                        - {formatRupiah(refFeeVal)}
                      </span>
                    </div>
                  );
                }
                return (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--on-surface-variant)' }}>Referral / Affiliate Fee:</span>
                    <span style={{ fontFamily: 'monospace', color: '#94A3B8', fontWeight: 600 }}>Rp 0</span>
                  </div>
                );
              })()}

              {/* Cashback Mitra / Vendor (jika ada cashback riil) */}
              {currentPengajuan.cashback > 0 && !Boolean(currentPengajuan.affiliateCode && currentPengajuan.affiliateCode.toUpperCase() !== 'MAPAHTRIP') && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--on-surface-variant)' }}>Cashback Mitra:</span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--success)', fontWeight: 600 }}>
                    + {formatRupiah(currentPengajuan.cashback)}
                  </span>
                </div>
              )}

              {/* Fee Bersih & Margin Riil */}
              <div
                style={{
                  borderTop: '2px dashed rgba(16, 185, 129, 0.35)',
                  paddingTop: '12px',
                  marginTop: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#047857', textTransform: 'uppercase', fontWeight: 700 }}>
                    Fee Bersih MapahTrip
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>
                    Margin Laba: {((currentPengajuan.feeBersih / (currentPengajuan.dibayarPemohon || 1)) * 100).toFixed(1)}%
                  </div>
                </div>
                <span
                  className="font-serif font-mono-tabular"
                  style={{ fontSize: '1.45rem', fontWeight: 800, color: '#047857' }}
                >
                  {formatRupiah(currentPengajuan.feeBersih)}
                </span>
              </div>

              {currentPengajuan.affiliateCode && (
                <div
                  style={{
                    marginTop: '4px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    fontSize: '0.78rem',
                    color: '#065F46',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Kode Mitra Terdaftar:</span>
                  <strong style={{ color: '#047857' }}>{currentPengajuan.affiliateCode}</strong>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '8px' }}>
              <h3 className="font-serif" style={{ fontSize: '1.08rem', fontWeight: 700, margin: 0, minWidth: 0 }}>
                Penugasan &amp; Jadwal Konsuler
              </h3>
              <span className="badge badge-success" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                ✓ Terverifikasi
              </span>
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

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--on-surface-variant)' }}>Status Administrasi:</span>
                {currentPengajuan.statusPembayaran === 'Lunas' ? (
                  <span style={{ backgroundColor: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', padding: '3px 8px', borderRadius: '6px', fontSize: '0.76rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span>✓</span>
                    <span>Lunas (Siap Apply JVAC)</span>
                  </span>
                ) : (
                  <span style={{ backgroundColor: '#FFFBEB', color: '#B45309', border: '1px solid #FCD34D', padding: '3px 8px', borderRadius: '6px', fontSize: '0.76rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span>⏳</span>
                    <span>Belum Lunas (Tahan Berkas)</span>
                  </span>
                )}
              </div>

              {/* Peringatan khusus staf jika customer belum bayar */}
              {currentPengajuan.statusPembayaran !== 'Lunas' && (
                <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '8px 10px', fontSize: '0.74rem', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '8px', lineHeight: 1.3 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#DC2626', flexShrink: 0 }}>
                    warning
                  </span>
                  <span>
                    <strong>Pemberitahuan Staf:</strong> Pemohon belum lunas. Tahan penyerahan berkas ke JVAC sampai status diverifikasi Lunas oleh Owner/Admin.
                  </span>
                </div>
              )}

              {/* Info Struk Transfer jika customer sudah unggah */}
              {currentPengajuan.buktiBayarPemohon && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--on-surface-variant)' }}>Bukti Struk Transfer:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewDoc({
                        title: `Struk Transfer - ${currentPengajuan.namaPemohon}`,
                        base64: currentPengajuan.buktiBayarPemohon!,
                        fileName: currentPengajuan.buktiBayarNama || 'Struk_Pembayaran.jpg',
                      })
                    }
                    style={{
                      background: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      color: '#065F46',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>visibility</span>
                    <span>Lihat Struk</span>
                  </button>
                </div>
              )}

              {pengajuan.affiliateCode && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--on-surface-variant)' }}>Mitra Pengirim:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{pengajuan.affiliateCode}</span>
                </div>
              )}
            </div>
          </div>
        )}
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
                background: previewDoc.isSample ? '#FFFBEB' : '#F8FAFC',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  className="material-symbols-outlined"
                  style={{ color: previewDoc.isSample ? '#D97706' : '#2B68E0', fontSize: '24px' }}
                >
                  {previewDoc.isSample ? 'help_outline' : 'verified'}
                </span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{previewDoc.title}</span>
                    {previewDoc.isSample ? (
                      <span style={{ fontSize: '0.68rem', backgroundColor: '#FEF3C7', color: '#92400E', padding: '1px 8px', borderRadius: '4px', fontWeight: 700 }}>
                        Contoh Template Konsulat
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.68rem', backgroundColor: '#DCFCE7', color: '#15803D', padding: '1px 8px', borderRadius: '4px', fontWeight: 700 }}>
                        ✓ Dokumen Asli Pemohon
                      </span>
                    )}
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
                {previewDoc.isSample
                  ? 'Format acuan standar Konsulat Jenderal Jepang'
                  : `Dokumen Arsip: ${currentPengajuan.namaPemohon} (${currentPengajuan.noPengajuan})`}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleDownloadDoc(previewDoc.title, previewDoc.base64, previewDoc.fileName)}
                  className="btn btn-primary"
                  style={{
                    padding: '8px 18px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    download
                  </span>
                  <span>Unduh Dokumen</span>
                </button>
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
