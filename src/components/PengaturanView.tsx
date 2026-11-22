import React, { useState, useEffect, useMemo } from 'react';
import { mockKonsjen } from '../data/mockData';
import type { StaffMaster, KonsjenKota, StaffFeedback, Pengajuan } from '../types';
import { kirimPesanWA } from '../whatsapp';
import { getStoredFeedback, saveFeedbackList } from './StaffFeedbackModal';
import { ALL_INDONESIA_PAYMENT_GROUPS, normalizeBankSelection, isEWallet } from '../data/bankData';
import {
  getVisaPricingList,
  saveVisaPricingList,
  resetVisaPricingList,
  deleteVisaPricingFromDB,
  type VisaPricingItem,
} from '../utils/visaPricing';

interface PengaturanViewProps {
  isOwner?: boolean;
  staffList?: StaffMaster[];
  currentStaff?: StaffMaster | null;
  onUpdateStaffList?: (list: StaffMaster[]) => void;
  pengajuanList?: Pengajuan[];
  onUpdatePengajuanList?: (list: Pengajuan[]) => void;
}

export const PengaturanView: React.FC<PengaturanViewProps> = ({
  isOwner = false,
  staffList = [],
  currentStaff = null,
  onUpdateStaffList,
}) => {
  const [activeTab, setActiveTab] = useState<'staff' | 'konsjen' | 'tarif' | 'profile' | 'feedback'>(() => (isOwner ? 'staff' : 'konsjen'));
  const [feedbackList, setFeedbackList] = useState<StaffFeedback[]>(() => getStoredFeedback());
  const [forumSubTab, setForumSubTab] = useState<'forum' | 'teman'>('forum');
  const [inlineFeedbackText, setInlineFeedbackText] = useState('');
  const [expandedComments, setExpandedComments] = useState<{ [id: string]: boolean }>({});
  const [likedPosts, setLikedPosts] = useState<{ [id: string]: boolean }>({});
  const [replyInputs, setReplyInputs] = useState<{ [id: string]: string }>({});

  // Master Tarif & Biaya Visa State
  const [pricingList, setPricingList] = useState<VisaPricingItem[]>(() => getVisaPricingList());
  const [searchPricing, setSearchPricing] = useState('');
  const [pricingCategoryFilter, setPricingCategoryFilter] = useState<string>('semua');
  const [pricingSaveSuccess, setPricingSaveSuccess] = useState(false);
  const [showAddVisaModal, setShowAddVisaModal] = useState(false);
  const [editingVisa, setEditingVisa] = useState<VisaPricingItem | null>(null);
  const [newVisaTitle, setNewVisaTitle] = useState('');
  const [newVisaCategory, setNewVisaCategory] = useState<string>('turis');
  const [newVisaBadge, setNewVisaBadge] = useState<string>('Paling Populer');
  const [newVisaSubtitle, setNewVisaSubtitle] = useState('');
  const [newVisaDesc, setNewVisaDesc] = useState('');
  const [newVisaDuration, setNewVisaDuration] = useState('15-90 Hari');
  const [newVisaReguler, setNewVisaReguler] = useState<number>(1000000);
  const [newVisaPremium, setNewVisaPremium] = useState<number>(1250000);
  const [newVisaTac, setNewVisaTac] = useState<number>(1500000);
  const [newVisaKeterangan, setNewVisaKeterangan] = useState('');

  // Sinkronisasi otomatis saat master tarif diperbarui di halaman / tab lain
  useEffect(() => {
    const handlePricesUpdated = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setPricingList(e.detail);
      }
    };
    window.addEventListener('mapahtrip:visa-prices-updated', handlePricesUpdated);
    return () => {
      window.removeEventListener('mapahtrip:visa-prices-updated', handlePricesUpdated);
    };
  }, []);

  // Owner WhatsApp & Notification Settings (Tersimpan di localStorage)
  const [ownerWa, setOwnerWa] = useState<string>(() => {
    if (typeof window === 'undefined') return '081214104332';
    return localStorage.getItem('mapahtrip_owner_wa') || '081214104332';
  });
  const [ownerName, setOwnerName] = useState<string>(() => {
    if (typeof window === 'undefined') return 'Owner MapahTrip';
    return localStorage.getItem('mapahtrip_owner_name') || 'Owner MapahTrip';
  });
  const [ownerNotify, setOwnerNotify] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('mapahtrip_owner_notify') !== 'false';
  });
  const [ownerSaveMsg, setOwnerSaveMsg] = useState<string | null>(null);
  const [isSendingTestWa, setIsSendingTestWa] = useState(false);

  // Pastikan staf non-owner tidak dapat mengakses tab tarif atau kelola staf
  useEffect(() => {
    if (!isOwner && (activeTab === 'tarif' || activeTab === 'staff')) {
      setActiveTab('konsjen');
    }
  }, [isOwner, activeTab]);

  const getAvatarInisial = (nama: string) => {
    const clean = nama.trim().toLowerCase();
    const match = staffList.find((s) => s.nama.toLowerCase() === clean);
    if (match?.inisial) return match.inisial;
    if (clean.includes('admin') || clean.includes('owner')) return 'AD';
    if (clean === 'rizky') return 'RZ';
    if (clean.includes('nanami')) return 'NK';
    if (clean === 'yulia') return 'YL';
    if (clean === 'heru') return 'HR';
    if (clean === 'latifah') return 'LT';
    const parts = nama.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return nama.slice(0, 2).toUpperCase();
  };

  const handleSaveOwnerSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanWa = ownerWa.trim().replace(/[^0-9]/g, '');
    localStorage.setItem('mapahtrip_owner_wa', cleanWa);
    localStorage.setItem('mapahtrip_owner_name', ownerName.trim());
    localStorage.setItem('mapahtrip_owner_notify', ownerNotify ? 'true' : 'false');
    setOwnerSaveMsg('Pengaturan kontak & notifikasi WhatsApp Owner berhasil disimpan!');
    setTimeout(() => setOwnerSaveMsg(null), 4000);
  };

  const handleTestWaOwner = async () => {
    const cleanWa = ownerWa.trim().replace(/[^0-9]/g, '');
    if (!cleanWa || cleanWa.length < 8) {
      alert('Masukkan nomor WhatsApp Owner yang valid terlebih dahulu (minimal 8 digit angka).');
      return;
    }
    setIsSendingTestWa(true);
    try {
      const nowStr = new Date().toLocaleString('id-ID');
      const testMsg = `*TES GATEWAY WA OWNER* 👑📱\n\nHalo *${ownerName || 'Owner'}*, nomor WhatsApp Anda (*${cleanWa}*) berhasil terhubung ke sistem MapahTrip.\nNotifikasi pemohon baru & berkas tiba akan otomatis masuk ke nomor ini.\n\nWaktu: ${nowStr}`;
      await kirimPesanWA(cleanWa, testMsg);
      alert(`Pesan uji coba WhatsApp berhasil dikirimkan ke nomor ${cleanWa}! Silakan periksa chat WhatsApp Anda.`);
    } catch (err) {
      alert(`Gagal mengirim WhatsApp uji coba: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSendingTestWa(false);
    }
  };

  // Staff Modal State
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [showPins, setShowPins] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    nama: '',
    inisial: '',
    username: '',
    email: '',
    noWa: '',
    pin: '1234',
    role: 'Staff PIC Lapangan',
    konsjenTugas: ['Jakarta'] as KonsjenKota[],
    defaultFeePerPaspor: 50000,
    aktif: true,
    bankName: 'Bank Central Asia (BCA)',
    customBankName: '',
    noRekening: '',
    atasNamaRekening: '',
  });

  const availableKonsjen: KonsjenKota[] = ['Jakarta', 'Surabaya', 'Denpasar', 'Medan', 'Makassar'];

  const handleOpenAddModal = () => {
    setEditingStaffId(null);
    setFormData({
      nama: '',
      inisial: '',
      username: '',
      email: '',
      noWa: '',
      pin: '1234',
      role: 'Staff PIC Lapangan',
      konsjenTugas: ['Jakarta'],
      defaultFeePerPaspor: 50000,
      aktif: true,
      bankName: 'Bank Central Asia (BCA)',
      customBankName: '',
      noRekening: '',
      atasNamaRekening: '',
    });
    setIsStaffModalOpen(true);
  };

  const handleOpenEditModal = (staff: StaffMaster) => {
    setEditingStaffId(staff.id);
    const normalizedBank = normalizeBankSelection(staff.bankName || 'BCA');
    const isCustom = normalizedBank === 'Lainnya (Ketik Manual)';
    setFormData({
      nama: staff.nama,
      inisial: staff.inisial,
      username: staff.username || staff.nama.toLowerCase().replace(/\s+/g, ''),
      email: staff.email || `${staff.nama.toLowerCase().replace(/\s+/g, '')}@mapahtrip.id`,
      noWa: staff.noWa || '',
      pin: staff.pin || '1234',
      role: staff.role,
      konsjenTugas: staff.konsjenTugas,
      defaultFeePerPaspor: staff.defaultFeePerPaspor !== undefined ? staff.defaultFeePerPaspor : 50000,
      aktif: staff.aktif,
      bankName: normalizedBank,
      customBankName: isCustom ? (staff.bankName || '') : '',
      noRekening: staff.noRekening && staff.noRekening !== '-' ? staff.noRekening : '',
      atasNamaRekening: staff.atasNamaRekening || staff.nama || '',
    });
    setIsStaffModalOpen(true);
  };

  const handleToggleKonsjen = (city: KonsjenKota) => {
    setFormData((prev) => {
      const exists = prev.konsjenTugas.includes(city);
      if (exists) {
        if (prev.konsjenTugas.length === 1) return prev; // Minimal 1 konsjen
        return { ...prev, konsjenTugas: prev.konsjenTugas.filter((c) => c !== city) };
      } else {
        return { ...prev, konsjenTugas: [...prev.konsjenTugas, city] };
      }
    });
  };

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim()) return;

    const inisial =
      formData.inisial.trim() ||
      formData.nama
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const username = formData.username.trim() || formData.nama.toLowerCase().replace(/\s+/g, '');
    const email = formData.email.trim() || `${username}@mapahtrip.id`;

    const finalBankName = (formData.bankName === 'Lainnya (Ketik Manual)' || formData.bankName === 'Lainnya')
      ? (formData.customBankName.trim() || 'Lainnya')
      : formData.bankName.trim();
    const finalNoRek = formData.noRekening.trim();
    const finalAtasNama = formData.atasNamaRekening.trim() || formData.nama.trim();

    let updatedList: StaffMaster[] = [];

    if (editingStaffId) {
      // Update existing
      updatedList = staffList.map((s) => {
        if (s.id === editingStaffId) {
          return {
            ...s,
            nama: formData.nama.trim(),
            inisial,
            username,
            email,
            noWa: formData.noWa.trim(),
            pin: formData.pin.trim() || '1234',
            role: formData.role.trim(),
            konsjenTugas: formData.konsjenTugas,
            defaultFeePerPaspor: formData.defaultFeePerPaspor,
            aktif: formData.aktif,
            bankName: finalBankName,
            noRekening: finalNoRek,
            atasNamaRekening: finalAtasNama,
          };
        }
        return s;
      });
    } else {
      // Create new staff
      const newStaff: StaffMaster = {
        id: `staff-${Date.now()}`,
        nama: formData.nama.trim(),
        inisial,
        username,
        email,
        noWa: formData.noWa.trim(),
        pin: formData.pin.trim() || '1234',
        role: formData.role.trim() || 'Staff PIC Lapangan',
        konsjenTugas: formData.konsjenTugas,
        defaultFeePerPaspor: formData.defaultFeePerPaspor,
        aktif: formData.aktif,
        bankName: finalBankName,
        noRekening: finalNoRek,
        atasNamaRekening: finalAtasNama,
      };
      updatedList = [...staffList, newStaff];
    }

    if (onUpdateStaffList) {
      onUpdateStaffList(updatedList);
    }
    setIsStaffModalOpen(false);
  };

  const handleDeleteStaff = (id: string, nama: string) => {
    if (staffList.length <= 1) {
      alert('Tidak dapat menghapus staf terakhir. Minimal harus ada 1 staf aktif.');
      return;
    }
    if (window.confirm(`Yakin ingin menghapus akun staf ${nama}?`)) {
      const updatedList = staffList.filter((s) => s.id !== id);
      if (onUpdateStaffList) {
        onUpdateStaffList(updatedList);
      }
    }
  };

  const handleToggleAktif = (id: string) => {
    const updatedList = staffList.map((s) => (s.id === id ? { ...s, aktif: !s.aktif } : s));
    if (onUpdateStaffList) {
      onUpdateStaffList(updatedList);
    }
  };

  // Helper & Handlers Master Tarif & Biaya Visa
  const formatRupiah = (val: number) => 'Rp ' + (val || 0).toLocaleString('id-ID');

  const handleUpdatePrice = (id: string, field: 'regulerPrice' | 'premiumPrice' | 'tacPrice', val: number) => {
    setPricingList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: Math.max(0, val) } : item))
    );
  };

  const handleSavePricing = () => {
    saveVisaPricingList(pricingList);
    setPricingSaveSuccess(true);
    setTimeout(() => setPricingSaveSuccess(false), 4500);
  };

  const handleResetPricing = () => {
    if (window.confirm('Kembalikan seluruh daftar harga visa ke konfigurasi standar default MapahTrip?')) {
      const def = resetVisaPricingList();
      setPricingList(def);
      setPricingSaveSuccess(true);
      setTimeout(() => setPricingSaveSuccess(false), 4500);
    }
  };

  const handleOpenAddVisa = () => {
    setEditingVisa(null);
    setNewVisaTitle('');
    setNewVisaCategory('turis');
    setNewVisaBadge('Paling Populer');
    setNewVisaSubtitle('');
    setNewVisaDesc('');
    setNewVisaDuration('15-90 Hari');
    setNewVisaReguler(1000000);
    setNewVisaPremium(1250000);
    setNewVisaTac(1500000);
    setNewVisaKeterangan('');
    setShowAddVisaModal(true);
  };

  const handleOpenEditVisa = (item: VisaPricingItem) => {
    setEditingVisa(item);
    setNewVisaTitle(item.title);
    setNewVisaCategory(item.category || 'turis');
    setNewVisaBadge(item.topRightBadge || '');
    setNewVisaSubtitle(item.subtitle || '');
    setNewVisaDesc(item.desc || item.keterangan || '');
    setNewVisaDuration(item.durationPill || '15-90 Hari');
    setNewVisaReguler(item.regulerPrice || 0);
    setNewVisaPremium(item.premiumPrice || 0);
    setNewVisaTac(item.tacPrice || 0);
    setNewVisaKeterangan(item.keterangan || '');
    setShowAddVisaModal(true);
  };

  const handleCategoryChange = (cat: string) => {
    setNewVisaCategory(cat);
    const defaultBadges: Record<string, string> = {
      turis: 'Paling Populer',
      kerja: 'Kerja Formal',
      magang: 'Pemagangan',
      studi: 'Long Stay',
      transit: 'Transit',
      keluarga: 'Keluarga',
      bisnis: 'Business',
      medis: 'Medical',
      khusus: 'Aktivitas Khusus',
    };
    if (defaultBadges[cat]) {
      setNewVisaBadge(defaultBadges[cat]);
    }
  };

  const handleSaveVisa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVisaTitle.trim()) {
      alert('Nama jenis visa wajib diisi.');
      return;
    }
    let updated: VisaPricingItem[];
    if (editingVisa) {
      updated = pricingList.map((item) =>
        item.id === editingVisa.id
          ? {
              ...item,
              title: newVisaTitle.trim(),
              category: newVisaCategory,
              topRightBadge: newVisaBadge.trim() || undefined,
              subtitle: newVisaSubtitle.trim() || undefined,
              desc: newVisaDesc.trim() || undefined,
              durationPill: newVisaDuration.trim() || undefined,
              regulerPrice: Number(newVisaReguler) || 0,
              premiumPrice: Number(newVisaPremium) || 0,
              tacPrice: Number(newVisaTac) || 0,
              keterangan: newVisaDesc.trim() || newVisaKeterangan.trim() || undefined,
            }
          : item
      );
    } else {
      const newItem: VisaPricingItem = {
        id: `visa-${Date.now()}`,
        title: newVisaTitle.trim(),
        category: newVisaCategory,
        topRightBadge: newVisaBadge.trim() || undefined,
        subtitle: newVisaSubtitle.trim() || undefined,
        desc: newVisaDesc.trim() || undefined,
        durationPill: newVisaDuration.trim() || undefined,
        regulerPrice: Number(newVisaReguler) || 0,
        premiumPrice: Number(newVisaPremium) || 0,
        tacPrice: Number(newVisaTac) || 0,
        keterangan: newVisaDesc.trim() || newVisaKeterangan.trim() || undefined,
        isCustom: true,
      };
      updated = [...pricingList, newItem];
    }
    setPricingList(updated);
    saveVisaPricingList(updated);
    setShowAddVisaModal(false);
    setEditingVisa(null);
    setNewVisaTitle('');
    setNewVisaKeterangan('');
    setNewVisaSubtitle('');
    setNewVisaDesc('');
    setPricingSaveSuccess(true);
    setTimeout(() => setPricingSaveSuccess(false), 4500);
  };

  const handleDeleteVisa = (id: string, title?: string) => {
    const nama = title ? ` "${title}"` : '';
    if (!window.confirm(`Hapus jenis visa${nama} dari daftar tarif?`)) return;
    const updated = pricingList.filter((item) => item.id !== id);
    setPricingList(updated);
    saveVisaPricingList(updated);
    deleteVisaPricingFromDB(id).catch(() => {});
  };

  const filteredPricingList = useMemo(() => {
    return pricingList.filter((item) => {
      const matchCat = pricingCategoryFilter === 'semua' || item.category === pricingCategoryFilter;
      const q = searchPricing.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        (item.keterangan && item.keterangan.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [pricingList, pricingCategoryFilter, searchPricing]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div className="pengaturan-header-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="font-serif pengaturan-main-title" style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>
            {isOwner ? 'Pengaturan & Akun Staf' : 'Pengaturan & Informasi Operasional'}
          </h1>
          <p className="pengaturan-main-desc" style={{ color: '#64748B', fontSize: '0.85rem', margin: 0 }}>
            {isOwner
              ? 'Kelola akun operasional ke-6 staf konsuler, hak akses PIN login, dan master data tarif konsulat.'
              : 'Direktori operasional konsuler Konsulat Jenderal Jepang se-Indonesia.'}
          </p>
        </div>

        {/* Tab Switcher (Wrapped with smooth horizontal scroll container on mobile) */}
        <div className="pengaturan-tabs-wrapper">
          <div className="pengaturan-tabs-bar" style={{ display: 'inline-flex', backgroundColor: '#F1F5F9', padding: '4px', borderRadius: '10px', gap: '4px', flexShrink: 0 }}>
            {isOwner ? (
            <>
              <button
                type="button"
                className="pengaturan-tab-btn"
                onClick={() => setActiveTab('staff')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: activeTab === 'staff' ? '#FFFFFF' : 'transparent',
                  color: activeTab === 'staff' ? '#0F172A' : '#64748B',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: activeTab === 'staff' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>badge</span>
                <span>Kelola Staf ({staffList.length})</span>
              </button>
              <button
                type="button"
                className="pengaturan-tab-btn"
                onClick={() => setActiveTab('konsjen')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: activeTab === 'konsjen' ? '#FFFFFF' : 'transparent',
                  color: activeTab === 'konsjen' ? '#0F172A' : '#64748B',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: activeTab === 'konsjen' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>domain</span>
                <span>Master Konsjen</span>
              </button>
              <button
                type="button"
                className="pengaturan-tab-btn"
                onClick={() => setActiveTab('tarif')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: activeTab === 'tarif' ? '#FFFFFF' : 'transparent',
                  color: activeTab === 'tarif' ? '#0F172A' : '#64748B',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: activeTab === 'tarif' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#16A34A' }}>payments</span>
                <span>Tarif &amp; Biaya Visa ({pricingList.length})</span>
              </button>
              <button
                type="button"
                className="pengaturan-tab-btn"
                onClick={() => setActiveTab('profile')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: activeTab === 'profile' ? '#FFFFFF' : 'transparent',
                  color: activeTab === 'profile' ? '#0F172A' : '#64748B',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: activeTab === 'profile' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>admin_panel_settings</span>
                <span>Profil &amp; Kontak Owner</span>
              </button>
              <button
                type="button"
                className="pengaturan-tab-btn"
                onClick={() => setActiveTab('feedback')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: activeTab === 'feedback' ? '#FFFFFF' : 'transparent',
                  color: activeTab === 'feedback' ? '#0F172A' : '#64748B',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: activeTab === 'feedback' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#0F3D82' }}>forum</span>
                <span>Forum Komunikasi</span>
                {feedbackList.filter(f => f.status === 'Baru').length > 0 && (
                  <span style={{ backgroundColor: '#EF4444', color: '#FFFFFF', padding: '1px 6px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: 800 }}>
                    {feedbackList.filter(f => f.status === 'Baru').length}
                  </span>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="pengaturan-tab-btn"
                onClick={() => setActiveTab('konsjen')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: activeTab === 'konsjen' ? '#FFFFFF' : 'transparent',
                  color: activeTab === 'konsjen' ? '#0F172A' : '#64748B',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: activeTab === 'konsjen' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>domain</span>
                <span>Master Konsjen</span>
              </button>
              <button
                type="button"
                className="pengaturan-tab-btn"
                onClick={() => setActiveTab('profile')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: activeTab === 'profile' ? '#FFFFFF' : 'transparent',
                  color: activeTab === 'profile' ? '#0F172A' : '#64748B',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: activeTab === 'profile' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>account_circle</span>
                <span>Profil Akun</span>
              </button>
              <button
                type="button"
                className="pengaturan-tab-btn"
                onClick={() => setActiveTab('feedback')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: activeTab === 'feedback' ? '#FFFFFF' : 'transparent',
                  color: activeTab === 'feedback' ? '#0F172A' : '#64748B',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: activeTab === 'feedback' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#0F3D82' }}>forum</span>
                <span>Forum Komunikasi</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>

      {/* TAB 1: KELOLA AKUN STAF (Owner Only) */}
      {activeTab === 'staff' && isOwner && (
        <div className="card pengaturan-card" style={{ padding: '16px 18px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                Daftar Akun Staf Operasional &amp; Hak Akses
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B' }}>
                {isOwner
                  ? 'Sebagai Owner, Anda dapat membuat akun staf baru, mengubah PIN, dan mengatur wilayah tugas PIC.'
                  : 'Daftar resmi PIC konsuler MapahTrip di seluruh wilayah Indonesia.'}
              </p>
            </div>

            <div className="pengaturan-staff-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isOwner && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowPins(!showPins)}
                    style={{
                      backgroundColor: showPins ? '#EFF6FF' : '#F8FAFC',
                      color: showPins ? '#1D4ED8' : '#475569',
                      border: '1px solid #CBD5E1',
                      padding: '7px 12px',
                      borderRadius: '8px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                      {showPins ? 'visibility_off' : 'visibility'}
                    </span>
                    <span>{showPins ? 'Sembunyikan PIN' : 'Tampilkan PIN'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenAddModal}
                    style={{
                      backgroundColor: '#005BB5',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 8px rgba(0, 91, 181, 0.25)',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>person_add</span>
                    <span>+ Buat Akun Staf</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="pengaturan-desktop-staff-table data-table-container" style={{ overflowX: 'auto', width: '100%' }}>
            <table className="data-table" style={{ fontSize: '0.74rem', width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ width: '28px', textAlign: 'center', whiteSpace: 'nowrap', padding: '7px 4px' }}>No</th>
                  <th style={{ whiteSpace: 'nowrap', padding: '7px 6px', textAlign: 'left' }}>Nama Staf</th>
                  <th style={{ whiteSpace: 'nowrap', padding: '7px 6px', textAlign: 'left' }}>Kontak &amp; WA</th>
                  <th style={{ whiteSpace: 'nowrap', padding: '7px 6px', textAlign: 'left' }}>Rekening Payout</th>
                  {isOwner && <th style={{ textAlign: 'center', width: '45px', whiteSpace: 'nowrap', padding: '7px 4px' }}>PIN</th>}
                  <th style={{ whiteSpace: 'nowrap', padding: '7px 6px', textAlign: 'left' }}>Role</th>
                  <th style={{ whiteSpace: 'nowrap', padding: '7px 6px', textAlign: 'left' }}>Konsulat</th>
                  <th style={{ textAlign: 'center', width: '52px', whiteSpace: 'nowrap', padding: '7px 4px' }}>Status</th>
                  {isOwner && <th style={{ textAlign: 'center', width: '62px', whiteSpace: 'nowrap', padding: '7px 4px' }}>Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {staffList.map((staf, idx) => (
                  <tr key={staf.id} style={{ opacity: staf.aktif ? 1 : 0.6 }}>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#64748B', padding: '6px 4px' }}>
                      {idx + 1}
                    </td>

                    <td style={{ padding: '6px 6px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: staf.aktif ? '#EFF6FF' : '#F1F5F9',
                            color: staf.aktif ? '#005BB5' : '#64748B',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            flexShrink: 0,
                            border: '1px solid #CBD5E1',
                          }}
                        >
                          {staf.inisial}
                        </div>
                        <div>
                          <strong style={{ color: '#0F172A', display: 'block', fontSize: '0.75rem', lineHeight: 1.15 }}>{staf.nama}</strong>
                          <span style={{ fontSize: '0.60rem', color: '#64748B' }}>ID: {staf.id}</span>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '6px 6px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontFamily: 'monospace', fontSize: '0.70rem', color: '#0F172A', fontWeight: 700 }}>
                        {staf.username || staf.nama.toLowerCase().replace(/\s+/g, '')}
                      </div>
                      {staf.noWa ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '1px', backgroundColor: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', padding: '1px 4px', borderRadius: '3px', fontSize: '0.62rem', fontWeight: 700 }}>
                          <span>💬</span>
                          <span>{staf.noWa}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.60rem', color: '#94A3B8', fontStyle: 'italic' }}>-</span>
                      )}
                    </td>

                    {/* Rekening Tujuan Payout (Hanya Tampilan, Edit melalui Aksi Owner di Ujung) */}
                    <td style={{ padding: '6px 6px', whiteSpace: 'nowrap' }}>
                      {staf.noRekening && staf.noRekening !== '-' && staf.noRekening !== '' ? (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', padding: '1px 4px', borderRadius: '3px', fontSize: '0.62rem', fontWeight: 800 }}>
                              {isEWallet(staf.bankName || '') ? '📱 ' : ''}{staf.bankName || 'BCA'}
                            </span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0F172A', fontSize: '0.72rem' }}>
                              {staf.noRekening}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.60rem', color: '#64748B', marginTop: '1px' }}>
                            a.n. {staf.atasNamaRekening || staf.nama}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: '#94A3B8', fontSize: '0.66rem', fontStyle: 'italic' }}>- Belum Ada -</span>
                      )}
                    </td>

                    {isOwner && (
                      <td style={{ textAlign: 'center', padding: '6px 4px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            backgroundColor: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            padding: '2px 4px',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            fontSize: '0.70rem',
                            fontWeight: 800,
                            color: showPins ? '#B45309' : '#64748B',
                          }}
                        >
                          {showPins ? staf.pin || '1234' : '••••'}
                        </span>
                      </td>
                    )}

                    {/* Role */}
                    <td style={{ padding: '6px 6px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 700, color: '#334155', fontSize: '0.72rem' }}>{staf.role}</span>
                    </td>

                    {/* Konsulat / Wilayah */}
                    <td style={{ padding: '6px 6px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                        {staf.konsjenTugas.map((t) => (
                          <span
                            key={t}
                            style={{
                              display: 'inline-block',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: '#F1F5F9',
                              border: '1px solid #E2E8F0',
                              fontSize: '0.64rem',
                              fontWeight: 700,
                              color: '#334155',
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td style={{ textAlign: 'center', padding: '6px 4px', whiteSpace: 'nowrap' }}>
                      <span
                        className={staf.aktif ? 'badge badge-success' : 'badge badge-neutral'}
                        style={{ cursor: isOwner ? 'pointer' : 'default', padding: '2px 5px', fontSize: '0.64rem' }}
                        onClick={() => isOwner && handleToggleAktif(staf.id)}
                        title={isOwner ? 'Klik untuk toggle status aktif' : undefined}
                      >
                        {staf.aktif ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>

                    {isOwner && (
                      <td style={{ textAlign: 'center', padding: '6px 4px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '3px', alignItems: 'center', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(staf)}
                            title="Edit Akun, Rekening & PIN"
                            style={{
                              backgroundColor: '#EFF6FF',
                              color: '#005BB5',
                              border: '1px solid #BFDBFE',
                              padding: '3px 5px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteStaff(staf.id, staf.nama)}
                            title="Hapus Akun Staf"
                            style={{
                              backgroundColor: '#FEF2F2',
                              color: '#DC2626',
                              border: '1px solid #FECACA',
                              padding: '3px 5px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>delete</span>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Staff Cards View */}
          <div className="pengaturan-mobile-staff-list" style={{ display: 'none', flexDirection: 'column', gap: '10px' }}>
            {staffList.map((staf) => (
              <div
                key={staf.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  opacity: staf.aktif ? 1 : 0.65,
                }}
              >
                {/* Row 1: Avatar, Nama, Role, Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        minWidth: '38px',
                        minHeight: '38px',
                        maxWidth: '38px',
                        maxHeight: '38px',
                        aspectRatio: '1 / 1',
                        borderRadius: '50%',
                        backgroundColor: staf.aktif ? '#EFF6FF' : '#F1F5F9',
                        color: staf.aktif ? '#005BB5' : '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        flexShrink: 0,
                        border: '1.5px solid #CBD5E1',
                      }}
                    >
                      {staf.inisial}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {staf.nama}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '1px' }}>
                        {staf.role}
                      </div>
                    </div>
                  </div>
                  <span
                    className={staf.aktif ? 'badge badge-success' : 'badge badge-neutral'}
                    style={{ cursor: isOwner ? 'pointer' : 'default', flexShrink: 0, fontSize: '0.68rem', padding: '3px 9px', borderRadius: '999px' }}
                    onClick={() => isOwner && handleToggleAktif(staf.id)}
                    title={isOwner ? 'Klik untuk toggle status aktif' : undefined}
                  >
                    {staf.aktif ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                {/* Row 2: Detail Akun (Username, WA, Rekening & PIN) */}
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: '10px',
                    padding: '9px 12px',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#64748B', fontSize: '0.70rem', flexShrink: 0 }}>Login / User:</span>
                    <span style={{ fontWeight: 700, color: '#0F172A', fontFamily: 'monospace', fontSize: '0.74rem', textAlign: 'right', wordBreak: 'break-all' }}>
                      {staf.username || staf.nama.toLowerCase().replace(/\s+/g, '')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#64748B', fontSize: '0.70rem', flexShrink: 0 }}>No. WhatsApp:</span>
                    <span style={{ fontWeight: 700, color: staf.noWa ? '#047857' : '#94A3B8', fontSize: '0.74rem', textAlign: 'right', wordBreak: 'break-all' }}>
                      {staf.noWa ? `💬 ${staf.noWa}` : 'Belum diisi'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderTop: '1px dashed #E2E8F0', paddingTop: '5px' }}>
                    <span style={{ color: '#64748B', fontSize: '0.68rem' }}>Rekening Payout:</span>
                    <span style={{ fontWeight: 700, color: staf.noRekening ? '#0F172A' : '#94A3B8', fontSize: '0.74rem', wordBreak: 'break-all' }}>
                      {staf.noRekening ? `${staf.bankName || 'BCA'} • ${staf.noRekening}` : 'Belum diisi'}
                    </span>
                  </div>

                  {isOwner && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', borderTop: '1px dashed #E2E8F0', paddingTop: '5px' }}>
                      <span style={{ color: '#64748B', fontSize: '0.70rem', flexShrink: 0 }}>PIN Akses:</span>
                      <span
                        style={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontFamily: 'monospace',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          color: showPins ? '#B45309' : '#475569',
                          letterSpacing: showPins ? '0.05em' : '0.15em',
                        }}
                      >
                        {showPins ? staf.pin || '1234' : '••••'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Row 3: Penugasan Konsjen */}
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                    Wilayah Penugasan:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {staf.konsjenTugas.map((t) => (
                      <span
                        key={t}
                        style={{
                          display: 'inline-block',
                          padding: '2px 7px',
                          borderRadius: '5px',
                          background: '#EFF6FF',
                          border: '1px solid #BFDBFE',
                          fontSize: '0.70rem',
                          fontWeight: 700,
                          color: '#1D4ED8',
                        }}
                      >
                        Konsjen {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Row 4: Aksi Owner */}
                {isOwner && (
                  <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '8px', marginTop: '2px' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(staf)}
                      style={{
                        flex: 1,
                        backgroundColor: '#EFF6FF',
                        color: '#005BB5',
                        border: '1px solid #BFDBFE',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>edit</span>
                      <span>Edit Akun & PIN</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteStaff(staf.id, staf.nama)}
                      style={{
                        backgroundColor: '#FEF2F2',
                        color: '#DC2626',
                        border: '1px solid #FECACA',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                      }}
                      title="Hapus Akun Staf"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>delete</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}


      {/* TAB 3: PROFIL & KONTAK OWNER (Owner Mode) */}
      {activeTab === 'profile' && isOwner && (
        <div className="card pengaturan-card" style={{ padding: '26px', borderRadius: '16px', maxWidth: '780px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '22px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                minWidth: '56px',
                minHeight: '56px',
                maxWidth: '56px',
                maxHeight: '56px',
                aspectRatio: '1 / 1',
                flexShrink: 0,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0F172A, #1E293B)',
                color: '#F59E0B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '26px',
                border: '2px solid #F59E0B',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)',
              }}
            >
              👑
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
                  {ownerName || 'Owner MapahTrip'}
                </h3>
                <span
                  style={{
                    backgroundColor: '#FEF3C7',
                    color: '#B45309',
                    border: '1px solid #FDE68A',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Eksekutif / Pemilik Usaha
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748B', lineHeight: 1.4 }}>
                Akses Penuh: Finansial, Keuangan, Rekapitulasi, Penetapan Staf Wilayah, &amp; Notifikasi Pendaftaran
              </p>
            </div>
          </div>

          {ownerSaveMsg && (
            <div
              style={{
                backgroundColor: '#DCFCE7',
                color: '#15803D',
                border: '1.5px solid #86EFAC',
                padding: '12px 16px',
                borderRadius: '10px',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '20px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>check_circle</span>
              <span>{ownerSaveMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveOwnerSettings} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Nama Lengkap Owner / Brand *
                </label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Contoh: Owner MapahTrip"
                  style={{
                    width: '100%',
                    padding: '9px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Nomor WhatsApp Owner (Notifikasi Masuk) *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    value={ownerWa}
                    onChange={(e) => setOwnerWa(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Contoh: 081214104332"
                    style={{
                      width: '100%',
                      padding: '9px 14px 9px 38px',
                      borderRadius: '8px',
                      border: '1.5px solid #16A34A',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#0F172A',
                      boxSizing: 'border-box',
                      fontFamily: 'monospace',
                    }}
                  />
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px' }}>
                    💬
                  </span>
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <input
                type="checkbox"
                id="ownerNotifyToggleFull"
                checked={ownerNotify}
                onChange={(e) => setOwnerNotify(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <div>
                <label htmlFor="ownerNotifyToggleFull" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', cursor: 'pointer', display: 'block' }}>
                  Kirim Notifikasi WhatsApp ke Owner Setiap Ada Pendaftaran Baru
                </label>
                <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                  Jika dicentang, nomor WhatsApp di atas akan menerima ringkasan pendaftaran dari seluruh 5 konsulat wilayah.
                </span>
              </div>
            </div>

            {/* Skema 4 Pihak Notifikasi WA MapahTrip */}
            <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#166534', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>hub</span>
                <span>Alur Otomatisasi Notifikasi WhatsApp MapahTrip (4 Pihak)</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.75rem', color: '#14532D', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li><strong>1. Pemohon / Customer:</strong> Menerima ID pengajuan, petunjuk pengiriman berkas 4 langkah, &amp; rekening Bank BTN jika berkas tiba.</li>
                <li><strong>2. Admin / Staf Lapangan PIC:</strong> Menerima rincian berkas pemohon yang masuk sesuai wilayah konsjen tugasnya.</li>
                <li><strong>3. Mitra Referral / Affiliate:</strong> Menerima notifikasi pendaftar baru yang menggunakan kode referalnya beserta estimasi bonus Rp 100.000.</li>
                <li><strong>4. Owner MapahTrip:</strong> Menerima ringkasan eksekutif seluruh pendaftaran secara real-time dari seluruh wilayah Indonesia.</li>
              </ul>
            </div>

            <div className="pengaturan-owner-actions-row" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                className="pengaturan-owner-test-btn"
                onClick={handleTestWaOwner}
                disabled={isSendingTestWa}
                style={{
                  backgroundColor: '#EFF6FF',
                  color: '#1D4ED8',
                  border: '1px solid #BFDBFE',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  cursor: isSendingTestWa ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  {isSendingTestWa ? 'hourglass_top' : 'send_to_mobile'}
                </span>
                <span>{isSendingTestWa ? 'Mengirim Pesan...' : 'Uji Coba Pengiriman WA'}</span>
              </button>

              <button
                type="submit"
                className="pengaturan-owner-save-btn"
                style={{
                  backgroundColor: '#16A34A',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '10px 22px',
                  borderRadius: '8px',
                  fontSize: '0.80rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>save</span>
                <span>Simpan Pengaturan Owner</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: PROFIL SAYA (Staff Mode) */}
      {activeTab === 'profile' && !isOwner && (
        <div className="card pengaturan-card pengaturan-profile-card" style={{ padding: '24px', borderRadius: '16px', maxWidth: '640px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                minWidth: '54px',
                minHeight: '54px',
                maxWidth: '54px',
                maxHeight: '54px',
                aspectRatio: '1 / 1',
                flexShrink: 0,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2b68e0, #004fc0)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 800,
              }}
            >
              {currentStaff?.inisial || 'RZ'}
            </div>
            <div>
              <h3 style={{ margin: '0 0 2px', fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
                {currentStaff?.nama || 'Rizky'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B' }}>
                {currentStaff?.role || 'Staff PIC Jakarta'} &bull; <span style={{ color: '#16A34A', fontWeight: 700 }}>● Akun Aktif</span>
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '12px 14px', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, marginBottom: '4px' }}>Username Login</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>{currentStaff?.username || 'rizky'}</div>
            </div>

            <div style={{ padding: '12px 14px', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, marginBottom: '4px' }}>Alamat Email</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>{currentStaff?.email || 'rizky@mapahtrip.id'}</div>
            </div>

            <div style={{ padding: '12px 14px', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0', gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, marginBottom: '6px' }}>Wilayah Konsulat Jenderal Penugasan</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {(currentStaff?.konsjenTugas || ['Jakarta', 'Medan']).map((city) => (
                  <span
                    key={city}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      color: '#1D4ED8',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                    }}
                  >
                    Konsjen {city}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '20px', padding: '12px 14px', borderRadius: '10px', background: '#FEF3C7', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-outlined" style={{ color: '#D97706', fontSize: '20px' }}>verified_user</span>
            <span style={{ fontSize: '0.76rem', color: '#92400E' }}>
              Akun Anda terdaftar sebagai PIC operasional resmi MapahTrip. Untuk perubahan hak akses konsuler, silakan berkoordinasi dengan Founder / Owner.
            </span>
          </div>
        </div>
      )}

      {/* TAB 2: MASTER DATA KONSULAT */}
      {activeTab === 'konsjen' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Banner Motivasi & Rekap Pencapaian Staf PIC */}
          <div
            className="pengaturan-achievement-banner"
            style={{
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: '16px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
              boxShadow: '0 2px 8px rgba(22, 101, 52, 0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: '#DCFCE7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#16A34A',
                  flexShrink: 0,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>workspace_premium</span>
              </div>
              {(() => {
                const staffTugasCity = currentStaff?.konsjenTugas?.[0] || 'Jakarta';
                const staffKonsjenData = mockKonsjen.find((k) => k.kota === staffTugasCity) || mockKonsjen[0];
                const staffTotalSelesai = staffKonsjenData?.totalSelesai || 184;
                return (
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span>Kinerja PIC: {currentStaff?.nama || 'Rizky'} ({staffTugasCity})</span>
                      <span style={{ backgroundColor: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: '12px', fontSize: '0.70rem', fontWeight: 800 }}>
                        {staffTotalSelesai} Paspor • 100% Sukses 🏆
                      </span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#15803D', marginTop: '2px' }}>
                      Seluruh <strong>{staffTotalSelesai} berkas visa</strong> di wilayah tugas Anda berhasil terbit 100% tanpa penolakan.
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="pengaturan-achievement-badge" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ textAlign: 'right', borderLeft: '2px solid #BBF7D0', paddingLeft: '14px' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Predikat Staf
                </div>
                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0F172A' }}>
                  🌟 Staff PIC Teladan
                </div>
              </div>
            </div>
          </div>

          <div className="card pengaturan-card" style={{ padding: '20px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                  Master Data Konsulat Jenderal (Konsjen)
                </h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B' }}>
                  Daftar kantor konsuler resmi perwakilan Jepang, staf PIC, dan performa penanganan visa.
                </p>
              </div>
              <span className="badge badge-success" style={{ flexShrink: 0 }}>5 Konsulat Terhubung</span>
            </div>

            {/* Desktop Table View */}
            <div className="pengaturan-desktop-konsjen-table data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kota Konsulat</th>
                    <th>Lokasi Kantor Konsuler</th>
                    <th>Staff PIC Default</th>
                    <th style={{ textAlign: 'center' }}>Pencapaian Handle</th>
                    <th style={{ textAlign: 'center' }}>SLA / Estimasi</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mockKonsjen.map((k) => (
                    <tr key={k.id}>
                      <td style={{ fontWeight: 700, color: '#0F172A' }}>{k.kota}</td>
                      <td>{k.lokasi}</td>
                      <td style={{ fontWeight: 600 }}>{k.staffPicDefault}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            backgroundColor: k.kota === 'Jakarta' ? '#DCFCE7' : '#EFF6FF',
                            color: k.kota === 'Jakarta' ? '#15803D' : '#1D4ED8',
                            fontWeight: 800,
                            fontSize: '0.76rem',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>{k.totalSelesai || 0} Paspor Selesai</span>
                          {k.kota === 'Jakarta' && <span>🏆</span>}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>{k.estimasiHariKerja} Hari Kerja</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-success">Aktif</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Konsjen Cards View */}
            <div className="pengaturan-mobile-konsjen-list" style={{ display: 'none', flexDirection: 'column', gap: '10px' }}>
              {mockKonsjen.map((k) => (
                <div
                  key={k.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#005BB5' }}>
                        domain
                      </span>
                      <span style={{ fontWeight: 800, fontSize: '0.90rem', color: '#0F172A' }}>
                        Konsjen {k.kota}
                      </span>
                    </div>
                    <span className="badge badge-success" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                      Aktif
                    </span>
                  </div>

                  <div style={{ fontSize: '0.74rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#94A3B8' }}>location_on</span>
                    <span>{k.lokasi}</span>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      marginTop: '2px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>Staff PIC Default</div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', marginTop: '1px' }}>
                        {k.staffPicDefault}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>Estimasi SLA</div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', marginTop: '1px' }}>
                        {k.estimasiHariKerja} Hari Kerja
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '6px', fontSize: '0.74rem' }}>
                    <span style={{ color: '#64748B' }}>Pencapaian Handle:</span>
                    <span
                      style={{
                        backgroundColor: k.kota === 'Jakarta' ? '#DCFCE7' : '#EFF6FF',
                        color: k.kota === 'Jakarta' ? '#15803D' : '#1D4ED8',
                        fontWeight: 800,
                        fontSize: '0.72rem',
                        padding: '2px 8px',
                        borderRadius: '10px',
                      }}
                    >
                      {k.totalSelesai || 0} Paspor Selesai {k.kota === 'Jakarta' && '🏆'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB MASTER TARIF & BIAYA VISA: INPUT HARGA REGULER, PREMIUM & TAC (KHUSUS OWNER) */}
      {isOwner && activeTab === 'tarif' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header Card dengan Action Buttons */}
          <div className="card pengaturan-card" style={{ padding: '20px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: '#DCFCE7',
                  color: '#15803D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>payments</span>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '1.20rem', fontWeight: 800, color: '#0F172A' }}>
                      Master Tarif &amp; Harga Paket Layanan Visa
                    </h3>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '20px',
                      backgroundColor: isOwner ? '#DCFCE7' : '#EFF6FF',
                      color: isOwner ? '#15803D' : '#1D4ED8',
                    }}>
                      {isOwner ? '👑 Otoritas Finansial Owner' : '👁️ Direktori Tarif Resmi'}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '0.80rem', color: '#64748B' }}>
                    {isOwner
                      ? 'Atur harga resmi setiap jenis visa untuk paket Reguler, Premium, dan TAC. Harga ini otomatis tersinkronisasi ke Formulir Customer, Kartu Layanan Landing Page, Kalkulator Keuangan, dan pesan notifikasi WhatsApp Gateway.'
                      : 'Direktori tarif resmi layanan pengajuan visa Jepang MapahTrip untuk seluruh paket layanan.'}
                  </p>
                </div>
              </div>

              {/* Action Buttons untuk Owner */}
              {isOwner && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleResetPricing}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      color: '#64748B',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title="Kembalikan tarif ke standar default"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>restart_alt</span>
                    <span>Reset Default</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenAddVisa}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1px solid #BAE6FD',
                      backgroundColor: '#F0F9FF',
                      color: '#0284C7',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add_circle</span>
                    <span>+ Tambah Visa Baru</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSavePricing}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: pricingSaveSuccess ? '#059669' : '#16A34A',
                      color: '#FFFFFF',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: pricingSaveSuccess ? '0 0 0 3px rgba(16, 185, 129, 0.4)' : '0 2px 6px rgba(22, 163, 74, 0.25)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                      {pricingSaveSuccess ? 'check_circle' : 'save'}
                    </span>
                    <span>{pricingSaveSuccess ? '✓ Berhasil Disimpan!' : 'Simpan Semua Tarif'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Alert Sukses Simpan */}
            {pricingSaveSuccess && (
              <div style={{
                marginBottom: '16px',
                padding: '10px 14px',
                borderRadius: '10px',
                backgroundColor: '#DCFCE7',
                border: '1px solid #86EFAC',
                color: '#15803D',
                fontSize: '0.80rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                <span>✓ Pengaturan tarif visa berhasil disimpan! Harga baru langsung aktif di kartu paket landing page, formulir customer, dan sistem operasional.</span>
              </div>
            )}

            {/* Quick Filter & Search Bar */}
            <div className="pengaturan-filter-search-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid #F1F5F9', paddingTop: '14px' }}>
              {/* Category Pills (Horizontal scrollable chip list on mobile) */}
              <div className="pengaturan-cat-pills-scroll" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { id: 'semua', label: `Semua (${pricingList.length})` },
                  { id: 'turis', label: '✈️ Turis' },
                  { id: 'kerja', label: '💼 Kerja' },
                  { id: 'magang', label: '🤝 Pemagangan' },
                  { id: 'studi', label: '🎓 Studi' },
                  { id: 'transit', label: '⏱️ Transit' },
                  { id: 'keluarga', label: '👥 Keluarga' },
                  { id: 'bisnis', label: '🏢 Bisnis' },
                  { id: 'medis', label: '🏥 Medis' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className="pengaturan-cat-pill-btn"
                    onClick={() => setPricingCategoryFilter(cat.id)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '20px',
                      border: pricingCategoryFilter === cat.id ? '1.5px solid #005BB5' : '1px solid #CBD5E1',
                      backgroundColor: pricingCategoryFilter === cat.id ? '#EFF6FF' : '#FFFFFF',
                      color: pricingCategoryFilter === cat.id ? '#005BB5' : '#475569',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="pengaturan-search-box-wrap" style={{ position: 'relative', minWidth: '220px' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', color: '#94A3B8' }}>
                  search
                </span>
                <input
                  type="text"
                  placeholder="Cari jenis visa..."
                  value={searchPricing}
                  onChange={(e) => setSearchPricing(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px 6px 32px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.78rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="pengaturan-desktop-staff-table data-table-container" style={{ marginTop: '14px', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.80rem' }}>
                <thead style={{ backgroundColor: '#F8FAFC' }}>
                  <tr>
                    <th style={{ padding: '10px 8px', width: '40px', textAlign: 'center', borderBottom: '2px solid #E2E8F0' }}>No.</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '2px solid #E2E8F0' }}>Jenis Program Visa</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', width: '190px', borderBottom: '2px solid #E2E8F0', backgroundColor: '#F0F9FF' }}>
                      <div style={{ fontWeight: 800, color: '#0369A1' }}>Paket Reguler</div>
                      <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 500 }}>Standar QC &amp; Submit</div>
                    </th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', width: '190px', borderBottom: '2px solid #E2E8F0', backgroundColor: '#FEF3C7' }}>
                      <div style={{ fontWeight: 800, color: '#B45309' }}>Paket Premium</div>
                      <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 500 }}>Prioritas &amp; Cepat</div>
                    </th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', width: '190px', borderBottom: '2px solid #E2E8F0', backgroundColor: '#DCFCE7' }}>
                      <div style={{ fontWeight: 800, color: '#15803D' }}>Paket TAC</div>
                      <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 500 }}>Pendampingan All-in</div>
                    </th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', width: '100px', borderBottom: '2px solid #E2E8F0' }}>Status / Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPricingList.map((item, idx) => {
                    const catBadge =
                      item.category === 'turis'
                        ? { bg: '#E0F2FE', text: '#0369A1', label: 'Turis' }
                        : item.category === 'kerja'
                        ? { bg: '#DCFCE7', text: '#15803D', label: 'Kerja' }
                        : item.category === 'magang'
                        ? { bg: '#F3E8FF', text: '#7E22CE', label: 'Pemagangan' }
                        : item.category === 'studi'
                        ? { bg: '#E0E7FF', text: '#4338CA', label: 'Studi' }
                        : item.category === 'transit'
                        ? { bg: '#F1F5F9', text: '#475569', label: 'Transit' }
                        : item.category === 'keluarga'
                        ? { bg: '#FFE4E6', text: '#BE123C', label: 'Keluarga' }
                        : item.category === 'medis'
                        ? { bg: '#ECFDF5', text: '#047857', label: 'Medis' }
                        : item.category === 'khusus'
                        ? { bg: '#FDF4FF', text: '#A21CAF', label: 'Khusus' }
                        : { bg: '#FEF3C7', text: '#B45309', label: 'Bisnis' };

                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 800, color: '#64748B', borderBottom: '1px solid #F1F5F9' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.86rem' }}>
                              {item.title}
                            </span>
                            <span style={{
                              fontSize: '0.64rem',
                              fontWeight: 700,
                              padding: '1px 7px',
                              borderRadius: '10px',
                              backgroundColor: catBadge.bg,
                              color: catBadge.text,
                            }}>
                              {catBadge.label}
                            </span>
                            {item.isCustom && (
                              <span style={{ fontSize: '0.64rem', fontWeight: 700, padding: '1px 6px', borderRadius: '10px', backgroundColor: '#F3E8FF', color: '#7E22CE' }}>
                                Custom
                              </span>
                            )}
                          </div>
                          {item.keterangan && (
                            <div style={{ fontSize: '0.70rem', color: '#64748B', marginTop: '2px' }}>
                              {item.keterangan}
                            </div>
                          )}
                        </td>

                        {/* Input Reguler */}
                        <td style={{ padding: '8px 10px', textAlign: 'center', borderBottom: '1px solid #F1F5F9', backgroundColor: '#F8FAFC' }}>
                          {isOwner ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                              <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 700 }}>Rp</span>
                              <input
                                type="number"
                                step="10000"
                                value={item.regulerPrice}
                                onChange={(e) => handleUpdatePrice(item.id, 'regulerPrice', Number(e.target.value))}
                                style={{
                                  width: '120px',
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  border: '1.5px solid #CBD5E1',
                                  fontSize: '0.80rem',
                                  fontFamily: 'monospace',
                                  fontWeight: 700,
                                  textAlign: 'right',
                                  backgroundColor: '#FFFFFF',
                                  outline: 'none',
                                }}
                              />
                            </div>
                          ) : (
                            <span style={{ fontWeight: 800, fontFamily: 'monospace', color: '#0F172A' }}>
                              {formatRupiah(item.regulerPrice)}
                            </span>
                          )}
                        </td>

                        {/* Input Premium */}
                        <td style={{ padding: '8px 10px', textAlign: 'center', borderBottom: '1px solid #F1F5F9', backgroundColor: '#FFFBEB' }}>
                          {isOwner ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                              <span style={{ fontSize: '0.74rem', color: '#B45309', fontWeight: 700 }}>Rp</span>
                              <input
                                type="number"
                                step="10000"
                                value={item.premiumPrice}
                                onChange={(e) => handleUpdatePrice(item.id, 'premiumPrice', Number(e.target.value))}
                                style={{
                                  width: '120px',
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  border: '1.5px solid #FCD34D',
                                  fontSize: '0.80rem',
                                  fontFamily: 'monospace',
                                  fontWeight: 800,
                                  color: '#B45309',
                                  textAlign: 'right',
                                  backgroundColor: '#FFFFFF',
                                  outline: 'none',
                                }}
                              />
                            </div>
                          ) : (
                            <span style={{ fontWeight: 800, fontFamily: 'monospace', color: '#B45309' }}>
                              {formatRupiah(item.premiumPrice)}
                            </span>
                          )}
                        </td>

                        {/* Input TAC */}
                        <td style={{ padding: '8px 10px', textAlign: 'center', borderBottom: '1px solid #F1F5F9', backgroundColor: '#F0FDF4' }}>
                          {isOwner ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                              <span style={{ fontSize: '0.74rem', color: '#15803D', fontWeight: 700 }}>Rp</span>
                              <input
                                type="number"
                                step="10000"
                                value={item.tacPrice}
                                onChange={(e) => handleUpdatePrice(item.id, 'tacPrice', Number(e.target.value))}
                                style={{
                                  width: '120px',
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  border: '1.5px solid #86EFAC',
                                  fontSize: '0.80rem',
                                  fontFamily: 'monospace',
                                  fontWeight: 800,
                                  color: '#15803D',
                                  textAlign: 'right',
                                  backgroundColor: '#FFFFFF',
                                  outline: 'none',
                                }}
                              />
                            </div>
                          ) : (
                            <span style={{ fontWeight: 800, fontFamily: 'monospace', color: '#15803D' }}>
                              {formatRupiah(item.tacPrice)}
                            </span>
                          )}
                        </td>

                        {/* Aksi */}
                        <td style={{ padding: '8px 10px', textAlign: 'center', borderBottom: '1px solid #F1F5F9', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                            {isOwner && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditVisa(item)}
                                title={`Edit teks kartu, deskripsi & stopper ${item.title}`}
                                style={{
                                  background: '#EFF6FF',
                                  border: '1px solid #BFDBFE',
                                  color: '#1D4ED8',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  fontSize: '0.70rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  transition: 'all 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#DBEAFE';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = '#EFF6FF';
                                }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit_note</span>
                                <span>Edit Kartu</span>
                              </button>
                            )}
                            {isOwner && (
                              <button
                                type="button"
                                onClick={() => handleDeleteVisa(item.id, item.title)}
                                title={`Hapus jenis visa ${item.title}`}
                                style={{
                                  background: '#FEF2F2',
                                  border: '1px solid #FCA5A5',
                                  color: '#DC2626',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  fontSize: '0.70rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  transition: 'all 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#FEE2E2';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = '#FEF2F2';
                                }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete</span>
                                <span>Hapus</span>
                              </button>
                            )}
                            {!isOwner && (
                              <span style={{ fontSize: '0.68rem', color: '#16A34A', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>check</span>
                                <span>Aktif</span>
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="pengaturan-mobile-staff-list" style={{ display: 'none', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
              {filteredPricingList.map((item) => (
                <div
                  key={`mob-${item.id}`}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.90rem', color: '#0F172A' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '0.70rem', color: '#64748B' }}>
                        {item.keterangan || 'Layanan Visa Jepang'}
                      </div>
                    </div>
                    {isOwner && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditVisa(item)}
                          style={{
                            background: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            color: '#1D4ED8',
                            borderRadius: '6px',
                            padding: '3px 8px',
                            fontSize: '0.70rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>edit_note</span>
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteVisa(item.id, item.title)}
                          style={{
                            background: '#FEF2F2',
                            border: '1px solid #FCA5A5',
                            color: '#DC2626',
                            borderRadius: '6px',
                            padding: '3px 8px',
                            fontSize: '0.70rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>delete</span>
                          <span>Hapus</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 3 Price Inputs on Mobile */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {/* Reguler */}
                    <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0369A1' }}>Reguler</div>
                      {isOwner ? (
                        <input
                          type="number"
                          value={item.regulerPrice}
                          onChange={(e) => handleUpdatePrice(item.id, 'regulerPrice', Number(e.target.value))}
                          style={{
                            width: '100%',
                            padding: '4px 6px',
                            borderRadius: '4px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            boxSizing: 'border-box',
                            marginTop: '4px',
                          }}
                        />
                      ) : (
                        <div style={{ fontSize: '0.76rem', fontWeight: 800, fontFamily: 'monospace', marginTop: '4px' }}>
                          {formatRupiah(item.regulerPrice)}
                        </div>
                      )}
                    </div>

                    {/* Premium */}
                    <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#FFFBEB', border: '1px solid #FCD34D' }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#B45309' }}>Premium</div>
                      {isOwner ? (
                        <input
                          type="number"
                          value={item.premiumPrice}
                          onChange={(e) => handleUpdatePrice(item.id, 'premiumPrice', Number(e.target.value))}
                          style={{
                            width: '100%',
                            padding: '4px 6px',
                            borderRadius: '4px',
                            border: '1px solid #FCD34D',
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            color: '#B45309',
                            fontFamily: 'monospace',
                            boxSizing: 'border-box',
                            marginTop: '4px',
                          }}
                        />
                      ) : (
                        <div style={{ fontSize: '0.76rem', fontWeight: 800, fontFamily: 'monospace', color: '#B45309', marginTop: '4px' }}>
                          {formatRupiah(item.premiumPrice)}
                        </div>
                      )}
                    </div>

                    {/* TAC */}
                    <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#F0FDF4', border: '1px solid #86EFAC' }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#15803D' }}>TAC</div>
                      {isOwner ? (
                        <input
                          type="number"
                          value={item.tacPrice}
                          onChange={(e) => handleUpdatePrice(item.id, 'tacPrice', Number(e.target.value))}
                          style={{
                            width: '100%',
                            padding: '4px 6px',
                            borderRadius: '4px',
                            border: '1px solid #86EFAC',
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            color: '#15803D',
                            fontFamily: 'monospace',
                            boxSizing: 'border-box',
                            marginTop: '4px',
                          }}
                        />
                      ) : (
                        <div style={{ fontSize: '0.76rem', fontWeight: 800, fontFamily: 'monospace', color: '#15803D', marginTop: '4px' }}>
                          {formatRupiah(item.tacPrice)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Floating Save Button for Mobile / Quick Access */}
            {isOwner && (
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {pricingSaveSuccess && (
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#15803D', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                      Tarif berhasil disimpan!
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleSavePricing}
                    style={{
                      padding: '10px 22px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: pricingSaveSuccess ? '#059669' : '#16A34A',
                      color: '#FFFFFF',
                      fontSize: '0.84rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: pricingSaveSuccess ? '0 0 0 3px rgba(16, 185, 129, 0.4)' : '0 2px 8px rgba(22, 163, 74, 0.3)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      {pricingSaveSuccess ? 'check_circle' : 'save'}
                    </span>
                    <span>{pricingSaveSuccess ? '✓ Berhasil Disimpan!' : 'Simpan Semua Tarif Visa'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Floating Toast Notification (Pasti Terlihat di Manapun Posisi Layar) */}
            {pricingSaveSuccess && (
              <div
                style={{
                  position: 'fixed',
                  bottom: '24px',
                  right: '24px',
                  zIndex: 99999,
                  backgroundColor: '#064E3B',
                  color: '#FFFFFF',
                  padding: '14px 20px',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(16, 185, 129, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  animation: 'fadeInUp 0.3s ease',
                  maxWidth: '420px',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#FFFFFF' }}>check</span>
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.90rem' }}>Berhasil Disimpan!</div>
                  <div style={{ fontSize: '0.78rem', color: '#A7F3D0', marginTop: '2px' }}>
                    Tarif visa baru langsung aktif di katalog customer & sistem operasional.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: FORUM KOMUNIKASI & SARAN PENGEMBANGAN SISTEM (Sesuai Contoh Gambar) */}
      {activeTab === 'feedback' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Sub-Tabs: [💬 Forum Komunikasi] [👥 Rekan Staf] */}
          <div className="forum-subtabs-row" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="forum-subtab-btn"
              onClick={() => setForumSubTab('forum')}
              style={{
                backgroundColor: forumSubTab === 'forum' ? '#0F3D82' : '#FFFFFF',
                color: forumSubTab === 'forum' ? '#FFFFFF' : '#475569',
                border: forumSubTab === 'forum' ? 'none' : '1px solid #CBD5E1',
                padding: '8px 18px',
                borderRadius: '30px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: forumSubTab === 'forum' ? '0 2px 8px rgba(15, 61, 130, 0.2)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
                forum
              </span>
              <span>Forum Komunikasi</span>
            </button>

            <button
              type="button"
              className="forum-subtab-btn"
              onClick={() => setForumSubTab('teman')}
              style={{
                backgroundColor: forumSubTab === 'teman' ? '#0F3D82' : '#FFFFFF',
                color: forumSubTab === 'teman' ? '#FFFFFF' : '#475569',
                border: forumSubTab === 'teman' ? 'none' : '1px solid #CBD5E1',
                padding: '8px 18px',
                borderRadius: '30px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: forumSubTab === 'teman' ? '0 2px 8px rgba(15, 61, 130, 0.2)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
                group
              </span>
              <span>Rekan Staf ({staffList.length})</span>
            </button>
          </div>

          {forumSubTab === 'forum' ? (
            <>
              {/* Form Input Langsung (Direct Inline Input Sesuai Gambar) */}
              <form
                className="forum-input-card"
                onSubmit={(e) => {
                  e.preventDefault();
                  const text = inlineFeedbackText.trim();
                  if (!text) return;

                  const senderName = isOwner ? 'ADMINISTRATOR' : (currentStaff?.nama || 'STAFF PIC').toUpperCase();
                  const senderRole = isOwner ? 'Owner / Founder' : (currentStaff?.role || 'Staff PIC');

                  const now = new Date();
                  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

                  const newPost: StaffFeedback = {
                    id: `fb-${Date.now()}`,
                    namaStaf: senderName,
                    roleStaf: senderRole,
                    kategori: 'Fitur Baru',
                    judul: text.slice(0, 60),
                    pesan: text,
                    tanggal: dateStr,
                    status: 'Baru',
                    likes: 1,
                  };

                  const updated = [newPost, ...feedbackList];
                  setFeedbackList(updated);
                  saveFeedbackList(updated);
                  setInlineFeedbackText('');
                }}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '16px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                }}
              >
                {/* Avatar Pengirim */}
                <div
                  className="forum-input-avatar"
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: '#0F3D82',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    flexShrink: 0,
                    boxShadow: '0 2px 6px rgba(15, 61, 130, 0.2)',
                  }}
                >
                  {isOwner ? 'AD' : (currentStaff?.inisial || 'RZ')}
                </div>

                {/* Input Teks Langsung berbentuk Pill */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input
                    type="text"
                    className="forum-input-field"
                    value={inlineFeedbackText}
                    onChange={(e) => setInlineFeedbackText(e.target.value)}
                    placeholder="Tulis saran, kendala, atau usulan fitur..."
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      borderRadius: '30px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.84rem',
                      color: '#0F172A',
                      backgroundColor: '#F8FAFC',
                      boxSizing: 'border-box',
                      outline: 'none',
                      transition: 'all 0.15s ease',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#0F3D82';
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15, 61, 130, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#CBD5E1';
                      e.currentTarget.style.backgroundColor = '#F8FAFC';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Tombol [ ✈ Saran ] Biru Dongker */}
                <button
                  type="submit"
                  className="forum-input-btn"
                  disabled={!inlineFeedbackText.trim()}
                  style={{
                    backgroundColor: inlineFeedbackText.trim() ? '#0F3D82' : '#94A3B8',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '30px',
                    padding: '9px 18px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: inlineFeedbackText.trim() ? 'pointer' : 'not-allowed',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxShadow: inlineFeedbackText.trim() ? '0 3px 10px rgba(15, 61, 130, 0.25)' : 'none',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
                    near_me
                  </span>
                  <span>Saran</span>
                </button>
              </form>

              {/* Feed Daftar Saran / Diskusi (Format Persis Contoh Foto) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {feedbackList.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '48px 20px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '16px',
                      border: '1px dashed #CBD5E1',
                      color: '#94A3B8',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#CBD5E1' }}>
                      forum
                    </span>
                    <div style={{ fontWeight: 700, color: '#475569', marginTop: '8px', fontSize: '0.90rem' }}>
                      Belum Ada Pesan di Forum Komunikasi
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '0.80rem' }}>
                      Ketik saran atau kendala sistem pada kotak di atas untuk memulai diskusi tim.
                    </p>
                  </div>
                ) : (
                  feedbackList.map((item) => {
                    const isLiked = Boolean(likedPosts[item.id]);
                    const isExpanded = Boolean(expandedComments[item.id]);
                    const likesCount = (item.likes || 0) + (isLiked ? 1 : 0);
                    const commentsCount = item.balasanOwner ? 1 : 0;

                    return (
                      <div
                        key={item.id}
                        className="forum-card-container"
                        style={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: '16px',
                          padding: '16px 20px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                        }}
                      >
                        {/* Header Post: Avatar + Nama User & Timestamp di kiri, Tombol Like & Delete di kanan */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                            {/* Avatar Lingkaran */}
                            <div
                              className="forum-user-avatar"
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '50%',
                                backgroundColor: '#0F3D82',
                                color: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.80rem',
                                flexShrink: 0,
                                boxShadow: '0 2px 5px rgba(15, 61, 130, 0.15)',
                              }}
                            >
                              {getAvatarInisial(item.namaStaf)}
                            </div>

                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <strong style={{ fontSize: '0.88rem', color: '#0F172A', letterSpacing: '0.01em' }}>
                                  {item.namaStaf.toUpperCase()}
                                </strong>
                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#F97316', display: 'inline-block' }} />
                                <span style={{ fontSize: '0.70rem', color: '#64748B' }}>
                                  {item.roleStaf || 'Staff Operasional'}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.70rem', color: '#94A3B8', marginTop: '2px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                                  schedule
                                </span>
                                <span>{item.tanggal}</span>
                              </div>
                            </div>
                          </div>

                          {/* Sisi Kanan: Tombol Like & Opsi Hapus */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            {/* Tombol Dukungan / Like */}
                            <button
                              type="button"
                              onClick={() => {
                                setLikedPosts((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
                              }}
                              style={{
                                border: 'none',
                                backgroundColor: isLiked ? '#DCFCE7' : '#E6FFFA',
                                color: isLiked ? '#15803D' : '#0D9488',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s ease',
                              }}
                              title="Dukung saran ini"
                            >
                              <span>{likesCount}</span>
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                                thumb_up
                              </span>
                            </button>

                            {/* Opsi Hapus (Khusus Owner) */}
                            {isOwner && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm('Hapus saran ini dari forum?')) {
                                    const updated = feedbackList.filter((f) => f.id !== item.id);
                                    setFeedbackList(updated);
                                    saveFeedbackList(updated);
                                  }
                                }}
                                title="Hapus pesan"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#94A3B8',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  display: 'flex',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                                  delete
                                </span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Isi Pesan Saran (Teks Alami Rata Kiri Standar) */}
                        <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.55, padding: '2px 0' }}>
                          {item.pesan}
                        </div>

                        {/* Accordion: [💬 Lihat Komentar (X)] */}
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedComments((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              color: '#0F3D82',
                              fontSize: '0.80rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                              chat_bubble_outline
                            </span>
                            <span>Lihat Komentar ({commentsCount})</span>
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                              {isExpanded ? 'expand_less' : 'expand_more'}
                            </span>
                          </button>

                          {/* Bagian Komentar / Tanggapan yang Terbuka */}
                          {isExpanded && (
                            <div
                              style={{
                                marginTop: '12px',
                                paddingTop: '12px',
                                borderTop: '1px solid #F1F5F9',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                              }}
                            >
                              {/* Balasan Owner / Tim Pengembang */}
                              {item.balasanOwner ? (
                                <div
                                  style={{
                                    backgroundColor: '#F8FAFC',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '12px',
                                    padding: '12px 16px',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '10px',
                                  }}
                                >
                                  <div
                                    style={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: '50%',
                                      backgroundColor: '#0F3D82',
                                      color: '#FFFFFF',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.72rem',
                                      fontWeight: 800,
                                      flexShrink: 0,
                                    }}
                                  >
                                    AD
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                      <strong style={{ fontSize: '0.82rem', color: '#0F172A' }}>
                                        MANAJEMEN MAPAHTRIP
                                      </strong>
                                      <span
                                        style={{
                                          backgroundColor: '#DCFCE7',
                                          color: '#15803D',
                                          fontSize: '0.64rem',
                                          fontWeight: 800,
                                          padding: '1px 6px',
                                          borderRadius: '4px',
                                        }}
                                      >
                                        ✓ DITANGGAPI
                                      </span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: 1.45 }}>
                                      {item.balasanOwner}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontStyle: 'italic', padding: '4px 0' }}>
                                  Belum ada komentar atau tanggapan pada saran ini.
                                </div>
                              )}

                              {/* Input Tulis Komentar / Balasan Cepat */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                <input
                                  type="text"
                                  value={replyInputs[item.id] || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setReplyInputs((prev) => ({ ...prev, [item.id]: val }));
                                  }}
                                  placeholder={isOwner ? "Tulis tanggapan resmi manajemen..." : "Tulis balasan atau tanggapan Anda..."}
                                  style={{
                                    flex: 1,
                                    padding: '8px 14px',
                                    borderRadius: '20px',
                                    border: '1px solid #CBD5E1',
                                    fontSize: '0.80rem',
                                    outline: 'none',
                                    backgroundColor: '#F8FAFC',
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const rep = (replyInputs[item.id] || '').trim();
                                      if (!rep) return;
                                      const updated = feedbackList.map((f) =>
                                        f.id === item.id ? { ...f, balasanOwner: rep, status: 'Diproses' as const } : f
                                      );
                                      setFeedbackList(updated);
                                      saveFeedbackList(updated);
                                      setReplyInputs((prev) => ({ ...prev, [item.id]: '' }));
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const rep = (replyInputs[item.id] || '').trim();
                                    if (!rep) return;
                                    const updated = feedbackList.map((f) =>
                                      f.id === item.id ? { ...f, balasanOwner: rep, status: 'Diproses' as const } : f
                                    );
                                    setFeedbackList(updated);
                                    saveFeedbackList(updated);
                                    setReplyInputs((prev) => ({ ...prev, [item.id]: '' }));
                                  }}
                                  style={{
                                    backgroundColor: '#0F3D82',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: '20px',
                                    padding: '8px 16px',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                  }}
                                >
                                  Kirim
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            /* Sub-Tab 2: [👥 Rekan Staf] */
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <h4 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                Daftar Staf PIC &amp; Wilayah Konsulat
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                {staffList.map((staf) => (
                  <div
                    key={staf.id}
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      backgroundColor: '#F8FAFC',
                    }}
                  >
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        backgroundColor: '#0F3D82',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        flexShrink: 0,
                      }}
                    >
                      {staf.inisial || staf.nama.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <strong style={{ fontSize: '0.88rem', color: '#0F172A', display: 'block' }}>
                        {staf.nama}
                      </strong>
                      <span style={{ fontSize: '0.74rem', color: '#64748B', display: 'block' }}>
                        {staf.role}
                      </span>
                      {staf.noWa && (
                        <span style={{ fontSize: '0.70rem', color: '#16A34A', fontWeight: 600 }}>
                          WA: {staf.noWa}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: BUAT / EDIT AKUN STAF (KHUSUS OWNER) */}
      {isStaffModalOpen && (
        <div
          className="pengaturan-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsStaffModalOpen(false);
          }}
        >
          <div
            className="pengaturan-modal-box"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              overflow: 'hidden',
              border: '1px solid #E2E8F0',
              maxHeight: '92vh',
              overflowY: 'auto',
            }}
          >
            {/* Modal Header */}
            <div
              className="pengaturan-modal-header"
              style={{
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                padding: '18px 22px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ margin: '0 0 2px', fontSize: '1.05rem', fontWeight: 800 }}>
                  {editingStaffId ? 'Edit Akun Staf' : 'Buat Akun Staf Baru'}
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                  Otoritas Owner: Pengaturan Akses &amp; Wilayah Konsjen
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsStaffModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  display: 'flex',
                  padding: '4px',
                }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveStaff} className="pengaturan-modal-form" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="pengaturan-form-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Nama Lengkap Staf *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Nanami Kay"
                    value={formData.nama}
                    onChange={(e) => {
                      const val = e.target.value;
                      const autoInisial = val
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2);
                      setFormData((prev) => ({
                        ...prev,
                        nama: val,
                        inisial: prev.inisial ? prev.inisial : autoInisial,
                      }));
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.82rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Inisial (2 Huruf)
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    placeholder="Contoh: NK"
                    value={formData.inisial}
                    onChange={(e) => setFormData({ ...formData, inisial: e.target.value.toUpperCase() })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.82rem',
                      boxSizing: 'border-box',
                      textAlign: 'center',
                      fontWeight: 800,
                    }}
                  />
                </div>
              </div>

              <div className="pengaturan-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Username Login
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: nanami"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().trim() })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.82rem',
                      boxSizing: 'border-box',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    PIN Masuk (4-6 Digit) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Contoh: 1234"
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.82rem',
                      boxSizing: 'border-box',
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      letterSpacing: '0.1em',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Nomor WhatsApp PIC Staf (Format: 08xxx) *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Contoh: 081214104332"
                    value={formData.noWa}
                    onChange={(e) => setFormData({ ...formData, noWa: e.target.value.replace(/[^0-9]/g, '') })}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 36px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.82rem',
                      boxSizing: 'border-box',
                    }}
                  />
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px' }}>
                    💬
                  </span>
                </div>
                <span style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '3px', display: 'block' }}>
                  Nomor ini akan otomatis menerima notifikasi WhatsApp saat ada pemohon visa baru yang mendaftar di wilayah konsjen tugasnya.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Role &amp; Tanggung Jawab Staf
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Staff PIC Surabaya, Staff Dokumen & Kurir"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.82rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Wilayah Konsjen Tugas (Pilih minimal 1):
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {availableKonsjen.map((city) => {
                    const isChecked = formData.konsjenTugas.includes(city);
                    return (
                      <button
                        key={city}
                        type="button"
                        onClick={() => handleToggleKonsjen(city)}
                        style={{
                          backgroundColor: isChecked ? '#EFF6FF' : '#F8FAFC',
                          color: isChecked ? '#005BB5' : '#64748B',
                          border: isChecked ? '1.5px solid #005BB5' : '1px solid #CBD5E1',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                          {isChecked ? 'check_box' : 'check_box_outline_blank'}
                        </span>
                        <span>{city}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* REKENING BANK & E-WALLET TUJUAN PAYOUT FEE STAF */}
              <div style={{ backgroundColor: '#F8FAFC', border: '1.5px solid #BFDBFE', borderRadius: '12px', padding: '14px', marginTop: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#005BB5' }}>account_balance</span>
                  <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#0F172A' }}>
                    Rekening Bank / E-Wallet Staf (Tujuan Payout Fee)
                  </span>
                </div>

                <div className="pengaturan-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Pilih Bank / Dompet Digital
                    </label>
                    <select
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.80rem',
                        fontWeight: 600,
                        backgroundColor: '#FFFFFF',
                        color: '#0F172A',
                        boxSizing: 'border-box',
                      }}
                    >
                      {ALL_INDONESIA_PAYMENT_GROUPS.map((group) => (
                        <optgroup key={group.kategori} label={group.kategori}>
                          {group.banks.map((bank) => (
                            <option key={bank} value={bank}>
                              {bank}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Nomor Rekening / No. HP E-Wallet
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 6240866950"
                      value={formData.noRekening}
                      onChange={(e) => setFormData({ ...formData, noRekening: e.target.value.replace(/[^0-9]/g, '') })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.82rem',
                        boxSizing: 'border-box',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                      }}
                    />
                  </div>
                </div>

                {formData.bankName === 'Lainnya (Ketik Manual)' && (
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Ketik Nama Bank / E-Wallet Manual
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Bank Kaltim, Bank Nagari, dll"
                      value={formData.customBankName}
                      onChange={(e) => setFormData({ ...formData, customBankName: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.82rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Nama Pemilik Rekening (a.n.)
                  </label>
                  <input
                    type="text"
                    placeholder={`Nama di buku rekening (default: ${formData.nama || 'Nama Staf'})`}
                    value={formData.atasNamaRekening}
                    onChange={(e) => setFormData({ ...formData, atasNamaRekening: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.82rem',
                      boxSizing: 'border-box',
                    }}
                  />
                  <span style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '3px', display: 'block' }}>
                    Pastikan nomor rekening dan nama pemilik sesuai agar proses transfer fee staf dari Owner langsung terbaca tanpa kendala.
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  id="statusAktif"
                  checked={formData.aktif}
                  onChange={(e) => setFormData({ ...formData, aktif: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="statusAktif" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                  Status Akun Aktif (Dapat login dan memproses berkas)
                </label>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  style={{
                    backgroundColor: '#F1F5F9',
                    color: '#475569',
                    border: '1px solid #CBD5E1',
                    padding: '9px 18px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{
                    backgroundColor: '#005BB5',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '9px 20px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0, 91, 181, 0.25)',
                  }}
                >
                  {editingStaffId ? 'Simpan Perubahan' : 'Buat Akun Staf'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH JENIS VISA BARU */}
      {showAddVisaModal && (
        <div
          className="pengaturan-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddVisaModal(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            className="pengaturan-modal-box"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '16px 20px', backgroundColor: '#0F172A', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#10B981', fontSize: '22px' }}>
                  {editingVisa ? 'edit_note' : 'add_circle'}
                </span>
                <span style={{ fontWeight: 800, fontSize: '1rem' }}>
                  {editingVisa ? `Edit Kartu: ${editingVisa.title}` : 'Tambah Jenis Visa Baru'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddVisaModal(false);
                  setEditingVisa(null);
                }}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveVisa} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '80vh', overflowY: 'auto' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Nama Program Visa <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Visa Transit / Visa Medical"
                  value={newVisaTitle}
                  onChange={(e) => setNewVisaTitle(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Kategori Layanan
                  </label>
                  <select
                    value={newVisaCategory}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.84rem', boxSizing: 'border-box', backgroundColor: '#FFFFFF' }}
                  >
                    <option value="turis">✈️ Turis &amp; Kunjungan Singkat</option>
                    <option value="kerja">💼 Kerja Formal (SSW / Tokutei Ginou)</option>
                    <option value="magang">🤝 Pemagangan (Magang / Kenshuusei)</option>
                    <option value="studi">🎓 Studi &amp; Pelajar (Long Stay / Ryuugaku)</option>
                    <option value="transit">⏱️ Transit &amp; Shore Pass (Maks 15 Hari)</option>
                    <option value="keluarga">👨‍👩‍👧 Keluarga &amp; Dependent (Visit / Spouse)</option>
                    <option value="bisnis">🏢 Bisnis &amp; Meeting Komersial</option>
                    <option value="medis">🏥 Medis &amp; Pengobatan (Medical Visa)</option>
                    <option value="khusus">⭐ Aktivitas Khusus (Tokutei Katsudou)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Stopper / Badge Pojok Kanan Atas
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Transit, ★ TERPOPULER, Pemagangan, Promo"
                    value={newVisaBadge}
                    onChange={(e) => setNewVisaBadge(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Sub-Judul / Tagline Kartu
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Transit & Shore Pass / Trainee SO"
                    value={newVisaSubtitle}
                    onChange={(e) => setNewVisaSubtitle(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Durasi Kunjungan (Pill Durasi)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 3-15 Hari / 1 - 3 Tahun / 15-90 Hari"
                    value={newVisaDuration}
                    onChange={(e) => setNewVisaDuration(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Deskripsi Lengkap Kartu
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Transit Jepang atau stopover. Proses cepat, tidak perlu dummy hotel lama."
                  value={newVisaDesc}
                  onChange={(e) => setNewVisaDesc(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.82rem', lineHeight: 1.4, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#0369A1', marginBottom: '4px' }}>
                    Harga Reguler (Rp)
                  </label>
                  <input
                    type="number"
                    step="10000"
                    required
                    value={newVisaReguler}
                    onChange={(e) => setNewVisaReguler(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.80rem', fontFamily: 'monospace', fontWeight: 700, textAlign: 'right', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#B45309', marginBottom: '4px' }}>
                    Harga Premium (Rp)
                  </label>
                  <input
                    type="number"
                    step="10000"
                    required
                    value={newVisaPremium}
                    onChange={(e) => setNewVisaPremium(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.80rem', fontFamily: 'monospace', fontWeight: 700, textAlign: 'right', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#15803D', marginBottom: '4px' }}>
                    Harga TAC (Rp)
                  </label>
                  <input
                    type="number"
                    step="10000"
                    required
                    value={newVisaTac}
                    onChange={(e) => setNewVisaTac(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.80rem', fontFamily: 'monospace', fontWeight: 700, textAlign: 'right', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddVisaModal(false);
                    setEditingVisa(null);
                  }}
                  style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#64748B', fontSize: '0.80rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#16A34A', color: '#FFFFFF', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  {editingVisa ? 'Simpan Perubahan' : 'Tambahkan Visa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
