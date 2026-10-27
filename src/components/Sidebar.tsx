import logoHitam from '../assets/mapahtrip_logo_hitam.png';
import React from 'react';
import type { StaffMaster } from '../types';

export type NavItemKey =
  | 'dashboard'
  | 'pengajuan'
  | 'keuangan'
  | 'rekap'
  | 'affiliate'
  | 'pengaturan';

interface SidebarProps {
  activeTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  totalPengajuanCount?: number;
  totalAffiliateCount?: number;
  isOwner?: boolean;
  currentStaff?: StaffMaster | null;
  onRequestOwnerLogin?: () => void;
  onLogout?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  totalPengajuanCount = 223,
  totalAffiliateCount = 62,
  isOwner = false,
  currentStaff = null,
  onRequestOwnerLogin,
  onLogout,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const allMenuItems: {
    key: NavItemKey;
    label: string;
    icon: string;
    badge?: number | string;
    isOwnerOnly?: boolean;
  }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { key: 'pengajuan', label: 'Pengajuan', icon: 'description', badge: totalPengajuanCount },
    { key: 'keuangan', label: 'Keuangan', icon: 'account_balance_wallet', isOwnerOnly: true },
    { key: 'rekap', label: 'Rekap', icon: 'bar_chart', isOwnerOnly: true },
    { key: 'affiliate', label: 'Affiliate', icon: 'group', badge: totalAffiliateCount },
    { key: 'pengaturan', label: 'Pengaturan', icon: 'settings' },
  ];

  // Completely hide Keuangan & Rekap when in Staff mode so staff cannot see or click them
  const menuItems = allMenuItems.filter((item) => !item.isOwnerOnly || isOwner);

  const handleItemClick = (item: (typeof menuItems)[0]) => {
    if (item.isOwnerOnly && !isOwner) {
      if (onRequestOwnerLogin) {
        onRequestOwnerLogin();
      }
      return;
    }
    onSelectTab(item.key);
    onCloseMobile?.();
  };

  return (
    <aside className={`sidebar ${isMobileOpen ? 'is-mobile-open' : ''}`}>
      <div>
        {/* Logo and Brand */}
        <div
          style={{
            height: '68px',
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(195, 198, 214, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src={logoHitam}
              alt="Logo MapahTrip"
              style={{
                width: '34px',
                height: '34px',
                objectFit: 'contain',
              }}
            />
            <span
              className="font-serif"
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: 'var(--on-surface)',
              }}
            >
              MapahTrip
            </span>
          </div>

          {/* Tombol Tutup Sidebar Khusus Layar HP (hidden on desktop) */}
          <button
            type="button"
            className="mobile-sidebar-close"
            onClick={onCloseMobile}
            aria-label="Tutup menu navigasi"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              color: '#64748B',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
              close
            </span>
          </button>
        </div>

        {/* Navigation list */}
        <nav style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {menuItems.map((item) => {
            const isActive = activeTab === item.key;

            return (
              <button
                key={item.key}
                onClick={() => handleItemClick(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: isActive ? 'var(--primary-container)' : 'transparent',
                  color: isActive ? 'var(--on-primary)' : 'var(--on-surface-variant)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--surface-container)';
                    e.currentTarget.style.color = 'var(--on-surface)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--on-surface-variant)';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'var(--secondary)',
                      color: '#ffffff',
                      fontSize: '0.725rem',
                      fontWeight: 700,
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Profile Bar (Staff vs Owner) - Format Senada dengan Affiliate */}
      <div
        style={{
          padding: '12px',
          margin: '12px',
          borderRadius: '12px',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, overflow: 'hidden' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: '#0F172A',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.78rem',
                flexShrink: 0,
              }}
            >
              {isOwner ? 'AD' : (currentStaff?.inisial || 'RZ')}
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <strong
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#0F172A',
                  display: 'block',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                }}
              >
                {isOwner ? 'Administrator' : (currentStaff?.nama || 'Rizky')}
              </strong>
              <span
                style={{
                  fontSize: '0.7rem',
                  color: '#64748B',
                  display: 'block',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                }}
              >
                {isOwner ? 'MapahTrip Official' : (currentStaff?.role || 'Staff PIC Jakarta')}
              </span>
            </div>
          </div>

          {/* Tombol Keluar / Logout Bersih & Minimalis seperti Affiliate */}
          <button
            type="button"
            onClick={() => {
              onCloseMobile?.();
              onLogout?.();
            }}
            title="Keluar dari Akun"
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#DC2626';
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#94A3B8';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              logout
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
};
