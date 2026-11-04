import React, { useState, useEffect } from 'react';
import type { StaffFeedback, StaffMaster } from '../types';

interface StaffFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStaff: StaffMaster | null;
  isOwner?: boolean;
}

const STORAGE_KEY = 'mapahtrip_staff_feedback';

export const getStoredFeedback = (): StaffFeedback[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to parse stored feedback:', err);
  }
  // Default sample feedback
  const defaults: StaffFeedback[] = [
    {
      id: 'fb-1',
      namaStaf: 'Rizky',
      roleStaf: 'Staff PIC Jakarta',
      kategori: 'Alur Kerja JVAC',
      judul: 'Update formulir baru JVAC Kuningan per November',
      pesan: 'Mulai minggu ini loket JVAC Kuningan mewajibkan surat referensi bank mencantumkan saldo rata-rata 3 bulan terakhir. Mohon di panduan berkas pemohon ditambahkan catatan ini.',
      tanggal: '2026-11-01 14:20',
      status: 'Diproses',
      balasanOwner: 'Terima kasih Rizky! Panduan berkas sudah kami sesuaikan di form pendaftaran customer.',
    },
    {
      id: 'fb-2',
      namaStaf: 'Nanami Kay',
      roleStaf: 'Staff PIC Surabaya',
      kategori: 'Fitur Baru',
      judul: 'Usulan tombol cetak tanda terima paspor fisik',
      pesan: 'Apakah bisa ditambahkan tombol cetak tanda terima fisik singkat untuk pemohon yang menyerahkan paspor langsung di kantor Surabaya?',
      tanggal: '2026-10-29 09:15',
      status: 'Selesai',
      balasanOwner: 'Ide bagus, modul tanda terima cetak sudah masuk agenda pembaruan.',
    },
  ];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  } catch {}
  return defaults;
};

export const saveFeedbackList = (list: StaffFeedback[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to save feedback list:', err);
  }
};

