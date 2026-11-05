import logoHitam from '../assets/mapahtrip_logo_hitam.png';
import { handleImageFallback, getLogoHitamFallbacks } from '../utils/imageFallbacks';
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
  isCollapsed?: boolean;
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
  isCollapsed = false,
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
    <aside className={`sidebar ${isCollapsed ? 'is-collapsed' : ''} ${isMobileOpen ? 'is-mobile-open' : ''}`}>
      <div>
        {/* Logo and Brand */}
        <div
          style={{
            height: '68px',
            padding: isCollapsed ? '0' : '0 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            borderBottom: '1px solid rgba(195, 198, 214, 0.25)',
            transition: 'all 0.2s ease',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              gap: '10px',
              width: isCollapsed ? '100%' : 'auto',
            }}
          >
            <img
              src={logoHitam}
              alt="Logo MapahTrip"
              onError={(e) => handleImageFallback(e, getLogoHitamFallbacks())}
              style={{
                width: '34px',
                height: '34px',
                objectFit: 'contain',
                flexShrink: 0,
              }}
              title="MapahTrip"
            />
            {!isCollapsed && (
              <span
                className="font-serif"
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  color: 'var(--on-surface)',
                  whiteSpace: 'nowrap',
                }}
              >
                MapahTrip
              </span>
            )}
          </div>

          {/* Tombol Tutup Sidebar Khusus Layar HP (hidden on desktop) */}
          {!isCollapsed && (
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
          )}
        </div>

        {/* Navigation list */}
        <nav
          style={{
            padding: isCollapsed ? '14px 10px' : '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: isCollapsed ? '8px' : '4px',
            alignItems: isCollapsed ? 'center' : 'stretch',
          }}
        >
          {menuItems.map((item) => {
            const isActive = activeTab === item.key;

            return (
              <button
                key={item.key}
                onClick={() => handleItemClick(item)}
                title={isCollapsed ? `${item.label}${item.badge !== undefined ? ` (${item.badge})` : ''}` : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isCollapsed ? 'center' : 'space-between',
                  padding: isCollapsed ? '10px' : '10px 16px',
                  borderRadius: isCollapsed ? '12px' : '9999px',
                  border: 'none',
                  background: isActive ? 'var(--primary-container)' : 'transparent',
                  color: isActive ? 'var(--on-primary)' : 'var(--on-surface-variant)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: isCollapsed ? 'center' : 'left',
                  width: isCollapsed ? '48px' : '100%',
                  height: isCollapsed ? '48px' : 'auto',
                  position: 'relative',
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
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    gap: isCollapsed ? 0 : '12px',
                    minWidth: 0,
                    width: isCollapsed ? '100%' : 'auto',
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: isCollapsed ? '22px' : '20px',
                      width: '22px',
                      height: '22px',
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </span>
                  {!isCollapsed && (
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.label}
                    </span>
                  )}
                </div>

                {item.badge !== undefined && (
                  isCollapsed ? (
                    <span
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        minWidth: '16px',
                        height: '16px',
                        borderRadius: '8px',
                        background: isActive ? '#FFFFFF' : 'var(--secondary)',
                        color: isActive ? 'var(--primary-container)' : '#FFFFFF',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 3px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        lineHeight: 1,
                      }}
                    >
                      {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
                    </span>
                  ) : (
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
                  )
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Profile Bar (Staff vs Owner) */}
      <div
        style={{
          padding: isCollapsed ? '8px 4px' : '12px',
          margin: isCollapsed ? '12px 8px' : '12px',
          borderRadius: '12px',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        {isCollapsed ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#0F172A',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.78rem',
                flexShrink: 0,
                cursor: 'pointer',
              }}
              title={
                isOwner
                  ? 'Administrator (MapahTrip Official)'
                  : `${currentStaff?.nama || 'Rizky'} (${currentStaff?.role || 'Staff PIC'})`
              }
            >
              {isOwner ? 'AD' : (currentStaff?.inisial || 'RZ')}
            </div>

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
                width: '32px',
                height: '32px',
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
        ) : (
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
        )}
      </div>
    </aside>
  );
};
