import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vswmndovcmchqhyzlawo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzd21uZG92Y21jaHFoeXpsYXdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwODg0MDksImV4cCI6MjEwNzY2NDQwOX0.79-tEuh-1M3MeJaBnIIbVtrFwUfKK_I-VmC-zm_fQhQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log('=== AUDIT EGRESS & DATABASE SUPABASE (MAPAHTRIP) ===\n');

  const startFetch = Date.now();
  const { data, count, error } = await supabase.from('pengajuan_visa').select('*', { count: 'exact' });
  const fetchTime = Date.now() - startFetch;

  if (error) {
    console.error('Error fetching pengajuan_visa:', error);
    return;
  }

  console.log(`[pengajuan_visa]`);
  console.log(`- Total Baris: ${count} baris`);
  console.log(`- Waktu Respons Query: ${fetchTime} ms`);

  const jsonStr = JSON.stringify(data);
  const totalSizeBytes = Buffer.byteLength(jsonStr, 'utf8');
  const totalKB = totalSizeBytes / 1024;
  const totalMB = totalSizeBytes / (1024 * 1024);

  console.log(`- Egress per 1x Load (select *): ${totalKB.toFixed(2)} KB (${totalMB.toFixed(3)} MB)`);

  // Column breakdown
  const colSizes = {};
  let base64Rows = 0;
  let base64TotalBytes = 0;
  let largeKeteranganRows = 0;
  let maxKeteranganSize = 0;
  let maxKeteranganId = null;

  for (const row of data) {
    for (const key of Object.keys(row)) {
      const valStr = typeof row[key] === 'object' ? JSON.stringify(row[key]) : String(row[key] ?? '');
      const bytes = Buffer.byteLength(valStr, 'utf8');
      colSizes[key] = (colSizes[key] || 0) + bytes;
    }

    if (row.keterangan) {
      const ketBytes = Buffer.byteLength(row.keterangan, 'utf8');
      if (ketBytes > maxKeteranganSize) {
        maxKeteranganSize = ketBytes;
        maxKeteranganId = row.id;
      }
      if (ketBytes > 2000) {
        largeKeteranganRows++;
      }
      if (row.keterangan.includes('data:image')) {
        base64Rows++;
        const matches = row.keterangan.match(/data:image\/[^;]+;base64,[^"]+/g);
        if (matches) {
          for (const m of matches) {
            base64TotalBytes += Buffer.byteLength(m, 'utf8');
          }
        }
      }
    }
  }

  console.log('\n[Distribusi Egress per Kolom]:');
  const sortedCols = Object.entries(colSizes).sort((a, b) => b[1] - a[1]);
  for (const [k, bytes] of sortedCols) {
    const kb = bytes / 1024;
    const pct = ((bytes / totalSizeBytes) * 100).toFixed(1);
    console.log(`  • ${k.padEnd(20)}: ${kb.toFixed(2).padStart(8)} KB (${pct}%)`);
  }

  console.log('\n[Analisis Beban Blob / Keterangan]:');
  console.log(`- Baris berisi Base64 gambar: ${base64Rows} baris`);
  console.log(`- Total ukuran Base64 di DB: ${(base64TotalBytes / 1024).toFixed(2)} KB`);
  console.log(`- Baris keterangan > 2KB: ${largeKeteranganRows} baris`);
  console.log(`- Keterangan terbesar: ${(maxKeteranganSize / 1024).toFixed(2)} KB (ID: ${maxKeteranganId})`);

  // Mitra Referral
  const { data: mitraData, count: mitraCount } = await supabase.from('mitra_referral').select('*', { count: 'exact' });
  const mitraKB = Buffer.byteLength(JSON.stringify(mitraData || []), 'utf8') / 1024;
  console.log('\n[mitra_referral]:');
  console.log(`- Total: ${mitraCount || 0} baris`);
  console.log(`- Egress per load: ${mitraKB.toFixed(2)} KB`);

  // Master Tarif
  const { data: tarifData, count: tarifCount } = await supabase.from('master_tarif_visa').select('*', { count: 'exact' });
  const tarifKB = Buffer.byteLength(JSON.stringify(tarifData || []), 'utf8') / 1024;
  console.log('\n[master_tarif_visa]:');
  console.log(`- Total: ${tarifCount || 0} baris`);
  console.log(`- Egress per load: ${tarifKB.toFixed(2)} KB`);

  // Proyeksi Kuota Free Tier Supabase (5 GB per bulan)
  const totalPerFullVisitKB = totalKB + mitraKB + tarifKB;
  const visitsPer1GB = Math.floor((1024 * 1024) / totalPerFullVisitKB);
  const visitsPer5GB = visitsPer1GB * 5;

  console.log('\n=============================================');
  console.log('[PROYEKSI KUOTA EGRESS BULANAN (Free Tier 5 GB)]');
  console.log(`- Total payload 1x full reload admin: ${totalPerFullVisitKB.toFixed(2)} KB (~${(totalPerFullVisitKB / 1024).toFixed(3)} MB)`);
  console.log(`- Kapasitas 1 GB Egress: ~${visitsPer1GB.toLocaleString()} kali reload`);
  console.log(`- Kapasitas 5 GB (Batas Free Tier): ~${visitsPer5GB.toLocaleString()} kali reload per bulan`);
  console.log(`- Rata-rata aman reload per hari: ~${Math.floor(visitsPer5GB / 30).toLocaleString()} reload/hari`);
  console.log('=============================================\n');
}

main().catch(console.error);
