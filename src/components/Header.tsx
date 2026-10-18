import React from 'react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenNewPengajuan: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenNewPengajuan,
}) => {
  return (
    <header className="top-header">
      <div style={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: '540px' }}>
        <div className="search-box">
          <span className="material-symbols-outlined" style={{ color: 'var(--outline)', fontSize: '20px' }}>
            search
          </span>
          <input
            type="text"
            placeholder="Cari pemohon, nomor paspor, atau kode referal... (Tekan /)"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Konsjen status chip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '9999px',
            background: 'var(--surface-container)',
            color: 'var(--on-surface)',
            fontSize: '0.8rem',
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#00ba88',
              boxShadow: '0 0 0 3px rgba(0, 186, 136, 0.2)',
            }}
          />
          <span>Konsjen Online: 5 Kota</span>
        </div>

        {/* Notifications */}
        <button
          style={{
            position: 'relative',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: 'none',
            background: 'var(--surface-container-low)',
            color: 'var(--on-surface-variant)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title="Notifikasi Operasional"
        >
          <span className="material-symbols-outlined">notifications</span>
          <span
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--error)',
              boxShadow: '0 0 0 2px #fff',
            }}
          />
        </button>

        {/* Action Button */}
        <button className="btn btn-primary" onClick={onOpenNewPengajuan}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            add
          </span>
          <span>Pengajuan</span>
        </button>
      </div>
    </header>
  );
};
