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
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewTab, setViewTab] = useState<'chart_table' | 'monthly_recap'>('chart_table');
  const [hoveredMonthKey, setHoveredMonthKey] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<'fee' | 'omzet' | 'komparasi'>('fee');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  const formatRupiah = (val: number) => {
    return 'Rp ' + Math.round(val || 0).toLocaleString('id-ID');
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

  // Agregasi Bulanan
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
      .filter((s) => s.year === '2026') // Hanya tahun 2026 agar urut Jan - Okt tanpa anomali tahun lalu
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    arr.forEach((s) => {
      s.marginPersen = s.totalDibayar > 0 ? (s.totalFeeBersih / s.totalDibayar) * 100 : 0;
    });

    return arr;
  }, [pengajuanList]);

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

  // Transaksi yang tersaring berdasarkan selectedMonth
  const transactionsInSelectedMonth = useMemo(() => {
    if (selectedMonth === 'all') return pengajuanList;
    return pengajuanList.filter((item) => getMonthKey(item) === selectedMonth);
  }, [pengajuanList, selectedMonth]);

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

  // Nilai maksimum untuk skala grafik batang (fleksibel sesuai mode tampilan)
  const maxChartValue = useMemo(() => {
    if (monthlyStats.length === 0) return 35000000;
    if (chartMode === 'fee') {
      const maxFee = Math.max(...monthlyStats.map((m) => m.totalFeeBersih));
      return Math.ceil(maxFee / 5000000) * 5000000 || 35000000;
    }
    if (chartMode === 'omzet') {
      const maxOmzet = Math.max(...monthlyStats.map((m) => m.totalDibayar));
      return Math.ceil(maxOmzet / 25000000) * 25000000 || 150000000;
    }
    const maxVal = Math.max(...monthlyStats.map((m) => Math.max(m.totalDibayar, m.totalNominalKeluar, m.totalFeeBersih)));
    return Math.ceil(maxVal / 25000000) * 25000000 || 150000000;
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
        ? 'Semua_Bulan_2026'
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
      `${transactionsInSelectedMonth.length} Siswa`,
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
      'Jumlah Siswa',
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
      'GRAND TOTAL 2026',
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
      ? 'Seluruh Periode (Tahun 2026)'
      : monthlyStats.find((m) => m.monthKey === selectedMonth)?.label || selectedMonth;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header & Main Control Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>
              analytics
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary)' }}>
              Arus Kas &amp; Finansial Visa Per Bulan
            </span>
          </div>
          <h1 className="font-serif" style={{ fontSize: '1.9rem', fontWeight: 700, color: 'var(--on-surface)', margin: 0 }}>
            Laporan Keuangan &amp; Grafik
          </h1>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.88rem', marginTop: '4px' }}>
            Pantau arus dana masuk pemohon, pengeluaran konsuler, cashback mitra, dan margin laba bersih bulanan.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Dropdown Pilihan Bulan (Pill Rounded seperti di Screenshot) */}
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
            >
              <option value="all">Semua Bulan (Tahun 2026)</option>
              {monthlyStats.map((m) => (
                <option key={m.monthKey} value={m.monthKey}>
                  {m.label} ({m.count} Siswa)
                </option>
              ))}
            </select>
          </div>

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>
              filter_alt
            </span>
            <span>Ringkasan Finansial: <strong style={{ color: 'var(--on-surface)' }}>{currentMonthLabel}</strong></span>
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
                padding: '4px 12px',
                borderRadius: '9999px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>Reset ke Semua Bulan</span>
              <span>✕</span>
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
          <div className="card" style={{ padding: '18px', borderLeft: '4px solid #0284C7' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>
              Total Dibayar Pemohon
            </div>
            <div className="font-serif font-mono-tabular" style={{ fontSize: '1.45rem', fontWeight: 700, color: '#0284C7', margin: '6px 0 2px', whiteSpace: 'nowrap' }}>
              {formatRupiah(activeStats.totalDibayar)}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--on-surface-variant)' }}>
              Dari {activeStats.count} transaksi terverifikasi
            </div>
          </div>

          <div className="card" style={{ padding: '18px', borderLeft: '4px solid var(--error)' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>
              Total Nominal Keluar
            </div>
            <div className="font-serif font-mono-tabular" style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--error)', margin: '6px 0 2px', whiteSpace: 'nowrap' }}>
              {formatRupiah(activeStats.totalNominalKeluar)}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--on-surface-variant)' }}>
              Biaya visa konsulat &amp; operasional
            </div>
          </div>

          <div className="card" style={{ padding: '18px', borderLeft: '4px solid var(--success)' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>
              Total Cashback Mitra
            </div>
            <div className="font-serif font-mono-tabular" style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--success)', margin: '6px 0 2px', whiteSpace: 'nowrap' }}>
              {formatRupiah(activeStats.totalCashback)}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--on-surface-variant)' }}>
              Insentif &amp; reward volume mitra
            </div>
          </div>

          <div className="card" style={{ padding: '18px', background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)', borderLeft: '4px solid var(--primary)', border: '1px solid #bfdbfe' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)' }}>
              Total Fee Bersih (Laba Bersih)
            </div>
            <div className="font-serif font-mono-tabular" style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--primary)', margin: '6px 0 2px', whiteSpace: 'nowrap' }}>
              {formatRupiah(activeStats.totalFeeBersih)}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--success)', fontWeight: 700 }}>
              Margin Laba: {activeStats.marginPersen}
            </div>
          </div>
        </div>
      </div>

      {/* GRAFIK KEUANGAN BULANAN (DESAIN SIMPEL & BERSIH) */}
      <div className="card" style={{ padding: '24px' }}>
        {/* Chart Header dengan Tombol Pilihan Simpel */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '22px', color: 'var(--primary)' }}>
                trending_up
              </span>
              <h2 className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--on-surface)' }}>
                Grafik Keuangan Bulanan (Tahun 2026)
              </h2>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)', marginTop: '4px' }}>
              {chartMode === 'fee' && 'Menampilkan tren keuntungan bersih MapahTrip setiap bulan (Klik batang untuk filter).'}
              {chartMode === 'omzet' && 'Menampilkan total arus dana masuk dari pemohon setiap bulan.'}
              {chartMode === 'komparasi' && 'Perbandingan omzet masuk, modal keluar, dan fee bersih per bulan.'}
            </p>
          </div>

          {/* Switch Mode Tampilan Simpel */}
          <div style={{ display: 'flex', background: '#F1F5F9', padding: '4px', borderRadius: '10px', gap: '4px' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px', fontSize: '0.78rem', fontWeight: 600 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#0284C7' }} />
              <span style={{ color: '#0369A1' }}>Omzet Masuk</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#EF4444' }} />
              <span style={{ color: '#DC2626' }}>Modal Keluar</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#10B981' }} />
              <span style={{ color: '#059669' }}>Laba Bersih</span>
            </div>
          </div>
        )}

        {/* Visual Bar Chart Container */}
        <div style={{ position: 'relative', marginTop: '10px', paddingTop: '16px' }}>
          {/* Y-Axis Guide Lines */}
          <div style={{ position: 'absolute', top: 16, left: '50px', right: 0, height: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none', zIndex: 1 }}>
            {[1, 0.75, 0.5, 0.25, 0].map((ratio) => (
              <div key={ratio} style={{ display: 'flex', alignItems: 'center', width: '100%', height: '1px', borderTop: '1px dashed #E2E8F0' }}>
                <span style={{ position: 'absolute', left: '-50px', fontSize: '0.70rem', color: '#94A3B8', fontWeight: 600, width: '45px', textAlign: 'right' }}>
                  {formatJuta(maxChartValue * ratio)}
                </span>
              </div>
            ))}
          </div>

          {/* Horizontal Area for Bars */}
          <div style={{ overflowX: 'auto', paddingLeft: '55px', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', height: '230px', minWidth: `${monthlyStats.length * 62}px`, gap: '12px', position: 'relative', zIndex: 2 }}>
              {monthlyStats.map((item) => {
                const isSelected = selectedMonth === item.monthKey;
                const isHovered = hoveredMonthKey === item.monthKey;

                // Proporsi tinggi batang
                const hFee = Math.max(12, (item.totalFeeBersih / maxChartValue) * 185);
                const hOmzet = Math.max(12, (item.totalDibayar / maxChartValue) * 185);
                const hKeluar = Math.max(8, (item.totalNominalKeluar / maxChartValue) * 185);

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
                      padding: '4px 4px',
                      borderRadius: '8px',
                      backgroundColor: isSelected ? 'rgba(2, 132, 199, 0.08)' : isHovered ? '#F8FAFC' : 'transparent',
                      border: isSelected ? '1.5px solid #0284C7' : '1.5px solid transparent',
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
                          marginBottom: '8px',
                          background: '#0F172A',
                          color: '#FFFFFF',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                          zIndex: 50,
                          pointerEvents: 'none',
                          minWidth: '170px',
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.82rem', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '4px', marginBottom: '6px', color: '#38BDF8' }}>
                          {item.label} ({item.count} Siswa)
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', margin: '2px 0' }}>
                          <span style={{ color: '#93C5FD' }}>Omzet:</span>
                          <strong style={{ fontFamily: 'monospace' }}>{formatRupiah(item.totalDibayar)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', margin: '2px 0' }}>
                          <span style={{ color: '#FCA5A5' }}>Modal:</span>
                          <strong style={{ fontFamily: 'monospace' }}>{formatRupiah(item.totalNominalKeluar)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                          <span style={{ color: '#86EFAC' }}>Laba Bersih:</span>
                          <strong style={{ fontFamily: 'monospace', color: '#4ADE80' }}>{formatRupiah(item.totalFeeBersih)}</strong>
                        </div>
                        <div style={{ fontSize: '0.70rem', color: '#CBD5E1', marginTop: '3px', textAlign: 'right' }}>
                          Margin: <strong>{item.marginPersen.toFixed(1)}%</strong>
                        </div>
                      </div>
                    )}

                    {/* MODE 1: SATU BATANG TUNGGAL LABA BERSIH (SUPER SIMPEL & JELAS) */}
                    {chartMode === 'fee' && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                        {/* Nilai Nominal Tertera di Atas Batang */}
                        <div style={{ fontSize: '0.70rem', fontWeight: 700, color: '#047857', marginBottom: '5px', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                          {formatJuta(item.totalFeeBersih)}
                        </div>
                        <div
                          style={{
                            width: '28px',
                            height: `${hFee}px`,
                            background: isSelected
                              ? 'linear-gradient(180deg, #10B981 0%, #047857 100%)'
                              : 'linear-gradient(180deg, #34D399 0%, #10B981 100%)',
                            borderRadius: '6px 6px 2px 2px',
                            boxShadow: isSelected ? '0 4px 12px rgba(16, 185, 129, 0.4)' : 'none',
                            transition: 'height 0.3s ease, background 0.15s ease',
                          }}
                        />
                      </div>
                    )}

                    {/* MODE 2: SATU BATANG TUNGGAL OMZET MASUK */}
                    {chartMode === 'omzet' && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                        {/* Nilai Nominal Omzet di Atas Batang */}
                        <div style={{ fontSize: '0.70rem', fontWeight: 700, color: '#0284C7', marginBottom: '5px', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                          {formatJuta(item.totalDibayar)}
                        </div>
                        <div
                          style={{
                            width: '28px',
                            height: `${hOmzet}px`,
                            background: isSelected
                              ? 'linear-gradient(180deg, #0284C7 0%, #0369A1 100%)'
                              : 'linear-gradient(180deg, #38BDF8 0%, #0284C7 100%)',
                            borderRadius: '6px 6px 2px 2px',
                            boxShadow: isSelected ? '0 4px 12px rgba(2, 132, 199, 0.4)' : 'none',
                            transition: 'height 0.3s ease, background 0.15s ease',
                          }}
                        />
                      </div>
                    )}

                    {/* MODE 3: KOMPARASI 3 BATANG */}
                    {chartMode === 'komparasi' && (
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', width: '100%', justifyContent: 'center' }}>
                        <div
                          style={{
                            width: '10px',
                            height: `${hOmzet}px`,
                            background: 'linear-gradient(180deg, #38BDF8 0%, #0284C7 100%)',
                            borderRadius: '3px 3px 1px 1px',
                          }}
                          title={`Omzet: ${formatRupiah(item.totalDibayar)}`}
                        />
                        <div
                          style={{
                            width: '10px',
                            height: `${hKeluar}px`,
                            background: 'linear-gradient(180deg, #F87171 0%, #EF4444 100%)',
                            borderRadius: '3px 3px 1px 1px',
                          }}
                          title={`Modal: ${formatRupiah(item.totalNominalKeluar)}`}
                        />
                        <div
                          style={{
                            width: '10px',
                            height: `${hFee}px`,
                            background: 'linear-gradient(180deg, #34D399 0%, #10B981 100%)',
                            borderRadius: '3px 3px 1px 1px',
                          }}
                          title={`Laba: ${formatRupiah(item.totalFeeBersih)}`}
                        />
                      </div>
                    )}

                    {/* X-Axis Month Label */}
                    <div style={{ marginTop: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: isSelected ? 700 : 600, color: isSelected ? 'var(--primary)' : '#475569' }}>
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
        {bestMonthStats && (
          <div style={{ marginTop: '18px', padding: '12px 18px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#10B981' }}>
                verified
              </span>
              <span>
                Bulan Teruntung: <strong style={{ color: '#047857' }}>{bestMonthStats.highestLaba.label} ({formatRupiah(bestMonthStats.highestLaba.totalFeeBersih)})</strong>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0284C7' }}>
                equalizer
              </span>
              <span>
                Rata-rata Laba: <strong style={{ color: '#0284C7' }}>{formatRupiah(Math.round(grandTotal.totalFeeBersih / monthlyStats.length))} / bulan</strong>
              </span>
            </div>
            <div style={{ color: '#64748B', fontSize: '0.78rem' }}>
              💡 <em>Klik batang bulan di atas untuk melihat data transaksinya.</em>
            </div>
          </div>
        )}
      </div>

      {/* VIEW TAB SWITCHER (DETAIL TRANSAKSI VS TABEL REKAPITULASI BULANAN) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', background: '#E2E8F0', padding: '3px', borderRadius: '10px' }}>
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
            <span>Rincian Transaksi Siswa</span>
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

        {viewTab === 'chart_table' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
            <h3 className="font-serif" style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
              Rincian Transaksi Pengajuan ({currentMonthLabel})
            </h3>
            {selectedMonth !== 'all' && (
              <span style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600 }}>
                Disaring untuk periode: {currentMonthLabel}
              </span>
            )}
          </div>

          {/* Container Tabel Tanpa Scrollbar Internal (Scrollbar murni di pojok kanan layar window seperti dashboard staf) */}
          <div
            style={{
              width: '100%',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              boxShadow: 'var(--shadow-sm)',
              overflow: 'visible',
              background: '#ffffff',
            }}
          >
            <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ width: '105px', padding: '10px 8px', position: 'sticky', top: '68px', background: '#F8FAFC', zIndex: 25, borderBottom: '2px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', borderTopLeftRadius: '11px', whiteSpace: 'nowrap', fontSize: '0.72rem' }}>
                    NO. &amp; REGISTRASI
                  </th>
                  <th style={{ padding: '10px 8px', position: 'sticky', top: '68px', background: '#F8FAFC', zIndex: 25, borderBottom: '2px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', fontSize: '0.72rem' }}>
                    NAMA PEMOHON
                  </th>
                  <th style={{ width: '115px', padding: '10px 8px', position: 'sticky', top: '68px', background: '#F8FAFC', zIndex: 25, borderBottom: '2px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', whiteSpace: 'nowrap', fontSize: '0.72rem' }}>
                    KONSULAT &amp; TGL
                  </th>
                  <th style={{ textAlign: 'right', width: '120px', padding: '10px 8px', position: 'sticky', top: '68px', background: '#F8FAFC', zIndex: 25, borderBottom: '2px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', whiteSpace: 'nowrap', fontSize: '0.72rem' }}>
                    DIBAYAR PEMOHON
                  </th>
                  <th style={{ textAlign: 'right', width: '125px', padding: '10px 8px', position: 'sticky', top: '68px', background: '#F8FAFC', zIndex: 25, borderBottom: '2px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', whiteSpace: 'nowrap', fontSize: '0.72rem' }}>
                    MODAL KELUAR
                  </th>
                  <th style={{ textAlign: 'right', width: '120px', padding: '10px 8px', position: 'sticky', top: '68px', background: '#F8FAFC', zIndex: 25, borderBottom: '2px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', whiteSpace: 'nowrap', fontSize: '0.72rem' }}>
                    CASHBACK &amp; KOMISI
                  </th>
                  <th style={{ textAlign: 'right', width: '110px', padding: '10px 8px', position: 'sticky', top: '68px', background: '#F8FAFC', zIndex: 25, borderBottom: '2px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', borderTopRightRadius: '11px', whiteSpace: 'nowrap', fontSize: '0.72rem' }}>
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

          {/* Navigasi Paginasi (Agar Halaman Tidak Terlalu Panjang) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', flexWrap: 'wrap', gap: '12px', fontSize: '0.82rem', color: '#64748B' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Tampilkan:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.80rem',
                  fontWeight: 600,
                  color: '#0F172A',
                  background: '#FFFFFF',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value={15}>15 data / halaman</option>
                <option value={25}>25 data / halaman</option>
                <option value={50}>50 data / halaman</option>
                <option value={9999}>Semua ({filteredTransactions.length} data)</option>
              </select>
              <span>
                (Menampilkan <strong>{Math.min(filteredTransactions.length, (currentPage - 1) * pageSize + 1)} - {Math.min(filteredTransactions.length, currentPage * pageSize)}</strong> dari <strong>{filteredTransactions.length}</strong> transaksi)
              </span>
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    border: '1px solid #E2E8F0',
                    background: currentPage === 1 ? '#F8FAFC' : '#FFFFFF',
                    color: currentPage === 1 ? '#94A3B8' : '#0F172A',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '0.80rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  ‹ Sebelumnya
                </button>

                {/* Nomor Halaman */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                        onClick={() => setCurrentPage(pageNum)}
                        style={{
                          minWidth: '32px',
                          height: '32px',
                          padding: '0 6px',
                          borderRadius: '6px',
                          border: isActive ? '1px solid var(--primary)' : '1px solid #E2E8F0',
                          background: isActive ? 'var(--primary)' : '#FFFFFF',
                          color: isActive ? '#FFFFFF' : '#334155',
                          fontWeight: isActive ? 700 : 500,
                          fontSize: '0.80rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    border: '1px solid #E2E8F0',
                    background: currentPage === totalPages ? '#F8FAFC' : '#FFFFFF',
                    color: currentPage === totalPages ? '#94A3B8' : '#0F172A',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '0.80rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Selanjutnya ›
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
              <h3 className="font-serif" style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                Rekapitulasi Finansial Per Bulan (Tahun 2026)
              </h3>
              <p style={{ fontSize: '0.80rem', color: '#64748B', marginTop: '2px' }}>
                Ringkasan akumulasi seluruh transaksi, modal konsuler, cashback, dan laba bersih per periode bulan.
              </p>
            </div>
            <button className="btn btn-secondary" onClick={handleExportKeuangan}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
              <span>Unduh Rekap</span>
            </button>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '46px', textAlign: 'center' }}>No.</th>
                  <th>Periode Bulan</th>
                  <th style={{ textAlign: 'center' }}>Jumlah Siswa</th>
                  <th style={{ textAlign: 'right' }}>Omzet Masuk (Rp)</th>
                  <th style={{ textAlign: 'right' }}>Modal Keluar (Rp)</th>
                  <th style={{ textAlign: 'right' }}>Cashback Mitra (Rp)</th>
                  <th style={{ textAlign: 'right' }}>Komisi Affiliate (Rp)</th>
                  <th style={{ textAlign: 'right' }}>Fee Bersih / Laba (Rp)</th>
                  <th style={{ textAlign: 'center' }}>Margin (%)</th>
                  <th style={{ textAlign: 'center' }}>Aksi</th>
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
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#64748B' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 700, color: 'var(--on-surface)' }}>
                      {item.label}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '12px', background: '#F1F5F9', fontWeight: 700, fontSize: '0.78rem' }}>
                        {item.count} Pemohon
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                      {formatRupiah(item.totalDibayar)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--error)' }}>
                      {formatRupiah(item.totalNominalKeluar)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--success)' }}>
                      {formatRupiah(item.totalCashback)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--warning)' }}>
                      {formatRupiah(item.totalReferralFee)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                      {formatRupiah(item.totalFeeBersih)}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#059669', fontSize: '0.80rem' }}>
                      {item.marginPersen.toFixed(1)}%
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => {
                          setSelectedMonth(item.monthKey);
                          setViewTab('chart_table');
                        }}
                        style={{
                          border: 'none',
                          background: '#EFF6FF',
                          color: 'var(--primary)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        Buka Transaksi →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Grand Total Row */}
              <tfoot>
                <tr style={{ backgroundColor: '#F8FAFC', borderTop: '2px solid #CBD5E1', fontWeight: 700 }}>
                  <td colSpan={2} style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                    GRAND TOTAL KESELURUHAN:
                  </td>
                  <td style={{ textAlign: 'center', color: 'var(--primary)' }}>
                    {grandTotal.count} Siswa
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#0284C7' }}>
                    {formatRupiah(grandTotal.totalDibayar)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--error)' }}>
                    {formatRupiah(grandTotal.totalNominalKeluar)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--success)' }}>
                    {formatRupiah(grandTotal.totalCashback)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--warning)' }}>
                    {formatRupiah(grandTotal.totalReferralFee)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--primary)', fontSize: '0.95rem' }}>
                    {formatRupiah(grandTotal.totalFeeBersih)}
                  </td>
                  <td style={{ textAlign: 'center', color: '#059669', fontSize: '0.85rem' }}>
                    {grandMargin}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
