import React, { useState } from 'react';
import { mockKonsjen } from '../data/mockData';
import type { StaffMaster, KonsjenKota } from '../types';

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
  const [activeTab, setActiveTab] = useState<'staff' | 'konsjen' | 'profile'>(() => (isOwner ? 'staff' : 'konsjen'));

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>
              settings
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary)' }}>
              {isOwner ? 'Manajemen Akun Staf & Master Data' : 'Konfigurasi & Master Data'}
            </span>
          </div>
          <h1 className="font-serif" style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>
            {isOwner ? 'Pengaturan & Akun Staf' : 'Pengaturan & Informasi Operasional'}
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.85rem', margin: 0 }}>
            {isOwner
              ? 'Kelola akun operasional ke-6 staf konsuler, hak akses PIN login, dan master data tarif konsulat.'
              : 'Direktori operasional konsuler dan referensi tarif Konsulat Jenderal Jepang se-Indonesia.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'inline-flex', backgroundColor: '#F1F5F9', padding: '4px', borderRadius: '10px', gap: '4px' }}>
          {isOwner ? (
            <>
              <button
                type="button"
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
                <span>Kelola Akun Staf ({staffList.length})</span>
              </button>
              <button
                type="button"
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
                <span>Master Konsulat Jenderal</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
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
                <span>Master Konsulat Jenderal</span>
              </button>
              <button
                type="button"
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
                <span>Profil Akun Saya</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* TAB 1: KELOLA AKUN STAF (Owner Only) */}
      {activeTab === 'staff' && isOwner && (
        <div className="card" style={{ padding: '20px', borderRadius: '16px' }}>
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                    <span>{showPins ? 'Sembunyikan PIN' : 'Tampilkan PIN Staf'}</span>
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
                    <span>+ Buat Akun Staf Baru</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="data-table-container">
            <table className="data-table" style={{ fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th style={{ width: '50px', textAlign: 'center' }}>No</th>
                  <th>Nama Staf</th>
                  <th>Username / Email</th>
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
        </div>
      )}

      
      {/* TAB 3: PROFIL SAYA (Staff Mode) */}
      {activeTab === 'profile' && !isOwner && (
        <div className="card" style={{ padding: '24px', borderRadius: '16px', maxWidth: '640px' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: '#DCFCE7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#16A34A',
                  flexShrink: 0,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>workspace_premium</span>
              </div>
            {(() => {
              const staffTugasCity = currentStaff?.konsjenTugas?.[0] || 'Jakarta';
              const staffKonsjenData = mockKonsjen.find((k) => k.kota === staffTugasCity) || mockKonsjen[0];
              const staffTotalSelesai = staffKonsjenData?.totalSelesai || 184;
              return (
                <div>
                  <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span>Pencapaian Kinerja PIC: {currentStaff?.nama || 'Rizky'} (Wilayah {staffTugasCity})</span>
                    <span style={{ backgroundColor: '#DCFCE7', color: '#15803D', padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800 }}>
                      {staffTotalSelesai} Paspor Selesai • 100% Sukses 🏆
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#15803D', marginTop: '3px' }}>
                    Luar biasa! Seluruh <strong>{staffTotalSelesai} berkas visa</strong> di wilayah tugas Anda berhasil terbit 100% tanpa ada penolakan (Zero Rejection).
                  </div>
                </div>
              );
            })()}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ textAlign: 'right', borderLeft: '2px solid #BBF7D0', paddingLeft: '14px' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Predikat Staf
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>
                  🌟 Staff PIC Teladan
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '20px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                  Master Data Konsulat Jenderal (Konsjen)
                </h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B' }}>
                  Daftar kantor konsuler resmi perwakilan Jepang, staf PIC, dan performa penanganan visa.
                </p>
              </div>
              <span className="badge badge-success">5 Konsulat Terhubung</span>
            </div>

            <div className="data-table-container">
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
          </div>
        </div>
      )}

      {/* MODAL: BUAT / EDIT AKUN STAF (KHUSUS OWNER) */}
      {isStaffModalOpen && (
        <div
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
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              overflow: 'hidden',
              border: '1px solid #E2E8F0',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                padding: '20px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ margin: '0 0 2px', fontSize: '1.1rem', fontWeight: 800 }}>
                  {editingStaffId ? 'Edit Akun Staf' : 'Buat Akun Staf Baru'}
                </h3>
                <span style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
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
                }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveStaff} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
