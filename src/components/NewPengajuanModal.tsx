import React, { useState } from 'react';
import type { Pengajuan, KonsjenKota, StaffName, PaketVisa } from '../types';
import { compressImageUnder100KB } from '../utils/imageCompressor';

interface NewPengajuanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newPengajuan: Pengajuan) => void;
  isOwner?: boolean;
}

export const NewPengajuanModal: React.FC<NewPengajuanModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isOwner = false,
}) => {
  // Form fields sama persis dengan form customer
  const [namaPemohon, setNamaPemohon] = useState('');
  const [noTelp, setNoTelp] = useState('');
  const [noPaspor, setNoPaspor] = useState('');
  const [domisiliKtp, setDomisiliKtp] = useState('DKI Jakarta');
  const [domisiliLainnya, setDomisiliLainnya] = useState('');
  const [konsjen, setKonsjen] = useState<KonsjenKota>('Jakarta');
  const [staffPic, setStaffPic] = useState<StaffName>('Rizky');
  const [affiliateCode, setAffiliateCode] = useState('MAPAHTRIP');

  // Program & Paket
  const [program, setProgram] = useState('Tokutei Ginou (SSW 1)');
  const [paket, setPaket] = useState<PaketVisa>('Reguler');

  // Keuangan & Pembayaran Pemohon (khusus owner)
  const [dibayarPemohon, setDibayarPemohon] = useState(2450000);
  const [nominalKeluar, setNominalKeluar] = useState(1650000);
  const [cashback, setCashback] = useState(100000);
  const [referralFee, setReferralFee] = useState(100000);
  const [statusPembayaran, setStatusPembayaran] = useState<'Lunas' | 'Menunggu Pembayaran'>('Lunas');
  const [metodePembayaran, setMetodePembayaran] = useState('Transfer BCA (5780868611)');
  const [tglBayarPemohon, setTglBayarPemohon] = useState(new Date().toISOString().split('T')[0]);
  const [buktiBayarPemohon, setBuktiBayarPemohon] = useState<string | null>(null);
  const [buktiBayarNama, setBuktiBayarNama] = useState<string | null>(null);

  // Checkbox kelengkapan berkas fisik
  const [berkas, setBerkas] = useState({
    formVisa: true,
    pasporFisik: true,
    ktp: true,
    ektln: true,
    coe: true,
    foto: true,
  });

  // Upload dokumen & foto (sama persis dengan customer form)
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, { name: string; base64: string; sizeKB?: number }>>({});
  const [docsSizeKB, setDocsSizeKB] = useState<Record<string, { original: number; compressed: number }>>({});
  const [fotoBase64, setFotoBase64] = useState<string | null>(null);
  const [fotoSizeKB, setFotoSizeKB] = useState<{ original: number; compressed: number } | null>(null);
  const [isProcessingDoc, setIsProcessingDoc] = useState<string | null>(null);

  if (!isOpen) return null;

  // Auto-mapping Domisili KTP ke Konsulat & Staff PIC
  const handleSelectDomisili = (val: string) => {
    setDomisiliKtp(val);
    if (val === 'Jawa Timur' || val === 'Surabaya' || val === 'Kalimantan Timur' || val === 'Kalimantan Barat / Selatan') {
      setKonsjen('Surabaya');
      setStaffPic('Nanami Kay');
    } else if (val === 'Bali' || val === 'Denpasar' || val === 'Nusa Tenggara Barat (NTB)' || val === 'Nusa Tenggara Timur (NTT)') {
      setKonsjen('Denpasar');
      setStaffPic('Yulia');
    } else if (val === 'Medan' || val === 'Sumatera Utara' || val === 'Sumatera Barat' || val === 'Riau / Kepulauan Riau' || val === 'Aceh') {
      setKonsjen('Medan');
      setStaffPic('Heru');
    } else if (val === 'Makassar' || val === 'Sulawesi Selatan' || val === 'Sulawesi Utara / Tengah' || val === 'Maluku / Papua') {
      setKonsjen('Makassar');
      setStaffPic('Latifah');
    } else {
      setKonsjen('Jakarta');
      setStaffPic('Rizky');
    }
  };

  const handleSelectKonsjenManual = (k: KonsjenKota) => {
    setKonsjen(k);
    if (k === 'Surabaya') setStaffPic('Nanami Kay');
    else if (k === 'Denpasar') setStaffPic('Yulia');
    else if (k === 'Makassar') setStaffPic('Latifah');
    else if (k === 'Medan') setStaffPic('Heru');
    else setStaffPic('Rizky');
  };

  const handleUploadDocFile = async (docKey: string, file: File) => {
    setIsProcessingDoc(docKey);
    try {
      // Validasi khusus Form Visa: Wajib PDF
      if (docKey === 'formVisa' && !file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
        alert('Dokumen Form Visa wajib diunggah dalam format PDF (2 halaman). Silakan unggah format berkas PDF.');
        setIsProcessingDoc(null);
        return;
      }

      if (file.type.startsWith('image/')) {
        const comp = await compressImageUnder100KB(file);
        setUploadedDocs((prev) => ({
          ...prev,
          [docKey]: {
            name: file.name,
            base64: comp.base64,
            sizeKB: comp.compressedSizeKB,
          },
        }));
        setDocsSizeKB((prev) => ({
          ...prev,
          [docKey]: { original: comp.originalSizeKB, compressed: comp.compressedSizeKB },
        }));
        if (docKey === 'foto') {
          setFotoBase64(comp.base64);
          setFotoSizeKB({ original: comp.originalSizeKB, compressed: comp.compressedSizeKB });
        }
      } else {
        const r = new FileReader();
        r.onload = (re) => {
          const b64 = re.target?.result as string;
          if (b64) {
            setUploadedDocs((prev) => ({
              ...prev,
              [docKey]: {
                name: file.name,
                base64: b64,
                sizeKB: Math.round(file.size / 1024),
              },
            }));
          }
        };
        r.readAsDataURL(file);
      }
      setBerkas((prev) => ({ ...prev, [docKey]: true }));
    } catch (err: any) {
      alert(`Gagal memproses berkas: ${err.message}`);
    } finally {
      setIsProcessingDoc(null);
    }
  };

  const handleRemoveDocFile = (docKey: string) => {
    setUploadedDocs((prev) => {
      const next = { ...prev };
      delete next[docKey];
      return next;
    });
    setDocsSizeKB((prev) => {
      const next = { ...prev };
      delete next[docKey];
      return next;
    });
    if (docKey === 'foto') {
      setFotoBase64(null);
      setFotoSizeKB(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaPemohon.trim()) {
      alert('Nama pemohon wajib diisi!');
      return;
    }

    const finalDomisili = domisiliKtp === 'Lainnya' ? (domisiliLainnya.trim() || 'Lainnya') : domisiliKtp;
    const finalNoPaspor = noPaspor.trim() ? noPaspor.trim().toUpperCase() : '-';

    const feeBersih = dibayarPemohon - nominalKeluar + cashback - (affiliateCode ? referralFee : 0);

    const masked =
      finalNoPaspor.length >= 4 && finalNoPaspor !== '-'
        ? finalNoPaspor.slice(0, 3) + '••••' + finalNoPaspor.slice(-1)
        : finalNoPaspor;

    const todayStr = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const newItem: Pengajuan = {
      id: 'sub-' + Date.now(),
      noPengajuan: 'MT-' + Math.floor(1000 + Math.random() * 9000),
      namaPemohon: namaPemohon.trim(),
      noPaspor: finalNoPaspor,
      maskedPaspor: masked.toUpperCase(),
      noTelp: noTelp.trim() || '+62 812-0000-0000',
      konsjen,
      staffPic,
      program,
      paket,
      tglBerkasMasuk: todayStr,
      tglApply: 'Jadwal Hari Kerja Berikutnya',
      tglEstimasiSelesai: '5 Hari Kerja Konsuler',
      status: 'Menunggu Verifikasi',
      dibayarPemohon,
      nominalKeluar,
      cashback,
      referralFee: affiliateCode ? referralFee : 0,
      feeBersih,
      affiliateCode: affiliateCode.trim() ? affiliateCode.trim().toUpperCase() : 'MAPAHTRIP',
      berkas,
      catatan: `Input Berkas Pemohon via Portal Staf. Domisili: ${finalDomisili}`,
      fotoBase64: fotoBase64 || uploadedDocs['foto']?.base64,
      fotoSizeKB: fotoSizeKB?.compressed || uploadedDocs['foto']?.sizeKB,
      uploadedDocs: Object.keys(uploadedDocs).length > 0 ? uploadedDocs : undefined,
      statusPembayaran,
      metodePembayaran,
      tglBayarPemohon,
      buktiBayarPemohon: buktiBayarPemohon || undefined,
      buktiBayarNama: buktiBayarNama || undefined,
    };

    onSubmit(newItem);
    onClose();

    // Reset form
    setNamaPemohon('');
    setNoPaspor('');
    setNoTelp('');
    setDomisiliKtp('DKI Jakarta');
    setDomisiliLainnya('');
    setAffiliateCode('MAPAHTRIP');
    setUploadedDocs({});
    setFotoBase64(null);
    setFotoSizeKB(null);
    setStatusPembayaran('Lunas');
    setBuktiBayarPemohon(null);
    setBuktiBayarNama(null);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '28px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
          borderRadius: '20px',
          backgroundColor: '#FFFFFF',
        }}
      >
        {/* Header Modal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#005BB5' }}>
                person_add
              </span>
              <h2 className="font-serif" style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                Tambah Berkas Pemohon Baru
              </h2>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '4px 0 0' }}>
              Formulir terpadu data pemohon, konsulat, paket layanan, dan unggah berkas fisik visa Jepang.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748B',
              fontSize: '16px',
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* SECTION 1: DATA IDENTITAS PEMOHON (Sama Persis dengan Form Customer) */}
          <div style={{ padding: '16px', borderRadius: '14px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#005BB5' }}>
                badge
              </span>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                1. Data Identitas Pemohon
              </h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Nama Lengkap Pemohon */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Nama Lengkap Pemohon <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama lengkap sesuai KTP / Paspor (contoh: Muhammad Reza)"
                  value={namaPemohon}
                  onChange={(e) => setNamaPemohon(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#005BB5')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#CBD5E1')}
                />
              </div>

              {/* Baris 2 Kolom: No WA & No Paspor */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* No. WhatsApp */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    No. WhatsApp Aktif <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="08123456789 atau +62812xxxx"
                    value={noTelp}
                    onChange={(e) => setNoTelp(e.target.value.replace(/[^0-9+ -]/g, ''))}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: '#FFFFFF',
                      color: '#0F172A',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#005BB5')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#CBD5E1')}
                  />
                </div>

                {/* No. Paspor */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Nomor Paspor <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>(opsional jika belum ada)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: E7892104 atau -"
                    value={noPaspor}
                    onChange={(e) => setNoPaspor(e.target.value.toUpperCase())}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: '#FFFFFF',
                      color: '#0F172A',
                      textTransform: 'uppercase',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#005BB5')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#CBD5E1')}
                  />
                </div>
              </div>

              {/* Baris 2 Kolom: Domisili KTP & Wilayah Konsulat */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Domisili KTP (Auto-Routing Konsulat) */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Domisili KTP <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <select
                    value={domisiliKtp}
                    onChange={(e) => handleSelectDomisili(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.86rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: '#FFFFFF',
                      color: '#0F172A',
                      cursor: 'pointer',
                    }}
                  >
                    <optgroup label="Yurisdiksi Konsulat Jakarta">
                      <option value="DKI Jakarta">DKI Jakarta / Jakarta</option>
                      <option value="Jawa Barat">Jawa Barat</option>
                      <option value="Banten">Banten</option>
                      <option value="Jawa Tengah">Jawa Tengah</option>
                      <option value="DI Yogyakarta">DI Yogyakarta</option>
                      <option value="Lampung">Lampung</option>
                      <option value="Sumatera Selatan">Sumatera Selatan</option>
                    </optgroup>
                    <optgroup label="Yurisdiksi Konsulat Surabaya">
                      <option value="Surabaya">Surabaya</option>
                      <option value="Jawa Timur">Jawa Timur</option>
                      <option value="Kalimantan Timur">Kalimantan Timur</option>
                      <option value="Kalimantan Barat / Selatan">Kalimantan Barat / Selatan</option>
                    </optgroup>
                    <optgroup label="Yurisdiksi Konsulat Denpasar">
                      <option value="Denpasar">Denpasar</option>
                      <option value="Bali">Bali</option>
                      <option value="Nusa Tenggara Barat (NTB)">Nusa Tenggara Barat (NTB)</option>
                      <option value="Nusa Tenggara Timur (NTT)">Nusa Tenggara Timur (NTT)</option>
                    </optgroup>
                    <optgroup label="Yurisdiksi Konsulat Medan">
                      <option value="Medan">Medan</option>
                      <option value="Sumatera Utara">Sumatera Utara</option>
                      <option value="Sumatera Barat">Sumatera Barat</option>
                      <option value="Riau / Kepulauan Riau">Riau / Kepulauan Riau</option>
                      <option value="Aceh">Aceh</option>
                    </optgroup>
                    <optgroup label="Yurisdiksi Konsuler Makassar">
                      <option value="Makassar">Makassar</option>
                      <option value="Sulawesi Selatan">Sulawesi Selatan</option>
                      <option value="Sulawesi Utara / Tengah">Sulawesi Utara / Tengah</option>
                      <option value="Maluku / Papua">Maluku / Papua</option>
                    </optgroup>
                    <optgroup label="Lainnya">
                      <option value="Lainnya">Lainnya / Tulis Sendiri...</option>
                    </optgroup>
                  </select>
                </div>

                {/* Wilayah Konsulat Pengajuan (Konsjen) */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Wilayah Konsulat Pengajuan <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <select
                    value={konsjen}
                    onChange={(e) => handleSelectKonsjenManual(e.target.value as KonsjenKota)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #005BB5',
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: '#EFF6FF',
                      color: '#005BB5',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="Jakarta">Konsjen Jakarta (Kedutaan / JVAC)</option>
                    <option value="Surabaya">Konsjen Surabaya</option>
                    <option value="Denpasar">Konsjen Denpasar (Bali)</option>
                    <option value="Medan">Konsjen Medan</option>
                    <option value="Makassar">Kantor Konsuler Makassar</option>
                  </select>
                </div>
              </div>

              {domisiliKtp === 'Lainnya' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                    Tuliskan Domisili KTP
                  </label>
                  <input
                    type="text"
                    value={domisiliLainnya}
                    onChange={(e) => setDomisiliLainnya(e.target.value)}
                    placeholder="Tuliskan Provinsi / Domisili KTP"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #005BB5',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: '#FFFFFF',
                      color: '#0F172A',
                    }}
                  />
                </div>
              )}

              {/* Notifikasi Routing Konsulat & PIC */}
              <div
                style={{
                  backgroundColor: '#F0F9FF',
                  border: '1px solid #BAE6FD',
                  borderRadius: '10px',
                  padding: '9px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.78rem',
                  color: '#0369A1',
                  flexWrap: 'wrap',
                  gap: '6px',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#0284C7' }}>
                    domain
                  </span>
                  <span>Konsulat: <strong>{konsjen}</strong></span>
                </span>
                <span>
                  Staff PIC Bertugas: <strong>{staffPic}</strong>
                </span>
              </div>

              {/* Kode Mitra / Referral */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>
                    Kode Mitra / Referral
                  </label>
                  <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                    Default: <strong>MAPAHTRIP</strong>
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#005BB5' }}>
                    loyalty
                  </span>
                  <input
                    type="text"
                    value={affiliateCode}
                    onChange={(e) => setAffiliateCode(e.target.value.toUpperCase())}
                    placeholder="MAPAHTRIP atau Kode Mitra (MPH425MI)"
                    style={{
                      border: 'none',
                      outline: 'none',
                      width: '100%',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#0F172A',
                      backgroundColor: 'transparent',
                      textTransform: 'uppercase',
                    }}
                  />
                  {affiliateCode && affiliateCode !== 'MAPAHTRIP' && (
                    <button
                      type="button"
                      onClick={() => setAffiliateCode('MAPAHTRIP')}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '12px' }}
                      title="Reset ke default"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: PROGRAM VISA & PILIHAN PAKET (Card Selector Modern Sesuai Customer) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#005BB5' }}>
                workspace_premium
              </span>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                2. Program Visa &amp; Pilihan Paket Layanan
              </h4>
            </div>

            {/* Program Visa Dropdown */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Program Visa Jepang <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.86rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  cursor: 'pointer',
                }}
              >
                <optgroup label="Visa Kerja & Pelatihan">
                  <option value="Tokutei Ginou (SSW 1)">Tokutei Ginou (SSW 1 / SSW 2)</option>
                  <option value="Visa Magang (Kenshuusei)">Visa Magang (Kenshuusei / Trainee)</option>
                  <option value="Tekutei Katsudou">Tekutei Katsudou (Designated Activities)</option>
                </optgroup>
                <optgroup label="Visa Turis & Kunjungan">
                  <option value="Tourist Single Entry">Tourist Single Entry (e-Paspor & Reguler)</option>
                  <option value="Tourist Multiple Entry">Tourist Multiple Entry (5 Tahun)</option>
                  <option value="Japan e-Visa / Waiver">Japan e-Visa / Waiver (100% Online)</option>
                  <option value="Kunjungan Keluarga / Teman">Kunjungan Keluarga / Teman</option>
                  <option value="Visa Transit">Visa Transit</option>
                </optgroup>
                <optgroup label="Visa Bisnis & Lainnya">
                  <option value="Visa Bisnis">Visa Bisnis (Business / Meeting)</option>
                  <option value="Visa Pelajar / Student">Visa Pelajar / Student (Ryuugaku)</option>
                  <option value="Visa Dependent / Spouse">Visa Dependent / Spouse</option>
                </optgroup>
              </select>
            </div>

            {/* Pilihan Paket Layanan (3 Card Selector Persis Customer) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Pilihan Paket Layanan
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {[
                  { id: 'Reguler' as const, title: 'Reguler', desc: 'Standar QC & Submit', icon: 'check_circle' },
                  { id: 'Premium' as const, title: 'Premium', desc: 'Prioritas & Cepat', icon: 'bolt' },
                  { id: 'TAC' as const, title: 'TAC', desc: 'Pendampingan All-in', icon: 'verified' },
                ].map((pkg) => {
                  const isSelected = paket === pkg.id;
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setPaket(pkg.id)}
                      style={{
                        padding: '12px 10px',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid #005BB5' : '1px solid #E2E8F0',
                        backgroundColor: isSelected ? '#EFF6FF' : '#F8FAFC',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 2px 8px rgba(0, 91, 181, 0.15)' : 'none',
                      }}
                    >
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: isSelected ? '#005BB5' : '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: isSelected ? '#005BB5' : '#94A3B8' }}>
                          {pkg.icon}
                        </span>
                        <span>{pkg.title}</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: isSelected ? '#1E40AF' : '#64748B', marginTop: '2px' }}>
                        {pkg.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION 3: KELENGKAPAN BERKAS (UNGGAH DOKUMEN FISIK - Persis Customer) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#005BB5' }}>
                  upload_file
                </span>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  3. Kelengkapan Berkas (Unggah Dokumen)
                </h4>
              </div>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: Object.keys(uploadedDocs).length === 6 ? '#DCFCE7' : '#EFF6FF',
                  color: Object.keys(uploadedDocs).length === 6 ? '#15803D' : '#005BB5',
                }}
              >
                {Object.keys(uploadedDocs).length}/6 Dokumen Terunggah
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { key: 'formVisa' as const, label: 'Form Visa', sub: 'Wajib Format Dokumen PDF (2 Halaman)', accept: '.pdf,application/pdf' },
                { key: 'pasporFisik' as const, label: 'Paspor Fisik Asli', sub: 'Scan / foto halaman biodata paspor asli', accept: 'image/*,.pdf' },
                { key: 'ktp' as const, label: 'KTP & KK', sub: 'Fotokopi / scan e-KTP & Kartu Keluarga', accept: 'image/*,.pdf' },
                { key: 'ektln' as const, label: 'E-KTLN', sub: 'Elektronik Kartu Tenaga Kerja Luar Negeri BP2MI', accept: '.pdf,image/*' },
                { key: 'coe' as const, label: 'COE', sub: 'Certificate of Eligibility resmi MOJ Jepang', accept: '.pdf,image/*' },
                { key: 'foto' as const, label: 'Pas Foto', sub: 'Pasfoto 4.5 × 3.5 cm latar putih polos (< 100KB)', accept: 'image/*' },
              ].map((item) => {
                const docUploaded = uploadedDocs[item.key];
                const isImage = docUploaded?.base64 && docUploaded.base64.startsWith('data:image/');
                const isPdf = docUploaded?.name?.toLowerCase().endsWith('.pdf') || (docUploaded?.base64 && docUploaded.base64.startsWith('data:application/pdf'));

                return (
                  <div
                    key={item.key}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: docUploaded ? '1.5px solid #86EFAC' : '1px solid #E2E8F0',
                      backgroundColor: docUploaded ? '#F0FDF4' : '#F8FAFC',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        width: '100%',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                        {/* Icon atau Preview Gambar (Sama Persis seperti Halaman Customer) */}
                        {docUploaded ? (
                          <div
                            style={{
                              width: item.key === 'foto' ? '32px' : '42px',
                              height: '42px',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              border: '1.5px solid #16A34A',
                              flexShrink: 0,
                              backgroundColor: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {isImage ? (
                              <img
                                src={docUploaded.base64}
                                alt={item.label}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : isPdf ? (
                              <span className="material-symbols-outlined" style={{ color: '#DC2626', fontSize: '20px' }}>
                                picture_as_pdf
                              </span>
                            ) : (
                              <span className="material-symbols-outlined" style={{ color: '#16A34A', fontSize: '20px' }}>
                                check_circle
                              </span>
                            )}
                          </div>
                        ) : (
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: '22px', color: '#005BB5', flexShrink: 0 }}
                          >
                            attach_file
                          </span>
                        )}

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '0.85rem', color: '#0F172A' }}>
                              {item.label}
                            </strong>
                            <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                              &bull; {item.sub}
                            </span>
                          </div>
                          {isProcessingDoc === item.key && (
                            <div style={{ fontSize: '0.72rem', color: '#005BB5', fontWeight: 600, marginTop: '2px' }}>
                              ⏳ Sedang mengompresi otomatis di bawah 100 KB...
                            </div>
                          )}
                          {docUploaded && (
                            <div>
                              <div style={{ fontSize: '0.72rem', color: '#15803D', fontWeight: 600, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                📄 {docUploaded.name} ({docUploaded.sizeKB || '?'} KB)
                              </div>
                              {/* Badge Hasil Kompresi Gambar (< 100 KB) */}
                              {(docsSizeKB[item.key] || (item.key === 'foto' && fotoSizeKB)) && (() => {
                                const stat = docsSizeKB[item.key] || fotoSizeKB!;
                                return (
                                  <div style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                    <span style={{ textDecoration: 'line-through', color: '#94A3B8' }}>{stat.original} KB</span>
                                    <span style={{ fontWeight: 800, color: '#16A34A' }}>➔ {stat.compressed} KB</span>
                                    <span style={{ backgroundColor: '#DCFCE7', color: '#15803D', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                      ⚡ Auto-Compressed (&lt; 100 KB)
                                    </span>
                                  </div>
                                );
                              })()}
                              {/* Badge Dokumen PDF & Validasi Ukuran Ideal */}
                              {(isPdf || docUploaded.name.toLowerCase().endsWith('.pdf')) && (
                                <div style={{ fontSize: '0.7rem', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                  <span style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                    📄 Dokumen PDF ({docUploaded.sizeKB || '?'} KB)
                                  </span>
                                  {(docUploaded.sizeKB || 0) <= 2048 ? (
                                    <span style={{ backgroundColor: '#DCFCE7', color: '#15803D', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                      ✅ Ukuran Sangat Pas (&lt; 2 MB)
                                    </span>
                                  ) : (
                                    <span style={{ backgroundColor: '#FEF3C7', color: '#B45309', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                      ⚠️ Disarankan &lt; 2 MB
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tombol Aksi Upload */}
                      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="file"
                          id={`new-modal-upload-${item.key}`}
                          accept={item.accept}
                          style={{ display: 'none' }}
                          disabled={isProcessingDoc === item.key}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUploadDocFile(item.key, f);
                          }}
                        />
                        {docUploaded ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                color: '#15803D',
                                backgroundColor: '#DCFCE7',
                                padding: '3px 8px',
                                borderRadius: '6px',
                              }}
                            >
                              Terunggah
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveDocFile(item.key)}
                              style={{
                                border: 'none',
                                background: '#FEE2E2',
                                color: '#EF4444',
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Hapus file"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <label
                            htmlFor={`new-modal-upload-${item.key}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              backgroundColor: '#FFFFFF',
                              border: '1.5px solid #005BB5',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              color: '#005BB5',
                              cursor: 'pointer',
                              boxShadow: '0 1px 3px rgba(0, 91, 181, 0.1)',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                              {item.key === 'foto' ? 'add_a_photo' : 'upload_file'}
                            </span>
                            <span>{item.key === 'foto' ? 'Pilih Foto' : 'Pilih File'}</span>
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Khusus Form Visa: Box Unduh Formulir & Tatacara Pengisian */}
                    {item.key === 'formVisa' && (
                      <div
                        style={{
                          marginTop: '4px',
                          padding: '12px 14px',
                          borderRadius: '10px',
                          backgroundColor: '#F0F7FF',
                          border: '1px solid #BAE6FD',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          width: '100%',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: '18px', color: '#0284C7', flexShrink: 0, marginTop: '1px' }}
                          >
                            assignment_turned_in
                          </span>
                          <div style={{ fontSize: '0.75rem', color: '#0369A1', lineHeight: 1.45 }}>
                            <strong>Wajib Menggunakan Formulir Resmi Kedutaan Jepang (Format PDF):</strong> Silakan unduh form kosong &amp; ikuti panduan pengisian di bawah. Cetak, isi lengkap, tempel pasfoto 4.5 × 3.5 cm, tanda tangani, lalu unggah kembali dalam format dokumen PDF (2 halaman).
                            <div style={{ marginTop: '5px', fontSize: '0.72rem', color: '#1E40AF', backgroundColor: '#E0F2FE', padding: '4px 8px', borderRadius: '6px' }}>
                              💡 <strong>Ketentuan Berkas:</strong> Wajib format <strong>PDF (2 Halaman)</strong>. Ukuran ideal <strong>300 KB – 800 KB</strong> (maksimal 2 MB agar teks formulir dan pasfoto tetap tajam &amp; jelas).
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '2px' }}>
                          <a
                            href={`${import.meta.env.BASE_URL}documents/Formulir_Aplikasi_Visa_Jepang_MapahTrip.pdf`}
                            download="Formulir_Aplikasi_Visa_Jepang_MapahTrip.pdf"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '7px 12px',
                              borderRadius: '8px',
                              backgroundColor: '#FFFFFF',
                              color: '#0284C7',
                              border: '1.5px solid #0284C7',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              textDecoration: 'none',
                              boxShadow: '0 1px 3px rgba(2, 132, 199, 0.08)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
                            <span>Unduh Form Kosong (PDF)</span>
                          </a>

                          <a
                            href={`${import.meta.env.BASE_URL}documents/Panduan_Tatacara_Pengisian_Formulir_Visa_Jepang.pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '7px 12px',
                              borderRadius: '8px',
                              backgroundColor: '#FEF3C7',
                              color: '#92400E',
                              border: '1.5px solid #F59E0B',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              textDecoration: 'none',
                              boxShadow: '0 1px 3px rgba(245, 158, 11, 0.1)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>menu_book</span>
                            <span>Lihat Tatacara Pengisian (PDF)</span>
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 4: KEUANGAN & PEMBAYARAN PEMOHON (KHUSUS OWNER SAJA) */}
          {isOwner && (
            <div style={{ padding: '16px', borderRadius: '14px', background: '#FFFBEB', border: '1px solid #FDE68A', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#B45309' }}>
                    payments
                  </span>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#78350F', margin: 0 }}>
                    4. Verifikasi Pembayaran &amp; Keuangan (Owner)
                  </h4>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setStatusPembayaran('Lunas')}
                    style={{
                      border: 'none',
                      background: statusPembayaran === 'Lunas' ? '#10B981' : '#E2E8F0',
                      color: statusPembayaran === 'Lunas' ? '#FFFFFF' : '#475569',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      cursor: 'pointer',
                    }}
                  >
                    ✓ Lunas (100%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusPembayaran('Menunggu Pembayaran')}
                    style={{
                      border: 'none',
                      background: statusPembayaran === 'Menunggu Pembayaran' ? '#F59E0B' : '#E2E8F0',
                      color: statusPembayaran === 'Menunggu Pembayaran' ? '#FFFFFF' : '#475569',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      cursor: 'pointer',
                    }}
                  >
                    Menunggu Bayar
                  </button>
                </div>
              </div>

              {/* Baris 1: Detail Transaksi Uang Masuk Pemohon */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400E' }}>Metode / Rekening Tujuan</label>
                  <select
                    value={metodePembayaran}
                    onChange={(e) => setMetodePembayaran(e.target.value)}
                    style={{ width: '100%', marginTop: '4px', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: '0.80rem', fontWeight: 600, color: '#0F172A' }}
                  >
                    <option value="Transfer BCA (5780868611)">Transfer BCA (5780868611)</option>
                    <option value="Transfer Mandiri">Transfer Mandiri</option>
                    <option value="Transfer BNI">Transfer BNI</option>
                    <option value="Transfer BRI">Transfer BRI</option>
                    <option value="QRIS MapahTrip">QRIS MapahTrip</option>
                    <option value="Tunai (Cash Loket)">Tunai (Cash Loket)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400E' }}>Tanggal Pembayaran</label>
                  <input
                    type="date"
                    value={tglBayarPemohon}
                    onChange={(e) => setTglBayarPemohon(e.target.value)}
                    style={{ width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: '0.80rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400E' }}>Bukti Transfer (Struk Bank)</label>
                  <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px dashed #B45309',
                        background: '#FEF3C7',
                        color: '#92400E',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                        receipt_long
                      </span>
                      <span>{buktiBayarNama ? 'Ganti Struk' : 'Unggah Struk'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const { compressImageUnder100KB } = await import('../utils/imageCompressor');
                              const comp = await compressImageUnder100KB(file);
                              setBuktiBayarPemohon(comp.base64);
                              setBuktiBayarNama(file.name);
                            } catch {
                              const r = new FileReader();
                              r.onload = () => {
                                setBuktiBayarPemohon(r.result as string);
                                setBuktiBayarNama(file.name);
                              };
                              r.readAsDataURL(file);
                            }
                          }
                        }}
                      />
                    </label>
                    {buktiBayarNama && (
                      <button
                        type="button"
                        onClick={() => {
                          setBuktiBayarPemohon(null);
                          setBuktiBayarNama(null);
                        }}
                        style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer', fontSize: '0.70rem', fontWeight: 700 }}
                        title="Hapus struk"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {buktiBayarNama && (
                    <div style={{ fontSize: '0.68rem', color: '#166534', marginTop: '2px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      ✓ {buktiBayarNama}
                    </div>
                  )}
                </div>
              </div>

              {/* Baris 2: Empat Kolom Nominal Keuangan */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', paddingTop: '8px', borderTop: '1px dashed #FDE68A' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400E' }}>Dibayar Pemohon (Rp)</label>
                  <input
                    type="number"
                    value={dibayarPemohon}
                    onChange={(e) => setDibayarPemohon(Number(e.target.value))}
                    style={{ width: '100%', marginTop: '4px', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 700, color: '#0F172A' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400E' }}>Modal Keluar (Rp)</label>
                  <input
                    type="number"
                    value={nominalKeluar}
                    onChange={(e) => setNominalKeluar(Number(e.target.value))}
                    style={{ width: '100%', marginTop: '4px', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--error)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400E' }}>Cashback Mitra (Rp)</label>
                  <input
                    type="number"
                    value={cashback}
                    onChange={(e) => setCashback(Number(e.target.value))}
                    style={{ width: '100%', marginTop: '4px', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--success)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400E' }}>Komisi Referral (Rp)</label>
                  <input
                    type="number"
                    value={referralFee}
                    onChange={(e) => setReferralFee(Number(e.target.value))}
                    style={{ width: '100%', marginTop: '4px', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--warning)' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ padding: '9px 18px', fontSize: '0.84rem', fontWeight: 600 }}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                padding: '9px 24px',
                fontSize: '0.84rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(0, 91, 181, 0.25)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                save
              </span>
              <span>Simpan Berkas Pemohon</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
