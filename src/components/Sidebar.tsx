import logomark1 from '../assets/logomark_1.png';
import { handleImageFallback, getLogomarkFallbacks } from '../utils/imageFallbacks';
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
  // Deteksi ukuran layar mobile
  const [isMobileScreen, setIsMobileScreen] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 900;
  });

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth <= 900);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Di layar HP / Mobile, navigasi adalah modal drawer yang HARUS selalu terbuka penuh
  // (memiliki logo, tombol tutup ✕, teks menu lengkap, badge angka, dan profil staf).
  // Mode ciut (collapsed icon rail) HANYA untuk layar desktop / laptop.
  const effectiveCollapsed = isMobileScreen ? false : isCollapsed;

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
    <aside className={`sidebar ${effectiveCollapsed ? 'is-collapsed' : ''} ${isMobileScreen && isMobileOpen ? 'is-mobile-open' : ''}`}>
      <div>
        {/* Logo and Brand */}
        <div
          style={{
            height: '72px',
            padding: effectiveCollapsed ? '0' : '0 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: effectiveCollapsed ? 'center' : 'space-between',
            borderBottom: '1px solid rgba(195, 198, 214, 0.25)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
              gap: '12px',
              width: effectiveCollapsed ? '100%' : 'auto',
            }}
          >
            <img
              src={logomark1}
              alt="Logo MapahTrip"
              onError={(e) => handleImageFallback(e, getLogomarkFallbacks())}
              style={{
                width: effectiveCollapsed ? '36px' : '38px',
                height: effectiveCollapsed ? '36px' : '38px',
                objectFit: 'contain',
                flexShrink: 0,
              }}
              title="MapahTrip"
            />

            {!effectiveCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    color: '#0F172A',
                    lineHeight: 1.15,
                  }}
                >
                  MapahTrip
                </span>
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    color: '#0284C7',
                    textTransform: 'uppercase',
                    marginTop: '2px',
                  }}
                >
                  Visa Jepang Specialist
                </span>
              </div>
            )}
          </div>

          {/* Tombol Tutup Sidebar Khusus Layar HP (hidden on desktop) */}
          {!effectiveCollapsed && (
            <button
              type="button"
              className="mobile-sidebar-close"
              onClick={onCloseMobile}
              aria-label="Tutup menu navigasi"
              style={{
                position: 'absolute',
                right: '12px',
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

        {/* Section Heading with Accent Dot (hanya tampil saat menu terbuka) */}
        {!effectiveCollapsed && (
          <div
            style={{
              padding: '16px 18px 8px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.68rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: '#64748B',
              textTransform: 'uppercase',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#F97316',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <span>{isOwner ? 'DASHBOARD UTAMA' : 'MENU OPERASIONAL'}</span>
          </div>
        )}

        {/* Navigation list */}
        <nav
          style={{
            padding: effectiveCollapsed ? '14px 10px' : '6px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: effectiveCollapsed ? '8px' : '6px',
            alignItems: effectiveCollapsed ? 'center' : 'stretch',
          }}
        >
          {menuItems.map((item) => {
            const isActive = activeTab === item.key;

            return (
              <button
                key={item.key}
                onClick={() => handleItemClick(item)}
                title={effectiveCollapsed ? `${item.label}${item.badge !== undefined ? ` (${item.badge})` : ''}` : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: effectiveCollapsed ? 'center' : 'space-between',
                  padding: effectiveCollapsed ? '6px' : '6px 10px',
                  borderRadius: '12px',
                  border: 'none',
                  background: isActive ? '#EFF6FF' : 'transparent',
                  color: isActive ? '#1D4ED8' : '#334155',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease, color 0.15s ease',
                  textAlign: effectiveCollapsed ? 'center' : 'left',
                  width: effectiveCollapsed ? '48px' : '100%',
                  height: '48px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#F8FAFC';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
                    gap: effectiveCollapsed ? 0 : '12px',
                    minWidth: 0,
                    width: effectiveCollapsed ? '100%' : 'auto',
                  }}
                >
                  {/* Rounded icon box matching reference design */}
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isActive ? '#DBEAFE' : '#F1F5F9',
                      color: isActive ? '#1D4ED8' : '#475569',
                      flexShrink: 0,
                      transition: 'background-color 0.15s ease, color 0.15s ease',
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: '20px' }}
                    >
                      {item.icon}
                    </span>
                  </div>

                  {!effectiveCollapsed && (
                    <span
                      style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontSize: '0.875rem',
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? '#1D4ED8' : '#334155',
                      }}
                    >
                      {item.label}
                    </span>
                  )}
                </div>

                {/* Right side: Badge pill OR subtle chevron > */}
                {item.badge !== undefined ? (
                  effectiveCollapsed ? (
                    <span
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        minWidth: '16px',
                        height: '16px',
                        borderRadius: '8px',
                        background: '#2563EB',
                        color: '#FFFFFF',
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
                        background: isActive ? '#2563EB' : '#0284C7',
                        color: '#ffffff',
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                      }}
                    >
                      {item.badge}
                    </span>
                  )
                ) : (
                  !effectiveCollapsed && (
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: '18px',
                        color: isActive ? '#3B82F6' : '#94A3B8',
                        opacity: 0.8,
                      }}
                    >
                      chevron_right
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
          padding: effectiveCollapsed ? '8px 4px' : '12px',
          margin: effectiveCollapsed ? '12px 8px' : '12px',
          borderRadius: '12px',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        {effectiveCollapsed ? (
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
