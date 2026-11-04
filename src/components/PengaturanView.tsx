import React, { useState } from 'react';
import { mockKonsjen } from '../data/mockData';
import type { StaffMaster, KonsjenKota, StaffFeedback } from '../types';
import { kirimPesanWA } from '../whatsapp';
import { getStoredFeedback, saveFeedbackList } from './StaffFeedbackModal';

interface PengaturanViewProps {
  isOwner?: boolean;
  staffList?: StaffMaster[];
  currentStaff?: StaffMaster | null;
  onUpdateStaffList?: (list: StaffMaster[]) => void;
}

export const PengaturanView: React.FC<PengaturanViewProps> = ({
  isOwner = false,
  staffList = [],
  currentStaff = null,
  onUpdateStaffList,
}) => {
  const [activeTab, setActiveTab] = useState<'staff' | 'konsjen' | 'profile' | 'feedback'>(() => (isOwner ? 'staff' : 'konsjen'));
  const [feedbackList, setFeedbackList] = useState<StaffFeedback[]>(() => getStoredFeedback());
  const [forumSubTab, setForumSubTab] = useState<'forum' | 'teman'>('forum');
  const [inlineFeedbackText, setInlineFeedbackText] = useState('');
  const [expandedComments, setExpandedComments] = useState<{ [id: string]: boolean }>({});
  const [likedPosts, setLikedPosts] = useState<{ [id: string]: boolean }>({});
  const [replyInputs, setReplyInputs] = useState<{ [id: string]: string }>({});

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
      const testMsg = `*TES KONEKSI GATEWAY WHATSAPP OWNER* 👑📱\n\nHalo *${ownerName || 'Owner MapahTrip'}*,\n\nPesan ini menandakan nomor WhatsApp Anda (*${cleanWa}*) telah berhasil terhubung ke sistem notifikasi otomatis MapahTrip.\n\nSetiap ada pemohon visa baru yang mendaftar di wilayah manapun (Jakarta, Surabaya, Denpasar, Medan, Makassar), Anda akan otomatis mendapatkan ringkasan notifikasi eksekutif di nomor ini.\n\nWaktu Tes: ${nowStr}\n\n*MapahTrip Executive Alert System*`;
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
    aktif: true,
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
      aktif: true,
    });
    setIsStaffModalOpen(true);
  };

  const handleOpenEditModal = (staff: StaffMaster) => {
    setEditingStaffId(staff.id);
    setFormData({
      nama: staff.nama,
      inisial: staff.inisial,
      username: staff.username || staff.nama.toLowerCase().replace(/\s+/g, ''),
      email: staff.email || `${staff.nama.toLowerCase().replace(/\s+/g, '')}@mapahtrip.id`,
      noWa: staff.noWa || '',
      pin: staff.pin || '1234',
      role: staff.role,
      konsjenTugas: staff.konsjenTugas,
      aktif: staff.aktif,
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
            aktif: formData.aktif,
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
        aktif: formData.aktif,
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div className="pengaturan-header-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>
              settings
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary)' }}>
              {isOwner ? 'Manajemen Akun Staf & Master Data' : 'Konfigurasi & Master Data'}
            </span>
          </div>
          <h1 className="font-serif pengaturan-main-title" style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>
            {isOwner ? 'Pengaturan & Akun Staf' : 'Pengaturan & Informasi Operasional'}
          </h1>
          <p className="pengaturan-main-desc" style={{ color: '#64748B', fontSize: '0.85rem', margin: 0 }}>
            {isOwner
              ? 'Kelola akun operasional ke-6 staf konsuler, hak akses PIN login, dan master data tarif konsulat.'
              : 'Direktori operasional konsuler dan referensi tarif Konsulat Jenderal Jepang se-Indonesia.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="pengaturan-tabs-bar" style={{ display: 'inline-flex', backgroundColor: '#F1F5F9', padding: '4px', borderRadius: '10px', gap: '4px' }}>
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

      {/* TAB 1: KELOLA AKUN STAF (Owner Only) */}
      {activeTab === 'staff' && isOwner && (
        <div className="card pengaturan-card" style={{ padding: '20px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
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
          <div className="pengaturan-desktop-staff-table data-table-container">
            <table className="data-table" style={{ fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th style={{ width: '50px', textAlign: 'center' }}>No</th>
                  <th>Nama Staf</th>
                  <th>Kontak &amp; Akun Login</th>
                  {isOwner && <th style={{ textAlign: 'center' }}>PIN Akses</th>}
                  <th>Role &amp; Tanggung Jawab</th>
                  <th>Wilayah Konsjen Tugas</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  {isOwner && <th style={{ textAlign: 'center', width: '130px' }}>Aksi Owner</th>}
                </tr>
              </thead>
              <tbody>
                {staffList.map((staf, idx) => (
                  <tr key={staf.id} style={{ opacity: staf.aktif ? 1 : 0.6 }}>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#64748B' }}>
                      {idx + 1}
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: staf.aktif ? '#EFF6FF' : '#F1F5F9',
                            color: staf.aktif ? '#005BB5' : '#64748B',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            flexShrink: 0,
                            border: '1px solid #CBD5E1',
                          }}
                        >
                          {staf.inisial}
                        </div>
                        <div>
                          <strong style={{ color: '#0F172A', display: 'block' }}>{staf.nama}</strong>
                          <span style={{ fontSize: '0.7rem', color: '#64748B' }}>ID: {staf.id}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#0F172A', fontWeight: 600 }}>
                        {staf.username || staf.nama.toLowerCase().replace(/\s+/g, '')}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#64748B' }}>
                        {staf.email || `${staf.nama.toLowerCase().replace(/\s+/g, '')}@mapahtrip.id`}
                      </div>
                      {staf.noWa ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '3px', backgroundColor: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                          <span>💬</span>
                          <span>{staf.noWa}</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.66rem', color: '#94A3B8', marginTop: '2px', fontStyle: 'italic' }}>
                          Belum ada No. WA
                        </div>
                      )}
                    </td>

                    {isOwner && (
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            backgroundColor: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontFamily: 'monospace',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            color: showPins ? '#B45309' : '#64748B',
                          }}
                        >
                          {showPins ? staf.pin || '1234' : '••••'}
                        </span>
                      </td>
                    )}

                    <td>
                      <span style={{ fontWeight: 600, color: '#334155' }}>{staf.role}</span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {staf.konsjenTugas.map((t) => (
                          <span
                            key={t}
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: '#F1F5F9',
                              border: '1px solid #E2E8F0',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              color: '#334155',
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <span
                        className={staf.aktif ? 'badge badge-success' : 'badge badge-neutral'}
                        style={{ cursor: isOwner ? 'pointer' : 'default' }}
                        onClick={() => isOwner && handleToggleAktif(staf.id)}
                        title={isOwner ? 'Klik untuk toggle status aktif' : undefined}
                      >
                        {staf.aktif ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>

                    {isOwner && (
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(staf)}
                            title="Edit Akun & PIN"
                            style={{
                              backgroundColor: '#EFF6FF',
                              color: '#005BB5',
                              border: '1px solid #BFDBFE',
                              padding: '5px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteStaff(staf.id, staf.nama)}
                            title="Hapus Akun Staf"
                            style={{
                              backgroundColor: '#FEF2F2',
                              color: '#DC2626',
                              border: '1px solid #FECACA',
                              padding: '5px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: staf.aktif ? '#EFF6FF' : '#F1F5F9',
                        color: staf.aktif ? '#005BB5' : '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.80rem',
                        fontWeight: 800,
                        flexShrink: 0,
                        border: '1.5px solid #CBD5E1',
                      }}
                    >
                      {staf.inisial}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.90rem', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {staf.nama}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '1px' }}>
                        {staf.role}
                      </div>
                    </div>
                  </div>
                  <span
                    className={staf.aktif ? 'badge badge-success' : 'badge badge-neutral'}
                    style={{ cursor: isOwner ? 'pointer' : 'default', flexShrink: 0, fontSize: '0.68rem', padding: '2px 8px' }}
                    onClick={() => isOwner && handleToggleAktif(staf.id)}
                    title={isOwner ? 'Klik untuk toggle status aktif' : undefined}
                  >
                    {staf.aktif ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                {/* Row 2: Detail Akun (Username & PIN) */}
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    border: '1px solid #F1F5F9',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    fontSize: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748B', fontSize: '0.70rem' }}>Login / User:</span>
                    <span style={{ fontWeight: 700, color: '#0F172A', fontFamily: 'monospace', fontSize: '0.72rem' }}>
                      {staf.username || staf.nama.toLowerCase().replace(/\s+/g, '')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748B', fontSize: '0.70rem' }}>No. WhatsApp:</span>
                    <span style={{ fontWeight: 700, color: staf.noWa ? '#047857' : '#94A3B8', fontSize: '0.72rem' }}>
                      {staf.noWa ? `💬 ${staf.noWa}` : 'Belum diisi'}
                    </span>
                  </div>
                  {isOwner && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#64748B', fontSize: '0.70rem' }}>PIN Akses:</span>
                      <span
                        style={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontFamily: 'monospace',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          color: showPins ? '#B45309' : '#64748B',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div
              style={{
                width: '58px',
                height: '58px',
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
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.30rem', fontWeight: 800, color: '#0F172A' }}>
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
                  }}
                >
                  Eksekutif / Pemilik Usaha
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.80rem', color: '#64748B' }}>
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
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

      {/* TAB 4: FORUM KOMUNIKASI & SARAN PENGEMBANGAN SISTEM (Sesuai Contoh Gambar) */}
      {activeTab === 'feedback' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Sub-Tabs: [💬 Forum Komunikasi] [👥 Rekan Staf] */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setForumSubTab('forum')}
              style={{
                backgroundColor: forumSubTab === 'forum' ? '#0F3D82' : '#FFFFFF',
                color: forumSubTab === 'forum' ? '#FFFFFF' : '#475569',
                border: forumSubTab === 'forum' ? 'none' : '1px solid #CBD5E1',
                padding: '9px 20px',
                borderRadius: '30px',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: forumSubTab === 'forum' ? '0 3px 10px rgba(15, 61, 130, 0.25)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                forum
              </span>
              <span>Forum Komunikasi</span>
            </button>

            <button
              type="button"
              onClick={() => setForumSubTab('teman')}
              style={{
                backgroundColor: forumSubTab === 'teman' ? '#0F3D82' : '#FFFFFF',
                color: forumSubTab === 'teman' ? '#FFFFFF' : '#475569',
                border: forumSubTab === 'teman' ? 'none' : '1px solid #CBD5E1',
                padding: '9px 20px',
                borderRadius: '30px',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: forumSubTab === 'teman' ? '0 3px 10px rgba(15, 61, 130, 0.25)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                group
              </span>
              <span>Rekan Staf ({staffList.length})</span>
            </button>
          </div>

          {forumSubTab === 'forum' ? (
            <>
              {/* Form Input Langsung (Direct Inline Input Sesuai Gambar) */}
              <form
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
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                }}
              >
                {/* Avatar Pengirim */}
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
                    boxShadow: '0 2px 6px rgba(15, 61, 130, 0.2)',
                  }}
                >
                  {isOwner ? 'AD' : (currentStaff?.inisial || 'RZ')}
                </div>

                {/* Input Teks Langsung berbentuk Pill */}
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={inlineFeedbackText}
                    onChange={(e) => setInlineFeedbackText(e.target.value)}
                    placeholder="Format Saran: Isi masukan, kendala operasional, atau usulan fitur untuk aplikasi..."
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      borderRadius: '30px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.86rem',
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
                  disabled={!inlineFeedbackText.trim()}
                  style={{
                    backgroundColor: inlineFeedbackText.trim() ? '#0F3D82' : '#94A3B8',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '30px',
                    padding: '11px 22px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: inlineFeedbackText.trim() ? 'pointer' : 'not-allowed',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: inlineFeedbackText.trim() ? '0 3px 10px rgba(15, 61, 130, 0.25)' : 'none',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
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
                        style={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: '16px',
                          padding: '18px 22px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                        }}
                      >
                        {/* Header Post: Avatar + Nama User & Timestamp + Like Badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* Avatar Lingkaran */}
                            <div
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                backgroundColor: '#0F3D82',
                                color: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.82rem',
                                flexShrink: 0,
                                boxShadow: '0 2px 5px rgba(15, 61, 130, 0.15)',
                              }}
                            >
                              {getAvatarInisial(item.namaStaf)}
                            </div>

                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <strong style={{ fontSize: '0.92rem', color: '#0F172A', letterSpacing: '0.01em' }}>
                                  {item.namaStaf.toUpperCase()}
                                </strong>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#F97316', display: 'inline-block' }} />
                              </div>
                              <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                                {item.roleStaf || 'Staff Operasional'}
                              </span>
                            </div>
                          </div>

                          {/* Sisi Kanan: Timestamp & Tombol Like Hijau/Cyan */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.74rem',
                                color: '#64748B',
                                backgroundColor: '#F8FAFC',
                                border: '1px solid #E2E8F0',
                                padding: '4px 10px',
                                borderRadius: '20px',
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#94A3B8' }}>
                                schedule
                              </span>
                              <span>{item.tanggal}</span>
                            </div>

                            {/* Tombol Dukungan / Like Sesuai Foto */}
                            <button
                              type="button"
                              onClick={() => {
                                setLikedPosts((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
                              }}
                              style={{
                                border: 'none',
                                backgroundColor: isLiked ? '#DCFCE7' : '#E6FFFA',
                                color: isLiked ? '#15803D' : '#0D9488',
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontSize: '0.76rem',
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
                              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
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
                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                                  delete
                                </span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Isi Pesan Saran (Teks Langsung Alami) */}
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
    </div>
  );
};
