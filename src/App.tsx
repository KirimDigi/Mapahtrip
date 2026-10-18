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
import { mockPengajuan } from './data/mockData';
import type { Pengajuan } from './types';
import { fetchAllPengajuanFromDB, supabase } from './lib/supabase';

export type AppMode = 'customer' | 'affiliate' | 'admin';

export function App() {
  // Check URL to determine mode:
  // 1. customer: '/' (default)
  // 2. affiliate: '#affiliate' or '#mitra'
  // 3. admin: '#admin' or '#owner'
  const getModeFromUrl = (): AppMode => {
    if (typeof window === 'undefined') return 'customer';
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();
    const path = window.location.pathname.toLowerCase();

    if (
      hash === '#admin' ||
      hash === '#/admin' ||
      hash === '#owner' ||
      search.includes('admin') ||
      path.endsWith('/admin')
    ) {
      return 'admin';
    }

    if (
      hash === '#affiliate' ||
      hash === '#/affiliate' ||
      hash === '#mitra' ||
      hash === '#/mitra' ||
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
      setCurrentMode(getModeFromUrl());
    };
    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  const [activeTab, setActiveTab] = useState<NavItemKey>('dashboard');
  const [selectedPengajuanId, setSelectedPengajuanId] = useState<string | null>(null);
  const [pengajuanList, setPengajuanList] = useState<Pengajuan[]>(mockPengajuan);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

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
    setPengajuanList((prev) => [newItem, ...prev]);
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

  const selectedPengajuan = pengajuanList.find((p) => p.id === selectedPengajuanId);

  // 1. Customer Mode (Landing Page Pelanggan)
  if (currentMode === 'customer') {
    return (
      <>
        <SplashScreen />
        <CustomerHome pengajuanList={pengajuanList} />
      </>
    );
  }

  // 2. Affiliate / Mitra Mode (Monitoring Berkas & Siswa Mitra)
  if (currentMode === 'affiliate') {
    return (
      <AffiliatePortal
        pengajuanList={pengajuanList}
        onSwitchMode={(mode) => {
          setCurrentMode(mode);
          if (mode === 'customer') {
            window.location.hash = '';
          } else if (mode === 'admin') {
            window.location.hash = '#admin';
          }
        }}
      />
    );
  }

  // 3. Admin / Owner Mode (Operasional & Keuangan Lengkap)
  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        totalPengajuanCount={pengajuanList.length}
        totalAffiliateCount={62}
      />

      {/* Main Workspace */}
      <div className="main-content">
        {/* Admin top banner to easily navigate between modes */}
        <div
          style={{
            backgroundColor: '#0F172A',
            color: '#ffffff',
            padding: '8px 24px',
            fontSize: '0.8rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            borderBottom: '1px solid #1E293B',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
            <span style={{ fontWeight: 600 }}>Mode: Portal Owner / Admin Operasional &amp; Keuangan</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              <span>Portal Mitra (Affiliate)</span>
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
                />
              ) : (
                <PengajuanView
                  pengajuanList={pengajuanList}
                  onSelectPengajuan={handleSelectPengajuan}
                  onOpenNewPengajuan={() => setIsModalOpen(true)}
                  searchFilter={searchQuery}
                />
              )}
            </>
          )}

          {activeTab === 'keuangan' && <KeuanganView pengajuanList={pengajuanList} />}

          {activeTab === 'rekap' && <RekapView />}

          {activeTab === 'affiliate' && <AffiliateView />}

          {activeTab === 'pengaturan' && <PengaturanView />}
        </main>
      </div>

      {/* New Submission Modal */}
      <NewPengajuanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddNewPengajuan}
      />
    </div>
  );
}

export default App;
