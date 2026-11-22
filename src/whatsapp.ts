// whatsapp.ts - WhatsApp Gateway API Integration & Offline Outbox Queue (Session: Mapahtrip)

export interface WAOutboxItem {
  id: string;
  nomorTujuan: string;
  isiPesan: string;
  namaPemohon?: string;
  tahap?: string;
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

/**
 * Normalisasi nomor WhatsApp otomatis support:
 * - 08xxxxxxxx -> 628xxxxxxxx
 * - +628xxxxxxxx -> 628xxxxxxxx
 * - 628xxxxxxxx -> 628xxxxxxxx
 * - 8xxxxxxxx -> 628xxxxxxxx
 * Serta membersihkan spasi, tanda strip (-), atau karakter non-digit.
 */
export function normalizeWANumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

/**
 * Link WhatsApp Web Direct (Cadangan Darurat jika Gateway Offline)
 * Menggunakan web.whatsapp.com langsung di desktop agar encoding UTF-8 emoji
 * tidak rusak menjadi tanda tanya/berlian hitam (bug pada redirect wa.me).
 */
export function getDirectWALink(nomorTujuan: string, isiPesan: string): string {
  const clean = normalizeWANumber(nomorTujuan);
  const encoded = encodeURIComponent(isiPesan);
  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) {
    return `https://api.whatsapp.com/send/?phone=${clean}&text=${encoded}`;
  }
  return `https://web.whatsapp.com/send?phone=${clean}&text=${encoded}`;
}

/**
 * Mengambil Session ID WhatsApp Gateway:
 * Default: 'Mapahtrip'
 */
export function getWASessionId(): string {
  try {
    return (
      (import.meta as any).env?.VITE_WA_SESSION_ID ||
      localStorage.getItem('mapahtrip_wa_session_id') ||
      'Mapahtrip'
    );
  } catch {
    return 'Mapahtrip';
  }
}

/**
 * Mengambil URL WhatsApp Gateway API:
 * 1. Dari env VITE_WA_GATEWAY_URL
 * 2. Dari localStorage 'mapahtrip_wa_gateway_url' (jika admin mengatur di UI / tunnel ngrok)
 * 3. Default fallback: https://hypnotic-curtly-dealt.ngrok-free.dev/api/send
 */
export function getWAGatewayUrl(): string {
  try {
    const envUrl = (import.meta as any).env?.VITE_WA_GATEWAY_URL;
    if (envUrl && envUrl.includes('/api/send')) return envUrl;

    const saved = localStorage.getItem('mapahtrip_wa_gateway_url');
    if (saved && saved.includes('/api/send')) return saved;

    return 'https://hypnotic-curtly-dealt.ngrok-free.dev/api/send';
  } catch {
    return 'https://hypnotic-curtly-dealt.ngrok-free.dev/api/send';
  }
}

// =========================================================================
// SISTEM CEK PENGIRIMAN SUKSES & IN-FLIGHT LOCK
// =========================================================================

const SENT_SUCCESS_STORAGE_KEY = 'mapahtrip_wa_sent_success';
const OUTBOX_STORAGE_KEY = 'mapahtrip_wa_outbox_queue';
const OUTBOX_LOCK_KEY = 'mapahtrip_wa_outbox_processing_lock';

// In-flight tracking: hanya mengunci saat request HTTP sedang berlangsung di jaringan
const inFlightRequests = new Set<string>();

function getMsgSignature(phone: string, message: string): string {
  const cleanNum = normalizeWANumber(phone);
  const cleanMsg = (message || '').trim().replace(/\s+/g, ' ');
  return `${cleanNum}:::${cleanMsg.slice(0, 150)}`;
}

/**
 * Mengecek apakah pesan yang sama ke nomor yang sama sudah BENAR-BENAR BERHASIL TERKIRIM
 * dalam 20 detik terakhir.
 */
function isMessageAlreadySentSuccessfully(phone: string, message: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const key = getMsgSignature(phone, message);
    const raw = localStorage.getItem(SENT_SUCCESS_STORAGE_KEY);
    if (!raw) return false;
    const sentMap: Record<string, number> = JSON.parse(raw);
    const lastSent = sentMap[key];
    if (lastSent && Date.now() - lastSent < 20000) {
      return true;
    }
  } catch {}
  return false;
}

/**
 * Mencatat bahwa pesan SUKSES terkirim ke WhatsApp (HANYA dipanggil saat API mengembalikan success: true).
 */
