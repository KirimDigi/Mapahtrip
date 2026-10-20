// whatsapp.ts
export async function kirimPesanWA(nomorTujuan: string, isiPesan: string) {
  try {
    // Membersihkan karakter spasi atau strip jika ada
    const cleanedNumber = nomorTujuan.replace(/[\s-]/g, '');

    const response = await fetch("https://hypnotic-curtly-dealt.ngrok-free.dev/api/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "AQSHAMART2025",
        "ngrok-skip-browser-warning": "true"
      },
      body: JSON.stringify({
        sessionId: "KirimDIgi",
        number: cleanedNumber,
        message: isiPesan
      })
    });
    const hasil = await response.json();
    return hasil;
  } catch (error) {
    console.error("Gagal mengirim WA:", error);
    return null;
  }
}
