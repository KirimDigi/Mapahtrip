/**
 * Utilitas Kompresi Gambar Otomatis Client-Side
 * Mengompres foto / berkas gambar secara otomatis agar ukurannya PASTI DI BAWAH 100 KB.
 * Menggunakan HTML Canvas dengan algoritma adaptif kualitas & dimensi bertingkat.
 */
export interface CompressionResult {
  file: File;
  base64: string;
  originalSizeKB: number;
  compressedSizeKB: number;
}

export async function compressImageUnder100KB(
  file: File,
  targetMaxKB: number = 95 // Target di bawah 100KB (aman di rentang 60 - 95 KB)
): Promise<CompressionResult> {
  const originalSizeKB = Math.round(file.size / 1024);

  // Jika file bukan gambar, kembalikan apa adanya
  if (!file.type.startsWith('image/')) {
    return {
      file,
      base64: '',
      originalSizeKB,
      compressedSizeKB: originalSizeKB,
    };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format berkas gambar tidak didukung.'));
      img.onload = () => {
        // 1. Batasi dimensi awal maksimum (maksimal 1200px sudah sangat tajam untuk pas foto visa / KTP)
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context tidak tersedia.'));
          return;
        }

        // Background putih jika format asli memiliki transparansi (PNG)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const targetBytes = targetMaxKB * 1024;
        let quality = 0.85;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        // 2. Iterasi penurunan kualitas dan resolusi sampai ukuran < targetMaxKB (< 100 KB)
        let attempts = 0;
        // Rumus perkiraan byte size dari DataURL Base64: length * 0.75
        while (dataUrl.length * 0.75 > targetBytes && attempts < 12) {
          attempts++;
          if (quality > 0.45) {
            quality -= 0.12;
          } else {
            // Jika kualitas sudah 45%, turunkan resolusi canvas 15% setiap iterasi
            width = Math.round(width * 0.85);
            height = Math.round(height * 0.85);
            canvas.width = width;
            canvas.height = height;
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
          }
          dataUrl = canvas.toDataURL('image/jpeg', Math.max(0.2, quality));
        }

        // 3. Konversi Data URL kembali menjadi File Blob
        try {
          const byteString = atob(dataUrl.split(',')[1]);
          const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([ab], { type: mimeString });
          const newName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
          const compressedFile = new File([blob], newName, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          const compressedSizeKB = Math.round(compressedFile.size / 1024);

          resolve({
            file: compressedFile,
            base64: dataUrl,
            originalSizeKB,
            compressedSizeKB,
          });
        } catch (convErr) {
          reject(convErr);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
