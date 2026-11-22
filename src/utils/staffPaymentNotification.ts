import type { Pengajuan, StaffMaster, KonsjenKota } from '../types';
import { mockStaff } from '../data/mockData';
import { kirimPesanWA } from '../whatsapp';

/**
 * Otomatis mengirim notifikasi WhatsApp ke Staf PIC Wilayah ketika pembayaran customer telah LUNAS.
 * CATATAN PENTING:
 * 1. Tanpa mencantumkan nominal pembayaran apa pun agar privasi keuangan owner tetap terjaga.
 * 2. Khusus Visa Waiver dikecualikan karena diurus langsung oleh Owner secara online via JAVES.
 */
export async function kirimNotifikasiLunasKeStaff(item: Pengajuan): Promise<void> {
  const isWaiver = (item.program || '').toLowerCase().includes('waiver') || (item.program || '').toLowerCase().includes('e-visa');
  if (isWaiver) return;

  try {
    let regionalStaffList = mockStaff;
    if (typeof window !== 'undefined') {
      const savedStaff = localStorage.getItem('mapahtrip_staff_list');
      if (savedStaff) {
        try {
          const parsed: StaffMaster[] = JSON.parse(savedStaff);
          regionalStaffList = parsed.map((p) => {
            const def = mockStaff.find((ms) => ms.id === p.id);
            return { ...p, noWa: p.noWa || def?.noWa || '' };
          });
        } catch {}
      }
    }

    // 1. Cari staf berdasarkan nama staffPic yang tertulis di item
    let assignedStaff: StaffMaster | undefined;
    if (item.staffPic && item.staffPic.trim()) {
      const picName = item.staffPic.trim().toLowerCase();
      assignedStaff = regionalStaffList.find(
        (s) => s.nama.toLowerCase().includes(picName) || picName.includes(s.nama.toLowerCase())
      );
    }

    // 2. Jika belum ketemu, cari staf berdasarkan konsulat wilayah tugasnya
    if (!assignedStaff && item.konsjen) {
      assignedStaff =
        regionalStaffList.find((s) => s.aktif && s.konsjenTugas && s.konsjenTugas.includes(item.konsjen as KonsjenKota)) ||
        regionalStaffList.find((s) => s.konsjenTugas && s.konsjenTugas.includes(item.konsjen as KonsjenKota));
    }

    if (!assignedStaff || !assignedStaff.noWa || !assignedStaff.noWa.trim()) {
      return;
    }

    const pesanWAStaff =
`*PEMBAYARAN LUNAS (SIAP PROSES)* 🇯🇵✅

Halo Kak *${assignedStaff.nama}*, biaya visa pemohon telah diverifikasi LUNAS:

• *ID:* *${item.noPengajuan || '-'}*
• *Nama:* ${item.namaPemohon}
• *Program:* ${item.program || 'Visa'} (${item.paket || 'Reguler'})
• *Konsulat:* Konsjen ${item.konsjen || '-'}
• *Paspor:* ${item.noPaspor || '-'}

👉 Silakan cetak berkas & jadwalkan submit JVAC/Konsulat.`;

    await kirimPesanWA(assignedStaff.noWa.trim(), pesanWAStaff);
    console.log(`[WA Gateway] Notifikasi pembayaran lunas terkirim ke PIC ${assignedStaff.nama} (${assignedStaff.noWa})`);
  } catch (err) {
    console.warn('Gagal mengirim notifikasi lunas ke staf PIC:', err);
  }
}

/**
 * Otomatis mengirim notifikasi WhatsApp konfirmasi pembayaran lunas ke Customer
 */
export async function kirimNotifikasiLunasKeCustomer(item: Pengajuan): Promise<void> {
  if (!item.noTelp || !item.noTelp.trim()) return;

  const todayStr = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const nominalStr = item.dibayarPemohon
    ? 'Rp ' + item.dibayarPemohon.toLocaleString('id-ID')
    : '-';

  const pesanWACustomer =
`*KONFIRMASI PEMBAYARAN DITERIMA - MAPAHTRIP* 🇯🇵🧾✨

Halo Sdr/i *${item.namaPemohon}*,

Terima kasih banyak atas pembayaran Anda. Pembayaran biaya pengajuan Visa Jepang Anda telah *KAMI TERIMA DAN DIVERIFIKASI LUNAS*. 🙏✅

📋 *Rincian Pembayaran:*
• No. Pengajuan: *${item.noPengajuan || '-'}*
• Nama Pemohon: *${item.namaPemohon}*
• No. Paspor: ${item.noPaspor || '-'}
• Program Visa: ${item.program || 'Visa Jepang'} (${item.paket || 'Reguler'})
• Total Pembayaran: *${nominalStr}*
• Status Pembayaran: *LUNAS (100%)* ✅
• Tanggal Verifikasi: ${todayStr}

Tahap Selanjutnya:
Berkas dan dokumen permohonan Anda kini telah siap untuk diproses dan diajukan (submit) ke Konsulat Jenderal Jepang / JVAC oleh tim operasional kami. Kami akan segera mengabarkan Anda kembali begitu berkas resmi masuk proses kedutaan.

Terima kasih telah mempercayakan pengurusan visa Anda bersama MapahTrip! 🌸

Salam hangat,
*Tim Keuangan & Operasional MapahTrip*
Website: https://mapahtrip.id`;

  try {
    await kirimPesanWA(item.noTelp.trim(), pesanWACustomer);
    console.log(`[WA Gateway] Notifikasi pembayaran lunas terkirim ke customer ${item.namaPemohon} (${item.noTelp})`);
  } catch (err) {
    console.warn('Gagal mengirim notifikasi lunas ke customer:', err);
  }
}

