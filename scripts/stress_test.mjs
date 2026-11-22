import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vswmndovcmchqhyzlawo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzd21uZG92Y21jaHFoeXpsYXdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwODg0MDksImV4cCI6MjEwNzY2NDQwOX0.79-tEuh-1M3MeJaBnIIbVtrFwUfKK_I-VmC-zm_fQhQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runConcurrentBatch(concurrency, totalRequests) {
  console.log(`\n--- Menjalankan Uji Beban: ${totalRequests} Requests (Konkurensi: ${concurrency} paralel) ---`);

  const latencies = [];
  let successCount = 0;
  let errorCount = 0;
  const startTime = Date.now();

  let executed = 0;

  async function worker() {
    while (executed < totalRequests) {
      executed++;
      const reqStart = Date.now();
      try {
        const { data, error } = await supabase
          .from('pengajuan_visa')
          .select('id, nama, status, program, tgl_sampai, staff_pic')
          .limit(50);

        const duration = Date.now() - reqStart;
        if (error) {
          errorCount++;
        } else {
          successCount++;
          latencies.push(duration);
        }
      } catch (err) {
        errorCount++;
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  const totalDurationMs = Date.now() - startTime;
  latencies.sort((a, b) => a - b);

  const avgLatency = latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);
  const minLatency = latencies[0] || 0;
  const maxLatency = latencies[latencies.length - 1] || 0;
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p90 = latencies[Math.floor(latencies.length * 0.9)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const rps = ((successCount + errorCount) / (totalDurationMs / 1000)).toFixed(2);

  console.log(`  ✓ Berhasil: ${successCount} / ${totalRequests} (${((successCount / totalRequests) * 100).toFixed(1)}%)`);
  console.log(`  ✗ Gagal/Error: ${errorCount}`);
  console.log(`  ⏱ Total Waktu: ${(totalDurationMs / 1000).toFixed(2)} detik`);
  console.log(`  ⚡ Throughput (RPS): ${rps} req/sec`);
  console.log(`  📊 Latensi (Response Time):`);
  console.log(`     • Min / Avg / Max : ${minLatency} ms / ${avgLatency.toFixed(1)} ms / ${maxLatency} ms`);
  console.log(`     • P50 (Median)    : ${p50} ms`);
  console.log(`     • P90             : ${p90} ms`);
  console.log(`     • P95             : ${p95} ms`);
  console.log(`     • P99             : ${p99} ms`);

  return { successCount, errorCount, avgLatency, p95, rps };
}

async function main() {
  console.log('=== STRESS TEST SISTEM & DATABASE MAPAHTRIP ===');

  // Tahap 1: Uji Beban Ringan (5 pengguna bersamaan)
  await runConcurrentBatch(5, 20);

  // Tahap 2: Uji Beban Sedang (15 pengguna bersamaan)
  await runConcurrentBatch(15, 45);

  // Tahap 3: Uji Beban Puncak (30 pengguna bersamaan)
  await runConcurrentBatch(30, 60);

  console.log('\n=== KESIMPULAN STRESS TEST SELESAI ===\n');
}

main().catch(console.error);
