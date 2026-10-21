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
    return (
      (import.meta as any).env?.VITE_WA_GATEWAY_URL ||
      localStorage.getItem('mapahtrip_wa_gateway_url') ||
      'http://localhost:2026/api/send'
    );
  } catch {
    return 'http://localhost:2026/api/send';
  }
}

/**
 * Mengirim pesan WhatsApp melalui Gateway API (Session: Mapahtrip)
 */
export async function kirimPesanWA(nomorTujuan: string, isiPesan: string) {
  try {
    const cleanedNumber = normalizeWANumber(nomorTujuan);
    const gatewayUrl = getWAGatewayUrl();
    const sessionId = getWASessionId();

    const response = await fetch(gatewayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "AQSHAMART2025",
        "ngrok-skip-browser-warning": "true"
      },
      body: JSON.stringify({
        sessionId: sessionId,
        number: cleanedNumber,
        message: isiPesan
      })
    });

    const hasil = await response.json().catch(() => null);
    return hasil;
  } catch (error) {
    console.error("Gagal mengirim WA via Gateway:", error);
    return null;
  }
}
