# 👑 Panduan Eksekutif Owner & Super Admin
**MapahTrip — Kendali Bisnis, Keuangan, & Otorisasi Operasional**

Buku panduan ini merupakan acuan operasional dan finansial resmi bagi Owner / Manajemen Puncak MapahTrip. Panduan ini mencakup pengelolaan arus kas (omset, modal loket konsulat, komisi mitra, fee staf, laba bersih), siklus penagihan invoice ke pemohon, otorisasi status pembayaran (buka kunci proses staf), pencairan komisi & fee, hingga konfigurasi master tarif dan alamat konsulat.

---

## 🏛️ 1. Otoritas & Peran Super Admin

Sebagai Super Admin, Anda memegang kendali penuh atas:
1. **Keuangan Realtime:** Memantau pendapatan kotor, beban pengeluaran loket JVAC/Kedutaan, kewajiban komisi rekanan, dan laba bersih perusahaan.
2. **Otorisasi Pembayaran (Billing Gateway):** Menjadi satu-satunya pihak yang berhak menyatakan bahwa pembayaran biaya visa telah **"Lunas"** ke rekening PT Tokyo Asia Connection.
3. **Pengendali Kunci Operasional:** Status *Lunas* dari Owner adalah kunci pengaman yang membuka izin Staf PIC untuk memproses berkas ke loket JVAC.
4. **Master Konfigurasi:** Mengatur tarif visa (harga modal vs harga jual), paket add-on (Premium & Waiver), kontak WhatsApp PIC, dan alamat kantor cabang.

---

## 🔑 2. Akses & Login Portal Owner

1. Buka tautan: `https://mapahtrip.id/#owner`.
2. Masukkan kredensial Super Admin Anda (Email / Username & Password).
3. Anda akan langsung diarahkan ke **Dashboard Eksekutif**.

---

## 📈 3. Dashboard Eksekutif Keuangan & Arus Kas

Dashboard Owner menyajikan laporan keuangan secara otomatis berdasarkan data pengajuan yang masuk ke sistem:

![Dashboard Eksekutif Owner](images/sop_owner_dashboard.png)
*(Tampilan Dashboard Eksekutif Arus Kas & Sebaran Wilayah Konsulat)*

### A. Rincian 5 Metrik Keuangan Utama:
1. **Total Pemasukan (Omset / Gross Revenue):**
   - Akumulasi total pembayaran yang ditagihkan dan diterima dari seluruh pemohon visa.
2. **Biaya Konsulat & JVAC (Modal Loket):**
   - Dana wajib yang harus disetorkan ke loket VFS JVAC / Konsulat Jenderal Jepang untuk penerbitan stiker visa resmi.
3. **Total Komisi Mitra Affiliate:**
   - Hak insentif yang wajib dibayarkan kepada mitra affiliate (Rp 50.000 untuk visa turis/reguler, hingga Rp 150.000 untuk Tokutei Ginou/kerja).
4. **Total Fee Staf PIC:**
   - Alokasi imbal jasa operasional untuk staf PIC yang menangani berkas di lapangan (Rp 50.000 / paspor).
5. **Laba Bersih MapahTrip (Net Profit):**
   $$\text{Laba Bersih} = \text{Omset} - (\text{Biaya JVAC} + \text{Komisi Mitra} + \text{Fee Staf})$$
   - Menunjukkan keuntungan bersih riil yang didapatkan MapahTrip setelah seluruh beban operasional dan pihak ketiga terpenuhi.

### B. Distribusi Volume 5 Wilayah Konsulat:
- Memantau sebaran pengajuan di seluruh yurisdiksi: **Konsjen Jakarta (KBRI), Surabaya, Medan, Makassar, dan Bali (Denpasar)**.

---

## 💳 4. Menu Pengajuan & Prosedur Penagihan (Billing Cycle)

Menu Pengajuan adalah pusat verifikasi dokumen dan penagihan dana pemohon.

![Menu Pengajuan Owner](images/sop_owner_pengajuan.png)
*(Tampilan Tabel Pengajuan, Tombol Penagihan, & Status Pembayaran)*

### Prosedur Standar Penagihan & Otorisasi:

```
[Staf Klik "Sampai"] ──► [Notifikasi Masuk ke WA Owner]
                                    │
                                    ▼
                      [Owner Klik "Kirim Tagihan"]
                                    │
                                    ▼ (Kirim Invoice via WhatsApp)
                      [Pemohon Transfer ke Bank BTN]
                                    │
                                    ▼ (Owner Cek Mutasi)
                      [Owner Ubah Status: "LUNAS"]
                                    │
                                    ▼ (Gembok Staf Terbuka)
                      [Staf PIC Submit ke Loket JVAC]
```

#### 1. Penerimaan Notifikasi Berkas Sampai:
- Saat Staf PIC menerima berkas fisik dan mengklik tombol *"Sampai"*, Anda akan menerima pesan otomatis di WhatsApp:
  > *"BERKAS SAMPAI (SIAP DITAGIH) — Berkas fisik MT-xxxx atas nama [Nama Pemohon] telah tiba di kantor PIC. Siap kirim tagihan di Dashboard Owner: https://mapahtrip.id/#owner"*

