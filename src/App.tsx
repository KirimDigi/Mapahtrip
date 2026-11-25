import { useState, useEffect, useMemo } from 'react';
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
import { fetchAllPengajuanFromDB, fetchAllMitraFromDB, deletePengajuanInDB, supabase, mapDBToPengajuan, type PengajuanVisaDB } from './lib/supabase';
import { fetchVisaPricingFromDB } from './utils/visaPricing';
import { isApplicantAssignedToStaff } from './utils/staffAssignment';
import { removeApplicantFromWAOutbox } from './whatsapp';

export type AppMode = 'customer' | 'affiliate' | 'staff' | 'owner';

// Deteksi komprehensif apakah perangkat adalah HP / ponsel
export const isMobileDeviceOrScreen = (): boolean => {
  if (typeof window === 'undefined') return false;
  // 1. Lebar viewport <= 900px (Sinkron sempurna dengan breakpoint CSS sidebar @media (max-width: 900px))
  if (window.innerWidth <= 900) return true;
  // 2. User Agent smartphone (meskipun user mengaktifkan "Minta Situs Desktop" di browser HP)
  if (/Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) return true;
  // 3. Media query match
  if (window.matchMedia && window.matchMedia('(max-width: 900px)').matches) return true;
  return false;
};

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
      if (saved) {
        const parsed: StaffMaster[] = JSON.parse(saved);
        const legacyDummyWa = ['081214104332', '087894410144', '081280905425', '0895327970805', '087882925885', '081234567890'];
        const sanitized = parsed.map((p) => {
          const defaultStaff = mockStaff.find((ms) => ms.id === p.id);
          const isUlla = p.nama.toLowerCase().includes('ulla') || p.nama.toLowerCase().includes('ulya');
          const cleanWaDigits = (p.noWa || '').replace(/\D/g, '');
          const isDummyWa = legacyDummyWa.includes(cleanWaDigits);
          const isDummyRek = !p.noRekening || p.noRekening === '6240866950' || p.noRekening === '-';

          return {
            ...p,
            konsjenTugas: isUlla && defaultStaff?.konsjenTugas ? defaultStaff.konsjenTugas : p.konsjenTugas,
            role: isUlla && defaultStaff?.role ? defaultStaff.role : p.role,
            noWa: isDummyWa ? '' : (p.noWa || ''),
            bankName: isDummyRek ? '' : (p.bankName || ''),
            noRekening: isDummyRek ? '' : p.noRekening,
            atasNamaRekening: isDummyRek ? '' : (p.atasNamaRekening || ''),
            defaultFeePerPaspor: p.defaultFeePerPaspor || defaultStaff?.defaultFeePerPaspor || 50000,
          };
        });
        localStorage.setItem('mapahtrip_staff_list', JSON.stringify(sanitized));
        return sanitized;
      }
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
    if (isMobileDeviceOrScreen()) {
      setActiveTab('pengajuan');
    }
  };

  const handleLoginAsStaff = (staf: StaffMaster) => {
    setCurrentStaff(staf);
    localStorage.setItem('mapahtrip_staff_session', staf.id);
    setIsOwnerAuth(false);
    localStorage.removeItem('mapahtrip_owner_auth');
    setCurrentMode('staff');
    window.location.hash = '#staff';
    setIsAdminLoginOpen(false);
    if (isMobileDeviceOrScreen()) {
      setActiveTab('pengajuan');
    }
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
      if ((mode === 'staff' || mode === 'owner') && isMobileDeviceOrScreen()) {
        setActiveTab('pengajuan');
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

  const isOwnerMode = currentMode === 'owner' && isOwnerAuth;

  const [activeTab, setActiveTab] = useState<NavItemKey>(() => {
    if (isMobileDeviceOrScreen()) {
      return 'pengajuan';
    }
    try {
      const saved = typeof window !== 'undefined' ? (localStorage.getItem('mapahtrip_active_tab') as NavItemKey | null) : null;
      if (saved && ['dashboard', 'pengajuan', 'keuangan', 'rekap', 'affiliate', 'pengaturan'].includes(saved)) {
        return saved;
      }
    } catch {}
    return 'dashboard';
  });

  // Pada tampilan HP / tablet, pastikan selalu langsung masuk ke kartu pengajuan
  useEffect(() => {
    if (isMobileDeviceOrScreen()) {
      setActiveTab('pengajuan');
    }
  }, []);
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
        localList = localList.map((item) => {
          const numId = Number(item.id);
          if ((isNaN(numId) || numId > 299) && (item.program || '').toLowerCase().includes('kunjungan')) {
            return { ...item, staffPic: 'Ulla' as any };
          }
          return item;
        });
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
  const [returnTab, setReturnTab] = useState<NavItemKey | null>(null);
  const [pengajuanList, setPengajuanList] = useState<Pengajuan[]>(() => getInitialPengajuanList());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [affiliateCount, setAffiliateCount] = useState<number>(63);
  const [livePendingPayoutCount, setLivePendingPayoutCount] = useState<number | null>(null);

  // Hitung jumlah antrean payout yang belum dibayar (komisi mitra + fee staf)
  const calculatedPendingPayoutCount = useMemo(() => {
    let mitraStored: Record<string, any> = {};
    try {
      const raw = localStorage.getItem('mapahtrip_affiliate_payouts');
      if (raw) mitraStored = JSON.parse(raw);
    } catch {}

    let staffStored: Record<string, any> = {};
    try {
      const raw = localStorage.getItem('mapahtrip_staff_payouts');
      if (raw) staffStored = JSON.parse(raw);
    } catch {}

    let count = 0;
    pengajuanList.forEach((p) => {
      // 1. Antrean Payout Mitra (Hanya untuk Owner)
      if (isOwnerMode) {
        const isVisaSelesai = p.status === 'Selesai' || Boolean(p.tglSelesai && p.tglSelesai !== '-');
        const code = (p.affiliateCode || '').trim().toUpperCase();
        const hasAffiliate = Boolean(code && code !== 'MAPAHTRIP');
        const isSelfReg = Boolean(p.catatan && (p.catatan.includes('Website Mapahtrip') || p.catatan.includes('Pendaftaran mandiri') || p.catatan.includes('Portal Staf')));
        const isSpreadsheet = Boolean(p.catatan && (p.catatan.includes('Spreadsheet') || p.catatan.includes('Data_Apply')));
        const numPeng = Number((p.noPengajuan || '').replace(/\D/g, ''));
        const isHistorical = !isSelfReg && (isSpreadsheet || (!isNaN(numPeng) && numPeng > 0 && numPeng <= 225));

        if (hasAffiliate && !isHistorical && isVisaSelesai && p.payoutStatus !== 'Berhasil Ditransfer' && !mitraStored[p.id]) {
          count++;
        }
      }

      // 2. Antrean Payout Fee Staf PIC
      const prog = (p.program || '').toLowerCase();
      const isWaiver = prog.includes('waiver') || prog.includes('e-visa') || prog.includes('evisa');
      if (!isWaiver && p.staffPic && p.staffPayoutStatus !== 'Berhasil Ditransfer' && !staffStored[p.id]) {
        // Hanya hitung jika berkas memang memiliki fee staf > 0 (tidak memotong laba / Rp 0)
        const feeAmount = p.staffFee !== undefined
          ? p.staffFee
          : (p.cashback !== undefined ? p.cashback : 0);

        const isVisaSelesai = p.status === 'Selesai' || Boolean(p.tglSelesai && p.tglSelesai !== '-');
        const hasExplicitStaffFee = Boolean(p.staffFee && p.staffFee > 0);

        if ((hasExplicitStaffFee || isVisaSelesai) && feeAmount > 0) {
          if (!isOwnerMode && currentStaff) {
            if (isApplicantAssignedToStaff(p, currentStaff)) {
              count++;
            }
          } else if (isOwnerMode) {
            count++;
          }
        }
      }
    });

    return count;
  }, [pengajuanList, isOwnerMode, currentStaff]);

  const effectivePendingPayoutCount = livePendingPayoutCount !== null ? livePendingPayoutCount : calculatedPendingPayoutCount;

  // Hitung jumlah pengajuan aktif / belum tertangani (belum selesai & belum dikirim)
  const [liveActivePengajuanCount, setLiveActivePengajuanCount] = useState<number | null>(null);

  const calculatedActivePengajuanCount = useMemo(() => {
    return pengajuanList.filter((p) => {
      if (!isOwnerMode && currentStaff?.konsjenTugas && currentStaff.konsjenTugas.length > 0) {
        // Khusus Staf Wilayah: Visa Waiver / e-Visa tidak masuk antrean tugas staf wilayah (karena 100% online dihandle Owner/Pusat)
        const prog = (p.program || '').toLowerCase();
        if (prog.includes('waiver') || prog.includes('e-visa') || prog.includes('evisa')) return false;
        if (!currentStaff.konsjenTugas.includes(p.konsjen)) return false;
      }
      const st = (p.status || '').toLowerCase().trim();
      if (st === 'selesai' || st === 'ditolak' || st.includes('selesai') || st.includes('terbit') || st.includes('kirim') || st.includes('tolak')) {
        return false;
      }
      if (p.tglSelesai && p.tglSelesai !== '-' && p.tglSelesai.trim() !== '') return false;
      if (p.tglKirim && p.tglKirim !== '-' && p.tglKirim.trim() !== '') return false;
      return true;
    }).length;
  }, [pengajuanList, isOwnerMode, currentStaff]);

  const effectiveActivePengajuanCount = liveActivePengajuanCount !== null ? liveActivePengajuanCount : calculatedActivePengajuanCount;

  // Live Toast Notification Data State
  const [liveToast, setLiveToast] = useState<{
    id: string;
    nama: string;
    program: string;
    konsjen: string;
    noPengajuan?: string;
    waktu: string;
  } | null>(null);

  // Auto dismiss live toast setelah 8.5 detik
  useEffect(() => {
    if (!liveToast) return;
    const timer = setTimeout(() => {
      setLiveToast(null);
    }, 8500);
    return () => clearTimeout(timer);
  }, [liveToast]);

  // Listener Notifikasi WhatsApp Terkirim Otomatis dari Antrean Outbox (Auto-Retry)
  useEffect(() => {
    const handleWASent = (e: any) => {
      const detail = e.detail;
      if (detail && detail.applicantName) {
        setLiveToast({
          id: 'wa-sent',
          nama: `WhatsApp Terkirim: ${detail.applicantName}`,
          program: `Notifikasi Tahap ${detail.stage || 'Pengajuan'}`,
          konsjen: `No: ${detail.nomorTujuan}`,
          noPengajuan: 'WA Outbox Auto-Sent',
          waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        });
      }
    };
    window.addEventListener('mapahtrip_wa_sent', handleWASent);
    return () => window.removeEventListener('mapahtrip_wa_sent', handleWASent);
  }, []);

  // Fungsi reload otomatis data pengajuan langsung dari Supabase Database saat ada pendaftar baru
  const reloadLivePengajuan = async () => {
    try {
      const liveData = await fetchAllPengajuanFromDB();
      if (liveData && liveData.length > 0) {
        setPengajuanList(deduplicatePengajuanList(liveData));
      }
    } catch (err) {
      console.warn('[Realtime Reload] Fallback reload:', err);
    }
  };

  // Dengarkan event storage & custom event agar saat pemohon mendaftar di tab pelanggan, tab staf & mitra langsung terupdate & reload otomatis
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const raw = localStorage.getItem('mapahtrip_local_registrations');
        if (raw) {
          const locals: Pengajuan[] = JSON.parse(raw);
          setPengajuanList((prev) => deduplicatePengajuanList([...locals, ...prev]));
        }
      } catch {}
      reloadLivePengajuan();
    };

    // Listener custom event lokal saat pendaftaran baru disubmit di sesi ini
    const handleLocalNewApplicant = (e: any) => {
      const applicant: Pengajuan = e.detail;
      if (applicant) {
        setPengajuanList((prev) => deduplicatePengajuanList([applicant, ...prev]));
        setLiveToast({
          id: String(applicant.id),
          nama: applicant.namaPemohon,
          program: applicant.program,
          konsjen: applicant.konsjen || 'Jakarta',
          noPengajuan: applicant.noPengajuan,
          waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        });
      }
      reloadLivePengajuan();
    };

    const handleLocalApplicantUpdated = (e: any) => {
      const updated = e.detail as Pengajuan;
      if (updated && updated.id) {
        setLivePendingPayoutCount(null);
        setPengajuanList((prev) =>
          prev.map((item) => (String(item.id) === String(updated.id) ? { ...item, ...updated } : item))
        );
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('mapahtrip:new_applicant', handleLocalNewApplicant);
    window.addEventListener('mapahtrip:pengajuan-updated', handleLocalApplicantUpdated);

    // Supabase Realtime Channel: Mendengarkan perubahan data langsung dari cloud (otomatis reload database saat ada pendaftar baru)
    const channel = supabase
      .channel('mapahtrip_realtime_pengajuan_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pengajuan_visa' },
        (payload) => {
          console.log('[Supabase Realtime] Event INSERT terdeteksi:', payload.new);
          try {
            const newRecord = mapDBToPengajuan(payload.new as PengajuanVisaDB);
            setPengajuanList((prev) => deduplicatePengajuanList([newRecord, ...prev]));
            setLiveToast({
              id: String(newRecord.id),
              nama: newRecord.namaPemohon,
              program: newRecord.program,
              konsjen: newRecord.konsjen || 'Jakarta',
              noPengajuan: newRecord.noPengajuan,
              waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            });
          } catch (e) {
            console.warn('[Realtime] Gagal memetakan pendaftar baru:', e);
          }
          // Otomatis reload data penuh dari database
          reloadLivePengajuan();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pengajuan_visa' },
        (payload) => {
          console.log('[Supabase Realtime] Event UPDATE terdeteksi:', payload.new);
          try {
            const updated = mapDBToPengajuan(payload.new as PengajuanVisaDB);
            setPengajuanList((prev) =>
              prev.map((item) => (String(item.id) === String(updated.id) ? { ...item, ...updated } : item))
            );
          } catch (e) {
            console.warn('[Realtime] Gagal memetakan update pendaftar:', e);
          }
          // Otomatis reload data penuh dari database
          reloadLivePengajuan();
        }
      )
      .subscribe((status) => {
        console.log('[Supabase Realtime] Status langganan channel:', status);
      });

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('mapahtrip:new_applicant', handleLocalNewApplicant);
      window.removeEventListener('mapahtrip:pengajuan-updated', handleLocalApplicantUpdated);
      supabase.removeChannel(channel);
    };
  }, []);

  // Load live data from Supabase Cloud on mount
  useEffect(() => {
    async function loadData() {
      // 1. Sinkronisasi master tarif visa dari Supabase Cloud
      fetchVisaPricingFromDB().catch(() => {});

      try {
        const liveData = await fetchAllPengajuanFromDB();
        if (liveData && liveData.length > 0) {
          const uniqueData = deduplicatePengajuanList(liveData);
          setPengajuanList(uniqueData);
          console.log(`[Supabase] Loaded ${uniqueData.length} records into MapahTrip.`);

          // Sinkronisasi pembersihan cache localStorage: jika data sudah ada di Supabase, selaraskan nomor pengajuan dan hapus data usang
          try {
            const raw = localStorage.getItem('mapahtrip_local_registrations');
            if (raw) {
              const localList: Pengajuan[] = JSON.parse(raw);
              const liveMap = new Map(uniqueData.map((d) => [String(d.id), d]));

              // Pastikan noPengajuan & staffPic di cache lokal selalu identik 100% dengan database resmi Supabase
              const syncedLocal = localList
                .map((item) => {
                  const live = liveMap.get(String(item.id));
                  if (live) {
                    return {
                      ...item,
                      noPengajuan: live.noPengajuan,
                      staffPic: live.staffPic,
                      statusPembayaran: live.statusPembayaran,
                    };
                  }
                  const numId = Number(item.id);
                  if ((isNaN(numId) || numId > 299) && (item.program || '').toLowerCase().includes('kunjungan')) {
                    return { ...item, staffPic: 'Ulla' as any };
                  }
                  return item;
                })
                .filter((item) => {
                  const hasOfficialId = !isNaN(Number(item.id)) || (item.noPengajuan && item.noPengajuan.startsWith('MT-'));
                  if (hasOfficialId) {
                    return liveMap.has(String(item.id));
                  }
                  return true;
                });

              localStorage.setItem('mapahtrip_local_registrations', JSON.stringify(deduplicatePengajuanList(syncedLocal)));
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

  useEffect(() => {
    const handleWindowResize = () => {
      if (window.innerWidth > 900) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('mapahtrip_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('mapahtrip_sidebar_collapsed', next ? 'true' : 'false');
      } catch {}
      return next;
    });
  };

  const handleSelectTab = (tab: NavItemKey) => {
    // If selecting financial tab and not authenticated as owner, block it
    if ((tab === 'keuangan' || tab === 'rekap') && (!isOwnerAuth || currentMode !== 'owner')) {
      setActiveTab('dashboard');
      return;
    }
    setActiveTab(tab);
    try {
      localStorage.setItem('mapahtrip_active_tab', tab);
    } catch {}
    setSelectedPengajuanId(null);
    setReturnTab(null);
    setIsMobileMenuOpen(false);
  };

  const handleSelectPengajuan = (id: string, fromTab?: NavItemKey) => {
    setSelectedPengajuanId(id);
    setReturnTab(fromTab || activeTab);
    setActiveTab('pengajuan');
  };

  const handleBackFromDetail = () => {
    setSelectedPengajuanId(null);
    if (returnTab) {
      setActiveTab(returnTab);
      setReturnTab(null);
    }
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

  const handleUpdatePengajuan = async (updatedItem: Pengajuan) => {
    setLivePendingPayoutCount(null);
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

    const numId = Number(updatedItem.id);
    if (!isNaN(numId)) {
      try {
        // Ambil keterangan lama dari Supabase jika ada format JSON (foto, berkas)
        const { data: row } = await supabase
          .from('pengajuan_visa')
          .select('keterangan')
          .eq('id', numId)
          .maybeSingle();

        let parsed: any = {};
        if (row?.keterangan && row.keterangan.startsWith('{') && row.keterangan.endsWith('}')) {
          try {
            parsed = JSON.parse(row.keterangan);
          } catch {}
        } else if (row?.keterangan) {
          parsed = { note: row.keterangan };
        }

        parsed.note = updatedItem.catatan !== undefined ? updatedItem.catatan : (parsed.note || '');
        if (updatedItem.staffFee !== undefined) {
          parsed.staffFee = updatedItem.staffFee;
        }
        if (updatedItem.referralFee !== undefined) {
          parsed.referralFee = updatedItem.referralFee;
        }
        if (updatedItem.staffPayoutStatus !== undefined) {
          parsed.staffPayoutStatus = updatedItem.staffPayoutStatus;
        }
        if (updatedItem.staffPayoutTanggal !== undefined) {
          parsed.staffPayoutTanggal = updatedItem.staffPayoutTanggal;
        }
        if (updatedItem.staffPayoutNoRef !== undefined) {
          parsed.staffPayoutNoRef = updatedItem.staffPayoutNoRef;
        }
        if (updatedItem.staffPayoutBuktiUrl) {
          parsed.staffPayoutBuktiUrl = updatedItem.staffPayoutBuktiUrl;
        } else {
          delete parsed.staffPayoutBuktiUrl;
        }
        if (updatedItem.staffPayoutBy !== undefined) {
          parsed.staffPayoutBy = updatedItem.staffPayoutBy;
        }
        if (updatedItem.staffPayoutCatatan !== undefined) {
          parsed.staffPayoutCatatan = updatedItem.staffPayoutCatatan;
        }

        if (updatedItem.payoutStatus !== undefined) {
          parsed.payoutStatus = updatedItem.payoutStatus;
        }
        if (updatedItem.payoutTanggal !== undefined) {
          parsed.payoutTanggal = updatedItem.payoutTanggal;
        }
        if (updatedItem.payoutNoRef !== undefined) {
          parsed.payoutNoRef = updatedItem.payoutNoRef;
        }
        if (updatedItem.payoutBuktiUrl) {
          parsed.payoutBuktiUrl = updatedItem.payoutBuktiUrl;
        } else {
          delete parsed.payoutBuktiUrl;
        }
        if (updatedItem.payoutBy !== undefined) {
          parsed.payoutBy = updatedItem.payoutBy;
        }
        if (updatedItem.payoutCatatan !== undefined) {
          parsed.payoutCatatan = updatedItem.payoutCatatan;
        }

        if (updatedItem.statusPembayaran !== undefined) {
          parsed.statusPembayaran = updatedItem.statusPembayaran;
        }
        if (updatedItem.metodePembayaran !== undefined) {
          parsed.metodePembayaran = updatedItem.metodePembayaran;
        }
        if (updatedItem.tglBayarPemohon !== undefined) {
          parsed.tglBayarPemohon = updatedItem.tglBayarPemohon;
        }

        const updatedKeterangan = JSON.stringify(parsed);

        await supabase
          .from('pengajuan_visa')
          .update({
            nama: updatedItem.namaPemohon,
            no_paspor: updatedItem.noPaspor,
            no_wa: updatedItem.noTelp,
            program: updatedItem.program,
            paket: updatedItem.paket,
            konsjen: updatedItem.konsjen,
            staff_pic: updatedItem.staffPic,
            status: updatedItem.status,
            nominal_dibayar: updatedItem.dibayarPemohon,
            nominal_keluar: updatedItem.nominalKeluar,
            cashback: updatedItem.cashback,
            fee_bersih: updatedItem.feeBersih,
            keterangan: updatedKeterangan,
            updated_at: new Date().toISOString(),
          })
          .eq('id', numId);
      } catch (err) {
        console.error('Failed to sync updatedItem to Supabase:', err);
      }
    }
  };

  const handleDeletePengajuan = async (id: string) => {
    // Bersihkan seluruh pesan WhatsApp pending dari pemohon ini di antrean outbox (customer, staf, owner, mitra)
    const targetItem = pengajuanList.find((item) => String(item.id) === String(id));
    if (targetItem) {
      removeApplicantFromWAOutbox({
        namaPemohon: targetItem.namaPemohon,
        noPengajuan: targetItem.noPengajuan,
        noTelp: targetItem.noTelp,
      });
    }

    setPengajuanList((prev) => {
      const updated = prev.filter((item) => String(item.id) !== String(id));
      try {
        const raw = localStorage.getItem('mapahtrip_local_registrations');
        if (raw) {
          const locals: Pengajuan[] = JSON.parse(raw);
          const filteredLocals = locals.filter((item) => String(item.id) !== String(id));
          localStorage.setItem('mapahtrip_local_registrations', JSON.stringify(filteredLocals));
        }
      } catch {}
      return updated;
    });

    try {
      await deletePengajuanInDB(id);
    } catch (err) {
      console.warn('Gagal menghapus pengajuan dari Supabase:', err);
    }
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
      const isLunas = newItem.statusPembayaran === 'Lunas';
      const ketString = JSON.stringify({
        note: 'Input Pemohon Baru via Portal Staf',
        fotoBase64: newItem.fotoBase64,
        originalSizeKB: newItem.fotoSizeKB,
        compressedSizeKB: newItem.fotoSizeKB,
        uploadedDocs: newItem.uploadedDocs || {},
        statusPembayaran: newItem.statusPembayaran || 'Menunggu Pembayaran',
        uploadedAt: new Date().toISOString(),
      });

      const { data, error } = await supabase.from('pengajuan_visa').insert({
        nama: newItem.namaPemohon,
        no_paspor: newItem.noPaspor,
        no_wa: newItem.noTelp,
        program: newItem.program,
        paket: newItem.paket,
        konsjen: newItem.konsjen,
        staff_pic: newItem.staffPic,
        status: newItem.status,
        payment_status: isLunas,
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
        if (!data.no_urut && data.id) {
          try {
            const { data: maxRow } = await supabase
              .from('pengajuan_visa')
              .select('no_urut')
              .not('no_urut', 'is', null)
              .order('no_urut', { ascending: false })
              .limit(1)
              .single();

            const nextNoUrut = maxRow?.no_urut ? Number(maxRow.no_urut) + 1 : Number(data.id);
            await supabase.from('pengajuan_visa').update({ no_urut: nextNoUrut }).eq('id', data.id);
            data.no_urut = nextNoUrut;
          } catch {
            await supabase.from('pengajuan_visa').update({ no_urut: data.id }).eq('id', data.id);
            data.no_urut = data.id;
          }
        }
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
    if (isMobileDeviceOrScreen()) {
      setActiveTab('pengajuan');
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

  // 1. Customer Mode (Landing Page Pelanggan)
  if (currentMode === 'customer') {
    return (
      <>
        <SplashScreen />
        <CustomerHome
          pengajuanList={pengajuanList}
          onAddNewPengajuan={handleCustomerRegistration}
          onUpdatePengajuan={handleUpdatePengajuan}
        />
      </>
    );
  }

  // 2. Affiliate / Mitra Mode (Monitoring Berkas & Pemohon Mitra)
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
    <div className={`app-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
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
        totalPengajuanCount={effectiveActivePengajuanCount}
        totalAffiliateCount={affiliateCount}
        pendingPayoutCount={effectivePendingPayoutCount}
        isOwner={isOwnerMode}
        currentStaff={currentStaff}
        onRequestOwnerLogin={() => setIsAdminLoginOpen(true)}
        onLogout={handleLogout}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        isCollapsed={isSidebarCollapsed}
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
          isMobileMenuOpen={isMobileMenuOpen}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
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
                  onUpdatePengajuan={handleUpdatePengajuan}
                  onDeletePengajuan={handleDeletePengajuan}
                  onActiveCountChange={setLiveActivePengajuanCount}
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
              staffList={staffList}
              currentStaff={currentStaff}
              onUpdatePengajuan={handleUpdatePengajuan}
              onNavigateToPengajuan={(refCode) => {
                setSearchQuery(refCode);
                setPengajuanInitialTab('Semua');
                setActiveTab('pengajuan');
              }}
              isOwner={isOwnerMode}
              onAffiliatesCountChange={setAffiliateCount}
              onPendingPayoutCountChange={setLivePendingPayoutCount}
              onRefresh={reloadLivePengajuan}
            />
          )}

          {activeTab === 'pengaturan' && (
            <PengaturanView
              isOwner={isOwnerMode}
              staffList={staffList}
              currentStaff={currentStaff}
              onUpdateStaffList={handleUpdateStaffList}
              pengajuanList={pengajuanList}
              onUpdatePengajuanList={(newList) => {
                setPengajuanList(newList);
                try {
                  localStorage.setItem('mapahtrip_local_registrations', JSON.stringify(newList));
                } catch {}
              }}
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

      {/* Floating Live Real-time Notification Toast (Chime + Instant Card) */}
      {liveToast && (currentMode === 'staff' || currentMode === 'owner') && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 999999,
            maxWidth: '380px',
            width: 'calc(100vw - 40px)',
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1.5px solid #38BDF8',
            boxShadow: '0 20px 40px rgba(14, 165, 233, 0.25), 0 4px 12px rgba(0,0,0,0.08)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            animation: 'fadeIn 0.25s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: '#E0F2FE',
                  border: '1px solid #BAE6FD',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0284C7',
                  flexShrink: 0,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                  notifications_active
                </span>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0F172A' }}>
                    Pemohon Baru Masuk! 🇯🇵
                  </span>
                  <span
                    style={{
                      backgroundColor: '#DCFCE7',
                      color: '#15803D',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      padding: '1px 5px',
                      borderRadius: '4px',
                    }}
                  >
                    LIVE
                  </span>
                </div>
                <div style={{ fontSize: '0.70rem', color: '#64748B' }}>
                  {liveToast.noPengajuan || 'Pendaftaran Online'} • {liveToast.waktu}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLiveToast(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '2px',
                lineHeight: 1,
              }}
              title="Tutup Notifikasi"
            >
              ✕
            </button>
          </div>

          <div
            style={{
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              padding: '8px 12px',
              border: '1px solid #F1F5F9',
              fontSize: '0.78rem',
            }}
          >
            <div style={{ fontWeight: 800, color: '#0F172A' }}>
              {liveToast.nama}
            </div>
            <div style={{ color: '#475569', fontSize: '0.72rem', marginTop: '2px' }}>
              {liveToast.program} • Konsjen {liveToast.konsjen}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => {
                handleSelectPengajuan(liveToast.id);
                setLiveToast(null);
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                backgroundColor: '#0284C7',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)',
              }}
            >
              <span>Lihat Detail Pengajuan</span>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
