import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import type { NavItemKey } from './components/Sidebar';
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
import { SplashScreen } from './components/SplashScreen';
import { mockPengajuan } from './data/mockData';
import type { Pengajuan } from './types';
import { fetchAllPengajuanFromDB, supabase } from './lib/supabase';

export function App() {
  // Check if current URL indicates admin mode (#admin, ?admin, or /admin)
  const checkIsAdminUrl = () => {
    if (typeof window === 'undefined') return false;
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    return hash === '#admin' || hash === '#/admin' || search.includes('admin') || path.endsWith('/admin');
  };

  // Mode: 'customer' (Landing page pelanggan) or 'admin' (Dashboard operasional admin)
  const [currentMode, setCurrentMode] = useState<'customer' | 'admin'>(() => {
    return checkIsAdminUrl() ? 'admin' : 'customer';
  });

  useEffect(() => {
    const handleUrlChange = () => {
      if (checkIsAdminUrl()) {
        setCurrentMode('admin');
      } else {
        setCurrentMode('customer');
      }
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

  // If customer mode is active, show the customer landing page with splash screen
  if (currentMode === 'customer') {
    return (
      <>
        <SplashScreen />
        <CustomerHome pengajuanList={pengajuanList} />
      </>
    );
  }

  // Admin Dashboard Mode
  return (
    <div className="app-layout">
      {/* 1. Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        totalPengajuanCount={pengajuanList.length}
        totalAffiliateCount={62}
      />

      {/* 2. Main Workspace */}
      <div className="main-content">
        {/* Admin top banner to easily return to customer home */}
        <div
          style={{
            backgroundColor: '#0F172A',
            color: '#ffffff',
            padding: '6px 32px',
            fontSize: '0.8rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
            <span style={{ fontWeight: 600 }}>Mode: Portal Admin Operasional MapahTrip</span>
          </div>
          <button
            onClick={() => {
              setCurrentMode('customer');
              if (window.location.hash === '#admin' || window.location.hash === '#/admin') {
                history.pushState(null, '', window.location.pathname + window.location.search);
              }
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
              gap: '4px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
              public
            </span>
            <span>Buka Beranda Pelanggan (Home)</span>
          </button>
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

      {/* 3. New Submission Modal */}
      <NewPengajuanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddNewPengajuan}
      />
    </div>
  );
}

export default App;
