# 🛠️ Panduan Standar Operasional Prosedur (SOP) Staf PIC Konsulat
**MapahTrip — Spesialis Jasa Pengurusan Visa Jepang**

Buku panduan ini merupakan pegangan wajib bagi seluruh Staf PIC Operasional di wilayah Konsulat Jenderal Jepang (Jakarta, Surabaya, Medan, Makassar, dan Denpasar). Panduan ini merinci setiap alur kerja dari saat berkas fisik tiba di kantor, koordinasi penagihan pembayaran dengan Owner, penguncian sistem demi keamanan modal, pengajuan ke JVAC, hingga pengiriman paspor kembali ke pemohon, disertai **penjelasan rinci setiap bagian pada gambar tampilan (screenshot)**.

---

## 🏢 1. Peran & Tanggung Jawab Staf PIC

Sebagai ujung tombak operasional MapahTrip, Staf PIC bertanggung jawab untuk:
1. Menerima, memeriksa kelengkapan, dan menjaga keamanan dokumen fisik (paspor asli, KTP, KK, rekening koran, surat sponsor, CoE, dll).
2. Memperbarui status berkas secara disiplin pada sistem portal MapahTrip.
3. Menyerahkan berkas ke loket resmi JVAC (VFS Global) atau Kedutaan / Konsulat Jenderal Jepang sesuai domisili yurisdiksi.
4. Mengambil paspor yang telah tertempel visa dan mengirimkannya kembali dengan aman ke pemohon.
5. **Fee Operasional:** Setiap paspor yang berhasil diselesaikan memberikan hak fee operasional sebesar **Rp 50.000 / paspor** bagi Staf PIC.

---

## 🔐 2. Akses & Login Portal Staf

1. Kunjungi portal operasional: `https://mapahtrip.id/#staff`.
2. Masukkan **4-Digit PIN Rahasia Staf** sesuai akun wilayah tugas Anda (misal: PIC Jakarta Rizki/Ulla, PIC Surabaya, PIC Medan, dll).
3. Klik tombol **"Masuk ke Portal Staf ➔"**.

---

## 🖥️ 3. Bedah Tampilan Meja Kerja Staf PIC

Berikut adalah tampilan utama meja kerja Staf PIC Konsulat:

![Dashboard Staf PIC Konsulat](images/sop_staff_portal.png)

### 🔍 Penjelasan Rinci Setiap Bagian pada Gambar:

#### 1. Bilah Header & Notifikasi WA Outbox:
- **Logo MapahTrip & Indikator User:** Di pojok kiri bawah terlihat nama staf yang bertugas (misal: *RZ - Rizki, Staff PIC Jakarta*).
- **Tombol "Input Pemohon Baru":** Tombol biru di kanan atas jika staf perlu menginput pemohon secara manual atas arahan manajemen.
- **Badge Kuning "WA: 2 Tertunda" (Antrean WhatsApp Outbox):** Menampilkan jumlah pesan notifikasi yang sedang menunggu antrean pengiriman. Jika diklik, staf dapat melihat isi pesan dan menekan tombol *Kirim Ulang*.

#### 2. Empat (4) Kotak Ringkasan Beban Kerja Konsulat:
- **Total Pemohon (210 - Konsulat Jakarta):** Total seluruh berkas aktif yang dialokasikan ke wilayah tugas staf.
- **Belum Verif (0):** Pemohon baru yang mendaftar online tetapi paspor fisiknya belum dikirimkan.
- **Berkas Tiba (0):** Berkas yang sudah sampai di meja staf dan sedang menunggu pelunasan tagihan invoice oleh Owner.
- **Proses JVAC (0):** Berkas yang saat ini sedang berada dalam masa tunggu verifikasi pihak konsulat/kedutaan Jepang.

#### 3. Bilah Pencarian & Filter Meja Kerja:
- **Pencarian Cepat:** Kotak untuk mencari nama pemohon, nomor paspor, atau nomor resi pengiriman.
- **Filter Wilayah Konsulat:** Menyesuaikan yurisdiksi (Jakarta, Surabaya, Medan, Makassar, Denpasar).
- **Filter Paket & Filter Status Bayar:** Memisahkan berkas *Lunas* vs *Belum Lunas*.

