// soundEffects.ts - Web Audio API Synthetic Chime Notifications
// 100% mandiri, bebas file MP3 eksternal, tanpa dependensi, nol latensi.

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioCtx) {
      audioCtx = new AudioCtx();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function isNotificationSoundEnabled(): boolean {
  try {
    return localStorage.getItem('mapahtrip_sound_enabled') !== 'false';
  } catch {
    return true;
  }
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem('mapahtrip_sound_enabled', enabled ? 'true' : 'false');
    window.dispatchEvent(new Event('mapahtrip:sound_toggle'));
  } catch {}
}

/**
 * Memainkan nada chime kristal yang sangat jernih dan ramah di telinga (ala Apple / Slack).
 * Aman dari blokir autoplay karena otomatis fallback jika konteks audio belum aktif.
 */
export function playChimeSound(type: 'new_applicant' | 'update' | 'subtle' = 'new_applicant'): void {
  if (!isNotificationSoundEnabled()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    if (type === 'new_applicant') {
      // 3-tone ascending harmonious chord: G5 (784Hz) -> C6 (1046.5Hz) -> E6 (1318.5Hz)
      const notes = [
        { freq: 783.99, start: 0.00, dur: 0.28 },
        { freq: 1046.50, start: 0.12, dur: 0.40 },
        { freq: 1318.51, start: 0.24, dur: 0.65 },
      ];

      notes.forEach(({ freq, start, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + start);

        // Volume envelope: smooth attack & exponential decay
        gain.gain.setValueAtTime(0.001, now + start);
        gain.gain.linearRampToValueAtTime(0.22, now + start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + start);
        osc.stop(now + start + dur + 0.05);
      });
    } else {
      // Subtle 2-tone notification
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15);

      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch (err) {
    console.debug('[Audio] Could not play sound chime:', err);
  }
}

