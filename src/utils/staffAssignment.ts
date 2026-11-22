import type { Pengajuan, StaffMaster, StaffName } from '../types';

/**
 * Menentukan Staf PIC penanggung jawab berkas secara otomatis:
 * 1. Visa Waiver / e-Visa: Tidak ditangani staf fisik (100% diproses online oleh Owner/Pusat via JAVES) -> ''
 * 2. Visa Kunjungan (Keluarga / Teman / Kunjungan Sementara): Dipegang Kak Ulla (Ulya) untuk seluruh wilayah nasional -> 'Ulla'
 * 3. Visa Tokutei Ginou / Engineer / Turis Reguler/Multiple: Dipegang oleh PIC konsulat regional:
 *    - Surabaya -> 'Nanami Kay'
 *    - Denpasar -> 'Yulia'
 *    - Medan -> 'Heru'
 *    - Makassar -> 'Latifah'
 *    - Jakarta / lainnya -> 'Rizky'
 */
export const determineDefaultStaffPic = (program?: string, konsjen?: string): StaffName | '' => {
  const prog = (program || '').toLowerCase();
  if (prog.includes('waiver') || prog.includes('e-visa') || prog.includes('evisa')) {
    return '';
  }
  if (prog.includes('kunjungan')) {
    return 'Ulla';
  }
  switch (konsjen) {
    case 'Surabaya':
      return 'Nanami Kay';
    case 'Denpasar':
      return 'Yulia';
    case 'Medan':
      return 'Heru';
    case 'Makassar':
      return 'Latifah';
    case 'Jakarta':
    default:
      return 'Rizky';
  }
};

/**
 * Memeriksa apakah suatu berkas pengajuan ditugaskan secara riil kepada Staf PIC yang sedang login.
 * Menghilangkan kebocoran berkas antar staf konsulat dan mencocokkan 100% dengan tab Rekap_Staff spreadsheet:
 * - Rizky (199 apply)
 * - Nanami Kay (27 apply)
 * - Heru (14 apply)
 * - Yulia (4 apply)
 * - Latifah (2 apply)
 * - Ulla / Ulya (7 apply)
 */
export const isApplicantAssignedToStaff = (p: Pengajuan, staff?: StaffMaster | null): boolean => {
  if (!staff) return true;

  // Visa Waiver / e-Visa ditangani 100% online oleh Owner/Pusat, bukan tugas staf konsulat
  const prog = (p.program || '').toLowerCase();
  if (prog.includes('waiver') || prog.includes('e-visa') || prog.includes('evisa')) {
    return false;
  }

  const staffClean = (p.staffPic || '').trim().toLowerCase();
  if (!staffClean || staffClean.includes('owner') || staffClean.includes('admin') || staffClean === 'tim pusat') {
    return false;
  }

  const currentNama = staff.nama.trim().toLowerCase();
  const currentInisial = (staff.inisial || '').trim().toLowerCase();

  // Khusus Ulla / Ulya (Staff PIC Khusus Kunjungan)
  if (currentNama === 'ulla' || currentNama === 'ulya') {
    return staffClean === 'ulla' || staffClean === 'ulya' || staffClean.includes('ulla') || staffClean.includes('ulya');
  }

  // Staf Konsulat Regional (Rizky, Nanami Kay, Heru, Yulia, Latifah)
  return (
    staffClean === currentNama ||
    staffClean.includes(currentNama) ||
    (Boolean(currentInisial) && staffClean === currentInisial)
  );
};

