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
 * 3. Default fallback: http://localhost:2026/api/send
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
// SISTEM ANTREAN OFFLINE / CONNECTING (OUTBOX)
// =========================================================================

const OUTBOX_STORAGE_KEY = 'mapahtrip_wa_outbox_queue';

export function getWAOutbox(): WAOutboxItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
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
  const current = getWAOutbox();
  // Cegah duplikasi persis: jika nomor sama dan isi pesan sama ATAU nama pemohon & tahap persis sama
  const existingIdx = current.findIndex(
    (item) =>
      item.nomorTujuan === nomorTujuan &&
      (item.isiPesan.trim() === isiPesan.trim() ||
        (Boolean(meta?.namaPemohon) &&
          item.namaPemohon === meta?.namaPemohon &&
          item.tahap === meta?.tahap))
  );

  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.');

  const newItem: WAOutboxItem = {
    id: existingIdx !== -1 ? current[existingIdx].id : `outbox-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    nomorTujuan,
    isiPesan,
    namaPemohon: meta?.namaPemohon || 'Customer',
    tahap: meta?.tahap || 'Notifikasi',
    createdAt: `${dateStr} ${timeStr}`,
    retryCount: existingIdx !== -1 ? current[existingIdx].retryCount + 1 : 0,
    lastError: meta?.error || 'Gateway Connecting / Offline',
  };

  if (existingIdx !== -1) {
    current[existingIdx] = newItem;
  } else {
    current.unshift(newItem);
  }

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
 * Menghapus notifikasi customer itu sendiri, notif staf, notif owner, dan notif mitra yang memuat data pemohon tersebut.
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
        return false; // Hapus
      }
    }

    // 2. Cek kecocokan nomor WhatsApp customer
    if (targetPhone && item.nomorTujuan === targetPhone) {
      return false; // Hapus
    }

    // 3. Cek di dalam isi pesan (apakah memuat noPengajuan atau nama pemohon)
    const isiLower = (item.isiPesan || '').toLowerCase();

    if (targetNoPengajuan && targetNoPengajuan.length >= 4) {
      if (isiLower.includes(targetNoPengajuan)) {
        return false; // Hapus (misal notifikasi ke owner, staf, atau affiliate yang memuat MT-0300)
      }
    }

    if (targetNama && targetNama.length >= 3) {
      const escaped = targetNama.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i');
      if (regex.test(isiLower)) {
        return false; // Hapus
      }
    }

    return true; // Simpan
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
 * Mencoba mengirim pesan langsung ke endpoint gateway dengan timeout batas 4 detik
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

  const endpoints: string[] = [];
  const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  if (isLocal) {
    endpoints.push('/api-wa/api/send');
  }
  const configured = getWAGatewayUrl();
  if (configured && !endpoints.includes(configured)) {
    endpoints.push(configured);
  }

  for (const url of endpoints) {
    const controller = new AbortController();
    // Timeout 6 detik cukup untuk Baileys tanpa membuat antrean macet lama saat offline
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      console.log(`[WA Gateway] Mengirim ke ${cleanedNumber} via ${url}...`);
      const response = await fetch(url, {
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
      console.warn(`[WA Gateway] Endpoint ${url} gagal (${err.message})`);
    }
  }

  return null;
}

// Cache dedup pengiriman pesan terakhir (mencegah pesan duplikat ke nomor & pesan yang sama dalam 15 detik)
const recentSentLog = new Map<string, number>();

/**
 * Fungsi Utama: Mengirim pesan WhatsApp melalui Gateway.
 * JIKA GATEWAY SEDANG CONNECTING / GANGGUAN SINYAL:
 * Otomatis memasukkan pesan ke Antrean Outbox & memberitahu status 'queued: true'.
 */
export async function kirimPesanWA(
  nomorTujuan: string,
  isiPesan: string,
  meta?: { namaPemohon?: string; tahap?: string }
): Promise<{ success: boolean; queued?: boolean; message?: string; [key: string]: any }> {
  try {
    const cleanedNumber = normalizeWANumber(nomorTujuan);
    if (!cleanedNumber) {
      console.warn('[WA Gateway] Nomor WhatsApp tujuan kosong');
      return { success: false, message: 'Nomor WhatsApp tidak valid atau kosong' };
    }

    // Filter De-duplication: Cegah pesan ganda ke nomor yang sama dalam waktu 15 detik jika sudah terkirim sukses
    const dedupKey = `${cleanedNumber}:${isiPesan.trim().substring(0, 100)}`;
    const now = Date.now();
    const lastSentTime = recentSentLog.get(dedupKey);
    if (lastSentTime && now - lastSentTime < 15000) {
      console.log(`[WA Gateway] Pesan duplikat terdeteksi ke ${cleanedNumber} (${Math.round((now - lastSentTime) / 1000)} detik lalu). Dilewati demi mencegah spam ganda.`);
      return { success: true, message: 'Pesan duplikat dicegah otomatis oleh sistem de-duplikasi' };
    }

    // Bersihkan entri log yang sudah lebih dari 30 detik agar tidak menumpuk di memori
    if (recentSentLog.size > 100) {
      for (const [key, timestamp] of recentSentLog.entries()) {
        if (now - timestamp > 30000) {
          recentSentLog.delete(key);
        }
      }
    }

    // 1. Coba kirim langsung
    const directResult = await kirimPesanWADirect(cleanedNumber, isiPesan);
    if (directResult && directResult.success) {
      // Catat ke recentSentLog HANYA jika benar-benar sukses terkirim!
      recentSentLog.set(dedupKey, Date.now());
      console.log('[WA Gateway] Pesan berhasil terkirim langsung ke:', cleanedNumber);
      return { success: true, message: 'Terkirim langsung via WhatsApp Gateway', ...directResult };
    }

    // 2. Jika gagal tembus (Connecting / Ngrok offline / Sinyal putus):
    console.warn(`[WA Gateway] Gagal tembus langsung ke ${cleanedNumber}. Memasukkan ke antrean Outbox...`);
    const queuedItem = addToWAOutbox(cleanedNumber, isiPesan, {
      namaPemohon: meta?.namaPemohon,
      tahap: meta?.tahap,
      error: 'Gateway offline/connecting',
    });

    return {
      success: false,
      queued: true,
      queueId: queuedItem.id,
      message: 'Gateway sedang connecting / offline. Pesan otomatis disimpan di antrean tunggu dan akan dikirim begitu koneksi online.',
    };
  } catch (error: any) {
    console.error('[WA Gateway] Error sistem saat kirim WA:', error);
    addToWAOutbox(nomorTujuan, isiPesan, {
      namaPemohon: meta?.namaPemohon,
      tahap: meta?.tahap,
      error: error.message || 'Error koneksi',
    });
    return {
      success: false,
      queued: true,
      message: 'Terjadi gangguan jaringan. Pesan disimpan di antrean outbox.',
    };
  }
}

/**
 * Pemroses Otomatis Antrean Outbox (Auto-Retry Background Worker)
 * Mencoba mengirim item pertama di antrean outbox. Jika sukses, lanjut kirim sisanya.
 */
let isProcessingQueue = false;

export async function prosesAntreanWAOutbox(): Promise<{ sent: number; remaining: number }> {
  if (isProcessingQueue) return { sent: 0, remaining: getWAOutbox().length };

  const queue = getWAOutbox();
  if (queue.length === 0) return { sent: 0, remaining: 0 };

  isProcessingQueue = true;
  let sentCount = 0;
  let isGatewayOffline = false;

  try {
    console.log(`[WA Outbox] Menjalankan pengiriman untuk ${queue.length} pesan tertunda...`);

    // Proses item satu per satu secara berurutan dengan jeda aman
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (isGatewayOffline) break;

      const cleanedNum = normalizeWANumber(item.nomorTujuan);
      const dedupKey = `${cleanedNum}:${item.isiPesan.trim().substring(0, 100)}`;

      // Kirim pesan ke gateway
      const res = await kirimPesanWADirect(item.nomorTujuan, item.isiPesan);

      if (res && res.success) {
        recentSentLog.set(dedupKey, Date.now());
        sentCount++;
        removeFromWAOutbox(item.id);
        console.log(`[WA Outbox] ✅ Berhasil kirim pesan tertunda ke ${item.namaPemohon} (${item.nomorTujuan})`);

        // Tembakkan event agar UI ter-update
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('mapahtrip_wa_sent', {
              detail: {
                applicantName: item.namaPemohon,
                stage: item.tahap,
                nomorTujuan: item.nomorTujuan,
              },
            })
          );
        }

        // BERI JEDA 1.2 DETIK antar pesan agar koneksi WhatsApp Baileys socket tidak tabrakan/hang
        if (i < queue.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1200));
        }
      } else {
        console.warn(`[WA Outbox] Pesan ke ${item.namaPemohon} belum berhasil.`);
        // Jika server gateway benar-benar mati / offline, hentikan agar tidak buang waktu
        // Jika error per-nomor, lanjutkan ke pesan berikutnya (customer/staf/owner lain)
        const currentItems = getWAOutbox();
        const found = currentItems.find((q) => q.id === item.id);
        if (found && (found.retryCount || 0) >= 3) {
          console.warn(`[WA Outbox] Pesan ${item.id} sudah dicoba 3x. Melanjutkan ke item berikutnya.`);
          continue;
        }
        // Jika gateway offline / tidak merespon di semua endpoint:
        isGatewayOffline = true;
        break;
      }
    }
  } finally {
    isProcessingQueue = false;
  }

  if (sentCount > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('mapahtrip_wa_auto_flushed', {
        detail: { sent: sentCount, remaining: getWAOutbox().length },
      })
    );
  }

  return { sent: sentCount, remaining: getWAOutbox().length };
}

// Inisialisasi background poller otomatis setiap 10 detik di browser
// Begitu gateway / ngrok online kembali, antrean langsung terkirim otomatis tanpa perlu klik manual
if (typeof window !== 'undefined') {
  setInterval(() => {
    const queue = getWAOutbox();
    if (queue.length > 0) {
      prosesAntreanWAOutbox().catch(() => {});
    }
  }, 10000);

  window.addEventListener('online', () => {
    prosesAntreanWAOutbox().catch(() => {});
  });
}