function recordMessageSentSuccess(phone: string, message: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getMsgSignature(phone, message);
    const raw = localStorage.getItem(SENT_SUCCESS_STORAGE_KEY);
    const sentMap: Record<string, number> = raw ? JSON.parse(raw) : {};
    const now = Date.now();
    // Bersihkan entri lama > 60 detik
    for (const k of Object.keys(sentMap)) {
      if (now - sentMap[k] > 60000) {
        delete sentMap[k];
      }
    }
    sentMap[key] = now;
    localStorage.setItem(SENT_SUCCESS_STORAGE_KEY, JSON.stringify(sentMap));
  } catch {}
}

// =========================================================================
// SISTEM ANTREAN OFFLINE / CONNECTING (OUTBOX)
// =========================================================================

export function getWAOutbox(): WAOutboxItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveWAOutbox(items: WAOutboxItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('mapahtrip_wa_outbox_changed', { detail: { count: items.length } }));
  } catch {}
}

export function addToWAOutbox(
  nomorTujuan: string,
  isiPesan: string,
  meta?: { namaPemohon?: string; tahap?: string; error?: string }
): WAOutboxItem {
  const cleanTarget = normalizeWANumber(nomorTujuan);
  const current = getWAOutbox();
  const cleanPesan = (isiPesan || '').trim();

  // Cegah duplikasi persis di antrean: jika nomor tujuan sama dan pesan persis sama
  const existingIdx = current.findIndex((item) => {
    const itemNum = normalizeWANumber(item.nomorTujuan);
    if (itemNum !== cleanTarget) return false;
    return item.isiPesan.trim() === cleanPesan;
  });

  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.');

  if (existingIdx !== -1) {
    // Perbarui item yang sudah ada daripada membuat baris duplikat baru
    const existing = current[existingIdx];
    existing.retryCount = (existing.retryCount || 0) + 1;
    existing.createdAt = `${dateStr} ${timeStr}`;
    existing.lastError = meta?.error || existing.lastError || 'Gateway Connecting / Offline';
    saveWAOutbox(current);
    return existing;
  }

  const newItem: WAOutboxItem = {
    id: `outbox-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    nomorTujuan: cleanTarget,
    isiPesan: cleanPesan,
    namaPemohon: meta?.namaPemohon || 'Customer',
    tahap: meta?.tahap || 'Notifikasi',
    createdAt: `${dateStr} ${timeStr}`,
    retryCount: 0,
    lastError: meta?.error || 'Gateway Connecting / Offline',
  };

  current.unshift(newItem);
  saveWAOutbox(current);
  return newItem;
}

export function removeFromWAOutbox(id: string): void {
  const current = getWAOutbox();
  const filtered = current.filter((item) => item.id !== id);
  saveWAOutbox(filtered);
}

/**
 * Menghapus semua pesan di antrean WhatsApp Outbox yang berkaitan dengan pemohon tertentu
 * (dipanggil saat data pemohon dihapus dari sistem/tabel).
 */
export function removeApplicantFromWAOutbox(params: {
  namaPemohon?: string;
  noPengajuan?: string;
  noTelp?: string;
}): number {
  const current = getWAOutbox();
  if (current.length === 0) return 0;

  const targetNama = (params.namaPemohon || '').trim().toLowerCase();
  const targetNoPengajuan = (params.noPengajuan || '').trim().toLowerCase();
  const targetPhone = normalizeWANumber(params.noTelp || '');

  const filtered = current.filter((item) => {
    // 1. Cek kecocokan nama pemohon di kartu
    if (targetNama && targetNama.length >= 2) {
      if (item.namaPemohon && item.namaPemohon.toLowerCase().trim() === targetNama) {
        return false;
      }
    }

    // 2. Cek kecocokan nomor WhatsApp customer
    if (targetPhone && normalizeWANumber(item.nomorTujuan) === targetPhone) {
      return false;
    }

    // 3. Cek di dalam isi pesan (apakah memuat noPengajuan atau nama pemohon)
    const isiLower = (item.isiPesan || '').toLowerCase();

    if (targetNoPengajuan && targetNoPengajuan.length >= 4) {
      if (isiLower.includes(targetNoPengajuan)) {
        return false;
      }
    }

    if (targetNama && targetNama.length >= 3) {
      const escaped = targetNama.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i');
      if (regex.test(isiLower)) {
        return false;
      }
    }

    return true;
  });

  const removedCount = current.length - filtered.length;
  if (removedCount > 0) {
    saveWAOutbox(filtered);
    console.log(`[WA Outbox] Otomatis membersihkan ${removedCount} antrean pesan WhatsApp untuk pemohon:`, params);
  }
  return removedCount;
}

export function clearWAOutbox(): void {
  saveWAOutbox([]);
}

/**
 * Mengirim pesan langsung ke endpoint gateway via fetch.
 * Menggunakan TEPAT SATU endpoint aktif untuk mencegah pengiriman ganda akibat retry internal.
 */
export async function kirimPesanWADirect(nomorTujuan: string, isiPesan: string): Promise<any> {
  const cleanedNumber = normalizeWANumber(nomorTujuan);
  if (!cleanedNumber) return null;

  const sessionId = getWASessionId();
  const payload = JSON.stringify({
    sessionId,
    number: cleanedNumber,
    message: isiPesan,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': 'AQSHAMART2025',
    'ngrok-skip-browser-warning': 'true',
  };

  // Pilih 1 target endpoint terbaik:
  const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const targetUrl = isLocal ? '/api-wa/api/send' : getWAGatewayUrl();

  const controller = new AbortController();
  // Timeout 10 detik agar proses pengiriman Baileys soket tidak dibatalkan prematur
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    console.log(`[WA Gateway] Mengirim ke ${cleanedNumber} via ${targetUrl}...`);
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: payload,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json().catch(() => null);
    if (data && (data.success || data.status === 'success' || !data.error)) {
      return { success: true, ...data };
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn(`[WA Gateway] Target ${targetUrl} gagal: ${err.message}`);
  }

  return null;
}

// Queue internal agar pesan beruntun (Customer, Mitra, Staff, Owner) dikirim secara serial dengan jeda 600ms
let sendQueueChain: Promise<any> = Promise.resolve();

async function doKirimPesanWA(
  nomorTujuan: string,
  isiPesan: string,
  meta?: { namaPemohon?: string; tahap?: string }
): Promise<{ success: boolean; queued?: boolean; message?: string; [key: string]: any }> {
  const cleanedNumber = normalizeWANumber(nomorTujuan);
  if (!cleanedNumber) {
    console.warn('[WA Gateway] Nomor WhatsApp tujuan kosong');
    return { success: false, message: 'Nomor WhatsApp tidak valid atau kosong' };
  }

  const sig = getMsgSignature(cleanedNumber, isiPesan);

  // 1. FILTER DE-DUPLIKASI: Jika pesan yang persis sama sudah sukses terkirim dalam 20 detik terakhir: lewati!
  if (isMessageAlreadySentSuccessfully(cleanedNumber, isiPesan)) {
    console.log(`[WA Gateway] Pesan duplikat terdeteksi ke ${cleanedNumber}. Sudah terkirim sebelumnya.`);
    return { success: true, message: 'Pesan sudah terkirim sebelumnya.' };
  }

  // 2. Jika pesan yang sama sedang dalam proses kirim (in-flight) di detik ini:
  if (inFlightRequests.has(sig)) {
    console.log(`[WA Gateway] Pesan ke ${cleanedNumber} sedang dalam proses kirim. Lewati pemicu ganda.`);
    return { success: true, message: 'Pesan sedang dalam proses kirim.' };
  }

  inFlightRequests.add(sig);

  try {
    // 3. Coba kirim langsung ke gateway
    const directResult = await kirimPesanWADirect(cleanedNumber, isiPesan);
    if (directResult && directResult.success) {
      // Catat SUKSES TERKIRIM
      recordMessageSentSuccess(cleanedNumber, isiPesan);
      console.log('[WA Gateway] Pesan berhasil terkirim langsung ke:', cleanedNumber);
      return { success: true, message: 'Terkirim langsung via WhatsApp Gateway', ...directResult };
    }

    // 4. Jika gateway offline / ngrok mati / timeout: simpan ke Outbox tanpa duplikasi
    console.warn(`[WA Gateway] Gateway offline/lambat untuk ${cleanedNumber}. Masuk antrean outbox.`);
    const queuedItem = addToWAOutbox(cleanedNumber, isiPesan, {
      namaPemohon: meta?.namaPemohon,
      tahap: meta?.tahap,
      error: 'Gateway offline/connecting',
    });

    return {
      success: false,
      queued: true,
      queueId: queuedItem.id,
      message: 'Gateway sedang offline. Pesan disimpan di antrean tunggu dan dikirim otomatis begitu online.',
    };
  } catch (error: any) {
    console.error('[WA Gateway] Error sistem saat kirim WA:', error);
    const queuedItem = addToWAOutbox(cleanedNumber, isiPesan, {
      namaPemohon: meta?.namaPemohon,
      tahap: meta?.tahap,
      error: error.message || 'Error koneksi',
    });
    return {
      success: false,
      queued: true,
      queueId: queuedItem.id,
      message: 'Terjadi gangguan jaringan. Pesan disimpan di antrean outbox.',
    };
  } finally {
    inFlightRequests.delete(sig);
  }
}

/**
 * Fungsi Utama: Mengirim pesan WhatsApp melalui Gateway secara terurut & aman tanpa bentrok.
 */
export async function kirimPesanWA(
  nomorTujuan: string,
  isiPesan: string,
  meta?: { namaPemohon?: string; tahap?: string }
): Promise<{ success: boolean; queued?: boolean; message?: string; [key: string]: any }> {
  return new Promise((resolve) => {
    sendQueueChain = sendQueueChain
      .then(async () => {
        const result = await doKirimPesanWA(nomorTujuan, isiPesan, meta);
        resolve(result);
        // Jeda pengaman 600ms antar pesan beruntun agar soket Baileys tidak bentrok
        await new Promise((r) => setTimeout(r, 600));
      })
      .catch((err) => {
        resolve({ success: false, queued: true, message: err?.message || 'Error' });
      });
  });
}

// =========================================================================
// PEMROSES OTOMATIS ANTREAN OUTBOX DENGAN DISTRIBUTED LOCK
// =========================================================================

function acquireOutboxLock(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const now = Date.now();
    const current = localStorage.getItem(OUTBOX_LOCK_KEY);
    if (current) {
      const lockTime = parseInt(current, 10);
      // Batas kunci maksimal 15 detik (mencegah deadlock jika tab tertutup tiba-tiba)
      if (now - lockTime < 15000) {
        return false;
      }
    }
    localStorage.setItem(OUTBOX_LOCK_KEY, String(now));
    return true;
  } catch {
    return true;
  }
}

function releaseOutboxLock(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(OUTBOX_LOCK_KEY);
  } catch {}
}

export async function prosesAntreanWAOutbox(): Promise<{ sent: number; remaining: number }> {
  const queue = getWAOutbox();
  if (queue.length === 0) return { sent: 0, remaining: 0 };

  // Mutex lock: hanya 1 tab browser yang boleh memproses antrean pada satu waktu
  if (!acquireOutboxLock()) {
    return { sent: 0, remaining: queue.length };
  }

  let sentCount = 0;
  let isGatewayOffline = false;

  try {
    console.log(`[WA Outbox] Memproses ${queue.length} pesan antrean tertunda...`);

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (isGatewayOffline) break;

      const cleanNum = normalizeWANumber(item.nomorTujuan);

      // Jika pesan ini ternyata sudah sukses terkirim lewat jalur lain, keluarkan dari outbox
      if (isMessageAlreadySentSuccessfully(cleanNum, item.isiPesan)) {
        removeFromWAOutbox(item.id);
        continue;
      }

      const res = await kirimPesanWADirect(cleanNum, item.isiPesan);

      if (res && res.success) {
        sentCount++;
        recordMessageSentSuccess(cleanNum, item.isiPesan);
        removeFromWAOutbox(item.id);
        console.log(`[WA Outbox] ✅ Berhasil kirim antrean ke ${item.namaPemohon} (${cleanNum})`);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('mapahtrip_wa_sent', {
              detail: {
                applicantName: item.namaPemohon,
                stage: item.tahap,
                nomorTujuan: cleanNum,
              },
            })
          );
        }

        // Jeda 1 detik antar pesan antrean
        if (i < queue.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } else {
        console.warn(`[WA Outbox] Pengiriman antrean ke ${item.namaPemohon} belum berhasil (Gateway offline).`);
        // JANGAN HAPUS DARI OUTBOX! Pesan harus tetap ada di antrean sampai gateway kembali online!
        isGatewayOffline = true;
        break;
      }
    }
  } finally {
    releaseOutboxLock();
  }

  const remaining = getWAOutbox().length;
  if (sentCount > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('mapahtrip_wa_auto_flushed', {
        detail: { sent: sentCount, remaining },
      })
    );
  }

  return { sent: sentCount, remaining };
}

// Inisialisasi background auto-flush setiap 12 detik di browser
if (typeof window !== 'undefined') {
  setInterval(() => {
    const queue = getWAOutbox();
    if (queue.length > 0) {
      prosesAntreanWAOutbox().catch(() => {});
    }
  }, 12000);

  window.addEventListener('online', () => {
    prosesAntreanWAOutbox().catch(() => {});
  });
}
