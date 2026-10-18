import React, { useState, useMemo, useEffect } from 'react';
import type { Pengajuan, AffiliateUser } from '../types';

interface AffiliatePortalProps {
  pengajuanList: Pengajuan[];
  onSwitchMode: (mode: 'customer' | 'admin') => void;
}


const PROVINSI_LIST = [
  'Aceh', 'Bali', 'Banten', 'Bengkulu', 'DI Yogyakarta', 'DKI Jakarta',
  'Gorontalo', 'Jambi', 'Jawa Barat', 'Jawa Tengah', 'Jawa Timur',
  'Kalimantan Barat', 'Kalimantan Selatan', 'Kalimantan Tengah', 'Kalimantan Timur', 'Kalimantan Utara',
  'Kepulauan Bangka Belitung', 'Kepulauan Riau', 'Lampung', 'Maluku', 'Maluku Utara',
  'Nusa Tenggara Barat', 'Nusa Tenggara Timur', 'Papua', 'Papua Barat', 'Papua Barat Daya',
  'Papua Pegunungan', 'Papua Selatan', 'Papua Tengah', 'Riau', 'Sulawesi Barat',
  'Sulawesi Selatan', 'Sulawesi Tengah', 'Sulawesi Tenggara', 'Sulawesi Utara',
  'Sumatera Barat', 'Sumatera Selatan', 'Sumatera Utara'
];

const STATUS_MITRA_LIST = [
  'Umum',
  'LPK (Lembaga Pelatihan Kerja ke Jepang)',
  'Biro Perjalanan / Agen Tour & Travel',
  'Alumni / Pekerja di Jepang (Tokutei Ginou / Magang)',
  'Sekolah Bahasa Jepang / Lembaga Kursus',
  'Konsultan Visa / Agen Independen',
  'Komunitas Jepang di Indonesia'
];

