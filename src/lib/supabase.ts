import { createClient } from '@supabase/supabase-js';
import type { Pengajuan, StatusPengajuan, KonsjenKota, StaffName, PaketVisa, AffiliateUser } from '../types';
import { REAL_SPREADSHEET_PENGAJUAN, REAL_SPREADSHEET_AFFILIATES } from '../data/spreadsheetData';
import { uploadApplicantDocToStorage, removeOldApplicantDocFromStorage } from './supabaseStorage';
import { determineDefaultStaffPic } from '../utils/staffAssignment';

const SUPABASE_URL = 'https://vswmndovcmchqhyzlawo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzd21uZG92Y21jaHFoeXpsYXdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwODg0MDksImV4cCI6MjEwNzY2NDQwOX0.79-tEuh-1M3MeJaBnIIbVtrFwUfKK_I-VmC-zm_fQhQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface PengajuanVisaDB {
  id: number;
  no_urut: number;
  nama: string;
  program: string;
  paket: string;
  konsjen: string;
  staff_pic: string;
  status: string;
  keterangan: string;
  form_visa: boolean;
  ktp: boolean;
  ektln: boolean;
  coe: boolean;
  foto: boolean;
  tgl_sampai: string;
  tgl_proses: string;
  tgl_selesai: string;
  tgl_kirim: string;
  resi_pengiriman: string;
  jadwal_terbang: string;
  domisili_ktp: string;
  no_wa: string;
  no_paspor: string;
  code_referral: string;
  nominal_dibayar: number;
  nominal_keluar: number;
  cashback: number;
  fee_bersih: number;
  payment_status: boolean;
  created_at?: string;
  updated_at?: string;
}

