// whatsapp.ts - WhatsApp Gateway API Integration (Session: Mapahtrip)

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

/**
 * Mengirim pesan WhatsApp melalui Gateway API (Session: Mapahtrip)
 * Otomatis mencoba melalui Ngrok live endpoint, Vite Proxy (/api-wa/api/send), dan Direct.
 */
export async function kirimPesanWA(nomorTujuan: string, isiPesan: string) {
  try {
    const cleanedNumber = normalizeWANumber(nomorTujuan);
    if (!cleanedNumber) {
      console.warn('[WA Gateway] Nomor WhatsApp tujuan kosong');
      return null;
    }

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

    // Daftar endpoint prioritas
    const endpoints: string[] = [];
    const configured = getWAGatewayUrl();
    if (configured) {
      endpoints.push(configured);
    }
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      endpoints.push('/api-wa/api/send');
    }
    endpoints.push('https://hypnotic-curtly-dealt.ngrok-free.dev/api/send');

    for (const url of endpoints) {
      try {
        console.log(`[WA Gateway] Mengirim pesan ke ${cleanedNumber} via ${url} (Session: ${sessionId})...`);
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: payload,
        });

        const data = await response.json().catch(() => null);
        console.log(`[WA Gateway] Respon dari ${url}:`, data);
        if (data && (data.success || data.status === 'success')) {
          return data;
        }
      } catch (err) {
        console.warn(`[WA Gateway] Endpoint ${url} gagal diakses:`, err);
      }
    }

    return null;
  } catch (error) {
    console.error('[WA Gateway] Gagal memproses pengiriman WA:', error);
    return null;
  }
}