#### 2. Mengirimkan Invoice Tagihan Resmi ke Pemohon:
- Buka tabel **Pengajuan** di portal Owner.
- Cari baris pemohon yang bersangkutan, lalu klik tombol hijau **"Kirim Tagihan"**.
- Sistem akan menyiapkan pesan WhatsApp resmi berisi rincian tagihan:
  * ID Pengajuan (misal: `MT-0314`)
  * Nama Pemohon
  * Program Visa & Opsi Paket (Reguler / Premium)
  * Total Nominal Tagihan
  * Rekening Resmi Pembayaran:
    > **BANK BTN**  
    > No. Rekening: **1401-50-008080-6**  
    > Atas Nama: **PT Tokyo Asia Connection**

#### 3. Verifikasi Mutasi Rekening & Otorisasi Lunas:
- Pemohon akan mengirimkan foto/file bukti transfer via WhatsApp.
- Buka m-Banking atau mutasi rekening Bank BTN PT Tokyo Asia Connection untuk memastikan dana sudah benar-benar masuk.
- Pada tabel Pengajuan, klik tombol status pembayaran pada baris pemohon tersebut, lalu ubah dari **"Belum Lunas"** menjadi **"Lunas"**.

> ⚡ **DAMPAK PENTING:**
> Seketika Anda mengubah status menjadi **Lunas**, indikator status akan berubah menjadi hijau (*LUNAS - Siap JVAC*) dan secara otomatis **membuka gembok tombol "Proses"** di portal Staf PIC. Staf sekarang memiliki izin sah untuk mendaftarkan paspor ke loket JVAC.

#### 4. Fitur Pengelolaan Berkas:
- **Rincian:** Melihat formulir pendaftaran lengkap pemohon, file paspor, KTP, dan dokumen pendukung yang diunggah.
- **Tolak:** Menolak pengajuan jika data tidak valid atau pemohon membatalkan.
- **Hapus:** Menghapus data uji coba / permohonan fiktif agar tidak mengotori laporan statistik dan omset keuangan.

---

## 🤝 5. Menu Komisi & Fee Rekanan

Di menu ini, Owner mengelola kewajiban pembayaran insentif kepada pihak mitra dan staf:

1. **Rekapitulasi Komisi Mitra Affiliate:**
   - Menampilkan daftar mitra yang berhak menerima komisi atas pemohon yang telah melunasi pembayaran.
   - Owner melakukan transfer ke nomor rekening yang tertera pada profil mitra, lalu menandai statusnya sebagai **"Sudah Ditransfer"** dan melampirkan bukti transfer.
2. **Rekapitulasi Fee Staf PIC:**
   - Menghitung akumulasi paspor yang telah diselesaikan oleh masing-masing staf PIC (Rp 50.000 / paspor).
   - Owner mentransfer fee operasional bulanan/mingguan ke rekening staf PIC.

---

## ⚙️ 6. Menu Pengaturan Master & Konfigurasi Tarif

Menu Pengaturan digunakan untuk mengelola konfigurasi fundamental sistem MapahTrip:

![Menu Pengaturan Owner](images/sop_owner_pengaturan.png)
*(Tampilan Pengaturan Master Konsulat, PIC, dan Matrix Tarif Visa)*

### A. Master Konsulat & Alamat Kantor Cabang:
- Mengatur data 5 perwakilan konsulat Jepang (Jakarta, Surabaya, Medan, Makassar, Denpasar).
- Anda dapat memperbarui:
  * Nama Staf PIC yang bertugas.
  * Nomor WhatsApp PIC yang menerima pesan koordinasi.
  * Alamat lengkap kantor penerimaan berkas fisik paspor (alamat ini yang dikirimkan ke pemohon untuk pengiriman kurir).

### B. Matrix Tarif Visa (Pricing Engine):
- Menentukan **Harga Modal Loket JVAC** vs **Harga Jual ke Pemohon** untuk setiap kategori visa:
  * Visa Turis Single Entry
  * Visa Turis Multiple Entry
  * Visa Kunjungan Keluarga / Teman
  * Visa Tokutei Ginou / Kerja
  * Visa Bisnis / Pelatihan
- **Pengaturan Add-on Layanan Tambahan:**
  * **Paket Premium Fast-Track / Prioritas (+Rp 600.000):** Opsi penanganan berkas ekspres prioritas.
  * **Japan e-Visa / Waiver (Rp 200.000 flat):** Layanan khusus bagi pemegang e-Paspor tanpa pengiriman fisik ke loket VFS.

### C. Antrean WhatsApp Gateway (Outbox):
- Terletak pada bilah atas (navbar) khusus tampilan Owner (`WAGatewayIndicator`).
- Memantau antrean pesan otomatis, memeriksa status pengiriman pesan, dan tombol kirim ulang instan jika ada pesan notifikasi yang tertunda.
