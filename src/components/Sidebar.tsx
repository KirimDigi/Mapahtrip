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
  };

  return (
    <aside className="sidebar">
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

          {isOwner && (
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '9999px',
                background: '#FEF3C7',
                color: '#B45309',
                border: '1px solid #FDE68A',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
              }}
            >
              👑 OWNER
            </span>
          )}
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

      {/* User Profile Bar (Staff vs Owner) */}
      <div
        style={{
          padding: '12px',
          margin: '12px',
          borderRadius: '16px',
          background: isOwner ? 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)' : 'var(--surface-container-low)',
          border: isOwner ? '1px solid #FDE68A' : '1px solid rgba(195, 198, 214, 0.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: isOwner
                  ? 'linear-gradient(135deg, #F59E0B, #B45309)'
                  : 'linear-gradient(135deg, #2b68e0, #004fc0)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: isOwner ? '16px' : '12px',
                flexShrink: 0,
                boxShadow: isOwner ? '0 4px 10px rgba(245, 158, 11, 0.3)' : 'none',
              }}
            >
              {isOwner ? '👑' : (currentStaff?.inisial || 'RM')}
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: isOwner ? '#78350F' : 'var(--on-surface)',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                }}
              >
                {isOwner ? 'Owner MapahTrip' : (currentStaff?.nama || 'Rizky Muhammad')}
              </div>
              <div
                style={{
                  fontSize: '0.7rem',
                  color: isOwner ? '#92400E' : 'var(--on-surface-variant)',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                }}
              >
                {isOwner ? 'Founder & Keuangan' : (currentStaff?.role || 'Staf PIC Lapangan')}
              </div>
            </div>
          </div>

          <div style={{ flexShrink: 0, marginLeft: '6px' }}>
            {/* Tombol Keluar / Logout di Profile */}
            <button
              type="button"
              onClick={onLogout}
              title="Keluar dari Akun (Logout)"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '8px',
                color: '#DC2626',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 8px',
                fontSize: '0.72rem',
                fontWeight: 700,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#EF4444';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                e.currentTarget.style.color = '#DC2626';
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                logout
              </span>
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