const JENIS_IDENTITAS_LIST = [
  'KTP (Kartu Tanda Penduduk)',
  'Paspor RI',
  'SIM (Surat Izin Mengemudi)'
];

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
  // Onboarding & Profile Verification State (Nurul Fikri / Visa Partner Form)
  const [profileStatus, setProfileStatus] = useState('');
  const [profileNama, setProfileNama] = useState('');
  const [profileLembaga, setProfileLembaga] = useState('');
  const [profileNoWa, setProfileNoWa] = useState('');
  const [profileAlamat, setProfileAlamat] = useState('');
  const [profileProvinsi, setProfileProvinsi] = useState('');
  const [profileJenisIdentitas, setProfileJenisIdentitas] = useState('KTP (Kartu Tanda Penduduk)');
  const [profileNomorIdentitas, setProfileNomorIdentitas] = useState('');
  const [profileFotoDiri, setProfileFotoDiri] = useState<string | null>(null);
  const [profileError, setProfileError] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // NFIC-style Menu / Tab State for Partner Onboarding
  const [onboardingView, setOnboardingView] = useState<'menu' | 'form'>('menu');
  const [partnerSubTab, setPartnerSubTab] = useState<'informasi' | 'insentif'>('informasi');

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  // Sync profile form when user changes or logs in
  useEffect(() => {
    if (currentUser) {
      setProfileNama(currentUser.nama || '');
      setProfileStatus(currentUser.statusMitra || '');
      setProfileLembaga(currentUser.lembaga || '');
      setProfileNoWa(currentUser.noWa || '');
      setProfileAlamat(currentUser.alamat || '');
      setProfileProvinsi(currentUser.provinsi || '');
      setProfileJenisIdentitas(currentUser.jenisIdentitas || 'KTP (Kartu Tanda Penduduk)');
      setProfileNomorIdentitas(currentUser.nomorIdentitas || '');
      setProfileFotoDiri(currentUser.fotoDiri || null);
    }
  }, [currentUser]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      setProfileError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch {
      setProfileError('Tidak dapat mengakses kamera perangkat. Silakan gunakan tombol "Unggah File Foto Diri" dari galeri.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setProfileFotoDiri(dataUrl);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setProfileError('Ukuran file foto maksimal 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileFotoDiri(reader.result as string);
        setProfileError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');

    if (!profileStatus) {
      setProfileError('Silakan pilih status mitra terlebih dahulu.');
      return;
    }
    if (!profileNama.trim()) {
      setProfileError('Nama lengkap wajib diisi.');
      return;
    }
    if (!profileNoWa.trim()) {
      setProfileError('Nomor WhatsApp wajib diisi.');
      return;
    }
    if (!profileAlamat.trim()) {
      setProfileError('Alamat tinggal wajib diisi.');
      return;
    }
    if (!profileProvinsi) {
      setProfileError('Silakan pilih provinsi tinggal Anda.');
      return;
    }
    if (!profileNomorIdentitas.trim()) {
      setProfileError('Nomor identitas wajib diisi.');
      return;
    }
    if (!profileFotoDiri) {
      setProfileError('Silakan ambil atau unggah foto diri Anda.');
      return;
    }

    if (!currentUser) return;

    // Normalisasi WhatsApp number
    let cleanWa = profileNoWa.replace(/[^0-9]/g, '');
    if (cleanWa.startsWith('0')) {
      cleanWa = '62' + cleanWa.slice(1);
    } else if (!cleanWa.startsWith('62')) {
      cleanWa = '62' + cleanWa;
    }

    // Kumpulkan seluruh kode referral yang sudah pernah terdaftar di sistem (anti-duplikat)
    let allUsers: AffiliateUser[] = [];
    try {
      const existingUsersStr = localStorage.getItem('mapahtrip_all_affiliates');
      allUsers = existingUsersStr ? JSON.parse(existingUsersStr) : [];
    } catch {
      allUsers = [];
    }

    const existingCodes = new Set<string>();
    existingCodes.add('LPK-JAPANCENTER'); // kode demo bawaan

    allUsers.forEach((u) => {
      if (u.affiliateCode) existingCodes.add(u.affiliateCode.toUpperCase().trim());
    });

    pengajuanList.forEach((p) => {
      if (p.affiliateCode) existingCodes.add(p.affiliateCode.toUpperCase().trim());
    });

    // GENERATE KODE REFERRAL BARU KETIKA DATA SUDAH DIISI (SESUAI SPREADSHEET: MPH + 3 DIGIT WA + 2 HURUF NAMA)
    let activeCode = currentUser.affiliateCode;
    if (!activeCode) {
      const cleanDigits = cleanWa.replace(/\D/g, '');
      const last3Digits = cleanDigits.length >= 3 ? cleanDigits.slice(-3) : cleanDigits.padStart(3, '0');

      // Ambil 2 huruf identifikasi dari nama depan atau lembaga
      let namePart = '';
      const cleanLembaga = (profileLembaga || '').trim();
      if (profileStatus !== 'Umum' && cleanLembaga && cleanLembaga !== '-') {
        const parts = cleanLembaga.split(/\s+/).filter(p => !['lpk', 'biro', 'pt', 'cv', 'tour', 'travel'].includes(p.toLowerCase()));
        namePart = (parts[0] || cleanLembaga).toUpperCase().replace(/[^A-Z]/g, '');
      }
      if (!namePart) {
        namePart = (profileNama.trim().split(/\s+/)[0] || 'MP').toUpperCase().replace(/[^A-Z]/g, '');
      }
      const twoLetters = (namePart.slice(0, 2) || 'MP').padEnd(2, 'X');

      let candidate = `MPH${last3Digits}${twoLetters}`;
      let suffix = 1;
      while (existingCodes.has(candidate)) {
        candidate = `MPH${last3Digits}${twoLetters}${suffix}`;
        suffix++;
      }

      existingCodes.add(candidate);
      activeCode = candidate;
    }

    const updatedUser: AffiliateUser = {
      ...currentUser,
      nama: profileNama.trim(),
      statusMitra: profileStatus,
      lembaga: profileLembaga.trim() || '-',
      noWa: cleanWa,
      alamat: profileAlamat.trim(),
      provinsi: profileProvinsi,
      jenisIdentitas: profileJenisIdentitas,
      nomorIdentitas: profileNomorIdentitas.trim(),
      fotoDiri: profileFotoDiri,
      affiliateCode: activeCode,
      isProfileComplete: true,
    };

    // Update in allUsers storage
    try {
      const existingUsersStr = localStorage.getItem('mapahtrip_all_affiliates');
      const allUsers: AffiliateUser[] = existingUsersStr ? JSON.parse(existingUsersStr) : [];
      const userIdx = allUsers.findIndex(u => u.id === currentUser.id);
      if (userIdx !== -1) {
        allUsers[userIdx] = updatedUser;
      } else {
        allUsers.push(updatedUser);
      }
      localStorage.setItem('mapahtrip_all_affiliates', JSON.stringify(allUsers));
    } catch {
      // ignore
    }

    setCurrentUser(updatedUser);
    stopCamera();
    setShowProfileModal(false);
  };


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

    // 3. Buat akun mitra baru (Kode Referral belum diterbitkan, baru diberikan SETELAH isi data formulir)
    const newUser: AffiliateUser = {
      id: 'aff_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      nama: regName.trim(),
      email: emailClean,
      affiliateCode: '', // Kode belum ada, harus mengisi formulir data diri terlebih dahulu
      password: regPassword,
      createdAt: new Date().toISOString(),
      isProfileComplete: false,
    };

    // 4. Simpan akun ke daftar mitra
    try {
      allUsers.push(newUser);
      localStorage.setItem('mapahtrip_all_affiliates', JSON.stringify(allUsers));
    } catch {
      // ignore
    }

    setCurrentUser(newUser);
    setAuthSuccessMsg('Akun pendaftaran berhasil dibuat! Silakan lengkapi formulir identitas di bawah untuk menerbitkan Kode Referral resmi Anda.');
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

    // Default Demo Account (Memerlukan pengisian formulir pendaftaran terlebih dahulu sebelum kode referral terbit)
    if (emailClean === 'demo@mapahtrip.id' && loginPassword === '123456') {
      const demoUser: AffiliateUser = {
        id: 'aff_demo',
        nama: 'Mitra Demo LPK',
        email: 'demo@mapahtrip.id',
        affiliateCode: '', // Kode belum diterbitkan, wajib mengisi formulir pendaftaran dulu!
        createdAt: new Date().toISOString(),
        isProfileComplete: false, // Harus mengisi data identitas mitra
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
            maxWidth: '680px',
            width: '100%',
            maxHeight: '88vh',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: '#ECFDF5',
                  color: '#10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.2rem',
                }}
              >
                📜
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                  Syarat &amp; Ketentuan Kemitraan (MPC)
                </h3>
                <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                  Peraturan Direksi No. 018/SK/DIR/MPC/VI/2026 • Program Afiliasi Visa Jepang
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
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#475569',
                fontSize: '16px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#CBD5E1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#E2E8F0';
              }}
            >
              ✕
            </button>
          </div>

          {/* Modal Body (Scrollable Official Document) */}
          <div
            style={{
              padding: '24px 28px',
              overflowY: 'auto',
              fontSize: '0.84rem',
              color: '#334155',
              lineHeight: 1.65,
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              backgroundColor: '#FFFFFF',
            }}
          >
            {/* Kop Surat & Judul Formal */}
            <div style={{ textAlign: 'center', paddingBottom: '16px', borderBottom: '2px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#10B981', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>
                DOKUMEN RESMI KEMITRAAN MAPAHTRIP
              </div>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 900, color: '#0F172A', textTransform: 'uppercase' }}>
                PERATURAN DIREKSI MAPAHTRIP DIGITAL
              </h2>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
                Nomor : 018/SK/DIR/MPC/VI/2026
              </div>
              <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#005BB5', marginTop: '4px' }}>
                Tentang : PROGRAM MAPAHTRIP PARTNER CLUB (MPC)
              </div>
            </div>

            {/* Menimbang */}
            <div style={{ backgroundColor: '#F8FAFC', padding: '14px 18px', borderRadius: '10px', borderLeft: '4px solid #005BB5' }}>
              <strong style={{ color: '#0F172A', display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>
                MENIMBANG :
              </strong>
              <ol style={{ margin: 0, paddingLeft: '18px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>Bahwa Divisi Kemitraan &amp; Operasional Visa MapahTrip merupakan unit kerja strategis dalam menyediakan akses pengurusan visa Jepang yang resmi, cepat, dan transparan.</li>
                <li>Bahwa tingginya kebutuhan pengurusan visa Jepang (Magang/SSW Tokutei Ginou, Bisnis, Pelajar, dan Wisata) perlu direspons dengan skema kemitraan yang saling menguntungkan.</li>
                <li>Bahwa ketentuan program kemitraan terbaru MapahTrip Partner Club (MPC) telah diperhitungkan secara cermat untuk memberikan insentif tunai yang transparan bagi mitra.</li>
                <li>Bahwa sehubungan dengan hal tersebut di atas, perlu dibuatkan dan ditetapkan Peraturan Direksi.</li>
              </ol>
            </div>

            {/* Mengingat */}
            <div style={{ backgroundColor: '#F8FAFC', padding: '14px 18px', borderRadius: '10px', borderLeft: '4px solid #64748B' }}>
              <strong style={{ color: '#0F172A', display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>
                MENGINGAT :
              </strong>
              <ol style={{ margin: 0, paddingLeft: '18px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>Akta Pendirian Perusahaan MapahTrip Tahun 2024 tentang Layanan Pengurusan dan Pendampingan Dokumen Perjalanan.</li>
                <li>Standar Operasional Prosedur (SOP) Kedutaan Besar Jepang, Konsulat Jenderal Jepang di Indonesia, dan VFS JVAC (Japan Visa Application Centre).</li>
                <li>Peraturan Perusahaan MapahTrip Tahun 2024.</li>
              </ol>
            </div>

            {/* Memutuskan */}
            <div style={{ textAlign: 'center', margin: '4px 0' }}>
              <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.88rem' }}>
                MEMUTUSKAN :
              </span>
              <div style={{ fontWeight: 800, color: '#10B981', fontSize: '0.92rem', marginTop: '2px' }}>
                Menetapkan : PERATURAN DIREKSI TENTANG PROGRAM MAPAHTRIP PARTNER CLUB (MPC)
              </div>
            </div>

            {/* PASAL 1 */}
            <div>
              <strong style={{ color: '#0F172A', display: 'block', fontSize: '0.88rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '3px', marginBottom: '8px' }}>
                PASAL 1 : DEFINISI ISTILAH
              </strong>
              <div style={{ color: '#475569', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <p style={{ margin: 0 }}><strong>1. Mitra MPC</strong> adalah orang perorangan atau badan/lembaga (LPK, biro tour &amp; travel, sekolah bahasa, alumni/pekerja di Jepang, konsultan visa, atau masyarakat umum) yang terdaftar pada program MPC sebagai afiliasi untuk mereferensikan pemohon visa Jepang.</p>
                <p style={{ margin: 0 }}><strong>2. Kode Referral</strong> adalah kode unik resmi berformat <code>MPH + 3 digit terakhir No. WA + 2 huruf depan nama/lembaga</code> (contoh: <code>MPH433EL</code>) yang diberikan kepada Mitra MPC untuk digunakan oleh pemohon visa saat pendaftaran.</p>
                <p style={{ margin: 0 }}><strong>3. Insentif / Komisi</strong> adalah imbalan berupa uang tunai resmi sebesar <strong>Rp 100.000 / Visa</strong> yang diberikan kepada Mitra MPC untuk setiap pemohon visa yang berhasil menyelesaikan proses pengajuan dan visanya selesai/disetujui.</p>
                <p style={{ margin: 0 }}><strong>4. Website / Portal MPC</strong> adalah halaman resmi <code>mapahtrip.id/#affiliate</code> untuk pendaftaran, monitoring berkas, dan pencairan komisi.</p>
                <p style={{ margin: 0 }}><strong>5. Lembaga Pelatihan Kerja (LPK)</strong> adalah lembaga pelatihan yang mengirim kandidat tenaga kerja magang atau Tokutei Ginou (SSW) ke Jepang.</p>
                <p style={{ margin: 0 }}><strong>6. Biro Travel / Agensi</strong> adalah penyedia jasa perjalanan wisata, dinas, atau bisnis rombongan ke Jepang.</p>
                <p style={{ margin: 0 }}><strong>7. Alumni / Pekerja Jepang</strong> adalah eks-magang, pekerja berketerampilan spesifik (SSW), engineer, atau ekspatriat yang mereferensikan keluarga/rekan kerja untuk berangkat ke Jepang.</p>
                <p style={{ margin: 0 }}><strong>8. Masyarakat Umum</strong> adalah individu perorangan yang secara aktif bergabung menjadi mitra promosi MapahTrip.</p>
                <p style={{ margin: 0 }}><strong>9. Referral / Pemohon Visa</strong> adalah klien, siswa LPK, atau kandidat yang mengajukan pengurusan visa Jepang di MapahTrip menggunakan kode referral milik Mitra MPC.</p>
                <p style={{ margin: 0 }}><strong>10. Pengelola MPC</strong> adalah unit kerja Divisi Kemitraan yang ditunjuk sebagai pengelola program kemitraan oleh MapahTrip.</p>
                <p style={{ margin: 0 }}><strong>11. Staf Verifikator</strong> adalah petugas operasional MapahTrip yang melakukan validasi berkas fisik, pendaftaran JVAC, dan pencocokan kode referral.</p>
                <p style={{ margin: 0 }}><strong>12. Approved</strong> adalah status verifikasi pencairan komisi yang dinyatakan aman, valid, dan siap ditransfer setelah visa selesai.</p>
                <p style={{ margin: 0 }}><strong>13. Not Approved</strong> adalah status pencairan yang ditolak atau ditunda karena tidak memenuhi syarat, klaim sepihak, atau terindikasi pelanggaran.</p>
              </div>
            </div>

            {/* PASAL 2 */}
            <div>
              <strong style={{ color: '#0F172A', display: 'block', fontSize: '0.88rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '3px', marginBottom: '8px' }}>
                PASAL 2 : DEFINISI PROGRAM
              </strong>
              <p style={{ margin: 0, color: '#475569' }}>
                <strong>MapahTrip Partner Club (MPC)</strong> adalah program kemitraan berbasis afiliasi yang dikembangkan oleh MapahTrip untuk memperluas jangkauan layanan visa Jepang melalui para mitra (LPK, biro travel, alumni magang/pekerja di Jepang, sekolah bahasa, konsultan, maupun masyarakat umum). Program ini memberikan kesempatan bagi para mitra untuk memperoleh komisi tunai resmi atas keberhasilan mereferensikan pemohon visa Jepang menggunakan kode referral khusus.
              </p>
            </div>

            {/* PASAL 3 */}
            <div>
              <strong style={{ color: '#0F172A', display: 'block', fontSize: '0.88rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '3px', marginBottom: '8px' }}>
                PASAL 3 : TUJUAN PROGRAM
              </strong>
              <ol style={{ margin: 0, paddingLeft: '18px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>Meningkatkan kemudahan akses pengurusan berkas visa Jepang yang tepat, cepat, dan sesuai regulasi Kedutaan/JVAC.</li>
                <li>Menyediakan peluang bagi Mitra MPC untuk mendapatkan penghasilan tambahan (komisi tunai) tanpa modal dan tanpa pungutan biaya.</li>
                <li>Membangun ekosistem kemitraan yang solid bersama LPK, biro tour &amp; travel, dan komunitas alumni Jepang di seluruh Indonesia.</li>
                <li>Membangun hubungan profesional jangka panjang yang saling menguntungkan dan berkelanjutan.</li>
              </ol>
            </div>

            {/* PASAL 4 */}
            <div>
              <strong style={{ color: '#0F172A', display: 'block', fontSize: '0.88rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '3px', marginBottom: '8px' }}>
                PASAL 4 : RUANG LINGKUP
              </strong>
              <p style={{ margin: 0, color: '#475569' }}>
                Peraturan ini berlaku dan mengikat bagi seluruh pihak yang terlibat dalam Program MPC, yaitu: (1) Mitra MPC terdaftar; (2) Pemohon Visa / Referral binaan mitra; dan (3) Manajemen serta Pegawai Operasional MapahTrip.
              </p>
            </div>

            {/* PASAL 5 */}
            <div>
              <strong style={{ color: '#0F172A', display: 'block', fontSize: '0.88rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '3px', marginBottom: '8px' }}>
                PASAL 5 : SYARAT DAN KETENTUAN PENDAFTARAN
              </strong>
              <ol style={{ margin: 0, paddingLeft: '18px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>Mitra MPC wajib mendaftarkan diri melalui formulir pendaftaran portal resmi MapahTrip.</li>
                <li>Pendaftaran 100% gratis tanpa dipungut biaya pendaftaran atau iuran bulanan apapun.</li>
                <li>Mitra MPC wajib memberikan data pribadi yang valid dan akurat, mencakup: (a) Nama Lengkap; (b) Status Kemitraan; (c) Nama Lembaga (boleh diisi '-' jika umum); (d) Nomor WhatsApp aktif; (e) Alamat dan Provinsi; (f) Jenis &amp; Nomor Identitas (KTP/Paspor/SIM); (g) Foto diri/KTP; dan (h) Nomor Rekening Bank atau E-Wallet.</li>
                <li>Atas nama rekening bank atau e-wallet harus sama dengan nama mitra MPC terdaftar demi keamanan pencairan.</li>
                <li>Kode referral resmi diterbitkan otomatis setelah mitra melengkapi formulir identitas.</li>
                <li>Kode referral bersifat personal dan tidak dapat dipindahtangankan tanpa persetujuan tertulis MapahTrip.</li>
                <li>Setiap pemohon visa hanya dapat menggunakan satu kode referral saat pengajuan berkas.</li>
                <li>Mitra MPC dilarang melakukan promosi yang melanggar etika, hukum, SARA, atau merugikan pihak lain.</li>
                <li>Pegawai internal verifikator MapahTrip tidak diperkenankan menggunakan kode referral pribadi untuk pengajuan klien organik.</li>
              </ol>
            </div>

            {/* PASAL 6 */}
            <div>
              <strong style={{ color: '#0F172A', display: 'block', fontSize: '0.88rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '3px', marginBottom: '8px' }}>
                PASAL 6 : HAK DAN KEWAJIBAN MITRA MPC
              </strong>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px', marginTop: '6px' }}>
                <div style={{ backgroundColor: '#F0FDF4', padding: '12px', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
                  <strong style={{ color: '#166534', display: 'block', marginBottom: '4px', fontSize: '0.82rem' }}>Hak Mitra MPC:</strong>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.78rem', color: '#15803D', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <li>Mendapat Kode Referral resmi berformat unik (<code>MPH...</code>).</li>
                    <li>Mendapat flyer &amp; materi informasi persyaratan visa Jepang resmi.</li>
                    <li>Mendapat edukasi dan konsultasi berkas visa Jepang.</li>
                    <li>Mendapat komisi tunai Rp 100.000 per visa terbit/selesai.</li>
                    <li>Mendapat akses monitoring status berkas pemohon secara transparan.</li>
                    <li>Mendapat bukti transfer pencairan komisi tunai.</li>
                    <li>Mendapat jaminan perlindungan dan kerahasiaan data pribadi.</li>
                  </ul>
                </div>
                <div style={{ backgroundColor: '#EFF6FF', padding: '12px', borderRadius: '10px', border: '1px solid #BFDBFE' }}>
                  <strong style={{ color: '#1E40AF', display: 'block', marginBottom: '4px', fontSize: '0.82rem' }}>Kewajiban Mitra MPC:</strong>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.78rem', color: '#1D4ED8', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <li>Memberikan data diri dan nomor rekening yang valid untuk pencairan.</li>
                    <li>Mengajak rekan, siswa LPK, atau rombongan yang butuh visa Jepang ke MapahTrip.</li>
                    <li>Memastikan berkas pemohon yang direkomendasikan asli dan dapat dipertanggungjawabkan.</li>
                    <li>Memastikan pemohon memasukkan kode referral mitra pada saat pendaftaran.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* PASAL 7 */}
            <div>
              <strong style={{ color: '#0F172A', display: 'block', fontSize: '0.88rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '3px', marginBottom: '8px' }}>
                PASAL 7 : SKEMA INSENTIF KOMISI MITRA
              </strong>
              <div style={{ backgroundColor: '#ECFDF5', padding: '12px 16px', borderRadius: '10px', border: '1px solid #10B981', marginBottom: '8px' }}>
                <div style={{ fontWeight: 800, color: '#047857', fontSize: '0.92rem' }}>
                  Komisi Tunai Flat: Rp 100.000 / Visa Terbit
                </div>
                <div style={{ fontSize: '0.78rem', color: '#065F46', marginTop: '2px' }}>
                  Berlaku untuk seluruh kategori visa Jepang: Magang/SSW Tokutei Ginou, Visa Kerja, Visa Bisnis/Seminar, Visa Pelajar, dan Visa Turis Single/Multiple Entry.
                </div>
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <li><strong>Simulasi Pendapatan:</strong> Ajak 1 Pemohon = Rp 100.000 | Ajak 5 Pemohon = Rp 500.000 | Ajak 10 Pemohon = Rp 1.000.000 | Ajak 25 Pemohon = Rp 2.500.000.</li>
                <li><strong>Benefit Pemohon:</strong> Pemohon binaan mendapatkan jaminan verifikasi berkas lengkap, translate dokumen, antrean JVAC, dan update progres langsung.</li>
              </ul>
            </div>

            {/* PASAL 8 */}
            <div>
              <strong style={{ color: '#0F172A', display: 'block', fontSize: '0.88rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '3px', marginBottom: '8px' }}>
                PASAL 8 : STATUS DAN PROSES PENCAIRAN INSENTIF
              </strong>
              <div style={{ color: '#475569', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <p style={{ margin: 0 }}><strong>1. Approved:</strong> Status pencairan disetujui apabila proses visa pemohon telah selesai diproses oleh Kedutaan/JVAC dan data verifikasi mitra dinyatakan valid.</p>
                <p style={{ margin: 0 }}><strong>2. Not Approved:</strong> Status pencairan tidak diproses apabila: (a) Pemohon mendaftar menggunakan kode referral miliknya sendiri tanpa izin; (b) Mitra terdaftar dalam daftar sanksi/blacklist; (c) Pemohon menyatakan tidak pernah direferensikan oleh mitra (klaim sepihak); atau (d) Pengajuan visa dibatalkan sebelum diproses.</p>
                <p style={{ margin: 0 }}><strong>3. Waktu Pencairan:</strong> Komisi ditransfer maksimal 1–3 hari kerja setelah pengajuan visa dinyatakan selesai dan lolos approval.</p>
                <p style={{ margin: 0 }}><strong>4. Metode Transfer:</strong> Insentif ditransfer langsung ke rekening bank (BCA, Mandiri, BNI, BRI, BSI, Seabank, dll) atau dompet digital (GoPay, OVO, Dana) yang didaftarkan mitra.</p>
                <p style={{ margin: 0 }}><strong>5. Gagal Cair:</strong> Jika transfer terkendala teknis atau nomor rekening salah, pengelola MPC akan meminta mitra memperbarui data rekening agar komisi dapat dikirim ulang.</p>
              </div>
            </div>

            {/* PASAL 9 */}
            <div>
              <strong style={{ color: '#0F172A', display: 'block', fontSize: '0.88rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '3px', marginBottom: '8px' }}>
                PASAL 9 : PELANGGARAN PROGRAM MPC
              </strong>
              <ol style={{ margin: 0, paddingLeft: '18px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li><strong>Pelanggaran Ringan:</strong> Mengarahkan pemohon organik kantor yang datang sendiri agar menggunakan kode referral tertentu demi mendapatkan keuntungan tanpa rekomendasi awal; atau mengetahui penyalahgunaan tetapi tidak melapor.</li>
                <li><strong>Pelanggaran Berat:</strong> Memberikan informasi menyesatkan/palsu kepada pemohon; menjanjikan kelulusan visa 100% (keputusan visa adalah hak prerogatif Kedutaan Jepang); atau menjanjikan diskon liar di luar ketentuan resmi MapahTrip.</li>
                <li><strong>Pelanggaran Mendesak (Fraud):</strong> Memalsukan dokumen pemohon (rekening koran palsu, KTP palsu, sponsor manipulatif); bersekongkol mencairkan komisi fiktif; atau merekayasa penggunaan kode referral mitra lain.</li>
              </ol>
            </div>

            {/* PASAL 10 */}
            <div>
              <strong style={{ color: '#0F172A', display: 'block', fontSize: '0.88rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '3px', marginBottom: '8px' }}>
                PASAL 10 : SANKSI
              </strong>
              <ul style={{ margin: 0, paddingLeft: '18px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <li>Peringatan tertulis kepada Mitra MPC yang melanggar ketentuan program.</li>
                <li>Pembatalan komisi insentif atas pengajuan yang terbukti memanipulasi kode referral.</li>
                <li>Kewajiban pengembalian insentif yang diperoleh dari transaksi yang tidak sah.</li>
                <li>Penonaktifan akun, pemblokiran kode referral permanen, dan pencantuman ke daftar hitam (blacklist) kemitraan MapahTrip.</li>
                <li>Tindakan pemalsuan dokumen berkas resmi dapat diteruskan ke jalur hukum yang berlaku.</li>
              </ul>
            </div>

            {/* PASAL 11 */}
            <div>
              <strong style={{ color: '#0F172A', display: 'block', fontSize: '0.88rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '3px', marginBottom: '8px' }}>
                PASAL 11 : PENUTUP
              </strong>
              <p style={{ margin: 0, color: '#475569' }}>
                Peraturan ini mulai berlaku efektif sejak tanggal 1 Januari 2026 dan menjadi acuan operasional kemitraan MapahTrip Partner Club. Hal-hal teknis yang belum diatur akan dituangkan dalam SOP tersendiri.
              </p>
            </div>

            {/* Tanda Tangan Pengesahan */}
            <div style={{ marginTop: '12px', padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Ditetapkan di: <strong>Jakarta</strong></div>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Berlaku sejak: <strong>1 Januari 2026</strong></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A' }}>Direksi MapahTrip Digital Indonesia</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#10B981', margin: '4px 0 2px' }}>Divisi Kemitraan &amp; Layanan Visa</div>
                <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Ttd. Manajemen Resmi MapahTrip</div>
              </div>
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
              Dengan mendaftar sebagai mitra, Anda menyepakati seluruh pasal di atas.
            </span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  border: '1px solid #CBD5E1',
                  padding: '9px 16px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                🖨️ Cetak / PDF
              </button>
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
                  padding: '9px 20px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                }}
              >
                <span>✓ Saya Mengerti &amp; Setuju</span>
              </button>
            </div>
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
                          <strong>Komisi Referral:</strong> Rp 100.000 flat per visa terbit / selesai.
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
  // VIEW 1.5: PARTNER CLUB MENU & FORM (SESUAI NFIC NURUL FIKRI UNTUK VISA)
  // Menampilkan landing page menu Informasi/Insentif terlebih dahulu,
  // lalu klik "Daftar Sekarang" untuk membuka formulir pendaftaran.
  // =========================================================================
  if (currentUser && !currentUser.isProfileComplete) {
    if (onboardingView === 'menu') {
      return (
        <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', display: 'flex', color: '#0F172A', fontFamily: 'inherit' }}>
          {/* Sidebar Kiri (Gaya PSB-NF) */}
          <aside
            style={{
              width: '260px',
              backgroundColor: '#FFFFFF',
              borderRight: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '24px 16px',
              flexShrink: 0,
            }}
          >
            <div>
              {/* Brand Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px', paddingLeft: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#005BB5',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '16px',
                  }}
                >
                  ⛩️
                </div>
                <div>
                  <strong style={{ fontSize: '1.05rem', color: '#0F172A', display: 'block', lineHeight: 1.1 }}>
                    MapahTrip
                  </strong>
                  <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Partner Portal</span>
                </div>
                <span
                  style={{
                    backgroundColor: '#0284C7',
                    color: '#FFFFFF',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    marginLeft: 'auto',
                  }}
                >
                  v3
                </span>
              </div>

              {/* Nav Category 1: Platform User */}
              <div style={{ marginBottom: '24px' }}>
                <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', paddingLeft: '12px', display: 'block', marginBottom: '8px' }}>
                  Platform User
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => alert('Fitur ini akan aktif setelah Anda terdaftar resmi sebagai mitra.')}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#64748B',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>dashboard</span>
                    <span>Dasbor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => alert('Belum ada notifikasi baru.')}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#64748B',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>notifications</span>
                    <span>Notifikasi</span>
                  </button>
                </div>
              </div>

              {/* Nav Category 2: Afiliasi (ACTIVE) */}
              <div style={{ marginBottom: '24px' }}>
                <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', paddingLeft: '12px', display: 'block', marginBottom: '8px' }}>
                  Afiliasi
                </span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    color: '#166534',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#10B981' }}>groups</span>
                  <span>Partner Club (MPC)</span>
                </div>
              </div>

              {/* Nav Category 3: Bantuan */}
              <div>
                <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', paddingLeft: '12px', display: 'block', marginBottom: '8px' }}>
                  Bantuan &amp; Info
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#64748B',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>article</span>
                    <span>Syarat &amp; Ketentuan</span>
                  </button>
                  <a
                    href="https://wa.me/6281401735648?text=Halo%20MapahTrip,%20saya%20ingin%20tanya%20program%20mitra%20affiliate%20visa"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      color: '#64748B',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>support_agent</span>
                    <span>Pusat Bantuan</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Bottom User Pill */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {currentUser.nama.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <strong style={{ fontSize: '0.82rem', color: '#0F172A', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentUser.nama}
                  </strong>
                  <span style={{ fontSize: '0.7rem', color: '#94A3B8', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentUser.email}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Keluar"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
              </button>
            </div>
          </aside>

          {/* Konten Utama Kanan (Sesuai Screenshot NFIC) */}
          <main style={{ flex: 1, padding: '36px 48px', overflowY: 'auto' }}>
            {/* Header Judul */}
            <div style={{ marginBottom: '28px' }}>
              <h1 style={{ margin: '0 0 6px', fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                MapahTrip Partner Club (MPC)
              </h1>
              <p style={{ margin: 0, fontSize: '0.92rem', color: '#64748B' }}>
                Ajak teman, siswa LPK, atau rombongan buat visa Jepang di MapahTrip bisa Cuan Ratusan Ribu (Rp 100.000 / visa terbit).
              </p>
            </div>

            {/* Sub-Tabs: Informasi vs Insentif (Gaya NFIC) */}
            <div style={{ display: 'flex', gap: '32px', borderBottom: '1px solid #E2E8F0', marginBottom: '28px' }}>
              <button
                type="button"
                onClick={() => setPartnerSubTab('informasi')}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: partnerSubTab === 'informasi' ? '3px solid #10B981' : '3px solid transparent',
                  padding: '10px 4px 14px',
                  color: partnerSubTab === 'informasi' ? '#0F172A' : '#64748B',
                  fontWeight: partnerSubTab === 'informasi' ? 800 : 600,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: partnerSubTab === 'informasi' ? '5px solid #10B981' : '2px solid #CBD5E1',
                    display: 'inline-block',
                    boxSizing: 'border-box',
                  }}
                />
                <span>Informasi</span>
              </button>

              <button
                type="button"
                onClick={() => setPartnerSubTab('insentif')}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: partnerSubTab === 'insentif' ? '3px solid #10B981' : '3px solid transparent',
                  padding: '10px 4px 14px',
                  color: partnerSubTab === 'insentif' ? '#0F172A' : '#64748B',
                  fontWeight: partnerSubTab === 'insentif' ? 800 : 600,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: partnerSubTab === 'insentif' ? '5px solid #10B981' : '2px solid #CBD5E1',
                    display: 'inline-block',
                    boxSizing: 'border-box',
                  }}
                />
                <span>Insentif</span>
              </button>
            </div>

            {/* TAB 1: INFORMASI */}
            {partnerSubTab === 'informasi' && (
              <div style={{ maxWidth: '820px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <h2 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                    Informasi Program
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748B' }}>
                    Daftar jadi Mitra MapahTrip, dan dapatkan komisi tunai resmi untuk setiap visa yang terbit.
                  </p>
                </div>

                {/* Deskripsi Box (Sesuai Screenshot NFIC) */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '24px 28px',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
                    marginBottom: '28px',
                  }}
                >
                  <p style={{ margin: '0 0 20px', fontSize: '0.88rem', color: '#334155', lineHeight: 1.7 }}>
                    <strong>MapahTrip Partner Club (MPC)</strong> adalah program kemitraan berbasis referral resmi yang dikembangkan oleh MapahTrip untuk memperluas jangkauan layanan visa Jepang melalui para mitra yang terdiri dari LPK (Lembaga Pelatihan Kerja), biro travel, alumni magang/pekerja di Jepang, sekolah bahasa, maupun masyarakat umum. Program ini memberikan kesempatan bagi para mitra untuk memperoleh komisi tunai tanpa modal dan tanpa biaya pendaftaran, hanya dengan membagikan kode referral khusus kepada pemohon visa Jepang.
                  </p>

                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    style={{
                      backgroundColor: '#F1F5F9',
                      color: '#0F172A',
                      border: '1px solid #CBD5E1',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E2E8F0')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#475569' }}>
                      description
                    </span>
                    <span>Syarat dan Ketentuan</span>
                  </button>
                </div>

                {/* Tombol Hijau: Daftar Sekarang (Membuka Formulir Pendaftaran) */}
                <div>
                  <button
                    type="button"
                    onClick={() => setOnboardingView('form')}
                    style={{
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '14px 28px',
                      borderRadius: '12px',
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '10px',
                      boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#059669';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#10B981';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <span>Daftar Sekarang</span>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      open_in_new
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: INSENTIF (DISESUAIKAN DENGAN GOOGLE SPREADSHEET MAPAHTRIP) */}
            {partnerSubTab === 'insentif' && (
              <div style={{ maxWidth: '820px' }}>
                <div style={{ marginBottom: '22px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#ECFDF5', color: '#047857', fontSize: '0.75rem', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', marginBottom: '8px' }}>
                    <span>✨</span> SKEMA KOMISI RESMI MAPAHTRIP
                  </div>
                  <h2 style={{ margin: '0 0 6px', fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
                    Skema Insentif &amp; Komisi Mitra
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
                    <em>&ldquo;Ajak teman buat visa di MapahTrip bisa Cuan Ratusan Ribu! Makin banyak yang diajak buat visa di MapahTrip, makin tinggi Cuannya!&rdquo;</em>
                  </p>
                </div>

                {/* Banner Utama: Rp 100.000 / Visa */}
                <div style={{
                  backgroundColor: '#FFFFFF',
                  border: '2px solid #10B981',
                  borderRadius: '18px',
                  padding: '24px',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.08)',
                  marginBottom: '24px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px'
                }}>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                      Komisi Referral Resmi
                    </div>
                    <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#10B981', lineHeight: 1.1 }}>
                      Rp 100.000 <span style={{ fontSize: '0.95rem', color: '#475569', fontWeight: 600 }}>/ Visa terbit</span>
                    </div>
                    <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: '#334155' }}>
                      Berlaku untuk seluruh kategori pengajuan visa Jepang (Magang/SSW Tokutei Ginou, Bisnis, Pelajar, Turis Single &amp; Multiple Entry).
                    </p>
                  </div>
                  <div style={{
                    backgroundColor: '#F0FDF4',
                    border: '1px dashed #10B981',
                    borderRadius: '12px',
                    padding: '12px 18px',
                    fontSize: '0.82rem',
                    color: '#065F46',
                    maxWidth: '280px'
                  }}>
                    <strong>📌 Ketentuan Pembayaran:</strong>
                    <div style={{ marginTop: '4px', fontSize: '0.78rem', color: '#047857' }}>
                      Pembayaran bonus Affiliate dilakukan setelah proses pengajuan Visa selesai &amp; disetujui.
                    </div>
                  </div>
                </div>

                {/* Simulasi Pendapatan Card */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>
                    📊 Simulasi Pendapatan Komisi Anda
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
                    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>Ajak 1 Pemohon</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A', margin: '6px 0 2px' }}>Rp 100.000</div>
                      <div style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 700 }}>Bonus Pertama</div>
                    </div>
                    <div style={{ border: '1px solid #10B981', borderRadius: '14px', padding: '16px', textAlign: 'center', backgroundColor: '#F0FDF4' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#065F46' }}>Ajak 5 Pemohon</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#047857', margin: '6px 0 2px' }}>Rp 500.000</div>
                      <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>Contoh di Spreadsheet</div>
                    </div>
                    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>Ajak 10 Pemohon</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A', margin: '6px 0 2px' }}>Rp 1.000.000</div>
                      <div style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 700 }}>Cuan 1 Juta Rupiah</div>
                    </div>
                    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>Ajak 25 Pemohon</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A', margin: '6px 0 2px' }}>Rp 2.500.000</div>
                      <div style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 700 }}>Skala LPK / Komunitas</div>
                    </div>
                  </div>
                </div>

                {/* Format Kode Referral Info */}
                <div style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '14px',
                  padding: '16px 20px',
                  marginBottom: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px'
                }}>
                  <div style={{ fontSize: '1.8rem' }}>🏷️</div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A' }}>
                      Format Kode Referral Otomatis Resmi
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px' }}>
                      Mengikuti standar spreadsheet: <code style={{ backgroundColor: '#E2E8F0', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, color: '#0F172A' }}>MPH + (3 Digit Terakhir No. WA) + (2 Huruf Nama Depan)</code>. Contoh: WA akhiran 433 &amp; nama Elen = <strong>MPH433EL</strong>.
                    </div>
                  </div>
                </div>

                {/* Tombol Hijau: Daftar Sekarang */}
                <div>
                  <button
                    type="button"
                    onClick={() => setOnboardingView('form')}
                    style={{
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '14px 28px',
                      borderRadius: '12px',
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '10px',
                      boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)',
                    }}
                  >
                    <span>Daftar Sekarang</span>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      open_in_new
                    </span>
                  </button>
                </div>
              </div>
            )}
          </main>

          {/* Modal Syarat & Ketentuan */}
          {renderTermsModal()}
        </div>
      );
    }

    // ONBOARDING VIEW === 'form' (Formulir Pengisian Data Identitas Mitra)
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 16px',
          fontFamily: 'inherit',
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.02)',
            padding: '36px 32px',
            maxWidth: '680px',
            width: '100%',
          }}
        >
          {/* Tombol Kembali ke Menu Landing Page */}
          <div style={{ marginBottom: '20px' }}>
            <button
              type="button"
              onClick={() => setOnboardingView('menu')}
              style={{
                background: 'none',
                border: 'none',
                color: '#005BB5',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: 0,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
              <span>Kembali ke Informasi Program</span>
            </button>
          </div>

          {/* Header Form */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'rgba(0, 91, 181, 0.08)',
                color: '#005BB5',
                padding: '6px 16px',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                fontWeight: 800,
                marginBottom: '12px',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                badge
              </span>
              <span>Langkah 2: Formulir Pendaftaran Mitra</span>
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
              Formulir Pendaftaran Mitra
            </h2>
            <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748B', lineHeight: 1.5 }}>
              Lengkapi identitas kemitraan resmi MapahTrip untuk pencairan komisi tunai dan penerbitan Kode Referral unik Anda.
            </p>
          </div>

          {/* Info Banner: Kode Diberikan Setelah Isi Data */}
          <div
            style={{
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '12px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px',
              fontSize: '0.84rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1E40AF' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#2563EB' }}>
                lock_clock
              </span>
              <span>
                <strong>Kode Referral Resmi</strong> akan otomatis diterbitkan dan diberikan setelah Anda melengkapi seluruh formulir data diri di bawah ini.
              </span>
            </div>
            <span style={{ fontSize: '0.74rem', color: '#1E40AF', backgroundColor: '#DBEAFE', padding: '3px 10px', borderRadius: '6px', fontWeight: 700 }}>
              Menunggu Data
            </span>
          </div>

          {/* Error Alert */}
          {profileError && (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '12px',
                padding: '12px 16px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#991B1B',
                fontSize: '0.84rem',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                error
              </span>
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* 1. Status Mitra */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Status Mitra <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                value={profileStatus}
                onChange={(e) => {
                  const val = e.target.value;
                  setProfileStatus(val);
                  if (val === 'Umum' && (!profileLembaga || profileLembaga === 'Japan Center Indonesia')) {
                    setProfileLembaga('-');
                  }
                }}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: profileStatus ? '#0F172A' : '#94A3B8',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              >
                <option value="">pilih status</option>
                {STATUS_MITRA_LIST.map((st) => (
                  <option key={st} value={st} style={{ color: '#0F172A' }}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Nama Lengkap & Lembaga */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Nama Lengkap <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="nama lengkap"
                  value={profileNama}
                  onChange={(e) => setProfileNama(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Lembaga / Instansi <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 500 }}>(atau isi &quot;-&quot; jika perorangan)</span>
                </label>
                <input
                  type="text"
                  placeholder='nama LPK / biro travel / agensi (atau isi "-")'
                  value={profileLembaga}
                  onChange={(e) => setProfileLembaga(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    backgroundColor: '#FFFFFF',
                  }}
                />
                <span style={{ fontSize: '0.73rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#005BB5' }}>info</span>
                  <span>Boleh diisi &quot;-&quot; jika pendaftar Umum / perorangan atau tidak memiliki lembaga</span>
                </span>
              </div>
            </div>

            {/* 3. No Whatsapp & Provinsi */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  No Whatsapp <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="tel"
                  placeholder="nomor dengan format 628xxxxxxxxxx"
                  value={profileNoWa}
                  onChange={(e) => setProfileNoWa(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Provinsi <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={profileProvinsi}
                  onChange={(e) => setProfileProvinsi(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: profileProvinsi ? '#0F172A' : '#94A3B8',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                >
                  <option value="">Pilih Provinsi</option>
                  {PROVINSI_LIST.map((prov) => (
                    <option key={prov} value={prov} style={{ color: '#0F172A' }}>
                      {prov}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4. Alamat Tinggal */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Alamat <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <textarea
                placeholder="alamat tinggal"
                value={profileAlamat}
                onChange={(e) => setProfileAlamat(e.target.value)}
                required
                rows={2}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.88rem',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* 5. Jenis Identitas & Nomor Identitas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Jenis Identitas <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={profileJenisIdentitas}
                  onChange={(e) => setProfileJenisIdentitas(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                >
                  <option value="">Pilih Jenis Identitas</option>
                  {JENIS_IDENTITAS_LIST.map((idType) => (
                    <option key={idType} value={idType}>
                      {idType}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Nomor Identitas <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="nomor identitas"
                  value={profileNomorIdentitas}
                  onChange={(e) => setProfileNomorIdentitas(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* 6. Ambil Foto Diri */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Ambil Foto Diri <span style={{ color: '#EF4444' }}>*</span>
              </label>

              <div
                style={{
                  border: '2px dashed #CBD5E1',
                  borderRadius: '16px',
                  padding: '20px',
                  backgroundColor: '#F8FAFC',
                  textAlign: 'center',
                }}
              >
                {/* Preview if photo exists */}
                {profileFotoDiri ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: '3px solid #10B981',
                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)',
                      }}
                    >
                      <img
                        src={profileFotoDiri}
                        alt="Foto Diri Mitra"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontSize: '0.82rem', fontWeight: 700 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#10B981' }}>
                        verified
                      </span>
                      <span>Foto Diri Berhasil Diambil</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileFotoDiri(null);
                          startCamera();
                        }}
                        style={{
                          backgroundColor: '#FFFFFF',
                          color: '#0284C7',
                          border: '1px solid #CBD5E1',
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Ambil Ulang
                      </button>
                      <button
                        type="button"
                        onClick={() => setProfileFotoDiri(null)}
                        style={{
                          backgroundColor: '#FFFFFF',
                          color: '#EF4444',
                          border: '1px solid #FECACA',
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ) : isCameraActive ? (
                  /* Camera Video Feed Live */
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '260px',
                        height: '200px',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        backgroundColor: '#000000',
                        position: 'relative',
                      }}
                    >
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={capturePhoto}
                        style={{
                          backgroundColor: '#10B981',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '9px 18px',
                          borderRadius: '10px',
                          fontSize: '0.84rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                          photo_camera
                        </span>
                        <span>Jepret Foto</span>
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        style={{
                          backgroundColor: '#E2E8F0',
                          color: '#475569',
                          border: 'none',
                          padding: '9px 14px',
                          borderRadius: '10px',
                          fontSize: '0.84rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Camera / Upload buttons */
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(0, 91, 181, 0.08)',
                        color: '#005BB5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>
                        account_circle
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', display: 'block', marginBottom: '2px' }}>
                        Ambil Foto Diri / Pasfoto
                      </span>
                      <span style={{ fontSize: '0.76rem', color: '#64748B' }}>
                        Buka kamera untuk foto langsung atau unggah foto dari perangkat Anda
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '6px' }}>
                      <button
                        type="button"
                        onClick={startCamera}
                        style={{
                          backgroundColor: '#005BB5',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '9px 18px',
                          borderRadius: '10px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 8px rgba(0, 91, 181, 0.25)',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                          photo_camera
                        </span>
                        <span>Buka Kamera (Foto Diri)</span>
                      </button>

                      <label
                        style={{
                          backgroundColor: '#FFFFFF',
                          color: '#334155',
                          border: '1px solid #CBD5E1',
                          padding: '9px 16px',
                          borderRadius: '10px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#64748B' }}>
                          upload_file
                        </span>
                        <span>Pilih dari Galeri</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="user"
                          onChange={handleFileUpload}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div style={{ marginTop: '12px' }}>
              <button
                type="submit"
                style={{
                  width: '100%',
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '14px',
                  borderRadius: '14px',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#059669')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#10B981')}
              >
                <span>Simpan Data &amp; Terbitkan Kode Referral ➔</span>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  key
                </span>
              </button>
            </div>
          </form>

          {/* Footer note */}
          <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748B',
                fontSize: '0.78rem',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Keluar / Ganti Akun Lain
            </button>
          </div>
        </div>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {currentUser.fotoDiri ? (
              <img
                src={currentUser.fotoDiri}
                alt="Foto Profil"
                style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #10B981' }}
              />
            ) : (
              <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#94A3B8' }}>
                account_circle
              </span>
            )}
            <strong style={{ fontSize: '0.9rem', letterSpacing: '-0.01em' }}>
              Portal Mitra: {currentUser.nama}
            </strong>
            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                padding: '3px 10px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                badge
              </span>
              <span>Data Saya</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Ingin menguji alur pengisian formulir data diri dari awal?')) {
                  const resetUser: AffiliateUser = { ...currentUser, affiliateCode: '', isProfileComplete: false };
                  setCurrentUser(resetUser);
                }
              }}
              style={{
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                color: '#38BDF8',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                padding: '3px 10px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Uji coba alur pengisian formulir pendaftaran mitra"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                edit_note
              </span>
              <span>Tes Isi Formulir</span>
            </button>
          </div>
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

      {/* Modal Lihat / Edit Data Profil Mitra */}
      {showProfileModal && (
        <div
          onClick={() => setShowProfileModal(false)}
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
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
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
                <span className="material-symbols-outlined" style={{ color: '#005BB5', fontSize: '24px' }}>
                  badge
                </span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                    Data Identitas Mitra
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                    Terverifikasi di Sistem MapahTrip
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                style={{
                  background: '#E2E8F0',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#475569',
                }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem' }}>
              {/* Photo & Basic Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                {currentUser.fotoDiri ? (
                  <img
                    src={currentUser.fotoDiri}
                    alt="Foto Profil"
                    style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #10B981' }}
                  />
                ) : (
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#94A3B8' }}>account_circle</span>
                  </div>
                )}
                <div>
                  <strong style={{ fontSize: '1rem', color: '#0F172A', display: 'block' }}>{currentUser.nama}</strong>
                  <span style={{ fontSize: '0.78rem', color: '#0284C7', fontWeight: 700, display: 'block' }}>
                    Kode: {currentUser.affiliateCode}
                  </span>
                  <span style={{ fontSize: '0.74rem', color: '#166534', backgroundColor: '#DCFCE7', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, marginTop: '4px', display: 'inline-block' }}>
                    ✓ Mitra Terverifikasi
                  </span>
                </div>
              </div>

              {/* Data Table */}
              <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '10px 14px', padding: '6px 0' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Status Mitra:</span>
                <span style={{ color: '#0F172A', fontWeight: 700 }}>{currentUser.statusMitra || 'Mitra Lembaga'}</span>

                <span style={{ color: '#64748B', fontWeight: 600 }}>Lembaga / Instansi:</span>
                <span style={{ color: '#0F172A', fontWeight: 700 }}>{currentUser.lembaga || '-'}</span>

                <span style={{ color: '#64748B', fontWeight: 600 }}>No. WhatsApp:</span>
                <span style={{ color: '#0F172A', fontWeight: 700 }}>{currentUser.noWa || '-'}</span>

                <span style={{ color: '#64748B', fontWeight: 600 }}>Email Terdaftar:</span>
                <span style={{ color: '#0F172A' }}>{currentUser.email}</span>

                <span style={{ color: '#64748B', fontWeight: 600 }}>Provinsi:</span>
                <span style={{ color: '#0F172A', fontWeight: 700 }}>{currentUser.provinsi || '-'}</span>

                <span style={{ color: '#64748B', fontWeight: 600 }}>Alamat:</span>
                <span style={{ color: '#0F172A' }}>{currentUser.alamat || '-'}</span>

                <span style={{ color: '#64748B', fontWeight: 600 }}>Jenis Identitas:</span>
                <span style={{ color: '#0F172A', fontWeight: 700 }}>{currentUser.jenisIdentitas || 'KTP'}</span>

                <span style={{ color: '#64748B', fontWeight: 600 }}>Nomor Identitas:</span>
                <span style={{ color: '#0F172A', fontWeight: 700 }}>{currentUser.nomorIdentitas || '-'}</span>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                style={{
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '8px 20px',
                  borderRadius: '8px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
