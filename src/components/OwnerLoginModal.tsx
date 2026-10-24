import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface OwnerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
  onBackToHome?: () => void;
}

export const OwnerLoginModal: React.FC<OwnerLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onBackToHome,
}) => {
  const [identifier, setIdentifier] = useState('owner@mapahtrip.id');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const idClean = identifier.trim().toLowerCase();
    const passClean = password.trim();

    if (!idClean) {
      setErrorMsg('Masukkan email atau username owner.');
      return;
    }
    if (!passClean) {
      setErrorMsg('Masukkan kata sandi atau PIN Anda.');
      return;
    }

    setIsLoading(true);

    // 1. Cek langsung ke database Supabase Cloud (tabel mitra_affiliate)
    try {
      const { data: ownerUser } = await supabase
        .from('mitra_affiliate')
        .select('*')
        .eq('email', idClean)
        .eq('password', passClean)
        .maybeSingle();

      if (ownerUser && (ownerUser.status_mitra === 'Owner' || idClean.includes('owner'))) {
        if (rememberMe) {
          localStorage.setItem('mapahtrip_owner_auth', 'true');
        }
        setIsLoading(false);
        onLoginSuccess();
        onClose();
        return;
      }
    } catch (err) {
      console.warn('Supabase auth fallback:', err);
    }

    // 2. Fallback kredensial lokal resmi
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

    setIsLoading(false);

    if (isOwnerUser && isOwnerPass) {
      if (rememberMe) {
        localStorage.setItem('mapahtrip_owner_auth', 'true');
      }
      onLoginSuccess();
      onClose();
      return;
    }

    setErrorMsg('Email/Username atau Kata Sandi salah. Periksa kembali akun Anda.');
  };

  const handleBack = () => {
    if (onBackToHome) {
      onBackToHome();
    } else {
      window.location.hash = '';
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: '#F8FAFC',
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
    >
      {/* Top Bar Navigation (Sesuai Gambar Persis) */}
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
          onClick={handleBack}
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
          PORTAL OWNER 👑
        </span>
      </div>

      {/* Card Container (Clean white card sesuai Gambar Persis) */}
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
            Masuk ke Akun Owner
          </h2>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748B' }}>
            Khusus pemilik usaha &amp; pengelola utama MapahTrip
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
                placeholder="owner@mapahtrip.id"
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
                placeholder="Kata sandi / PIN"
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
              href="https://wa.me/6281401735648?text=Halo%20Admin%20MapahTrip,%20saya%20lupa%20kata%20sandi%20portal%20owner"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '0.78rem', color: '#005BB5', textDecoration: 'none', fontWeight: 600 }}
            >
              Lupa kata sandi?
            </a>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: isLoading ? '#64748B' : '#005BB5',
              color: '#FFFFFF',
              fontSize: '0.92rem',
              fontWeight: 700,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(0, 91, 181, 0.25)',
              transition: 'all 0.2s ease',
              marginTop: '4px',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) e.currentTarget.style.backgroundColor = '#00478F';
            }}
            onMouseLeave={(e) => {
              if (!isLoading) e.currentTarget.style.backgroundColor = '#005BB5';
            }}
          >
            <span>{isLoading ? 'Memverifikasi...' : 'Masuk ke Portal Owner ➔'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
