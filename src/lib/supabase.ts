import { createClient } from '@supabase/supabase-js';
import type { Pengajuan, StatusPengajuan, KonsjenKota, StaffName, PaketVisa, AffiliateUser } from '../types';
import { REAL_SPREADSHEET_PENGAJUAN } from '../data/spreadsheetData';

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

  let kons: KonsjenKota = 'Jakarta';
  const k = (db.konsjen || '').toLowerCase();
  if (k.includes('surabaya')) kons = 'Surabaya';
  else if (k.includes('denpasar') || k.includes('bali')) kons = 'Denpasar';
  else if (k.includes('medan')) kons = 'Medan';
  else if (k.includes('makassar')) kons = 'Makassar';

  let staff: StaffName = 'Rizky';
  const s = (db.staff_pic || '').toLowerCase();
  if (s.includes('nanami')) staff = 'Nanami Kay';
  else if (s.includes('yulia')) staff = 'Yulia';
  else if (s.includes('heru')) staff = 'Heru';
  else if (s.includes('latifah')) staff = 'Latifah';
  else if (s.includes('ulla')) staff = 'Ulla';
  else if (s.includes('rizky')) staff = 'Rizky';
  else {
    if (kons === 'Surabaya') staff = 'Nanami Kay';
    else if (kons === 'Denpasar') staff = 'Yulia';
    else if (kons === 'Medan') staff = 'Heru';
    else if (kons === 'Makassar') staff = 'Latifah';
    else staff = 'Rizky';
  }

  const paspor = db.no_paspor || `E${6000000 + db.id}`;
  const masked = paspor.length > 4 ? `${paspor.slice(0, 3)}***${paspor.slice(-2)}` : paspor;

  let noteText = db.keterangan || (db.jadwal_terbang ? `Flight: ${db.jadwal_terbang}` : undefined);
  let fotoData: string | undefined = undefined;
  let fotoSize: number | undefined = undefined;
  let uploadedDocsData: Record<string, { name: string; base64: string; sizeKB?: number }> | undefined = undefined;

  try {
    if (db.keterangan && db.keterangan.startsWith('{') && db.keterangan.endsWith('}')) {
      const parsed = JSON.parse(db.keterangan);
      if (parsed.note) noteText = parsed.note;
      if (parsed.fotoBase64) fotoData = parsed.fotoBase64;
      if (parsed.compressedSizeKB) fotoSize = parsed.compressedSizeKB;
      if (parsed.uploadedDocs) uploadedDocsData = parsed.uploadedDocs;
      else if (parsed.documents) uploadedDocsData = parsed.documents;
    }
  } catch {}

  const found = REAL_SPREADSHEET_PENGAJUAN.find(
    (p) => p.id === String(db.id) || p.noPengajuan === `MT-${String(db.no_urut || db.id).padStart(4, '0')}`
  );

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
  const rawTglApply = normalizeDate(db.tgl_proses) || (found ? normalizeDate(found.tglApply) : rawTglMasuk);
  const rawTglSelesai = normalizeDate(db.tgl_selesai) || (found ? normalizeDate(found.tglSelesai || found.tglEstimasiSelesai) : '');
  const rawTglKirim = normalizeDate(db.tgl_kirim) || (found ? normalizeDate(found.tglKirim) : '');

  const dibayar = Number(db.nominal_dibayar) || found?.dibayarPemohon || 1650000;
  const keluar = Number(db.nominal_keluar) || found?.nominalKeluar || 1135000;
  const cb = Number(db.cashback) !== undefined && !isNaN(Number(db.cashback)) && Number(db.cashback) > 0 ? Number(db.cashback) : (found?.cashback ?? 100000);
  const ref = found ? (found.referralFee ?? 0) : 0;
  const fee = Number(db.fee_bersih) || found?.feeBersih || (dibayar - keluar - cb - ref);

  return {
    id: String(db.id),
    noPengajuan: `MT-${String(db.no_urut || db.id).padStart(4, '0')}`,
    namaPemohon: db.nama,
    noPaspor: paspor,
    maskedPaspor: masked,
    noTelp: db.no_wa || found?.noTelp || '',
    konsjen: kons,
    staffPic: staff,
    program: db.program || found?.program || 'Tokutei Ginou',
    paket: (db.paket as PaketVisa) || found?.paket || 'Reguler',
    tglBerkasMasuk: rawTglMasuk,
    tglApply: rawTglApply,
    tglEstimasiSelesai: rawTglSelesai,
    tglSelesai: rawTglSelesai || undefined,
    tglKirim: rawTglKirim || undefined,
    status: mappedStatus,
    noResi: db.resi_pengiriman || found?.noResi || undefined,
    affiliateCode: (() => {
      const c = (db.code_referral || '').trim();
      if (!c || /^\d+$/.test(c)) {
        return found?.affiliateCode || 'MAPAHTRIP';
      }
      return c;
    })(),
    dibayarPemohon: dibayar,
    nominalKeluar: keluar,
    cashback: cb,
    feeBersih: fee,
    referralFee: ref,
    berkas: {
      formVisa: db.form_visa ?? true,
      ktp: db.ktp ?? true,
      ektln: db.ektln ?? true,
      coe: db.coe ?? true,
      foto: db.foto ?? true,
      pasporFisik: true,
    },
    catatan: noteText,
    fotoBase64: fotoData,
    fotoSizeKB: fotoSize,
    uploadedDocs: uploadedDocsData,
    statusPembayaran: (db as any).status_pembayaran || 'Lunas',
    metodePembayaran: (db as any).metode_pembayaran || 'Transfer BCA',
    tglBayarPemohon: (db as any).tgl_bayar_pemohon || rawTglMasuk || '',
    buktiBayarPemohon: (db as any).bukti_bayar_pemohon || (found as any)?.buktiBayarPemohon || undefined,
    buktiBayarNama: (db as any).bukti_bayar_nama || undefined,
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
  keterangan?: string;
  foto_base64?: string;
  original_size_kb?: number;
  compressed_size_kb?: number;
  uploaded_docs?: Record<string, { name: string; base64: string; sizeKB?: number }>;
}) {
  try {
    let ketString = payload.keterangan || 'Pendaftaran mandiri via Website Mapahtrip.id';
    const fotoFinal = payload.foto_base64 || payload.uploaded_docs?.foto?.base64;
    if (fotoFinal || payload.uploaded_docs) {
      ketString = JSON.stringify({
        note: payload.keterangan || 'Pendaftaran mandiri via Website Mapahtrip.id',
        fotoBase64: fotoFinal,
        originalSizeKB: payload.original_size_kb,
        compressedSizeKB: payload.compressed_size_kb,
        uploadedDocs: payload.uploaded_docs || {},
        uploadedAt: new Date().toISOString(),
      });
    }

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
          konsjen: payload.konsjen || 'Jakarta',
          staff_pic:
            payload.konsjen === 'Surabaya'
              ? 'Nanami Kay'
              : payload.konsjen === 'Denpasar'
              ? 'Yulia'
              : payload.konsjen === 'Medan'
              ? 'Heru'
              : payload.konsjen === 'Makassar'
              ? 'Latifah'
              : 'Rizky',
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
          };
          if (docKey === 'foto') {
            list[idx].fotoBase64 = base64Data;
            list[idx].fotoSizeKB = finalSizeKB;
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
      return true;
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
    };

    if (docKey === 'foto') {
      parsed.fotoBase64 = base64Data;
      parsed.compressedSizeKB = finalSizeKB;
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

    return true;
  } catch (err) {
    console.warn('updatePengajuanDocumentInDB error:', err);
    return false;
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
    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (paymentData.dibayarPemohon !== undefined) {
      payload.nominal_dibayar = paymentData.dibayarPemohon;
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
    return data.map(mapDBToAffiliate);
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
  userId: string | number,
  bankData: {
    jenis_pencairan?: string;
    nama_bank: string;
    nomor_rekening: string;
    atas_nama: string;
  }
): Promise<{ user: AffiliateUser | null; error?: string }> {
  try {
    const updatePayload: Record<string, any> = {
      jenis_pencairan: bankData.jenis_pencairan || 'Rekening Bank',
      nama_bank: bankData.nama_bank,
      nomor_rekening: bankData.nomor_rekening,
      atas_nama: bankData.atas_nama,
      updated_at: new Date().toISOString(),
    };

    let query = supabase.from('mitra_affiliate').update(updatePayload);

    if (!isNaN(Number(userId))) {
      query = query.eq('id', Number(userId));
    } else {
      return { user: null, error: 'ID mitra tidak valid untuk pembaruan rekening.' };
    }

    const { data, error } = await query.select().maybeSingle();

    if (error) {
      return { user: null, error: error.message };
    }

    return { user: data ? mapDBToAffiliate(data) : null };
  } catch (err: any) {
    return { user: null, error: err?.message || 'Gagal memperbarui rekening ke Supabase.' };
  }
}

