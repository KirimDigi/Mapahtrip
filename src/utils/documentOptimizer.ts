import { compressImageUnder100KB } from './imageCompressor';
import { compressPdfDocument } from './pdfCompressor';

export interface OptimizedDocumentResult {
  file: File;
  base64: string;
  sizeKB: number;
  originalSizeKB: number;
  reductionPercent: number;
}

/**
 * Pengoptimal Dokumen Cerdas (Universal)
 * Mendukung Gambar (JPG/PNG/WebP) dan Berkas PDF.
 * Memastikan hasil tetap jernih dan tajam untuk verifikasi visa Jepang,
 * namun ukurannya ditekan seringan mungkin agar kuota Supabase Storage tetap hemat.
 */
export async function optimizeDocumentUpload(file: File): Promise<OptimizedDocumentResult> {
  const originalSizeKB = Math.round(file.size / 1024);

  // 1. Jika berkas adalah Gambar (JPG, JPEG, PNG, WebP, HEIC)
  if (file.type.startsWith('image/')) {
    try {
      const comp = await compressImageUnder100KB(file, 95);
      const reduction = originalSizeKB > comp.compressedSizeKB
        ? Math.round(((originalSizeKB - comp.compressedSizeKB) / originalSizeKB) * 100)
        : 0;

      return {
        file: comp.file,
        base64: comp.base64,
        sizeKB: comp.compressedSizeKB,
        originalSizeKB,
        reductionPercent: reduction,
      };
    } catch (err) {
      console.warn('Gagal kompres gambar, membaca berkas asli:', err);
    }
  }

  // 2. Jika berkas adalah Dokumen PDF
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    try {
      const comp = await compressPdfDocument(file, 1300, 0.75);
      const reduction = originalSizeKB > comp.compressedSizeKB
        ? Math.round(((originalSizeKB - comp.compressedSizeKB) / originalSizeKB) * 100)
        : 0;

      return {
        file: comp.file,
        base64: comp.base64,
        sizeKB: comp.compressedSizeKB,
        originalSizeKB,
        reductionPercent: reduction,
      };
    } catch (err) {
      console.warn('Gagal kompres PDF, membaca berkas asli:', err);
    }
  }

  // 3. Fallback jika format lain atau gagal kompres
  const b64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  return {
    file,
    base64: b64,
    sizeKB: originalSizeKB,
    originalSizeKB,
    reductionPercent: 0,
  };
}

