import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import type { Pengajuan } from '../types';

interface KeuanganViewProps {
  pengajuanList: Pengajuan[];
}

interface MonthlyStat {
  monthKey: string; // e.g. "2026-10"
  label: string; // e.g. "Oktober 2026"
  shortLabel: string; // e.g. "Okt"
  year: string;
  monthNum: number;
  count: number;
  totalDibayar: number;
  totalNominalKeluar: number;
  totalCashback: number;
  totalReferralFee: number;
  totalFeeBersih: number;
  marginPersen: number;
}

const NAMA_BULAN: Record<string, string> = {
  '01': 'Januari',
  '02': 'Februari',
  '03': 'Maret',
  '04': 'April',
  '05': 'Mei',
  '06': 'Juni',
  '07': 'Juli',
  '08': 'Agustus',
  '09': 'September',
  '10': 'Oktober',
  '11': 'November',
  '12': 'Desember',
};

const SHORT_BULAN: Record<string, string> = {
  '01': 'Jan',
  '02': 'Feb',
  '03': 'Mar',
  '04': 'Apr',
  '05': 'Mei',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Ags',
  '09': 'Sep',
  '10': 'Okt',
  '11': 'Nov',
  '12': 'Des',
};

export const KeuanganView: React.FC<KeuanganViewProps> = ({ pengajuanList }) => {
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewTab, setViewTab] = useState<'chart_table' | 'monthly_recap'>('chart_table');
  const [hoveredMonthKey, setHoveredMonthKey] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<'fee' | 'omzet' | 'komparasi'>('fee');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [mobileTableMode, setMobileTableMode] = useState<'cards' | 'table'>('cards');

  const formatRupiah = (val: number) => {
    return 'Rp ' + Math.round(val || 0).toLocaleString('id-ID');
  };

  const formatDateDisplay = (raw?: string) => {
    if (!raw || raw === '-') return '-';
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const monthName = months[parseInt(m[2], 10) - 1] || m[2];
      return `${parseInt(m[3], 10)} ${monthName} ${m[1]}`;
    }
    return raw;
  };

  const formatJuta = (val: number) => {
    if (val >= 1000000) {
      return (val / 1000000).toFixed(val % 1000000 === 0 ? 0 : 1) + ' Jt';
    }
    if (val >= 1000) {
      return (val / 1000).toFixed(0) + ' Rb';
    }
    return String(val);
  };

  // Helper extracting month "YYYY-MM" dengan dukungan format YYYY-MM-DD, DD/MM/YYYY, dan DD-MM-YYYY
  const getMonthKey = (item: Pengajuan): string => {
    const rawDates = [item.tglApply, item.tglBerkasMasuk, item.tglEstimasiSelesai, item.tglSelesai];
    for (const raw of rawDates) {
      if (!raw) continue;
      const d = raw.trim();
      // YYYY-MM-DD atau YYYY-MM
      if (/^\d{4}-\d{2}/.test(d)) {
        return d.substring(0, 7);
      }
      // YYYY/MM/DD
      if (/^\d{4}\/\d{2}/.test(d)) {
        return `${d.substring(0, 4)}-${d.substring(5, 7)}`;
      }
      // DD/MM/YYYY
      if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(d)) {
        const parts = d.split('/');
        return `${parts[2]}-${parts[1].padStart(2, '0')}`;
      }
      // DD-MM-YYYY
      if (/^\d{1,2}-\d{1,2}-\d{4}/.test(d)) {
        const parts = d.split('-');
        return `${parts[2]}-${parts[1].padStart(2, '0')}`;
      }
    }

    // Smart fallback berdasarkan nomor urut ID pendaftaran jika tanggal tidak tersedia
    const num = parseInt(item.noPengajuan.replace(/[^0-9]/g, '') || item.id.replace(/[^0-9]/g, '') || '0', 10);
    if (num > 0) {
      if (num <= 10) return '2026-01';
      if (num <= 17) return '2026-02';
      if (num <= 35) return '2026-03';
      if (num <= 65) return '2026-04';
      if (num <= 75) return '2026-05';
      if (num <= 100) return '2026-06';
      if (num <= 150) return '2026-07';
      if (num <= 175) return '2026-08';
      if (num <= 220) return '2026-09';
      return '2026-10';
    }
    return '2026-10';
  };

  // Daftar Tahun yang tersedia dari data transaksi
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    pengajuanList.forEach((item) => {
      const mKey = getMonthKey(item);
      const [y] = mKey.split('-');
      if (y && y.length === 4) years.add(y);
    });
    if (years.size === 0) years.add('2026');
    return Array.from(years).sort().reverse();
  }, [pengajuanList]);

  // Agregasi Bulanan (Sesuai Tahun Terpilih)
  const monthlyStats = useMemo<MonthlyStat[]>(() => {
    const map = new Map<string, MonthlyStat>();

    pengajuanList.forEach((item) => {
      const mKey = getMonthKey(item);
      const [year, mPart] = mKey.split('-');
      const label = `${NAMA_BULAN[mPart] || mPart} ${year}`;
      const shortLabel = SHORT_BULAN[mPart] || mPart;

      let stat = map.get(mKey);
      if (!stat) {
        stat = {
          monthKey: mKey,
          label,
          shortLabel,
          year,
          monthNum: parseInt(mPart, 10) || 0,
          count: 0,
          totalDibayar: 0,
          totalNominalKeluar: 0,
          totalCashback: 0,
          totalReferralFee: 0,
          totalFeeBersih: 0,
          marginPersen: 0,
        };
        map.set(mKey, stat);
      }

      stat.count += 1;
      stat.totalDibayar += item.dibayarPemohon || 0;
      stat.totalNominalKeluar += item.nominalKeluar || 0;
      stat.totalCashback += item.cashback || 0;
      stat.totalReferralFee += item.referralFee || 0;
      stat.totalFeeBersih += item.feeBersih || 0;
    });

    const arr = Array.from(map.values())
      .filter((s) => s.year === selectedYear) // Menampilkan bulan-bulan pada tahun terpilih
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    arr.forEach((s) => {
      s.marginPersen = s.totalDibayar > 0 ? (s.totalFeeBersih / s.totalDibayar) * 100 : 0;
    });

    return arr;
  }, [pengajuanList, selectedYear]);

  // Highlight Stats (Bulan Tertinggi)
  const bestMonthStats = useMemo(() => {
    if (monthlyStats.length === 0) return null;
    let highestOmzet = monthlyStats[0];
    let highestLaba = monthlyStats[0];

    monthlyStats.forEach((m) => {
      if (m.totalDibayar > highestOmzet.totalDibayar) highestOmzet = m;
      if (m.totalFeeBersih > highestLaba.totalFeeBersih) highestLaba = m;
    });

    return { highestOmzet, highestLaba };
  }, [monthlyStats]);

  // Transaksi yang tersaring berdasarkan selectedYear dan selectedMonth
  const transactionsInSelectedMonth = useMemo(() => {
    if (selectedMonth === 'all') {
      return pengajuanList.filter((item) => getMonthKey(item).startsWith(selectedYear));
    }
    return pengajuanList.filter((item) => getMonthKey(item) === selectedMonth);
  }, [pengajuanList, selectedMonth, selectedYear]);

  // Filter pencarian tabel
  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return transactionsInSelectedMonth;

    return transactionsInSelectedMonth.filter(
      (item) =>
        item.namaPemohon.toLowerCase().includes(q) ||
        (item.noPengajuan && item.noPengajuan.toLowerCase().includes(q)) ||
        (item.noTelp && item.noTelp.toLowerCase().includes(q)) ||
        item.konsjen.toLowerCase().includes(q) ||
        item.program.toLowerCase().includes(q)
    );
  }, [transactionsInSelectedMonth, searchQuery]);

  // Reset ke halaman 1 saat filter bulan atau pencarian berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonth, searchQuery]);

  const totalPages = Math.ceil(filteredTransactions.length / pageSize) || 1;
  const paginatedTransactions = useMemo(() => {
    if (pageSize >= 9999) return filteredTransactions;
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  // Perhitungan kartu statistik aktif
  const activeStats = useMemo(() => {
    let totalDibayar = 0;
    let totalNominalKeluar = 0;
    let totalCashback = 0;
    let totalFeeBersih = 0;
    const count = transactionsInSelectedMonth.length;

    transactionsInSelectedMonth.forEach((p) => {
      totalDibayar += p.dibayarPemohon || 0;
      totalNominalKeluar += p.nominalKeluar || 0;
      totalCashback += p.cashback || 0;
      totalFeeBersih += p.feeBersih || 0;
    });

    const marginPersen = totalDibayar > 0 ? (totalFeeBersih / totalDibayar) * 100 : 0;

    return {
      totalDibayar,
      totalNominalKeluar,
      totalCashback,
      totalFeeBersih,
      marginPersen: marginPersen.toFixed(1) + '%',
      count,
    };
  }, [transactionsInSelectedMonth]);

  // Nilai maksimum untuk skala grafik batang (fleksibel sesuai mode tampilan dengan kelipatan angka bulat)
  const maxChartValue = useMemo(() => {
    if (monthlyStats.length === 0) return 40000000;
    if (chartMode === 'fee') {
      const maxFee = Math.max(...monthlyStats.map((m) => m.totalFeeBersih));
      return Math.ceil(maxFee / 10000000) * 10000000 || 40000000;
    }
    const maxVal = Math.max(...monthlyStats.map((m) => Math.max(m.totalDibayar, m.totalNominalKeluar, m.totalFeeBersih)));
    return Math.ceil(maxVal / 40000000) * 40000000 || 160000000;
  }, [monthlyStats, chartMode]);

  // Export Excel (.xlsx) Resmi & Rapi per Kolom
  const handleExportKeuangan = () => {
    if (transactionsInSelectedMonth.length === 0) {
      alert('Tidak ada data transaksi keuangan untuk diekspor.');
      return;
    }
    const todayStr = new Date().toISOString().slice(0, 10);
    const monthLabel =
      selectedMonth === 'all'
        ? `Semua_Bulan_${selectedYear}`
        : monthlyStats.find((m) => m.monthKey === selectedMonth)?.label.replace(/\s+/g, '_') || selectedMonth;
    const fileName = `MapahTrip_Buku_Kas_${monthLabel}_${todayStr}.xlsx`;

    // 1. Data Sheet Rincian Transaksi
    const txHeaders = [
      'No',
      'No Registrasi',
      'Nama Pemohon',
      'No Telepon',
      'Konsulat',
      'Staff PIC',
      'Program Visa',
      'Tgl Masuk/Apply',
      'Dibayar Pemohon (Rp)',
      'Nominal Keluar / Modal (Rp)',
      'Cashback Mitra (Rp)',
      'Komisi Affiliate (Rp)',
      'Fee Bersih MapahTrip (Rp)',
      'Status',
    ];

    let sumDibayar = 0;
    let sumKeluar = 0;
    let sumCashback = 0;
    let sumReferral = 0;
    let sumFeeBersih = 0;

    const txRows = transactionsInSelectedMonth.map((item, index) => {
      const dibayar = Number(item.dibayarPemohon) || 0;
      const keluar = Number(item.nominalKeluar) || 0;
      const cb = Number(item.cashback) || 0;
      const ref = Number(item.referralFee) || 0;
      const fee = Number(item.feeBersih) || 0;

      sumDibayar += dibayar;
      sumKeluar += keluar;
      sumCashback += cb;
      sumReferral += ref;
      sumFeeBersih += fee;

      return [
        index + 1,
        item.noPengajuan || '-',
        item.namaPemohon || '-',
        item.noTelp || '-',
        `Konsjen ${item.konsjen || '-'}`,
        item.staffPic || '-',
        item.program || '-',
        item.tglApply || item.tglBerkasMasuk || '-',
        dibayar,
        keluar,
        cb,
        ref,
        fee,
        item.status || '-',
      ];
    });

    // Baris Grand Total di paling bawah
    const totalRow = [
      '',
      'TOTAL KESELURUHAN',
      `${transactionsInSelectedMonth.length} Pemohon`,
      '',
      '',
      '',
      '',
      '',
      sumDibayar,
      sumKeluar,
      sumCashback,
      sumReferral,
      sumFeeBersih,
      '',
    ];

    const wsTx = XLSX.utils.aoa_to_sheet([txHeaders, ...txRows, totalRow]);

    // Format lebar kolom (Auto Width) agar teks tidak terpotong saat dibuka di Excel
    wsTx['!cols'] = [
      { wch: 6 },  // No
      { wch: 16 }, // No Registrasi
      { wch: 30 }, // Nama Pemohon
      { wch: 18 }, // No Telepon
      { wch: 18 }, // Konsulat
      { wch: 18 }, // Staff PIC
      { wch: 22 }, // Program Visa
      { wch: 16 }, // Tgl
      { wch: 22 }, // Dibayar Pemohon
      { wch: 24 }, // Nominal Keluar
      { wch: 20 }, // Cashback Mitra
      { wch: 20 }, // Komisi Affiliate
      { wch: 24 }, // Fee Bersih
      { wch: 18 }, // Status
    ];

    // 2. Data Sheet Rekapitulasi Bulanan
    const recapHeaders = [
      'No',
      'Periode Bulan',
      'Jumlah Pemohon',
      'Omzet Masuk (Rp)',
      'Modal Keluar (Rp)',
      'Cashback Mitra (Rp)',
      'Komisi Affiliate (Rp)',
      'Fee Bersih MapahTrip (Rp)',
      'Margin Laba (%)',
    ];

    const recapRows = monthlyStats.map((m, idx) => [
      idx + 1,
      m.label,
      m.count,
      m.totalDibayar,
      m.totalNominalKeluar,
      m.totalCashback,
      m.totalReferralFee,
      m.totalFeeBersih,
      `${m.marginPersen.toFixed(1)}%`,
    ]);

    const recapTotalRow = [
      '',
      `GRAND TOTAL ${selectedYear}`,
      grandTotal.count,
      grandTotal.totalDibayar,
      grandTotal.totalNominalKeluar,
      grandTotal.totalCashback,
      grandTotal.totalReferralFee,
      grandTotal.totalFeeBersih,
      grandMargin,
    ];

    const wsRecap = XLSX.utils.aoa_to_sheet([recapHeaders, ...recapRows, recapTotalRow]);
    wsRecap['!cols'] = [
      { wch: 6 },
      { wch: 20 },
      { wch: 14 },
      { wch: 22 },
      { wch: 22 },
      { wch: 20 },
      { wch: 20 },
      { wch: 24 },
      { wch: 16 },
    ];

    // Buat Workbook Excel dan simpan
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsTx, 'Rincian Transaksi');
    XLSX.utils.book_append_sheet(wb, wsRecap, 'Rekap Bulanan');

    XLSX.writeFile(wb, fileName);
  };

  // Grand Total untuk Rekapitulasi Bulanan
  const grandTotal = useMemo(() => {
    return monthlyStats.reduce(
      (acc, curr) => ({
        count: acc.count + curr.count,
        totalDibayar: acc.totalDibayar + curr.totalDibayar,
        totalNominalKeluar: acc.totalNominalKeluar + curr.totalNominalKeluar,
        totalCashback: acc.totalCashback + curr.totalCashback,
        totalReferralFee: acc.totalReferralFee + curr.totalReferralFee,
        totalFeeBersih: acc.totalFeeBersih + curr.totalFeeBersih,
      }),
      {
        count: 0,
        totalDibayar: 0,
        totalNominalKeluar: 0,
        totalCashback: 0,
        totalReferralFee: 0,
        totalFeeBersih: 0,
      }
    );
  }, [monthlyStats]);

  const grandMargin = grandTotal.totalDibayar > 0 ? ((grandTotal.totalFeeBersih / grandTotal.totalDibayar) * 100).toFixed(1) + '%' : '0%';

  const currentMonthLabel =
    selectedMonth === 'all'
      ? `Seluruh Periode (Tahun ${selectedYear})`
      : monthlyStats.find((m) => m.monthKey === selectedMonth)?.label || selectedMonth;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header & Main Control Bar */}
      <div className="keuangan-top-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>
              analytics
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary)' }}>
              Arus Kas &amp; Finansial Visa Per Bulan
            </span>
          </div>
          <h1 className="keuangan-main-title" style={{ fontSize: '1.9rem', fontWeight: 700, color: 'var(--on-surface)', margin: 0 }}>
            Laporan Keuangan &amp; Grafik
          </h1>
          <p className="keuangan-main-subtitle" style={{ color: 'var(--on-surface-variant)', fontSize: '0.88rem', marginTop: '4px' }}>
            Pantau arus dana masuk pemohon, pengeluaran konsuler, cashback mitra, dan margin laba bersih bulanan.
          </p>
        </div>

        <div className="keuangan-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Dropdown 1: Pilihan Tahun Pembukuan */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span
              className="material-symbols-outlined"
              style={{
                position: 'absolute',
                left: '11px',
                fontSize: '16px',
                color: 'var(--primary)',
                pointerEvents: 'none',
              }}
            >
              calendar_today
            </span>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setSelectedMonth('all');
              }}
              style={{
                padding: '8px 14px 8px 32px',
                borderRadius: '9999px',
                border: '1.5px solid #CBD5E1',
                fontSize: '0.84rem',
                fontWeight: 700,
                color: 'var(--primary)',
                backgroundColor: '#F8FAFC',
                cursor: 'pointer',
                outline: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
              title="Pilih Tahun Pembukuan"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  Tahun {y}
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown 2: Pilihan Bulan (Maksimal 12 Bulan per Tahun) */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span
              className="material-symbols-outlined"
              style={{
                position: 'absolute',
                left: '12px',
                fontSize: '17px',
                color: selectedMonth !== 'all' ? 'var(--primary)' : '#64748B',
                pointerEvents: 'none',
              }}
            >
              calendar_month
            </span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                padding: '8px 18px 8px 36px',
                borderRadius: '9999px',
                border: selectedMonth !== 'all' ? '1.5px solid var(--primary)' : '1px solid #CBD5E1',
                fontSize: '0.84rem',
                fontWeight: 600,
                color: selectedMonth !== 'all' ? 'var(--primary)' : '#0F172A',
                backgroundColor: selectedMonth !== 'all' ? '#EFF6FF' : '#FFFFFF',
                cursor: 'pointer',
                outline: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
              title={`Pilih Bulan di Tahun ${selectedYear}`}
            >
              <option value="all">Semua Bulan ({selectedYear})</option>
              {monthlyStats.map((m) => (
                <option key={m.monthKey} value={m.monthKey}>
                  {m.label} ({m.count} Pemohon)
                </option>
              ))}
            </select>
          </div>

          {selectedMonth !== 'all' && (
            <button
              onClick={() => setSelectedMonth('all')}
              style={{
                border: '1px solid #BFDBFE',
                background: '#EFF6FF',
                color: 'var(--primary)',
                fontSize: '0.78rem',
                fontWeight: 700,
                padding: '6px 12px',
                borderRadius: '9999px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Kembali ke semua bulan"
            >
              <span>Semua Bulan</span>
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>close</span>
            </button>
          )}

          <button className="btn btn-secondary" onClick={handleExportKeuangan} title="Unduh format spreadsheet">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              download
            </span>
            <span>Unduh Buku Kas</span>
          </button>
        </div>
      </div>

      {/* 4 Financial Stat Cards (Dinamis Sesuai Filter Bulan) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>
              analytics
            </span>
            <span>Ringkasan Finansial: <strong style={{ color: selectedMonth !== 'all' ? 'var(--primary)' : 'var(--on-surface)' }}>{currentMonthLabel}</strong></span>
          </div>
          {selectedMonth !== 'all' && (
            <span style={{ fontSize: '0.72rem', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', padding: '1px 8px', borderRadius: '12px', fontWeight: 700 }}>
              {activeStats.count} Pemohon
            </span>
          )}
        </div>

        <div className="keuangan-kpi-grid">
          <div className="card" style={{ padding: '18px', borderLeft: '4px solid #0284C7' }}>
            <div className="kpi-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>
              Total Dibayar Pemohon
            </div>
            <div className="font-mono-tabular kpi-value" style={{ fontSize: '1.45rem', fontWeight: 700, color: '#0284C7', margin: '6px 0 2px', whiteSpace: 'nowrap' }}>
              {formatRupiah(activeStats.totalDibayar)}
            </div>
            <div className="kpi-sub" style={{ fontSize: '0.74rem', color: 'var(--on-surface-variant)' }}>
              Dari {activeStats.count} transaksi terverifikasi
            </div>
          </div>

          <div className="card" style={{ padding: '18px', borderLeft: '4px solid var(--error)' }}>
            <div className="kpi-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>
              Total Nominal Keluar
            </div>
            <div className="font-mono-tabular kpi-value" style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--error)', margin: '6px 0 2px', whiteSpace: 'nowrap' }}>
              {formatRupiah(activeStats.totalNominalKeluar)}
            </div>
            <div className="kpi-sub" style={{ fontSize: '0.74rem', color: 'var(--on-surface-variant)' }}>
              Biaya visa konsulat &amp; operasional
            </div>
          </div>

          <div className="card" style={{ padding: '18px', borderLeft: '4px solid var(--success)' }}>
            <div className="kpi-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>
              Total Cashback Mitra
            </div>
            <div className="font-mono-tabular kpi-value" style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--success)', margin: '6px 0 2px', whiteSpace: 'nowrap' }}>
              {formatRupiah(activeStats.totalCashback)}
            </div>
            <div className="kpi-sub" style={{ fontSize: '0.74rem', color: 'var(--on-surface-variant)' }}>
              Insentif &amp; reward volume mitra
            </div>
          </div>

          <div className="card" style={{ padding: '18px', background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)', borderLeft: '4px solid var(--primary)', border: '1px solid #bfdbfe' }}>
            <div className="kpi-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)' }}>
              Total Fee Bersih (Laba Bersih)
            </div>
            <div className="font-mono-tabular kpi-value" style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--primary)', margin: '6px 0 2px', whiteSpace: 'nowrap' }}>
              {formatRupiah(activeStats.totalFeeBersih)}
            </div>
            <div className="kpi-sub" style={{ fontSize: '0.74rem', color: 'var(--success)', fontWeight: 700 }}>
              Margin Laba: {activeStats.marginPersen}
            </div>
          </div>
        </div>
      </div>

      {/* GRAFIK KEUANGAN BULANAN (DESAIN SIMPEL & BERSIH) */}
      <div className="card" style={{ padding: '24px' }}>
        {/* Chart Header dengan Tombol Pilihan Simpel */}
        <div className="keuangan-chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--primary)' }}>
                trending_up
              </span>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--on-surface)', letterSpacing: '-0.01em' }}>
                Grafik Keuangan Bulanan {selectedYear}
              </h2>
              {selectedMonth !== 'all' && (
                <button
                  onClick={() => setSelectedMonth('all')}
                  style={{
                    border: '1px solid #BFDBFE',
                    background: '#EFF6FF',
                    color: 'var(--primary)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                  title="Klik untuk kembali ke semua bulan"
                >
                  <span>{currentMonthLabel}</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>close</span>
                </button>
              )}
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', marginTop: '2px', lineHeight: 1.4 }}>
              {chartMode === 'fee' && 'Tren keuntungan bersih per bulan (klik batang untuk filter)'}
              {chartMode === 'omzet' && 'Total arus dana masuk dari pemohon per bulan'}
              {chartMode === 'komparasi' && 'Perbandingan omzet masuk, modal keluar, dan laba'}
            </p>
          </div>

          {/* Switch Mode Tampilan Simpel */}
          <div className="keuangan-chart-toggle" style={{ display: 'flex', background: '#F1F5F9', padding: '3px', borderRadius: '8px', gap: '3px' }}>
            <button
              onClick={() => setChartMode('fee')}
              style={{
                border: 'none',
                background: chartMode === 'fee' ? '#FFFFFF' : 'transparent',
                color: chartMode === 'fee' ? '#047857' : '#64748B',
                fontWeight: chartMode === 'fee' ? 700 : 500,
                fontSize: '0.78rem',
                padding: '6px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: chartMode === 'fee' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
              <span>Laba Bersih</span>
            </button>

            <button
              onClick={() => setChartMode('omzet')}
              style={{
                border: 'none',
                background: chartMode === 'omzet' ? '#FFFFFF' : 'transparent',
                color: chartMode === 'omzet' ? '#0284C7' : '#64748B',
                fontWeight: chartMode === 'omzet' ? 700 : 500,
                fontSize: '0.78rem',
                padding: '6px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: chartMode === 'omzet' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0284C7', display: 'inline-block' }} />
              <span>Omzet Masuk</span>
            </button>

            <button
              onClick={() => setChartMode('komparasi')}
              style={{
                border: 'none',
                background: chartMode === 'komparasi' ? '#FFFFFF' : 'transparent',
                color: chartMode === 'komparasi' ? 'var(--on-surface)' : '#64748B',
                fontWeight: chartMode === 'komparasi' ? 700 : 500,
                fontSize: '0.78rem',
                padding: '6px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: chartMode === 'komparasi' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>Komparasi</span>
            </button>
          </div>
        </div>

        {/* Legend untuk Mode Komparasi */}
        {chartMode === 'komparasi' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', fontSize: '0.78rem', fontWeight: 600 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'linear-gradient(180deg, #3B82F6 0%, #1D4ED8 100%)', boxShadow: '0 1px 3px rgba(37, 99, 235, 0.3)' }} />
                <span style={{ color: '#1E40AF', fontWeight: 700 }}>Omzet Masuk</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'linear-gradient(180deg, #FB7185 0%, #E11D48 100%)', boxShadow: '0 1px 3px rgba(225, 29, 72, 0.3)' }} />
                <span style={{ color: '#BE123C', fontWeight: 700 }}>Modal Konsulat &amp; Biaya</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'linear-gradient(180deg, #34D399 0%, #059669 100%)', boxShadow: '0 1px 3px rgba(16, 185, 129, 0.3)' }} />
                <span style={{ color: '#047857', fontWeight: 700 }}>Laba Bersih MapahTrip</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', padding: '3px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                Margin Laba Rata-rata: {activeStats.marginPersen}
              </span>
            </div>
          </div>
        )}

        {/* Visual Bar Chart Container */}
        <div style={{ position: 'relative', marginTop: '10px', paddingTop: '16px' }}>
          {/* Y-Axis Guide Lines */}
          <div style={{ position: 'absolute', top: 16, left: '50px', right: 0, height: '230px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none', zIndex: 1 }}>
            {[1, 0.75, 0.5, 0.25, 0].map((ratio) => (
              <div key={ratio} style={{ display: 'flex', alignItems: 'center', width: '100%', height: '1px', borderTop: '1px dashed #E2E8F0' }}>
                <span style={{ position: 'absolute', left: '-50px', fontSize: '0.70rem', color: '#94A3B8', fontWeight: 700, width: '45px', textAlign: 'right', fontFamily: 'monospace' }}>
                  {formatJuta(maxChartValue * ratio)}
                </span>
              </div>
            ))}
          </div>

          {/* Horizontal Area for Bars */}
          <div style={{ overflowX: 'auto', paddingLeft: '55px', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', height: '245px', minWidth: `${monthlyStats.length * 68}px`, gap: '8px', position: 'relative', zIndex: 2 }}>
              {monthlyStats.map((item) => {
                const isSelected = selectedMonth === item.monthKey;
                const isHovered = hoveredMonthKey === item.monthKey;
                const isBestLaba = bestMonthStats?.highestLaba.monthKey === item.monthKey;

                // Proporsi tinggi batang
                const hFee = Math.max(8, (item.totalFeeBersih / maxChartValue) * 175);
                const hOmzet = Math.max(8, (item.totalDibayar / maxChartValue) * 175);
                const hKeluar = Math.max(8, (item.totalNominalKeluar / maxChartValue) * 175);

                return (
                  <div
                    key={item.monthKey}
                    onClick={() => setSelectedMonth(isSelected ? 'all' : item.monthKey)}
                    onMouseEnter={() => setHoveredMonthKey(item.monthKey)}
                    onMouseLeave={() => setHoveredMonthKey(null)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      height: '100%',
                      cursor: 'pointer',
                      padding: '6px 4px 4px',
                      borderRadius: '10px',
                      backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.08)' : isHovered ? '#F8FAFC' : 'transparent',
                      border: isSelected ? '1.5px solid #2563EB' : isHovered ? '1.5px solid #E2E8F0' : '1.5px solid transparent',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                    }}
                    title={`Klik untuk melihat transaksi bulan ${item.label}`}
                  >
                    {/* Tooltip Hover Lengkap */}
                    {isHovered && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '100%',
                          marginBottom: '10px',
                          background: 'rgba(15, 23, 42, 0.96)',
                          backdropFilter: 'blur(8px)',
                          color: '#FFFFFF',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          fontSize: '0.75rem',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 12px 30px rgba(0,0,0,0.3)',
                          zIndex: 50,
                          pointerEvents: 'none',
                          minWidth: '185px',
                          border: '1px solid rgba(255,255,255,0.12)',
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: '0.84rem', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '5px', marginBottom: '8px', color: '#60A5FA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{item.label}</span>
                          <span style={{ fontSize: '0.68rem', background: 'rgba(255,255,255,0.15)', padding: '1px 6px', borderRadius: '4px', color: '#F1F5F9' }}>{item.count} Pemohon</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', margin: '3px 0' }}>
                          <span style={{ color: '#93C5FD' }}>Omzet Masuk:</span>
                          <strong style={{ fontFamily: 'monospace' }}>{formatRupiah(item.totalDibayar)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', margin: '3px 0' }}>
                          <span style={{ color: '#FDA4AF' }}>Modal Konsulat:</span>
                          <strong style={{ fontFamily: 'monospace' }}>{formatRupiah(item.totalNominalKeluar)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                          <span style={{ color: '#86EFAC', fontWeight: 700 }}>Laba Bersih:</span>
                          <strong style={{ fontFamily: 'monospace', color: '#4ADE80', fontSize: '0.82rem' }}>{formatRupiah(item.totalFeeBersih)}</strong>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#CBD5E1', marginTop: '4px', textAlign: 'right' }}>
                          Margin Laba: <strong style={{ color: '#FBBF24' }}>{item.marginPersen.toFixed(1)}%</strong>
                        </div>
                      </div>
                    )}

                    {/* MODE 1: SATU BATANG TUNGGAL LABA BERSIH (SUPER GAGAH & INFORMATIF) */}
                    {chartMode === 'fee' && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                        {/* Nilai Nominal Tertera di Atas Batang */}
                        <div
                          style={{
                            fontSize: '0.70rem',
                            fontWeight: 800,
                            marginBottom: '6px',
                            whiteSpace: 'nowrap',
                            fontFamily: 'monospace',
                            color: isBestLaba ? '#B45309' : '#047857',
                          }}
                        >
                          {isBestLaba ? `👑 ${formatJuta(item.totalFeeBersih)}` : formatJuta(item.totalFeeBersih)}
                        </div>
                        <div
                          style={{
                            width: '36px',
                            height: `${hFee}px`,
                            background: isSelected || isHovered
                              ? 'linear-gradient(180deg, #6EE7B7 0%, #10B981 100%)'
                              : 'linear-gradient(180deg, #34D399 0%, #059669 100%)',
                            borderRadius: '6px 6px 2px 2px',
                            boxShadow: (isSelected || isHovered) ? '0 6px 14px rgba(16, 185, 129, 0.35)' : '0 2px 4px rgba(0,0,0,0.04)',
                            transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                            transition: 'all 0.15s ease',
                          }}
                        />
                      </div>
                    )}

                    {/* MODE 2: SATU BATANG TUNGGAL OMZET MASUK */}
                    {chartMode === 'omzet' && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                        {/* Nilai Nominal Omzet di Atas Batang */}
                        <div
                          style={{
                            fontSize: '0.70rem',
                            fontWeight: 800,
                            marginBottom: '6px',
                            whiteSpace: 'nowrap',
                            fontFamily: 'monospace',
                            color: '#1D4ED8',
                          }}
                        >
                          {formatJuta(item.totalDibayar)}
                        </div>
                        <div
                          style={{
                            width: '36px',
                            height: `${hOmzet}px`,
                            background: isSelected || isHovered
                              ? 'linear-gradient(180deg, #60A5FA 0%, #2563EB 100%)'
                              : 'linear-gradient(180deg, #3B82F6 0%, #1D4ED8 100%)',
                            borderRadius: '6px 6px 2px 2px',
                            boxShadow: (isSelected || isHovered) ? '0 6px 14px rgba(37, 99, 235, 0.3)' : '0 2px 4px rgba(0,0,0,0.04)',
                            transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                            transition: 'all 0.15s ease',
                          }}
                        />
                      </div>
                    )}

                    {/* MODE 3: KOMPARASI 3 BATANG (PROPORSI TEBAL & NOMINAL JELAS) */}
                    {chartMode === 'komparasi' && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                        {/* Nilai / Badge Laba di Atas Batang */}
                        <div
                          style={{
                            fontSize: '0.67rem',
                            fontWeight: 800,
                            fontFamily: 'monospace',
                            marginBottom: '6px',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                          }}
                        >
                          {isBestLaba ? (
                            <span
                              style={{
                                background: '#FEF3C7',
                                color: '#92400E',
                                border: '1px solid #FCD34D',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                fontSize: '0.62rem',
                                fontWeight: 800,
                              }}
                              title="Bulan Laba Tertinggi Tahun Ini!"
                            >
                              👑 {formatJuta(item.totalFeeBersih)}
                            </span>
                          ) : item.totalFeeBersih > 0 ? (
                            <span style={{ color: '#059669' }}>
                              {formatJuta(item.totalFeeBersih)}
                            </span>
                          ) : (
                            <span style={{ color: '#CBD5E1' }}>-</span>
                          )}
                        </div>

                        {/* 3 Batang Proporsional & Gagah */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-end',
                            gap: '4px',
                            justifyContent: 'center',
                            transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                            transition: 'transform 0.15s ease',
                          }}
                        >
                          {/* Batang 1: Omzet Masuk */}
                          <div
                            style={{
                              width: '14px',
                              height: `${hOmzet}px`,
                              background: isSelected || isHovered
                                ? 'linear-gradient(180deg, #60A5FA 0%, #2563EB 100%)'
                                : 'linear-gradient(180deg, #3B82F6 0%, #1D4ED8 100%)',
                              borderRadius: '4px 4px 1px 1px',
                              boxShadow: (isSelected || isHovered) ? '0 4px 10px rgba(37, 99, 235, 0.3)' : 'none',
                              transition: 'all 0.15s ease',
                            }}
                            title={`Omzet Masuk: ${formatRupiah(item.totalDibayar)}`}
                          />
                          {/* Batang 2: Modal Keluar */}
                          <div
                            style={{
                              width: '14px',
                              height: `${hKeluar}px`,
                              background: isSelected || isHovered
                                ? 'linear-gradient(180deg, #FDA4AF 0%, #F43F5E 100%)'
                                : 'linear-gradient(180deg, #FB7185 0%, #E11D48 100%)',
                              borderRadius: '4px 4px 1px 1px',
                              boxShadow: (isSelected || isHovered) ? '0 4px 10px rgba(225, 29, 72, 0.3)' : 'none',
                              transition: 'all 0.15s ease',
                            }}
                            title={`Modal Konsulat & Keluar: ${formatRupiah(item.totalNominalKeluar)}`}
                          />
                          {/* Batang 3: Laba Bersih */}
                          <div
                            style={{
                              width: '14px',
                              height: `${hFee}px`,
                              background: isSelected || isHovered
                                ? 'linear-gradient(180deg, #6EE7B7 0%, #10B981 100%)'
                                : 'linear-gradient(180deg, #34D399 0%, #059669 100%)',
                              borderRadius: '4px 4px 1px 1px',
                              boxShadow: (isSelected || isHovered) ? '0 4px 10px rgba(16, 185, 129, 0.35)' : 'none',
                              transition: 'all 0.15s ease',
                            }}
                            title={`Laba Bersih: ${formatRupiah(item.totalFeeBersih)}`}
                          />
                        </div>
                      </div>
                    )}

                    {/* X-Axis Month Label */}
                    <div style={{ marginTop: '10px', textAlign: 'center' }}>
                      <div
                        style={{
                          fontSize: '0.76rem',
                          fontWeight: isSelected ? 800 : 700,
                          color: isSelected ? '#1D4ED8' : isHovered ? '#0F172A' : '#64748B',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {item.shortLabel}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Insight Ringkas & Simpel di Bawah Grafik */}
        <div style={{ marginTop: '18px', padding: '10px 16px', background: selectedMonth !== 'all' ? '#EFF6FF' : '#F8FAFC', borderRadius: '10px', border: selectedMonth !== 'all' ? '1px solid #BFDBFE' : '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '0.82rem', transition: 'all 0.2s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {bestMonthStats && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#10B981' }}>
                  verified
                </span>
                <span>
                  Bulan Teruntung: <strong style={{ color: '#047857' }}>{bestMonthStats.highestLaba.label} ({formatRupiah(bestMonthStats.highestLaba.totalFeeBersih)})</strong>
                </span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0284C7' }}>
                equalizer
              </span>
              <span>
                Rata-rata Laba: <strong style={{ color: '#0284C7' }}>{formatRupiah(Math.round(grandTotal.totalFeeBersih / monthlyStats.length))} / bulan</strong>
              </span>
            </div>
          </div>

          {selectedMonth !== 'all' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', color: '#1E40AF', fontWeight: 600 }}>
                Sedang difilter: <strong>{currentMonthLabel}</strong>
              </span>
              <button
                onClick={() => setSelectedMonth('all')}
                style={{
                  border: '1px solid #2563EB',
                  background: '#2563EB',
                  color: '#FFFFFF',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 1px 3px rgba(37, 99, 235, 0.25)',
                  transition: 'all 0.15s ease'
                }}
                title="Tampilkan semua bulan"
              >
                <span>Reset ke Semua Bulan</span>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>restart_alt</span>
              </button>
            </div>
          ) : (
            <div style={{ color: '#64748B', fontSize: '0.78rem' }}>
              💡 <em>Klik batang bulan di atas untuk melihat data transaksinya.</em>
            </div>
          )}
        </div>
      </div>

      {/* VIEW TAB SWITCHER (DETAIL TRANSAKSI VS TABEL REKAPITULASI BULANAN) */}
      <div className="keuangan-tab-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div className="keuangan-tab-switcher" style={{ display: 'flex', background: '#E2E8F0', padding: '3px', borderRadius: '10px' }}>
            <button
              onClick={() => setViewTab('chart_table')}
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: viewTab === 'chart_table' ? '#FFFFFF' : 'transparent',
                color: viewTab === 'chart_table' ? 'var(--primary)' : '#475569',
                boxShadow: viewTab === 'chart_table' ? 'var(--shadow-sm)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>list_alt</span>
              <span>Rincian Transaksi Pemohon</span>
            </button>
            <button
              onClick={() => setViewTab('monthly_recap')}
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: viewTab === 'monthly_recap' ? '#FFFFFF' : 'transparent',
                color: viewTab === 'monthly_recap' ? 'var(--primary)' : '#475569',
                boxShadow: viewTab === 'monthly_recap' ? 'var(--shadow-sm)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>table_view</span>
              <span>Tabel Rekapitulasi Per Bulan</span>
            </button>
          </div>

          {/* Indikator Filter & Tombol Reset Bulan (Terlihat jelas di kedua tab) */}
          {selectedMonth !== 'all' && (
            <button
              onClick={() => setSelectedMonth('all')}
              style={{
                border: '1.5px solid #2563EB',
                background: '#EFF6FF',
                color: 'var(--primary)',
                fontSize: '0.78rem',
                fontWeight: 700,
                padding: '5px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 3px rgba(37, 99, 235, 0.15)',
                transition: 'all 0.15s ease',
              }}
              title="Klik untuk reset dan tampilkan semua bulan"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px', color: 'var(--primary)' }}>filter_alt</span>
              <span>Filter: <strong>{currentMonthLabel}</strong></span>
              <span style={{ background: '#2563EB', color: '#FFFFFF', borderRadius: '50%', width: '16px', height: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900 }}>✕</span>
              <span style={{ fontSize: '0.74rem', textDecoration: 'underline', color: '#1D4ED8' }}>Reset Semua Bulan</span>
            </button>
          )}
        </div>

        {viewTab === 'chart_table' && (
          <div className="keuangan-search-bar" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {selectedMonth !== 'all' && (
              <button
                onClick={() => setSelectedMonth('all')}
                style={{
                  border: '1px solid #BFDBFE',
                  background: '#EFF6FF',
                  color: 'var(--primary)',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                }}
                title="Tampilkan transaksi semua bulan"
              >
                <span>Filter: {currentMonthLabel}</span>
                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>close</span>
              </button>
            )}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Cari nama pemohon, no registrasi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '7px 12px 7px 32px',
                  borderRadius: '8px',
                  border: '1px solid var(--outline-variant)',
                  fontSize: '0.82rem',
                  width: '260px',
                  outline: 'none',
                }}
              />
              <span className="material-symbols-outlined" style={{ position: 'absolute', left: '8px', top: '7px', fontSize: '18px', color: '#94A3B8' }}>
                search
              </span>
            </div>
            <span style={{ fontSize: '0.78rem', backgroundColor: '#F1F5F9', color: '#475569', padding: '6px 12px', borderRadius: '20px', fontWeight: 700, whiteSpace: 'nowrap' }}>
              {filteredTransactions.length} Transaksi
            </span>
          </div>
        )}
      </div>

      {/* TAB CONTENT 1: RINCIAN TRANSAKSI PER PENGAJUAN */}
      {viewTab === 'chart_table' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
              Rincian Transaksi Pengajuan ({currentMonthLabel})
            </h3>
            {selectedMonth !== 'all' && (
              <button
                onClick={() => setSelectedMonth('all')}
                style={{
                  border: '1.5px solid #2563EB',
                  background: '#EFF6FF',
                  color: 'var(--primary)',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  padding: '6px 14px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 3px rgba(37, 99, 235, 0.15)',
                  transition: 'all 0.15s ease',
                }}
                title="Klik untuk reset dan tampilkan semua transaksi"
              >
                <span>Periode: <strong>{currentMonthLabel}</strong></span>
                <span style={{ background: '#2563EB', color: '#FFFFFF', borderRadius: '50%', width: '16px', height: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900 }}>✕</span>
                <span style={{ textDecoration: 'underline', color: '#1D4ED8' }}>Reset ke Semua Bulan</span>
              </button>
            )}
          </div>

          {/* Mobile View Mode Switcher: Cards vs Table */}
          <div className="keuangan-view-mode-toggle">
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>Tampilan di HP:</span>
            <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '8px', padding: '2px', gap: '2px' }}>
              <button
                type="button"
                onClick={() => setMobileTableMode('cards')}
                style={{
                  border: 'none',
                  background: mobileTableMode === 'cards' ? '#FFFFFF' : 'transparent',
                  color: mobileTableMode === 'cards' ? 'var(--primary)' : '#64748B',
                  fontWeight: mobileTableMode === 'cards' ? 700 : 500,
                  fontSize: '0.74rem',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  boxShadow: mobileTableMode === 'cards' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>view_agenda</span>
                <span>Kartu Ringkas</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileTableMode('table')}
                style={{
                  border: 'none',
                  background: mobileTableMode === 'table' ? '#FFFFFF' : 'transparent',
                  color: mobileTableMode === 'table' ? 'var(--primary)' : '#64748B',
                  fontWeight: mobileTableMode === 'table' ? 700 : 500,
                  fontSize: '0.74rem',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  boxShadow: mobileTableMode === 'table' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>table_chart</span>
                <span>Tabel Geser</span>
              </button>
            </div>
          </div>

          {/* Mobile Card View (Khusus Layar HP: Rapi, Modern, Tidak Ada Teks Terpotong) */}
          <div className={`keuangan-mobile-cards ${mobileTableMode === 'table' ? 'hide-on-mobile' : ''}`}>
            {filteredTransactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px', color: '#94A3B8', background: '#F8FAFC', borderRadius: '12px' }}>
                Tidak ada transaksi pada filter bulan / pencarian ini.
              </div>
            ) : (
              paginatedTransactions.map((item, index) => {
                const globalNo = (currentPage - 1) * pageSize + index + 1;
                return (
                  <div
                    key={`mobile-trx-${item.id}`}
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '14px',
                      padding: '14px 16px',
                      boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    {/* Header: No, ID Pengajuan, Konsulat & Badge Fee Bersih */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94A3B8' }}>
                            #{globalNo}
                          </span>
                          <span style={{ fontWeight: 700, fontSize: '0.74rem', background: '#F1F5F9', color: '#1E293B', padding: '2px 7px', borderRadius: '5px' }}>
                            {item.noPengajuan}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>
                            Konsjen {item.konsjen}
                          </span>
                        </div>
                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.94rem', lineHeight: 1.3, letterSpacing: '-0.01em' }}>
                          {item.namaPemohon}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {item.noTelp && item.noTelp !== '-' && (
                            <span style={{ whiteSpace: 'nowrap' }}>{item.noTelp}</span>
                          )}
                          {item.noTelp && item.noTelp !== '-' && <span>•</span>}
                          <span style={{ whiteSpace: 'nowrap' }}>{formatDateDisplay(item.tglApply || item.tglBerkasMasuk)}</span>
                        </div>
                      </div>

                      {/* Pill Badge Laba Bersih di Kanan Atas */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div
                          style={{
                            backgroundColor: '#F0FDF4',
                            border: '1px solid #BBF7D0',
                            borderRadius: '8px',
                            padding: '4px 10px',
                            textAlign: 'right',
                          }}
                        >
                          <div style={{ fontSize: '0.60rem', color: '#166534', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                            Fee Bersih
                          </div>
                          <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#15803D', whiteSpace: 'nowrap' }}>
                            {formatRupiah(item.feeBersih)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Rincian Finansial: 3 Kotak Terpisah (Dibayar, Modal, CB & Komisi) */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '8px',
                        alignItems: 'stretch',
                      }}
                    >
                      {/* Kotak 1: Dibayar */}
                      <div
                        style={{
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          padding: '8px 4px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                        }}
                      >
                        <div style={{ fontSize: '0.60rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Dibayar
                        </div>
                        <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', marginTop: '3px' }}>
                          {formatRupiah(item.dibayarPemohon)}
                        </div>
                      </div>

                      {/* Kotak 2: Modal Keluar */}
                      <div
                        style={{
                          backgroundColor: '#FEF2F2',
                          border: '1px solid #FECACA',
                          borderRadius: '8px',
                          padding: '8px 4px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          boxShadow: '0 1px 2px rgba(220,38,38,0.03)',
                        }}
                      >
                        <div style={{ fontSize: '0.60rem', color: '#991B1B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Modal
                        </div>
                        <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#DC2626', whiteSpace: 'nowrap', marginTop: '3px' }}>
                          - {formatRupiah(item.nominalKeluar)}
                        </div>
                      </div>

                      {/* Kotak 3: Cashback & Komisi Referral */}
                      <div
                        style={{
                          backgroundColor: item.referralFee > 0 ? '#FFFBEB' : '#F0FDF4',
                          border: item.referralFee > 0 ? '1px solid #FDE68A' : '1px solid #BBF7D0',
                          borderRadius: '8px',
                          padding: '6px 4px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                        }}
                      >
                        <div style={{ fontSize: '0.58rem', color: item.referralFee > 0 ? '#92400E' : '#166534', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                          CB &amp; Komisi
                        </div>
                        <div style={{ fontSize: '0.70rem', fontWeight: 700, color: '#16A34A', whiteSpace: 'nowrap', marginTop: '2px', lineHeight: 1.25 }}>
                          + {formatRupiah(item.cashback)} <span style={{ fontSize: '0.58rem', color: '#64748B', fontWeight: 600 }}>CB</span>
                        </div>
                        {item.referralFee > 0 && (
                          <div style={{ fontSize: '0.70rem', fontWeight: 700, color: '#D97706', whiteSpace: 'nowrap', marginTop: '2px', lineHeight: 1.25 }}>
                            - {formatRupiah(item.referralFee)} <span style={{ fontSize: '0.58rem', color: '#92400E', fontWeight: 600 }}>KMS</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View (Bisa Digeser Horizontal Tanpa Merusak Layout Halaman) */}
          <div
            className={`keuangan-desktop-table ${mobileTableMode === 'table' ? 'show-on-mobile' : ''}`}
            style={{
              width: '100%',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              boxShadow: 'var(--shadow-sm)',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              background: '#ffffff',
            }}
          >
            <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'auto' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  <th style={{ width: '105px', padding: '11px 10px', background: '#F8FAFC', borderBottom: '2px solid #CBD5E1', borderTopLeftRadius: '11px', whiteSpace: 'nowrap', fontSize: '0.74rem', color: '#64748B', fontWeight: 700 }}>
                    NO. &amp; REGISTRASI
                  </th>
                  <th style={{ padding: '11px 10px', background: '#F8FAFC', borderBottom: '2px solid #CBD5E1', fontSize: '0.74rem', color: '#64748B', fontWeight: 700 }}>
                    NAMA PEMOHON
                  </th>
                  <th style={{ width: '115px', padding: '11px 10px', background: '#F8FAFC', borderBottom: '2px solid #CBD5E1', whiteSpace: 'nowrap', fontSize: '0.74rem', color: '#64748B', fontWeight: 700 }}>
                    KONSULAT &amp; TGL
                  </th>
                  <th style={{ textAlign: 'right', width: '120px', padding: '11px 10px', background: '#F8FAFC', borderBottom: '2px solid #CBD5E1', whiteSpace: 'nowrap', fontSize: '0.74rem', color: '#64748B', fontWeight: 700 }}>
                    DIBAYAR PEMOHON
                  </th>
                  <th style={{ textAlign: 'right', width: '125px', padding: '11px 10px', background: '#F8FAFC', borderBottom: '2px solid #CBD5E1', whiteSpace: 'nowrap', fontSize: '0.74rem', color: '#64748B', fontWeight: 700 }}>
                    MODAL KELUAR
                  </th>
                  <th style={{ textAlign: 'right', width: '120px', padding: '11px 10px', background: '#F8FAFC', borderBottom: '2px solid #CBD5E1', whiteSpace: 'nowrap', fontSize: '0.74rem', color: '#64748B', fontWeight: 700 }}>
                    CASHBACK &amp; KOMISI
                  </th>
                  <th style={{ textAlign: 'right', width: '110px', padding: '11px 10px', background: '#F8FAFC', borderBottom: '2px solid #CBD5E1', borderTopRightRadius: '11px', whiteSpace: 'nowrap', fontSize: '0.74rem', color: '#64748B', fontWeight: 700 }}>
                    FEE BERSIH
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                      Tidak ada transaksi pada filter bulan / pencarian ini.
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((item, index) => {
                    const globalNo = (currentPage - 1) * pageSize + index + 1;
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        {/* No. & Registrasi */}
                        <td style={{ padding: '8px 8px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', minWidth: '20px' }}>
                              #{globalNo}
                            </span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.76rem', background: '#F1F5F9', color: '#1E293B', padding: '2px 6px', borderRadius: '5px' }}>
                              {item.noPengajuan}
                            </span>
                          </div>
                        </td>

                        {/* Nama Pemohon & No HP (bisa wrap agar tidak mendorong tabel melebar keluar kartu) */}
                        <td style={{ padding: '8px 8px', minWidth: '120px' }}>
                          <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.82rem', lineHeight: 1.3 }}>{item.namaPemohon}</div>
                          {item.noTelp && item.noTelp !== '-' && (
                            <div style={{ fontSize: '0.70rem', color: '#64748B', marginTop: '2px' }}>{item.noTelp}</div>
                          )}
                        </td>

                        {/* Konsulat & Tgl Apply */}
                        <td style={{ padding: '8px 8px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#334155' }}>Konsjen {item.konsjen}</div>
                          <div style={{ fontSize: '0.70rem', color: '#64748B', marginTop: '2px' }}>
                            {item.tglApply || item.tglBerkasMasuk || '-'}
                          </div>
                        </td>

                        {/* Dibayar Pemohon */}
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, fontSize: '0.80rem', color: '#0F172A', padding: '8px 8px', whiteSpace: 'nowrap' }}>
                          {formatRupiah(item.dibayarPemohon)}
                        </td>

                        {/* Nominal Keluar (Tetap 1 Baris Sebaris Penuh) */}
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--error)', fontSize: '0.80rem', padding: '8px 8px', whiteSpace: 'nowrap' }}>
                          - {formatRupiah(item.nominalKeluar)}
                        </td>

                        {/* Cashback & Komisi */}
                        <td style={{ textAlign: 'right', fontSize: '0.74rem', fontFamily: 'monospace', padding: '8px 8px', whiteSpace: 'nowrap' }}>
                          <div style={{ color: 'var(--success)', whiteSpace: 'nowrap' }}>
                            + {formatRupiah(item.cashback)} <span style={{ fontSize: '0.64rem', color: '#64748B' }}>CB</span>
                          </div>
                          {item.referralFee > 0 && (
                            <div style={{ color: 'var(--warning)', marginTop: '2px', whiteSpace: 'nowrap' }}>
                              - {formatRupiah(item.referralFee)} <span style={{ fontSize: '0.64rem', color: '#64748B' }}>KMS</span>
                            </div>
                          )}
                        </td>

                        {/* Fee Bersih */}
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)', fontSize: '0.84rem', padding: '8px 8px', whiteSpace: 'nowrap' }}>
                          {formatRupiah(item.feeBersih)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Navigasi Paginasi (Agar Halaman Tidak Terlalu Panjang & Rapi di HP) */}
          <div className="keuangan-pagination-bar">
            {/* Info Jumlah Data & Pilihan Tampilkan per Halaman */}
            <div className="keuangan-pagination-info-group">
              <div className="keuangan-page-size-selector">
                <span style={{ fontWeight: 600, color: '#475569' }}>Tampilkan:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="keuangan-page-size-select"
                  title="Pilih jumlah data transaksi per halaman"
                >
                  <option value={15}>15 data / halaman</option>
                  <option value={25}>25 data / halaman</option>
                  <option value={50}>50 data / halaman</option>
                  <option value={9999}>Semua ({filteredTransactions.length} data)</option>
                </select>
              </div>
              <span className="keuangan-pagination-count">
                (Menampilkan <strong>{Math.min(filteredTransactions.length, (currentPage - 1) * pageSize + 1)} - {Math.min(filteredTransactions.length, currentPage * pageSize)}</strong> dari <strong>{filteredTransactions.length}</strong> transaksi)
              </span>
            </div>

            {totalPages > 1 && (
              <div className="keuangan-pagination-controls">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="keuangan-nav-btn"
                  title="Halaman sebelumnya"
                  aria-label="Halaman sebelumnya"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_left</span>
                  <span className="nav-btn-text">Sebelumnya</span>
                </button>

                {/* Nomor Halaman */}
                <div className="keuangan-page-numbers">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5 && currentPage > 3) {
                      pageNum = currentPage - 3 + i;
                      if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                    }
                    const isActive = pageNum === currentPage;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`keuangan-page-btn ${isActive ? 'active' : ''}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="keuangan-nav-btn"
                  title="Halaman berikutnya"
                  aria-label="Halaman berikutnya"
                >
                  <span className="nav-btn-text">Selanjutnya</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: TABEL REKAPITULASI PER BULAN */}
      {viewTab === 'monthly_recap' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                Rekapitulasi Finansial Per Bulan (Tahun {selectedYear})
              </h3>
              <p style={{ fontSize: '0.80rem', color: '#64748B', marginTop: '2px' }}>
                Ringkasan akumulasi seluruh transaksi, modal konsuler, cashback, dan laba bersih per periode bulan.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {selectedMonth !== 'all' && (
                <button
                  onClick={() => setSelectedMonth('all')}
                  style={{
                    border: '1.5px solid #2563EB',
                    background: '#EFF6FF',
                    color: 'var(--primary)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    padding: '6px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 1px 3px rgba(37, 99, 235, 0.15)',
                    transition: 'all 0.15s ease',
                  }}
                  title="Batalkan filter dan tampilkan seluruh data"
                >
                  <span>Filter Aktif: <strong>{currentMonthLabel}</strong></span>
                  <span style={{ background: '#2563EB', color: '#FFFFFF', borderRadius: '50%', width: '16px', height: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900 }}>✕</span>
                  <span style={{ textDecoration: 'underline', color: '#1D4ED8' }}>Reset Semua Bulan</span>
                </button>
              )}
              <button className="btn btn-secondary" onClick={handleExportKeuangan}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
                <span>Unduh Rekap</span>
              </button>
            </div>
          </div>

          <div className="data-table-container" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '12px' }}>
            <table className="data-table table-compact" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
              <thead>
                <tr>
                  <th style={{ width: '28px', textAlign: 'center', padding: '8px 4px', whiteSpace: 'nowrap' }}>No.</th>
                  <th style={{ padding: '8px 5px', whiteSpace: 'nowrap' }}>Periode Bulan</th>
                  <th style={{ textAlign: 'center', padding: '8px 5px', whiteSpace: 'nowrap' }}>Pemohon</th>
                  <th style={{ textAlign: 'right', padding: '8px 5px', whiteSpace: 'nowrap' }}>Omzet</th>
                  <th style={{ textAlign: 'right', padding: '8px 5px', whiteSpace: 'nowrap' }}>Modal</th>
                  <th style={{ textAlign: 'right', padding: '8px 5px', whiteSpace: 'nowrap' }}>Cashback</th>
                  <th style={{ textAlign: 'right', padding: '8px 5px', whiteSpace: 'nowrap' }}>Komisi</th>
                  <th style={{ textAlign: 'right', padding: '8px 5px', whiteSpace: 'nowrap' }}>Laba Bersih</th>
                  <th style={{ textAlign: 'center', padding: '8px 4px', whiteSpace: 'nowrap' }}>Margin</th>
                  <th style={{ textAlign: 'center', padding: '8px 6px', whiteSpace: 'nowrap' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {monthlyStats.map((item, idx) => (
                  <tr
                    key={item.monthKey}
                    style={{
                      backgroundColor: selectedMonth === item.monthKey ? 'rgba(2, 132, 199, 0.05)' : undefined,
                    }}
                  >
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#64748B', padding: '7px 4px', whiteSpace: 'nowrap' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 700, color: 'var(--on-surface)', padding: '7px 5px', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => {
                          setSelectedMonth(item.monthKey);
                          setViewTab('chart_table');
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          font: 'inherit',
                          fontWeight: 700,
                          color: 'var(--primary)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                        title={`Buka rincian transaksi ${item.label}`}
                      >
                        <span>{item.label}</span>
                      </button>
                    </td>
                    <td style={{ textAlign: 'center', padding: '7px 5px', whiteSpace: 'nowrap' }}>
                      <span style={{ padding: '2px 6px', borderRadius: '12px', background: '#F1F5F9', fontWeight: 700, fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                        {item.count} Pemohon
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, padding: '7px 5px', whiteSpace: 'nowrap' }}>
                      {formatRupiah(item.totalDibayar)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#E11D48', padding: '7px 5px', whiteSpace: 'nowrap' }}>
                      {formatRupiah(item.totalNominalKeluar)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--success)', padding: '7px 5px', whiteSpace: 'nowrap' }}>
                      {formatRupiah(item.totalCashback)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--warning)', padding: '7px 5px', whiteSpace: 'nowrap' }}>
                      {formatRupiah(item.totalReferralFee)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)', padding: '7px 5px', whiteSpace: 'nowrap' }}>
                      {formatRupiah(item.totalFeeBersih)}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#059669', fontSize: '0.76rem', padding: '7px 4px', whiteSpace: 'nowrap' }}>
                      {item.marginPersen.toFixed(1)}%
                    </td>
                    <td style={{ textAlign: 'center', padding: '7px 6px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', justifyContent: 'center' }}>
                        <button
                          onClick={() => {
                            setSelectedMonth(item.monthKey);
                            setViewTab('chart_table');
                          }}
                          style={{
                            border: '1px solid #BFDBFE',
                            background: selectedMonth === item.monthKey ? '#2563EB' : '#EFF6FF',
                            color: selectedMonth === item.monthKey ? '#FFFFFF' : 'var(--primary)',
                            fontSize: '0.70rem',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.15s ease'
                          }}
                          title="Buka rincian transaksi bulan ini"
                        >
                          <span>Rincian</span>
                          <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>arrow_forward</span>
                        </button>

                        {selectedMonth === item.monthKey && (
                          <button
                            onClick={() => setSelectedMonth('all')}
                            style={{
                              border: '1px solid #CBD5E1',
                              background: '#FFFFFF',
                              color: '#64748B',
                              fontSize: '0.70rem',
                              fontWeight: 700,
                              padding: '2px 5px',
                              borderRadius: '5px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                            }}
                            title="Batalkan pilihan bulan ini"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '11px', color: '#EF4444' }}>close</span>
                            <span>Reset</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Grand Total Row */}
              <tfoot>
                <tr style={{ backgroundColor: '#F8FAFC', borderTop: '2px solid #CBD5E1', fontWeight: 700 }}>
                  <td colSpan={2} style={{ textAlign: 'right', fontSize: '0.76rem', padding: '8px 5px', whiteSpace: 'nowrap' }}>
                    GRAND TOTAL:
                  </td>
                  <td style={{ textAlign: 'center', color: 'var(--primary)', padding: '8px 5px', whiteSpace: 'nowrap' }}>
                    {grandTotal.count} Pemohon
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#0284C7', padding: '8px 5px', whiteSpace: 'nowrap' }}>
                    {formatRupiah(grandTotal.totalDibayar)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#E11D48', padding: '8px 5px', whiteSpace: 'nowrap' }}>
                    {formatRupiah(grandTotal.totalNominalKeluar)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--success)', padding: '8px 5px', whiteSpace: 'nowrap' }}>
                    {formatRupiah(grandTotal.totalCashback)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--warning)', padding: '8px 5px', whiteSpace: 'nowrap' }}>
                    {formatRupiah(grandTotal.totalReferralFee)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--primary)', fontSize: '0.84rem', padding: '8px 5px', whiteSpace: 'nowrap' }}>
                    {formatRupiah(grandTotal.totalFeeBersih)}
                  </td>
                  <td style={{ textAlign: 'center', color: '#059669', fontSize: '0.76rem', padding: '8px 4px', whiteSpace: 'nowrap' }}>
                    {grandMargin}
                  </td>
                  <td style={{ padding: '8px 6px' }}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
