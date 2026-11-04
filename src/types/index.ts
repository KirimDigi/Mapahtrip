export type StatusPengajuan =
  | 'Menunggu Verifikasi'
  | 'Sedang Diproses'
  | 'Apply Hari Ini'
  | 'Siap Ambil'
  | 'Selesai'
  | 'Ditolak';

export type KonsjenKota = 'Jakarta' | 'Surabaya' | 'Denpasar' | 'Medan' | 'Makassar';

export type StaffName =
  | 'Rizky'
  | 'Rizky Muhammad'
  | 'Nanami Kay'
  | 'Yulia'
  | 'Heru'
  | 'Latifah'
  | 'Ulla';

export type PaketVisa = 'Reguler' | 'Premium' | 'TAC';

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
  tglKirim?: string;
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
  alasanPenolakan?: string;
  fotoBase64?: string;
  fotoSizeKB?: number;
  uploadedDocs?: Record<string, { name: string; base64: string; sizeKB?: number }>;
  statusPembayaran?: 'Lunas' | 'Menunggu Pembayaran';
  metodePembayaran?: string;
  tglBayarPemohon?: string;
  buktiBayarPemohon?: string;
  buktiBayarNama?: string;
  accessKey?: string;
  payoutStatus?: 'Belum Ditransfer' | 'Berhasil Ditransfer';
  payoutTanggal?: string;
  payoutNoRef?: string;
  payoutBuktiUrl?: string;
  payoutBy?: string;
  payoutCatatan?: string;
}

export interface AffiliatePayout {
  id: string;
  pengajuanId: string;
  noPengajuan: string;
  namaPemohon: string;
  affiliateCode: string;
  mitraNama: string;
  mitraBank: string;
  mitraRekening: string;
  mitraAtasNama: string;
  nominal: number;
  tanggalTransfer: string;
  waktuTransfer: string;
  noRef: string;
  buktiTransferUrl?: string;
  catatanOwner?: string;
  status: 'Berhasil Ditransfer';
  transferredBy: string;
}

export interface KonsjenMaster {
  id: string;
  kota: KonsjenKota;
  lokasi: string;
  staffPicDefault: StaffName;
  biayaKonsulat: number;
  estimasiHariKerja: number;
  statusOnline: boolean;
  totalApply?: number;
  totalSelesai?: number;
}

export interface StaffMaster {
  id: string;
  nama: string;
  inisial: string;
  username?: string;
  email?: string;
  noWa?: string;
  pin?: string;
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
  totalBonus?: number;
}

export interface StaffFeedback {
  id: string;
  namaStaf: string;
  roleStaf: string;
  kategori?: 'Fitur Baru' | 'Kendala / Bug' | 'Alur Kerja JVAC' | 'Tampilan / UI' | 'Lainnya';
  judul?: string;
  pesan: string;
  tanggal: string;
  status: 'Baru' | 'Diproses' | 'Selesai';
  balasanOwner?: string;
  likes?: number;
  avatarUrl?: string;
}
