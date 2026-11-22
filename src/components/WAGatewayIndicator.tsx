import React, { useState, useEffect } from 'react';
import {
  getWAOutbox,
  prosesAntreanWAOutbox,
  removeFromWAOutbox,
  clearWAOutbox,
  getDirectWALink,
  type WAOutboxItem,
} from '../whatsapp';

export const WAGatewayIndicator: React.FC = () => {
  const [outbox, setOutbox] = useState<WAOutboxItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryResult, setRetryResult] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isGatewayOnline, setIsGatewayOnline] = useState<boolean | null>(null);

  // Sync state dengan event outbox
  const syncOutbox = () => {
    setOutbox(getWAOutbox());
  };

  const checkGatewayHealth = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
      const url = isLocal ? '/api-wa/' : 'https://hypnotic-curtly-dealt.ngrok-free.dev/';
      const res = await fetch(url, {
        headers: { 'ngrok-skip-browser-warning': 'true' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      setIsGatewayOnline(res.status === 200);
    } catch {
      setIsGatewayOnline(false);
    }
  };

  const formatDisplayCreatedAt = (createdAt?: string) => {
    if (!createdAt) return '';
    // Format tanggal & tahun untuk item lama yang hanya tercatat jam-menit (misal "22.10")
    if (createdAt.length <= 5 && (createdAt.includes('.') || createdAt.includes(':'))) {
      const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
      return `${today} ${createdAt}`;
    }
    return createdAt;
  };

  useEffect(() => {
    syncOutbox();
    checkGatewayHealth();

    const handleOutboxChange = () => syncOutbox();
    const handleAutoFlushed = (e: any) => {
      syncOutbox();
      setIsGatewayOnline(true);
      if (e.detail && e.detail.sent > 0) {
        setRetryResult(`⚡ Koneksi Pulih: ${e.detail.sent} pesan terkirim otomatis!`);
        setTimeout(() => setRetryResult(null), 5000);
      }
    };
    window.addEventListener('mapahtrip_wa_outbox_changed', handleOutboxChange);
    window.addEventListener('mapahtrip_wa_sent', handleOutboxChange);
    window.addEventListener('mapahtrip_wa_auto_flushed', handleAutoFlushed);

    // Interval poller sync 3 detik & health check 8 detik
    const interval = setInterval(syncOutbox, 3000);
    const healthInterval = setInterval(checkGatewayHealth, 8000);

    return () => {
      window.removeEventListener('mapahtrip_wa_outbox_changed', handleOutboxChange);
      window.removeEventListener('mapahtrip_wa_sent', handleOutboxChange);
      window.removeEventListener('mapahtrip_wa_auto_flushed', handleAutoFlushed);
      clearInterval(interval);
      clearInterval(healthInterval);
    };
  }, []);

  const handleRetryAll = async () => {
    setIsRetrying(true);
    setRetryResult(null);
    try {
      const res = await prosesAntreanWAOutbox();
      if (res.sent > 0) {
        setRetryResult(`✅ Berhasil mengirim ${res.sent} pesan!`);
      } else if (res.remaining > 0) {
        setRetryResult(`⚠️ Gateway masih connecting/offline. ${res.remaining} pesan masih di antrean.`);
      } else {
        setRetryResult('Semua pesan antrean telah terkirim.');
      }
    } catch {
      setRetryResult('Gagal menghubungi gateway.');
    } finally {
      setIsRetrying(false);
      syncOutbox();
    }
  };

  const handleOpenDirect = async (item: WAOutboxItem) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(item.isiPesan);
        setCopiedId(item.id);
        setTimeout(() => setCopiedId(null), 3500);
      }
    } catch {}
    const url = getDirectWALink(item.nomorTujuan, item.isiPesan);
    window.open(url, '_blank');
  };

  const handleMarkDone = (id: string) => {
    removeFromWAOutbox(id);
    syncOutbox();
    setRetryResult('✓ Pesan ditandai sudah terkirim & dikeluarkan dari antrean.');
    setTimeout(() => setRetryResult(null), 3500);
  };

  const handleDeleteItem = (id: string) => {
    removeFromWAOutbox(id);
    syncOutbox();
  };

  const pendingCount = outbox.length;

  return (
    <div style={{ position: 'relative' }}>
      {/* Pill Tombol Status di Header */}
      <button
        type="button"
        className="wa-gateway-indicator-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '9999px',
          border: pendingCount > 0
            ? '1.5px solid #FCD34D'
            : isGatewayOnline === false
            ? '1.5px solid #CBD5E1'
            : '1px solid #BBF7D0',
          backgroundColor: pendingCount > 0
            ? '#FEF3C7'
            : isGatewayOnline === false
            ? '#F1F5F9'
            : '#F0FDF4',
          color: pendingCount > 0
            ? '#92400E'
            : isGatewayOnline === false
            ? '#64748B'
            : '#166534',
          fontSize: '0.72rem',
          fontWeight: 700,
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.15s ease',
          boxShadow: pendingCount > 0 ? '0 1px 4px rgba(245, 158, 11, 0.25)' : 'none',
        }}
        title={
          pendingCount > 0
            ? `Ada ${pendingCount} pesan WhatsApp menunggu sinyal online`
            : isGatewayOnline === false
            ? 'Aplikasi WhatsApp Gateway sedang mati / offline'
            : 'Koneksi WhatsApp Gateway Siap'
        }
      >
        <span
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: pendingCount > 0
              ? '#F59E0B'
              : isGatewayOnline === false
              ? '#94A3B8'
              : '#16A34A',
            display: 'inline-block',
            boxShadow: pendingCount > 0
              ? '0 0 6px #F59E0B'
              : isGatewayOnline === false
              ? 'none'
              : '0 0 4px #16A34A',
          }}
        />
        <span className="wa-indicator-desktop">
          {pendingCount > 0
            ? `⏳ WA: ${pendingCount} Tertunda`
            : isGatewayOnline === false
            ? 'WA Gateway: Offline'
            : 'WA Gateway: Siap'}
        </span>
        <span className="wa-indicator-mobile">
          {pendingCount > 0
            ? `⏳ ${pendingCount}`
            : isGatewayOnline === false
            ? 'WA: Offline'
            : 'WA: Siap'}
        </span>
      </button>

      {/* Modal / Popover Antrean Outbox */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: '360px',
            maxWidth: '92vw',
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 14px 35px rgba(0, 0, 0, 0.15)',
            zIndex: 1100,
            overflow: 'hidden',
          }}
        >
          {/* Header Popover */}
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#005BB5' }}>send</span>
                <span>Antrean WhatsApp (Outbox)</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '1px' }}>
                {pendingCount > 0
                  ? `⚡ Auto-kirim aktif: otomatis terkirim setiap 4 detik saat gateway online`
                  : 'Tidak ada pesan yang tertunda'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '4px',
              }}
            >
              ✕
            </button>
          </div>

          {/* Body Konten */}
          <div style={{ maxHeight: '340px', overflowY: 'auto', padding: '12px' }}>
            {retryResult && (
              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  backgroundColor: retryResult.includes('✅') ? '#DCFCE7' : '#FEF3C7',
                  color: retryResult.includes('✅') ? '#15803D' : '#92400E',
                  marginBottom: '10px',
                }}
              >
                {retryResult}
              </div>
            )}

            {pendingCount === 0 ? (
              isGatewayOnline === false ? (
                <div style={{ textAlign: 'center', padding: '22px 10px', color: '#64748B' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>
                    cloud_off
                  </span>
                  <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#334155' }}>
                    WhatsApp Gateway Sedang Offline
                  </div>
                  <div style={{ fontSize: '0.72rem', marginTop: '4px', lineHeight: 1.45, color: '#64748B' }}>
                    Aplikasi server di komputer belum aktif. Saat ada pemohon mendaftar, pesan otomatis disimpan di antrean ini sampai gateway online kembali.
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 10px', color: '#64748B' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#16A34A', display: 'block', marginBottom: '6px' }}>
                    check_circle
                  </span>
                  <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#0F172A' }}>
                    Semua Notifikasi Terkirim!
                  </div>
                  <div style={{ fontSize: '0.72rem', marginTop: '2px' }}>
                    Koneksi gateway siap &amp; tidak ada pesan tertunda di antrean.
                  </div>
                </div>
              )
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {outbox.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      padding: '10px',
                      backgroundColor: '#FAFAFA',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <div>
                        <span style={{ fontWeight: 800, fontSize: '0.80rem', color: '#0F172A' }}>
                          {item.namaPemohon}
                        </span>
                        <span
                          style={{
                            marginLeft: '6px',
                            backgroundColor: '#EFF6FF',
                            color: '#1D4ED8',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '0.64rem',
                            fontWeight: 700,
                          }}
                        >
                          Tahap {item.tahap}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.64rem', color: '#64748B', fontWeight: 600 }}>
                        {formatDisplayCreatedAt(item.createdAt)}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.70rem', color: '#475569', marginBottom: '6px', fontFamily: 'monospace' }}>
                      📱 {item.nomorTujuan}
                    </div>

                    <div
                      style={{
                        fontSize: '0.68rem',
                        color: '#64748B',
                        backgroundColor: '#F1F5F9',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        maxHeight: '44px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginBottom: '8px',
                      }}
                    >
                      {item.isiPesan.slice(0, 100)}...
                    </div>

                    {/* Tombol Aksi */}
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                      {copiedId === item.id && (
                        <span style={{ fontSize: '0.60rem', color: '#15803D', fontWeight: 700, backgroundColor: '#DCFCE7', padding: '2px 6px', borderRadius: '4px' }}>
                          ✓ Teks &amp; Emot Disalin
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenDirect(item)}
                        style={{
                          backgroundColor: '#25D366',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        title="Buka pesan ini di WhatsApp Web (teks & emoji otomatis disalin ke clipboard)"
                      >
                        <span>WA Web</span>
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>open_in_new</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMarkDone(item.id)}
                        style={{
                          backgroundColor: '#ECFDF5',
                          color: '#065F46',
                          border: '1px solid #A7F3D0',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                        title="Klik ini jika sudah dikirim manual di WhatsApp agar hilang dari antrean"
                      >
                        <span>✓ Tandai Terkirim</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        style={{
                          backgroundColor: '#F8FAFC',
                          color: '#94A3B8',
                          border: '1px solid #E2E8F0',
                          padding: '4px 6px',
                          borderRadius: '6px',
                          fontSize: '0.68rem',
                          cursor: 'pointer',
                        }}
                        title="Hapus / batalkan pesan ini dari antrean"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Popover */}
          {pendingCount > 0 && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#F8FAFC',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Tandai & bersihkan seluruh ${pendingCount} pesan dari antrean outbox?\n\n(Pesan yang sudah dikirim manual akan dihapus dari antrean dan indikator kembali hijau SIAP)`)) {
                    clearWAOutbox();
                    syncOutbox();
                  }
                }}
                style={{
                  background: 'none',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  color: '#475569',
                  padding: '5px 8px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
                title="Bersihkan semua pesan tertunda dari antrean"
              >
                <span>✓ Bersihkan Semua ({pendingCount})</span>
              </button>

              <button
                type="button"
                onClick={handleRetryAll}
                disabled={isRetrying}
                style={{
                  backgroundColor: '#005BB5',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: isRetrying ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  opacity: isRetrying ? 0.7 : 1,
                }}
              >
                {isRetrying ? 'Mencoba...' : '⚡ Kirim Ulang Sekarang'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

