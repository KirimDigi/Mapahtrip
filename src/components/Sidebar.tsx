import React from 'react';

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
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  totalPengajuanCount = 223,
  totalAffiliateCount = 62,
}) => {
  const menuItems: {
    key: NavItemKey;
    label: string;
    icon: string;
    badge?: number | string;
  }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { key: 'pengajuan', label: 'Pengajuan', icon: 'description', badge: totalPengajuanCount },
    { key: 'keuangan', label: 'Keuangan', icon: 'account_balance_wallet' },
    { key: 'rekap', label: 'Rekap', icon: 'bar_chart' },
    { key: 'affiliate', label: 'Affiliate', icon: 'group', badge: totalAffiliateCount },
    { key: 'pengaturan', label: 'Pengaturan', icon: 'settings' },
  ];

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
              src="/mapahtrip_logo_hitam.png"
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
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '9999px',
              background: 'var(--surface-container)',
              color: 'var(--on-surface-variant)',
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Admin Ops
          </span>
        </div>

        {/* Navigation list */}
        <nav style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {menuItems.map((item) => {
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onSelectTab(item.key)}
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

      {/* Staff profile bar */}
      <div
        style={{
          padding: '12px',
          margin: '12px',
          borderRadius: '16px',
          background: 'var(--surface-container-low)',
          border: '1px solid rgba(195, 198, 214, 0.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2b68e0, #004fc0)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '13px',
                flexShrink: 0,
              }}
            >
              RM
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--on-surface)',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                }}
              >
                Rizky Muhammad
              </div>
              <div
                style={{
                  fontSize: '0.725rem',
                  color: 'var(--on-surface-variant)',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                }}
              >
                Staff PIC Jakarta &amp; Medan
              </div>
            </div>
          </div>
          <button
            title="Keluar"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--on-surface-variant)',
              cursor: 'pointer',
              display: 'flex',
              padding: '4px',
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
