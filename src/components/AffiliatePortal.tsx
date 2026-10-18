import React, { useState, useMemo, useEffect } from 'react';
import type { Pengajuan, AffiliateUser } from '../types';

interface AffiliatePortalProps {
  pengajuanList: Pengajuan[];
  onSwitchMode: (mode: 'customer' | 'admin') => void;
}

export const AffiliatePortal: React.FC<AffiliatePortalProps> = ({
  pengajuanList,
  onSwitchMode,
}) => {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<AffiliateUser | null>(() => {
    try {
      const saved = localStorage.getItem('mapahtrip_current_affiliate');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Auth Mode: 'register' or 'login'
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');

  // Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regAgree, setRegAgree] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showTermsInline, setShowTermsInline] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [authError, setAuthError] = useState('');
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');

  // Dashboard Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedKandidat, setSelectedKandidat] = useState<Pengajuan | null>(null);
  const [activeTab, setActiveTab] = useState<'kandidat' | 'jadwal'>('kandidat');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync current user to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('mapahtrip_current_affiliate', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('mapahtrip_current_affiliate');
    }
  }, [currentUser]);

  // Handle Registration
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!regName.trim() || !regEmail.trim()) {
      setAuthError('Nama lengkap dan alamat email wajib diisi.');
      return;
    }
    if (regPassword.length < 6) {
      setAuthError('Kata sandi minimal 6 karakter.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setAuthError('Konfirmasi kata sandi tidak cocok.');
      return;
    }
    if (!regAgree) {
      setAuthError('Harap centang persetujuan syarat dan kebijakan.');
      return;
    }

    // 1. Ambil daftar seluruh akun mitra yang tersimpan
    let allUsers: AffiliateUser[] = [];
    try {
      const existingUsersStr = localStorage.getItem('mapahtrip_all_affiliates');
      allUsers = existingUsersStr ? JSON.parse(existingUsersStr) : [];
    } catch {
      allUsers = [];
    }

    const emailClean = regEmail.trim().toLowerCase();

    // 2. Validasi ketat: email tidak boleh sama / double
    if (allUsers.some((u) => u.email.toLowerCase() === emailClean)) {
      setAuthError('Alamat email sudah terdaftar. Silakan gunakan email lain atau langsung masuk.');
      return;
    }

    // 3. Kumpulkan SELURUH kode referral yang sudah pernah ada (anti-duplikat)
    const existingCodes = new Set<string>();
    existingCodes.add('LPK-JAPANCENTER'); // kode demo bawaan

    allUsers.forEach((u) => {
      if (u.affiliateCode) existingCodes.add(u.affiliateCode.toUpperCase().trim());
    });

    pengajuanList.forEach((p) => {
      if (p.affiliateCode) existingCodes.add(p.affiliateCode.toUpperCase().trim());
    });

    // 4. Algoritma Pembuatan Kode Unik 100% Anti-Double
    const cleanName = regName.trim().split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6) || 'MITRA';
    let uniqueCode = '';
    let attempt = 0;

    // Loop verifikasi hingga dipastikan KODE BELUM PERNAH ADA di database / sistem
    do {
      attempt++;
      // Kombinasi: 4 Digit Angka Acak + Huruf Unik jika ada kemiripan
      const randNum = Math.floor(1000 + Math.random() * 9000); // 1000 - 9999
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
      const extraChar = attempt > 1 ? alphabet[Math.floor(Math.random() * alphabet.length)] : '';
      const candidate = `MT-${cleanName}${randNum}${extraChar}`;

      if (!existingCodes.has(candidate)) {
        uniqueCode = candidate;
        existingCodes.add(candidate);
        break;
      }
    } while (attempt < 100);

    // Cadangan darurat berbasis timestamp jika 100 percobaan bentrok
    if (!uniqueCode) {
      uniqueCode = `MT-${cleanName}${Date.now().toString().slice(-5)}`;
      existingCodes.add(uniqueCode);
    }

    // 5. Buat profil mitra baru dengan kode referral resmi yang dijamin unik
    const newUser: AffiliateUser = {
      id: 'aff_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      nama: regName.trim(),
      email: emailClean,
      affiliateCode: uniqueCode,
      password: regPassword,
      createdAt: new Date().toISOString(),
    };

    // 6. Simpan permanen ke daftar mitra
    try {
      allUsers.push(newUser);
      localStorage.setItem('mapahtrip_all_affiliates', JSON.stringify(allUsers));
    } catch {
      // ignore
    }

    setCurrentUser(newUser);
    setAuthSuccessMsg(`Selamat! Akun Anda aktif dengan Kode Referral Unik: ${uniqueCode}`);
  };

  // Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const emailClean = loginEmail.trim().toLowerCase();
    if (!emailClean || !loginPassword) {
      setAuthError('Email dan kata sandi wajib diisi.');
      return;
    }

    // Default Demo Account
    if (emailClean === 'demo@mapahtrip.id' && loginPassword === '123456') {
      const demoUser: AffiliateUser = {
        id: 'aff_demo',
        nama: 'Mitra Demo LPK',
        email: 'demo@mapahtrip.id',
        affiliateCode: 'LPK-JAPANCENTER',
        createdAt: new Date().toISOString(),
      };
      setCurrentUser(demoUser);
      return;
    }

    // Check stored users
    try {
      const existingUsersStr = localStorage.getItem('mapahtrip_all_affiliates');
      const allUsers: AffiliateUser[] = existingUsersStr ? JSON.parse(existingUsersStr) : [];
      const foundUser = allUsers.find(
        (u) => (u.email.toLowerCase() === emailClean || u.affiliateCode.toLowerCase() === emailClean)
      );

      if (!foundUser) {
        setAuthError('Akun belum terdaftar. Silakan klik "Daftar Akun Baru" di bawah terlebih dahulu.');
        return;
      }

      if (foundUser.password !== loginPassword) {
        setAuthError('Kata sandi salah. Silakan periksa kembali kata sandi Anda.');
        return;
      }

      // Login berhasil
      setCurrentUser(foundUser);
    } catch {
      setAuthError('Terjadi kesalahan saat masuk. Silakan coba lagi.');
    }
  };

  // Handle Logout
  const handleLogout = () => {
    if (window.confirm('Apakah Anda yakin ingin keluar dari akun mitra?')) {
      setCurrentUser(null);
      setAuthMode('login');
      setAuthError('');
    }
  };

  // Filtered candidate list based on search, status, and affiliate code
  const filteredList = useMemo(() => {
    return pengajuanList.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        item.namaPemohon.toLowerCase().includes(q) ||
        item.noPaspor.toLowerCase().includes(q) ||
        item.noTelp.toLowerCase().includes(q) ||
        (item.affiliateCode && item.affiliateCode.toLowerCase().includes(q));

      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'proses' && (item.status === 'Sedang Diproses' || item.status === 'Apply Hari Ini')) ||
        (statusFilter === 'siap' && item.status === 'Siap Ambil') ||
        (statusFilter === 'selesai' && item.status === 'Selesai') ||
        (statusFilter === 'verifikasi' && item.status === 'Menunggu Verifikasi');

      return matchQuery && matchStatus;
    });
  }, [pengajuanList, searchQuery, statusFilter]);

  // Statistics tailored for affiliate / agency partners
  const stats = useMemo(() => {
    const total = pengajuanList.length;
    const berkasLengkap = pengajuanList.filter(
      (p) => p.berkas.formVisa && p.berkas.ktp && p.berkas.coe && p.berkas.foto
    ).length;
    const sedangProses = pengajuanList.filter(
      (p) => p.status === 'Sedang Diproses' || p.status === 'Apply Hari Ini'
    ).length;
    const siapTerbang = pengajuanList.filter(
      (p) => p.status === 'Selesai' || p.status === 'Siap Ambil'
    ).length;
    const handoverSoetta = pengajuanList.filter(
      (p) => p.noResi && p.noResi.toLowerCase().includes('soehatta')
    ).length;

    return { total, berkasLengkap, sedangProses, siapTerbang, handoverSoetta };
  }, [pengajuanList]);

  // Upcoming flight schedules (Send to Soekarno-Hatta)
  const flightSchedules = useMemo(() => {
    return pengajuanList.filter((p) => p.catatan && p.catatan.toLowerCase().includes('flight'));
  }, [pengajuanList]);

  // =========================================================================
  // VIEW 1: AUTHENTICATION SCREEN (REGISTER / LOGIN) - Matches user screenshot
  // =========================================================================
  // Reusable Terms & Conditions Modal (Rendered in Auth screen and Dashboard)
  const renderTermsModal = () => {
    if (!showTermsModal) return null;
    return (
        <div
          onClick={() => setShowTermsModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '540px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#F8FAFC',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-symbols-outlined" style={{ color: '#10B981', fontSize: '26px' }}>
                  verified_user
                </span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                    Syarat &amp; Kebijakan Kemitraan
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                    Program Affiliate Resmi MapahTrip 2026
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                style={{
                  background: '#E2E8F0',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#475569',
                  fontSize: '16px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div
              style={{
                padding: '20px 24px',
                overflowY: 'auto',
                fontSize: '0.84rem',
                color: '#334155',
                lineHeight: 1.6,
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div>
                <strong style={{ color: '#0F172A', display: 'block', marginBottom: '4px' }}>
                  1. Ketentuan Pendaftaran Mitra
                </strong>
                <p style={{ margin: 0, color: '#475569' }}>
                  Pendaftaran Program Mitra MapahTrip bersifat <strong>gratis 100%</strong> tanpa biaya admin atau iuran bulanan. Terbuka bagi LPK (Lembaga Pelatihan Kerja), agensi travel, alumni/pekerja di Jepang, sekolah bahasa, maupun individu yang ingin mereferensikan pemohon visa Jepang.
                </p>
              </div>

              <div>
                <strong style={{ color: '#0F172A', display: 'block', marginBottom: '4px' }}>
                  2. Besaran Komisi Referral
                </strong>
                <p style={{ margin: 0, color: '#475569' }}>
                  Mitra berhak memperoleh komisi tunai sebesar <strong>Rp 50.000 hingga Rp 250.000</strong> per pemohon untuk setiap pengajuan visa Jepang yang berhasil diterbitkan oleh Kedutaan Besar / Konsulat Jepang / VFS JVAC. Besaran komisi bergantung pada tipe visa (Wisata Single/Multiple Entry, Kunjungan Keluarga, Bisnis, dsb).
                </p>
              </div>

              <div>
                <strong style={{ color: '#0F172A', display: 'block', marginBottom: '4px' }}>
                  3. Penggunaan Kode Referral Resmi
                </strong>
                <p style={{ margin: 0, color: '#475569' }}>
                  Setelah mendaftar, mitra mendapatkan <strong>Kode Referral Unik</strong> resmi. Pemohon yang direkomendasikan wajib mencantumkan kode ini saat berkonsultasi atau mengajukan visa agar status kandidat otomatis tercatat di dashboard mitra.
                </p>
              </div>

              <div>
                <strong style={{ color: '#0F172A', display: 'block', marginBottom: '4px' }}>
                  4. Ketentuan Pembayaran Komisi
                </strong>
                <p style={{ margin: 0, color: '#475569' }}>
                  Komisi dapat dicairkan secara mingguan atau per batch pengajuan rombongan setelah paspor pemohon selesai dan visa disetujui. Pembayaran ditransfer langsung ke rekening bank atau dompet digital resmi yang Anda daftarkan.
                </p>
              </div>

              <div>
                <strong style={{ color: '#0F172A', display: 'block', marginBottom: '4px' }}>
                  5. Keabsahan &amp; Integritas Dokumen
                </strong>
                <p style={{ margin: 0, color: '#475569' }}>
                  Mitra dilarang memanipulasi, memalsukan, atau menyerahkan dokumen fiktif. Seluruh berkas (paspor, rekening koran, sponsor/surat undangan) harus asli dan dapat dipertanggungjawabkan sesuai hukum dan aturan Kedutaan Jepang.
                </p>
              </div>

              <div>
                <strong style={{ color: '#0F172A', display: 'block', marginBottom: '4px' }}>
                  6. Kerahasiaan &amp; Keamanan Data
                </strong>
                <p style={{ margin: 0, color: '#475569' }}>
                  MapahTrip menjamin kerahasiaan seluruh dokumen pemohon. Data identitas hanya dipergunakan khusus untuk pemrosesan visa resmi di JVAC / Konsulat dan tidak akan diperjualbelikan kepada pihak ketiga.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '14px 24px',
                borderTop: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                Dengan mencentang persetujuan, Anda menyepakati syarat di atas.
              </span>
              <button
                type="button"
                onClick={() => {
                  setRegAgree(true);
                  setShowTermsModal(false);
                }}
                style={{
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '9px 18px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                }}
              >
                <span>Saya Paham &amp; Setujui</span>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  check
                </span>
              </button>
            </div>
          </div>
        </div>
    );
  };

  if (!currentUser) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
          fontFamily: 'inherit',
        }}
      >
        {/* Top bar back button */}
        <div style={{ width: '100%', maxWidth: '420px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => onSwitchMode('customer')}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748B',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
            <span>Kembali ke Beranda</span>
          </button>

          <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 700 }}>
            PORTAL MITRA ⛩️
          </span>
        </div>

        {/* Card Container (Clean white card matching screenshot) */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.05)',
            width: '100%',
            maxWidth: '420px',
            padding: '36px 32px',
            boxSizing: 'border-box',
          }}
        >
          {authMode === 'register' ? (
            /* ================= REGISTER VIEW ================= */
            <div>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h2
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: '#0F172A',
                    margin: '0 0 6px',
                    letterSpacing: '-0.02em',
                  }}
                >
                  Buat akun
                </h2>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748B' }}>
                  Masukkan detail anda untuk membuat akun
                </p>
              </div>

                            {authSuccessMsg && (
                <div
                  style={{
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    color: '#166534',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontSize: '0.82rem',
                    marginBottom: '16px',
                  }}
                >
                  {authSuccessMsg}
                </div>
              )}
              {authError && (
                <div
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#B91C1C',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontSize: '0.82rem',
                    marginBottom: '16px',
                  }}
                >
                  {authError}
                </div>
              )}

              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* 1. Nama Lengkap */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>
                    Nama Lengkap
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #10B981', // green border focus matching screenshot
                      backgroundColor: '#FFFFFF',
                      boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.1)',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#94A3B8' }}>
                      person
                    </span>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Nama Lengkap"
                      style={{
                        border: 'none',
                        outline: 'none',
                        width: '100%',
                        fontSize: '0.9rem',
                        color: '#0F172A',
                        backgroundColor: 'transparent',
                      }}
                    />
                  </div>
                </div>

                {/* 2. Alamat Email */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>
                    Alamat Email
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#94A3B8' }}>
                      alternate_email
                    </span>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="email@example.com"
                      style={{
                        border: 'none',
                        outline: 'none',
                        width: '100%',
                        fontSize: '0.9rem',
                        color: '#0F172A',
                        backgroundColor: 'transparent',
                      }}
                    />
                  </div>
                </div>

                {/* 3. Kata Sandi */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>
                    Kata Sandi
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#94A3B8' }}>
                      key
                    </span>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Kata Sandi (min. 6 karakter)"
                      style={{
                        border: 'none',
                        outline: 'none',
                        width: '100%',
                        fontSize: '0.9rem',
                        color: '#0F172A',
                        backgroundColor: 'transparent',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94A3B8', display: 'flex' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        {showRegPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* 4. Konfirmasi Kata Sandi */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>
                    Konfirmasi Kata Sandi
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#94A3B8' }}>
                      key
                    </span>
                    <input
                      type={showRegConfirmPassword ? 'text' : 'password'}
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Konfirmasi Kata Sandi"
                      style={{
                        border: 'none',
                        outline: 'none',
                        width: '100%',
                        fontSize: '0.9rem',
                        color: '#0F172A',
                        backgroundColor: 'transparent',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94A3B8', display: 'flex' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        {showRegConfirmPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* 5. Checkbox Agreement with Toggleable Terms */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '2px' }}>
                    <input
                      type="checkbox"
                      id="regAgreeCheckbox"
                      checked={regAgree}
                      onChange={(e) => setRegAgree(e.target.checked)}
                      style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: '#10B981', cursor: 'pointer' }}
                    />
                    <label htmlFor="regAgreeCheckbox" style={{ fontSize: '0.84rem', color: '#475569', lineHeight: 1.45, cursor: 'pointer' }}>
                      Saya setuju dengan{' '}
                      <span
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowTermsInline(!showTermsInline);
                        }}
                        style={{
                          color: '#0284C7',
                          fontWeight: 700,
                          textDecoration: 'underline',
                          cursor: 'pointer',
                        }}
                        title="Klik untuk melihat syarat dan kebijakan kemitraan"
                      >
                        syarat dan kebijakan
                      </span>{' '}
                      <span
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowTermsInline(!showTermsInline);
                        }}
                        style={{
                          fontSize: '0.72rem',
                          color: '#0284C7',
                          cursor: 'pointer',
                          display: 'inline-block',
                          transition: 'transform 0.2s ease',
                          transform: showTermsInline ? 'rotate(180deg)' : 'rotate(0deg)',
                        }}
                      >
                        ▼
                      </span>
                    </label>
                  </div>

                  {/* Kotak syarat & kebijakan hanya muncul KETIKA DIKLIK */}
                  {showTermsInline && (
                    <div
                      style={{
                        marginTop: '10px',
                        backgroundColor: '#F8FAFC',
                        border: '1.5px solid #BAE6FD',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        fontSize: '0.78rem',
                        color: '#334155',
                        lineHeight: 1.5,
                        boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px' }}>
                        <strong style={{ color: '#0369A1', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem' }}>
                          <span>📋</span> Ketentuan Utama Mitra MapahTrip:
                        </strong>
                        <button
                          type="button"
                          onClick={() => setShowTermsInline(false)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#64748B',
                            fontSize: '0.74rem',
                            cursor: 'pointer',
                            padding: '2px 6px',
                            fontWeight: 700,
                          }}
                        >
                          ✕ Tutup
                        </button>
                      </div>

                      <ul style={{ margin: 0, paddingLeft: '18px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <li>
                          <strong>Komisi Referral:</strong> Rp 50.000 – Rp 250.000 per visa terbit.
                        </li>
                        <li>
                          <strong>Pendaftaran 100% Gratis:</strong> Tanpa biaya admin atau iuran bulanan.
                        </li>
                        <li>
                          <strong>Pencairan Komisi:</strong> Dicairkan berkala via transfer bank / e-wallet resmi.
                        </li>
                        <li>
                          <strong>Keaslian Dokumen:</strong> Wajib menjamin keabsahan berkas calon pemohon (dilarang manipulasi berkas).
                        </li>
                        <li>
                          <strong>Kerahasiaan Data:</strong> MapahTrip menjamin privasi data pemohon terjaga aman.
                        </li>
                      </ul>

                      <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setShowTermsModal(true)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#0284C7',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            padding: 0,
                            textDecoration: 'underline',
                          }}
                        >
                          Baca Dokumen Lengkap ➔
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRegAgree(true);
                            setShowTermsInline(false);
                          }}
                          style={{
                            backgroundColor: '#10B981',
                            color: '#FFFFFF',
                            border: 'none',
                            padding: '5px 14px',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Paham &amp; Setujui ✓
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {/* Submit Button */}
                <button
                  type="submit"
                  style={{
                    marginTop: '8px',
                    backgroundColor: '#10B981',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '13px',
                    borderRadius: '12px',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Daftar Akun &amp; Dapatkan Kode ➔
                </button>
              </form>

              {/* Switch to Login */}
              <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.85rem', color: '#64748B' }}>
                Sudah punya akun?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#005bb5',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Masuk di sini
                </button>
              </div>
            </div>
          ) : (
            /* ================= LOGIN VIEW ================= */
            <div>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h2
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: '#0F172A',
                    margin: '0 0 6px',
                    letterSpacing: '-0.02em',
                  }}
                >
                  Masuk ke Akun Mitra
                </h2>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748B' }}>
                  Masukkan email atau kode referral dan kata sandi Anda
                </p>
              </div>

                            {authSuccessMsg && (
                <div
                  style={{
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    color: '#166534',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontSize: '0.82rem',
                    marginBottom: '16px',
                  }}
                >
                  {authSuccessMsg}
                </div>
              )}
{authError && (
                <div
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#B91C1C',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontSize: '0.82rem',
                    marginBottom: '16px',
                  }}
                >
                  {authError}
                </div>
              )}

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Email / Kode */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>
                    Alamat Email / Kode Referral
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#94A3B8' }}>
                      alternate_email
                    </span>
                    <input
                      type="text"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="email@example.com / MT-KODE"
                      style={{
                        border: 'none',
                        outline: 'none',
                        width: '100%',
                        fontSize: '0.9rem',
                        color: '#0F172A',
                        backgroundColor: 'transparent',
                      }}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>
                    Kata Sandi
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#94A3B8' }}>
                      key
                    </span>
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Kata Sandi"
                      style={{
                        border: 'none',
                        outline: 'none',
                        width: '100%',
                        fontSize: '0.9rem',
                        color: '#0F172A',
                        backgroundColor: 'transparent',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94A3B8', display: 'flex' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        {showLoginPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <a
                    href="https://wa.me/6281401735648?text=Halo%20Admin%20MapahTrip,%20saya%20lupa%20kata%20sandi%20akun%20mitra%20saya"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '0.8rem', color: '#005bb5', textDecoration: 'none', fontWeight: 600 }}
                  >
                    Lupa kata sandi?
                  </a>
                </div>

                {/* Submit Login Button */}
                <button
                  type="submit"
                  style={{
                    backgroundColor: '#005bb5',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '13px',
                    borderRadius: '12px',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0, 91, 181, 0.25)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Masuk ke Portal Mitra ➔
                </button>
              </form>

              {/* Demo Account Quick Fill */}
              <div
                style={{
                  marginTop: '16px',
                  backgroundColor: '#F1F5F9',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  fontSize: '0.78rem',
                  color: '#475569',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>💡 Akun Uji Coba: demo@mapahtrip.id</span>
                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail('demo@mapahtrip.id');
                    setLoginPassword('123456');
                  }}
                  style={{
                    backgroundColor: '#E2E8F0',
                    border: 'none',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: '#0F172A',
                  }}
                >
                  Isi Cepat
                </button>
              </div>

              {/* Switch to Register */}
              <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.85rem', color: '#64748B' }}>
                Belum punya akun mitra?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setAuthError('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#10B981',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Daftar Akun Baru
                </button>
              </div>
            </div>
          )}
        </div>
        {/* Modal Syarat & Kebijakan Kemitraan MapahTrip */}
        {renderTermsModal()}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: LOGGED-IN AFFILIATE PORTAL (DASHBOARD FOR THE PARTNER)
  // =========================================================================
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', color: '#0F172A', fontFamily: 'inherit' }}>
      {/* 1. Top Role Navigation Bar */}
      <header
        style={{
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          padding: '10px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid #1E293B',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              boxShadow: '0 0 10px #10B981',
              display: 'inline-block',
            }}
          />
          <strong style={{ fontSize: '0.9rem', letterSpacing: '-0.01em' }}>
            Portal Mitra: {currentUser.nama}
          </strong>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(currentUser.affiliateCode);
              setCopiedCode(true);
              setTimeout(() => setCopiedCode(false), 2000);
            }}
            style={{
              fontSize: '0.75rem',
              backgroundColor: copiedCode ? '#059669' : '#1E293B',
              border: '1px solid #334155',
              color: copiedCode ? '#FFFFFF' : '#38BDF8',
              padding: '2px 10px',
              borderRadius: '9999px',
              fontWeight: 800,
              fontFamily: 'monospace',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Klik untuk salin kode referral"
          >
            🏷️ KODE: {currentUser.affiliateCode} {copiedCode ? '✓ Disalin' : '📋'}
          </button>
        </div>

        {/* Action Controls & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Copy Referral Link */}
          <button
            type="button"
            onClick={() => {
              const link = `https://mapahtrip.id/?ref=${currentUser.affiliateCode}`;
              navigator.clipboard.writeText(link);
              setCopiedLink(true);
              setTimeout(() => setCopiedLink(false), 2000);
            }}
            style={{
              backgroundColor: copiedLink ? '#059669' : 'rgba(255, 255, 255, 0.08)',
              color: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Salin link rekomendasi khusus akun Anda"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
              {copiedLink ? 'done' : 'share'}
            </span>
            <span>{copiedLink ? 'Link Tersalin!' : 'Salin Link Referral'}</span>
          </button>

          {/* Switch to Customer Home */}
          <button
            type="button"
            onClick={() => onSwitchMode('customer')}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#F1F5F9',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>public</span>
            <span>Halaman Pelanggan</span>
          </button>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            style={{
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>logout</span>
            <span>Keluar</span>
          </button>
        </div>
      </header>

      {/* 2. Main Portal Container */}
      <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '24px 20px' }}>
        {/* Banner Welcome & Search */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            padding: '24px 28px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px',
          }}
        >
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#0284C7', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              <span>⛩️ MITRA RESMI MAPAHTRIP</span>
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              Selamat Datang, {currentUser.nama}!
            </h1>
            <p style={{ color: '#64748B', fontSize: '0.88rem', margin: '4px 0 0' }}>
              Gunakan kode referral <strong style={{ color: '#0284C7' }}>{currentUser.affiliateCode}</strong> pada setiap pendaftaran siswa untuk pelacakan komisi dan status berkas.
            </p>
          </div>

          {/* Search Box */}
          <div style={{ minWidth: '320px', flex: '0 1 380px' }}>
            <div style={{ position: 'relative' }}>
              <span
                className="material-symbols-outlined"
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94A3B8',
                  fontSize: '20px',
                }}
              >
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama kandidat / nomor paspor..."
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 40px',
                  borderRadius: '12px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.88rem',
                  outline: 'none',
                  backgroundColor: '#F8FAFC',
                  color: '#0F172A',
                }}
              />
            </div>
          </div>
        </div>

        {/* 3. Partner Key Metric Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          {/* Card 1: Total Kandidat */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '18px 20px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Total Siswa / Kandidat</span>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#2563EB' }}>groups</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F172A', marginTop: '6px' }}>{stats.total}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>Terdaftar di sistem MapahTrip</div>
          </div>

          {/* Card 2: Berkas Lengkap */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '18px 20px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Berkas Lengkap</span>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#16A34A' }}>verified</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#15803D', marginTop: '6px' }}>{stats.berkasLengkap}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>Form, KTP, E-KTLN, COE &amp; Foto siap</div>
          </div>

          {/* Card 3: Proses Konsulat */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '18px 20px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#9A3412', textTransform: 'uppercase' }}>Sedang Proses JVAC</span>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#EA580C' }}>pending</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#C2410C', marginTop: '6px' }}>{stats.sedangProses}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>Dalam verifikasi konsulat Jepang</div>
          </div>

          {/* Card 4: Selesai / Siap Kirim */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '18px 20px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0369A1', textTransform: 'uppercase' }}>Visa Siap / Terbit</span>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#0284C7' }}>task_alt</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0284C7', marginTop: '6px' }}>{stats.siapTerbang}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>Stiker terpasang &amp; siap ambil</div>
          </div>

          {/* Card 5: Handover Soekarno-Hatta */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '18px 20px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6D28D9', textTransform: 'uppercase' }}>Handover Bandara</span>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#7C3AED' }}>flight_takeoff</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#7C3AED', marginTop: '6px' }}>{stats.handoverSoetta}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>Serah terima di Terminal 3 Soetta</div>
          </div>
        </div>

        {/* 4. Tab Navigation: Daftar Kandidat vs Jadwal Bandara */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'inline-flex', backgroundColor: '#E2E8F0', padding: '3px', borderRadius: '12px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('kandidat')}
              style={{
                backgroundColor: activeTab === 'kandidat' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'kandidat' ? '#0F172A' : '#64748B',
                fontWeight: 700,
                fontSize: '0.85rem',
                border: 'none',
                padding: '7px 18px',
                borderRadius: '9px',
                cursor: 'pointer',
                boxShadow: activeTab === 'kandidat' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              📋 Seluruh Kandidat ({filteredList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('jadwal')}
              style={{
                backgroundColor: activeTab === 'jadwal' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'jadwal' ? '#0F172A' : '#64748B',
                fontWeight: 700,
                fontSize: '0.85rem',
                border: 'none',
                padding: '7px 18px',
                borderRadius: '9px',
                cursor: 'pointer',
                boxShadow: activeTab === 'jadwal' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              ✈️ Jadwal Terbang / Soetta ({flightSchedules.length})
            </button>
          </div>

          {/* Status Filter Buttons */}
          {activeTab === 'kandidat' && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'Semua Status' },
                { id: 'verifikasi', label: 'Menunggu Berkas' },
                { id: 'proses', label: 'Proses Konsulat' },
                { id: 'siap', label: 'Siap Ambil' },
                { id: 'selesai', label: 'Visa Selesai' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  style={{
                    backgroundColor: statusFilter === f.id ? '#0F172A' : '#FFFFFF',
                    color: statusFilter === f.id ? '#FFFFFF' : '#475569',
                    border: '1px solid ' + (statusFilter === f.id ? '#0F172A' : '#CBD5E1'),
                    padding: '5px 12px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 5. Main Table: Candidate Tracking Table */}
        {activeTab === 'kandidat' ? (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
              boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700 }}>
                    <th style={{ padding: '12px 16px' }}>No. &amp; ID</th>
                    <th style={{ padding: '12px 16px' }}>Nama Siswa / Kandidat</th>
                    <th style={{ padding: '12px 16px' }}>No. Paspor</th>
                    <th style={{ padding: '12px 16px' }}>Program Visa</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Kelengkapan Berkas (5 Poin)</th>
                    <th style={{ padding: '12px 16px' }}>Status Pengajuan</th>
                    <th style={{ padding: '12px 16px' }}>Resi / Pengiriman</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                        Tidak ditemukan kandidat dengan kriteria pencarian tersebut.
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((item, idx) => (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          transition: 'background-color 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                      >
                        {/* ID */}
                        <td style={{ padding: '14px 16px', color: '#64748B', fontWeight: 600 }}>
                          <div>{item.noPengajuan}</div>
                          <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>#{idx + 1}</div>
                        </td>

                        {/* Nama */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#0F172A' }}>{item.namaPemohon}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                            WA: {item.noTelp || '-'}
                          </div>
                        </td>

                        {/* Paspor */}
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>
                          {item.noPaspor}
                        </td>

                        {/* Program */}
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: '#EFF6FF',
                              color: '#1E40AF',
                            }}
                          >
                            {item.program}
                          </span>
                        </td>

                        {/* Checklist Berkas */}
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                            <span
                              title="Formulir Visa"
                              style={{
                                fontSize: '0.7rem',
                                padding: '2px 5px',
                                borderRadius: '4px',
                                backgroundColor: item.berkas.formVisa ? '#DCFCE7' : '#FEE2E2',
                                color: item.berkas.formVisa ? '#15803D' : '#B91C1C',
                                fontWeight: 800,
                              }}
                            >
                              FORM
                            </span>
                            <span
                              title="KTP"
                              style={{
                                fontSize: '0.7rem',
                                padding: '2px 5px',
                                borderRadius: '4px',
                                backgroundColor: item.berkas.ktp ? '#DCFCE7' : '#FEE2E2',
                                color: item.berkas.ktp ? '#15803D' : '#B91C1C',
                                fontWeight: 800,
                              }}
                            >
                              KTP
                            </span>
                            <span
                              title="E-KTLN"
                              style={{
                                fontSize: '0.7rem',
                                padding: '2px 5px',
                                borderRadius: '4px',
                                backgroundColor: item.berkas.ektln ? '#DCFCE7' : '#FEE2E2',
                                color: item.berkas.ektln ? '#15803D' : '#B91C1C',
                                fontWeight: 800,
                              }}
                            >
                              KTLN
                            </span>
                            <span
                              title="COE Imigrasi Jepang"
                              style={{
                                fontSize: '0.7rem',
                                padding: '2px 5px',
                                borderRadius: '4px',
                                backgroundColor: item.berkas.coe ? '#DCFCE7' : '#FEE2E2',
                                color: item.berkas.coe ? '#15803D' : '#B91C1C',
                                fontWeight: 800,
                              }}
                            >
                              COE
                            </span>
                            <span
                              title="Pasfoto 4.5 x 3.5 cm"
                              style={{
                                fontSize: '0.7rem',
                                padding: '2px 5px',
                                borderRadius: '4px',
                                backgroundColor: item.berkas.foto ? '#DCFCE7' : '#FEE2E2',
                                color: item.berkas.foto ? '#15803D' : '#B91C1C',
                                fontWeight: 800,
                              }}
                            >
                              FOTO
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '4px 10px',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor:
                                item.status === 'Selesai'
                                  ? '#DCFCE7'
                                  : item.status === 'Siap Ambil'
                                  ? '#E0F2FE'
                                  : item.status === 'Sedang Diproses' || item.status === 'Apply Hari Ini'
                                  ? '#FEF3C7'
                                  : '#F1F5F9',
                              color:
                                item.status === 'Selesai'
                                  ? '#15803D'
                                  : item.status === 'Siap Ambil'
                                  ? '#0369A1'
                                  : item.status === 'Sedang Diproses' || item.status === 'Apply Hari Ini'
                                  ? '#B45309'
                                  : '#475569',
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: 'currentColor',
                              }}
                            />
                            {item.status}
                          </span>
                        </td>

                        {/* Resi / Pengiriman */}
                        <td style={{ padding: '14px 16px' }}>
                          {item.noResi ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: item.noResi.toLowerCase().includes('soehatta') ? '#7C3AED' : '#0369A1', fontWeight: 700, fontSize: '0.78rem' }}>
                              <span>{item.noResi}</span>
                            </div>
                          ) : (
                            <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>-</span>
                          )}
                          {item.catatan && (
                            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                              {item.catatan}
                            </div>
                          )}
                        </td>

                        {/* Action Button */}
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedKandidat(item)}
                            style={{
                              backgroundColor: '#F1F5F9',
                              color: '#0F172A',
                              border: '1px solid #CBD5E1',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Rincian
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Jadwal Terbang / Soetta */
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              padding: '24px',
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
              ✈️ Daftar Serah Terima Paspor di Bandara Soekarno-Hatta (Terminal 3)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {flightSchedules.map((item) => (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '0.95rem', color: '#0F172A' }}>{item.namaPemohon}</strong>
                    <span style={{ fontSize: '0.75rem', color: '#2563EB', fontWeight: 700 }}>{item.program}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '6px' }}>
                    Paspor: <strong>{item.noPaspor}</strong> • WA: {item.noTelp}
                  </div>
                  <div
                    style={{
                      backgroundColor: '#EFF6FF',
                      color: '#1E40AF',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                    }}
                  >
                    📍 {item.catatan || 'Jadwal Terbang'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 6. Candidate Detail Modal */}
      {selectedKandidat && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setSelectedKandidat(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '520px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#2563EB', fontWeight: 800, textTransform: 'uppercase' }}>
                  {selectedKandidat.noPengajuan}
                </span>
                <h3 style={{ margin: '2px 0 0', fontSize: '1.3rem', fontWeight: 800, color: '#0F172A' }}>
                  {selectedKandidat.namaPemohon}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedKandidat(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#94A3B8',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ color: '#64748B' }}>Nomor Paspor:</span>
                <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>{selectedKandidat.noPaspor}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ color: '#64748B' }}>Nomor WhatsApp:</span>
                <strong style={{ color: '#0F172A' }}>{selectedKandidat.noTelp || '-'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ color: '#64748B' }}>Program:</span>
                <strong style={{ color: '#0F172A' }}>{selectedKandidat.program}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ color: '#64748B' }}>Status Pengajuan:</span>
                <strong style={{ color: '#15803D' }}>{selectedKandidat.status}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ color: '#64748B' }}>Resi / Penyerahan:</span>
                <strong style={{ color: '#0284C7' }}>{selectedKandidat.noResi || 'Menunggu proses'}</strong>
              </div>
              {selectedKandidat.catatan && (
                <div style={{ backgroundColor: '#F0F9FF', padding: '10px 14px', borderRadius: '8px', color: '#0369A1', fontSize: '0.82rem' }}>
                  <strong>Catatan:</strong> {selectedKandidat.catatan}
                </div>
              )}
            </div>

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setSelectedKandidat(null)}
                style={{
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '9px 20px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Syarat & Kebijakan Kemitraan MapahTrip */}
      {renderTermsModal()}

    </div>
  );
};
