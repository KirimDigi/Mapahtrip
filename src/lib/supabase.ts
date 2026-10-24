import { createClient } from '@supabase/supabase-js';
import type { Pengajuan, StatusPengajuan, KonsjenKota, StaffName, PaketVisa, AffiliateUser } from '../types';

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

  let staff: StaffName = 'Rizky Muhammad';
  const s = (db.staff_pic || '').toLowerCase();
  if (s.includes('nanami')) staff = 'Nanami Kay';
  else if (s.includes('yulia')) staff = 'Yulia';
  else if (s.includes('heru')) staff = 'Heru';
  else if (s.includes('latifah')) staff = 'Latifah';
  else if (s.includes('ulla')) staff = 'Ulla';

  const paspor = db.no_paspor || `E${6000000 + db.id}`;
  const masked = paspor.length > 4 ? `${paspor.slice(0, 3)}***${paspor.slice(-2)}` : paspor;

  let noteText = db.keterangan || (db.jadwal_terbang ? `Flight: ${db.jadwal_terbang}` : undefined);
  let fotoData: string | undefined = undefined;
  let fotoSize: number | undefined = undefined;
  try {
    if (db.keterangan && db.keterangan.startsWith('{') && db.keterangan.endsWith('}')) {
      const parsed = JSON.parse(db.keterangan);
      if (parsed.note) noteText = parsed.note;
      if (parsed.fotoBase64) fotoData = parsed.fotoBase64;
      if (parsed.compressedSizeKB) fotoSize = parsed.compressedSizeKB;
    }
  } catch {}

  return {
    id: String(db.id),
    noPengajuan: `MT-${String(db.no_urut || db.id).padStart(4, '0')}`,
    namaPemohon: db.nama,
    noPaspor: paspor,
    maskedPaspor: masked,
    noTelp: db.no_wa || '',
    konsjen: kons,
    staffPic: staff,
    program: db.program || 'Tokutei Ginou',
    paket: (db.paket as PaketVisa) || 'Reguler',
    tglBerkasMasuk: db.tgl_sampai || '',
    tglApply: db.tgl_proses || '',
    tglEstimasiSelesai: db.tgl_selesai || '',
    tglSelesai: db.tgl_selesai || undefined,
    tglKirim: db.tgl_kirim || undefined,
    status: mappedStatus,
    noResi: db.resi_pengiriman || undefined,
    affiliateCode: db.code_referral || 'MAPAHTRIP',
    dibayarPemohon: Number(db.nominal_dibayar) || 1650000,
    nominalKeluar: Number(db.nominal_keluar) || 1135000,
    cashback: Number(db.cashback) || 100000,
    feeBersih: Number(db.fee_bersih) || 415000,
    referralFee: Number(db.cashback) || 100000,
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
  };
}

export async function fetchAllPengajuanFromDB(): Promise<Pengajuan[]> {
  const { data, error } = await supabase
    .from('pengajuan_visa')
    .select('*')
    .order('id', { ascending: true });

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
}) {
  try {
    let ketString = payload.keterangan || 'Pendaftaran mandiri via Website Mapahtrip.id';
    if (payload.foto_base64) {
      ketString = JSON.stringify({
        note: payload.keterangan || 'Pendaftaran mandiri via Website Mapahtrip.id',
        fotoBase64: payload.foto_base64,
        originalSizeKB: payload.original_size_kb,
        compressedSizeKB: payload.compressed_size_kb,
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
          status: 'Menunggu Verifikasi',
          keterangan: ketString,
          tgl_sampai: new Date().toLocaleDateString('id-ID'),
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

