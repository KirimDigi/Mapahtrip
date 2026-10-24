import { useState, useEffect } from 'react';
import type { NavItemKey } from './components/Sidebar';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { PengajuanView } from './components/PengajuanView';
import { DetailPengajuanView } from './components/DetailPengajuanView';
import { KeuanganView } from './components/KeuanganView';
import { RekapView } from './components/RekapView';
import { AffiliateView } from './components/AffiliateView';
import { PengaturanView } from './components/PengaturanView';
import { NewPengajuanModal } from './components/NewPengajuanModal';
import { CustomerHome } from './components/CustomerHome';
import { AffiliatePortal } from './components/AffiliatePortal';
import { SplashScreen } from './components/SplashScreen';
import { AdminLoginModal } from './components/AdminLoginModal';
import { OwnerLoginModal } from './components/OwnerLoginModal';
import { mockPengajuan, mockStaff } from './data/mockData';
import type { Pengajuan, StatusPengajuan, StaffMaster } from './types';
import { fetchAllPengajuanFromDB, supabase } from './lib/supabase';

export type AppMode = 'customer' | 'affiliate' | 'staff' | 'owner';

export function App() {
  // Check if owner is already authenticated in localStorage
  const [isOwnerAuth, setIsOwnerAuth] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('mapahtrip_owner_auth') === 'true';
  });

  const [isOwnerLoginOpen, setIsOwnerLoginOpen] = useState<boolean>(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState<boolean>(false);

  // Daftar Master Akun Staf (Bisa dikelola & dibuat oleh Owner)
  const [staffList, setStaffList] = useState<StaffMaster[]>(() => {
    if (typeof window === 'undefined') return mockStaff;
    try {
      const saved = localStorage.getItem('mapahtrip_staff_list');
      if (saved) return JSON.parse(saved);
    } catch {}
    return mockStaff;
  });

  const handleUpdateStaffList = (newList: StaffMaster[]) => {
    setStaffList(newList);
    try {
      localStorage.setItem('mapahtrip_staff_list', JSON.stringify(newList));
    } catch {}
  };

    // Sesi Staf yang sedang aktif login (Wajib login sebelum masuk dashboard)
  const [currentStaff, setCurrentStaff] = useState<StaffMaster | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const savedId = localStorage.getItem('mapahtrip_staff_session');
      if (savedId) {
        const found = mockStaff.find((s) => s.id === savedId);
        if (found) return found;
      }
    } catch {}
    return null;
  });

  const handleLoginAsOwner = () => {
    setIsOwnerAuth(true);
    localStorage.setItem('mapahtrip_owner_auth', 'true');
    setCurrentMode('owner');
    window.location.hash = '#owner';
    setIsAdminLoginOpen(false);
  };

  const handleLoginAsStaff = (staf: StaffMaster) => {
    setCurrentStaff(staf);
    localStorage.setItem('mapahtrip_staff_session', staf.id);
    setIsOwnerAuth(false);
    localStorage.removeItem('mapahtrip_owner_auth');
    setCurrentMode('staff');
    window.location.hash = '#staff';
    setIsAdminLoginOpen(false);
  };

  // Check URL to determine mode:
  // 1. customer: '/' (default)
  // 2. affiliate: '#affiliate' or '#mitra'
  // 3. staff: '#staff' or '#ops' or '#admin'
  // 4. owner: '#owner' (private access for business owner only)
  const getModeFromUrl = (): AppMode => {
    if (typeof window === 'undefined') return 'customer';
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();
    const path = window.location.pathname.toLowerCase();

    if (hash === '#owner' || search.includes('owner') || path.endsWith('/owner')) {
      return 'owner';
    }

    if (
      hash === '#staff' ||
      hash === '#/staff' ||
      hash === '#ops' ||
      hash === '#admin' ||
      hash === '#/admin' ||
      search.includes('staff') ||
      search.includes('admin') ||
      path.endsWith('/admin')
    ) {
      return 'staff';
    }

    if (
      hash.startsWith('#affiliate') ||
      hash.startsWith('#/affiliate') ||
      hash.startsWith('#mitra') ||
      hash.startsWith('#/mitra') ||
      search.includes('affiliate') ||
      search.includes('mitra')
    ) {
      return 'affiliate';
    }

    return 'customer';
  };

  const [currentMode, setCurrentMode] = useState<AppMode>(() => getModeFromUrl());

  useEffect(() => {
    const handleUrlChange = () => {
      const mode = getModeFromUrl();
      setCurrentMode(mode);
      if (mode === 'owner' && !isOwnerAuth) {
        setIsOwnerLoginOpen(true);
      }
    };
    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, [isOwnerAuth]);

  // If initial load was #owner and not yet authenticated, trigger login modal
  useEffect(() => {
    if (currentMode === 'owner' && !isOwnerAuth) {
      setIsOwnerLoginOpen(true);
    }
  }, []);

  const [activeTab, setActiveTab] = useState<NavItemKey>('dashboard');
  // Helper memuat pendaftaran lokal yang tersimpan dan menggabungkannya dengan data awal
  const getInitialPengajuanList = (): Pengajuan[] => {
    let localList: Pengajuan[] = [];
    try {
      const raw = localStorage.getItem('mapahtrip_local_registrations');
      if (raw) {
        localList = JSON.parse(raw);
      }
    } catch {}

    const map = new Map<string, Pengajuan>();
    // Prioritaskan pemohon pendaftar baru agar langsung muncul paling atas
    localList.forEach((p) => map.set(p.id, p));
    mockPengajuan.forEach((p) => {
      if (!map.has(p.id)) {
        map.set(p.id, p);
      }
    });

    return Array.from(map.values());
  };

  const [selectedPengajuanId, setSelectedPengajuanId] = useState<string | null>(null);
  const [pengajuanList, setPengajuanList] = useState<Pengajuan[]>(() => getInitialPengajuanList());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Dengarkan event storage agar saat pemohon mendaftar di tab pelanggan, tab staf & mitra langsung terupdate otomatis
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const raw = localStorage.getItem('mapahtrip_local_registrations');
        if (raw) {
          const locals: Pengajuan[] = JSON.parse(raw);
          setPengajuanList((prev) => {
            const map = new Map<string, Pengajuan>();
            locals.forEach((p) => map.set(p.id, p));
            prev.forEach((p) => {
              if (!map.has(p.id)) map.set(p.id, p);
            });
            return Array.from(map.values());
          });
        }
      } catch {}
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Load live data from Supabase Cloud on mount
  useEffect(() => {
    async function loadData() {
      try {
        const liveData = await fetchAllPengajuanFromDB();
        if (liveData && liveData.length > 0) {
          setPengajuanList(liveData);
          console.log(`[Supabase] Loaded ${liveData.length} records into MapahTrip.`);
        }
      } catch (err) {
        console.warn('Fallback to local mock data:', err);
      }
    }
    loadData();
  }, []);

  const handleSelectTab = (tab: NavItemKey) => {
    // If selecting financial tab and not authenticated as owner, block it
    if ((tab === 'keuangan' || tab === 'rekap') && (!isOwnerAuth || currentMode !== 'owner')) {
      setActiveTab('dashboard');
      return;
    }
    setActiveTab(tab);
    setSelectedPengajuanId(null);
  };

  const handleSelectPengajuan = (id: string) => {
    setSelectedPengajuanId(id);
    setActiveTab('pengajuan');
  };

  const handleBackFromDetail = () => {
    setSelectedPengajuanId(null);
  };

  const handleUpdateStatus = async (id: string, newStatus: Pengajuan['status']) => {
    setPengajuanList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
    // Sync update to Supabase
    try {
      await supabase
        .from('pengajuan_visa')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
    } catch (err) {
      console.error('Failed to sync status update to Supabase:', err);
    }
  };

  const handleAddNewPengajuan = async (newItem: Pengajuan) => {
    setPengajuanList((prev) => {
      const exists = prev.some((p) => p.id === newItem.id);
      if (exists) return prev;
      return [newItem, ...prev];
    });

    // Simpan ke localStorage agar data tidak hilang saat navigasi/reload
    try {
      const raw = localStorage.getItem('mapahtrip_local_registrations');
      const list: Pengajuan[] = raw ? JSON.parse(raw) : [];
      if (!list.some((p) => p.id === newItem.id)) {
        list.unshift(newItem);
        localStorage.setItem('mapahtrip_local_registrations', JSON.stringify(list));
      }
    } catch {}

    // Sync insert to Supabase
    try {
      await supabase.from('pengajuan_visa').insert({
        nama: newItem.namaPemohon,
        no_paspor: newItem.noPaspor,
        no_wa: newItem.noTelp,
        program: newItem.program,
        paket: newItem.paket,
        konsjen: newItem.konsjen,
        staff_pic: newItem.staffPic,
        status: newItem.status,
        nominal_dibayar: newItem.dibayarPemohon,
        nominal_keluar: newItem.nominalKeluar,
        cashback: newItem.cashback,
        fee_bersih: newItem.feeBersih,
        code_referral: newItem.affiliateCode || 'MAPAHTRIP',
      });
    } catch (err) {
      console.error('Failed to insert new applicant to Supabase:', err);
    }
  };

  const handleOwnerLoginSuccess = () => {
    setIsOwnerAuth(true);
    setCurrentMode('owner');
    window.location.hash = '#owner';
  };

    const handleLogoutOwner = () => {
    setIsOwnerAuth(false);
    localStorage.removeItem('mapahtrip_owner_auth');
    setCurrentMode('staff');
    window.location.hash = '#staff';
    if (activeTab === 'keuangan' || activeTab === 'rekap') {
      setActiveTab('dashboard');
    }
  };

  // Fungsi Keluar / Logout Sesi Internal (Staf maupun Owner)
  const handleLogout = () => {
    setIsOwnerAuth(false);
    setCurrentStaff(null);
    localStorage.removeItem('mapahtrip_owner_auth');
    localStorage.removeItem('mapahtrip_staff_session');
    setIsAdminLoginOpen(false);
  };

  const handleUpdateBerkas = (
    id: string,
    berkasKey: keyof Pengajuan['berkas'],
    value: boolean
  ) => {
    setPengajuanList((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updatedBerkas = { ...(item.berkas || {}), [berkasKey]: value };
          return { ...item, berkas: updatedBerkas };
        }
        return item;
      })
    );
  };

  const handleUpdateStage = (
    id: string,
    stageData: {
      tglBerkasMasuk?: string;
      tglApply?: string;
      tglSelesai?: string;
      tglKirim?: string;
      status?: StatusPengajuan;
      noResi?: string;
    }
  ) => {
    setPengajuanList((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            tglBerkasMasuk: stageData.tglBerkasMasuk !== undefined ? stageData.tglBerkasMasuk : item.tglBerkasMasuk,
            tglApply: stageData.tglApply !== undefined ? stageData.tglApply : item.tglApply,
            tglSelesai: stageData.tglSelesai !== undefined ? stageData.tglSelesai : item.tglSelesai,
            tglKirim: stageData.tglKirim !== undefined ? stageData.tglKirim : item.tglKirim,
            noResi: stageData.noResi !== undefined ? stageData.noResi : item.noResi,
            status: stageData.status || item.status,
          };
        }
        return item;
      })
    );
  };

  const selectedPengajuan = pengajuanList.find((p) => p.id === selectedPengajuanId);
  const isOwnerMode = currentMode === 'owner' && isOwnerAuth;

  // 1. Customer Mode (Landing Page Pelanggan)
  if (currentMode === 'customer') {
    return (
      <>
        <SplashScreen />
        <CustomerHome
          pengajuanList={pengajuanList}
          onAddNewPengajuan={handleAddNewPengajuan}
        />
      </>
    );
  }

  // 2. Affiliate / Mitra Mode (Monitoring Berkas & Siswa Mitra)
  if (currentMode === 'affiliate') {
    return (
      <AffiliatePortal
        pengajuanList={pengajuanList}
        onUpdateBerkas={handleUpdateBerkas}
        onUpdateStage={handleUpdateStage}
        onSwitchMode={(mode) => {
          if (mode === 'customer') {
            setCurrentMode('customer');
            window.location.hash = '';
          } else {
            setCurrentMode('staff');
            window.location.hash = '#staff';
          }
        }}
      />
    );
  }

  // 3. Staff & 4. Owner Modes (Operasional Staf vs Finansial Owner)
  // WAJIB LOGIN TERLEBIH DAHULU: Sebelum ke tampilan dashboard, user harus login terlebih dahulu!
  if (currentMode === 'owner' && !isOwnerAuth) {
    return (
      <OwnerLoginModal
        isOpen={true}
        onClose={() => {}}
        onLoginSuccess={handleOwnerLoginSuccess}
        onBackToHome={() => {
          setCurrentMode('customer');
          window.location.hash = '';
        }}
      />
    );
  }

  if (currentMode === 'staff' && currentStaff === null) {
    return (
      <AdminLoginModal
        isOpen={true}
        canClose={false}
        onClose={() => {}}
        staffList={staffList}
        onLoginAsOwner={handleLoginAsOwner}
        onLoginAsStaff={handleLoginAsStaff}
        onBackToHome={() => {
          setCurrentMode('customer');
          window.location.hash = '';
        }}
      />
    );
  }

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
            {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        totalPengajuanCount={pengajuanList.length}
        totalAffiliateCount={62}
        isOwner={isOwnerMode}
        currentStaff={currentStaff}
        onRequestOwnerLogin={() => setIsAdminLoginOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Workspace */}
      <div className="main-content">
        {/* Top bar */}
        <div
          style={{
            backgroundColor: isOwnerMode ? '#0B0F19' : '#0F172A',
            color: '#ffffff',
            padding: '8px 24px',
            fontSize: '0.8rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            borderBottom: isOwnerMode ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid #1E293B',
          }}
        >
          {/* Mode Indicator Tag */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isOwnerMode ? '#F59E0B' : '#38BDF8',
                boxShadow: isOwnerMode ? '0 0 8px #F59E0B' : 'none',
              }}
            />
            {isOwnerMode ? (
              <span style={{ fontWeight: 700, color: '#FCD34D' }}>
                👑 Mode: Portal Owner (Akses Penuh Keuangan &amp; Kelola Akun Staf)
              </span>
            ) : (
              <span style={{ fontWeight: 600, color: '#E2E8F0' }}>
                📋 Portal Staf Konsuler: <strong>{currentStaff?.nama || 'Rizky Muhammad'}</strong> ({currentStaff?.role || 'Staf PIC Lapangan'})
              </span>
            )}
          </div>

          {/* Quick Switcher Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* If in Owner Mode: Show button to exit/lock back to staff */}
            {isOwnerMode && (
              <>
                <button
                  type="button"
                  onClick={handleLogoutOwner}
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#FCA5A5',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                  title="Kunci data keuangan dan kembali ke mode staf"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                    lock
                  </span>
                  <span>Kunci / Keluar Sesi Owner</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCurrentMode('staff');
                    window.location.hash = '#staff';
                  }}
                  style={{
                    background: 'rgba(148, 163, 184, 0.15)',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    color: '#E2E8F0',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                  title="Buka tampilan Staf Operasional"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                    assignment
                  </span>
                  <span>Tampilan Staf Ops</span>
                </button>
              </>
            )}

            {/* Switch to Affiliate Portal */}
            <button
              type="button"
              onClick={() => {
                setCurrentMode('affiliate');
                window.location.hash = '#affiliate';
              }}
              style={{
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#38BDF8',
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="Lihat tampilan dari sisi Mitra / Affiliate"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                handshake
              </span>
              <span>Portal Mitra (MPC)</span>
            </button>

                        {/* Switch to Customer Home */}
            <button
              type="button"
              onClick={() => {
                setCurrentMode('customer');
                window.location.hash = '';
              }}
              style={{
                background: '#2B68E0',
                border: 'none',
                color: '#ffffff',
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="Buka Beranda Pelanggan Umum"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                public
              </span>
              <span>Halaman Pelanggan</span>
            </button>

            </div>
        </div>

        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenNewPengajuan={() => setIsModalOpen(true)}
        />

        <main className="page-body">
          {activeTab === 'dashboard' && (
            <DashboardView
              pengajuanList={pengajuanList}
              onSelectPengajuan={handleSelectPengajuan}
              onNavigateToPengajuan={() => handleSelectTab('pengajuan')}
              isOwner={isOwnerMode}
            />
          )}

          {activeTab === 'pengajuan' && (
            <>
              {selectedPengajuan ? (
                <DetailPengajuanView
                  pengajuan={selectedPengajuan}
                  onBack={handleBackFromDetail}
                  onUpdateStatus={(newStatus) =>
                    handleUpdateStatus(selectedPengajuan.id, newStatus)
                  }
                  isOwner={isOwnerMode}
                />
              ) : (
                <PengajuanView
                  pengajuanList={pengajuanList}
                  onSelectPengajuan={handleSelectPengajuan}
                  onOpenNewPengajuan={() => setIsModalOpen(true)}
                  searchFilter={searchQuery}
                  isOwner={isOwnerMode}
                  onUpdateStage={handleUpdateStage}
                />
              )}
            </>
          )}

          {activeTab === 'keuangan' && isOwnerMode && (
            <KeuanganView pengajuanList={pengajuanList} />
          )}

          {activeTab === 'rekap' && isOwnerMode && (
            <RekapView />
          )}

          {activeTab === 'affiliate' && <AffiliateView />}

          {activeTab === 'pengaturan' && (
            <PengaturanView
              isOwner={isOwnerMode}
              staffList={staffList}
              currentStaff={currentStaff}
              onUpdateStaffList={handleUpdateStaffList}
            />
          )}
        </main>
      </div>

      {/* New Submission Modal */}
      <NewPengajuanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddNewPengajuan}
        isOwner={isOwnerMode}
      />

      {/* Admin Login Modal (Login Staf Operasional) */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => {
          setIsAdminLoginOpen(false);
        }}
        staffList={staffList}
        onLoginAsOwner={handleLoginAsOwner}
        onLoginAsStaff={handleLoginAsStaff}
        initialTab="staff"
      />

      {/* Owner Authentication Modal (Login Khusus Owner / Pemilik Usaha) */}
      <OwnerLoginModal
        isOpen={isOwnerLoginOpen || (currentMode === 'owner' && !isOwnerAuth)}
        onClose={() => {
          setIsOwnerLoginOpen(false);
          if (currentMode === 'owner' && !isOwnerAuth) {
            setCurrentMode('staff');
            window.location.hash = '#staff';
          }
        }}
        onLoginSuccess={handleOwnerLoginSuccess}
        onBackToHome={() => {
          setIsOwnerLoginOpen(false);
          setCurrentMode('customer');
          window.location.hash = '';
        }}
      />
    </div>
  );
}

export default App;
