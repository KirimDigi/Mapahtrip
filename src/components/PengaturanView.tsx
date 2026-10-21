import React, { useState } from 'react';
import { mockKonsjen, mockStaff } from '../data/mockData';
import { getWAGatewayUrl, getWASessionId, kirimPesanWA, normalizeWANumber } from '../whatsapp';

export const PengaturanView: React.FC = () => {
  const [gatewayUrl, setGatewayUrl] = useState(() => getWAGatewayUrl());
  const [sessionId, setSessionId] = useState(() => getWASessionId());
  const [testNumber, setTestNumber] = useState('');
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleSaveConfig = () => {
    localStorage.setItem('mapahtrip_wa_gateway_url', gatewayUrl.trim());
    localStorage.setItem('mapahtrip_wa_session_id', sessionId.trim());
    setTestStatus('✓ Konfigurasi WhatsApp Gateway (URL & Session ID) berhasil disimpan!');
    setTimeout(() => setTestStatus(null), 3000);
  };

  const handleTestKirimWA = async () => {
    if (!testNumber.trim()) {
      alert('Masukkan nomor WhatsApp tujuan uji coba terlebih dahulu.');
      return;
    }
    setIsTesting(true);
    setTestStatus(null);
    try {
      const normalized = normalizeWANumber(testNumber.trim());
      const testMsg = `Halo! Ini adalah pesan uji coba koneksi WhatsApp Gateway MapahTrip (Session: ${sessionId}).\n\nWaktu: ${new Date().toLocaleString('id-ID')}\nStatus: Berhasil Terkoneksi ✅`;
      const res = await kirimPesanWA(normalized, testMsg);
      if (res && (res.success || res.status === 'success' || !res.error)) {
        setTestStatus(`✅ Pesan WhatsApp uji coba berhasil dikirim ke ${normalized}!`);
      } else {
        setTestStatus(`⚠️ Gateway merespons: ${res?.message || `Periksa apakah session '${sessionId}' terhubung di terminal/dashboard.`}`);
      }
    } catch (err: any) {
      setTestStatus(`❌ Gagal mengirim: ${err?.message || 'Pastikan server gateway aktif di port 2026.'}`);
    } finally {
      setIsTesting(false);
    }
  };

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
          Kelola master data Konsulat Jenderal, daftar Staff PIC, tarif konsuler, dan integrasi WhatsApp Gateway API.
        </p>
      </div>

      {/* WhatsApp Gateway Integration Card */}
      <div className="card" style={{ border: '1px solid #BBF7D0', backgroundColor: '#F0FDF4' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#10B981', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>chat</span>
            </div>
            <div>
              <h3 className="font-serif" style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#065F46' }}>
                WhatsApp Gateway API (Session: {sessionId})
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#047857' }}>
                Otomatis mengirim pesan konfirmasi pendaftaran &amp; update status visa ke pemohon.
              </p>
            </div>
          </div>
          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check_circle</span>
            Endpoint: port 2026 &bull; Session: {sessionId}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #D1FAE5' }}>
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Gateway Endpoint URL:
                </label>
                <input
                  type="text"
                  value={gatewayUrl}
                  onChange={(e) => setGatewayUrl(e.target.value)}
                  placeholder="http://localhost:2026/api/send"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Session ID:
                </label>
                <input
                  type="text"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="Mapahtrip"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                💡 Sesuai session terhubung di gateway: <strong>{sessionId}</strong>
              </span>
              <button
                type="button"
                onClick={handleSaveConfig}
                className="btn-primary"
                style={{ padding: '7px 16px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
              >
                Simpan Konfigurasi
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Uji Coba Kirim Pesan (Live Test):
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={testNumber}
                onChange={(e) => setTestNumber(e.target.value)}
                placeholder="Contoh: 081234567890 / 628xxx"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.85rem',
                }}
              />
              <button
                type="button"
                onClick={handleTestKirimWA}
                disabled={isTesting}
                style={{
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: isTesting ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>send</span>
                <span>{isTesting ? 'Mengirim...' : 'Tes Kirim'}</span>
              </button>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '4px', display: 'block' }}>
              Format otomatis mengenali nomor 08xx maupun 628xx.
            </span>
          </div>
        </div>

        {testStatus && (
          <div style={{ marginTop: '12px', fontSize: '0.84rem', fontWeight: 600, color: testStatus.startsWith('✅') || testStatus.startsWith('✓') ? '#15803D' : '#B91C1C' }}>
            {testStatus}
          </div>
        )}
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
