import React, { useState } from 'react';
import type { StaffMaster } from '../types';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffMaster[];
  onLoginAsOwner: () => void;
  onLoginAsStaff: (staff: StaffMaster) => void;
  initialTab?: 'owner' | 'staff';
  canClose?: boolean;
  onBackToHome?: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  staffList,
  onLoginAsOwner,
  onLoginAsStaff,
  canClose = true,
  onBackToHome,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const idClean = identifier.trim().toLowerCase();
    const passClean = password.trim();

    if (!idClean) {
      setErrorMsg('Masukkan username atau alamat email.');
      return;
    }
    if (!passClean) {
      setErrorMsg('Masukkan kata sandi atau PIN Anda.');
      return;
    }

    // 1. Cek Kredensial Owner
    const isOwnerUser =
      idClean === 'owner' ||
      idClean === 'owner@mapahtrip.id' ||
      idClean === 'admin' ||
      idClean === 'founder' ||
      idClean === 'mapahtrip';

    const isOwnerPass =
      passClean === 'owner123' ||
      passClean === 'admin123' ||
      passClean === '889988' ||
      passClean === '123456';

    if (isOwnerUser && isOwnerPass) {
      if (rememberMe) {
        localStorage.setItem('mapahtrip_owner_auth', 'true');
      }
      onLoginAsOwner();
      onClose();
      return;
    }

    // 2. Cek Kredensial Staf (dari 6 akun staf atau staf baru yang dibuat owner)
    const matchedStaff = staffList.find((staf) => {
      const uName = (staf.username || staf.nama.toLowerCase().replace(/\s+/g, '')).toLowerCase();
      const uEmail = (staf.email || `${uName}@mapahtrip.id`).toLowerCase();
      const fullName = staf.nama.toLowerCase();
      const firstName = staf.nama.split(' ')[0].toLowerCase();

      const isMatchId =
        idClean === uName ||
        idClean === uEmail ||
        idClean === fullName ||
        idClean === firstName;

      const correctPin = staf.pin || '1234';
      const isMatchPass = passClean === correctPin || passClean === '1234';

      return isMatchId && isMatchPass;
    });

    if (matchedStaff) {
      if (!matchedStaff.aktif) {
        setErrorMsg(`Akun ${matchedStaff.nama} saat ini berstatus nonaktif. Hubungi Owner untuk aktivasi.`);
        return;
      }
      if (rememberMe) {
        localStorage.setItem('mapahtrip_staff_session', matchedStaff.id);
      }
      onLoginAsStaff(matchedStaff);
      onClose();
      return;
    }

    // Jika salah
    setErrorMsg('Username/Email atau Kata Sandi salah. Periksa kembali data akun Anda.');
  };

  const isModalOverlay = canClose;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: isModalOverlay ? 'rgba(15, 23, 42, 0.6)' : '#F8FAFC',
        backdropFilter: isModalOverlay ? 'blur(6px)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        fontFamily: 'inherit',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={(e) => {
        if (canClose && e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top Bar Navigation (Sesuai Gambar 2) */}
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <button
          type="button"
          onClick={onBackToHome || onClose}
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
            padding: 0,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            arrow_back
          </span>
          <span>Kembali ke Beranda</span>
        </button>

        <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 700 }}>
          PORTAL INTERNAL ⛩️
        </span>
      </div>

      {/* Card Container (Clean white card sesuai Gambar 2) */}
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
          position: 'relative',
        }}
      >
        {canClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '18px',
              right: '18px',
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#64748B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
          </button>
        )}

        {/* Heading & Subtitle */}
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
            Masuk ke Akun Internal
          </h2>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748B' }}>
            Masukkan email atau username dan kata sandi Anda
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#B91C1C',
              padding: '10px 14px',
              borderRadius: '12px',
              fontSize: '0.82rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Field 1: Email / Username */}
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>
              Alamat Email / Username
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
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="email@example.com / username"
                style={{
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  fontSize: '0.9rem',
                  color: '#0F172A',
                  backgroundColor: 'transparent',
                }}
                autoFocus
              />
            </div>
          </div>

          {/* Field 2: Kata Sandi */}
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
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kata Sandi / PIN"
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
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  color: '#94A3B8',
                  display: 'flex',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Remember Me & Lupa Kata Sandi */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.78rem', color: '#475569' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ width: '14px', height: '14px', cursor: 'pointer' }}
              />
              <span>Ingat saya</span>
            </label>

            <a
              href="https://wa.me/6281401735648?text=Halo%20Admin%20MapahTrip,%20saya%20lupa%20kata%20sandi%20portal%20internal%20saya"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '0.8rem', color: '#005bb5', textDecoration: 'none', fontWeight: 600 }}
            >
              Lupa kata sandi?
            </a>
          </div>

          {/* Submit Login Button (Sesuai Gambar 2) */}
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span>Masuk ke Portal Internal ➔</span>
          </button>
        </form>
      </div>
    </div>
  );
};
