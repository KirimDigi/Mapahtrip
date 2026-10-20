import React, { useState } from 'react';
import { mockKonsjen, mockStaff } from '../data/mockData';
import { kirimPesanWA } from '../whatsapp';

export const PengaturanView: React.FC = () => {
  const [testNomor, setTestNomor] = useState('');
  const [testPesan, setTestPesan] = useState('Halo! Ini pesan tes dari sistem MapahTrip via Gateway WA KirimDIgi.');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ status: 'idle' | 'success' | 'error'; message: string } | null>(null);

  const handleTestKirimWA = async () => {
    if (!testNomor.trim() || !testPesan.trim()) {
      alert('Silakan masukkan nomor WhatsApp Anda terlebih dahulu!');
      return;
    }
    setIsSending(true);
    setSendResult(null);
    try {
      const res = await kirimPesanWA(testNomor, testPesan);
      if (res && (res.success || res.status === 'success' || !res.error)) {
        const targetNumber = res.data?.number || testNomor;
        setSendResult({
          status: 'success',
          message: `${res.message || 'Pesan berhasil dikirim!'} (Tujuan: ${targetNumber})`
        });
      } else {
        setSendResult({
          status: 'error',
          message: res?.message || 'Gagal mengirim WhatsApp! Pastikan server gateway/ngrok lokal sedang aktif.',
        });
      }
    } catch (err: any) {
      setSendResult({
        status: 'error',
        message: err.message || 'Terjadi kesalahan jaringan saat menghubungi gateway.',
      });
    } finally {
      setIsSending(false);
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

      {/* WhatsApp Gateway Integration & Test Card */}
      <div className="card" style={{ borderLeft: '4px solid #25D366' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>chat</span>
            </div>
            <div>
              <h3 className="font-serif" style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                WhatsApp Gateway (KirimDIgi)
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>
                Endpoint: <code style={{ background: 'var(--surface-container)', padding: '2px 6px', borderRadius: '4px' }}>https://hypnotic-curtly-dealt.ngrok-free.dev/api/send</code> | Session: <strong>KirimDIgi</strong>
              </p>
            </div>
          </div>
          <span className="badge badge-success">Gateway Siap Digunakan</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
              Nomor WhatsApp Tujuan
            </label>
            <input
              type="text"
              className="input-field"
              value={testNomor}
              onChange={(e) => setTestNomor(e.target.value)}
              placeholder="Ketik nomor HP WhatsApp Anda (cth: 0812xxxxxxxx)"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(195, 198, 214, 0.4)',
                background: 'var(--surface)',
                color: 'var(--on-surface)',
                fontSize: '0.9rem'
              }}
            />
            <small style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '4px', display: 'block' }}>
              *Masukkan nomor WhatsApp asli Anda untuk melihat pesan masuk di HP.
            </small>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
              Isi Pesan WhatsApp
            </label>
            <textarea
              className="input-field"
              value={testPesan}
              onChange={(e) => setTestPesan(e.target.value)}
              rows={3}
              placeholder="Tulis pesan pengujian..."
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(195, 198, 214, 0.4)',
                background: 'var(--surface)',
                color: 'var(--on-surface)',
                fontSize: '0.9rem',
                resize: 'vertical'
              }}
            />
          </div>
        </div>

        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <button
            className="btn btn-primary"
            onClick={handleTestKirimWA}
            disabled={isSending}
            style={{
              background: '#059669',
              borderColor: '#059669',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              cursor: isSending ? 'not-allowed' : 'pointer'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              {isSending ? 'sync' : 'send'}
            </span>
            <span>{isSending ? 'Sedang Mengirim ke Gateway...' : 'Kirim Pesan WhatsApp Test'}</span>
          </button>

          {sendResult && (
            <div
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: sendResult.status === 'success' ? '#ecfdf5' : '#fef2f2',
                color: sendResult.status === 'success' ? '#047857' : '#b91c1c',
                border: `1px solid ${sendResult.status === 'success' ? '#a7f3d0' : '#fecaca'}`
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                {sendResult.status === 'success' ? 'check_circle' : 'error'}
              </span>
              <span>{sendResult.message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
