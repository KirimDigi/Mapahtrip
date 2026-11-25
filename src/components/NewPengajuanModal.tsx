import React, { useState, useEffect, useRef } from 'react';
import type { Pengajuan, KonsjenKota, StaffName, PaketVisa, StaffMaster } from '../types';
import { optimizeDocumentUpload } from '../utils/documentOptimizer';
import { kirimPesanWA } from '../whatsapp';
import { findAffiliateByCode } from '../lib/supabase';
import { mockStaff } from '../data/mockData';
import { getVisaPrice, getVisaPricingList } from '../utils/visaPricing';
import { determineDefaultStaffPic } from '../utils/staffAssignment';

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
  const isBackdropMouseDown = useRef(false);
  const [noPaspor, setNoPaspor] = useState('');
  const [domisiliKtp, setDomisiliKtp] = useState('DKI Jakarta');
  const [domisiliLainnya, setDomisiliLainnya] = useState('');
  const [konsjen, setKonsjen] = useState<KonsjenKota>('Jakarta');
  const [staffPic, setStaffPic] = useState<StaffName>('Rizky');
  const [affiliateCode, setAffiliateCode] = useState('MAPAHTRIP');

  // Program & Paket
  const [program, setProgram] = useState('Tokutei Ginou (SSW 1)');
  const [paket, setPaket] = useState<PaketVisa>('Reguler');

  // Keuangan & Pembayaran Pemohon (dapat diedit oleh Owner maupun Staf)
  const [dibayarPemohon, setDibayarPemohon] = useState(() => getVisaPrice('Tokutei Ginou (SSW 1)', 'Reguler'));
  const [nominalKeluar, setNominalKeluar] = useState(() => Math.round(getVisaPrice('Tokutei Ginou (SSW 1)', 'Reguler') * 0.68));
  const [cashback, setCashback] = useState(100000);
  const [referralFee, setReferralFee] = useState(100000);

  // Live perhitungan fee bersih secara dinamis
  const liveFeeBersih = Math.max(0, dibayarPemohon - nominalKeluar + cashback - (affiliateCode ? referralFee : 0));
  const [statusPembayaran, setStatusPembayaran] = useState<'Lunas' | 'Menunggu Pembayaran'>('Menunggu Pembayaran');
  const [metodePembayaran, setMetodePembayaran] = useState('Transfer BTN (119001500015870) - Tokyo Asia Connection');
  const [tglBayarPemohon, setTglBayarPemohon] = useState(new Date().toISOString().split('T')[0]);
  const [buktiBayarPemohon, setBuktiBayarPemohon] = useState<string | null>(null);
  const [buktiBayarNama, setBuktiBayarNama] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  // Ambil daftar program visa kustom tambahan dari master tarif
  const customVisaOptions = React.useMemo(() => {
    if (!isOpen) return [];
    const allPrices = getVisaPricingList();
    const knownTitles = new Set([
      'Tokutei Ginou (SSW 1)', 'Visa Magang (Kenshuusei)', 'Tekutei Katsudou',
      'Tourist Single Entry', 'Tourist Multiple Entry', 'Japan e-Visa / Waiver',
      'Kunjungan Keluarga / Teman', 'Visa Transit', 'Visa Bisnis',
      'Visa Pelajar / Student', 'Visa Dependent / Spouse'
    ]);
    return allPrices.filter((v) => v.isCustom || !knownTitles.has(v.title));
  }, [isOpen]);

  // Handler tombol Esc / Escape untuk menutup modal Input Pemohon Baru & Sinkronisasi PIC
  useEffect(() => {
    if (!isOpen) return;
    const autoPic = determineDefaultStaffPic(program, konsjen);
    setStaffPic((autoPic || 'Rizky') as StaffName);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleProgramChange = (newProg: string) => {
    setProgram(newProg);
    const price = getVisaPrice(newProg, paket);
    setDibayarPemohon(price);
    setNominalKeluar(Math.round(price * 0.68));

    // Otomatis tentukan Staf PIC (Kunjungan -> Ulla untuk seluruh wilayah, lainnya -> Staf Regional)
    const autoPic = determineDefaultStaffPic(newProg, konsjen);
    setStaffPic((autoPic || 'Rizky') as StaffName);
  };

  const handlePaketChange = (newPkg: PaketVisa) => {
    setPaket(newPkg);
    const price = getVisaPrice(program, newPkg);
    setDibayarPemohon(price);
    setNominalKeluar(Math.round(price * 0.68));
  };

  // Checkbox kelengkapan berkas fisik
  const [berkas, setBerkas] = useState({
    formVisa: false,
    pasporFisik: false,
    ktp: false,
    ektln: false,
    coe: false,
    foto: false,
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
    let targetKonsjen: KonsjenKota = 'Jakarta';
    if (val === 'Jawa Timur' || val === 'Surabaya' || val === 'Kalimantan Timur' || val === 'Kalimantan Barat / Selatan') {
      targetKonsjen = 'Surabaya';
    } else if (val === 'Bali' || val === 'Denpasar' || val === 'Nusa Tenggara Barat (NTB)' || val === 'Nusa Tenggara Timur (NTT)') {
      targetKonsjen = 'Denpasar';
    } else if (val === 'Medan' || val === 'Sumatera Utara' || val === 'Sumatera Barat' || val === 'Riau / Kepulauan Riau' || val === 'Aceh') {
      targetKonsjen = 'Medan';
    } else if (val === 'Makassar' || val === 'Sulawesi Selatan' || val === 'Sulawesi Utara / Tengah' || val === 'Maluku / Papua') {
      targetKonsjen = 'Makassar';
    }
    setKonsjen(targetKonsjen);
    const autoStaff = determineDefaultStaffPic(program, targetKonsjen);
    if (autoStaff) {
      setStaffPic(autoStaff as StaffName);
    }
  };

  const handleSelectKonsjenManual = (k: KonsjenKota) => {
    setKonsjen(k);
    const autoStaff = determineDefaultStaffPic(program, k);
    if (autoStaff) {
      setStaffPic(autoStaff as StaffName);
    }
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

      const opt = await optimizeDocumentUpload(file);
      const b64 = opt.base64;
      const sizeKB = opt.sizeKB;
      const finalName = opt.file.name;

      setUploadedDocs((prev) => ({
        ...prev,
        [docKey]: {
          name: finalName,
          base64: b64,
          sizeKB: sizeKB,
        },
      }));
      setDocsSizeKB((prev) => ({
        ...prev,
        [docKey]: { original: opt.originalSizeKB, compressed: sizeKB },
      }));
      if (docKey === 'foto') {
        setFotoBase64(b64);
        setFotoSizeKB({ original: opt.originalSizeKB, compressed: sizeKB });
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
    if (isSubmittingRef.current) return;
    if (!namaPemohon.trim()) {
      alert('Nama pemohon wajib diisi!');
      return;
    }
    isSubmittingRef.current = true;

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

    const isWaiver = (program || '').toLowerCase().includes('waiver');

    const newItem: Pengajuan = {
      id: 'sub-' + Date.now(),
      noPengajuan: 'MT-' + Math.floor(1000 + Math.random() * 9000),
      namaPemohon: namaPemohon.trim(),
      noPaspor: finalNoPaspor,
      maskedPaspor: masked.toUpperCase(),
      noTelp: noTelp.trim() || '+62 812-0000-0000',
      konsjen,
      staffPic: isWaiver ? ('' as any) : staffPic,
      program,
      paket,
      tglBerkasMasuk: todayStr,
      tglApply: 'Jadwal Hari Kerja Berikutnya',
      tglEstimasiSelesai: '5 Hari Kerja Konsuler',
      status: 'Menunggu Verifikasi',
      dibayarPemohon,
      nominalKeluar: isWaiver ? 0 : nominalKeluar,
      cashback,
      referralFee: affiliateCode ? referralFee : 0,
      feeBersih,
      staffFee: isWaiver ? 0 : 0,
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

    // Otomatis kirim WhatsApp ke Mitra Affiliate jika diinput menggunakan kode referral
    const cleanAffCode = affiliateCode.trim().toUpperCase();
    if (cleanAffCode && cleanAffCode !== 'MAPAHTRIP') {
      findAffiliateByCode(cleanAffCode).then((affiliate) => {
        if (affiliate && affiliate.noWa && affiliate.noWa.trim()) {
          const pesanWAAffiliate =
`*PEMBERITAHUAN PENDAFTARAN BARU (KODE REFERRAL ANDA)* 🇯🇵🎉

Halo Kak *${affiliate.nama}*,

Kabar gembira! Ada pemohon visa baru yang didaftarkan ke sistem *MapahTrip* menggunakan kode referral Anda (*${cleanAffCode}*):

📋 *Data Pemohon Binaan Anda:*
• *ID Pengajuan:* *${newItem.noPengajuan}*
• *Nama Pemohon:* ${newItem.namaPemohon}
• *Program Visa:* ${newItem.program} (${newItem.paket})
• *Biaya Layanan:* Rp ${new Intl.NumberFormat('id-ID').format(newItem.dibayarPemohon)}
• *Konsulat Tujuan:* Konsjen ${newItem.konsjen}
• *Tanggal Daftar:* ${todayStr}

💰 *Estimasi Komisi Referral:*
• *Nominal Bonus:* *Rp 100.000*
• *Status Komisi:* Tercatat di sistem (Menunggu proses visa)

Anda dapat memantau status pemohon binaan dan akumulasi komisi Anda secara realtime melalui Portal Affiliate MapahTrip:
🌐 https://mapahtrip.id (Masuk ke menu Portal Affiliate)

Terima kasih atas rekomendasi dan kerja samanya bersama MapahTrip! 🌸🤝

Salam hangat,
*Tim Kemitraan MapahTrip*`;

          kirimPesanWA(affiliate.noWa.trim(), pesanWAAffiliate, {
            namaPemohon: `Mitra (${affiliate.nama})`,
            tahap: 'Notif Mitra',
          })
            .then((res) => {
              console.log('[WA Gateway] Sukses kirim notifikasi pendaftar baru ke Mitra Affiliate:', affiliate.noWa, res);
            })
            .catch((err) => {
              console.warn('[WA Gateway] Gagal kirim notifikasi ke Mitra Affiliate:', err);
            });
        }
      }).catch(() => {});
    }

    // Otomatis kirim WhatsApp ke Admin/Staf PIC MapahTrip sesuai wilayah Konsjen (HANYA jika bukan Visa Waiver)
    // Khusus Visa Waiver: 100% online diproses langsung oleh Owner/Pusat di sistem JAVES, Staf PIC Daerah tidak perlu dinotifikasi.
    let assignedStaff: StaffMaster | undefined;
    if (!isWaiver) {
      try {
        let regionalStaffList = mockStaff;
        if (typeof window !== 'undefined') {
          const savedStaff = localStorage.getItem('mapahtrip_staff_list');
          if (savedStaff) {
            const parsed: StaffMaster[] = JSON.parse(savedStaff);
            regionalStaffList = parsed.map((p) => {
              const def = mockStaff.find((ms) => ms.id === p.id);
              return { ...p, noWa: p.noWa || def?.noWa || '' };
            });
          }
        }

        assignedStaff =
          regionalStaffList.find((s) => s.aktif && s.konsjenTugas && s.konsjenTugas.includes(newItem.konsjen as KonsjenKota)) ||
          regionalStaffList.find((s) => s.konsjenTugas && s.konsjenTugas.includes(newItem.konsjen as KonsjenKota));

        if (assignedStaff && assignedStaff.noWa && assignedStaff.noWa.trim()) {
          const pesanWAStaff =
`*PENDAFTARAN BARU* 🇯🇵📋

Halo Kak *${assignedStaff.nama}*, ada pemohon visa baru:

• *ID:* *${newItem.noPengajuan}*
• *Nama:* ${newItem.namaPemohon}
• *Program:* ${newItem.program} (${newItem.paket})
• *Konsulat:* Konsjen ${newItem.konsjen}
• *Paspor:* ${newItem.noPaspor}
• *WA:* ${newItem.noTelp}

👉 Hubungi pemohon: https://wa.me/${newItem.noTelp.replace(/^0/, '62').replace(/\D/g, '')}
Pandu berkas & pantau kedatangan berkas.`;

          kirimPesanWA(assignedStaff.noWa.trim(), pesanWAStaff, {
            namaPemohon: `Staf PIC (${assignedStaff.nama})`,
            tahap: 'Notif Staf',
          })
            .then((res) => {
              console.log(`[WA Gateway] Sukses kirim notifikasi pendaftar baru ke PIC ${newItem.konsjen} (${assignedStaff?.nama}):`, assignedStaff?.noWa, res);
            })
            .catch((err) => {
              console.warn(`[WA Gateway] Gagal kirim notifikasi ke PIC ${newItem.konsjen}:`, err);
            });
        }
      } catch (staffErr) {
        console.warn('Gagal memproses notifikasi staff wilayah:', staffErr);
      }
    }

    // Otomatis kirim WhatsApp ke Owner MapahTrip
    try {
      let ownerWa = '081214104332';
      let isOwnerNotifyActive = true;
      if (typeof window !== 'undefined') {
        const savedWa = localStorage.getItem('mapahtrip_owner_wa');
        if (savedWa && savedWa.trim()) {
          ownerWa = savedWa.trim();
        }
        const savedNotify = localStorage.getItem('mapahtrip_owner_notify');
        if (savedNotify === 'false') {
          isOwnerNotifyActive = false;
        }
      }

      if (isOwnerNotifyActive && ownerWa && ownerWa.trim()) {
        const pesanWAOwner =
`*PENDAFTARAN BARU (OWNER)* 👑📋

Pendaftar baru masuk ke sistem:

• *ID:* *${newItem.noPengajuan}*
• *Nama:* ${newItem.namaPemohon}
• *Program:* ${newItem.program} (${newItem.paket})
• *Konsulat:* Konsjen ${newItem.konsjen} (PIC: ${assignedStaff?.nama || 'Staf'})
• *WA Pemohon:* ${newItem.noTelp}
• *Biaya:* Rp ${new Intl.NumberFormat('id-ID').format(newItem.dibayarPemohon)}
${cleanAffCode && cleanAffCode !== 'MAPAHTRIP' ? `• *Mitra:* ${cleanAffCode}\n` : ''}
🌐 Kelola: https://mapahtrip.id/#owner`;

        kirimPesanWA(ownerWa.trim(), pesanWAOwner, {
          namaPemohon: 'Owner MapahTrip',
          tahap: 'Notif Owner',
        })
          .then((res) => {
            console.log('[WA Gateway] Sukses kirim notifikasi pendaftar baru ke Owner MapahTrip:', ownerWa, res);
          })
          .catch((err) => {
            console.warn('[WA Gateway] Gagal kirim notifikasi ke Owner MapahTrip:', err);
          });
      }
    } catch (ownerErr) {
      console.warn('Gagal memproses notifikasi Owner:', ownerErr);
    }

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
    isSubmittingRef.current = false;
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
      onMouseDown={(e) => {
        isBackdropMouseDown.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target !== e.currentTarget || !isBackdropMouseDown.current) {
          isBackdropMouseDown.current = false;
          return;
        }
        isBackdropMouseDown.current = false;
        // Jika sedang mengisi formulir, cegah penutupan tidak sengaja
        if (namaPemohon.trim() || noTelp.trim()) {
          return;
        }
        onClose();
      }}
    >
      <div
        className="card modal-tambah-pemohon-card"
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
              <div className="modal-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
              <div className="modal-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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

                {/* Wilayah Konsulat Pengajuan (Konsjen) / Online JAVES */}
                <div>
                  {(program || '').toLowerCase().includes('waiver') ? (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#166534', marginBottom: '4px' }}>
                        Jalur Pengajuan <span style={{ color: '#16A34A' }}>• Online</span>
                      </label>
                      <div
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: '1.5px solid #86EFAC',
                          fontSize: '0.84rem',
                          fontWeight: 700,
                          boxSizing: 'border-box',
                          backgroundColor: '#F0FDF4',
                          color: '#15803D',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#16A34A' }}>
                          cloud_done
                        </span>
                        <span>Layanan Khusus Tanpa Paspor Fisik (Tim Pusat)</span>
                      </div>
                    </div>
                  ) : (
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
                  )}
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

              {/* Routing Konsulat & Staff PIC Bertugas (Otomatis Ditentukan Sistem) */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  backgroundColor: '#F0F9FF',
                  borderRadius: '10px',
                  border: '1.5px solid #BAE6FD',
                  fontSize: '0.82rem',
                  flexWrap: 'wrap',
                  gap: '6px',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0369A1' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0284C7' }}>
                    domain
                  </span>
                  <span>Konsulat: <strong>{konsjen}</strong></span>
                </span>
                <span style={{ color: '#0369A1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Staff PIC Bertugas:</span>
                  {program.toLowerCase().includes('waiver') ? (
                    <span style={{ backgroundColor: '#ECFDF5', color: '#059669', padding: '2px 8px', borderRadius: '5px', fontWeight: 700, fontSize: '0.74rem' }}>
                      100% Online (Ditangani Owner)
                    </span>
                  ) : staffPic === 'Ulla' ? (
                    <span style={{ backgroundColor: '#F3E8FF', color: '#7C3AED', padding: '2px 8px', borderRadius: '5px', fontWeight: 700, fontSize: '0.74rem' }}>
                      Kak Ulla (Khusus Kunjungan Seluruh Wilayah)
                    </span>
                  ) : (
                    <strong style={{ color: '#0F172A', fontWeight: 700 }}>
                      {staffPic}
                    </strong>
                  )}
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
                onChange={(e) => handleProgramChange(e.target.value)}
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
                <optgroup label="7 Layanan Visa Resmi MapahTrip">
                  <option value="Japan e-Visa / Waiver">Japan e-Visa / Waiver (100% Online)</option>
                  <option value="Visa Tokutei Ginou / SSW">Visa Tokutei Ginou / SSW (Kerja Formal)</option>
                  <option value="Visa Kunjungan Keluarga / Teman">Visa Kunjungan Keluarga / Teman (Single Entry)</option>
                  <option value="Visa Student">Visa Student (Kuliah / Sekolah Bahasa)</option>
                  <option value="Visa Internship">Visa Internship (Magang Industri / Trainee)</option>
                  <option value="Visa Temporary Visitor Single Entry">Visa Temporary Visitor Single Entry (15-90 Hari)</option>
                  <option value="Visa Temporary Visitor Multiple Entry">Visa Temporary Visitor Multiple Entry (1-5 Tahun)</option>
                </optgroup>
                <optgroup label="Kategori Tambahan / Spesifik">
                  <option value="Tokutei Ginou (SSW 1)">Tokutei Ginou (SSW 1 / SSW 2)</option>
                  <option value="Visa Magang (Kenshuusei)">Visa Magang (Kenshuusei / Trainee)</option>
                  <option value="Tekutei Katsudou">Tekutei Katsudou (Designated Activities)</option>
                  <option value="Tourist Single Entry">Tourist Single Entry (e-Paspor & Reguler)</option>
                  <option value="Tourist Multiple Entry">Tourist Multiple Entry (5 Tahun)</option>
                  <option value="Visa Bisnis">Visa Bisnis (Business / Meeting)</option>
                  <option value="Visa Transit">Visa Transit</option>
                  <option value="Visa Dependent / Spouse">Visa Dependent / Spouse</option>
                </optgroup>
                {customVisaOptions.length > 0 && (
                  <optgroup label="Layanan Visa Kustom / Tambahan">
                    {customVisaOptions.map((v) => (
                      <option key={v.id} value={v.title}>
                        {v.title}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Pilihan Paket Layanan (3 Card Selector Persis Customer) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Pilihan Paket Layanan
              </label>
              <div className="modal-paket-grid">
                {[
                  { id: 'Reguler' as const, title: 'Reguler', desc: 'Standar QC & Submit', icon: 'check_circle', price: getVisaPrice(program, 'Reguler') },
                  { id: 'Premium' as const, title: 'Premium', desc: 'Prioritas & Cepat', icon: 'bolt', price: getVisaPrice(program, 'Premium') },
                  { id: 'TAC' as const, title: 'TAC', desc: 'Pendampingan All-in', icon: 'verified', price: getVisaPrice(program, 'TAC') },
                ].map((pkg) => {
                  const isSelected = paket === pkg.id;
                  return (
                    <div
                      key={pkg.id}
                      className="modal-paket-card"
                      onClick={() => handlePaketChange(pkg.id)}
                      style={{
                        border: isSelected ? '2px solid #005BB5' : '1px solid #E2E8F0',
                        backgroundColor: isSelected ? '#EFF6FF' : '#F8FAFC',
                        boxShadow: isSelected ? '0 2px 8px rgba(0, 91, 181, 0.15)' : 'none',
                      }}
                    >
                      <div className="modal-paket-card-left">
                        <div
                          className="modal-paket-card-radio"
                          style={{
                            border: isSelected ? '5px solid #005BB5' : '2px solid #CBD5E1',
                            backgroundColor: '#FFFFFF',
                          }}
                        />
                        <div className="modal-paket-card-info">
                          <div className="modal-paket-title" style={{ color: isSelected ? '#005BB5' : '#1E293B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: isSelected ? '#005BB5' : '#94A3B8' }}>
                              {pkg.icon}
                            </span>
                            <span>{pkg.title}</span>
                          </div>
                          <div className="modal-paket-desc" style={{ color: isSelected ? '#1E40AF' : '#64748B' }}>
                            {pkg.desc}
                          </div>
                        </div>
                      </div>
                      {isOwner && (
                        <div
                          className="modal-paket-card-price"
                          style={{
                            color: isSelected ? '#005BB5' : '#15803D',
                            fontFamily: 'monospace',
                          }}
                        >
                          {'Rp\u00A0' + (pkg.price || 0).toLocaleString('id-ID')}
                        </div>
                      )}
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

                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 4: KEUANGAN & PENGELUARAN MODAL PEMOHON (Khusus Owner) */}
          {isOwner && (
            <div style={{ padding: '16px', borderRadius: '14px', background: '#FFFBEB', border: '1px solid #FDE68A', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#B45309' }}>
                    payments
                  </span>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#78350F', margin: 0 }}>
                    4. Rincian Keuangan &amp; Pengeluaran Modal Konsulat
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
              <div className="modal-form-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400E' }}>Metode / Rekening Tujuan</label>
                  <select
                    value={metodePembayaran}
                    onChange={(e) => setMetodePembayaran(e.target.value)}
                    style={{ width: '100%', marginTop: '4px', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: '0.80rem', fontWeight: 600, color: '#0F172A' }}
                  >
                    <option value="Transfer BTN (119001500015870) - Tokyo Asia Connection">Transfer BTN (119001500015870) - Tokyo Asia Connection</option>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', paddingTop: '8px', borderTop: '1px dashed #FDE68A' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400E' }}>Dibayar Pemohon (Rp)</label>
                  <input
                    type="number"
                    value={dibayarPemohon}
                    onChange={(e) => setDibayarPemohon(Math.max(0, Number(e.target.value) || 0))}
                    style={{ width: '100%', marginTop: '4px', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 700, color: '#0F172A' }}
                  />
                  <div style={{ fontSize: '0.66rem', color: '#64748B', marginTop: '2px', fontFamily: 'monospace' }}>
                    Rp {dibayarPemohon.toLocaleString('id-ID')}
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400E' }}>Modal Keluar (Rp)</label>
                  </div>
                  <input
                    type="number"
                    value={nominalKeluar}
                    onChange={(e) => setNominalKeluar(Math.max(0, Number(e.target.value) || 0))}
                    style={{ width: '100%', marginTop: '4px', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 700, color: '#DC2626' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                    <span style={{ fontSize: '0.66rem', color: '#DC2626', fontFamily: 'monospace' }}>
                      -Rp {nominalKeluar.toLocaleString('id-ID')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setNominalKeluar(1940000)}
                      style={{ border: 'none', background: '#EFF6FF', color: '#1D4ED8', fontSize: '0.60rem', padding: '1px 4px', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
                      title="Set standar modal konsulat 1.940.000"
                    >
                      1.94 jt
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400E' }}>Cashback Mitra (Rp)</label>
                  <input
                    type="number"
                    value={cashback}
                    onChange={(e) => setCashback(Math.max(0, Number(e.target.value) || 0))}
                    style={{ width: '100%', marginTop: '4px', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--success)' }}
                  />
                  <div style={{ fontSize: '0.66rem', color: '#16A34A', marginTop: '2px', fontFamily: 'monospace' }}>
                    +Rp {cashback.toLocaleString('id-ID')}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400E' }}>Komisi Referral (Rp)</label>
                  <input
                    type="number"
                    value={referralFee}
                    onChange={(e) => setReferralFee(Math.max(0, Number(e.target.value) || 0))}
                    style={{ width: '100%', marginTop: '4px', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--warning)' }}
                  />
                  <div style={{ fontSize: '0.66rem', color: '#D97706', marginTop: '2px', fontFamily: 'monospace' }}>
                    -Rp {referralFee.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              {/* Live Preview Finansial: Pemasukan vs Modal Keluar = Fee Bersih */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #FCD34D',
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ fontSize: '0.64rem', color: '#64748B', display: 'block', fontWeight: 600 }}>Pemasukan (Dibayar):</span>
                    <strong style={{ fontSize: '0.85rem', color: '#0F172A', fontFamily: 'monospace' }}>
                      Rp {dibayarPemohon.toLocaleString('id-ID')}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.64rem', color: '#64748B', display: 'block', fontWeight: 600 }}>Modal Keluar Konsulat:</span>
                    <strong style={{ fontSize: '0.85rem', color: '#DC2626', fontFamily: 'monospace' }}>
                      -Rp {nominalKeluar.toLocaleString('id-ID')}
                    </strong>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.64rem', color: '#15803D', display: 'block', fontWeight: 700, textTransform: 'uppercase' }}>
                    Estimasi Fee Bersih:
                  </span>
                  <strong style={{ fontSize: '1.05rem', color: '#16A34A', fontFamily: 'monospace', fontWeight: 800 }}>
                    Rp {liveFeeBersih.toLocaleString('id-ID')}
                  </strong>
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