#### 4. Baris Tabel Pemohon & Tombol Tahapan Berkas:
Setiap baris pemohon memuat informasi penting dan tombol kontrol tahapan:
- **No. Pemohon & Identitas:**
  * Inisial nama & Nama lengkap (misal: `BH - BIMA HARLEY`, `SP - SENA PRAYOGI`).
  * Nomor Paspor disensor privasi (misal: `E70***10`).
  * ID Registrasi unik (misal: `MT-0310`).
  * Nomor WhatsApp kontak pemohon.
- **Program & Konsulat:**
  * Jenis visa (misal: `Tokutei Ginou`, `Reguler`).
  * Wilayah tugas: `Jakarta • PIC: Rizki`.
- **Indikator Berkas (Checklist Hijau & Merah):** Menampilkan status kelengkapan dokumen (misal: *Kurang 1 Berkas* atau tombol *Minta via WA* jika ada dokumen yang belum lengkap).
- **EMPAT (4) TOMBOL TAHAPAN BERKAS:**
  1. **Tombol `[✓ Sampai]`:** Staf klik saat paket paspor fisik diterima. Tanggal tiba otomatis tersimpan (misal: `2026-11-25`), dan sistem mengirim alert WA ke Owner untuk penagihan.
  2. **Tombol `[✓ Proses]`:** ⚠️ **Terkunci** jika belum lunas! Hanya bisa diklik setelah status pembayaran pemohon menjadi *Lunas*. Klik ini saat berkas diserahkan ke loket JVAC.
  3. **Tombol `[✓ Selesai]`:** Klik setelah staf mengambil paspor yang telah tertempel stiker visa Jepang dari kedutaan.
  4. **Tombol `[✓ Kirim]`:** Klik saat mengembalikan paspor. Jendela popup akan meminta nomor resi ekspedisi kurir atau konfirmasi penyerahan fisik di Terminal 3 Bandara Soetta.
- **Badge Status Bayar:**
  * `[• LUNAS - Siap JVAC]` (Warna Hijau): Menandakan pembayaran sudah diverifikasi Owner, staf aman memproses berkas ke loket.
  * `[Belum Lunas]` (Warna Oranye/Abu-abu): Peringatan bahwa pemohon belum membayar. **Dilarang keras memproses ke JVAC!**
- **Kolom Aksi Kanan:**
  * **Rincian (Biru):** Melihat data lengkap pemohon & lampiran berkas.
  * **Tolak (Merah):** Jika berkas bermasalah / ditolak.
  * **Hapus:** Menghapus entri berkas fiktif / tes.

---

## 🔄 4. Alur Standar Operasional Berkas (End-to-End)

```
[Pemohon Kirim Paspor Fisik]
              │
              ▼
[1. Berkas Tiba di Meja Staf] ──► Staf Klik: [✓ Sampai]
                                         │
                                         ▼ (Notifikasi Otomatis ke WA Owner)
[2. Owner Tagih & Validasi Dana] ──► Owner Mengubah: [Status Bayar: LUNAS]
                                         │
                                         ▼ (Gembok Tombol Terbuka)
[3. Submit ke Loket Konsulat] ──► Staf Klik: [✓ Proses]
              │
              ▼
[4. Pengambilan Paspor Ber-Visa] ──► Staf Klik: [✓ Selesai]
              │
              ▼
[5. Pengiriman Paspor ke Pemohon] ──► Staf Klik: [✓ Kirim] (Input Resi / T3 Soetta)
```

---

## 💵 5. Pencatatan & Pembayaran Fee Staf PIC

- Setiap berkas yang telah melewati tahap pengurusan akan secara otomatis menambahkan saldo hak fee Anda sebesar **Rp 50.000 / paspor**.
- Anda dapat memantau akumulasi total fee pada menu **"Fee Staf PIC"** di panel navigasi kiri.
- Tim Finance / Owner akan mentransfer total fee operasional secara berkala ke rekening bank staf yang terdaftar.
