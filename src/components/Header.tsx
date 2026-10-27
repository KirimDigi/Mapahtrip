import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Pengajuan, StaffMaster } from '../types';
import logoHitam from '../assets/mapahtrip_logo_hitam.png';

interface HeaderProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onOpenNewPengajuan: () => void;
  pengajuanList?: Pengajuan[];
  onSelectPengajuan?: (id: string) => void;
  onNavigateToPengajuan?: (statusTab?: string) => void;
  isOwner?: boolean;
  currentStaff?: StaffMaster | null;
  activeTab?: string;
  onToggleMobileMenu?: () => void;
}

interface NotificationItem {
  id: string;
  pengajuanId: string;
  type: 'new_registration' | 'action_needed' | 'ready_pickup';
  title: string;
  subtitle: string;
  time: string;
  pengajuan: Pengajuan;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewPengajuan,
  pengajuanList = [],
  onSelectPengajuan,
  onNavigateToPengajuan,
  isOwner = false,
  currentStaff = null,
  activeTab = 'dashboard',
  onToggleMobileMenu,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<'all' | 'new' | 'action'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ID notifikasi yang sudah dibaca oleh staf/owner
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('mapahtrip_staff_read_notifs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const saveReadNotifIds = (ids: string[]) => {
    setReadNotifIds(ids);
    try {
      localStorage.setItem('mapahtrip_staff_read_notifs', JSON.stringify(ids));
    } catch {}
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Filter daftar pengajuan berdasarkan wilayah tugas staf jika bukan owner
  const effectivePengajuanList = useMemo(() => {
    if (isOwner || !currentStaff?.konsjenTugas || currentStaff.konsjenTugas.length === 0) {
      return pengajuanList;
    }
    return pengajuanList.filter((p) => currentStaff.konsjenTugas.includes(p.konsjen));
  }, [pengajuanList, isOwner, currentStaff]);

  // Generate daftar notifikasi aktif
  const notifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [];

    effectivePengajuanList.forEach((p) => {
      const isSampai = Boolean(p.tglBerkasMasuk && p.tglBerkasMasuk !== '-');
      const isProses = Boolean(p.tglApply && p.tglApply !== '-');
      const isSelesai = Boolean(p.tglSelesai && p.tglSelesai !== '-');
      const isKirim = Boolean((p.tglKirim && p.tglKirim !== '-') || (p.noResi && p.noResi !== '-'));

      if (p.status === 'Ditolak' || isKirim) return;

      // 1. Pendaftaran Baru (Belum Sampai)
      if (!isSampai && !isProses && !isSelesai) {
        items.push({
          id: `new-${p.id}`,
          pengajuanId: p.id,
          type: 'new_registration',
          title: `Pendaftaran Baru: ${p.namaPemohon}`,
          subtitle: `${p.paket} • Konsjen ${p.konsjen} • Menunggu verifikasi berkas staf`,
          time: 'Baru Masuk',
          pengajuan: p,
        });
      }
      // 2. Berkas Sampai di Kantor (Perlu Di-apply ke JVAC)
      else if (isSampai && !isProses && !isSelesai) {
        items.push({
          id: `arrived-${p.id}`,
          pengajuanId: p.id,
          type: 'action_needed',
          title: `Berkas Tiba: ${p.namaPemohon}`,
          subtitle: `Paspor fisik tiba di kantor. Siap apply ke Konsulat ${p.konsjen}`,
          time: p.tglBerkasMasuk || 'Hari ini',
          pengajuan: p,
        });
      }
      // 3. Sedang Diproses di JVAC / Konsulat
      else if (isProses && !isSelesai) {
        items.push({
          id: `apply-${p.id}`,
          pengajuanId: p.id,
          type: 'action_needed',
          title: `Proses JVAC: ${p.namaPemohon}`,
          subtitle: `Sedang proses verifikasi di Konsulat ${p.konsjen}`,
          time: p.tglApply || 'Hari ini',
          pengajuan: p,
        });
      }
      // 4. Visa Terbit / Siap Ambil & Kirim
      else if (isSelesai) {
        items.push({
          id: `pickup-${p.id}`,
          pengajuanId: p.id,
          type: 'ready_pickup',
          title: `Visa Terbit: ${p.namaPemohon}`,
          subtitle: `Stiker visa sudah terpasang. Siap dikirim ke pemohon`,
          time: p.tglSelesai || 'Tersedia',
          pengajuan: p,
        });
      }
    });

    return items;
  }, [effectivePengajuanList]);

  // Jumlah unread
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !readNotifIds.includes(n.id)).length;
  }, [notifications, readNotifIds]);

  // Filter notifikasi sesuai tab aktif
  const filteredNotifications = useMemo(() => {
    if (filterType === 'new') {
      return notifications.filter((n) => n.type === 'new_registration');
    }
    if (filterType === 'action') {
      return notifications.filter((n) => n.type === 'action_needed' || n.type === 'ready_pickup');
    }
    return notifications;
  }, [notifications, filterType]);

  const handleMarkAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    saveReadNotifIds(Array.from(new Set([...readNotifIds, ...allIds])));
  };

  const handleNotificationClick = (item: NotificationItem) => {
    if (!readNotifIds.includes(item.id)) {
      saveReadNotifIds([...readNotifIds, item.id]);
    }
    setIsDropdownOpen(false);
    onNavigateToPengajuan?.('Semua');
    onSelectPengajuan?.(item.pengajuanId);
  };

  return (
    <header className="top-header">
      {/* Sisi Kiri: Tombol Menu Hamburger & Brand Logo Khusus Mobile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={onToggleMobileMenu}
          title="Buka Menu Navigasi"
          aria-label="Buka Menu Navigasi"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
            menu
          </span>
        </button>

        <div className="mobile-header-brand">
          <img
            src={logoHitam}
            alt="Logo MapahTrip"
            style={{ width: '28px', height: '28px', objectFit: 'contain' }}
          />
          <span
            className="font-serif"
            style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--on-surface)' }}
          >
            MapahTrip
          </span>
        </div>
      </div>

      {/* Spacer Tengah */}
      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Action Button: Input Pemohon Baru (Hanya tampil di Dashboard & Pengajuan) */}
        {(activeTab === 'dashboard' || activeTab === 'pengajuan') && (
          <button
            className="btn btn-primary"
            onClick={onOpenNewPengajuan}
            title="Buka form input data pemohon visa baru"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              person_add
            </span>
            <span className="header-new-btn-text">Input Pemohon Baru</span>
          </button>
        )}

        {/* Notifications (Pojok Kanan) */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            style={{
              position: 'relative',
              background: 'transparent',
              border: 'none',
              padding: '6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              outline: 'none',
              boxShadow: 'none',
              color: unreadCount > 0 ? '#1E293B' : '#64748B',
            }}
            title={unreadCount > 0 ? `${unreadCount} Notifikasi Belum Dibaca` : 'Notifikasi Operasional'}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: '24px',
                color: unreadCount > 0 ? '#2563EB' : '#475569',
                display: 'block',
              }}
            >
              {unreadCount > 0 ? 'notifications_active' : 'notifications'}
            </span>

            {/* Badge Angka Merah HANYA jika ada notifikasi belum dibaca */}
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  minWidth: '18px',
                  height: '18px',
                  borderRadius: '9px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)',
                  lineHeight: 1,
                  padding: '0 4px',
                  boxSizing: 'border-box',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown Pop-up Notifikasi */}
          {isDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                right: 0,
                width: '380px',
                maxWidth: '92vw',
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.12)',
                zIndex: 1000,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Header Dropdown */}
              <div
                style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid #F1F5F9',
                  backgroundColor: '#F8FAFC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#2563EB' }}>
                    notifications
                  </span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0F172A' }}>
                      Notifikasi Staf
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.70rem', color: '#64748B' }}>
                      {unreadCount > 0 ? `${unreadCount} aktivitas butuh tindakan` : 'Semua sudah dibaca'}
                    </p>
                  </div>
                </div>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563EB',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '6px',
                    }}
                    title="Tandai semua sebagai sudah dibaca"
                  >
                    Tandai dibaca
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  padding: '8px 14px',
                  borderBottom: '1px solid #F1F5F9',
                  backgroundColor: '#FFFFFF',
                }}
              >
                {[
                  { id: 'all', label: `Semua (${notifications.length})` },
                  { id: 'new', label: `Pendaftaran Baru (${notifications.filter((n) => n.type === 'new_registration').length})` },
                  { id: 'action', label: `Perlu Tindakan (${notifications.filter((n) => n.type !== 'new_registration').length})` },
                ].map((t) => {
                  const isActive = filterType === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFilterType(t.id as 'all' | 'new' | 'action')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        border: 'none',
                        backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                        color: isActive ? '#1D4ED8' : '#64748B',
                        fontSize: '0.72rem',
                        fontWeight: isActive ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* Notification List */}
              <div
                style={{
                  maxHeight: '340px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {filteredNotifications.length === 0 ? (
                  <div style={{ padding: '36px 16px', textAlign: 'center', color: '#64748B' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#10B981', marginBottom: '6px' }}>
                      check_circle
                    </span>
                    <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#0F172A' }}>
                      Tidak Ada Notifikasi
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '0.74rem' }}>
                      Belum ada pendaftaran baru atau tindakan yang tertunda.
                    </p>
                  </div>
                ) : (
                  filteredNotifications.map((notif) => {
                    const isUnread = !readNotifIds.includes(notif.id);
                    const isNew = notif.type === 'new_registration';
                    const isApply = notif.type === 'action_needed';

                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        style={{
                          padding: '12px 14px',
                          borderBottom: '1px solid #F1F5F9',
                          backgroundColor: isUnread ? '#F0F9FF' : '#FFFFFF',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isUnread ? '#E0F2FE' : '#F8FAFC';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = isUnread ? '#F0F9FF' : '#FFFFFF';
                        }}
                      >
                        {/* Icon Tipe */}
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: isNew ? '#FEF3C7' : isApply ? '#EFF6FF' : '#F0FDF4',
                            color: isNew ? '#B45309' : isApply ? '#2563EB' : '#15803D',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: '2px',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                            {isNew ? 'person_add' : isApply ? 'send' : 'task_alt'}
                          </span>
                        </div>

                        {/* Konten Notifikasi */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            <span
                              style={{
                                fontSize: '0.80rem',
                                fontWeight: isUnread ? 800 : 700,
                                color: '#0F172A',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {notif.title}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: '#94A3B8', flexShrink: 0 }}>
                              {notif.time}
                            </span>
                          </div>

                          <p
                            style={{
                              margin: '2px 0 0',
                              fontSize: '0.72rem',
                              color: '#64748B',
                              lineHeight: 1.35,
                            }}
                          >
                            {notif.subtitle}
                          </p>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                            <span
                              style={{
                                fontSize: '0.66rem',
                                fontWeight: 700,
                                padding: '1px 7px',
                                borderRadius: '9999px',
                                backgroundColor: isNew ? '#FEF3C7' : isApply ? '#EFF6FF' : '#DCFCE7',
                                color: isNew ? '#92400E' : isApply ? '#1E40AF' : '#166534',
                              }}
                            >
                              {notif.pengajuan.status}
                            </span>
                            <span style={{ fontSize: '0.66rem', color: '#94A3B8' }}>
                              Klik untuk buka berkas →
                            </span>
                          </div>
                        </div>

                        {/* Dot Indikator Unread */}
                        {isUnread && (
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: '#2563EB',
                              flexShrink: 0,
                              marginTop: '6px',
                            }}
                            title="Belum dibaca"
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer Dropdown */}
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#F8FAFC',
                  borderTop: '1px solid #F1F5F9',
                  textAlign: 'center',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onNavigateToPengajuan?.('Semua');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563EB',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>Buka Semua Pengajuan ({effectivePengajuanList.length})</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                    arrow_forward
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