export function mapDBToPengajuan(db: PengajuanVisaDB): Pengajuan {
  let mappedStatus: StatusPengajuan = 'Menunggu Verifikasi';
  const st = (db.status || '').toLowerCase().trim();
  if (st.includes('selesai') || st.includes('terbit') || st.includes('done')) {
    mappedStatus = 'Selesai';
  } else if (st.includes('proses')) {
    mappedStatus = 'Sedang Diproses';
  } else if (st.includes('hari ini')) {
    mappedStatus = 'Apply Hari Ini';
  } else if (st.includes('ambil') || st.includes('kirim') || st.includes('siap')) {
    mappedStatus = 'Siap Ambil';
  } else if (st.includes('cancel') || st.includes('reject') || st.includes('tidak respon') || st.includes('tolak')) {
    mappedStatus = 'Ditolak';
  } else {
    mappedStatus = 'Menunggu Verifikasi';
  }

  // Cocokkan dengan REAL_SPREADSHEET_PENGAJUAN jika data historis awal (no_urut <= 299).
  // Data baru yang didaftarkan mandiri / via portal staf TIDAK boleh mencocokkan ke spreadsheet lama!
  const isRegisteredViaSystem = Boolean(
    db.keterangan && (
      db.keterangan.includes('Website Mapahtrip') ||
      db.keterangan.includes('Pendaftaran mandiri') ||
      db.keterangan.includes('Portal Staf')
    )
  );
  const applicantNo = Number(db.no_urut || db.id);
  const isHistoricalRow = !isRegisteredViaSystem && (applicantNo <= 306 || Boolean(REAL_SPREADSHEET_PENGAJUAN.find((p) => p.id === String(applicantNo))));
  const found = isHistoricalRow
    ? (REAL_SPREADSHEET_PENGAJUAN.find((p) => p.id === String(applicantNo)) ||
       REAL_SPREADSHEET_PENGAJUAN.find((p) => p.namaPemohon && db.nama && p.namaPemohon.trim().toLowerCase() === db.nama.trim().toLowerCase()))
    : undefined;

  let kons: KonsjenKota = 'Jakarta';
  const k = (db.konsjen || found?.konsjen || '').toLowerCase();
  if (k.includes('surabaya')) kons = 'Surabaya';
  else if (k.includes('denpasar') || k.includes('bali')) kons = 'Denpasar';
  else if (k.includes('medan')) kons = 'Medan';
  else if (k.includes('makassar')) kons = 'Makassar';

  const resolvedProgram = db.program || found?.program || 'Tokutei Ginou';
  const cleanProg = resolvedProgram.toLowerCase();
  const isWaiver = cleanProg.includes('waiver') || cleanProg.includes('e-visa') || cleanProg.includes('evisa');

  let staff: StaffName | string = '';
  if (!isWaiver) {
    if (isHistoricalRow && found?.staffPic) {
      staff = found.staffPic;
    } else {
      const rawPic = (db.staff_pic || found?.staffPic || '').trim();
      const s = rawPic.toLowerCase();
      if (s.includes('nanami')) staff = 'Nanami Kay';
      else if (s.includes('yulia')) staff = 'Yulia';
      else if (s.includes('heru')) staff = 'Heru';
      else if (s.includes('latifah')) staff = 'Latifah';
      else if (s.includes('ulla') || s.includes('ulya')) staff = 'Ulla';
      else if (s.includes('rizky')) staff = 'Rizky';
      else if (rawPic) staff = rawPic;
      else if (cleanProg.includes('kunjungan')) staff = 'Ulla';
      else {
        staff = determineDefaultStaffPic(resolvedProgram, kons);
      }
    }
  } else {
    staff = 'Admin';
  }

  const paspor = db.no_paspor || `E${6000000 + db.id}`;
  const masked = paspor.length > 4 ? `${paspor.slice(0, 3)}***${paspor.slice(-2)}` : paspor;

  let noteText = db.keterangan || (db.jadwal_terbang ? `Flight: ${db.jadwal_terbang}` : undefined);
  let fotoData: string | undefined = undefined;
  let fotoSize: number | undefined = undefined;
  let uploadedDocsData: Record<string, { name: string; base64: string; sizeKB?: number }> | undefined = undefined;
  let buktiBayarData: string | undefined = undefined;
  let buktiBayarNamaData: string | undefined = undefined;
  let statusBayarData: 'Lunas' | 'Menunggu Pembayaran' | undefined = undefined;
  let metodeBayarData: string | undefined = undefined;
  let tglBayarData: string | undefined = undefined;
  let staffFeeData: number | undefined = undefined;
  let referralFeeData: number | undefined = undefined;
  let staffPayoutStatusData: string | undefined = undefined;
  let staffPayoutTanggalData: string | undefined = undefined;
  let staffPayoutNoRefData: string | undefined = undefined;
  let staffPayoutBuktiUrlData: string | undefined = undefined;
  let staffPayoutByData: string | undefined = undefined;
  let staffPayoutCatatanData: string | undefined = undefined;

  let payoutStatusData: string | undefined = undefined;
  let payoutTanggalData: string | undefined = undefined;
  let payoutNoRefData: string | undefined = undefined;
  let payoutBuktiUrlData: string | undefined = undefined;
  let payoutByData: string | undefined = undefined;
  let payoutCatatanData: string | undefined = undefined;

  try {
    if (db.keterangan && db.keterangan.startsWith('{') && db.keterangan.endsWith('}')) {
      const parsed = JSON.parse(db.keterangan);
      if (parsed.note) noteText = parsed.note;
      if (parsed.fotoBase64) fotoData = parsed.fotoBase64;
      if (parsed.compressedSizeKB) fotoSize = parsed.compressedSizeKB;
      if (parsed.uploadedDocs) uploadedDocsData = parsed.uploadedDocs;
      else if (parsed.documents) uploadedDocsData = parsed.documents;
      if (parsed.buktiBayarPemohon) buktiBayarData = parsed.buktiBayarPemohon;
      if (parsed.buktiBayarNama) buktiBayarNamaData = parsed.buktiBayarNama;
      if (parsed.statusPembayaran) statusBayarData = parsed.statusPembayaran;
      if (parsed.metodePembayaran) metodeBayarData = parsed.metodePembayaran;
      if (parsed.tglBayarPemohon) tglBayarData = parsed.tglBayarPemohon;
      if (parsed.staffFee !== undefined) staffFeeData = Number(parsed.staffFee);
      if (parsed.referralFee !== undefined) referralFeeData = Number(parsed.referralFee);
      if (parsed.staffPayoutStatus) staffPayoutStatusData = parsed.staffPayoutStatus;
      if (parsed.staffPayoutTanggal) staffPayoutTanggalData = parsed.staffPayoutTanggal;
      if (parsed.staffPayoutNoRef) staffPayoutNoRefData = parsed.staffPayoutNoRef;
      if (parsed.staffPayoutBuktiUrl) staffPayoutBuktiUrlData = parsed.staffPayoutBuktiUrl;
      if (parsed.staffPayoutBy) staffPayoutByData = parsed.staffPayoutBy;
      if (parsed.staffPayoutCatatan) staffPayoutCatatanData = parsed.staffPayoutCatatan;

      if (parsed.payoutStatus) payoutStatusData = parsed.payoutStatus;
      if (parsed.payoutTanggal) payoutTanggalData = parsed.payoutTanggal;
      if (parsed.payoutNoRef) payoutNoRefData = parsed.payoutNoRef;
      if (parsed.payoutBuktiUrl) payoutBuktiUrlData = parsed.payoutBuktiUrl;
      if (parsed.payoutBy) payoutByData = parsed.payoutBy;
      if (parsed.payoutCatatan) payoutCatatanData = parsed.payoutCatatan;
    }
  } catch {}

  const normalizeDate = (d?: string): string => {
    if (!d) return '';
    const trimmed = d.trim();
    if (/^\d{4}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed)) {
      const parts = trimmed.split('/');
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    if (/^\d{1,2}-\d{1,2}-\d{4}/.test(trimmed)) {
      const parts = trimmed.split('-');
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return trimmed;
  };

  const rawTglMasuk = normalizeDate(db.tgl_sampai) || (found ? normalizeDate(found.tglBerkasMasuk) : '');
  const rawTglApply = normalizeDate(db.tgl_proses) || (found ? normalizeDate(found.tglApply) : '');
  const rawTglSelesai = normalizeDate(db.tgl_selesai) || (found ? normalizeDate(found.tglSelesai || found.tglEstimasiSelesai) : '');
  const rawTglKirim = normalizeDate(db.tgl_kirim) || (found ? normalizeDate(found.tglKirim) : '');

  const affCode = (() => {
    // Untuk data historis spreadsheet bawaan (<= 299), selalu prioritaskan mapping resmi spreadsheet
    if (isHistoricalRow && found?.affiliateCode) {
      return found.affiliateCode;
    }
    const c = (db.code_referral || '').trim();
    if (!c || /^\d+$/.test(c)) {
      return found?.affiliateCode || 'MAPAHTRIP';
    }
    return c;
  })();

  const hasAffiliate = Boolean(affCode && affCode.toUpperCase() !== 'MAPAHTRIP');
  const dibayar = (db.nominal_dibayar !== null && db.nominal_dibayar !== undefined)
    ? Number(db.nominal_dibayar)
    : (found?.dibayarPemohon ?? (isHistoricalRow ? 1650000 : 0));
  const keluar = (db.nominal_keluar !== null && db.nominal_keluar !== undefined)
    ? Number(db.nominal_keluar)
    : (found?.nominalKeluar ?? (isHistoricalRow ? 1135000 : 0));
  const ref = hasAffiliate ? (found?.referralFee || 100000) : (found?.referralFee || 0);
  const cb = isHistoricalRow && found?.cashback !== undefined
    ? Number(found.cashback)
    : (Number(db.cashback) !== undefined && !isNaN(Number(db.cashback))
      ? Number(db.cashback)
      : (found?.cashback ?? 0));
  const fee = (db.fee_bersih !== null && db.fee_bersih !== undefined)
    ? Number(db.fee_bersih)
    : (found?.feeBersih ?? (isHistoricalRow && dibayar > 0 ? Math.max(0, dibayar - keluar - ref + cb) : 0));

  const resolvedPaymentStatus: 'Lunas' | 'Menunggu Pembayaran' = statusBayarData ||
    (db.payment_status === false ? 'Menunggu Pembayaran' :
      (db.payment_status === true && dibayar > 0 ? 'Lunas' :
        (found?.statusPembayaran || (dibayar > 0 ? 'Lunas' : 'Menunggu Pembayaran'))));

  const staffFeeResolved = isHistoricalRow && found?.cashback !== undefined
    ? Number(found.cashback)
    : (staffFeeData !== undefined
      ? staffFeeData
      : (cb > 0 ? cb : (isHistoricalRow && !isWaiver && staff ? 50000 : 0)));

  const hasHistoricalStaffPayout = isHistoricalRow && !isWaiver && Boolean(staff) && staffFeeResolved > 0;

    return {
    id: String(db.id),
    noPengajuan: `MT-${String(db.no_urut || db.id).padStart(4, '0')}`,
    namaPemohon: db.nama,
    noPaspor: paspor,
    maskedPaspor: masked,
    noTelp: db.no_wa || found?.noTelp || '',
    konsjen: kons,
    staffPic: (staff as any),
    program: resolvedProgram,
    paket: (db.paket as PaketVisa) || found?.paket || 'Reguler',
    tglBerkasMasuk: rawTglMasuk,
    tglApply: rawTglApply,
    tglEstimasiSelesai: rawTglSelesai,
    tglSelesai: rawTglSelesai || undefined,
    tglKirim: rawTglKirim || undefined,
    status: mappedStatus,
    noResi: db.resi_pengiriman || found?.noResi || undefined,
    affiliateCode: affCode,
    dibayarPemohon: dibayar,
    nominalKeluar: keluar,
    cashback: cb,
    feeBersih: fee,
    referralFee: referralFeeData !== undefined ? referralFeeData : ref,
    staffFee: staffFeeResolved,
    staffPayoutStatus: (staffPayoutStatusData as any) || (found as any)?.staffPayoutStatus || (hasHistoricalStaffPayout ? 'Berhasil Ditransfer' : undefined),
    staffPayoutTanggal: staffPayoutTanggalData || (found as any)?.staffPayoutTanggal || (hasHistoricalStaffPayout ? (rawTglSelesai || rawTglMasuk || '2026-09-30') : undefined),
    staffPayoutNoRef: staffPayoutNoRefData || (found as any)?.staffPayoutNoRef || (hasHistoricalStaffPayout ? `TRX-LEGACY-MT-${String(db.no_urut || db.id).padStart(4, '0')}` : undefined),
    staffPayoutBuktiUrl: staffPayoutBuktiUrlData || (found as any)?.staffPayoutBuktiUrl || undefined,
    staffPayoutBy: staffPayoutByData || (found as any)?.staffPayoutBy || (hasHistoricalStaffPayout ? 'Owner MapahTrip' : undefined),
    staffPayoutCatatan: staffPayoutCatatanData || (found as any)?.staffPayoutCatatan || undefined,
    berkas: isHistoricalRow
      ? {
          formVisa: db.form_visa ?? true,
          ktp: db.ktp ?? true,
          ektln: db.ektln ?? true,
          coe: db.coe ?? true,
          foto: db.foto ?? true,
          pasporFisik: true,
        }
      : {
          formVisa: Boolean(db.form_visa || uploadedDocsData?.formVisa),
          ktp: Boolean(db.ktp || uploadedDocsData?.ktp),
          ektln: Boolean(db.ektln || uploadedDocsData?.ektln),
          coe: Boolean(db.coe || uploadedDocsData?.coe),
          foto: Boolean(db.foto || fotoData || uploadedDocsData?.foto),
          pasporFisik: Boolean((db as any).paspor_fisik || uploadedDocsData?.pasporFisik),
        },
    catatan: noteText,
    fotoBase64: fotoData,
    fotoSizeKB: fotoSize,
    uploadedDocs: uploadedDocsData,
    statusPembayaran: resolvedPaymentStatus,
    metodePembayaran: metodeBayarData || (db as any).metode_pembayaran || (isHistoricalRow ? 'Transfer BCA' : 'Transfer BTN (119001500015870) - Tokyo Asia Connection'),
    tglBayarPemohon: tglBayarData || (db as any).tgl_bayar_pemohon || (isHistoricalRow ? rawTglMasuk : '') || '',
    buktiBayarPemohon: buktiBayarData || (db as any).bukti_bayar_pemohon || (found as any)?.buktiBayarPemohon || undefined,
    buktiBayarNama: buktiBayarNamaData || (db as any).bukti_bayar_nama || undefined,
    payoutStatus: (payoutStatusData as any) || (db as any).payout_status || (found as any)?.payoutStatus || (isHistoricalRow ? 'Berhasil Ditransfer' : undefined),
    payoutTanggal: payoutTanggalData || (db as any).payout_tanggal || (found as any)?.payoutTanggal || (isHistoricalRow ? (rawTglSelesai || rawTglMasuk || '2026-09-30') : undefined),
    payoutNoRef: payoutNoRefData || (db as any).payout_no_ref || (found as any)?.payoutNoRef || (isHistoricalRow ? `TRX-LEGACY-MT-${String(db.no_urut || db.id).padStart(4, '0')}` : undefined),
    payoutBuktiUrl: payoutBuktiUrlData || (found as any)?.payoutBuktiUrl || undefined,
    payoutBy: payoutByData || (db as any).payout_by || (found as any)?.payoutBy || (isHistoricalRow ? 'Owner MapahTrip' : undefined),
    payoutCatatan: payoutCatatanData || (found as any)?.payoutCatatan || undefined,
  };
}

export async function fetchAllPengajuanFromDB(): Promise<Pengajuan[]> {
  const { data, error } = await supabase
    .from('pengajuan_visa')
    .select('*')
    .order('id', { ascending: false });

  if (error || !data) {
    console.error('Error fetching pengajuan:', error);
    return [];
  }

  return data.map(mapDBToPengajuan);
}

export async function searchPasporInDB(query: string): Promise<Pengajuan | null> {
  const clean = query.trim().toUpperCase();
  const numOnly = clean.replace(/[^0-9]/g, '');
  let orFilter = `no_paspor.ilike.%${clean}%,nama.ilike.%${clean}%`;
  if (numOnly) {
    orFilter += `,id.eq.${numOnly},no_urut.eq.${numOnly}`;
  }
  const { data, error } = await supabase
    .from('pengajuan_visa')
    .select('*')
    .or(orFilter)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return mapDBToPengajuan(data);
}

export async function createPengajuanInDB(payload: {
  nama: string;
  domisili_ktp: string;
  no_wa: string;
  no_paspor: string;
  code_referral?: string;
  form_visa: boolean;
  ktp: boolean;
  ektln: boolean;
  coe: boolean;
  foto: boolean;
  program: string;
  paket: string;
  konsjen?: string;
  staff_pic?: string;
  keterangan?: string;
  foto_base64?: string;
  original_size_kb?: number;
  compressed_size_kb?: number;
  uploaded_docs?: Record<string, { name: string; base64: string; sizeKB?: number }>;
  bukti_bayar_pemohon?: string;
  bukti_bayar_nama?: string;
  status_pembayaran?: string;
  metode_pembayaran?: string;
  nominal_dibayar?: number;
  nominal_keluar?: number;
  cashback?: number;
  fee_bersih?: number;
}) {
  try {
    const isLunas = payload.status_pembayaran === 'Lunas';
    const statusBayar = payload.status_pembayaran || 'Menunggu Pembayaran';
    const fotoFinal = payload.foto_base64 || payload.uploaded_docs?.foto?.base64;
    const ketString = JSON.stringify({
      note: payload.keterangan || 'Pendaftaran mandiri via Website Mapahtrip.id',
      fotoBase64: fotoFinal,
      originalSizeKB: payload.original_size_kb,
      compressedSizeKB: payload.compressed_size_kb,
      uploadedDocs: payload.uploaded_docs || {},
      buktiBayarPemohon: payload.bukti_bayar_pemohon,
      buktiBayarNama: payload.bukti_bayar_nama,
      statusPembayaran: statusBayar,
      metodePembayaran: payload.metode_pembayaran || 'Transfer Bank',
      uploadedAt: new Date().toISOString(),
    });

    const { data, error } = await supabase
      .from('pengajuan_visa')
      .insert([
        {
          nama: payload.nama,
          domisili_ktp: payload.domisili_ktp,
          no_wa: payload.no_wa,
          no_paspor: payload.no_paspor || '-',
          code_referral: payload.code_referral || 'MAPAHTRIP',
          form_visa: payload.form_visa,
          ktp: payload.ktp,
          ektln: payload.ektln,
          coe: payload.coe,
          foto: payload.foto,
          program: payload.program,
          paket: payload.paket,
          payment_status: isLunas,
          nominal_dibayar: payload.nominal_dibayar || 0,
          nominal_keluar: payload.nominal_keluar || 0,
          cashback: payload.cashback || 0,
          fee_bersih: payload.fee_bersih !== undefined ? payload.fee_bersih : ((payload.nominal_dibayar || 0) - (payload.nominal_keluar || 0)),
          konsjen: payload.konsjen || 'Jakarta',
          staff_pic:
            payload.staff_pic ||
            (determineDefaultStaffPic(payload.program, payload.konsjen) as string) ||
            (payload.konsjen === 'Surabaya'
              ? 'Nanami Kay'
              : payload.konsjen === 'Denpasar'
              ? 'Yulia'
              : payload.konsjen === 'Medan'
              ? 'Heru'
              : payload.konsjen === 'Makassar'
              ? 'Latifah'
              : 'Rizky'),
          status: 'Menunggu Verifikasi',
          keterangan: ketString,
          tgl_sampai: null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.warn('Supabase insert note:', error);
      return null;
    }

    // Pastikan no_urut selalu terisi dan berurutan rapi (+1 dari no_urut tertinggi yang ada)
    if (data && !data.no_urut && data.id) {
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

    return data;
  } catch (err) {
    console.warn('DB error:', err);
    return null;
  }
}

/**
 * Hapus data pengajuan dari Supabase Cloud (misal jika terjadi duplikasi atau pembatalan)
 */
export async function deletePengajuanInDB(id: string | number): Promise<boolean> {
  try {
    const numId = Number(id);
    const filter = !isNaN(numId) ? { id: numId } : { id: String(id) };
    const { error } = await supabase.from('pengajuan_visa').delete().match(filter);
    if (error) {
      console.warn('Gagal menghapus pengajuan dari Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Error deletePengajuanInDB:', err);
    return false;
  }
}

/**
 * Update atau upload dokumen pemohon langsung dari antarmuka Staf / Owner
 */
export async function updatePengajuanDocumentInDB(
  id: string | number,
  docKey: string,
  base64Data: string,
  docName: string = 'Dokumen',
  sizeKB?: number
) {
  try {
    const finalSizeKB = sizeKB || Math.round((base64Data.length * 0.75) / 1024);

    // Upload fisik ke Supabase Cloud Storage (Bucket mapahtrip-storage)
    let storageUrl: string | undefined = undefined;
    try {
      const uploadRes = await uploadApplicantDocToStorage({
        applicantId: id,
        docKey,
        file: base64Data,
        fileName: docName,
      });
      if (uploadRes.url) {
        storageUrl = uploadRes.url;
      }
    } catch (e) {
      console.warn('Supabase storage upload attempt error:', e);
    }

    // 1. Selalu sinkronkan ke local cache agar antarmuka staf & pendaftar selalu sinkron tanpa jeda
    try {
      const raw = localStorage.getItem('mapahtrip_local_registrations');
      if (raw) {
        const list = JSON.parse(raw);
        const idx = list.findIndex((item: any) => String(item.id) === String(id));
        if (idx !== -1) {
          if (!list[idx].uploadedDocs) list[idx].uploadedDocs = {};
          list[idx].uploadedDocs[docKey] = {
            name: docName,
            base64: base64Data,
            sizeKB: finalSizeKB,
            ...(storageUrl ? { url: storageUrl } : {}),
          };
          if (docKey === 'foto') {
            list[idx].fotoBase64 = base64Data;
            list[idx].fotoSizeKB = finalSizeKB;
            if (storageUrl) list[idx].fotoUrl = storageUrl;
          }
          if (list[idx].berkas) {
            list[idx].berkas[docKey] = true;
          }
          localStorage.setItem('mapahtrip_local_registrations', JSON.stringify(list));
          window.dispatchEvent(new Event('storage'));
        }
      }
    } catch {}

    const numId = Number(id);
    if (isNaN(numId)) {
      // Jika id non-numerik (misal ID lokal / mock), penyimpanan lokal sudah berhasil
      return { success: true, url: storageUrl };
    }

    // 2. Ambil keterangan saat ini dari Supabase Cloud
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
    } else {
      parsed = { note: row?.keterangan || 'Update berkas pemohon' };
    }

    if (!parsed.uploadedDocs) parsed.uploadedDocs = {};
    parsed.uploadedDocs[docKey] = {
      name: docName,
      base64: base64Data,
      sizeKB: finalSizeKB,
      ...(storageUrl ? { url: storageUrl } : {}),
    };

    if (docKey === 'foto') {
      parsed.fotoBase64 = base64Data;
      parsed.compressedSizeKB = finalSizeKB;
      if (storageUrl) parsed.fotoUrl = storageUrl;
    }

    const updatedKet = JSON.stringify(parsed);

    // Pemetaan kolom database yang valid di tabel pengajuan_visa (snake_case)
    const validDbColumns: Record<string, string> = {
      formVisa: 'form_visa',
      ktp: 'ktp',
      ektln: 'ektln',
      coe: 'coe',
      foto: 'foto',
    };

    const updatePayload: Record<string, any> = {
      keterangan: updatedKet,
      updated_at: new Date().toISOString(),
    };

    if (validDbColumns[docKey]) {
      updatePayload[validDbColumns[docKey]] = true;
    }

    const { error: updateError } = await supabase
      .from('pengajuan_visa')
      .update(updatePayload)
      .eq('id', numId);

    if (updateError) {
      console.warn('Supabase update note warning:', updateError);
    }

    return { success: true, url: storageUrl };
  } catch (err) {
    console.warn('updatePengajuanDocumentInDB error:', err);
    return { success: false, url: undefined };
  }
}

/**
 * Hapus dokumen fisik dan record dokumen pemohon dari Database Supabase dan Storage
 */
export async function deletePengajuanDocumentInDB(
  id: string | number,
  docKey: string
): Promise<{ success: boolean; error?: any }> {
  try {
    // 1. Hapus file fisik dari Supabase Storage Bucket
    try {
      await removeOldApplicantDocFromStorage(id, docKey);
    } catch (e) {
      console.warn('Gagal menghapus file fisik di storage:', e);
    }

    // 2. Bersihkan dari local storage cache
    try {
      const raw = localStorage.getItem('mapahtrip_local_registrations');
      if (raw) {
        const list = JSON.parse(raw);
        const idx = list.findIndex((item: any) => String(item.id) === String(id));
        if (idx !== -1) {
          if (list[idx].uploadedDocs && list[idx].uploadedDocs[docKey]) {
            delete list[idx].uploadedDocs[docKey];
          }
          if (docKey === 'foto') {
            delete list[idx].fotoBase64;
            delete list[idx].fotoUrl;
          }
          if (list[idx].berkas) {
            list[idx].berkas[docKey] = false;
          }
          localStorage.setItem('mapahtrip_local_registrations', JSON.stringify(list));
          window.dispatchEvent(new Event('storage'));
        }
      }
    } catch {}

    const numId = Number(id);
    if (isNaN(numId)) {
      return { success: true };
    }

    // 3. Ambil data keterangan dari Supabase Cloud
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
    }

    if (parsed.uploadedDocs && parsed.uploadedDocs[docKey]) {
      delete parsed.uploadedDocs[docKey];
    }
    if (docKey === 'foto') {
      delete parsed.fotoBase64;
      delete parsed.fotoUrl;
    }

    const validDbColumns: Record<string, string> = {
      formVisa: 'form_visa',
      ktp: 'ktp',
      ektln: 'ektln',
      coe: 'coe',
      foto: 'foto',
    };

    const updatePayload: Record<string, any> = {
      keterangan: JSON.stringify(parsed),
      updated_at: new Date().toISOString(),
    };

    if (validDbColumns[docKey]) {
      updatePayload[validDbColumns[docKey]] = false;
    }

    const { error: updateError } = await supabase
      .from('pengajuan_visa')
      .update(updatePayload)
      .eq('id', numId);

    if (updateError) {
      console.warn('Supabase delete doc warning:', updateError);
    }

    return { success: true };
  } catch (err) {
    console.warn('deletePengajuanDocumentInDB error:', err);
    return { success: false, error: err };
  }
}

/**
 * Update data pembayaran pemohon (Status Lunas/Menunggu, Metode Transfer, Tgl Bayar, Bukti Bayar)
 */
export async function updatePengajuanPaymentInDB(
  id: string | number,
  paymentData: {
    statusPembayaran?: 'Lunas' | 'Menunggu Pembayaran';
    metodePembayaran?: string;
    tglBayarPemohon?: string;
    buktiBayarPemohon?: string;
    buktiBayarNama?: string;
    dibayarPemohon?: number;
    nominalKeluar?: number;
    cashback?: number;
    feeBersih?: number;
    staffFee?: number;
    referralFee?: number;
    staffPayoutStatus?: 'Berhasil Ditransfer' | 'Menunggu Transfer';
  }
) {
  try {
    // 1. Simpan ke local cache
    try {
      const raw = localStorage.getItem('mapahtrip_local_registrations');
      if (raw) {
        const list = JSON.parse(raw);
        const idx = list.findIndex((item: any) => String(item.id) === String(id));
        if (idx !== -1) {
          list[idx] = {
            ...list[idx],
            ...paymentData,
          };
          localStorage.setItem('mapahtrip_local_registrations', JSON.stringify(list));
          window.dispatchEvent(new Event('storage'));
        }
      }
    } catch {}

    const numId = Number(id);
    if (isNaN(numId)) return true;

    // 2. Simpan ke Supabase jika numeric id
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
    } else {
      parsed = { note: row?.keterangan || 'Update pembayaran pemohon' };
    }

    if (paymentData.statusPembayaran !== undefined) {
      parsed.statusPembayaran = paymentData.statusPembayaran;
    }
    if (paymentData.metodePembayaran !== undefined) {
      parsed.metodePembayaran = paymentData.metodePembayaran;
    }
    if (paymentData.tglBayarPemohon !== undefined) {
      parsed.tglBayarPemohon = paymentData.tglBayarPemohon;
    }
    if (paymentData.buktiBayarPemohon !== undefined) {
      parsed.buktiBayarPemohon = paymentData.buktiBayarPemohon;
    }
    if (paymentData.buktiBayarNama !== undefined) {
      parsed.buktiBayarNama = paymentData.buktiBayarNama;
    }
    if (paymentData.staffFee !== undefined) {
      parsed.staffFee = paymentData.staffFee;
    }
    if (paymentData.referralFee !== undefined) {
      parsed.referralFee = paymentData.referralFee;
    }
    if (paymentData.staffPayoutStatus !== undefined) {
      parsed.staffPayoutStatus = paymentData.staffPayoutStatus;
    }

    const payload: Record<string, any> = {
      keterangan: JSON.stringify(parsed),
      updated_at: new Date().toISOString(),
    };
    if (paymentData.statusPembayaran !== undefined) {
      payload.payment_status = paymentData.statusPembayaran === 'Lunas';
    }
    if (paymentData.dibayarPemohon !== undefined) {
      payload.nominal_dibayar = paymentData.dibayarPemohon;
    }
    if (paymentData.nominalKeluar !== undefined) {
      payload.nominal_keluar = paymentData.nominalKeluar;
    }
    if (paymentData.cashback !== undefined) {
      payload.cashback = paymentData.cashback;
    }
    if (paymentData.feeBersih !== undefined) {
      payload.fee_bersih = paymentData.feeBersih;
    }
    await supabase.from('pengajuan_visa').update(payload).eq('id', numId);
    return true;
  } catch (err) {
    console.warn('updatePengajuanPaymentInDB error:', err);
    return false;
  }
}

// ----------------------------------------------------
// OPERASI MITRA AFFILIATE DI SUPABASE CLOUD
// ----------------------------------------------------

export function mapDBToAffiliate(row: any): AffiliateUser {
  return {
    id: String(row.id),
    nama: row.nama || '',
    email: row.email || '',
    noWa: row.no_wa || '',
    affiliateCode: row.kode_referral || '',
    password: row.password || '',
    createdAt: row.created_at || new Date().toISOString(),
    statusMitra: row.status_mitra || '',
    lembaga: row.lembaga_lpk || '',
    alamat: row.alamat || '',
    provinsi: row.provinsi || '',
    jenisIdentitas: 'KTP (Kartu Tanda Penduduk)',
    nomorIdentitas: row.no_ktp || '',
    akunIg: row.akun_ig || '',
    followerIg: row.follower_ig || '',
    namaBank: row.nama_bank || '',
    nomorRekening: row.nomor_rekening || '',
    atasNamaRekening: row.atas_nama || '',
    isProfileComplete: Boolean(row.is_profile_complete),
  };
}

export async function fetchAllMitraFromDB(): Promise<AffiliateUser[]> {
  try {
    const { data, error } = await supabase
      .from('mitra_affiliate')
      .select('*')
      .order('id', { ascending: false });

    if (error || !data) {
      console.warn('Gagal memuat data mitra affiliate dari Supabase:', error);
      return [];
    }
    return data
      .filter((row: any) =>
        row.status_mitra !== 'Deleted' &&
        !row.kode_referral?.startsWith('DEL_') &&
        !row.kode_referral?.includes('STRESS') &&
        !row.nama?.toLowerCase().includes('deleted test') &&
        !row.nama?.toLowerCase().includes('(mitra ')
      )
      .map(mapDBToAffiliate);
  } catch (err) {
    console.warn('DB error fetchAllMitra:', err);
    return [];
  }
}

export async function registerMitraInDB(payload: {
  nama: string;
  email: string;
  password: string;
}): Promise<{ user: AffiliateUser | null; error?: string }> {
  try {
    const emailClean = payload.email.trim().toLowerCase();

    // Cek apakah email sudah terdaftar
    const { data: existing } = await supabase
      .from('mitra_affiliate')
      .select('id, email')
      .ilike('email', emailClean)
      .maybeSingle();

    if (existing) {
      return { user: null, error: 'Email sudah terdaftar. Silakan login atau gunakan email lain.' };
    }

    const { data, error } = await supabase
      .from('mitra_affiliate')
      .insert([
        {
          nama: payload.nama.trim(),
          email: emailClean,
          password: payload.password,
          is_profile_complete: false,
        },
      ])
      .select()
      .single();

    if (error || !data) {
      return { user: null, error: error?.message || 'Gagal menyimpan pendaftaran akun mitra.' };
    }

    return { user: mapDBToAffiliate(data) };
  } catch (err: any) {
    return { user: null, error: err?.message || 'Terjadi kesalahan sistem saat mendaftar.' };
  }
}

export async function loginMitraFromDB(
  emailOrCode: string,
  passwordInput: string
): Promise<{ user: AffiliateUser | null; error?: string }> {
  try {
    const clean = emailOrCode.trim();

    // Cari berdasarkan email ATAU kode referral
    const { data, error } = await supabase
      .from('mitra_affiliate')
      .select('*')
      .or(`email.ilike.${clean},kode_referral.ilike.${clean}`)
      .maybeSingle();

    if (error || !data) {
      return { user: null, error: 'Akun mitra tidak ditemukan. Silakan periksa kembali email atau kode Anda.' };
    }

    if (data.password !== passwordInput) {
      return { user: null, error: 'Kata sandi tidak sesuai. Silakan coba lagi.' };
    }

    return { user: mapDBToAffiliate(data) };
  } catch (err: any) {
    return { user: null, error: err?.message || 'Terjadi kesalahan saat masuk ke akun mitra.' };
  }
}

export async function updateMitraProfileInDB(
  userId: string | number,
  profileData: {
    nama: string;
    no_wa: string;
    status_mitra: string;
    lembaga_lpk?: string;
    no_ktp: string;
    alamat: string;
    provinsi: string;
    akun_ig?: string;
    follower_ig?: string;
    kode_referral: string;
  }
): Promise<{ user: AffiliateUser | null; error?: string }> {
  try {
    const updatePayload: Record<string, any> = {
      nama: profileData.nama,
      no_wa: profileData.no_wa,
      status_mitra: profileData.status_mitra,
      lembaga_lpk: profileData.lembaga_lpk || '-',
      no_ktp: profileData.no_ktp,
      alamat: profileData.alamat,
      provinsi: profileData.provinsi,
      akun_ig: profileData.akun_ig || '-',
      follower_ig: profileData.follower_ig || '-',
      kode_referral: profileData.kode_referral,
      is_profile_complete: true,
      updated_at: new Date().toISOString(),
    };

    let query = supabase.from('mitra_affiliate').update(updatePayload);

    // Cek apakah userId berupa numeric ID atau string
    if (!isNaN(Number(userId))) {
      query = query.eq('id', Number(userId));
    } else {
      // Jika string (misal akun demo/migrasi), cocokkan berdasarkan nama/kode
      query = query.eq('kode_referral', profileData.kode_referral);
    }

    const { data, error } = await query.select().maybeSingle();

    if (error) {
      return { user: null, error: error.message };
    }

    return { user: data ? mapDBToAffiliate(data) : null };
  } catch (err: any) {
    return { user: null, error: err?.message || 'Gagal menyimpan profil identitas ke Supabase.' };
  }
}

export async function updateMitraBankInDB(
  userIdOrCode: string | number,
  bankData: {
    jenis_pencairan?: string;
    nama_bank: string;
    nomor_rekening: string;
    atas_nama: string;
    kode_referral?: string;
    nama?: string;
    email?: string;
    no_wa?: string;
    lembaga?: string;
    status_mitra?: string;
  }
): Promise<{ user: AffiliateUser | null; error?: string }> {
  try {
    const updatePayload: Record<string, any> = {
      jenis_pencairan: bankData.jenis_pencairan || 'Rekening Bank',
      nama_bank: bankData.nama_bank.trim(),
      nomor_rekening: bankData.nomor_rekening.trim(),
      atas_nama: bankData.atas_nama.trim(),
      updated_at: new Date().toISOString(),
    };
    if (bankData.no_wa !== undefined) {
      updatePayload.no_wa = bankData.no_wa.trim();
    }

    const isNumericId = typeof userIdOrCode === 'number' || (!isNaN(Number(userIdOrCode)) && Number(userIdOrCode) > 0 && !String(userIdOrCode).startsWith('MPH') && !String(userIdOrCode).startsWith('aff_'));

    let query = supabase.from('mitra_affiliate').update(updatePayload);

    if (isNumericId) {
      query = query.eq('id', Number(userIdOrCode));
    } else {
      const codeOrId = (bankData.kode_referral || String(userIdOrCode)).replace(/^aff_/, '').trim();
      query = query.ilike('kode_referral', codeOrId);
    }

    const { data, error } = await query.select().maybeSingle();

    if (error) {
      console.warn('Update mitra bank warning in Supabase:', error.message);
    }

    if (data) {
      return { user: mapDBToAffiliate(data) };
    }

    // Jika belum ada row di Supabase (misal baseline spreadsheet), coba insert data mitra baru dengan info rekening
    const code = (bankData.kode_referral || String(userIdOrCode)).replace(/^aff_/, '').trim().toUpperCase();
    if (bankData.nama || code) {
      const insertPayload: Record<string, any> = {
        kode_referral: code,
        nama: bankData.nama || code,
        email: bankData.email || `${code.toLowerCase()}@mapahtrip.id`,
        no_wa: bankData.no_wa || '',
        status_mitra: bankData.status_mitra || 'Umum',
        lembaga_lpk: bankData.lembaga || '',
        nama_bank: bankData.nama_bank.trim(),
        nomor_rekening: bankData.nomor_rekening.trim(),
        atas_nama: bankData.atas_nama.trim(),
        jenis_pencairan: bankData.jenis_pencairan || 'Rekening Bank',
        is_profile_complete: true,
      };

      const { data: inserted, error: insertError } = await supabase
        .from('mitra_affiliate')
        .insert([insertPayload])
        .select()
        .maybeSingle();

      if (!insertError && inserted) {
        return { user: mapDBToAffiliate(inserted) };
      }
    }

    return { user: null };
  } catch (err: any) {
    console.warn('DB error updateMitraBank:', err);
    return { user: null, error: err?.message || 'Gagal memperbarui rekening ke Supabase.' };
  }
}

export async function updateMitraWaInDB(
  userIdOrCode: string | number,
  noWa: string,
  extra?: { nama?: string; email?: string; kode_referral?: string; lembaga?: string; status_mitra?: string }
): Promise<{ user: AffiliateUser | null; error?: string }> {
  try {
    const cleanWa = noWa.trim();
    const updatePayload: Record<string, any> = {
      no_wa: cleanWa,
      updated_at: new Date().toISOString(),
    };

    const isNumericId = typeof userIdOrCode === 'number' || (!isNaN(Number(userIdOrCode)) && Number(userIdOrCode) > 0 && !String(userIdOrCode).startsWith('MPH') && !String(userIdOrCode).startsWith('aff_'));

    let query = supabase.from('mitra_affiliate').update(updatePayload);

    if (isNumericId) {
      query = query.eq('id', Number(userIdOrCode));
    } else {
      const codeOrId = (extra?.kode_referral || String(userIdOrCode)).replace(/^aff_/, '').trim();
      query = query.ilike('kode_referral', codeOrId);
    }

    const { data, error } = await query.select().maybeSingle();

    if (error) {
      console.warn('Update mitra WA warning in Supabase:', error.message);
    }

    if (data) {
      return { user: mapDBToAffiliate(data) };
    }

    // Jika belum ada row di Supabase (misal baseline spreadsheet lama), insert baris baru
    const code = (extra?.kode_referral || String(userIdOrCode)).replace(/^aff_/, '').trim().toUpperCase();
    if (code || extra?.nama) {
      const insertPayload: Record<string, any> = {
        kode_referral: code,
        nama: extra?.nama || code,
        email: extra?.email || `${code.toLowerCase()}@mapahtrip.id`,
        no_wa: cleanWa,
        status_mitra: extra?.status_mitra || 'Umum',
        lembaga_lpk: extra?.lembaga || '',
        is_profile_complete: true,
      };

      const { data: inserted, error: insertError } = await supabase
        .from('mitra_affiliate')
        .insert([insertPayload])
        .select()
        .maybeSingle();

      if (!insertError && inserted) {
        return { user: mapDBToAffiliate(inserted) };
      }
    }

    return { user: null };
  } catch (err: any) {
    console.warn('DB error updateMitraWa:', err);
    return { user: null, error: err?.message || 'Gagal memperbarui nomor WA ke Supabase.' };
  }
}

/**
 * Cari data Mitra Affiliate berdasarkan kode referral (baik dari Spreadsheet, LocalStorage, maupun Supabase Cloud)
 */
export async function findAffiliateByCode(code: string): Promise<AffiliateUser | null> {
  const clean = (code || '').trim().toUpperCase();
  if (!clean || clean === 'MAPAHTRIP') return null;

  // Helper untuk menerapkan override lokal (nomor WA atau Bank yang baru saja diedit admin di browser)
  const applyOverrides = (user: AffiliateUser): AffiliateUser => {
    try {
      const waRaw = localStorage.getItem('mapahtrip_mitra_wa_overrides');
      if (waRaw) {
        const waOverrides = JSON.parse(waRaw);
        if (waOverrides[clean]) {
          user.noWa = waOverrides[clean];
        }
      }
      const bankRaw = localStorage.getItem('mapahtrip_mitra_bank_overrides');
      if (bankRaw) {
        const bankOverrides = JSON.parse(bankRaw);
        if (bankOverrides[clean]) {
          user.namaBank = bankOverrides[clean].namaBank;
          user.nomorRekening = bankOverrides[clean].nomorRekening;
          user.atasNamaRekening = bankOverrides[clean].atasNamaRekening;
        }
      }
    } catch {}
    return user;
  };

  // 1. Cek dari Supabase Cloud (tabel mitra_affiliate) TERLEBIH DAHULU agar nomor WA terbaru yang digunakan
  try {
    const { data } = await supabase
      .from('mitra_affiliate')
      .select('*')
      .ilike('kode_referral', clean)
      .maybeSingle();

    if (data && data.status_mitra !== 'Deleted' && !data.kode_referral?.startsWith('DEL_')) {
      return applyOverrides(mapDBToAffiliate(data));
    }
  } catch (err) {
    console.warn('DB error findAffiliateByCode:', err);
  }

  // 2. Cek dari localStorage (jika ada mitra terupdate di browser)
  try {
    const allRaw = localStorage.getItem('mapahtrip_all_affiliates');
    if (allRaw) {
      const list: AffiliateUser[] = JSON.parse(allRaw);
      const found = list.find((a) => (a.affiliateCode || '').trim().toUpperCase() === clean);
      if (found) return applyOverrides({ ...found });
    }
    const rawLocal = localStorage.getItem('mapahtrip_local_affiliates');
    if (rawLocal) {
      const list: AffiliateUser[] = JSON.parse(rawLocal);
      const found = list.find((a) => (a.affiliateCode || '').trim().toUpperCase() === clean);
      if (found) return applyOverrides({ ...found });
    }
  } catch {}

  // 3. Fallback ke REAL_SPREADSHEET_AFFILIATES jika belum ada di cloud
  const fromSpreadsheet = REAL_SPREADSHEET_AFFILIATES.find(
    (a) => (a.affiliateCode || '').trim().toUpperCase() === clean
  );
  if (fromSpreadsheet) {
    return applyOverrides({ ...fromSpreadsheet });
  }

  return null;
}

/**
 * Simpan bukti transfer dan status payout (mitra referral / staf PIC) ke Supabase Cloud
 */
export async function updatePayoutInDB(
  id: string | number,
  payoutData: {
    isStaff: boolean;
    status: 'Berhasil Ditransfer' | 'Belum Ditransfer';
    tanggal: string;
    noRef: string;
    buktiUrl?: string;
    by?: string;
    catatan?: string;
    nominal?: number;
  }
): Promise<boolean> {
  try {
    const numId = Number(id);
    if (isNaN(numId)) return true;

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
    } else {
      parsed = { note: row?.keterangan || 'Update payout komisi / fee' };
    }

    if (payoutData.isStaff) {
      parsed.staffPayoutStatus = payoutData.status;
      parsed.staffPayoutTanggal = payoutData.tanggal;
      parsed.staffPayoutNoRef = payoutData.noRef;
      if (payoutData.buktiUrl) {
        parsed.staffPayoutBuktiUrl = payoutData.buktiUrl;
      } else {
        delete parsed.staffPayoutBuktiUrl;
      }
      parsed.staffPayoutBy = payoutData.by || 'Owner MapahTrip';
      if (payoutData.catatan !== undefined) parsed.staffPayoutCatatan = payoutData.catatan;
      if (payoutData.nominal !== undefined) parsed.staffFee = payoutData.nominal;
    } else {
      parsed.payoutStatus = payoutData.status;
      parsed.payoutTanggal = payoutData.tanggal;
      parsed.payoutNoRef = payoutData.noRef;
      if (payoutData.buktiUrl) {
        parsed.payoutBuktiUrl = payoutData.buktiUrl;
      } else {
        delete parsed.payoutBuktiUrl;
      }
      parsed.payoutBy = payoutData.by || 'Owner MapahTrip';
      if (payoutData.catatan !== undefined) parsed.payoutCatatan = payoutData.catatan;
      if (payoutData.nominal !== undefined) parsed.referralFee = payoutData.nominal;
    }

    await supabase
      .from('pengajuan_visa')
      .update({
        keterangan: JSON.stringify(parsed),
        updated_at: new Date().toISOString(),
      })
      .eq('id', numId);

    return true;
  } catch (err) {
    console.warn('Gagal sync payout ke Supabase:', err);
    return false;
  }
}

export async function syncMasterStaffToCloud(staffList: any[]): Promise<boolean> {
  try {
    const jsonStr = JSON.stringify(staffList, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const { error } = await supabase.storage
      .from('mapahtrip-storage')
      .upload('_system/master_konsjen_staf.json', blob, { upsert: true, contentType: 'application/json' });
    if (error) {
      console.warn('Gagal sinkron staf ke Supabase Storage:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Error syncMasterStaffToCloud:', err);
    return false;
  }
}

export async function fetchMasterStaffFromCloud(): Promise<any[] | null> {
  try {
    // 1. Coba download via public URL dengan timestamp cache buster agar selalu up-to-date
    const publicUrl = `https://vswmndovcmchqhyzlawo.supabase.co/storage/v1/object/public/mapahtrip-storage/_system/master_konsjen_staf.json?t=${Date.now()}`;
    const res = await fetch(publicUrl);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }

    // 2. Fallback via Supabase SDK download
    const { data, error } = await supabase.storage
      .from('mapahtrip-storage')
      .download('_system/master_konsjen_staf.json');
    if (error || !data) return null;
    const text = await data.text();
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return null;
  } catch {
    return null;
  }
}



