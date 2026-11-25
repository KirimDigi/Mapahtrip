import { samplePasfotoBase64, sampleKtpBase64, sampleCoeBase64, sampleFormVisaBase64 } from '../data/mockData';
import React, { useState, useEffect } from 'react';
import type { Pengajuan, PaketVisa } from '../types';
import { kirimPesanWA } from '../whatsapp';
import { updatePengajuanDocumentInDB, updatePengajuanPaymentInDB, deletePengajuanDocumentInDB } from '../lib/supabase';
import { uploadPaymentProofToStorage } from '../lib/supabaseStorage';
import { getVisaPrice } from '../utils/visaPricing';
import { optimizeDocumentUpload } from '../utils/documentOptimizer';
import { kirimNotifikasiLunasKeStaff, kirimNotifikasiLunasKeCustomer } from '../utils/staffPaymentNotification';

interface DetailPengajuanViewProps {
  pengajuan: Pengajuan;
  onBack: () => void;
  onUpdateStatus?: (newStatus: Pengajuan['status']) => void;
  onUpdateStage?: (id: string, stageData: any) => void;
  onUpdatePengajuan?: (updatedPengajuan: Pengajuan) => void;
  isOwner?: boolean;
}

export const DetailPengajuanView: React.FC<DetailPengajuanViewProps> = ({
  pengajuan,
  onBack,
  onUpdatePengajuan,
  isOwner = false,
}) => {
  const [showRealPassport, setShowRealPassport] = useState(false);
  const [isSendingWA, setIsSendingWA] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ title: string; base64: string; fileName?: string; isSample?: boolean; url?: string } | null>(null);
  const [currentPengajuan, setCurrentPengajuan] = useState<Pengajuan>(pengajuan);
  const [isUploadingDoc, setIsUploadingDoc] = useState<string | null>(null);

  // State Modal Ubah Paket Layanan Visa
  const [isEditingPaket, setIsEditingPaket] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [selectedPaket, setSelectedPaket] = useState<PaketVisa>('Reguler');
  const [nominalBiaya, setNominalBiaya] = useState<number>(0);
  const [nominalKeluarEdit, setNominalKeluarEdit] = useState<number>(0);
  const [staffFeeEdit, setStaffFeeEdit] = useState<number>(50000);
  const [referralFeeEdit, setReferralFeeEdit] = useState<number>(100000);
  const [catatanPaket, setCatatanPaket] = useState<string>('');

  // Handler tombol Esc / Escape untuk menutup modal secara instan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showPrintModal) {
          setShowPrintModal(false);
        } else if (isEditingPaket) {
          setIsEditingPaket(false);
        } else if (previewDoc) {
          setPreviewDoc(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPrintModal, isEditingPaket, previewDoc]);

  const handleOpenEditPaket = () => {
    const p = (currentPengajuan.paket as PaketVisa) || 'Reguler';
    setSelectedPaket(p);
    setNominalBiaya(currentPengajuan.dibayarPemohon || getVisaPrice(currentPengajuan.program, p));
    setNominalKeluarEdit(currentPengajuan.nominalKeluar || 0);
    const currStaffFee = currentPengajuan.staffFee !== undefined && currentPengajuan.staffFee !== null
      ? currentPengajuan.staffFee
      : (currentPengajuan.cashback !== undefined && currentPengajuan.cashback !== null
        ? currentPengajuan.cashback
        : (currentPengajuan.staffPic ? 50000 : 0));
    setStaffFeeEdit(currStaffFee);

    const hasMitra = Boolean(
      currentPengajuan.affiliateCode &&
      currentPengajuan.affiliateCode.trim() !== '' &&
      currentPengajuan.affiliateCode.toUpperCase() !== 'MAPAHTRIP'
    );
    const currRefFee = currentPengajuan.referralFee !== undefined && currentPengajuan.referralFee !== null
      ? currentPengajuan.referralFee
      : (hasMitra ? 100000 : 0);
    setReferralFeeEdit(currRefFee);

    setCatatanPaket('');
    setIsEditingPaket(true);
  };

  const handleSelectNewPaket = (p: PaketVisa) => {
    setSelectedPaket(p);
    const price = getVisaPrice(currentPengajuan.program, p);
    setNominalBiaya(price);
  };

  const handleSaveNewPaket = () => {
    const oldPaket = currentPengajuan.paket || 'Reguler';

    const hasMitra = Boolean(
      currentPengajuan.affiliateCode &&
      currentPengajuan.affiliateCode.trim() !== '' &&
      currentPengajuan.affiliateCode.toUpperCase() !== 'MAPAHTRIP'
    );
    const refFee = hasMitra ? referralFeeEdit : 0;
    // Rumus Fee Bersih MapahTrip: Pemasukan (Dibayar) - Modal Keluar Konsulat - Komisi Referral Mitra - Fee Staf PIC
    const newFeeBersih = Math.max(0, nominalBiaya - nominalKeluarEdit - refFee - staffFeeEdit);

    const updated: Pengajuan = {
      ...currentPengajuan,
      paket: selectedPaket,
      dibayarPemohon: nominalBiaya,
      nominalKeluar: nominalKeluarEdit,
      staffFee: staffFeeEdit,
      referralFee: refFee,
      feeBersih: newFeeBersih,
      catatan: catatanPaket
        ? `${currentPengajuan.catatan ? currentPengajuan.catatan + ' | ' : ''}Ubah paket/keuangan (${oldPaket} -> ${selectedPaket}): ${catatanPaket}`
        : `${currentPengajuan.catatan ? currentPengajuan.catatan + ' | ' : ''}Ubah paket/keuangan oleh Owner`,
    };

    setCurrentPengajuan(updated);
    if (onUpdatePengajuan) {
      onUpdatePengajuan(updated);
    }

    try {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('mapahtrip:pengajuan-updated', { detail: updated }));
    } catch {}

    updatePengajuanPaymentInDB(currentPengajuan.id, {
      dibayarPemohon: nominalBiaya,
      nominalKeluar: nominalKeluarEdit,
      staffFee: staffFeeEdit,
      referralFee: refFee,
      feeBersih: newFeeBersih,
    }).catch((e) => console.warn('Supabase sync error:', e));

    setIsEditingPaket(false);
  };

  const handleKirimWAPaket = () => {
    if (!currentPengajuan.noTelp) {
      alert(`Nomor WhatsApp untuk "${currentPengajuan.namaPemohon}" belum tersedia.`);
      return;
    }

    const oldBiaya = currentPengajuan.dibayarPemohon || 0;
    const selisih = nominalBiaya - oldBiaya;

    let benefitDesc = '';
    if (selectedPaket === 'TAC') {
      benefitDesc = '⚡ *Paket TAC (Total Assistance Care)*: Penanganan berkas komprehensif, asistensi pengisian form lengkap, dan prioritas konsultasi konsuler.';
    } else if (selectedPaket === 'Premium') {
      benefitDesc = '★ *Paket Premium*: Jalur cepat asistensi berkas, cross-check dokumen teliti oleh tim senior, dan prioritas update status.';
    } else {
      benefitDesc = '📋 *Paket Reguler*: Pemrosesan berkas standar sesuai jadwal antrean konsulat resmi.';
    }

    let infoBayar = `💰 *Biaya Layanan:* Rp ${nominalBiaya.toLocaleString('id-ID')}`;
    if (currentPengajuan.statusPembayaran === 'Lunas' && selisih > 0) {
      infoBayar += `\n⚠️ *Kekurangan Pembayaran:* Rp ${selisih.toLocaleString('id-ID')} (sebelumnya lunas Rp ${oldBiaya.toLocaleString('id-ID')})`;
    } else if (currentPengajuan.statusPembayaran === 'Lunas' && selisih < 0) {
      infoBayar += `\nℹ️ *Kelebihan Pembayaran (Refund):* Rp ${Math.abs(selisih).toLocaleString('id-ID')} (akan dikembalikan oleh admin)`;
    }

    const pesanWA =
`*PERUBAHAN PAKET LAYANAN VISA JEPANG - MAPAHTRIP* 🇯🇵✨\n\n` +
`Halo Sdr/i *${currentPengajuan.namaPemohon}*,\n` +
`Paket layanan pengajuan visa Anda telah diperbarui di sistem kami:\n\n` +
`📄 *No. Registrasi:* ${currentPengajuan.noPengajuan || '-'}\n` +
`🗾 *Program:* ${currentPengajuan.program} (${currentPengajuan.konsjen})\n` +
`📦 *Paket Baru:* *${selectedPaket}*\n` +
`${infoBayar}\n\n` +
`${benefitDesc}\n` +
(catatanPaket ? `\n📝 *Catatan:* ${catatanPaket}\n` : '') +
`\nJika ada pertanyaan mengenai perubahan ini, silakan hubungi tim kami. Terima kasih atas kepercayaan Anda memilih MapahTrip! 🙏\n\n` +
`*Tim Layanan MapahTrip*`;

    const cleanNum = currentPengajuan.noTelp.replace(/[^0-9]/g, '');
    const finalPhone = cleanNum.startsWith('0') ? '62' + cleanNum.substring(1) : cleanNum.startsWith('62') ? cleanNum : '62' + cleanNum;
    window.open(`https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodeURIComponent(pesanWA)}`, '_blank');
  };

  const handleSendWALink = () => {
    const noWa = currentPengajuan.noTelp?.trim();
    if (!noWa) {
      alert(`Nomor WhatsApp untuk "${currentPengajuan.namaPemohon}" belum tersedia.`);
      return;
    }

    const docList = [
      { name: 'Formulir Aplikasi Visa Jepang', isOk: !!currentPengajuan.uploadedDocs?.formVisa?.base64 },
      { name: 'Scan / Foto Paspor Asli', isOk: !!currentPengajuan.uploadedDocs?.pasporFisik?.base64 },
      { name: 'E-KTLN / Rekening Koran', isOk: !!currentPengajuan.uploadedDocs?.ektln?.base64 },
      { name: 'Certificate of Eligibility (COE) / Bukti Booking', isOk: !!currentPengajuan.uploadedDocs?.coe?.base64 },
      { name: 'Pas Foto 4.5 × 3.5 cm (Background Putih)', isOk: !!(currentPengajuan.fotoBase64 || currentPengajuan.uploadedDocs?.foto?.base64) },
      { name: 'Fotokopi / Scan KTP & Kartu Keluarga', isOk: !!currentPengajuan.uploadedDocs?.ktp?.base64 },
    ];
    const missing = docList.filter((d) => !d.isOk).map((d) => `• ${d.name}`).join('\n');

    const pesan =
`*PEMBERITAHUAN KELENGKAPAN BERKAS VISA JEPANG - MAPAHTRIP* 🇯🇵📋\n\n` +
`Halo Sdr/i *${currentPengajuan.namaPemohon}*,\n\n` +
`Pendaftaran pengajuan Visa Jepang Anda telah kami terima (*${currentPengajuan.noPengajuan || '-'}*).\n\n` +
(missing ? `Untuk kelanjutan proses verifikasi, berikut dokumen persyaratan yang kami butuhkan:\n${missing}\n\n` : '') +
`Silakan kirimkan foto / scan dokumen tersebut langsung dengan membalas pesan WhatsApp ini. Tim kami yang akan memverifikasi dan menginput kelengkapan berkas Anda ke sistem internal.\n\n` +
`Terima kasih banyak atas kerja sama Anda! 🙏\n\n` +
`Salam hangat,\n` +
`*Tim Operasional MapahTrip (${currentPengajuan.konsjen || 'Indonesia'})*`;

    const cleanNum = noWa.replace(/[^0-9]/g, '');
    const finalPhone = cleanNum.startsWith('0') ? '62' + cleanNum.substring(1) : cleanNum.startsWith('62') ? cleanNum : '62' + cleanNum;
    window.open(`https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodeURIComponent(pesan)}`, '_blank');
  };

  useEffect(() => {
    setCurrentPengajuan(pengajuan);
  }, [pengajuan]);

  const handleDownloadDoc = (docTitle: string, base64Data?: string, fileName?: string) => {
    if (!base64Data) {
      alert(`Pemohon belum mengunggah dokumen "${docTitle}". Silakan unggah foto/scan fisik dokumen pemohon terlebih dahulu via tombol "Upload Fisik".`);
      return;
    }

    let ext = '.jpg';
    if (base64Data.startsWith('data:application/pdf')) ext = '.pdf';
    else if (base64Data.startsWith('data:image/png')) ext = '.png';
    else if (base64Data.startsWith('data:image/jpeg') || base64Data.startsWith('data:image/jpg')) ext = '.jpg';

    const safeApplicant = currentPengajuan.namaPemohon.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeDoc = docTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
    const finalName = fileName || `${safeDoc}_${safeApplicant}${ext}`;

    const link = document.createElement('a');
    link.href = base64Data;
    link.download = finalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintSingleDoc = (title: string, base64Data: string, url?: string) => {
    if (!base64Data && !url) {
      alert(`Dokumen "${title}" belum diunggah.`);
      return;
    }

    const isPdf = (base64Data && base64Data.startsWith('data:application/pdf')) || (url && url.toLowerCase().includes('.pdf'));

    if (isPdf) {
      // Untuk PDF: Browser modern memblokir iframe tersembunyi mengeksekusi print PDF karena sandbox plugin PDF.
      // Solusi resmi: Buka file PDF via Blob URL / CDN di tab baru yang langsung memuat PDF Viewer lengkap dengan tombol Cetak & Ctrl+P bawaan browser!
      try {
        let pdfTargetUrl = url;
        if (!pdfTargetUrl && base64Data.startsWith('data:application/pdf')) {
          const byteCharacters = atob(base64Data.split(',')[1]);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          pdfTargetUrl = URL.createObjectURL(blob);
        }

        if (pdfTargetUrl) {
          const printWin = window.open(pdfTargetUrl, '_blank');
          if (printWin) {
            printWin.focus();
          } else {
            const link = document.createElement('a');
            link.href = pdfTargetUrl;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }
      } catch (err: any) {
        alert(`Gagal membuka dokumen PDF: ${err.message}`);
      }
      return;
    }

    // Untuk Gambar (JPG/PNG/Scan Foto): Menggunakan background iframe print otomatis
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Cetak - ${title}</title>
          <style>
            @page { size: auto; margin: 8mm; }
            body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
            img { max-width: 100%; max-height: 98vh; object-fit: contain; }
          </style>
        </head>
        <body>
          <img src="${url || base64Data}" alt="${title}" onload="setTimeout(function(){ window.print(); }, 250);" />
        </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch {}
      }, 3000);
    }
  };

  const handleUploadDoc = async (docKey: string, file: File) => {
    setIsUploadingDoc(docKey);
    try {
      const optimized = await optimizeDocumentUpload(file);
      const b64 = optimized.base64;
      const size = optimized.sizeKB;
      const finalFileName = optimized.file.name;

      const uploadResult = await updatePengajuanDocumentInDB(currentPengajuan.id, docKey, b64, finalFileName, size);
      const uploadedCloudUrl = uploadResult?.url;

      const updatedPengajuanItem: Pengajuan = {
        ...currentPengajuan,
        fotoBase64: docKey === 'foto' ? b64 : currentPengajuan.fotoBase64,
        fotoSizeKB: docKey === 'foto' ? size : currentPengajuan.fotoSizeKB,
        fotoUrl: docKey === 'foto' ? (uploadedCloudUrl || currentPengajuan.fotoUrl) : currentPengajuan.fotoUrl,
        berkas: {
          ...currentPengajuan.berkas,
          [docKey]: true,
        },
        uploadedDocs: {
          ...(currentPengajuan.uploadedDocs || {}),
          [docKey]: {
            name: finalFileName,
            base64: b64,
            sizeKB: size,
            ...(uploadedCloudUrl ? { url: uploadedCloudUrl } : {}),
          },
        },
      };

      setCurrentPengajuan(updatedPengajuanItem);
      if (onUpdatePengajuan) {
        onUpdatePengajuan(updatedPengajuanItem);
      }
      const savingsInfo = optimized.reductionPercent > 0 ? ` (Dioptimalkan hemat ${optimized.reductionPercent}%)` : '';
      alert(`✅ Berkas "${finalFileName}" berhasil diunggah${savingsInfo} untuk pemohon ${currentPengajuan.namaPemohon}!`);
    } catch (err: any) {
      alert(`Gagal mengunggah berkas: ${err.message}`);
    } finally {
      setIsUploadingDoc(null);
    }
  };

  const handleDeleteDoc = async (docKey: string, docTitle: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus dokumen "${docTitle}" untuk pemohon ${currentPengajuan.namaPemohon}?\n\nBerkas fisik dan data dokumen akan dihapus bersih dari Database & Storage Supabase.`)) {
      return;
    }

    try {
      await deletePengajuanDocumentInDB(currentPengajuan.id, docKey);

      const updatedDocs = { ...(currentPengajuan.uploadedDocs || {}) };
      delete updatedDocs[docKey];

      const updatedItem: Pengajuan = {
        ...currentPengajuan,
        uploadedDocs: updatedDocs,
        berkas: {
          ...currentPengajuan.berkas,
          [docKey]: false,
        },
        fotoBase64: docKey === 'foto' ? undefined : currentPengajuan.fotoBase64,
        fotoUrl: docKey === 'foto' ? undefined : currentPengajuan.fotoUrl,
      };

      setCurrentPengajuan(updatedItem);
      if (onUpdatePengajuan) {
        onUpdatePengajuan(updatedItem);
      }
      if (previewDoc) {
        setPreviewDoc(null);
      }
      alert(`✅ Dokumen "${docTitle}" berhasil dihapus.`);
    } catch (err: any) {
      alert(`Gagal menghapus dokumen: ${err.message}`);
    }
  };

  const handleUploadBuktiBayar = async (file: File) => {
    setIsUploadingDoc('bukti_bayar');
    try {
      const optimized = await optimizeDocumentUpload(file);
      const b64 = optimized.base64;
      const finalFileName = optimized.file.name;

      // Upload bukti pembayaran fisik ke Supabase Storage jika bucket aktif
      let cloudUrl: string | undefined = undefined;
      try {
        const uploadRes = await uploadPaymentProofToStorage({
          applicantId: currentPengajuan.id,
          file: b64,
          fileName: finalFileName,
        });
        if (uploadRes.url) {
          cloudUrl = uploadRes.url;
        }
      } catch (e) {
        console.warn('Gagal upload struk bayar ke Supabase Storage:', e);
      }

      await updatePengajuanPaymentInDB(currentPengajuan.id, {
        buktiBayarPemohon: b64,
        buktiBayarNama: finalFileName,
      });

      const updated: Pengajuan = {
        ...currentPengajuan,
        buktiBayarPemohon: b64,
        buktiBayarNama: file.name,
        ...(cloudUrl ? { buktiBayarUrl: cloudUrl } : {}),
      };
      setCurrentPengajuan(updated);
      if (onUpdatePengajuan) onUpdatePengajuan(updated);
      alert(`✅ Bukti transfer "${file.name}" berhasil diunggah untuk pemohon ${currentPengajuan.namaPemohon}!`);
    } catch (err: any) {
      alert(`Gagal mengunggah bukti transfer: ${err.message}`);
    } finally {
      setIsUploadingDoc(null);
    }
  };

  const handleToggleStatusBayar = async () => {
    const nextStatus = currentPengajuan.statusPembayaran === 'Menunggu Pembayaran' ? 'Lunas' : 'Menunggu Pembayaran';

    let nominalFinal = currentPengajuan.dibayarPemohon || 0;
    if (nextStatus === 'Lunas') {
      const defaultNominal = nominalFinal > 0 ? String(nominalFinal) : '';
      const input = window.prompt(
        `✅ KONFIRMASI PEMBAYARAN LUNAS: ${currentPengajuan.namaPemohon}\n\n` +
        `Total Tagihan Resmi Terkirim: Rp ${(nominalFinal || 0).toLocaleString('id-ID')}\n\n` +
        `• Jika customer transfer PAS sesuai tagihan, cukup tekan [OK / Enter].\n` +
        `• Jika nominal yang diterima BERBEDA (misal ada potongan / biaya tambahan), silakan sesuaikan angkanya di bawah:`,
        defaultNominal
      );
      if (input === null) return;
      const parsed = parseInt(input.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsed) && parsed > 0) {
        nominalFinal = parsed;
      }
    } else {
      const konfirm = window.confirm(
        `Ubah status pembayaran ${currentPengajuan.namaPemohon} menjadi "Menunggu Pembayaran"?`
      );
      if (!konfirm) return;
    }

    const refFee = currentPengajuan.referralFee || 0;
    const staffFee = currentPengajuan.staffFee || 0;
    const modalKeluar = currentPengajuan.nominalKeluar || 0;
    const newFeeBersih = Math.max(0, nominalFinal - modalKeluar - refFee - staffFee);

    await updatePengajuanPaymentInDB(currentPengajuan.id, {
      statusPembayaran: nextStatus,
      dibayarPemohon: nominalFinal,
      feeBersih: newFeeBersih,
    });
    const updated: Pengajuan = {
      ...currentPengajuan,
      statusPembayaran: nextStatus,
      dibayarPemohon: nominalFinal,
      feeBersih: newFeeBersih,
    };
    setCurrentPengajuan(updated);
    if (onUpdatePengajuan) onUpdatePengajuan(updated);
    if (nextStatus === 'Lunas') {
      kirimNotifikasiLunasKeStaff(updated).catch(() => {});
      kirimNotifikasiLunasKeCustomer(updated).catch(() => {});
    }
  };

  const handleKirimNotifWA = async () => {
    if (!confirm(`Kirim notifikasi update status "${pengajuan.status}" via WhatsApp Gateway ke ${pengajuan.namaPemohon} (${pengajuan.noTelp})?`)) return;
    setIsSendingWA(true);
    try {
      const pesan = `Halo Sdr/i ${pengajuan.namaPemohon},\n\nUpdate status pengajuan visa Jepang Anda di MapahTrip:\n• No. Pengajuan: ${pengajuan.noPengajuan}\n• Status Saat Ini: *${pengajuan.status}*\n• Konsulat: ${pengajuan.konsjen}\n• Estimasi Selesai: ${pengajuan.tglEstimasiSelesai}\n\nTerima kasih atas kepercayaannya.\nTim Operasional MapahTrip`;
      const res = await kirimPesanWA(pengajuan.noTelp, pesan);
      if (res && (res.success || res.status === 'success' || !res.error)) {
        alert(`Notifikasi WhatsApp berhasil dikirim ke ${pengajuan.namaPemohon}!`);
      } else {
        alert(`Gagal mengirim WhatsApp via Gateway: ${res?.message || 'Pastikan gateway aktif di komputer.'}`);
      }
    } catch (err: any) {
      alert(`Terjadi error saat menghubungi gateway: ${err.message}`);
    } finally {
      setIsSendingWA(false);
    }
  };

  const formatRupiah = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  const generatePrintHtml = () => {
    const tglCetak = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const jamCetak = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const noInvoice = `MT-INV/${new Date().getFullYear()}/${currentPengajuan.id || '001'}`;
    const statusBayar = currentPengajuan.statusPembayaran === 'Lunas' ? 'LUNAS' : 'MENUNGGU PEMBAYARAN';
    const totalBiaya = (currentPengajuan.dibayarPemohon || 0).toLocaleString('id-ID');

    return `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>Tanda Terima & Invoice - ${currentPengajuan.namaPemohon} - MapahTrip</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            background: #fff;
            padding: 24px;
            font-size: 13px;
            line-height: 1.5;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #005bb5;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .brand-title {
            font-size: 22px;
            font-weight: 800;
            color: #005bb5;
            letter-spacing: -0.5px;
          }
          .brand-subtitle {
            font-size: 11px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 2px;
          }
          .brand-contact {
            font-size: 11px;
            color: #64748b;
            margin-top: 6px;
          }
          .doc-info {
            text-align: right;
          }
          .doc-title {
            font-size: 15px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .doc-badge {
            display: inline-block;
            background: ${currentPengajuan.statusPembayaran === 'Lunas' ? '#ecfdf5' : '#fffbeb'};
            color: ${currentPengajuan.statusPembayaran === 'Lunas' ? '#047857' : '#b45309'};
            border: 1px solid ${currentPengajuan.statusPembayaran === 'Lunas' ? '#a7f3d0' : '#fde68a'};
            font-size: 11px;
            font-weight: 800;
            padding: 3px 10px;
            border-radius: 4px;
            margin-top: 6px;
          }
          .doc-meta {
            font-size: 11px;
            color: #64748b;
            margin-top: 6px;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
          }
          .box-card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px 14px;
            background: #f8fafc;
          }
          .box-card-title {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            color: #005bb5;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 6px;
            margin-bottom: 8px;
          }
          .field-row {
            display: flex;
            justify-content: space-between;
            padding: 3px 0;
            font-size: 12px;
          }
          .field-label {
            color: #64748b;
          }
          .field-value {
            font-weight: 600;
            color: #0f172a;
            text-align: right;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th {
            background: #f1f5f9;
            color: #334155;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            text-align: left;
            padding: 9px 12px;
            border: 1px solid #e2e8f0;
          }
          td {
            padding: 10px 12px;
            border: 1px solid #e2e8f0;
            font-size: 12px;
            color: #1e293b;
          }
          .text-right {
            text-align: right;
          }
          .total-box {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            padding: 12px 16px;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
          }
          .total-label {
            font-size: 13px;
            font-weight: 700;
            color: #334155;
          }
          .total-val {
            font-size: 18px;
            font-weight: 800;
            color: #005bb5;
          }
          .terms {
            border: 1px dashed #cbd5e1;
            background: #fcfcfd;
            border-radius: 6px;
            padding: 10px 12px;
            font-size: 11px;
            color: #64748b;
            line-height: 1.5;
            margin-bottom: 30px;
          }
          .terms-title {
            font-weight: 700;
            color: #334155;
            margin-bottom: 4px;
          }
          .signatures {
            display: flex;
            justify-content: space-between;
            padding: 0 30px;
            margin-top: 10px;
          }
          .sig-block {
            text-align: center;
            width: 220px;
          }
          .sig-title {
            font-size: 12px;
            color: #64748b;
            margin-bottom: 60px;
          }
          .sig-name {
            font-size: 12px;
            font-weight: 700;
            color: #0f172a;
            border-top: 1px solid #94a3b8;
            padding-top: 4px;
          }
          .sig-role {
            font-size: 10px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand-title">MapahTrip</div>
            <div class="brand-subtitle">Visa Jepang Specialist</div>
            <div class="brand-contact">
              Website: mapahtrip.id | Email: info@mapahtrip.id<br>
              Layanan Konsulat &amp; Kedutaan Jepang Resmi (Jakarta, Surabaya, Denpasar, Medan, Makassar)
            </div>
          </div>
          <div class="doc-info">
            <div class="doc-title">Tanda Terima &amp; Invoice</div>
            <div class="doc-meta">No: <strong>${noInvoice}</strong></div>
            <div class="doc-meta">Tanggal: ${tglCetak} ${jamCetak} WIB</div>
            <div class="doc-badge">${statusBayar}</div>
          </div>
        </div>

        <div class="grid-2">
          <div class="box-card">
            <div class="box-card-title">Identitas Pemohon</div>
            <div class="field-row">
              <span class="field-label">Nama Lengkap</span>
              <span class="field-value">${currentPengajuan.namaPemohon}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Nomor Paspor</span>
              <span class="field-value">${currentPengajuan.noPaspor || currentPengajuan.maskedPaspor}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Nomor WhatsApp</span>
              <span class="field-value">${currentPengajuan.noTelp}</span>
            </div>
            ${currentPengajuan.affiliateCode ? `
            <div class="field-row">
              <span class="field-label">Mitra Affiliate</span>
              <span class="field-value">${currentPengajuan.affiliateCode}</span>
            </div>` : ''}
          </div>

          <div class="box-card">
            <div class="box-card-title">Rincian Pengurusan</div>
            <div class="field-row">
              <span class="field-label">ID Pengajuan</span>
              <span class="field-value">#${currentPengajuan.id || 'MT-APPLY'}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Program Visa</span>
              <span class="field-value">${currentPengajuan.program}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Wilayah Konsulat</span>
              <span class="field-value">Konsjen ${currentPengajuan.konsjen}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Paket Layanan</span>
              <span class="field-value">${currentPengajuan.paket || 'Reguler'}</span>
            </div>
            <div class="field-row">
              <span class="field-label">PIC Penanganan</span>
              <span class="field-value">${currentPengajuan.staffPic || 'Staf Admin'}</span>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">No</th>
              <th>Deskripsi Layanan</th>
              <th style="width: 140px; text-align: center;">Paket</th>
              <th style="width: 160px;" class="text-right">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align: center;">1</td>
              <td>
                <strong>Pengurusan Visa Jepang: ${currentPengajuan.program}</strong>
                <div style="font-size: 11px; color: #64748b; margin-top: 3px;">
                  Pemeriksaan kelengkapan dokumen, pra-verifikasi persyaratan, asistensi konsulat, dan pemantauan status berkas.
                </div>
              </td>
              <td style="text-align: center; font-weight: 600;">${currentPengajuan.paket || 'Reguler'}</td>
              <td class="text-right" style="font-weight: 700;">Rp ${totalBiaya}</td>
            </tr>
          </tbody>
        </table>

        <div class="total-box">
          <div>
            <div class="total-label">Total Biaya Pengurusan:</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
              Status: <strong style="color: ${currentPengajuan.statusPembayaran === 'Lunas' ? '#047857' : '#b45309'}">${statusBayar}</strong>
            </div>
          </div>
          <div class="total-val">Rp ${totalBiaya}</div>
        </div>

        <div class="terms">
          <div class="terms-title">Catatan &amp; Ketentuan Resmi:</div>
          <ol style="padding-left: 16px;">
            <li>Tanda terima ini merupakan bukti sah pendaftaran berkas visa di MapahTrip.</li>
            <li>Biaya pengurusan yang telah dibayarkan mencakup jasa konsultasi, asistensi, penyiapan dokumen, dan pengantaran berkas.</li>
            <li>Persetujuan, masa berlaku, dan penerbitan visa sepenuhnya merupakan wewenang mutlak Kedutaan Besar / Konsulat Jenderal Jepang.</li>
          </ol>
        </div>

        <div class="signatures">
          <div class="sig-block">
            <div class="sig-title">Pemohon Visa,</div>
            <div class="sig-name">${currentPengajuan.namaPemohon}</div>
            <div class="sig-role">Paspor: ${currentPengajuan.noPaspor || currentPengajuan.maskedPaspor}</div>
          </div>
          <div class="sig-block">
            <div class="sig-title">MapahTrip Official,</div>
            <div class="sig-name">${currentPengajuan.staffPic || 'Tim Pelayanan Konsuler'}</div>
            <div class="sig-role">Visa Jepang Specialist</div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const executePrintDocument = () => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(generatePrintHtml());
      doc.close();
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch {}
      }, 2000);
    }
  };

  const handleOpenPrintModal = () => {
    setShowPrintModal(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Breadcrumb & Navigation */}
      <div className="detail-breadcrumb-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div className="detail-breadcrumb-nav" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.80rem' }}>
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: '#475569',
              cursor: 'pointer',
              fontWeight: 600,
              padding: 0,
            }}
          >
            Pengajuan
          </button>
          <span style={{ color: '#94A3B8' }}>/</span>
          <span style={{ color: '#475569', fontWeight: 600 }}>Detail Pengajuan</span>
          <span style={{ color: '#94A3B8' }}>/</span>
          <span
            className="detail-breadcrumb-pill"
            style={{
              padding: '2px 8px',
              borderRadius: '6px',
              background: '#F1F5F9',
              border: '1px solid #E2E8F0',
              fontWeight: 700,
              color: '#1E293B',
            }}
          >
            {pengajuan.namaPemohon} ({showRealPassport ? pengajuan.noPaspor : pengajuan.maskedPaspor})
          </span>
        </div>

        <button className="btn btn-secondary detail-back-btn" onClick={onBack}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            arrow_back
          </span>
          <span>Kembali ke Daftar</span>
        </button>
      </div>

      {/* Main Applicant Header Card */}
      <div
        className="card detail-applicant-card"
        style={{
          padding: '24px',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8faff 100%)',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Top Section: Profile Info (Left) + Action CTAs (Right) */}
        <div
          className="detail-applicant-body"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px',
            paddingBottom: '20px',
            borderBottom: '1px solid #edf2f7',
          }}
        >
          {/* Identity: Header Profile Info */}
          <div className="detail-applicant-info" style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0, flex: '1 1 400px' }}>
            {/* 1. Baris Atas: Badges (ID, Status, Mitra) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#1d4ed8',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>tag</span>
                {currentPengajuan.id || 'MT-APPLY'}
              </span>

              {pengajuan.status === 'Ditolak' ? (
                <span
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '0.74rem',
                  }}
                >
                  <span style={{ color: '#DC2626', fontWeight: 800 }}>✖ Ditolak:</span>
                  <span style={{ color: '#991B1B', fontWeight: 600 }}>{pengajuan.alasanPenolakan || 'Di Awal'}</span>
                </span>
              ) : (
                <span className="badge badge-info" style={{ fontSize: '0.74rem', padding: '2px 8px' }}>
                  {pengajuan.status}
                </span>
              )}

              {currentPengajuan.affiliateCode && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: '#fef3c7',
                    border: '1px solid #fde68a',
                    color: '#92400e',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                  }}
                  title={`Direferensikan oleh Mitra Affiliate: ${currentPengajuan.affiliateCode}`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>handshake</span>
                  Mitra: {currentPengajuan.affiliateCode}
                </span>
              )}
            </div>

            {/* 2. Baris Utama: Avatar sejajar dengan Nama & Kontak */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, width: '100%' }}>
              {/* Avatar / Real Photo */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {currentPengajuan.fotoBase64 ? (
                  <div
                    onClick={() =>
                      setPreviewDoc({
                        title: `Pasfoto 4.5x3.5cm - ${currentPengajuan.namaPemohon}`,
                        base64: currentPengajuan.fotoBase64 || '',
                        fileName: `Pasfoto_${currentPengajuan.namaPemohon.replace(/\s+/g, '_')}.jpg`,
                        url: currentPengajuan.fotoUrl,
                      })
                    }
                    style={{
                      width: '44px',
                      height: '56px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1.5px solid #0284c7',
                      boxShadow: '0 2px 8px rgba(2, 132, 199, 0.2)',
                      cursor: 'pointer',
                      position: 'relative',
                      backgroundColor: '#FFFFFF',
                    }}
                    title="Klik untuk melihat foto ukuran penuh"
                  >
                    <img
                      src={currentPengajuan.fotoBase64}
                      alt={currentPengajuan.namaPemohon}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'rgba(2, 132, 199, 0.85)',
                        color: '#ffffff',
                        fontSize: '7.5px',
                        fontWeight: 800,
                        textAlign: 'center',
                        padding: '1px 0',
                      }}
                    >
                      FOTO
                    </div>
                  </div>
                ) : (
                  <div
                    className="detail-applicant-avatar-box"
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #0284c7 0%, #1e40af 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.94rem',
                      fontWeight: 800,
                      letterSpacing: '0.02em',
                      boxShadow: '0 2px 8px rgba(2, 132, 199, 0.22)',
                    }}
                  >
                    {currentPengajuan.namaPemohon
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </div>
                )}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-3px',
                    right: '-3px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                  }}
                  title="Tujuan Konsulat Jepang"
                >
                  🇯🇵
                </div>
              </div>

              {/* Nama Pemohon & Identitas Kontak */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <h1
                  className="detail-applicant-name"
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    margin: '0 0 4px 0',
                    lineHeight: 1.25,
                    letterSpacing: '-0.01em',
                    wordBreak: 'break-word',
                  }}
                >
                  {pengajuan.namaPemohon}
                </h1>

                {/* Baris identitas: Paspor + Telp/WA */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '2px 8px',
                      background: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      color: '#334155',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#64748b' }}>badge</span>
                    <span>{showRealPassport ? pengajuan.noPaspor : pengajuan.maskedPaspor}</span>
                    <button
                      onClick={() => setShowRealPassport(!showRealPassport)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        color: '#0284c7',
                      }}
                      title={showRealPassport ? 'Sembunyikan Paspor' : 'Lihat Paspor Lengkap'}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                        {showRealPassport ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>

                  <a
                    href={`https://wa.me/${pengajuan.noTelp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      color: '#166534',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                    title="Klik untuk chat WhatsApp pemohon"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#16a34a' }}>call</span>
                    <span>{pengajuan.noTelp}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="detail-action-ctas" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              onClick={handleOpenEditPaket}
              style={{
                color: '#005BB5',
                borderColor: '#BFDBFE',
                backgroundColor: '#EFF6FF',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 700,
              }}
              title="Ubah paket pemohon & sesuaikan biaya"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>tune</span>
              <span>Ubah Paket</span>
            </button>

            <button
              className="btn btn-secondary"
              onClick={handleKirimNotifWA}
              disabled={isSendingWA}
              style={{
                color: '#047857',
                borderColor: '#a7f3d0',
                background: '#ecfdf5',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Kirim notifikasi update status langsung via Gateway WhatsApp Mapahtrip"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                {isSendingWA ? 'sync' : 'send_and_archive'}
              </span>
              <span>{isSendingWA ? 'Mengirim...' : 'Kirim Notif WA'}</span>
            </button>

            <a
              href={`https://wa.me/${pengajuan.noTelp.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{
                color: '#334155',
                borderColor: 'rgba(195, 198, 214, 0.4)',
                background: 'var(--surface-container-low)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Buka WhatsApp Web Manual"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chat</span>
              <span>Buka WA Web</span>
            </a>

            <button
              className="btn btn-primary"
              onClick={handleOpenPrintModal}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Pratinjau & Cetak Tanda Terima / Invoice Resmi"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>print</span>
              <span>Cetak Tanda Terima</span>
            </button>
          </div>
        </div>

        {/* Bottom Section: 4 Analytical Summary Cards */}
        <div
          className="detail-summary-cards-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '12px',
            marginTop: '18px',
          }}
        >
          {/* Card 1: Program Visa */}
          <div
            style={{
              padding: '12px 14px',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0284c7',
                flexShrink: 0,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>stars</span>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Program Visa
              </div>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {pengajuan.program}
              </div>
            </div>
          </div>

          {/* Card 2: Konsulat & PIC */}
          <div
            style={{
              padding: '12px 14px',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#475569',
                flexShrink: 0,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>account_balance</span>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Konsulat &amp; PIC
              </div>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Konsjen {pengajuan.konsjen}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                PIC: {pengajuan.staffPic || 'Ditangani Owner'}
              </div>
            </div>
          </div>

          {/* Card 3: Paket Layanan */}
          <div
            onClick={handleOpenEditPaket}
            style={{
              padding: '12px 14px',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
            title="Klik untuk ubah paket pemohon"
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#eef2ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4f46e5',
                flexShrink: 0,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>tune</span>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Paket Layanan
                </span>
                <span style={{ fontSize: '0.70rem', color: '#4f46e5', fontWeight: 700 }}>Ubah ✎</span>
              </div>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#4f46e5' }}>
                {currentPengajuan.paket || 'Reguler'}
              </div>
            </div>
          </div>

          {/* Card 4: Status Keuangan & Bayar */}
          <div
            style={{
              padding: '12px 14px',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: currentPengajuan.statusPembayaran === 'Lunas' ? '#ecfdf5' : '#fffbeb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: currentPengajuan.statusPembayaran === 'Lunas' ? '#059669' : '#d97706',
                flexShrink: 0,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                {currentPengajuan.statusPembayaran === 'Lunas' ? 'verified' : 'payments'}
              </span>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Status Pembayaran
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    fontSize: '0.80rem',
                    fontWeight: 700,
                    color: currentPengajuan.statusPembayaran === 'Lunas' ? '#047857' : '#b45309',
                  }}
                >
                  {currentPengajuan.statusPembayaran || 'Menunggu Pembayaran'}
                </span>
                {currentPengajuan.dibayarPemohon ? (
                  <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                    • Rp {currentPengajuan.dibayarPemohon.toLocaleString('id-ID')}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Catatan Riwayat & Alasan Perubahan Paket (Full Width) */}
        {currentPengajuan.catatan && (
          <div
            style={{
              marginTop: '14px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0284c7', marginTop: '1px', flexShrink: 0 }}>
              sticky_note_2
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.70rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Catatan &amp; Riwayat Perubahan:
              </div>
              <div style={{ fontSize: '0.78rem', color: '#1e293b', marginTop: '3px', lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap', fontWeight: 500 }}>
                {currentPengajuan.catatan}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grid: 3 Analytical Columns */}
      <div className="detail-columns-grid" style={{ display: 'grid', gap: '24px' }}>
        {/* Column 1: Kelengkapan Dokumen Fisik */}
        <div className="card">
          <div className="detail-doc-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '8px' }}>
            <h3 className="font-serif detail-doc-card-title" style={{ fontSize: '1.08rem', fontWeight: 700, margin: 0, minWidth: 0 }}>
              Kelengkapan Dokumen Fisik
            </h3>
            {(() => {
              const docList = [
                { key: 'formVisa', isOk: !!currentPengajuan.uploadedDocs?.formVisa?.base64 },
                { key: 'pasporFisik', isOk: !!currentPengajuan.uploadedDocs?.pasporFisik?.base64 },
                { key: 'ektln', isOk: !!currentPengajuan.uploadedDocs?.ektln?.base64 },
                { key: 'coe', isOk: !!currentPengajuan.uploadedDocs?.coe?.base64 },
                { key: 'foto', isOk: !!(currentPengajuan.fotoBase64 || currentPengajuan.uploadedDocs?.foto?.base64) },
                { key: 'ktp', isOk: !!currentPengajuan.uploadedDocs?.ktp?.base64 },
              ];
              const totalUploaded = docList.filter((d) => d.isOk).length;
              return (
                <span
                  className="badge detail-doc-card-badge"
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '999px',
                    backgroundColor: totalUploaded === 6 ? '#EFF6FF' : '#F1F5F9',
                    color: totalUploaded === 6 ? '#1D4ED8' : '#475569',
                    border: '1px solid #DBEAFE',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {totalUploaded === 6 ? '✓ Lengkap 6/6 Berkas' : `Terunggah ${totalUploaded}/6 Berkas`}
                </span>
              );
            })()}
          </div>

          {/* Tautan Upload Mandiri Khusus Pemohon */}
          <div
            style={{
              marginBottom: '16px',
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#16A34A' }}>chat</span>
                <span>Follow Up Berkas via WhatsApp</span>
              </div>
              <div style={{ display: 'flex', gap: '5px' }}>
                {currentPengajuan.noTelp && (
                  <button
                    type="button"
                    onClick={handleSendWALink}
                    style={{
                      padding: '4px 12px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      borderRadius: '6px',
                      backgroundColor: '#16A34A',
                      color: '#FFFFFF',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                    title="Kirim pesan permintaan berkas via WhatsApp langsung"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>send</span>
                    <span>Minta Berkas via WA</span>
                  </button>
                )}
              </div>
            </div>
            <div style={{ fontSize: '0.71rem', color: '#15803D', lineHeight: 1.35 }}>
              Kirim daftar berkas persyaratan yang kurang langsung ke WhatsApp pemohon. Setelah pemohon mengirimkan dokumen, staf/owner dapat mengunggahnya pada tombol &quot;+ Upload Berkas&quot; di bawah ini.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              { key: 'formVisa', title: 'Formulir Aplikasi Visa Jepang', note: 'Tanda tangan asli pemohon', sample: sampleFormVisaBase64 },
              { key: 'pasporFisik', title: 'Paspor Fisik Asli', note: 'Masa berlaku > 12 bulan', sample: samplePasfotoBase64 },
              { key: 'ektln', title: 'E-KTLN (Tenaga Kerja Luar Negeri)', note: 'Terdaftar BP2MI aktif', sample: sampleCoeBase64 },
              { key: 'coe', title: 'Certificate of Eligibility (COE)', note: 'Asli & legalisir dari MOJ Jepang', sample: sampleCoeBase64 },
              { key: 'foto', title: 'Pas Foto 4.5 × 3.5 cm (Background Putih)', note: 'Standar konsulat (< 100KB)', sample: samplePasfotoBase64 },
              { key: 'ktp', title: 'Fotokopi KTP & Kartu Keluarga', note: 'Tervalidasi Dukcapil', sample: sampleKtpBase64 },
            ].map((doc, docIdx) => {
              const docFile = currentPengajuan.uploadedDocs?.[doc.key];
              const realBase64 = doc.key === 'foto' ? (currentPengajuan.fotoBase64 || docFile?.base64) : docFile?.base64;
              const realUrl = doc.key === 'foto' ? (currentPengajuan.fotoUrl || docFile?.url) : docFile?.url;
              const isRealUploaded = Boolean(realBase64);
              const isPdf = Boolean((docFile?.name && docFile.name.toLowerCase().endsWith('.pdf')) || (realBase64 && realBase64.startsWith('data:application/pdf')));

              return (
                <div
                  key={doc.key}
                  className="detail-doc-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 10px',
                    borderRadius: '8px',
                    background: 'transparent',
                    borderBottom: docIdx < 5 ? '1px solid #F1F5F9' : 'none',
                    gap: '12px',
                    flexWrap: 'wrap',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div className="detail-doc-info" style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '160px', flex: 1 }}>
                    {/* Thumbnail Preview Icon / Image */}
                    {isRealUploaded ? (
                      <div
                        onClick={() =>
                          setPreviewDoc({
                            title: `${doc.title} - ${currentPengajuan.namaPemohon}`,
                            base64: realBase64!,
                            fileName: docFile?.name || `${doc.key}_${currentPengajuan.namaPemohon}.jpg`,
                            isSample: false,
                            url: realUrl,
                          })
                        }
                        style={{
                          width: '44px',
                          height: '52px',
                          borderRadius: '8px',
                          border: '1.5px solid #CBD5E1',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          flexShrink: 0,
                          backgroundColor: '#FFFFFF',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Klik untuk membuka dokumen asli pemohon"
                      >
                        {isPdf ? (
                          <div style={{ textAlign: 'center', color: '#DC2626' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>picture_as_pdf</span>
                            <div style={{ fontSize: '0.6rem', fontWeight: 800 }}>PDF</div>
                          </div>
                        ) : (
                          <>
                            <img
                              src={realBase64!}
                              alt={doc.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'rgba(0,0,0,0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#FFFFFF',
                                fontSize: '13px',
                              }}
                            >
                              👁️
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div
                        style={{
                          width: '44px',
                          height: '52px',
                          borderRadius: '8px',
                          border: '1.5px dashed #CBD5E1',
                          overflow: 'hidden',
                          flexShrink: 0,
                          backgroundColor: '#F1F5F9',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#94A3B8',
                          gap: '2px',
                        }}
                        title="Dokumen belum diunggah oleh pemohon"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                          note_add
                        </span>
                        <span style={{ fontSize: '0.6rem', fontWeight: 600 }}>Kosong</span>
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#0F172A', lineHeight: 1.3 }}>
                        {docIdx + 1}. {doc.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                        {isRealUploaded ? (
                          <span style={{ fontSize: '0.68rem', backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0', padding: '1px 8px', borderRadius: '4px', fontWeight: 600 }}>
                            ✓ Diunggah Pemohon
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.68rem', backgroundColor: '#FEF3C7', color: '#B45309', padding: '1px 8px', borderRadius: '4px', fontWeight: 600 }}>
                            Belum Diunggah
                          </span>
                        )}
                        {realUrl ? (
                          <a
                            href={realUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Dokumen fisik tersimpan di Supabase Cloud Storage CDN. Klik untuk membuka di tab baru."
                            style={{
                              fontSize: '0.68rem',
                              backgroundColor: '#EFF6FF',
                              color: '#1D4ED8',
                              border: '1px solid #BFDBFE',
                              padding: '1px 8px',
                              borderRadius: '4px',
                              fontWeight: 700,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            ☁️ Cloud CDN ↗
                          </a>
                        ) : null}
                        <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                          {isRealUploaded ? (
                            <span>
                              📄 {docFile?.name || 'Dokumen Asli'} ({docFile?.sizeKB || Math.round((realBase64!.length * 0.75) / 1024)} KB)
                            </span>
                          ) : (
                            <span>• {doc.note}</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons: LIHAT, CETAK, UNDUH & UPLOAD FISIK */}
                  <div className="detail-doc-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
                    {isRealUploaded ? (
                      <>
                        {/* Tombol Utama: LIHAT DOKUMEN */}
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewDoc({
                              title: `${doc.title} - ${currentPengajuan.namaPemohon}`,
                              base64: realBase64!,
                              fileName: docFile?.name || `${doc.key}_${currentPengajuan.namaPemohon}.jpg`,
                              isSample: false,
                              url: realUrl,
                            })
                          }
                          style={{
                            background: '#005BB5',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '7px 13px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            boxShadow: '0 2px 6px rgba(0, 91, 181, 0.25)',
                          }}
                          title="Lihat dokumen asli yang diunggah pemohon"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                            visibility
                          </span>
                          <span>Lihat Dokumen</span>
                        </button>

                        {/* Tombol Cetak Dokumen Asli */}
                        <button
                          type="button"
                          onClick={() => handlePrintSingleDoc(doc.title, realBase64!, realUrl)}
                          style={{
                            background: '#F1F5F9',
                            color: '#0F172A',
                            border: '1px solid #CBD5E1',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          title="Cetak dokumen ini langsung ke printer"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#005BB5' }}>
                            print
                          </span>
                          <span>Cetak</span>
                        </button>

                        {/* Tombol Unduh */}
                        <button
                          type="button"
                          onClick={() => handleDownloadDoc(doc.title, realBase64!, docFile?.name)}
                          style={{
                            background: '#FFFFFF',
                            color: '#475569',
                            border: '1px solid #CBD5E1',
                            borderRadius: '8px',
                            padding: '6px 11px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          title="Unduh dokumen asli pemohon ke laptop"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                            download
                          </span>
                          <span>Unduh</span>
                        </button>

                        {/* Tombol Ganti Berkas */}
                        <label
                          style={{
                            background: '#FFFFFF',
                            color: '#475569',
                            border: '1px dashed #94A3B8',
                            borderRadius: '8px',
                            padding: '6px 11px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: isUploadingDoc === doc.key ? 'wait' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          title="Ganti berkas dengan foto/scan baru"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                            upload_file
                          </span>
                          <span>{isUploadingDoc === doc.key ? 'Mengunggah...' : 'Ganti'}</span>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            style={{ display: 'none' }}
                            disabled={isUploadingDoc === doc.key}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleUploadDoc(doc.key, f);
                            }}
                          />
                        </label>

                        {/* Tombol Hapus Berkas */}
                        <button
                          type="button"
                          onClick={() => handleDeleteDoc(doc.key, doc.title)}
                          style={{
                            background: '#FFFFFF',
                            color: '#DC2626',
                            border: '1px solid #FECACA',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                          title="Hapus berkas ini permanen dari Database & Storage"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#DC2626' }}>
                            delete
                          </span>
                          <span>Hapus</span>
                        </button>
                      </>
                    ) : (
                      /* Jika Belum Diunggah: Cukup Tombol Upload Fisik (Contoh Template & Unduh Dummy Dihapus) */
                      <label
                        style={{
                          background: '#EFF6FF',
                          color: '#005BB5',
                          border: '1.5px solid #005BB5',
                          borderRadius: '8px',
                          padding: '6px 14px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: isUploadingDoc === doc.key ? 'wait' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          boxShadow: '0 1px 4px rgba(0, 91, 181, 0.15)',
                        }}
                        title="Unggah scan/foto berkas fisik pemohon langsung ke database MapahTrip"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                          upload_file
                        </span>
                        <span>{isUploadingDoc === doc.key ? 'Mengunggah...' : 'Upload Fisik'}</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          style={{ display: 'none' }}
                          disabled={isUploadingDoc === doc.key}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUploadDoc(doc.key, f);
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {pengajuan.noResi && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                borderRadius: '10px',
                background: 'var(--surface-container)',
                fontSize: '0.8rem',
              }}
            >
              <div style={{ color: 'var(--on-surface-variant)', fontWeight: 600 }}>
                {(() => {
                  const lower = (pengajuan.noResi || '').toLowerCase();
                  if (lower.includes('soehatta') || lower.includes('soetta') || lower.includes('soekarno') || lower.includes('bandara') || lower.includes('flight') || lower.includes('airport')) {
                    return '✈️ Metode Penyerahan Paspor (Bandara):';
                  }
                  if (lower.includes('diambil') || lower.includes('kantor') || lower.includes('langsung')) {
                    return '🏢 Metode Pengambilan Paspor:';
                  }
                  return '📦 Nomor Resi Kurir Pengiriman:';
                })()}
              </div>
              <div style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary)', marginTop: '2px', fontSize: '0.88rem' }}>
                {pengajuan.noResi}
              </div>
            </div>
          )}
        </div>

        {/* Column 2: OWNER ONLY (Keuangan Pengajuan & Verifikasi Pembayaran) vs STAFF (Penugasan & Jadwal Konsuler) */}
        {isOwner ? (
          <div className="card detail-keuangan-card" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #F0FDF4 100%)', border: '1px solid #A7F3D0', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.06)' }}>
            <div className="detail-keuangan-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#059669' }}>
                  payments
                </span>
                <h3 className="font-serif" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#064E3B', margin: 0 }}>
                  Verifikasi Pembayaran &amp; Keuangan
                </h3>
              </div>
              <div className="detail-keuangan-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {currentPengajuan.statusPembayaran === 'Menunggu Pembayaran' ? (
                  currentPengajuan.buktiBayarPemohon ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
                      <span
                        style={{
                          backgroundColor: '#FFFBEB',
                          color: '#B45309',
                          border: '1px solid #FCD34D',
                          padding: '5px 10px',
                          borderRadius: '8px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#D97706', display: 'inline-block' }} />
                        <span>Struk Terunggah</span>
                      </span>

                      <button
                        type="button"
                        onClick={handleToggleStatusBayar}
                        className="btn-struk-verify"
                        style={{
                          background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                          color: '#FFFFFF',
                          border: 'none',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          padding: '6px 14px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                        title="Customer telah mengunggah bukti struk transfer! Klik di sini untuk mengonfirmasi status menjadi Lunas"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>verified</span>
                        <span>Verifikasi Lunas ✓</span>
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span
                        className="badge badge-warning"
                        style={{ cursor: 'pointer', fontWeight: 700 }}
                        onClick={handleToggleStatusBayar}
                        title="Klik untuk ubah status pembayaran"
                      >
                        ⏳ Menunggu Bayar
                      </span>
                      <button
                        type="button"
                        onClick={handleToggleStatusBayar}
                        style={{
                          background: '#F1F5F9',
                          border: '1px solid #CBD5E1',
                          color: '#475569',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '5px',
                          cursor: 'pointer',
                        }}
                        title="Ubah status bayar manual"
                      >
                        Ubah
                      </button>
                    </div>
                  )
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        backgroundColor: '#DCFCE7',
                        color: '#15803D',
                        border: '1px solid #86EFAC',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        cursor: 'pointer',
                      }}
                      onClick={handleToggleStatusBayar}
                      title="Status Lunas (100%). Klik jika ingin mengubah kembali."
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>check_circle</span>
                      <span>Lunas (100%)</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleToggleStatusBayar}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        color: '#64748B',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        padding: '2px 7px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                      title="Batalkan status lunas"
                    >
                      Ubah
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Uang Masuk Pemohon */}
              <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '10px', border: '1px solid #A7F3D0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--on-surface-variant)', fontWeight: 600 }}>Nominal Dibayar Pemohon:</span>
                  <strong style={{ fontFamily: 'monospace', fontSize: '1.05rem', color: '#0F172A', flexShrink: 0 }}>
                    {formatRupiah(currentPengajuan.dibayarPemohon)}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.78rem', color: '#64748B', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ flexShrink: 0 }}>Rekening / Metode:</span>
                  <span style={{ fontWeight: 600, color: '#1E293B', textAlign: 'right', wordBreak: 'break-word', flex: 1, minWidth: '140px' }}>
                    {currentPengajuan.metodePembayaran || 'Transfer BTN (119001500015870) - Tokyo Asia Connection'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#64748B', gap: '8px', flexWrap: 'wrap' }}>
                  <span>Tgl Pembayaran:</span>
                  <span style={{ fontWeight: 600, color: '#1E293B', flexShrink: 0 }}>
                    {currentPengajuan.tglBayarPemohon || currentPengajuan.tglBerkasMasuk || 'Hari Ini'}
                  </span>
                </div>

                {/* Struk Bukti Transfer Pemohon */}
                <div style={{ marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 600 }}>Bukti Struk Transfer:</span>
                    {currentPengajuan.buktiBayarPemohon && currentPengajuan.statusPembayaran === 'Menunggu Pembayaran' && (
                      <span style={{ backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D', fontSize: '0.66rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                        ⚡ Butuh Verifikasi
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {currentPengajuan.buktiBayarPemohon ? (
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewDoc({
                            title: `Struk Transfer - ${currentPengajuan.namaPemohon}`,
                            base64: currentPengajuan.buktiBayarPemohon!,
                            fileName: currentPengajuan.buktiBayarNama || 'Struk_Pembayaran.jpg',
                            url: currentPengajuan.buktiBayarUrl,
                          })
                        }
                        style={{
                          background: '#ECFDF5',
                          border: '1px solid #A7F3D0',
                          color: '#065F46',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                          visibility
                        </span>
                        <span>Lihat Struk</span>
                      </button>
                    ) : null}

                    <label
                      style={{
                        background: currentPengajuan.buktiBayarPemohon ? '#F8FAFC' : '#EFF6FF',
                        border: currentPengajuan.buktiBayarPemohon ? '1px solid #CBD5E1' : '1px solid #BFDBFE',
                        color: currentPengajuan.buktiBayarPemohon ? '#475569' : '#1D4ED8',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                        upload_file
                      </span>
                      <span>{currentPengajuan.buktiBayarPemohon ? 'Ganti' : '+ Upload Struk'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadBuktiBayar(file);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Rincian Biaya Modal & Komisi Referral */}
              <div className="detail-finance-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--on-surface-variant)' }}>Biaya Konsulat &amp; Modal Keluar:</span>
                  <button
                    type="button"
                    onClick={handleOpenEditPaket}
                    style={{
                      backgroundColor: '#EFF6FF',
                      color: '#1D4ED8',
                      border: '1px solid #BFDBFE',
                      borderRadius: '6px',
                      padding: '2px 8px',
                      fontSize: '0.70rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                    title="Edit pemasukan & pengeluaran modal pemohon"
                  >
                    <span>✏️ Edit Keuangan &amp; Modal</span>
                  </button>
                </div>
                <span style={{ fontFamily: 'monospace', color: 'var(--error)', fontWeight: 700, flexShrink: 0, fontSize: '0.90rem' }}>
                  - {formatRupiah(currentPengajuan.nominalKeluar)}
                </span>
              </div>

              {/* Komisi Referral untuk Mitra Affiliate (Hanya jika mendaftar dengan kode mitra) */}
              {(() => {
                const hasMitra = Boolean(
                  currentPengajuan.affiliateCode &&
                  currentPengajuan.affiliateCode.trim() !== '' &&
                  currentPengajuan.affiliateCode.toUpperCase() !== 'MAPAHTRIP'
                );
                const refFeeVal = currentPengajuan.referralFee > 0
                  ? currentPengajuan.referralFee
                  : (hasMitra ? 100000 : 0);

                if (hasMitra && refFeeVal > 0) {
                  return (
                    <div className="detail-finance-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--on-surface-variant)' }}>
                          Komisi Referral Mitra ({currentPengajuan.affiliateCode}):
                        </span>
                        <button
                          type="button"
                          onClick={handleOpenEditPaket}
                          style={{
                            backgroundColor: '#FEF3C7',
                            color: '#B45309',
                            border: '1px solid #FDE68A',
                            padding: '1px 6px',
                            borderRadius: '5px',
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                          title="Klik untuk mengubah besaran komisi referral mitra"
                        >
                          ✏️ Ubah Komisi
                        </button>
                      </div>
                      <span style={{ fontFamily: 'monospace', color: '#D97706', fontWeight: 700, flexShrink: 0 }}>
                        - {formatRupiah(refFeeVal)}
                      </span>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Alokasi Fee Staf PIC (Operasional Pengurangan Laba) */}
              {(() => {
                const isW = (currentPengajuan.program || '').toLowerCase().includes('waiver');
                const staffFeeVal = isW
                  ? 0
                  : (currentPengajuan.staffFee !== undefined && currentPengajuan.staffFee !== null
                    ? currentPengajuan.staffFee
                    : (currentPengajuan.cashback !== undefined && currentPengajuan.cashback !== null
                      ? currentPengajuan.cashback
                      : (currentPengajuan.staffPic ? 50000 : 0)));

                return (
                  <div
                    className="detail-finance-row"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.85rem',
                      gap: '8px',
                      flexWrap: 'wrap',
                      backgroundColor: '#F8FAFC',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ color: '#475569', fontWeight: 600 }}>
                        Alokasi Fee Staf PIC ({currentPengajuan.staffPic || 'Staf'}):
                      </span>
                      {staffFeeVal === 0 ? (
                        <span style={{ backgroundColor: '#F1F5F9', color: '#64748B', border: '1px solid #CBD5E1', padding: '1px 7px', borderRadius: '5px', fontSize: '0.66rem', fontWeight: 700 }}>
                          Tanpa Fee Staf
                        </span>
                      ) : currentPengajuan.staffPayoutStatus === 'Berhasil Ditransfer' ? (
                        <span style={{ backgroundColor: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', padding: '1px 7px', borderRadius: '5px', fontSize: '0.66rem', fontWeight: 800 }}>
                          ✓ Ditransfer
                        </span>
                      ) : (
                        <span style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', padding: '1px 7px', borderRadius: '5px', fontSize: '0.66rem', fontWeight: 700 }}>
                          ⏳ Belum Ditransfer
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={handleOpenEditPaket}
                        style={{
                          backgroundColor: '#EEF2FF',
                          color: '#4F46E5',
                          border: '1px solid #C7D2FE',
                          padding: '1px 6px',
                          borderRadius: '5px',
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                        title="Klik untuk mengubah besaran fee staf PIC"
                      >
                        ✏️ Ubah Fee
                      </button>
                    </div>
                    <span style={{ fontFamily: 'monospace', color: staffFeeVal > 0 ? '#4F46E5' : '#64748B', fontWeight: 700, flexShrink: 0 }}>
                      {staffFeeVal > 0 ? `- ${formatRupiah(staffFeeVal)}` : 'Rp 0'}
                    </span>
                  </div>
                );
              })()}

              {/* Fee Bersih & Margin Riil (Simpel & Transparan: Pemasukan - Modal Keluar - Komisi Mitra - Fee Staf) */}
              {(() => {
                const hasMitra = Boolean(
                  currentPengajuan.affiliateCode &&
                  currentPengajuan.affiliateCode.trim() !== '' &&
                  currentPengajuan.affiliateCode.toUpperCase() !== 'MAPAHTRIP'
                );
                const refFeeVal = currentPengajuan.referralFee > 0
                  ? currentPengajuan.referralFee
                  : (hasMitra ? 100000 : 0);
                const staffFeeVal = currentPengajuan.staffFee !== undefined && currentPengajuan.staffFee !== null
                  ? currentPengajuan.staffFee
                  : (currentPengajuan.cashback !== undefined && currentPengajuan.cashback !== null
                    ? currentPengajuan.cashback
                    : (currentPengajuan.staffPic ? 50000 : 0));

                const calculatedFee = Math.max(
                  0,
                  (currentPengajuan.dibayarPemohon || 0) -
                    (currentPengajuan.nominalKeluar || 0) -
                    refFeeVal -
                    staffFeeVal
                );
                const displayFee = calculatedFee;
                const marginPercent = ((displayFee / (currentPengajuan.dibayarPemohon || 1)) * 100).toFixed(1);

                return (
                  <div
                    className="detail-finance-fee-bersih"
                    style={{
                      borderTop: '2px dashed rgba(16, 185, 129, 0.4)',
                      paddingTop: '12px',
                      marginTop: '4px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.74rem', color: '#047857', textTransform: 'uppercase', fontWeight: 800 }}>
                        Fee Bersih MapahTrip
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700, marginTop: '2px' }}>
                        Margin Laba: {marginPercent}% &bull; (Pemasukan − Modal − Komisi − Fee Staf)
                      </div>
                    </div>
                    <span
                      className="font-serif font-mono-tabular"
                      style={{ fontSize: '1.45rem', fontWeight: 800, color: '#047857', flexShrink: 0 }}
                    >
                      {formatRupiah(displayFee)}
                    </span>
                  </div>
                );
              })()}

              {currentPengajuan.affiliateCode && (
                <div
                  className="detail-finance-mitra-box"
                  style={{
                    marginTop: '4px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    fontSize: '0.78rem',
                    color: '#065F46',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span>Kode Mitra Terdaftar:</span>
                  <strong style={{ color: '#047857', flexShrink: 0 }}>{currentPengajuan.affiliateCode}</strong>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '8px' }}>
              <h3 className="font-serif" style={{ fontSize: '1.08rem', fontWeight: 700, margin: 0, minWidth: 0 }}>
                Penugasan &amp; Jadwal Konsuler
              </h3>
              <span className="badge badge-success" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                ✓ Terverifikasi
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--on-surface-variant)' }}>Konsulat Yurisdiksi:</span>
                <strong>Konsjen {pengajuan.konsjen}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--on-surface-variant)' }}>Staff PIC Bertugas:</span>
                <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{pengajuan.staffPic}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--on-surface-variant)' }}>Paket Layanan:</span>
                <button
                  type="button"
                  onClick={handleOpenEditPaket}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    backgroundColor: '#F8FAFC',
                    fontSize: '0.80rem',
                    fontWeight: 700,
                    color: '#005BB5',
                    cursor: 'pointer',
                  }}
                  title="Klik untuk ubah paket pemohon ini"
                >
                  <span>{currentPengajuan.paket || 'Reguler'}</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>edit</span>
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--on-surface-variant)' }}>Tgl Apply ke Konsulat:</span>
                <span style={{ fontWeight: 600 }}>{pengajuan.tglApply}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--on-surface-variant)' }}>Estimasi Pengambilan:</span>
                <span style={{ fontWeight: 600, color: 'var(--success)' }}>{pengajuan.tglEstimasiSelesai}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--on-surface-variant)' }}>Status Administrasi:</span>
                {currentPengajuan.statusPembayaran === 'Lunas' ? (
                  <span style={{ backgroundColor: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', padding: '3px 8px', borderRadius: '6px', fontSize: '0.76rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span>✓</span>
                    <span>Lunas (Siap Apply JVAC)</span>
                  </span>
                ) : (
                  <span style={{ backgroundColor: '#FFFBEB', color: '#B45309', border: '1px solid #FCD34D', padding: '3px 8px', borderRadius: '6px', fontSize: '0.76rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span>⏳</span>
                    <span>Belum Lunas (Tahan Berkas)</span>
                  </span>
                )}
              </div>

              {/* Peringatan khusus staf jika customer belum bayar */}
              {currentPengajuan.statusPembayaran !== 'Lunas' && (
                <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '8px 10px', fontSize: '0.74rem', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '8px', lineHeight: 1.3 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#DC2626', flexShrink: 0 }}>
                    warning
                  </span>
                  <span>
                    <strong>Pemberitahuan Staf:</strong> Pemohon belum lunas. Tahan penyerahan berkas ke JVAC sampai status diverifikasi Lunas oleh Owner/Admin.
                  </span>
                </div>
              )}

              {/* Info Struk Transfer jika customer sudah unggah */}
              {currentPengajuan.buktiBayarPemohon && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--on-surface-variant)' }}>Bukti Struk Transfer:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewDoc({
                        title: `Struk Transfer - ${currentPengajuan.namaPemohon}`,
                        base64: currentPengajuan.buktiBayarPemohon!,
                        fileName: currentPengajuan.buktiBayarNama || 'Struk_Pembayaran.jpg',
                      })
                    }
                    style={{
                      background: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      color: '#065F46',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>visibility</span>
                    <span>Lihat Struk</span>
                  </button>
                </div>
              )}

              {pengajuan.affiliateCode && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--on-surface-variant)' }}>Mitra Pengirim:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{pengajuan.affiliateCode}</span>
                </div>
              )}

              {/* Catatan / Log Riwayat Pemohon */}
              {currentPengajuan.catatan && (
                <div style={{ marginTop: '4px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#005BB5' }}>edit_note</span>
                    <strong style={{ fontSize: '0.78rem', color: '#0F172A' }}>Catatan &amp; Riwayat:</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontWeight: 500 }}>
                    {currentPengajuan.catatan}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Lightbox Pratinjau Dokumen / Foto */}
      {previewDoc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setPreviewDoc(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '850px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 24px',
                borderBottom: '1px solid #E2E8F0',
                background: previewDoc.isSample ? '#FFFBEB' : '#F8FAFC',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  className="material-symbols-outlined"
                  style={{ color: previewDoc.isSample ? '#D97706' : '#2B68E0', fontSize: '24px' }}
                >
                  {previewDoc.isSample ? 'help_outline' : 'verified'}
                </span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{previewDoc.title}</span>
                    {previewDoc.isSample ? (
                      <span style={{ fontSize: '0.68rem', backgroundColor: '#FEF3C7', color: '#92400E', padding: '1px 8px', borderRadius: '4px', fontWeight: 700 }}>
                        Contoh Template Konsulat
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.68rem', backgroundColor: '#DCFCE7', color: '#15803D', padding: '1px 8px', borderRadius: '4px', fontWeight: 700 }}>
                        ✓ Dokumen Asli Pemohon
                      </span>
                    )}
                    {previewDoc.url && (
                      <a
                        href={previewDoc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="File tersimpan di Supabase Cloud Storage CDN. Klik untuk buka langsung."
                        style={{
                          fontSize: '0.68rem',
                          backgroundColor: '#EFF6FF',
                          color: '#1D4ED8',
                          border: '1px solid #BFDBFE',
                          padding: '1px 8px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        ☁️ Supabase Cloud Storage ↗
                      </a>
                    )}
                  </div>
                  {previewDoc.fileName && (
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      Nama Berkas: {previewDoc.fileName}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '22px',
                  cursor: 'pointer',
                  color: '#64748B',
                  lineHeight: 1,
                  padding: '6px',
                  borderRadius: '6px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Gambar atau Iframe PDF */}
            <div
              style={{
                padding: '20px',
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#0F172A',
                minHeight: '400px',
              }}
            >
              {previewDoc.base64.startsWith('data:application/pdf') ? (
                <iframe
                  src={previewDoc.base64}
                  title={previewDoc.title}
                  style={{ width: '100%', height: '65vh', border: 'none', borderRadius: '8px' }}
                />
              ) : (
                <img
                  src={previewDoc.base64}
                  alt={previewDoc.title}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '65vh',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                  }}
                />
              )}
            </div>

            {/* Footer Modal */}
            <div
              style={{
                padding: '14px 24px',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#F8FAFC',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                {previewDoc.isSample
                  ? 'Format acuan standar Konsulat Jenderal Jepang'
                  : `Dokumen Arsip: ${currentPengajuan.namaPemohon} (${currentPengajuan.noPengajuan})`}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {previewDoc.url && (
                  <a
                    href={previewDoc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{
                      padding: '8px 14px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      textDecoration: 'none',
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      color: '#0F172A',
                      borderRadius: '8px',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#2563EB' }}>
                      open_in_new
                    </span>
                    <span>Buka URL CDN Asli ↗</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handlePrintSingleDoc(previewDoc.title, previewDoc.base64, previewDoc.url)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    color: '#0F172A',
                    borderRadius: '8px',
                  }}
                  title="Cetak dokumen ini ke printer"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#005BB5' }}>
                    print
                  </span>
                  <span>Cetak Dokumen</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadDoc(previewDoc.title, previewDoc.base64, previewDoc.fileName)}
                  className="btn btn-primary"
                  style={{
                    padding: '8px 18px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    download
                  </span>
                  <span>Unduh Dokumen</span>
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.82rem', fontWeight: 600 }}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ubah Paket Layanan Visa */}
      {isEditingPaket && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={() => setIsEditingPaket(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'modalSlideUp 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid #E2E8F0',
                background: 'linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#005BB5',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>inventory_2</span>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: '#0F172A' }}>
                    Ubah Paket &amp; Atur Keuangan Pemohon
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: '#64748B' }}>
                    Sesuaikan paket, uang dibayar pemohon (pemasukan), dan modal keluar konsulat (pengeluaran)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingPaket(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Info Pemohon */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '8px',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block' }}>Nama Pemohon</span>
                  <strong style={{ fontSize: '0.82rem', color: '#0F172A' }}>{currentPengajuan.namaPemohon}</strong>
                  <span style={{ fontSize: '0.68rem', color: '#94A3B8', display: 'block', fontFamily: 'monospace' }}>
                    {currentPengajuan.noPengajuan || currentPengajuan.noPaspor}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block' }}>Program &amp; Wilayah</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1E40AF' }}>{currentPengajuan.program}</span>
                  <span style={{ fontSize: '0.70rem', color: '#64748B', display: 'block' }}>Konsjen {currentPengajuan.konsjen}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block' }}>Paket Saat Ini</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        backgroundColor: '#E2E8F0',
                        color: '#334155',
                      }}
                    >
                      {currentPengajuan.paket || 'Reguler'}
                    </span>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0F172A' }}>
                      Rp {Number(currentPengajuan.dibayarPemohon || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: currentPengajuan.statusPembayaran === 'Lunas' ? '#16A34A' : '#D97706', fontWeight: 600 }}>
                    ● {currentPengajuan.statusPembayaran || 'Menunggu Bayar'}
                  </span>
                </div>

                {currentPengajuan.catatan && (
                  <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed #CBD5E1', paddingTop: '6px', marginTop: '2px' }}>
                    <span style={{ fontSize: '0.66rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#005BB5' }}>sticky_note_2</span>
                      Catatan Sebelumnya:
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#334155', fontWeight: 600 }}>
                      {currentPengajuan.catatan}
                    </span>
                  </div>
                )}
              </div>

              {/* Pilihan 3 Paket Layanan */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
                  PILIH PAKET LAYANAN BARU:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {(['Reguler', 'Premium', 'TAC'] as PaketVisa[]).map((pkt) => {
                    const isSelected = selectedPaket === pkt;
                    const pktPrice = getVisaPrice(currentPengajuan.program, pkt);
                    const isCurrent = (currentPengajuan.paket || 'Reguler') === pkt;

                    return (
                      <div
                        key={pkt}
                        onClick={() => handleSelectNewPaket(pkt)}
                        style={{
                          border: isSelected ? '2px solid #005BB5' : '1px solid #E2E8F0',
                          backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                          borderRadius: '12px',
                          padding: '10px 6px',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          boxShadow: isSelected ? '0 4px 12px rgba(0, 91, 181, 0.12)' : 'none',
                          minWidth: 0,
                        }}
                      >
                        {isCurrent && (
                          <span
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: isSelected ? '24px' : '6px',
                              backgroundColor: '#64748B',
                              color: '#FFFFFF',
                              fontSize: '0.54rem',
                              fontWeight: 800,
                              padding: '1px 5px',
                              borderRadius: '4px',
                            }}
                          >
                            Aktif
                          </span>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <span
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              color: pkt === 'TAC' ? '#4338CA' : pkt === 'Premium' ? '#B45309' : '#334155',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {pkt === 'TAC' ? '⚡ TAC' : pkt === 'Premium' ? '★ Premium' : '📋 Reguler'}
                          </span>
                          {isSelected && (
                            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#005BB5' }}>
                              check_circle
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.64rem', color: '#64748B', marginBottom: '6px', lineHeight: 1.25 }}>
                          {pkt === 'TAC'
                            ? 'All-in & VIP'
                            : pkt === 'Premium'
                            ? 'Fast-track'
                            : 'Standar'}
                        </div>

                        <div style={{ marginTop: 'auto', paddingTop: '6px', borderTop: '1px dashed #E2E8F0' }}>
                          <span style={{ fontSize: '0.60rem', color: '#94A3B8', display: 'block', whiteSpace: 'nowrap' }}>Master Tarif:</span>
                          <strong
                            style={{
                              fontSize: 'clamp(0.68rem, 2.5vw, 0.78rem)',
                              color: '#0F172A',
                              whiteSpace: 'nowrap',
                              display: 'block',
                              letterSpacing: '-0.3px',
                            }}
                          >
                            Rp&nbsp;{Number(pktPrice || 0).toLocaleString('id-ID')}
                          </strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Input Dua Kolom: Pemasukan (Dibayar Pemohon) & Pengeluaran (Modal Keluar) */}
              <div className="modal-finance-inputs-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                {/* Kolom 1: Pemasukan Dibayar Pemohon */}
                <div className="modal-finance-col">
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                    1. Nominal Dibayar Pemohon (Pemasukan):
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <span
                        style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontWeight: 700,
                          fontSize: '0.80rem',
                          color: '#64748B',
                        }}
                      >
                        Rp
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={nominalBiaya === 0 ? '' : nominalBiaya}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/[^0-9]/g, '');
                          setNominalBiaya(clean === '' ? 0 : Number(clean));
                        }}
                        placeholder="0"
                        style={{
                          width: '100%',
                          padding: '8px 10px 8px 36px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          fontSize: '0.88rem',
                          fontWeight: 700,
                          color: '#0F172A',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const master = getVisaPrice(currentPengajuan.program, selectedPaket);
                        setNominalBiaya(master);
                      }}
                      style={{
                        padding: '8px 10px',
                        backgroundColor: '#F1F5F9',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        fontSize: '0.70rem',
                        fontWeight: 700,
                        color: '#475569',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                      title="Kembalikan ke Master Tarif Paket"
                    >
                      Reset Master
                    </button>
                  </div>
                  <div style={{ fontSize: '0.66rem', color: '#64748B', marginTop: '3px', fontFamily: 'monospace' }}>
                    Terbaca: <strong>Rp {nominalBiaya.toLocaleString('id-ID')}</strong>
                  </div>
                </div>

                {/* Kolom 2: Modal Keluar / Pengeluaran Konsulat */}
                <div className="modal-finance-col">
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#DC2626', marginBottom: '4px' }}>
                    2. Modal Keluar Konsulat (Pengeluaran):
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <span
                        style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontWeight: 700,
                          fontSize: '0.80rem',
                          color: '#DC2626',
                        }}
                      >
                        Rp
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={nominalKeluarEdit === 0 ? '' : nominalKeluarEdit}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/[^0-9]/g, '');
                          setNominalKeluarEdit(clean === '' ? 0 : Number(clean));
                        }}
                        placeholder="0"
                        style={{
                          width: '100%',
                          padding: '8px 10px 8px 36px',
                          borderRadius: '8px',
                          border: '1px solid #FCA5A5',
                          backgroundColor: '#FEF2F2',
                          fontSize: '0.88rem',
                          fontWeight: 700,
                          color: '#DC2626',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setNominalKeluarEdit(1940000)}
                      style={{
                        padding: '8px 10px',
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        borderRadius: '8px',
                        fontSize: '0.70rem',
                        fontWeight: 700,
                        color: '#1D4ED8',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                      title="Set standar modal konsulat 1.940.000"
                    >
                      1.94 jt
                    </button>
                  </div>
                  <div style={{ fontSize: '0.66rem', color: '#DC2626', marginTop: '3px', fontFamily: 'monospace' }}>
                    Pengeluaran: <strong>-Rp {nominalKeluarEdit.toLocaleString('id-ID')}</strong>
                  </div>
                </div>

                {/* Kolom 3: Fee Staf PIC (Operasional Pengurangan Laba) */}
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#4338CA', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>badge</span>
                      3. Fee Staf PIC ({currentPengajuan.staffPic || 'Staf'}):
                    </label>
                    <span style={{ fontSize: '0.66rem', color: '#6366F1', fontWeight: 600, backgroundColor: '#EEF2FF', padding: '1px 6px', borderRadius: '4px' }}>
                      Bisa Rp 0 (Opsional)
                    </span>
                  </div>
                  <div style={{ position: 'relative', width: '100%', marginBottom: '6px' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontWeight: 700,
                        fontSize: '0.80rem',
                        color: '#4F46E5',
                        userSelect: 'none',
                      }}
                    >
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={staffFeeEdit === 0 ? '' : staffFeeEdit}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/[^0-9]/g, '');
                        setStaffFeeEdit(clean === '' ? 0 : Number(clean));
                      }}
                      placeholder="0"
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 38px',
                        borderRadius: '8px',
                        border: '1.5px solid #C7D2FE',
                        backgroundColor: '#EEF2FF',
                        fontSize: '0.90rem',
                        fontWeight: 700,
                        color: '#4338CA',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  {/* Preset Nominal Cepat: Grid 4 Kolom Rapi */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                    {[
                      { val: 0, label: 'Rp 0' },
                      { val: 25000, label: '25 rb' },
                      { val: 50000, label: '50 rb (Std)' },
                      { val: 75000, label: '75 rb' },
                    ].map((btn) => (
                      <button
                        key={btn.val}
                        type="button"
                        onClick={() => setStaffFeeEdit(btn.val)}
                        style={{
                          padding: '7px 2px',
                          backgroundColor: staffFeeEdit === btn.val ? '#4F46E5' : '#FFFFFF',
                          color: staffFeeEdit === btn.val ? '#FFFFFF' : '#475569',
                          border: staffFeeEdit === btn.val ? '1.5px solid #4338CA' : '1px solid #CBD5E1',
                          borderRadius: '7px',
                          fontSize: '0.70rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                          boxShadow: staffFeeEdit === btn.val ? '0 2px 4px rgba(79, 70, 229, 0.2)' : 'none',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.66rem', color: '#4F46E5', marginTop: '5px', fontFamily: 'monospace' }}>
                    <span style={{ whiteSpace: 'nowrap' }}>
                      Alokasi Staf: <strong>-Rp&nbsp;{staffFeeEdit.toLocaleString('id-ID')}</strong>
                    </span>
                    <span style={{ color: '#64748B', whiteSpace: 'nowrap' }}>
                      {staffFeeEdit === 0 ? '(Tanpa potongan laba)' : `(Untuk ${currentPengajuan.staffPic || 'Staf'})`}
                    </span>
                  </div>
                </div>

                {/* Kolom 4: Komisi Referral Mitra (Hanya jika mendaftar dengan kode mitra) */}
                {(() => {
                  const hasMitra = Boolean(
                    currentPengajuan.affiliateCode &&
                    currentPengajuan.affiliateCode.trim() !== '' &&
                    currentPengajuan.affiliateCode.toUpperCase() !== 'MAPAHTRIP'
                  );
                  if (!hasMitra) return null;
                  return (
                    <div style={{ gridColumn: 'span 2' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '4px' }}>
                        <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#D97706' }}>
                          4. Komisi Referral Mitra ({currentPengajuan.affiliateCode}):
                        </label>
                        <span style={{ fontSize: '0.66rem', color: '#64748B' }}>
                          Bisa disesuaikan jika ada kenaikan fee mitra
                        </span>
                      </div>
                      <div style={{ position: 'relative', width: '100%', marginBottom: '6px' }}>
                        <span
                          style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontWeight: 700,
                            fontSize: '0.80rem',
                            color: '#D97706',
                          }}
                        >
                          Rp
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={referralFeeEdit === 0 ? '' : referralFeeEdit}
                          onChange={(e) => {
                            const clean = e.target.value.replace(/[^0-9]/g, '');
                            setReferralFeeEdit(clean === '' ? 0 : Number(clean));
                          }}
                          placeholder="0"
                          style={{
                            width: '100%',
                            padding: '8px 10px 8px 36px',
                            borderRadius: '8px',
                            border: '1px solid #FDE68A',
                            backgroundColor: '#FFFBEB',
                            fontSize: '0.88rem',
                            fontWeight: 700,
                            color: '#B45309',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                      {/* Preset Cepat 5 Kolom Rapi */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '5px' }}>
                        <button
                          type="button"
                          onClick={() => setReferralFeeEdit(0)}
                          style={{
                            padding: '7px 3px',
                            backgroundColor: referralFeeEdit === 0 ? '#D97706' : '#F1F5F9',
                            color: referralFeeEdit === 0 ? '#FFFFFF' : '#475569',
                            border: '1px solid #CBD5E1',
                            borderRadius: '7px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Rp 0
                        </button>
                        <button
                          type="button"
                          onClick={() => setReferralFeeEdit(50000)}
                          style={{
                            padding: '7px 3px',
                            backgroundColor: referralFeeEdit === 50000 ? '#D97706' : '#F1F5F9',
                            color: referralFeeEdit === 50000 ? '#FFFFFF' : '#475569',
                            border: '1px solid #CBD5E1',
                            borderRadius: '7px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          50 rb
                        </button>
                        <button
                          type="button"
                          onClick={() => setReferralFeeEdit(100000)}
                          style={{
                            padding: '7px 3px',
                            backgroundColor: referralFeeEdit === 100000 ? '#D97706' : '#FFFBEB',
                            color: referralFeeEdit === 100000 ? '#FFFFFF' : '#B45309',
                            border: '1px solid #FDE68A',
                            borderRadius: '7px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                          }}
                          title="Standar umum komisi referral mitra Rp 100.000"
                        >
                          100 rb
                        </button>
                        <button
                          type="button"
                          onClick={() => setReferralFeeEdit(150000)}
                          style={{
                            padding: '7px 3px',
                            backgroundColor: referralFeeEdit === 150000 ? '#D97706' : '#F1F5F9',
                            color: referralFeeEdit === 150000 ? '#FFFFFF' : '#475569',
                            border: '1px solid #CBD5E1',
                            borderRadius: '7px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          150 rb
                        </button>
                        <button
                          type="button"
                          onClick={() => setReferralFeeEdit(200000)}
                          style={{
                            padding: '7px 3px',
                            backgroundColor: referralFeeEdit === 200000 ? '#D97706' : '#F1F5F9',
                            color: referralFeeEdit === 200000 ? '#FFFFFF' : '#475569',
                            border: '1px solid #CBD5E1',
                            borderRadius: '7px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          200 rb
                        </button>
                      </div>
                      <div style={{ fontSize: '0.66rem', color: '#D97706', marginTop: '4px', fontFamily: 'monospace' }}>
                        Komisi Mitra: <strong>-Rp {referralFeeEdit.toLocaleString('id-ID')}</strong> (Diberikan ke mitra {currentPengajuan.affiliateCode})
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Live Preview Finansial: Rincian Struk Rapi & Transparan */}
              {(() => {
                const hasMitra = Boolean(
                  currentPengajuan.affiliateCode &&
                  currentPengajuan.affiliateCode.trim() !== '' &&
                  currentPengajuan.affiliateCode.toUpperCase() !== 'MAPAHTRIP'
                );
                const refFee = hasMitra ? referralFeeEdit : 0;
                const liveFee = Math.max(0, nominalBiaya - nominalKeluarEdit - refFee - staffFeeEdit);
                return (
                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '1.5px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '7px',
                    }}
                  >
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                      Ringkasan Pembagian Keuangan:
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', gap: '8px' }}>
                      <span style={{ color: '#475569', minWidth: 0 }}>1. Pemasukan Pemohon</span>
                      <strong style={{ color: '#0F172A', fontFamily: 'monospace', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        +Rp&nbsp;{nominalBiaya.toLocaleString('id-ID')}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', gap: '8px' }}>
                      <span style={{ color: '#DC2626', minWidth: 0 }}>2. Modal Keluar Konsulat</span>
                      <strong style={{ color: '#DC2626', fontFamily: 'monospace', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        -Rp&nbsp;{nominalKeluarEdit.toLocaleString('id-ID')}
                      </strong>
                    </div>
                    {hasMitra && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', gap: '8px' }}>
                        <span style={{ color: '#D97706', minWidth: 0 }}>3. Komisi Referral ({currentPengajuan.affiliateCode})</span>
                        <strong style={{ color: '#D97706', fontFamily: 'monospace', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          -Rp&nbsp;{refFee.toLocaleString('id-ID')}
                        </strong>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', gap: '8px' }}>
                      <span style={{ color: '#4F46E5', minWidth: 0 }}>{hasMitra ? '4' : '3'}. Fee Staf PIC ({currentPengajuan.staffPic || 'Staf'})</span>
                      <strong style={{ color: '#4F46E5', fontFamily: 'monospace', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        -Rp&nbsp;{staffFeeEdit.toLocaleString('id-ID')}
                      </strong>
                    </div>

                    {/* Banner Total Fee Bersih: Anti-Tabrakan & Jelas di HP */}
                    <div
                      style={{
                        backgroundColor: '#ECFDF5',
                        border: '1.5px solid #86EFAC',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        marginTop: '6px',
                      }}
                    >
                      <div style={{ fontSize: '0.68rem', color: '#166534', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                        FEE BERSIH MAPAHTRIP:
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                        <div style={{ fontSize: '1.30rem', color: '#15803D', fontFamily: 'monospace', fontWeight: 900, whiteSpace: 'nowrap' }}>
                          Rp&nbsp;{liveFee.toLocaleString('id-ID')}
                        </div>
                        <div style={{ fontSize: '0.64rem', color: '#166534', textAlign: 'right' }}>
                          Laba bersih setelah semua beban
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Status Pembayaran & Alert Selisih */}
              {(() => {
                const isLunas = currentPengajuan.statusPembayaran === 'Lunas';
                const selisih = nominalBiaya - (currentPengajuan.dibayarPemohon || 0);

                if (isLunas) {
                  if (selisih > 0) {
                    return (
                      <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '8px', padding: '10px 12px', fontSize: '0.74rem', color: '#92400E' }}>
                        <strong>⚠️ Catatan Pembayaran:</strong> Status pemohon saat ini sudah <strong>Lunas (Rp {Number(currentPengajuan.dibayarPemohon || 0).toLocaleString('id-ID')})</strong>. Karena upgrade paket, ada kekurangan bayar sebesar <strong>Rp {Number(selisih).toLocaleString('id-ID')}</strong> untuk ditagihkan.
                      </div>
                    );
                  }
                  if (selisih < 0) {
                    return (
                      <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '10px 12px', fontSize: '0.74rem', color: '#1E40AF' }}>
                        <strong>ℹ️ Catatan Pembayaran:</strong> Status pemohon saat ini sudah <strong>Lunas (Rp {Number(currentPengajuan.dibayarPemohon || 0).toLocaleString('id-ID')})</strong>. Karena penurunan paket, terdapat kelebihan bayar <strong>Rp {Number(Math.abs(selisih)).toLocaleString('id-ID')}</strong> untuk di-refund.
                      </div>
                    );
                  }
                }
                return (
                  <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '10px 12px', fontSize: '0.74rem', color: '#15803D' }}>
                    ✓ Tagihan otomatis diperbarui menjadi <strong>Rp {Number(nominalBiaya).toLocaleString('id-ID')}</strong> untuk Paket {selectedPaket}.
                  </div>
                );
              })()}

              {/* Catatan Perubahan (Opsional) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                  Catatan Alasan Perubahan (Opsional):
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Pemohon minta upgrade ke TAC untuk penanganan berkas all-in"
                  value={catatanPaket}
                  onChange={(e) => setCatatanPaket(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.75rem', boxSizing: 'border-box' }}
                />
              </div>

              {/* Action Buttons: Rapi, Sejajar & Responsif */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={handleKirimWAPaket}
                  style={{
                    width: '100%',
                    backgroundColor: '#ECFDF5',
                    color: '#047857',
                    border: '1px solid #A7F3D0',
                    padding: '9px 14px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                  title="Kirim pesan rincian paket ke WhatsApp pemohon (Opsional)"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#10B981' }}>chat</span>
                  <span>Kirim Pesan ke WA (Opsional)</span>
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', width: '100%' }}>
                  <button
                    type="button"
                    onClick={() => setIsEditingPaket(false)}
                    style={{
                      height: '42px',
                      backgroundColor: '#F1F5F9',
                      color: '#475569',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNewPaket}
                    style={{
                      height: '42px',
                      backgroundColor: '#005BB5',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.84rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0, 91, 181, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                    <span>Simpan Perubahan</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pratinjau & Cetak Tanda Terima / Invoice Resmi (In-App Modal - Bebas Popup Blocker & Freeze) */}
      {showPrintModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            overflowY: 'auto',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPrintModal(false);
          }}
        >
          <div
            style={{
              backgroundColor: '#f8fafc',
              borderRadius: '16px',
              maxWidth: '820px',
              width: '100%',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #cbd5e1',
              overflow: 'hidden',
            }}
          >
            {/* Modal Top Header Toolbar */}
            <div
              style={{
                padding: '14px 20px',
                backgroundColor: '#ffffff',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#005bb5' }}>
                  receipt_long
                </span>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                  Pratinjau Tanda Terima &amp; Invoice Resmi
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={executePrintDocument}
                  style={{
                    backgroundColor: '#005bb5',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(0, 91, 181, 0.3)',
                  }}
                  title="Cetak atau Simpan sebagai PDF"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>print</span>
                  <span>Cetak / Simpan PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  style={{
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                  <span>Tutup</span>
                </button>
              </div>
            </div>

            {/* Modal Body: Dokumen Kertas A4 */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  padding: '32px 36px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
                  fontSize: '12.5px',
                  color: '#1e293b',
                  lineHeight: 1.5,
                  maxWidth: '750px',
                  margin: '0 auto',
                }}
              >
                {/* Header Dokumen */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2.5px solid #005bb5', paddingBottom: '16px', marginBottom: '20px' }}>
                  <div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#005bb5', letterSpacing: '-0.5px' }}>
                      MapahTrip
                    </div>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>
                      Visa Jepang Specialist
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                      Website: mapahtrip.id • Email: info@mapahtrip.id<br />
                      Layanan Konsulat &amp; Kedutaan Jepang Resmi (Jakarta, Surabaya, Denpasar, Medan, Makassar)
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                      Tanda Terima &amp; Invoice
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                      No: <strong>MT-INV/{new Date().getFullYear()}/{currentPengajuan.id || '001'}</strong>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      Tanggal: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    <div
                      style={{
                        display: 'inline-block',
                        backgroundColor: currentPengajuan.statusPembayaran === 'Lunas' ? '#ecfdf5' : '#fffbeb',
                        color: currentPengajuan.statusPembayaran === 'Lunas' ? '#047857' : '#b45309',
                        border: `1px solid ${currentPengajuan.statusPembayaran === 'Lunas' ? '#a7f3d0' : '#fde68a'}`,
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '3px 10px',
                        borderRadius: '4px',
                        marginTop: '6px',
                      }}
                    >
                      {currentPengajuan.statusPembayaran === 'Lunas' ? 'LUNAS' : 'MENUNGGU PEMBAYARAN'}
                    </div>
                  </div>
                </div>

                {/* 2 Kolom: Identitas Pemohon & Rincian Pengurusan */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', backgroundColor: '#f8fafc' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#005bb5', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '8px' }}>
                      Identitas Pemohon
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                      <span style={{ color: '#64748b' }}>Nama Lengkap</span>
                      <strong style={{ color: '#0f172a' }}>{currentPengajuan.namaPemohon}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                      <span style={{ color: '#64748b' }}>Nomor Paspor</span>
                      <strong style={{ fontFamily: 'monospace' }}>{currentPengajuan.noPaspor || currentPengajuan.maskedPaspor}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                      <span style={{ color: '#64748b' }}>Nomor WhatsApp</span>
                      <span>{currentPengajuan.noTelp}</span>
                    </div>
                    {currentPengajuan.affiliateCode && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                        <span style={{ color: '#64748b' }}>Mitra Affiliate</span>
                        <strong style={{ color: '#92400e' }}>{currentPengajuan.affiliateCode}</strong>
                      </div>
                    )}
                  </div>

                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', backgroundColor: '#f8fafc' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#005bb5', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '8px' }}>
                      Rincian Pengurusan
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                      <span style={{ color: '#64748b' }}>ID Pengajuan</span>
                      <strong style={{ fontFamily: 'monospace' }}>#{currentPengajuan.id || 'MT-APPLY'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                      <span style={{ color: '#64748b' }}>Program Visa</span>
                      <strong style={{ color: '#005bb5' }}>{currentPengajuan.program}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                      <span style={{ color: '#64748b' }}>Wilayah Konsulat</span>
                      <span>Konsjen {currentPengajuan.konsjen}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                      <span style={{ color: '#64748b' }}>Paket Layanan</span>
                      <strong>{currentPengajuan.paket || 'Reguler'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                      <span style={{ color: '#64748b' }}>PIC Penanganan</span>
                      <span>{currentPengajuan.staffPic || 'Staf Admin'}</span>
                    </div>
                  </div>
                </div>

                {/* Tabel Biaya Layanan */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '18px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9' }}>
                      <th style={{ padding: '8px 10px', border: '1px solid #e2e8f0', textAlign: 'center', width: '35px', fontSize: '11px', fontWeight: 700, color: '#334155' }}>No</th>
                      <th style={{ padding: '8px 10px', border: '1px solid #e2e8f0', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#334155' }}>Deskripsi Layanan</th>
                      <th style={{ padding: '8px 10px', border: '1px solid #e2e8f0', textAlign: 'center', width: '120px', fontSize: '11px', fontWeight: 700, color: '#334155' }}>Paket</th>
                      <th style={{ padding: '8px 10px', border: '1px solid #e2e8f0', textAlign: 'right', width: '150px', fontSize: '11px', fontWeight: 700, color: '#334155' }}>Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '9px 10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>1</td>
                      <td style={{ padding: '9px 10px', border: '1px solid #e2e8f0' }}>
                        <strong>Pengurusan Visa Jepang: {currentPengajuan.program}</strong>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          Pemeriksaan kelengkapan dokumen, pra-verifikasi persyaratan, asistensi konsulat, dan pemantauan status berkas.
                        </div>
                      </td>
                      <td style={{ padding: '9px 10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 600 }}>
                        {currentPengajuan.paket || 'Reguler'}
                      </td>
                      <td style={{ padding: '9px 10px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 700 }}>
                        Rp {(currentPengajuan.dibayarPemohon || 0).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Total Box */}
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '12px 16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Total Biaya Pengurusan:</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      Status Pembayaran: <strong style={{ color: currentPengajuan.statusPembayaran === 'Lunas' ? '#047857' : '#b45309' }}>{currentPengajuan.statusPembayaran === 'Lunas' ? 'LUNAS' : 'MENUNGGU PEMBAYARAN'}</strong>
                    </div>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#005bb5' }}>
                    Rp {(currentPengajuan.dibayarPemohon || 0).toLocaleString('id-ID')}
                  </div>
                </div>

                {/* Ketentuan Resmi */}
                <div style={{ border: '1px dashed #cbd5e1', backgroundColor: '#fcfcfd', borderRadius: '6px', padding: '10px 12px', fontSize: '11px', color: '#64748b', lineHeight: 1.5, marginBottom: '26px' }}>
                  <div style={{ fontWeight: 700, color: '#334155', marginBottom: '3px' }}>Catatan &amp; Ketentuan Resmi:</div>
                  <ol style={{ paddingLeft: '16px' }}>
                    <li>Tanda terima ini merupakan bukti sah pendaftaran berkas pengajuan visa di MapahTrip.</li>
                    <li>Biaya pengurusan mencakup jasa konsultasi, asistensi berkas, penyiapan dokumen, dan pengantaran konsulat.</li>
                    <li>Persetujuan, masa berlaku, dan penerbitan visa sepenuhnya merupakan hak prerogatif Kedutaan Besar / Konsulat Jenderal Jepang.</li>
                  </ol>
                </div>

                {/* Tanda Tangan */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px', marginTop: '10px' }}>
                  <div style={{ textAlign: 'center', width: '200px' }}>
                    <div style={{ fontSize: '11.5px', color: '#64748b', marginBottom: '50px' }}>Pemohon Visa,</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', borderTop: '1px solid #94a3b8', paddingTop: '4px' }}>
                      {currentPengajuan.namaPemohon}
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>
                      Paspor: {currentPengajuan.noPaspor || currentPengajuan.maskedPaspor}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', width: '200px' }}>
                    <div style={{ fontSize: '11.5px', color: '#64748b', marginBottom: '50px' }}>MapahTrip Official,</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', borderTop: '1px solid #94a3b8', paddingTop: '4px' }}>
                      {currentPengajuan.staffPic || 'Tim Pelayanan Konsuler'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>Visa Jepang Specialist</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