export const StaffFeedbackModal: React.FC<StaffFeedbackModalProps> = ({
  isOpen,
  onClose,
  currentStaff,
  isOwner = false,
}) => {
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [feedbackList, setFeedbackList] = useState<StaffFeedback[]>([]);
  
  // Form State
  const [kategori, setKategori] = useState<StaffFeedback['kategori']>('Fitur Baru');
  const [judul, setJudul] = useState('');
  const [pesan, setPesan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFeedbackList(getStoredFeedback());
      setSuccessToast(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const staffName = isOwner ? 'Administrator' : (currentStaff?.nama || 'Staf PIC');
  const staffRole = isOwner ? 'Owner / Management' : (currentStaff?.role || 'Staff Operasional');

  // Filter history to current staff (or all if owner)
  const myHistory = isOwner
    ? feedbackList
    : feedbackList.filter(
        (f) =>
          f.namaStaf.toLowerCase() === staffName.toLowerCase() ||
          (currentStaff?.nama && f.namaStaf.toLowerCase().includes(currentStaff.nama.toLowerCase()))
      );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul.trim() || !pesan.trim()) {
      alert('Mohon isi judul dan rincian masukan Anda.');
      return;
    }

    setIsSubmitting(true);

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newFeedback: StaffFeedback = {
      id: `fb-${Date.now()}`,
      namaStaf: staffName,
      roleStaf: staffRole,
      kategori,
      judul: judul.trim(),
      pesan: pesan.trim(),
      tanggal: dateStr,
      status: 'Baru',
    };

    const updated = [newFeedback, ...feedbackList];
    setFeedbackList(updated);
    saveFeedbackList(updated);

    setIsSubmitting(false);
    setJudul('');
    setPesan('');
    setSuccessToast(true);

    // Auto switch to history after 1.2s
    setTimeout(() => {
      setSuccessToast(false);
      setActiveTab('history');
    }, 1200);
  };

  const getKategoriBadge = (kat: StaffFeedback['kategori']) => {
    switch (kat) {
      case 'Fitur Baru':
        return { bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE', icon: 'auto_awesome' };
      case 'Kendala / Bug':
        return { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA', icon: 'bug_report' };
      case 'Alur Kerja JVAC':
        return { bg: '#FEF3C7', color: '#B45309', border: '#FDE68A', icon: 'assured_workload' };
      case 'Tampilan / UI':
        return { bg: '#F3E8FF', color: '#6B21A8', border: '#E9D5FF', icon: 'palette' };
      default:
        return { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1', icon: 'chat' };
    }
  };

  const getStatusBadge = (status: StaffFeedback['status']) => {
    switch (status) {
      case 'Baru':
        return { bg: '#EFF6FF', color: '#1D4ED8', label: '⏳ Baru Dikirim' };
      case 'Diproses':
        return { bg: '#FEF3C7', color: '#B45309', label: '⚙️ Sedang Dikerjakan' };
      case 'Selesai':
        return { bg: '#DCFCE7', color: '#15803D', label: '✓ Sudah Diupdate' };
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '18px',
          width: '100%',
          maxWidth: '620px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden',
          border: '1px solid #E2E8F0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: '18px 24px',
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FBBF24',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                lightbulb
              </span>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
                Kotak Masukan &amp; Ide Staf
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#94A3B8' }}>
                Kritik, saran fitur, atau kendala lapangan untuk penyempurnaan sistem
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              color: '#FFFFFF',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              close
            </span>
          </button>
        </div>

        {/* Tab Switcher: Beri Masukan vs Riwayat Masukan */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            padding: '6px 20px 0',
            gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              color: activeTab === 'form' ? '#2563EB' : '#64748B',
              borderBottom: activeTab === 'form' ? '2.5px solid #2563EB' : '2.5px solid transparent',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
              edit_note
            </span>
            <span>Tulis Masukan Baru</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              color: activeTab === 'history' ? '#2563EB' : '#64748B',
              borderBottom: activeTab === 'history' ? '2.5px solid #2563EB' : '2.5px solid transparent',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
              history
            </span>
            <span>Riwayat Masukan ({myHistory.length})</span>
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {successToast && (
            <div
              style={{
                backgroundColor: '#DCFCE7',
                border: '1.5px solid #86EFAC',
                color: '#15803D',
                borderRadius: '12px',
                padding: '12px 16px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.85rem',
                fontWeight: 700,
                animation: 'fadeIn 0.2s ease',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                check_circle
              </span>
              <span>
                Terima kasih! Masukan Anda berhasil tersimpan di sistem dan segera ditinjau tim pengembang.
              </span>
            </div>
          )}

          {activeTab === 'form' ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Profil Pengirim Singkat */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.80rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#64748B' }}>
                    badge
                  </span>
                  <span style={{ color: '#64748B' }}>Pengirim:</span>
                  <strong style={{ color: '#0F172A' }}>{staffName}</strong>
                </div>
                <span
                  style={{
                    backgroundColor: '#EFF6FF',
                    color: '#1E40AF',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.72rem',
                  }}
                >
                  {staffRole}
                </span>
              </div>

              {/* Kategori Masukan */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#1E293B',
                    marginBottom: '6px',
                  }}
                >
                  Kategori Masukan:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                  {(['Fitur Baru', 'Kendala / Bug', 'Alur Kerja JVAC', 'Tampilan / UI', 'Lainnya'] as const).map(
                    (kat) => {
                      const isSelected = kategori === kat;
                      const badge = getKategoriBadge(kat);
                      return (
                        <button
                          key={kat}
                          type="button"
                          onClick={() => setKategori(kat)}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: isSelected ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
                            backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                            color: isSelected ? '#1E40AF' : '#475569',
                            fontWeight: isSelected ? 800 : 600,
                            fontSize: '0.74rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{
                              fontSize: '15px',
                              color: isSelected ? '#2563EB' : badge.color,
                            }}
                          >
                            {badge.icon}
                          </span>
                          <span>{kat}</span>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Judul Singkat */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#1E293B',
                    marginBottom: '6px',
                  }}
                >
                  Judul Ringkas Masukan:
                </label>
                <input
                  type="text"
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  placeholder="Contoh: Butuh tombol cetak surat tanda terima paspor"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '0.86rem',
                    color: '#0F172A',
                    boxSizing: 'border-box',
                    outline: 'none',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#2563EB')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#CBD5E1')}
                />
              </div>

              {/* Rincian Masukan */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#1E293B',
                    marginBottom: '6px',
                  }}
                >
                  Rincian Masukan / Usulan Fitur:
                </label>
                <textarea
                  value={pesan}
                  onChange={(e) => setPesan(e.target.value)}
                  placeholder="Jelaskan kebutuhan, masalah yang dihadapi di lapangan, atau tombol/fitur yang diinginkan secara detail..."
                  required
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '0.86rem',
                    color: '#0F172A',
                    boxSizing: 'border-box',
                    outline: 'none',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#2563EB')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#CBD5E1')}
                />
              </div>

              {/* Submit Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#475569',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    send
                  </span>
                  <span>{isSubmitting ? 'Menyimpan...' : 'Kirim Masukan ke Sistem'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* Tab History */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {myHistory.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: '#94A3B8',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '12px',
                    border: '1px dashed #CBD5E1',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#CBD5E1' }}>
                    inbox
                  </span>
                  <div style={{ fontWeight: 700, color: '#475569', marginTop: '8px' }}>
                    Belum Ada Riwayat Masukan
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '0.78rem' }}>
                    Setiap saran atau kendala yang Anda kirim akan tercatat dan dapat dipantau di sini.
                  </p>
                </div>
              ) : (
                myHistory.map((item) => {
                  const katBadge = getKategoriBadge(item.kategori);
                  const statusBadge = getStatusBadge(item.status);

                  return (
                    <div
                      key={item.id}
                      style={{
                        border: '1px solid #E2E8F0',
                        borderRadius: '12px',
                        padding: '14px',
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      {/* Header Card */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                            <span
                              style={{
                                backgroundColor: katBadge.bg,
                                color: katBadge.color,
                                border: `1px solid ${katBadge.border}`,
                                borderRadius: '6px',
                                padding: '1px 6px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                                {katBadge.icon}
                              </span>
                              <span>{item.kategori}</span>
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>• {item.tanggal}</span>
                            {isOwner && (
                              <span style={{ fontSize: '0.72rem', color: '#2563EB', fontWeight: 600 }}>
                                (Oleh: {item.namaStaf} - {item.roleStaf})
                              </span>
                            )}
                          </div>
                          <strong style={{ fontSize: '0.88rem', color: '#0F172A' }}>{item.judul}</strong>
                        </div>

                        <span
                          style={{
                            backgroundColor: statusBadge.bg,
                            color: statusBadge.color,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.70rem',
                            fontWeight: 800,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {statusBadge.label}
                        </span>
                      </div>

                      {/* Pesan Staf */}
                      <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: 1.45 }}>
                        {item.pesan}
                      </p>

                      {/* Balasan Owner jika ada */}
                      {item.balasanOwner && (
                        <div
                          style={{
                            marginTop: '4px',
                            backgroundColor: '#F0FDF4',
                            border: '1px solid #BBF7D0',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            fontSize: '0.78rem',
                            color: '#166534',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '6px',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#16A34A', flexShrink: 0, marginTop: '1px' }}>
                            reply
                          </span>
                          <div>
                            <strong>Tanggapan Manajemen:</strong> {item.balasanOwner}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

