import type { Pengajuan } from '../types';

/**
 * Mengambil nominal komisi referral mitra yang efektif.
 * Jika pemohon mendaftar menggunakan kode afiliasi mitra, default adalah Rp 100.000 jika belum diatur.
 */
export const getEffectiveReferralFee = (p: Pengajuan): number => {
  const hasMitra = Boolean(
    p.affiliateCode &&
    p.affiliateCode.trim() !== '' &&
    p.affiliateCode.toUpperCase() !== 'MAPAHTRIP'
  );
  if (!hasMitra) return 0;
  return p.referralFee > 0 ? p.referralFee : 100000;
};

/**
 * Mengambil nominal fee operasional staf PIC yang efektif.
 * Default Rp 50.000 jika ada staf PIC bertugas dan belum dispesifikasi.
 */
export const getEffectiveStaffFee = (p: Pengajuan): number => {
  if (p.staffFee !== undefined && p.staffFee !== null) return Number(p.staffFee);
  if (p.cashback !== undefined && p.cashback !== null) return Number(p.cashback);
  const isW = (p.program || '').toLowerCase().includes('waiver');
  if (isW) return 0;
  return p.staffPic ? 50000 : 0;
};

/**
 * Menghitung Fee Bersih MapahTrip secara akurat & transparan:
 * Fee Bersih = Pemasukan (Dibayar Pemohon) - Modal Keluar Konsulat - Komisi Referral Mitra - Fee Staf PIC
 */
export const getEffectiveFeeBersih = (p: Pengajuan): number => {
  if (p.feeBersih !== undefined && p.feeBersih > 0) {
    return p.feeBersih;
  }
  const dibayar = Number(p.dibayarPemohon) || 0;
  const keluar = Number(p.nominalKeluar) || 0;
  const refFee = getEffectiveReferralFee(p);
  const staffFee = getEffectiveStaffFee(p);
  return Math.max(0, dibayar - keluar - refFee - staffFee);
};

/**
 * Mengecek apakah pengajuan sudah lunas pembayarannya.
 * Pengajuan dengan status 'Menunggu Pembayaran' dianggap belum lunas dan belum masuk perhitungan keuangan riil.
 */
export const isPengajuanLunas = (p: Pengajuan): boolean => {
  return p.statusPembayaran !== 'Menunggu Pembayaran';
};


