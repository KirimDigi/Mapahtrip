export type StatusPengajuan =
  | 'Menunggu Verifikasi'
  | 'Sedang Diproses'
  | 'Apply Hari Ini'
  | 'Siap Ambil'
  | 'Selesai'
  | 'Ditolak';

export type KonsjenKota = 'Jakarta' | 'Surabaya' | 'Denpasar' | 'Medan' | 'Makassar';

export type StaffName =
  | 'Rizky Muhammad'
  | 'Nanami Kay'
  | 'Yulia'
  | 'Heru'
  | 'Latifah'
  | 'Ulla';

export type PaketVisa = 'Reguler' | 'Premium' | 'TAC' | 'Express' | 'VIP';

export interface BerkasChecklist {
  formVisa: boolean;
  ktp: boolean;
  ektln: boolean;
  coe: boolean;
  foto: boolean;
  pasporFisik: boolean;
}

export interface Pengajuan {
  id: string;
  noPengajuan: string;
  namaPemohon: string;
  noPaspor: string;
  maskedPaspor: string;
  noTelp: string;
  konsjen: KonsjenKota;
  staffPic: StaffName;
  program: string;
  paket: PaketVisa;
  tglBerkasMasuk: string;
  tglApply: string;
  tglEstimasiSelesai: string;
  tglSelesai?: string;
  status: StatusPengajuan;
  noResi?: string;
  affiliateCode?: string;
  dibayarPemohon: number;
  nominalKeluar: number;
  cashback: number;
  feeBersih: number;
  referralFee: number;
  berkas: BerkasChecklist;
  catatan?: string;
}

export interface KonsjenMaster {
  id: string;
  kota: KonsjenKota;
  lokasi: string;
  staffPicDefault: StaffName;
  biayaKonsulat: number;
  estimasiHariKerja: number;
  statusOnline: boolean;
}

export interface StaffMaster {
  id: string;
  nama: StaffName;
  inisial: string;
  konsjenTugas: KonsjenKota[];
  role: string;
  avatarUrl?: string;
  aktif: boolean;
}

export interface AffiliateMaster {
  code: string;
  namaAffiliate: string;
  jumlahPemohon: number;
  totalKomisi: number;
  status: 'Aktif' | 'Nonaktif';
}

export interface AffiliateUser {
  id: string;
  nama: string;
  email: string;
  noWa?: string;
  affiliateCode: string;
  kategori?: string;
  password?: string;
  createdAt: string;
  statusMitra?: string;
  lembaga?: string;
  alamat?: string;
  provinsi?: string;
  jenisIdentitas?: string;
  nomorIdentitas?: string;
  akunIg?: string;
  followerIg?: string;
  namaBank?: string;
  nomorRekening?: string;
  atasNamaRekening?: string;
  fotoDiri?: string;
  isProfileComplete?: boolean;
}
