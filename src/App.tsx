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
import { fetchAllPengajuanFromDB, fetchAllMitraFromDB, supabase } from './lib/supabase';

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
  const [pengajuanInitialTab, setPengajuanInitialTab] = useState<string>('Semua');

  // Helper deduplikasi anti data ganda (berdasarkan ID, noPengajuan, dan paspor+nama)
  const deduplicatePengajuanList = (list: Pengajuan[]): Pengajuan[] => {
    const seenIds = new Set<string>();
    const seenNoPengajuan = new Set<string>();
    const seenPaspor = new Set<string>();
    const result: Pengajuan[] = [];

    for (const item of list) {
      const idKey = String(item.id);
      const noKey = item.noPengajuan ? item.noPengajuan.trim() : '';
      const pasporKey =
        item.noPaspor && item.noPaspor !== '-'
          ? `${item.noPaspor.trim().toUpperCase()}_${item.namaPemohon.trim().toLowerCase()}`
          : '';

      if (seenIds.has(idKey)) continue;
      if (noKey && seenNoPengajuan.has(noKey)) continue;
      if (pasporKey && seenPaspor.has(pasporKey)) continue;

      seenIds.add(idKey);
      if (noKey) seenNoPengajuan.add(noKey);
      if (pasporKey) seenPaspor.add(pasporKey);

      result.push(item);
    }

    return result;
  };

  // Helper memuat pendaftaran lokal yang tersimpan dan menggabungkannya dengan data awal
  const getInitialPengajuanList = (): Pengajuan[] => {
    let localList: Pengajuan[] = [];
    try {
      const raw = localStorage.getItem('mapahtrip_local_registrations');
      if (raw) {
        localList = JSON.parse(raw);
      }
    } catch {}

    const combined = [...localList, ...mockPengajuan];
    const unique = deduplicatePengajuanList(combined);

    return unique.sort((a, b) => {
      const numA = parseInt(a.noPengajuan.replace(/[^0-9]/g, '') || a.id.replace(/[^0-9]/g, '') || '0', 10);
      const numB = parseInt(b.noPengajuan.replace(/[^0-9]/g, '') || b.id.replace(/[^0-9]/g, '') || '0', 10);
      return numB - numA;
    });
  };

  const [selectedPengajuanId, setSelectedPengajuanId] = useState<string | null>(null);
  const [pengajuanList, setPengajuanList] = useState<Pengajuan[]>(() => getInitialPengajuanList());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [affiliateCount, setAffiliateCount] = useState<number>(63);

  // Dengarkan event storage agar saat pemohon mendaftar di tab pelanggan, tab staf & mitra langsung terupdate otomatis
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const raw = localStorage.getItem('mapahtrip_local_registrations');
        if (raw) {
          const locals: Pengajuan[] = JSON.parse(raw);
          setPengajuanList((prev) => deduplicatePengajuanList([...locals, ...prev]));
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
          const uniqueData = deduplicatePengajuanList(liveData);
          setPengajuanList(uniqueData);
          console.log(`[Supabase] Loaded ${uniqueData.length} records into MapahTrip.`);

          // Sinkronisasi pembersihan cache localStorage: jika data sudah dihapus di Supabase, hapus juga dari cache lokal
          try {
            const raw = localStorage.getItem('mapahtrip_local_registrations');
            if (raw) {
              const localList: Pengajuan[] = JSON.parse(raw);
              const liveIds = new Set(uniqueData.map((d) => String(d.id)));
              const liveNos = new Set(uniqueData.map((d) => d.noPengajuan).filter(Boolean));

              const cleaned = localList.filter((item) => {
                const hasOfficialId = !isNaN(Number(item.id)) || (item.noPengajuan && item.noPengajuan.startsWith('MT-'));
                if (hasOfficialId) {
                  return liveIds.has(String(item.id)) || (item.noPengajuan && liveNos.has(item.noPengajuan));
                }
                return true;
              });

              localStorage.setItem('mapahtrip_local_registrations', JSON.stringify(deduplicatePengajuanList(cleaned)));
            }
          } catch {}
        }
      } catch (err) {
        console.warn('Fallback to local mock data:', err);
      }

      // Hitung total mitra aktif nyata (abaikan data dummy awal template)
      try {
        const DUMMY_CODES = new Set([
          'TOKUTEI-INDONESIA',
          'SUB-NIPPON-ACADEMY',
          'BALI-HIKARI-CARE',
          'LPK-JAPANCENTER',
          'MEDAN-SAKURA-TRIP',
          'MAKASSAR-NIPPON',
          'MAPAHTRIP', // Kode staff internal, bukan mitra eksternal
        ]);
        const dbMitra = await fetchAllMitraFromDB();
        const mSet = new Set<string>();
        dbMitra.forEach((m: any) => {
          const k = (m.affiliateCode || '').trim().toUpperCase();
          const nama = (m.nama || '').toLowerCase();
          if (k && !DUMMY_CODES.has(k) && !nama.includes('owner')) {
            mSet.add(k);
          }
        });
        if (mSet.size > 0) {
          setAffiliateCount(mSet.size);
        }
      } catch {}
    }
    loadData();
  }, []);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const handleSelectTab = (tab: NavItemKey) => {
    // If selecting financial tab and not authenticated as owner, block it
    if ((tab === 'keuangan' || tab === 'rekap') && (!isOwnerAuth || currentMode !== 'owner')) {
      setActiveTab('dashboard');
      return;
    }
    setActiveTab(tab);
    setSelectedPengajuanId(null);
    setIsMobileMenuOpen(false);
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

  const handleUpdatePengajuan = (updatedItem: Pengajuan) => {
    setPengajuanList((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
    try {
      const raw = localStorage.getItem('mapahtrip_local_registrations');
      let list: Pengajuan[] = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex((p) => p.id === updatedItem.id);
      if (idx !== -1) {
        list[idx] = updatedItem;
      } else {
        list.unshift(updatedItem);
      }
      localStorage.setItem('mapahtrip_local_registrations', JSON.stringify(list));
    } catch {}
  };

  // Handler pendaftaran mandiri dari Halaman Customer
  // (Data SUDAH tersimpan di Supabase oleh CustomerHome via createPengajuanInDB, jadi TIDAK boleh insert ulang!)
  const handleCustomerRegistration = (newItem: Pengajuan) => {
    setPengajuanList((prev) => deduplicatePengajuanList([newItem, ...prev]));

    // Simpan ke localStorage hanya untuk sinkronisasi seketika antar-tab tanpa re-insert ke Supabase
    try {
      const raw = localStorage.getItem('mapahtrip_local_registrations');
      const list: Pengajuan[] = raw ? JSON.parse(raw) : [];
      const updated = deduplicatePengajuanList([newItem, ...list]);
      localStorage.setItem('mapahtrip_local_registrations', JSON.stringify(updated));
    } catch {}
  };

  // Handler input berkas pemohon baru secara manual dari Portal Staf / Owner via Modal
  const handleAddNewPengajuan = async (newItem: Pengajuan) => {
    // Validasi anti-duplikasi: tolak jika pemohon dengan paspor & nama yang sama sudah ada di sistem
    if (newItem.noPaspor && newItem.noPaspor !== '-') {
      const isDuplicate = pengajuanList.some(
        (p) =>
          p.noPaspor?.trim().toUpperCase() === newItem.noPaspor?.trim().toUpperCase() &&
          p.namaPemohon.trim().toLowerCase() === newItem.namaPemohon.trim().toLowerCase()
      );
      if (isDuplicate) {
        alert(
          `Perhatian: Pemohon "${newItem.namaPemohon}" dengan nomor paspor "${newItem.noPaspor}" sudah terdaftar di sistem! Pendaftaran ganda dicegah.`
        );
        return;
      }
    }

    setPengajuanList((prev) => deduplicatePengajuanList([newItem, ...prev]));

    // Simpan ke localStorage agar data tidak hilang saat navigasi/reload
    try {
      const raw = localStorage.getItem('mapahtrip_local_registrations');
      const list: Pengajuan[] = raw ? JSON.parse(raw) : [];
      const updated = deduplicatePengajuanList([newItem, ...list]);
      localStorage.setItem('mapahtrip_local_registrations', JSON.stringify(updated));
    } catch {}

    // Sync insert to Supabase untuk modal staf
    try {
      let ketString = 'Input Pemohon Baru via Portal Staf';
      if (newItem.fotoBase64 || newItem.uploadedDocs) {
        ketString = JSON.stringify({
          note: 'Input Pemohon Baru via Portal Staf',
          fotoBase64: newItem.fotoBase64,
          originalSizeKB: newItem.fotoSizeKB,
          compressedSizeKB: newItem.fotoSizeKB,
          uploadedDocs: newItem.uploadedDocs || {},
          uploadedAt: new Date().toISOString(),
        });
      }

      const { data, error } = await supabase.from('pengajuan_visa').insert({
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
        form_visa: !!newItem.berkas.formVisa,
        ktp: !!newItem.berkas.ktp,
        ektln: !!newItem.berkas.ektln,
        coe: !!newItem.berkas.coe,
        foto: !!newItem.berkas.foto,
        keterangan: ketString,
      }).select().single();

      if (data && !error) {
        const realId = String(data.id);
        const realNo = `MT-${String(data.no_urut || data.id).padStart(4, '0')}`;
        setPengajuanList((prev) =>
          prev.map((p) => (p.id === newItem.id ? { ...p, id: realId, noPengajuan: realNo } : p))
        );
      }
    } catch (err) {
      console.error('Failed to insert new applicant to Supabase:', err);
    }
  };

  const handleOwnerLoginSuccess = () => {
    setIsOwnerAuth(true);
    setCurrentMode('owner');
    window.location.hash = '#owner';
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

  const handleUpdateStage = async (
    id: string,
    stageData: {
      tglBerkasMasuk?: string;
      tglApply?: string;
      tglSelesai?: string;
      tglKirim?: string;
      status?: StatusPengajuan;
      noResi?: string;
      alasanPenolakan?: string;
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
            alasanPenolakan: stageData.alasanPenolakan !== undefined ? stageData.alasanPenolakan : item.alasanPenolakan,
            status: stageData.status || item.status,
          };
        }
        return item;
      })
    );

    // Simpan permanen ke Supabase Cloud
    const numId = Number(id);
    if (!isNaN(numId)) {
      try {
        await supabase
          .from('pengajuan_visa')
          .update({
            tgl_sampai: stageData.tglBerkasMasuk || null,
            tgl_proses: stageData.tglApply || null,
            tgl_selesai: stageData.tglSelesai || null,
            tgl_kirim: stageData.tglKirim || null,
            resi_pengiriman: stageData.noResi || null,
            status: stageData.status || undefined,
            updated_at: new Date().toISOString(),
          })
          .eq('id', numId);
      } catch (err) {
        console.error('Failed to update stage in Supabase:', err);
      }
    }
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
          onAddNewPengajuan={handleCustomerRegistration}
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
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          className="mobile-backdrop"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label="Tutup menu navigasi"
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        totalPengajuanCount={
          isOwnerMode || !currentStaff?.konsjenTugas
            ? pengajuanList.length
            : pengajuanList.filter((p) => currentStaff.konsjenTugas.includes(p.konsjen)).length
        }
        totalAffiliateCount={affiliateCount}
        isOwner={isOwnerMode}
        currentStaff={currentStaff}
        onRequestOwnerLogin={() => setIsAdminLoginOpen(true)}
        onLogout={handleLogout}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Workspace */}
      <div className="main-content">
        <Header
          activeTab={activeTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenNewPengajuan={() => setIsModalOpen(true)}
          pengajuanList={pengajuanList}
          onSelectPengajuan={handleSelectPengajuan}
          onNavigateToPengajuan={(statusTab) => {
            setPengajuanInitialTab(statusTab || 'Semua');
            handleSelectTab('pengajuan');
          }}
          isOwner={isOwnerMode}
          currentStaff={currentStaff}
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        />

        <main className="page-body">
          {activeTab === 'dashboard' && (
            <DashboardView
              pengajuanList={pengajuanList}
              onSelectPengajuan={handleSelectPengajuan}
              onNavigateToPengajuan={(statusTab) => {
                setPengajuanInitialTab(statusTab || 'Semua');
                handleSelectTab('pengajuan');
              }}
              isOwner={isOwnerMode}
              currentStaff={currentStaff}
              staffName={currentStaff?.nama}
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
                  onUpdateStage={handleUpdateStage}
                  onUpdatePengajuan={handleUpdatePengajuan}
                  isOwner={isOwnerMode}
                />
              ) : (
                <PengajuanView
                  pengajuanList={pengajuanList}
                  onSelectPengajuan={handleSelectPengajuan}
                  onOpenNewPengajuan={() => setIsModalOpen(true)}
                  searchFilter={searchQuery}
                  onSearchChange={setSearchQuery}
                  isOwner={isOwnerMode}
                  currentStaff={currentStaff}
                  initialStatusTab={pengajuanInitialTab}
                  onUpdateStage={handleUpdateStage}
                />
              )}
            </>
          )}

          {activeTab === 'keuangan' && isOwnerMode && (
            <KeuanganView pengajuanList={pengajuanList} />
          )}

          {activeTab === 'rekap' && isOwnerMode && (
            <RekapView pengajuanList={pengajuanList} />
          )}

          {activeTab === 'affiliate' && (
            <AffiliateView
              pengajuanList={pengajuanList}
              onNavigateToPengajuan={(refCode) => {
                setSearchQuery(refCode);
                setPengajuanInitialTab('Semua');
                setActiveTab('pengajuan');
              }}
              isOwner={isOwnerMode}
              onAffiliatesCountChange={setAffiliateCount}
            />
          )}

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
