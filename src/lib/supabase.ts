import { createClient } from '@supabase/supabase-js';
import type { Pengajuan, StatusPengajuan, KonsjenKota, StaffName, PaketVisa } from '../types';

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
  let mappedStatus: StatusPengajuan = 'Selesai';
  const st = (db.status || '').toLowerCase();
  if (st.includes('sampai') || st.includes('baru')) mappedStatus = 'Menunggu Verifikasi';
  else if (st.includes('proses')) mappedStatus = 'Sedang Diproses';
  else if (st.includes('hari ini')) mappedStatus = 'Apply Hari Ini';
  else if (st.includes('ambil') || st.includes('kirim')) mappedStatus = 'Siap Ambil';
  else if (st.includes('cancel') || st.includes('reject') || st.includes('tidak respon')) mappedStatus = 'Ditolak';

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
    tglBerkasMasuk: db.tgl_sampai || '15/06/2026',
    tglApply: db.tgl_proses || '16/06/2026',
    tglEstimasiSelesai: db.tgl_selesai || '23/06/2026',
    tglSelesai: db.tgl_selesai || undefined,
    status: mappedStatus,
    noResi: db.resi_pengiriman || undefined,
    affiliateCode: db.code_referral || 'MAPAHTRIP',
    dibayarPemohon: Number(db.nominal_dibayar) || 1650000,
    nominalKeluar: Number(db.nominal_keluar) || 1135000,
    cashback: Number(db.cashback) || 150000,
    feeBersih: Number(db.fee_bersih) || 365000,
    referralFee: Number(db.cashback) || 150000,
    berkas: {
      formVisa: db.form_visa ?? true,
      ktp: db.ktp ?? true,
      ektln: db.ektln ?? true,
      coe: db.coe ?? true,
      foto: db.foto ?? true,
      pasporFisik: true,
    },
    catatan: db.keterangan || (db.jadwal_terbang ? `Flight: ${db.jadwal_terbang}` : undefined),
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
  const { data, error } = await supabase
    .from('pengajuan_visa')
    .select('*')
    .or(`no_paspor.ilike.%${clean}%,nama.ilike.%${clean}%`)
    .limit(1)
    .single();

  if (error || !data) return null;
  return mapDBToPengajuan(data);
}
