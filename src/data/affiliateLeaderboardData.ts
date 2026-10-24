// Data Real Mitra Affiliate MapahTrip dari Google Spreadsheet Resmi:
// https://docs.google.com/spreadsheets/d/1uyaDO8y9rZ120-ird0VJXfetrEFaaURzclxCcGQxw50

export interface RealAffiliateItem {
  rank: number;
  code: string;
  nama: string;
  nominal: number;
  totalVisaApproved: number;
  kategori: 'Individu' | 'LPK' | 'Biro Travel' | 'Staff' | 'Komunitas';
  isStaff: boolean;
  statusBadge: string;
}

export const REAL_AFFILIATE_LEADERBOARD: RealAffiliateItem[] = [
  {
    rank: 1,
    code: "MPH458RI",
    nama: "Rizky Muhammad E",
    nominal: 1300000,
    totalVisaApproved: 13,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Top Earner #1 👑"
  },
  {
    rank: 2,
    code: "MPH555DE",
    nama: "Derryl",
    nominal: 600000,
    totalVisaApproved: 6,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Top Earner #2 🥈"
  },
  {
    rank: 3,
    code: "MPH630AL",
    nama: "Albert Lazuardy",
    nominal: 600000,
    totalVisaApproved: 6,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Top Earner #3 🥉"
  },
  {
    rank: 4,
    code: "MPH343HI",
    nama: "LPK Hibiki",
    nominal: 400000,
    totalVisaApproved: 4,
    kategori: "LPK",
    isStaff: false,
    statusBadge: "Mitra LPK Unggulan"
  },
  {
    rank: 5,
    code: "MPH965RE",
    nama: "Rizki Reihan Febriansyah",
    nominal: 300000,
    totalVisaApproved: 3,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Aktif"
  },
  {
    rank: 6,
    code: "MPH678RI",
    nama: "Rifki",
    nominal: 200000,
    totalVisaApproved: 2,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Aktif"
  },
  {
    rank: 7,
    code: "MPH314NA",
    nama: "LPK Navi Japan",
    nominal: 200000,
    totalVisaApproved: 2,
    kategori: "LPK",
    isStaff: false,
    statusBadge: "Mitra LPK Unggulan"
  },
  {
    rank: 8,
    code: "MPH199GI",
    nama: "Gilang",
    nominal: 100000,
    totalVisaApproved: 1,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Pencairan Berhasil"
  },
  {
    rank: 9,
    code: "MPH223KE",
    nama: "Kesi Aulia Fitri",
    nominal: 100000,
    totalVisaApproved: 1,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Pencairan Berhasil"
  },
  {
    rank: 10,
    code: "MPH623ER",
    nama: "Erik",
    nominal: 100000,
    totalVisaApproved: 1,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Pencairan Berhasil"
  },
  {
    rank: 11,
    code: "MPH804RE",
    nama: "Refzi Pangestu",
    nominal: 100000,
    totalVisaApproved: 1,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Pencairan Berhasil"
  },
  {
    rank: 12,
    code: "MPH883MA",
    nama: "LPK Mayagi",
    nominal: 100000,
    totalVisaApproved: 1,
    kategori: "LPK",
    isStaff: false,
    statusBadge: "Mitra LPK Unggulan"
  },
  {
    rank: 13,
    code: "MPH144NA",
    nama: "Nanami Kay",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 14,
    code: "MPH805HE",
    nama: "Heru Ferdita Kifli",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 15,
    code: "MPH885SI",
    nama: "Silvieyana Rahman",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 16,
    code: "MPH240AK",
    nama: "Ami Kamila",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 17,
    code: "MPH550CA",
    nama: "Cahyadi",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 18,
    code: "MPH537VE",
    nama: "Verry Wulandari",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 19,
    code: "MPH123AL",
    nama: "Alan Fauzy",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 20,
    code: "MPH486AD",
    nama: "Ade Hidayanti A",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 21,
    code: "MPH196YO",
    nama: "Yova Mustafa G",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 22,
    code: "MPH212YO",
    nama: "Yolanda Putri Nuraina",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 23,
    code: "MPH362NU",
    nama: "Nurul Fardilah",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 24,
    code: "MPH182RI",
    nama: "Rizkita Amanda",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 25,
    code: "MPH985PP",
    nama: "Pput Yulianti",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 26,
    code: "MPH673YA",
    nama: "Yayan Sopian",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 27,
    code: "MPH123FA",
    nama: "Fachri Ardiansyah",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 28,
    code: "MPH516HA",
    nama: "Haris Budi Bachtiar",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 29,
    code: "MPH913DE",
    nama: "Dede Rizki Salsa",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 30,
    code: "MPH028MS",
    nama: "M Saeful Anam",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 31,
    code: "MPH695MO",
    nama: "Mochammad Habib P",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 32,
    code: "MPH798AG",
    nama: "Agus",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 33,
    code: "MPH732HI",
    nama: "Hildayati",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 34,
    code: "MPH550MI",
    nama: "Mia",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 35,
    code: "MPH020VI",
    nama: "Virgiawan Yos Luhur",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 36,
    code: "MPH982AR",
    nama: "Aryo Julian",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 37,
    code: "MPH419DE",
    nama: "Desri Mawarni",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 38,
    code: "MPH030DE",
    nama: "Delfina Kayla Rahma",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 39,
    code: "MPH409TO",
    nama: "Tovandi Fadillah",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 40,
    code: "MPH555MA",
    nama: "Maftukhanul Karim",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 41,
    code: "MPH995AY",
    nama: "Ayi Arifin",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 42,
    code: "MPH327AY",
    nama: "Ayu Lestari",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 43,
    code: "MPH181LU",
    nama: "Lukman Hanafi",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 44,
    code: "MPH218AN",
    nama: "Antini",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 45,
    code: "MPH628RA",
    nama: "Rapika",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 46,
    code: "MPH886NU",
    nama: "Nurul Annisa Rizalmi",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 47,
    code: "MPH412AL",
    nama: "Alfi Sidqi",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 48,
    code: "MPH551AN",
    nama: "Andiky Irdana Putri",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 49,
    code: "MPH885DE",
    nama: "Deni Permana Putra",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 50,
    code: "MPH102HE",
    nama: "Heru Yaldi",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 51,
    code: "MPH073HI",
    nama: "Hisyam Achmad Fadhi",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 52,
    code: "MPH086IN",
    nama: "Indra Saputra",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 53,
    code: "MPH247MI",
    nama: "Mitra Susmita",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 54,
    code: "MPH646WI",
    nama: "Wiwid S Noviyani",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 55,
    code: "MPH760LI",
    nama: "Lilis Puspitasari",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 56,
    code: "MPH726DE",
    nama: "Dedy Prastio Hartanto",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 57,
    code: "MPH001AN",
    nama: "Anisa Apriliani",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 58,
    code: "MPH996DI",
    nama: "Dian",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 59,
    code: "MPH540RA",
    nama: "Rahmadian Shodiqi",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 60,
    code: "MPH389KA",
    nama: "Khairul Julianto",
    nominal: 0,
    totalVisaApproved: 0,
    kategori: "Individu",
    isStaff: false,
    statusBadge: "Mitra Baru Terdaftar"
  },
  {
    rank: 61,
    code: "MAPAHTRIP",
    nama: "Staff Mapahtrip",
    nominal: 11600000,
    totalVisaApproved: 116,
    kategori: "Staff",
    isStaff: true,
    statusBadge: "Internal MapahTrip"
  }
];

export const formatRupiah = (val: number): string => {
  return 'Rp ' + val.toLocaleString('id-ID');
};
