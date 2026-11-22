import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set worker source untuk Vite
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

export interface PdfCompressionResult {
  file: File;
  base64: string;
  originalSizeKB: number;
  compressedSizeKB: number;
  pagesCompressed: number;
}

/**
 * Mengompresi file PDF secara client-side:
 * Mengoptimalkan halaman scan PDF agar ukurannya jauh lebih hemat (turun 60-80%)
 * dengan teks, stempel, dan foto yang tetap jelas dan tajam untuk konsulat.
 */
export async function compressPdfDocument(
  file: File,
  maxDimension: number = 1300,
  quality: number = 0.75
): Promise<PdfCompressionResult> {
  const originalSizeKB = Math.round(file.size / 1024);

  // Jika ukuran PDF sudah sangat kecil (<= 250 KB), tidak perlu dikompres ulang
  if (file.size <= 250 * 1024) {
    const base64 = await fileToBase64(file);
    return {
      file,
      base64,
      originalSizeKB,
      compressedSizeKB: originalSizeKB,
      pagesCompressed: 0,
    };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;

    // Batasi hingga maksimal 8 halaman untuk menjaga performa rendering di browser
    const pagesToProcess = Math.min(numPages, 8);
    const newPdfDoc = await PDFDocument.create();

    for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });

      // Hitung skala optimal agar dimensi tidak melampaui maxDimension
      let scale = 1.35; // Default ~100-130 DPI
      const maxOriginalDim = Math.max(viewport.width, viewport.height);
      if (maxOriginalDim * scale > maxDimension) {
        scale = maxDimension / maxOriginalDim;
      }

      const scaledViewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(scaledViewport.width);
      canvas.height = Math.round(scaledViewport.height);

      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      // Render halaman PDF ke canvas
      await page.render({
        canvasContext: ctx,
        viewport: scaledViewport,
      }).promise;

      // Ubah canvas ke JPEG kualitas optimal
      const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
      const jpegBytes = dataUrlToUint8Array(jpegDataUrl);

      // Sematkan gambar ke PDF baru
      const embeddedImage = await newPdfDoc.embedJpg(jpegBytes);
      const newPage = newPdfDoc.addPage([viewport.width, viewport.height]);
      newPage.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height,
      });
    }

    const compressedBytes = await newPdfDoc.save();
    const compressedSizeKB = Math.round(compressedBytes.length / 1024);

    // Jika hasil kompresi ternyata lebih besar dari file asli, gunakan file asli
    if (compressedSizeKB >= originalSizeKB) {
      const base64 = await fileToBase64(file);
      return {
        file,
        base64,
        originalSizeKB,
        compressedSizeKB: originalSizeKB,
        pagesCompressed: 0,
      };
    }

    const compressedBlob = new Blob([compressedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    const compressedFile = new File([compressedBlob], file.name, { type: 'application/pdf' });
    const base64 = await fileToBase64(compressedFile);

    return {
      file: compressedFile,
      base64,
      originalSizeKB,
      compressedSizeKB,
      pagesCompressed: pagesToProcess,
    };
  } catch (err) {
    console.warn('Gagal kompresi PDF, menggunakan file asli:', err);
    const base64 = await fileToBase64(file);
    return {
      file,
      base64,
      originalSizeKB,
      compressedSizeKB: originalSizeKB,
      pagesCompressed: 0,
    };
  }
}

function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

