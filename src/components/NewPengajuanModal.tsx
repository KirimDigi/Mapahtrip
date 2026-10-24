import React, { useState } from 'react';
import type { Pengajuan, KonsjenKota, StaffName, PaketVisa } from '../types';

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
  const [namaPemohon, setNamaPemohon] = useState('');
  const [noPaspor, setNoPaspor] = useState('');
  const [noTelp, setNoTelp] = useState('');
  const [konsjen, setKonsjen] = useState<KonsjenKota>('Jakarta');
  const [staffPic, setStaffPic] = useState<StaffName>('Rizky Muhammad');
  const [program, setProgram] = useState('Tokutei Ginou (SSW 1)');
  const [paket, setPaket] = useState<PaketVisa>('Reguler');
  const [dibayarPemohon, setDibayarPemohon] = useState(2450000);
  const [nominalKeluar, setNominalKeluar] = useState(1650000);
  const [cashback, setCashback] = useState(100000);
  const [affiliateCode, setAffiliateCode] = useState('');
  const [referralFee, setReferralFee] = useState(100000);

  const [berkas, setBerkas] = useState({
    formVisa: true,
    ktp: true,
    ektln: true,
    coe: true,
    foto: true,
    pasporFisik: true,
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaPemohon.trim() || !noPaspor.trim()) {
      alert('Nama pemohon dan nomor paspor wajib diisi!');
      return;
    }

    const feeBersih = dibayarPemohon - nominalKeluar + cashback - (affiliateCode ? referralFee : 0);

    const masked =
      noPaspor.length >= 4
        ? noPaspor.slice(0, 3) + '••••' + noPaspor.slice(-1)
        : noPaspor;

    const todayStr = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const newItem: Pengajuan = {
      id: 'sub-' + Date.now(),
      noPengajuan: 'MT-' + Math.floor(1000 + Math.random() * 9000),
      namaPemohon: namaPemohon.trim(),
      noPaspor: noPaspor.trim().toUpperCase(),
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
      affiliateCode: affiliateCode.trim() ? affiliateCode.trim().toUpperCase() : undefined,
      berkas,
    };

    onSubmit(newItem);
    onClose();

    // Reset form
    setNamaPemohon('');
    setNoPaspor('');
    setNoTelp('');
    setAffiliateCode('');
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
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          borderRadius: '20px',
          backgroundColor: '#fff',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 className="font-serif" style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>
              Tambah Berkas Pemohon Baru
            </h2>
            <p style={{ fontSize: '0.825rem', color: 'var(--on-surface-variant)', margin: '4px 0 0' }}>
              Input data pemohon, berkas fisik, dan konsulat tujuan.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--on-surface-variant)',
            }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Section 1: Data Pemohon */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Nama Lengkap Pemohon *</label>
              <input
                type="text"
                required
                placeholder="Contoh: Muhammad Reza"
                value={namaPemohon}
                onChange={(e) => setNamaPemohon(e.target.value)}
                style={{ width: '100%', marginTop: '4px', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Nomor Paspor *</label>
              <input
                type="text"
                required
                placeholder="Contoh: E7892104"
                value={noPaspor}
                onChange={(e) => setNoPaspor(e.target.value)}
                style={{ width: '100%', marginTop: '4px', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Nomor WhatsApp / HP</label>
              <input
                type="text"
                placeholder="+62 812-xxxx-xxxx"
                value={noTelp}
                onChange={(e) => setNoTelp(e.target.value)}
                style={{ width: '100%', marginTop: '4px', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Program Visa</label>
              <select
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                style={{ width: '100%', marginTop: '4px', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                <optgroup label="Visa Kerja & Pelatihan">
                  <option value="Tokutei Ginou">Tokutei Ginou (SSW)</option>
                  <option value="Visa Magang (Kenshuusei)">Visa Magang (Kenshuusei)</option>
                  <option value="Tekutei Katsudou">Tekutei Katsudou (Designated Activities)</option>
                </optgroup>
                <optgroup label="Visa Turis & Kunjungan">
                  <option value="Tourist Single Entry">Tourist Single Entry</option>
                  <option value="Tourist Multiple Entry">Tourist Multiple Entry</option>
                  <option value="Japan e-Visa / Waiver">Japan e-Visa / Waiver</option>
                  <option value="Kunjungan Keluarga / Teman">Kunjungan Keluarga / Teman</option>
                  <option value="Visa Transit">Visa Transit</option>
                </optgroup>
                <optgroup label="Visa Bisnis & Lainnya">
                  <option value="Visa Bisnis">Visa Bisnis (Business / Meeting)</option>
                  <option value="Visa Pelajar / Student">Visa Pelajar / Student</option>
                  <option value="Visa Dependent / Spouse">Visa Dependent / Spouse</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Paket Layanan</label>
              <select
                value={paket}
                onChange={(e) => setPaket(e.target.value as PaketVisa)}
                style={{ width: '100%', marginTop: '4px', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                <option value="Reguler">Reguler</option>
                <option value="Premium">Premium</option>
                <option value="TAC">TAC</option>
              </select>
            </div>
          </div>

          {/* Referral info (Only show referral fee input to owner) */}
          <div style={{ display: 'grid', gridTemplateColumns: isOwner ? '1fr 1fr' : '1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Kode Mitra / Referral (Opsional)</label>
              <input
                type="text"
                placeholder="Contoh: MPH425MI atau LPK-JAPANCENTER"
                value={affiliateCode}
                onChange={(e) => setAffiliateCode(e.target.value)}
                style={{ width: '100%', marginTop: '4px', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>
            {isOwner && (
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Komisi Referral (Rp)</label>
                <input
                  type="number"
                  value={referralFee}
                  onChange={(e) => setReferralFee(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '4px', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>
            )}
          </div>

          {/* Section 2: Konsulat & PIC */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Wilayah Konsulat Jenderal (Konsjen)</label>
              <select
                value={konsjen}
                onChange={(e) => setKonsjen(e.target.value as KonsjenKota)}
                style={{ width: '100%', marginTop: '4px', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                <option value="Jakarta">Konsjen Jakarta</option>
                <option value="Surabaya">Konsjen Surabaya</option>
                <option value="Denpasar">Konsjen Denpasar (Bali)</option>
                <option value="Medan">Konsjen Medan</option>
                <option value="Makassar">Konsjen Makassar</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Staff PIC Bertugas</label>
              <select
                value={staffPic}
                onChange={(e) => setStaffPic(e.target.value as StaffName)}
                style={{ width: '100%', marginTop: '4px', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                <option value="Rizky Muhammad">Rizky Muhammad</option>
                <option value="Nanami Kay">Nanami Kay</option>
                <option value="Yulia">Yulia</option>
                <option value="Heru">Heru</option>
                <option value="Latifah">Latifah</option>
                <option value="Ulla">Ulla</option>
              </select>
            </div>
          </div>

          {/* Section 3: Keuangan (KHUSUS OWNER SAJA - Disembunyikan total dari Staf) */}
          {isOwner && (
            <div style={{ padding: '14px', borderRadius: '12px', background: '#FEF3C7', border: '1px solid #FDE68A', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400E' }}>Dibayar Pemohon (Rp)</label>
                <input
                  type="number"
                  value={dibayarPemohon}
                  onChange={(e) => setDibayarPemohon(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '4px', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400E' }}>Nominal Keluar (Rp)</label>
                <input
                  type="number"
                  value={nominalKeluar}
                  onChange={(e) => setNominalKeluar(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '4px', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400E' }}>Cashback (Rp)</label>
                <input
                  type="number"
                  value={cashback}
                  onChange={(e) => setCashback(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '4px', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
                />
              </div>
            </div>
          )}

          {/* Section 4: Berkas Fisik Checkboxes */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', display: 'block' }}>
              Verifikasi Kelengkapan Dokumen Fisik:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { key: 'formVisa', label: 'Formulir Visa Asli' },
                { key: 'pasporFisik', label: 'Paspor Fisik Asli' },
                { key: 'ktp', label: 'Fotokopi KTP & KK' },
                { key: 'ektln', label: 'E-KTLN BP2MI' },
                { key: 'coe', label: 'Sertifikat COE Asli' },
                { key: 'foto', label: 'Pas Foto 4.5x3.5 cm (2 lbr)' },
              ].map((doc) => (
                <label
                  key={doc.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.8rem',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: 'var(--surface-container-low)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={berkas[doc.key as keyof typeof berkas]}
                    onChange={(e) =>
                      setBerkas((prev) => ({
                        ...prev,
                        [doc.key]: e.target.checked,
                      }))
                    }
                  />
                  <span>{doc.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary">
              Simpan Berkas Pemohon
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
