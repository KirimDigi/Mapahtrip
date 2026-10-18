import React, { useState, useEffect } from 'react';
import splashImg from '../assets/mapahtrip_logo_putih_hitam.png';

export const SplashScreen: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Kunci scroll saat splash screen aktif agar halaman tidak bisa di-scroll ke bawah
  useEffect(() => {
    window.scrollTo(0, 0);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow || 'unset';
    };
  }, []);

  useEffect(() => {
    // Total durasi membaca santai ~5.5 detik: 4.8 detik progress + 600ms pause di 100%
    const totalDuration = 4800;
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentProgress = Math.min(100, Math.round((elapsed / totalDuration) * 100));
      setProgress(currentProgress);

      if (currentProgress >= 100) {
        clearInterval(interval);
      }
    }, 25);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      // Tahan di 100% selama 600ms agar terbaca penuh, lalu mulai fade out
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
        document.body.style.overflow = 'unset';
      }, 600);

      // Sembunyikan dari layar setelah animasi fade out selesai (500ms)
      const removeTimer = setTimeout(() => {
        setIsVisible(false);
      }, 1100);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(removeTimer);
      };
    }
  }, [progress]);

  const handleSkip = () => {
    document.body.style.overflow = 'unset';
    setIsFadingOut(true);
    setTimeout(() => setIsVisible(false), 300);
  };

  if (!isVisible) return null;

  return (
    <div
      onClick={handleSkip}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        opacity: isFadingOut ? 0 : 1,
        pointerEvents: isFadingOut ? 'none' : 'auto',
        transform: isFadingOut ? 'scale(1.02)' : 'scale(1)',
        transition: 'opacity 0.45s ease-out, transform 0.45s ease-out',
        cursor: 'pointer',
        userSelect: 'none',
      }}
      title="Klik untuk melewati (skip)"
    >
      {/* Background Soft Ambient Blobs */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          right: '-5%',
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 163, 255, 0.08) 0%, rgba(255, 255, 255, 0) 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-5%',
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(2, 132, 199, 0.08) 0%, rgba(255, 255, 255, 0) 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Main Content Container */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          maxWidth: '520px',
          width: '100%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Splash Image Container - Menggunakan mapahtrip_logo_putih_hitam */}
        <div
          style={{
            width: '180px',
            height: '180px',
            maxWidth: '46vw',
            maxHeight: '46vw',
            borderRadius: '32px',
            backgroundColor: '#ffffff',
            border: '1.5px solid #F1F5F9',
            boxShadow: '0 20px 50px -10px rgba(0, 119, 246, 0.2), 0 8px 24px rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            overflow: 'hidden',
            padding: '16px',
          }}
        >
          <img
            src={splashImg}
            alt="Logo Mapahtrip.id"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>

        {/* Small Japanese Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 14px',
            borderRadius: '9999px',
            background: '#e0f2fe',
            border: '1px solid #bae6fd',
            color: '#0284c7',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            marginBottom: '14px',
          }}
        >
          <span>⛩️</span>
          <span>MAPAHTRIP.ID • JAPAN VISA ONLY</span>
          <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#0284c7' }}>
            verified
          </span>
        </div>

        {/* Headline */}
        <h1
          className="font-serif"
          style={{
            fontFamily: "'Source Serif 4', Georgia, serif",
            fontSize: 'clamp(1.6rem, 3.8vw, 2.3rem)',
            fontWeight: 800,
            color: '#0B1220',
            lineHeight: 1.18,
            letterSpacing: '-0.025em',
            margin: '0 0 10px',
          }}
        >
          Daftar Visa Jepang <br />
          <span style={{ color: '#0090FF' }}>Simpel, Mudah &amp; Cepat</span>
        </h1>

        {/* Description / Kalimat Singkat, Padat & Jelas */}
        <p
          style={{
            fontSize: '0.92rem',
            color: '#475569',
            lineHeight: 1.5,
            maxWidth: '380px',
            margin: '0 0 22px',
          }}
        >
          Layanan pengurusan visa Jepang resmi. Dokumen &amp; itinerary kami siapkan, kamu tinggal terima jadi.
        </p>

        {/* Progress Bar Container (Durasi 3 Detik) */}
        <div
          style={{
            width: '100%',
            maxWidth: '260px',
            height: '6px',
            borderRadius: '9999px',
            backgroundColor: '#E2E8F0',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              borderRadius: '9999px',
              background: 'linear-gradient(90deg, #00A3FF 0%, #0077F6 100%)',
              transition: 'width 0.04s linear',
            }}
          />
        </div>

        {/* Progress text & Skip hint */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            maxWidth: '260px',
            marginTop: '10px',
            fontSize: '0.72rem',
            color: '#94A3B8',
          }}
        >
          <span>Memuat data...</span>
          <span style={{ fontWeight: 700, color: '#0284c7' }}>{progress}%</span>
        </div>

        {/* Quick Skip button */}
        <button
          type="button"
          onClick={handleSkip}
          style={{
            marginTop: '22px',
            background: 'none',
            border: 'none',
            color: '#94A3B8',
            fontSize: '0.78rem',
            cursor: 'pointer',
            padding: '6px 12px',
            borderRadius: '9999px',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#0F172A')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
        >
          Lewati &rarr;
        </button>
      </div>
    </div>
  );
};
