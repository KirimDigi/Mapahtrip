import { supabase } from './supabase';

export const SUPABASE_STORAGE_BUCKET = 'mapahtrip-storage';

/**
 * Konversi base64 / data URL ke Blob binary murni
 */
export function base64ToBlob(base64Data: string, fallbackContentType = 'image/jpeg'): Blob {
  try {
    let contentType = fallbackContentType;
    let rawBase64 = base64Data;

    if (base64Data.startsWith('data:')) {
      const parts = base64Data.split(',');
      const match = parts[0].match(/:(.*?);/);
      if (match) contentType = match[1];
      rawBase64 = parts[1];
    }

    const byteCharacters = atob(rawBase64);
    const byteNumbers = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    return new Blob([byteNumbers.buffer as ArrayBuffer], { type: contentType });
  } catch (err) {
    console.warn('Gagal konversi base64 ke Blob:', err);
    return new Blob([base64Data], { type: fallbackContentType });
  }
}

/**
 * Cek ketersediaan bucket di Supabase Storage
 */
export async function checkStorageBucket(bucketName = SUPABASE_STORAGE_BUCKET): Promise<boolean> {
  try {
    const { error } = await supabase.storage.from(bucketName).list('', { limit: 1 });
    if (error) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Upload file (bisa File, Blob, atau string base64) ke Supabase Cloud Storage
 * Mengembalikan public URL dari file yang diupload
 */
export async function uploadToSupabaseStorage({
  bucket = SUPABASE_STORAGE_BUCKET,
  path,
  file,
  contentType,
}: {
  bucket?: string;
  path: string;
  file: File | Blob | string;
  contentType?: string;
}): Promise<{ url: string | null; error?: string }> {
  try {
    let uploadBody: Blob | File;
    let finalContentType = contentType;

    if (typeof file === 'string') {
      uploadBody = base64ToBlob(file, contentType || 'image/jpeg');
      if (!finalContentType) finalContentType = uploadBody.type;
    } else {
      uploadBody = file;
      if (!finalContentType && 'type' in file) finalContentType = file.type;
    }

    const cleanPath = path.replace(/[^a-zA-Z0-9_\-\.\/]/g, '_');

    const { error } = await supabase.storage
      .from(bucket)
      .upload(cleanPath, uploadBody, {
        contentType: finalContentType || 'application/octet-stream',
        upsert: true,
      });

    if (error) {
      console.warn(`Supabase Storage Upload Warning [${bucket}/${cleanPath}]:`, error.message);
      return { url: null, error: error.message };
    }

    // Dapatkan URL publik dari Supabase Storage
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(cleanPath);
    const publicUrl = urlData?.publicUrl || null;

    return { url: publicUrl };
  } catch (err: any) {
    console.warn('Terjadi kesalahan saat upload ke Supabase Storage:', err);
    return { url: null, error: err?.message || 'Gagal upload file ke Cloud Storage' };
  }
}

/**
 * Hapus dokumen lama spesifik (misal formVisa_*) sebelum upload dokumen baru agar Storage tetap hemat & bersih
 */
export async function removeOldApplicantDocFromStorage(
  applicantId: string | number,
  docKey: string
): Promise<boolean> {
  try {
    const folder = `applicants/${applicantId}`;
    const { data: files, error: listError } = await supabase.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .list(folder);

    if (listError || !files || files.length === 0) return true;

    // Cari file yang dimulai dengan docKey_ (misal formVisa_1794630156142.jpg)
    const matchingFiles = files.filter((f) => f.name.startsWith(`${docKey}_`));
    if (matchingFiles.length === 0) return true;

    const pathsToDelete = matchingFiles.map((f) => `${folder}/${f.name}`);
    const { error: deleteError } = await supabase.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .remove(pathsToDelete);

    if (deleteError) {
      console.warn(`Gagal menghapus file lama untuk ${docKey}:`, deleteError);
      return false;
    }
    return true;
  } catch (e) {
    console.warn(`Error removeOldApplicantDocFromStorage (${docKey}):`, e);
    return false;
  }
}

/**
 * Upload dokumen pemohon (KTP, Paspor, Foto, COE, Form, eKTLN) ke Supabase Storage
 */
export async function uploadApplicantDocToStorage({
  applicantId,
  docKey,
  file,
  fileName,
}: {
  applicantId: string | number;
  docKey: string;
  file: File | Blob | string;
  fileName: string;
}): Promise<{ url: string | null; error?: string }> {
  // 1. Bersihkan file lama untuk kategori dokumen ini agar selalu hanya ada 1 file aktif
  try {
    await removeOldApplicantDocFromStorage(applicantId, docKey);
  } catch (cleanErr) {
    console.warn('Pembersihan file lama dilewati:', cleanErr);
  }

  // 2. Upload file baru
  const ext = fileName.includes('.') ? fileName.split('.').pop() : 'jpg';
  const timestamp = Date.now();
  const path = `applicants/${applicantId}/${docKey}_${timestamp}.${ext}`;
  return uploadToSupabaseStorage({
    path,
    file,
  });
}

/**
 * Upload bukti transfer payout komisi mitra / fee staf ke Supabase Storage
 */
export async function uploadPayoutProofToStorage({
  type,
  id,
  file,
  fileName = 'bukti_transfer.jpg',
}: {
  type: 'mitra' | 'staff';
  id: string | number;
  file: File | Blob | string;
  fileName?: string;
}): Promise<{ url: string | null; error?: string }> {
  const ext = fileName.includes('.') ? fileName.split('.').pop() : 'jpg';
  const timestamp = Date.now();
  const path = `proofs/${type}/${id}_${timestamp}.${ext}`;
  return uploadToSupabaseStorage({
    path,
    file,
  });
}

/**
 * Upload bukti transfer pelunasan pemohon (struk bayar) ke Supabase Storage
 */
export async function uploadPaymentProofToStorage({
  applicantId,
  file,
  fileName = 'struk_bayar.jpg',
}: {
  applicantId: string | number;
  file: File | Blob | string;
  fileName?: string;
}): Promise<{ url: string | null; error?: string }> {
  // Bersihkan struk lama pemohon jika ada
  try {
    const folder = `payments/${applicantId}`;
    const { data: files } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).list(folder);
    if (files && files.length > 0) {
      const pathsToDelete = files.map((f) => `${folder}/${f.name}`);
      await supabase.storage.from(SUPABASE_STORAGE_BUCKET).remove(pathsToDelete);
    }
  } catch {}

  const ext = fileName.includes('.') ? fileName.split('.').pop() : 'jpg';
  const timestamp = Date.now();
  const path = `payments/${applicantId}/struk_${timestamp}.${ext}`;
  return uploadToSupabaseStorage({
    path,
    file,
  });
}

/**
 * Menguji koneksi dan kelayakan upload ke Supabase Storage bucket
 */
export async function testSupabaseStorageConnection(): Promise<{ success: boolean; url?: string; message: string }> {
  try {
    const isReady = await checkStorageBucket();
    if (!isReady) {
      return {
        success: false,
        message: 'Bucket "mapahtrip-storage" belum terdeteksi atau belum diset Public di Supabase Dashboard.',
      };
    }
    const testContent = `Koneksi Supabase Storage MapahTrip terverifikasi pada ${new Date().toISOString()}`;
    const testBlob = new Blob([testContent], { type: 'text/plain' });
    const res = await uploadToSupabaseStorage({
      path: `_system/health_check_${Date.now()}.txt`,
      file: testBlob,
      contentType: 'text/plain',
    });
    if (res.url) {
      return {
        success: true,
        url: res.url,
        message: 'Koneksi & izin upload Supabase Cloud Storage BERHASIL!',
      };
    }
    return {
      success: false,
      message: res.error || 'Gagal memperoleh URL publik dari Supabase Storage.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Terjadi kesalahan saat menguji koneksi Storage.',
    };
  }
}

/**
 * Hapus berkas fisik pemohon dari Supabase Storage untuk mengosongkan kuota
 */
export async function removeApplicantDocsFromStorage(applicantId: string | number): Promise<boolean> {
  try {
    const folder = `applicants/${applicantId}`;
    const { data: files, error: listError } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).list(folder);
    if (listError || !files || files.length === 0) return true;

    const pathsToDelete = files.map(f => `${folder}/${f.name}`);
    const { error: deleteError } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).remove(pathsToDelete);
    if (deleteError) {
      console.warn('Gagal menghapus berkas pemohon dari storage:', deleteError);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Error removeApplicantDocsFromStorage:', e);
    return false;
  }
}