import React, { useState, useEffect, useMemo } from 'react';
import type { Pengajuan, AffiliateUser } from '../types';
import { fetchAllMitraFromDB } from '../lib/supabase';
import { REAL_SPREADSHEET_AFFILIATES } from '../data/spreadsheetData';

interface AffiliateViewProps {
  pengajuanList?: Pengajuan[];
  onNavigateToPengajuan?: (refCode: string) => void;
  isOwner?: boolean;
  onAffiliatesCountChange?: (count: number) => void;
}

export const AffiliateView: React.FC<AffiliateViewProps> = ({
  pengajuanList = [],
  onNavigateToPengajuan,
  isOwner = false,
  onAffiliatesCountChange,
}) => {
  const [affiliates, setAffiliates] = useState<AffiliateUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'has_applicants' | 'no_applicants'>('all');
  const [selectedMitra, setSelectedMitra] = useState<any | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Load live data mitra dari Supabase & LocalStorage
  const loadAffiliates = async () => {
    setIsLoading(true);
    try {
      const userMap = new Map<string, AffiliateUser>();

      // Daftar kode dummy / uji coba bawaan template lama yang wajib dibersihkan
      const DUMMY_CODES = new Set([
        'TOKUTEI-INDONESIA',
        'SUB-NIPPON-ACADEMY',
        'BALI-HIKARI-CARE',
        'LPK-JAPANCENTER',
        'MEDAN-SAKURA-TRIP',
        'MAKASSAR-NIPPON',
      ]);

      const isDummy = (code?: string, name?: string) => {
        const c = (code || '').trim().toUpperCase();
        const n = (name || '').trim().toLowerCase();
        return DUMMY_CODES.has(c) || n.includes('admin komunitas') || n.includes('kenji tanaka') || n.includes('made yuliana');
      };

      // 1. Baca data dari localStorage all affiliates (abaikan data dummy)
      try {
        const raw = localStorage.getItem('mapahtrip_all_affiliates');
        if (raw) {
          const locals: AffiliateUser[] = JSON.parse(raw);
          locals.forEach((u) => {
            const key = (u.affiliateCode || u.email || '').trim().toUpperCase();
            if (key && !isDummy(u.affiliateCode, u.nama)) userMap.set(key, u);
          });
        }
      } catch {}

      // 2. Baca current affiliate dari localStorage (misal Syafiq Abdurrahman)
      try {
        const curRaw = localStorage.getItem('mapahtrip_current_affiliate');
        if (curRaw) {
          const cur: AffiliateUser = JSON.parse(curRaw);
          const key = (cur.affiliateCode || cur.email || '').trim().toUpperCase();
          if (key && !isDummy(cur.affiliateCode, cur.nama)) userMap.set(key, cur);
        }
      } catch {}

      // 3. Ambil data real-time dari Supabase Cloud
      try {
        const dbUsers = await fetchAllMitraFromDB();
        if (dbUsers && dbUsers.length > 0) {
          dbUsers.forEach((u) => {
            const key = (u.affiliateCode || u.email || '').trim().toUpperCase();
            if (key && !isDummy(u.affiliateCode, u.nama)) userMap.set(key, u);
          });
        }
      } catch (err) {
        console.warn('Gagal memuat mitra dari Supabase:', err);
      }

      // 4. Default baseline mitra terdaftar dari data spreadsheet resmi (63 mitra)
      REAL_SPREADSHEET_AFFILIATES.forEach((m) => {
        const key = m.affiliateCode.trim().toUpperCase();
        if (!isDummy(m.affiliateCode, m.nama)) {
          if (!userMap.has(key)) {
            userMap.set(key, m);
          } else {
            // Merge data agar atribut spreadsheet (seperti totalBonus & namaBank) tetap lengkap
            userMap.set(key, { ...m, ...userMap.get(key) });
          }
        }
      });

      const finalAffiliates = Array.from(userMap.values()).filter(
        (u) => !isDummy(u.affiliateCode, u.nama)
      );
      setAffiliates(finalAffiliates);
      const externalMitraCount = finalAffiliates.filter(
        (u) => (u.affiliateCode || '').trim().toUpperCase() !== 'MAPAHTRIP' && !u.nama?.toLowerCase().includes('owner')
      ).length;
      onAffiliatesCountChange?.(externalMitraCount);

      // Simpan kembali ke localStorage untuk membersihkan data dummy secara permanen dari browser
      try {
        localStorage.setItem('mapahtrip_all_affiliates', JSON.stringify(finalAffiliates));
      } catch {}
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAffiliates();
  }, []);

  const formatRupiah = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  const handleCopyCode = (code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Hitung jumlah pemohon riil per mitra dari daftar pengajuan aktif
  const getMitraApplicants = (code: string) => {
    if (!code) return [];
    const cleanCode = code.trim().toUpperCase();
    return pengajuanList.filter((p) => {
      const pCode = (p.affiliateCode || '').trim().toUpperCase();
      return pCode && pCode === cleanCode;
    });
  };

  // Ranking data mitra yang digabungkan dengan pemohon riil (Hanya mitra eksternal, akun internal/owner disaring)
  const enrichedMitraList = useMemo(() => {
    return affiliates
      .filter((aff) => {
        const code = (aff.affiliateCode || '').trim().toUpperCase();
        return code !== 'MAPAHTRIP' && !aff.nama?.toLowerCase().includes('owner');
      })
      .map((aff) => {
      const applicants = getMitraApplicants(aff.affiliateCode);
      const bonusFromSheet = aff.totalBonus !== undefined && aff.totalBonus !== null ? Number(aff.totalBonus) : 0;
      const calculatedFromApplicants = applicants.reduce((acc, p) => {
        const fee = p.referralFee !== undefined && p.referralFee !== null && p.referralFee > 0
          ? Number(p.referralFee)
          : 100000;
        return acc + fee;
      }, 0);
      const totalKomisi = applicants.length > 0 ? calculatedFromApplicants : bonusFromSheet;
      const pemohonCount = applicants.length > 0 ? applicants.length : (bonusFromSheet > 0 ? Math.floor(bonusFromSheet / 100000) : 0);

      // Hitung statistik tahapan berkas
      const berkasSampaiCount = applicants.filter((p) => p.tglBerkasMasuk && p.tglBerkasMasuk !== '-').length;
      const prosesCount = applicants.filter((p) => p.tglApply && p.tglApply !== '-').length;
      const selesaiCount = applicants.filter((p) => p.status === 'Selesai' || (p.tglSelesai && p.tglSelesai !== '-')).length;

      // Hitung tanggal pengajuan terbaru & status keaktifan mitra bawa customer
      let lastApplicantDate: Date | null = null;
      let lastApplicantDateStr: string | null = null;

      for (const p of applicants) {
        const rawDate = p.tglBerkasMasuk || p.tglApply;
        if (rawDate && rawDate !== '-' && rawDate.trim() !== '') {
          let parsedTime = Date.parse(rawDate);
          if (isNaN(parsedTime)) {
            const parts = rawDate.split(/[-/]/);
            if (parts.length === 3) {
              if (parts[0].length === 4) {
                parsedTime = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime();
              } else {
                parsedTime = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
              }
            }
          }
          if (!isNaN(parsedTime)) {
            const d = new Date(parsedTime);
            if (!lastApplicantDate || d.getTime() > lastApplicantDate.getTime()) {
              lastApplicantDate = d;
              lastApplicantDateStr = rawDate;
            }
          }
        }
      }

      let daysSinceLastApplicant: number | null = null;
      let activityStatus: 'active' | 'idle' | 'inactive' | 'never' = 'never';
      let lastActivityText = 'Belum pernah bawa';
      let lastApplicantDateFormatted = '-';

      if (lastApplicantDate) {
        const now = new Date();
        const diffMs = now.getTime() - lastApplicantDate.getTime();
        const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        daysSinceLastApplicant = diffDays;

        if (diffDays <= 30) {
          activityStatus = 'active'; // Aktif (baru bawa dalam 30 hari terakhir)
        } else if (diffDays <= 90) {
          activityStatus = 'idle'; // Mulai Pasif (1 - 3 bulan lalu)
        } else {
          activityStatus = 'inactive'; // Lama Pasif (> 3 bulan lalu)
        }

        try {
          lastApplicantDateFormatted = lastApplicantDate.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
        } catch {
          lastApplicantDateFormatted = lastApplicantDateStr || '-';
        }

        if (diffDays === 0) {
          lastActivityText = 'Hari ini';
        } else if (diffDays === 1) {
          lastActivityText = 'Kemarin';
        } else if (diffDays < 7) {
          lastActivityText = `${diffDays} hari lalu`;
        } else if (diffDays < 30) {
          const weeks = Math.floor(diffDays / 7);
          lastActivityText = `${weeks} minggu lalu (${diffDays} hr)`;
        } else if (diffDays < 365) {
          const months = Math.floor(diffDays / 30);
          lastActivityText = `${months} bln lalu (${diffDays} hr)`;
        } else {
          const years = Math.floor(diffDays / 365);
          lastActivityText = `${years} thn lalu (${diffDays} hr)`;
        }
      }

      return {
        ...aff,
        applicants,
        pemohonCount,
        totalKomisi,
        berkasSampaiCount,
        prosesCount,
        selesaiCount,
        lastApplicantDate,
        lastApplicantDateStr,
        lastApplicantDateFormatted,
        daysSinceLastApplicant,
        activityStatus,
        lastActivityText,
      };
    });
  }, [affiliates, pengajuanList]);

  useEffect(() => {
    onAffiliatesCountChange?.(enrichedMitraList.length);
  }, [enrichedMitraList.length, onAffiliatesCountChange]);

  // Total KPI Keseluruhan
  const totalMitraCount = enrichedMitraList.length;
  const totalPemohonViaReferral = useMemo(() => {
    return pengajuanList.filter((p) => p.affiliateCode && p.affiliateCode.trim().toUpperCase() !== 'MAPAHTRIP').length;
  }, [pengajuanList]);

  const totalKomisiAll = useMemo(() => {
    return enrichedMitraList.reduce((sum, a) => sum + a.totalKomisi, 0);
  }, [enrichedMitraList]);

  const activeMitraWithApplicants = useMemo(() => {
    return enrichedMitraList.filter((a) => a.pemohonCount > 0).length;
  }, [enrichedMitraList]);

  const inactiveMitraWithoutApplicants = useMemo(() => {
    return enrichedMitraList.filter((a) => a.pemohonCount === 0).length;
  }, [enrichedMitraList]);

  // Filter & Search
  const filteredMitra = useMemo(() => {
    return enrichedMitraList.filter((m) => {
      // 1. Search Query
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        m.nama.toLowerCase().includes(q) ||
        m.affiliateCode.toLowerCase().includes(q) ||
        (m.lembaga && m.lembaga.toLowerCase().includes(q)) ||
        (m.noWa && m.noWa.includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.provinsi && m.provinsi.toLowerCase().includes(q));

      // 2. Status Pemohon Filter
      let matchCat = true;
      if (categoryFilter === 'has_applicants') {
        matchCat = m.pemohonCount > 0;
      } else if (categoryFilter === 'no_applicants') {
        matchCat = m.pemohonCount === 0;
      }

      return matchSearch && matchCat;
    }).sort((a, b) => {
      // 1. Prioritaskan mitra dengan total komisi tertinggi di atas
      if (b.totalKomisi !== a.totalKomisi) {
        return b.totalKomisi - a.totalKomisi;
      }
      // 2. Jika komisi sama, prioritaskan jumlah pemohon terbanyak
      if (b.pemohonCount !== a.pemohonCount) {
        return b.pemohonCount - a.pemohonCount;
      }
      // 3. Jika sama, urutkan berdasarkan abjad nama
      return a.nama.localeCompare(b.nama);
    });
  }, [enrichedMitraList, searchQuery, categoryFilter]);

  // Reset ke halaman 1 saat pencarian, kategori filter, atau ukuran halaman berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, pageSize]);

  const totalItems = filteredMitra.length;
  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = pageSize === -1 ? 0 : (activePage - 1) * pageSize;
  const endIndex = pageSize === -1 ? totalItems : Math.min(startIndex + pageSize, totalItems);

  const paginatedMitra = useMemo(() => {
    if (pageSize === -1) return filteredMitra;
    return filteredMitra.slice(startIndex, endIndex);
  }, [filteredMitra, pageSize, startIndex, endIndex]);


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Utama */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '20px', padding: '3px 10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px' }}>⛩️</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0284C7', letterSpacing: '0.02em' }}>
              {isOwner ? 'Kelola Kemitraan & Program Payout Mitra' : 'Mitra & Agen Referral MapahTrip'}
            </span>
          </div>
          <h1 style={{ fontSize: '1.70rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
            Program Affiliate &amp; Kemitraan
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.86rem', margin: '4px 0 0', lineHeight: '1.4' }}>
            Pantau kode referral, status mitra LPK/agensi, rekening pencairan komisi, dan berkas pemohon binaan.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadAffiliates}
            title="Muat ulang data dari database"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.80rem',
              fontWeight: 600,
              padding: '8px 14px',
              borderRadius: '10px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              color: '#475569',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#64748B' }}>
              refresh
            </span>
            <span>Refresh</span>
          </button>

        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="affiliate-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
        {/* Card 1: Total Mitra */}
        <div
          className="card"
          style={{
            padding: '16px 18px',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Mitra
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0284C7' }}>groups</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.1, marginBottom: '6px' }}>
              {totalMitraCount} <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B' }}>Mitra</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#0369A1', backgroundColor: '#F0F9FF', padding: '2px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#0284C7' }}>verified</span>
              <span>LPK, Agensi, &amp; Umum</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Pemohon via Referral */}
        <div
          className="card"
          style={{
            padding: '16px 18px',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Pemohon Referral
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#16A34A' }}>how_to_reg</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#15803D', lineHeight: 1.1, marginBottom: '6px' }}>
              {totalPemohonViaReferral} <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B' }}>Orang</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
              Dari total <strong>{pengajuanList.length}</strong> visa di sistem
            </div>
          </div>
        </div>

        {/* Card 3: Total Komisi */}
        <div
          className="card"
          style={{
            padding: '16px 18px',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Komisi
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#D97706' }}>payments</span>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', whiteSpace: 'nowrap', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#D97706' }}>Rp</span>
              <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                {totalKomisiAll.toLocaleString('id-ID')}
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#D97706', backgroundColor: '#FFFBEB', padding: '2px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>price_check</span>
              <span>Rp 100.000 / visa flat</span>
            </div>
          </div>
        </div>

        {/* Card 4: Mitra Aktif */}
        <div
          className="card"
          style={{
            padding: '16px 18px',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Mitra Aktif
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#7C3AED' }}>trending_up</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#6D28D9', lineHeight: 1.1, marginBottom: '6px' }}>
              {activeMitraWithApplicants} <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B' }}>Mitra</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
              Telah membawa minimal 1 pemohon
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card" style={{ padding: '16px' }}>
        {/* Filter, Page Size & Search Bar */}
        <div className="affiliate-filter-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Tampilkan Page Size (Dropdown seperti di Pengajuan) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.84rem', fontWeight: 500 }}>
              <span>Tampilkan</span>
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    padding: '6px 28px 6px 14px',
                    borderRadius: '9999px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#F8FAFC',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    color: '#0F172A',
                    cursor: 'pointer',
                    outline: 'none',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  }}
                  title="Pilih jumlah mitra yang ditampilkan per halaman"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={-1}>Semua</option>
                </select>
                <span
                  className="material-symbols-outlined"
                  style={{
                    position: 'absolute',
                    right: '8px',
                    pointerEvents: 'none',
                    fontSize: '16px',
                    color: '#64748B',
                  }}
                >
                  expand_more
                </span>
              </div>
            </div>

            {/* Filter Chips */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: `Semua (${enrichedMitraList.length})` },
                { id: 'has_applicants', label: `Ada Pemohon (${activeMitraWithApplicants})` },
                { id: 'no_applicants', label: `Belum Ada (${inactiveMitraWithoutApplicants})` },
              ].map((t) => {
                const active = categoryFilter === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setCategoryFilter(t.id as any)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '20px',
                      fontSize: '0.74rem',
                      fontWeight: active ? 700 : 500,
                      border: active ? '1px solid #0284C7' : '1px solid #E2E8F0',
                      backgroundColor: active ? '#EFF6FF' : '#FFFFFF',
                      color: active ? '#0284C7' : '#64748B',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sisi Kanan: Input Pencarian... */}
          <div className="affiliate-search-wrapper" style={{ position: 'relative', minWidth: '220px', maxWidth: '300px', width: '100%' }}>
            <input
              type="text"
              placeholder="Pencarian..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 18px',
                borderRadius: '9999px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                fontSize: '0.84rem',
                color: '#0F172A',
                outline: 'none',
                boxSizing: 'border-box',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Tabel Data Mitra */}
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px', animation: 'spin 1s infinite linear' }}>
              sync
            </span>
            <p style={{ margin: '8px 0 0', fontSize: '0.84rem' }}>Memuat daftar mitra affiliate...</p>
          </div>
        ) : filteredMitra.length === 0 ? (
          <div style={{ padding: '48px 16px', textAlign: 'center', color: '#64748B' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#CBD5E1', marginBottom: '8px' }}>
              person_search
            </span>
            <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.92rem' }}>
              Tidak Ada Mitra yang Sesuai
            </div>
            <p style={{ margin: '4px 0 12px', fontSize: '0.78rem' }}>
              Coba ubah kata kunci pencarian atau ganti filter kategori.
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
              }}
              style={{ fontSize: '0.76rem', padding: '6px 14px' }}
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <>
            <div className="data-table-container affiliate-desktop-table" style={{ overflow: 'visible', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 14px rgba(0,0,0,0.03)', background: '#ffffff' }}>
            <table className="data-table table-compact" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ width: '38px', textAlign: 'center', whiteSpace: 'nowrap', position: 'sticky', top: '68px', backgroundColor: '#F8FAFC', zIndex: 25, borderBottom: '2px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', borderTopLeftRadius: '15px', padding: '8px 4px' }}>
                    No.
                  </th>
                  <th style={{ width: '90px', whiteSpace: 'nowrap', position: 'sticky', top: '68px', backgroundColor: '#F8FAFC', zIndex: 25, borderBottom: '2px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', padding: '8px 6px' }}>
                    Kode Referral
                  </th>
                  <th style={{ minWidth: '140px', whiteSpace: 'nowrap', position: 'sticky', top: '68px', backgroundColor: '#F8FAFC', zIndex: 25, borderBottom: '2px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', padding: '8px 6px' }}>
                    Mitra &amp; Lembaga
                  </th>
                  <th style={{ width: '115px', whiteSpace: 'nowrap', position: 'sticky', top: '68px', backgroundColor: '#F8FAFC', zIndex: 25, borderBottom: '2px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', padding: '8px 6px' }}>
                    Kontak &amp; WhatsApp
                  </th>
                  <th style={{ minWidth: '125px', whiteSpace: 'nowrap', position: 'sticky', top: '68px', backgroundColor: '#F8FAFC', zIndex: 25, borderBottom: '2px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', padding: '8px 6px' }}>
                    Rekening Pencairan
                  </th>
                  <th style={{ minWidth: '150px', whiteSpace: 'nowrap', position: 'sticky', top: '68px', backgroundColor: '#F8FAFC', zIndex: 25, borderBottom: '2px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', padding: '8px 6px' }}>
                    Pemohon &amp; Keaktifan
                  </th>
                  <th style={{ textAlign: 'right', width: '105px', whiteSpace: 'nowrap', position: 'sticky', top: '68px', backgroundColor: '#F8FAFC', zIndex: 25, borderBottom: '2px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', padding: '8px 6px' }}>
                    Total Komisi
                  </th>
                  <th
                    style={{
                      width: '78px',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      position: 'sticky',
                      top: '68px',
                      backgroundColor: '#F8FAFC',
                      zIndex: 25,
                      borderBottom: '2px solid #CBD5E1',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                      borderTopRightRadius: '15px',
                      padding: '8px 6px',
                    }}
                  >
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedMitra.map((mitra, index) => {
                  const isSyafiq = mitra.affiliateCode === 'MPH425SY';
                  return (
                    <tr
                      key={mitra.id || mitra.affiliateCode}
                      style={{
                        backgroundColor: isSyafiq ? '#F0F9FF' : undefined,
                      }}
                    >
                      {/* Nomor Urut */}
                      <td style={{ textAlign: 'center', fontWeight: 800, color: '#64748B', fontSize: '0.78rem', whiteSpace: 'nowrap', padding: '10px 6px' }}>
                        {startIndex + index + 1}
                      </td>

                      {/* Kode Referral */}
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 800,
                              fontSize: '0.78rem',
                              color: '#0284C7',
                              letterSpacing: '0.02em',
                              backgroundColor: '#E0F2FE',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {mitra.affiliateCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(mitra.affiliateCode)}
                            title="Salin Kode Referral"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: copiedCode === mitra.affiliateCode ? '#16A34A' : '#94A3B8',
                              cursor: 'pointer',
                              padding: '1px',
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                              {copiedCode === mitra.affiliateCode ? 'check' : 'content_copy'}
                            </span>
                          </button>
                        </div>
                      </td>

                      {/* Mitra & Lembaga */}
                      <td>
                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.80rem', lineHeight: '1.2' }}>
                          {mitra.nama}
                        </div>
                        <div style={{ fontSize: '0.70rem', color: '#475569', marginTop: '2px', lineHeight: '1.2' }}>
                          {mitra.lembaga && mitra.lembaga !== '-' ? mitra.lembaga : mitra.statusMitra || 'Mitra Independen'}
                          {mitra.provinsi && <span style={{ color: '#94A3B8' }}> • {mitra.provinsi}</span>}
                        </div>
                        <div style={{ fontSize: '0.66rem', color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                          {mitra.email}
                        </div>
                      </td>

                      {/* Kontak & WhatsApp */}
                      <td>
                        {mitra.noWa ? (
                          <a
                            href={`https://wa.me/${mitra.noWa.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              color: '#15803D',
                              textDecoration: 'none',
                              fontWeight: 600,
                              fontSize: '0.74rem',
                              whiteSpace: 'nowrap',
                            }}
                            title="Buka Chat WhatsApp dengan PIC Mitra"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#16A34A' }}>
                              chat
                            </span>
                            <span>{mitra.noWa}</span>
                          </a>
                        ) : (
                          <span style={{ color: '#CBD5E1', fontSize: '0.74rem' }}>-</span>
                        )}
                      </td>

                      {/* Rekening Pencairan */}
                      <td>
                        <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0F172A', lineHeight: '1.2' }}>
                          {mitra.namaBank || 'BCA'} {mitra.nomorRekening ? `• ${mitra.nomorRekening}` : ''}
                        </div>
                        {mitra.atasNamaRekening && (
                          <div style={{ fontSize: '0.68rem', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>
                            a.n. {mitra.atasNamaRekening}
                          </div>
                        )}
                      </td>

                      {/* Pemohon & Keaktifan */}
                      <td style={{ whiteSpace: 'nowrap', padding: '8px 6px' }}>
                        {mitra.pemohonCount > 0 ? (
                          <div>
                            {/* Baris 1: Jumlah orang + Status Chip */}
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              <span
                                style={{
                                  backgroundColor: '#DCFCE7',
                                  color: '#15803D',
                                  fontWeight: 800,
                                  fontSize: '0.74rem',
                                  padding: '2px 7px',
                                  borderRadius: '10px',
                                }}
                              >
                                {mitra.pemohonCount} orang
                              </span>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '1px 6px',
                                  borderRadius: '9999px',
                                  fontSize: '0.66rem',
                                  fontWeight: 700,
                                  backgroundColor:
                                    mitra.activityStatus === 'active'
                                      ? '#DCFCE7'
                                      : mitra.activityStatus === 'idle'
                                      ? '#FEF9C3'
                                      : '#FEE2E2',
                                  color:
                                    mitra.activityStatus === 'active'
                                      ? '#15803D'
                                      : mitra.activityStatus === 'idle'
                                      ? '#A16207'
                                      : '#B91C1C',
                                  border: `1px solid ${
                                    mitra.activityStatus === 'active'
                                      ? '#BBF7D0'
                                      : mitra.activityStatus === 'idle'
                                      ? '#FEF08A'
                                      : '#FECACA'
                                  }`,
                                }}
                              >
                                <span style={{ fontSize: '6px' }}>●</span>
                                <span>
                                  {mitra.activityStatus === 'active'
                                    ? 'Aktif'
                                    : mitra.activityStatus === 'idle'
                                    ? 'Mulai Pasif'
                                    : 'Lama Pasif'}
                                </span>
                              </span>
                            </div>

                            {/* Baris 2: Tanggal Terakhir */}
                            <div style={{ fontSize: '0.67rem', color: '#475569', marginTop: '3px', lineHeight: 1.2 }}>
                              Terakhir: <strong style={{ color: '#0F172A' }}>{mitra.lastApplicantDateFormatted}</strong>
                            </div>

                            {/* Baris 3: Durasi berapa lama (di bawahnya lagi) */}
                            <div style={{ fontSize: '0.64rem', color: '#64748B', marginTop: '1px', lineHeight: 1.2 }}>
                              ({mitra.lastActivityText})
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ color: '#94A3B8', fontSize: '0.74rem', fontWeight: 600 }}>0 orang</span>
                            <span
                              style={{
                                padding: '1px 6px',
                                borderRadius: '9999px',
                                fontSize: '0.65rem',
                                fontWeight: 500,
                                backgroundColor: '#F1F5F9',
                                color: '#94A3B8',
                                border: '1px solid #E2E8F0',
                              }}
                            >
                              Belum pernah bawa
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Total Komisi */}
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.80rem', color: mitra.totalKomisi > 0 ? '#0F172A' : '#94A3B8', whiteSpace: 'nowrap' }}>
                        {formatRupiah(mitra.totalKomisi)}
                      </td>

                      {/* Aksi */}
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap', padding: '6px 8px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setSelectedMitra(mitra)}
                          style={{
                            padding: '5px 12px',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            borderRadius: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          title="Lihat profil mitra & daftar pemohon"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>visibility</span>
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (Hanya Tampil di Layar HP / max-width: 768px via CSS) */}
          <div className="affiliate-mobile-cards">
            {paginatedMitra.map((mitra, index) => {
              const isSyafiq = mitra.affiliateCode === 'MPH425SY';
              const waClean = (mitra.noWa || '').replace(/[^0-9]/g, '');
              const waLink = waClean
                ? `https://wa.me/${waClean.startsWith('0') ? '62' + waClean.slice(1) : waClean}`
                : null;

              return (
                <div
                  key={`mobile-${mitra.id || mitra.affiliateCode}`}
                  style={{
                    backgroundColor: isSyafiq ? '#F0F9FF' : '#FFFFFF',
                    border: `1px solid ${isSyafiq ? '#BAE6FD' : '#E2E8F0'}`,
                    borderRadius: '14px',
                    padding: '14px 16px',
                    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  {/* Baris 1: Header (No, Nama & Status Badge) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            color: '#64748B',
                            backgroundColor: '#F1F5F9',
                            padding: '1px 6px',
                            borderRadius: '6px',
                            lineHeight: 1.2,
                          }}
                        >
                          #{startIndex + index + 1}
                        </span>
                        <strong
                          style={{
                            fontSize: '0.92rem',
                            color: '#0F172A',
                            fontWeight: 700,
                            wordBreak: 'break-word',
                          }}
                        >
                          {mitra.nama}
                        </strong>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                        {mitra.lembaga || 'Mitra Independen'} • {mitra.provinsi || 'Indonesia'}
                      </div>
                    </div>

                    {/* Status Keaktifan Badge */}
                    {mitra.pemohonCount > 0 ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          backgroundColor:
                            mitra.activityStatus === 'active'
                              ? '#DCFCE7'
                              : mitra.activityStatus === 'idle'
                              ? '#FEF9C3'
                              : '#FEE2E2',
                          color:
                            mitra.activityStatus === 'active'
                              ? '#15803D'
                              : mitra.activityStatus === 'idle'
                              ? '#A16207'
                              : '#B91C1C',
                          border: `1px solid ${
                            mitra.activityStatus === 'active'
                              ? '#BBF7D0'
                              : mitra.activityStatus === 'idle'
                              ? '#FEF08A'
                              : '#FECACA'
                          }`,
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ fontSize: '6px' }}>●</span>
                        <span>
                          {mitra.activityStatus === 'active'
                            ? 'Aktif'
                            : mitra.activityStatus === 'idle'
                            ? 'Mulai Pasif'
                            : 'Lama Pasif'}
                        </span>
                      </span>
                    ) : (
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          fontSize: '0.66rem',
                          fontWeight: 500,
                          backgroundColor: '#F1F5F9',
                          color: '#94A3B8',
                          border: '1px solid #E2E8F0',
                          flexShrink: 0,
                        }}
                      >
                        Belum pernah bawa
                      </span>
                    )}
                  </div>

                  {/* Baris 2: Kode Referral & Kontak WhatsApp */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Kode Referral */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          color: '#0284C7',
                          backgroundColor: '#E0F2FE',
                          padding: '3px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        {mitra.affiliateCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(mitra.affiliateCode)}
                        title="Salin Kode Referral"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: copiedCode === mitra.affiliateCode ? '#16A34A' : '#94A3B8',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'inline-flex',
                          alignItems: 'center',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                          {copiedCode === mitra.affiliateCode ? 'check' : 'content_copy'}
                        </span>
                      </button>
                    </div>

                    {/* WhatsApp Direct Link */}
                    {waLink ? (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#16A34A',
                          backgroundColor: '#F0FDF4',
                          border: '1px solid #DCFCE7',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          textDecoration: 'none',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#16A34A' }}>
                          chat
                        </span>
                        <span>{mitra.noWa}</span>
                      </a>
                    ) : (
                      <span style={{ color: '#94A3B8', fontSize: '0.74rem' }}>{mitra.noWa || '-'}</span>
                    )}
                  </div>

                  {/* Baris 3: Rekening Bank & Keaktifan */}
                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderRadius: '10px',
                      padding: '8px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      fontSize: '0.74rem',
                      border: '1px solid #F1F5F9',
                    }}
                  >
                    {/* Rekening Bank */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#64748B' }}>
                        account_balance
                      </span>
                      <span>
                        <strong>{mitra.namaBank || 'BCA'}</strong> • {mitra.nomorRekening || '-'} <span style={{ color: '#64748B' }}>(a.n. {mitra.atasNamaRekening || mitra.nama})</span>
                      </span>
                    </div>

                    {/* Histori Pemohon */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#64748B' }}>
                        group
                      </span>
                      {mitra.pemohonCount > 0 ? (
                        <span>
                          <strong>{mitra.pemohonCount} orang</strong> dibawa • Terakhir: <strong>{mitra.lastApplicantDateFormatted}</strong> ({mitra.lastActivityText})
                        </span>
                      ) : (
                        <span style={{ color: '#94A3B8' }}>0 orang pemohon dibawa</span>
                      )}
                    </div>
                  </div>

                  {/* Baris 4: Footer (Total Komisi & Tombol Detail) */}
                  <div
                    style={{
                      borderTop: '1px solid #F1F5F9',
                      paddingTop: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.70rem', color: '#64748B', display: 'block' }}>Total Komisi:</span>
                      <strong
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '0.98rem',
                          color: mitra.totalKomisi > 0 ? '#15803D' : '#64748B',
                          fontWeight: 800,
                        }}
                      >
                        {formatRupiah(mitra.totalKomisi)}
                      </strong>
                    </div>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setSelectedMitra(mitra)}
                      style={{
                        padding: '6px 14px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        borderRadius: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                        visibility
                      </span>
                      <span>Detail</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

        {/* Pagination Bar - Persis seperti di Pengajuan */}
        {!isLoading && filteredMitra.length > 0 && (
          <div
            style={{
              padding: '14px 4px 6px 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            {/* Sisi Kiri: Total X Data ditampilkan */}
            <div style={{ fontSize: '0.84rem', color: '#64748B', fontWeight: 500 }}>
              Total <strong style={{ color: '#334155', fontWeight: 600 }}>{totalItems}</strong> Data ditampilkan (
              {totalItems === 0 ? 0 : startIndex + 1} sampai {endIndex})
            </div>

            {/* Sisi Kanan: « ‹ 1 2 3 ... › » */}
            {pageSize !== -1 && totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                {/* Tombol First Page « */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={activePage === 1}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px 8px',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    color: activePage === 1 ? '#CBD5E1' : '#64748B',
                    cursor: activePage === 1 ? 'not-allowed' : 'pointer',
                    lineHeight: 1,
                    userSelect: 'none',
                  }}
                  title="Halaman pertama"
                >
                  &laquo;
                </button>

                {/* Tombol Previous ‹ */}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={activePage === 1}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px 8px',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    color: activePage === 1 ? '#CBD5E1' : '#64748B',
                    cursor: activePage === 1 ? 'not-allowed' : 'pointer',
                    lineHeight: 1,
                    userSelect: 'none',
                  }}
                  title="Halaman sebelumnya"
                >
                  &lsaquo;
                </button>

                {/* Nomor Halaman */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (p === 1 || p === totalPages) return true;
                    if (Math.abs(p - activePage) <= 2) return true;
                    return false;
                  })
                  .reduce<(number | string)[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                      acc.push('...');
                    }
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) => {
                    if (item === '...') {
                      return (
                        <span
                          key={`ellipsis-${idx}`}
                          style={{ padding: '0 6px', color: '#94A3B8', fontSize: '0.84rem' }}
                        >
                          ...
                        </span>
                      );
                    }
                    const pageNum = Number(item);
                    const isCurrent = pageNum === activePage;
                    return (
                      <button
                        key={`page-${pageNum}`}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        style={{
                          minWidth: '32px',
                          height: '32px',
                          padding: '0 8px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: isCurrent ? '#1E40AF' : 'transparent',
                          color: isCurrent ? '#FFFFFF' : '#475569',
                          fontSize: '0.84rem',
                          fontWeight: isCurrent ? 700 : 500,
                          cursor: isCurrent ? 'default' : 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                {/* Tombol Next › */}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={activePage === totalPages}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px 8px',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    color: activePage === totalPages ? '#CBD5E1' : '#64748B',
                    cursor: activePage === totalPages ? 'not-allowed' : 'pointer',
                    lineHeight: 1,
                    userSelect: 'none',
                  }}
                  title="Halaman berikutnya"
                >
                  &rsaquo;
                </button>

                {/* Tombol Last Page » */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={activePage === totalPages}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px 8px',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    color: activePage === totalPages ? '#CBD5E1' : '#64748B',
                    cursor: activePage === totalPages ? 'not-allowed' : 'pointer',
                    lineHeight: 1,
                    userSelect: 'none',
                  }}
                  title="Halaman terakhir"
                >
                  &raquo;
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL DETAIL MITRA */}
      {selectedMitra && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
            backdropFilter: 'blur(3px)',
          }}
          onClick={() => setSelectedMitra(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '880px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #F1F5F9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#F8FAFC',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#0284C7' }}>
                  badge
                </span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                    Profil Lengkap Mitra: {selectedMitra.nama}
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    Kode Referral: <strong style={{ fontFamily: 'monospace', color: '#0284C7' }}>{selectedMitra.affiliateCode}</strong>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMitra(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Isi Detail Modal */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Info Pribadi & Kemitraan */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Nama PIC</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                    {selectedMitra.nama}
                  </div>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Jenis Kemitraan</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                    {selectedMitra.statusMitra || 'Umum'}
                  </div>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Lembaga / Instansi</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                    {selectedMitra.lembaga || '-'}
                  </div>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Nomor WhatsApp</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#16A34A', marginTop: '2px' }}>
                    {selectedMitra.noWa || '-'}
                  </div>
                </div>
              </div>

              {/* Data Rekening Pencairan Komisi */}
              <div style={{ border: '1px solid #BBF7D0', backgroundColor: '#F0FDF4', borderRadius: '12px', padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 700, fontSize: '0.82rem', marginBottom: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    account_balance
                  </span>
                  <span>Rekening Pencairan Komisi (Payout)</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '0.70rem', color: '#64748B' }}>Bank / E-Wallet</div>
                    <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.85rem' }}>
                      {selectedMitra.namaBank || 'BCA'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.70rem', color: '#64748B' }}>Nomor Rekening</div>
                    <div style={{ fontWeight: 800, fontFamily: 'monospace', color: '#0F172A', fontSize: '0.88rem' }}>
                      {selectedMitra.nomorRekening || '-'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.70rem', color: '#64748B' }}>Atas Nama</div>
                    <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.85rem' }}>
                      {selectedMitra.atasNamaRekening || selectedMitra.nama}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Keaktifan Bawa Customer */}
              <div
                style={{
                  backgroundColor:
                    selectedMitra.activityStatus === 'active'
                      ? '#F0FDF4'
                      : selectedMitra.activityStatus === 'idle'
                      ? '#FEFCE8'
                      : selectedMitra.activityStatus === 'inactive'
                      ? '#FEF2F2'
                      : '#F8FAFC',
                  border: `1px solid ${
                    selectedMitra.activityStatus === 'active'
                      ? '#BBF7D0'
                      : selectedMitra.activityStatus === 'idle'
                      ? '#FEF08A'
                      : selectedMitra.activityStatus === 'inactive'
                      ? '#FECACA'
                      : '#E2E8F0'
                  }`,
                  padding: '14px 18px',
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.70rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Status Keaktifan Bawa Customer
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        backgroundColor:
                          selectedMitra.activityStatus === 'active'
                            ? '#DCFCE7'
                            : selectedMitra.activityStatus === 'idle'
                            ? '#FEF9C3'
                            : selectedMitra.activityStatus === 'inactive'
                            ? '#FEE2E2'
                            : '#E2E8F0',
                        color:
                          selectedMitra.activityStatus === 'active'
                            ? '#15803D'
                            : selectedMitra.activityStatus === 'idle'
                            ? '#A16207'
                            : selectedMitra.activityStatus === 'inactive'
                            ? '#B91C1C'
                            : '#475569',
                      }}
                    >
                      ● {selectedMitra.activityStatus === 'active'
                        ? 'Aktif Bawa Customer'
                        : selectedMitra.activityStatus === 'idle'
                        ? 'Mulai Pasif'
                        : selectedMitra.activityStatus === 'inactive'
                        ? 'Lama Pasif / Dorman'
                        : 'Belum Pernah Bawa Customer'}
                    </span>
                    <strong style={{ fontSize: '0.86rem', color: '#0F172A' }}>
                      {selectedMitra.pemohonCount > 0 ? selectedMitra.lastActivityText : 'Belum ada pemohon binaan'}
                    </strong>
                  </div>
                </div>

                {selectedMitra.pemohonCount > 0 && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.70rem', color: '#64748B' }}>Tanggal Terakhir Bawa</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                      {selectedMitra.lastApplicantDateFormatted}
                    </div>
                  </div>
                )}
              </div>

              {/* Pemohon Binaan dari Mitra Ini */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>
                    Daftar Pemohon Binaan ({getMitraApplicants(selectedMitra.affiliateCode).length} Orang)
                  </h4>
                  {isOwner && onNavigateToPengajuan && getMitraApplicants(selectedMitra.affiliateCode).length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMitra(null);
                        onNavigateToPengajuan(selectedMitra.affiliateCode);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0284C7',
                        fontWeight: 700,
                        fontSize: '0.76rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                      }}
                    >
                      <span>Buka di Tab Pengajuan</span>
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                        arrow_forward
                      </span>
                    </button>
                  )}
                </div>

                {getMitraApplicants(selectedMitra.affiliateCode).length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '10px', color: '#64748B', fontSize: '0.80rem' }}>
                    Belum ada pemohon visa yang mendaftar menggunakan kode ini.
                  </div>
                ) : (
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.80rem' }}>
                      <thead style={{ backgroundColor: '#F8FAFC' }}>
                        <tr>
                          <th style={{ padding: '10px 8px', width: '46px', textAlign: 'center', whiteSpace: 'nowrap', backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                            No.
                          </th>
                          <th style={{ padding: '10px 12px', width: '110px', textAlign: 'left', whiteSpace: 'nowrap', backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                            No. Registrasi
                          </th>
                          <th style={{ padding: '10px 12px', minWidth: '180px', textAlign: 'left', backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                            Nama Pemohon
                          </th>
                          <th style={{ padding: '10px 12px', minWidth: '160px', textAlign: 'left', backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                            Program Visa
                          </th>
                          <th style={{ padding: '10px 12px', width: '100px', textAlign: 'center', whiteSpace: 'nowrap', backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                            Status
                          </th>
                          <th style={{ padding: '10px 14px', width: '125px', textAlign: 'right', whiteSpace: 'nowrap', backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                            Komisi Mitra
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {getMitraApplicants(selectedMitra.affiliateCode).map((cand, idx) => (
                          <tr key={cand.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: '#64748B', fontSize: '0.76rem', borderBottom: '1px solid #F1F5F9' }}>
                              {idx + 1}
                            </td>
                            <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700, color: '#0284C7', whiteSpace: 'nowrap', borderBottom: '1px solid #F1F5F9' }}>
                              {cand.noPengajuan || `#${cand.id}`}
                            </td>
                            <td style={{ padding: '8px 12px', fontWeight: 600, borderBottom: '1px solid #F1F5F9' }}>
                              {cand.namaPemohon}
                            </td>
                            <td style={{ padding: '8px 12px', color: '#64748B', borderBottom: '1px solid #F1F5F9' }}>
                              {cand.program} ({cand.konsjen})
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid #F1F5F9' }}>
                              <span
                                style={{
                                  fontSize: '0.70rem',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '20px',
                                  backgroundColor: cand.status === 'Selesai' ? '#DCFCE7' : '#EFF6FF',
                                  color: cand.status === 'Selesai' ? '#166534' : '#1D4ED8',
                                }}
                              >
                                {cand.status}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', whiteSpace: 'nowrap', borderBottom: '1px solid #F1F5F9' }}>
                              {formatRupiah(cand.referralFee || 100000)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Modal */}
            <div
              style={{
                padding: '14px 24px',
                borderTop: '1px solid #F1F5F9',
                backgroundColor: '#F8FAFC',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              {selectedMitra.noWa ? (
                <a
                  href={`https://wa.me/${selectedMitra.noWa.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#16A34A' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    chat
                  </span>
                  <span>Chat WhatsApp Mitra</span>
                </a>
              ) : <div />}

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setSelectedMitra(null)}
                style={{ fontSize: '0.80rem', padding: '6px 16px' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};
