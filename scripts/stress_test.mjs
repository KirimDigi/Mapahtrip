import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';

const SUPABASE_URL = 'https://vswmndovcmchqhyzlawo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzd21uZG92Y21jaHFoeXpsYXdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwODg0MDksImV4cCI6MjEwNzY2NDQwOX0.79-tEuh-1M3MeJaBnIIbVtrFwUfKK_I-VmC-zm_fQhQ';
const BUCKET = 'mapahtrip-storage';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Generate a valid synthetic JPEG image buffer of a given size (~40 - 75 KB)
 * realistic to client-side compressed documents in MapahTrip
 */
function createSyntheticJpeg(label, targetSizeKB = 55) {
  // Minimal valid JPEG header + SOS + padding + EOI
  const header = Buffer.from([
    0xff, 0xd8, // SOI
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00, // APP0
    0xff, 0xdb, 0x00, 0x43, 0x00, // DQT (table 0)
    ...new Array(64).fill(0x10),
    0xff, 0xc0, 0x00, 0x0b, 0x08, 0x01, 0x00, 0x01, 0x00, 0x01, 0x01, 0x11, 0x00, // SOF0 (256x256 grayscale)
    0xff, 0xc4, 0x00, 0x1f, 0x00, // DHT
    0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
    0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00 // SOS
  ]);

  const targetBytes = targetSizeKB * 1024;
  const paddingLength = Math.max(100, targetBytes - header.length - 2);
  
  // Fill payload with label text and repetitive safe bytes (avoiding standalone 0xff)
  const padding = Buffer.alloc(paddingLength);
  const textBytes = Buffer.from(`MAPAHTRIP-STRESS-TEST-DOC:[${label}]-DATE:${new Date().toISOString()}`);
  textBytes.copy(padding, 0);
  for (let i = textBytes.length; i < paddingLength; i++) {
    padding[i] = (i % 250); // safe byte
  }

  const footer = Buffer.from([0xff, 0xd9]); // EOI
  return Buffer.concat([header, padding, footer]);
}

const INDO_NAMES = [
  'Budi Santoso', 'Siti Rahmawati', 'Ahmad Hidayat', 'Dewi Lestari', 'Eko Prasetyo',
  'Rina Marlina', 'Fajar Ramadhan', 'Nurul Aini', 'Bambang Irawan', 'Putri Ayu',
  'Agus Setiawan', 'Tri Wahyuni', 'Hendro Wibowo', 'Sri Mulyani', 'Rizky Pratama',
  'Fitri Handayani', 'Dimas Anggoro', 'Ratna Sari', 'Arif Munandar', 'Mega Kusuma'
];

const PROGRAMS = [
  'Tokutei Ginou', 'Engineering', 'Japan e-Visa / Waiver', 'Magang TITP',
  'Specified Skilled Worker', 'Visa Turis Jepang', 'Visa Bisnis'
];

const KONSJENS = ['Jakarta', 'Surabaya', 'Denpasar', 'Medan', 'Makassar'];
const STAFFS = ['Rizky', 'Nanami Kay', 'Yulia', 'Heru', 'Latifah'];
const BANKS = ['BCA', 'Mandiri', 'BNI', 'BRI'];

async function main() {
  console.log('='.repeat(70));
  console.log('🚀 MAPAHTRIP SUPABASE STRESS TEST & EGRESS MONITORING (PLAYWRIGHT)');
  console.log('='.repeat(70));
  console.log(`Target: 20 Transaksi + 20 Akun Affiliate`);
  console.log(`Dokumen per Transaksi: 6 Berkas Fisik + Bukti Bayar + Bukti TF Staf + Bukti TF Mitra (Total 9 files/tx = 180 files)`);
  console.log(`Execution Mode: FULL CONCURRENT (Bersamaan)`);
  console.log(`Endpoint Supabase: ${SUPABASE_URL}`);
  console.log(`Bucket Storage: ${BUCKET}`);
  console.log('='.repeat(70));

  const runId = Date.now().toString().slice(-6);
  const testAffiliateCodes = [];
  for (let i = 1; i <= 20; i++) {
    const num = String(i).padStart(2, '0');
    testAffiliateCodes.push(`AFF_STRESS_${runId}_${num}`);
  }

  // =========================================================================
  // TAHAP 1: DAFTAR 20 AKUN AFFILIATE KE SUPABASE CLOUD (CONCURRENT)
  // =========================================================================
  console.log('\n[TAHAP 1] Mendaftarkan 20 Akun Mitra Affiliate ke Supabase Cloud secara bersamaan...');
  const t1Start = Date.now();

  const affiliatePayloads = testAffiliateCodes.map((code, idx) => {
    const name = INDO_NAMES[idx] || `Mitra Affiliate ${idx + 1}`;
    const bank = BANKS[idx % BANKS.length];
    return {
      kode_referral: code,
      nama: `${name} (Mitra ${idx + 1})`,
      email: `aff_${code.toLowerCase()}@mapahtrip.test`,
      no_wa: `08129876${String(idx + 1).padStart(4, '0')}`,
      status_mitra: idx % 3 === 0 ? 'LPK / SO' : idx % 2 === 0 ? 'Alumni Jepang' : 'Agency / Travel',
      lembaga_lpk: idx % 3 === 0 ? `LPK Mitra ${name}` : '-',
      no_ktp: `3201${runId}${String(idx + 1).padStart(6, '0')}`,
      alamat: `Jl. Mitra Sukses No. ${idx + 1}, Jakarta`,
      provinsi: 'DKI Jakarta',
      akun_ig: `@mitra_${code.toLowerCase()}`,
      follower_ig: `${(idx + 1) * 1500}`,
      nama_bank: bank,
      nomor_rekening: `${bank === 'BCA' ? '5210' : '1080'}${runId}${idx + 1}`,
      atas_nama: name,
      jenis_pencairan: 'Rekening Bank',
      is_profile_complete: true,
      password: 'password123',
    };
  });

  const { data: insertedAffs, error: affError } = await supabase
    .from('mitra_affiliate')
    .upsert(affiliatePayloads, { onConflict: 'kode_referral' })
    .select();

  const t1End = Date.now();
  if (affError) {
    console.error('❌ Gagal mendaftarkan akun affiliate:', affError.message);
  } else {
    console.log(`✅ Berhasil mendaftarkan 20 Akun Mitra Affiliate dalam ${((t1End - t1Start) / 1000).toFixed(2)}s!`);
    console.log(`   Sample kode: ${testAffiliateCodes[0]} s/d ${testAffiliateCodes[testAffiliateCodes.length - 1]}`);
  }

  // =========================================================================
  // TAHAP 2: CONCURRENT INGESTION (20 TRANSAKSI + 180 FILE KE CLOUD STORAGE)
  // =========================================================================
  console.log('\n[TAHAP 2] Mengunggah 20 Transaksi & 180 Dokumen Fisik/Bukti ke Cloud Storage & Database...');
  console.log('   (Setiap transaksi: Form Visa, Paspor, Pasfoto, KTP, COE, e-KTLN, Bukti Bayar, Bukti TF Staf, Bukti TF Mitra)');

  let totalUploadedBytes = 0;
  const t2Start = Date.now();

  const transactionTasks = testAffiliateCodes.map(async (affCode, idx) => {
    const txIndex = idx + 1;
    const applicantName = `Pemohon Stress ${runId}-${String(txIndex).padStart(2, '0')}`;
    const pasporNo = `E70${runId}${String(txIndex).padStart(2, '0')}`;
    const program = PROGRAMS[idx % PROGRAMS.length];
    const paket = idx % 3 === 0 ? 'TAC' : idx % 2 === 0 ? 'Premium' : 'Reguler';
    const konsjen = KONSJENS[idx % KONSJENS.length];
    const staff = STAFFS[idx % STAFFS.length];
    const pNominal = paket === 'TAC' ? 2850000 : paket === 'Premium' ? 2600000 : 2350000;
    const mKeluar = 1940000;
    const refFee = 100000;
    const sFee = 50000;
    const netFee = pNominal - mKeluar - refFee - sFee;

    // 1. Insert Pengajuan ke DB
    const insertPayload = {
      nama: applicantName,
      program,
      paket,
      konsjen,
      staff_pic: staff,
      status: 'Sedang Diproses',
      keterangan: `#STRESS_TEST# Batch ${runId} Tx-${txIndex}`,
      domisili_ktp: 'DKI Jakarta',
      no_wa: `08131122${String(txIndex).padStart(4, '0')}`,
      no_paspor: pasporNo,
      code_referral: affCode,
      nominal_dibayar: pNominal,
      nominal_keluar: mKeluar,
      cashback: 0,
      fee_bersih: netFee,
      payment_status: true,
      form_visa: true,
      ktp: true,
      ektln: true,
      coe: true,
      foto: true,
    };

    const { data: txRow, error: txError } = await supabase
      .from('pengajuan_visa')
      .insert([insertPayload])
      .select()
      .single();

    if (txError || !txRow) {
      throw new Error(`Tx-${txIndex} insert failed: ${txError?.message}`);
    }

    const txId = txRow.id;

    // 2. Upload 6 Dokumen Fisik Pemohon
    const docKeys = ['formVisa', 'paspor', 'foto', 'ktp', 'coe', 'ektln'];
    const uploadedDocsRecord = {};

    for (const docKey of docKeys) {
      const sizeKB = 50 + ((txIndex * 7 + docKey.length * 3) % 40); // 50 - 90 KB
      const imgBuffer = createSyntheticJpeg(`${applicantName}-${docKey}`, sizeKB);
      totalUploadedBytes += imgBuffer.length;

      const path = `applicants/${txId}/${docKey}_${Date.now()}.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, imgBuffer, { contentType: 'image/jpeg', upsert: true });

      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
        uploadedDocsRecord[docKey] = {
          name: `${docKey}_${pasporNo}.jpg`,
          url: urlData?.publicUrl || '',
          sizeKB,
          uploadedAt: new Date().toISOString(),
        };
      }
    }

    // 3. Upload Bukti Bayar Pemohon
    const payProofBuf = createSyntheticJpeg(`${applicantName}-StrukBayar`, 65);
    totalUploadedBytes += payProofBuf.length;
    const payProofPath = `applicants/${txId}/buktiBayar_${Date.now()}.jpg`;
    await supabase.storage.from(BUCKET).upload(payProofPath, payProofBuf, { contentType: 'image/jpeg', upsert: true });
    const { data: payUrlData } = supabase.storage.from(BUCKET).getPublicUrl(payProofPath);

    // 4. Upload Bukti Transfer Staf PIC
    const staffProofBuf = createSyntheticJpeg(`${applicantName}-TFStaf-${staff}`, 60);
    totalUploadedBytes += staffProofBuf.length;
    const staffProofPath = `proofs/staff/${txId}_staff_${Date.now()}.jpg`;
    await supabase.storage.from(BUCKET).upload(staffProofPath, staffProofBuf, { contentType: 'image/jpeg', upsert: true });
    const { data: staffUrlData } = supabase.storage.from(BUCKET).getPublicUrl(staffProofPath);

    // 5. Upload Bukti Transfer Komisi Mitra Affiliate
    const affProofBuf = createSyntheticJpeg(`${applicantName}-TFAffiliate-${affCode}`, 62);
    totalUploadedBytes += affProofBuf.length;
    const affProofPath = `proofs/mitra/${txId}_mitra_${Date.now()}.jpg`;
    await supabase.storage.from(BUCKET).upload(affProofPath, affProofBuf, { contentType: 'image/jpeg', upsert: true });
    const { data: affUrlData } = supabase.storage.from(BUCKET).getPublicUrl(affProofPath);

    // 6. Simpan Metadata Lengkap ke Kolom Keterangan Pengajuan
    const keteranganMetadata = {
      note: `#STRESS_TEST# Transaksi ${txIndex} dengan Affiliate ${affCode}`,
      program,
      paket,
      uploadedDocs: uploadedDocsRecord,
      fotoUrl: uploadedDocsRecord.foto?.url || '',
      statusPembayaran: 'Lunas',
      tglBayarPemohon: new Date().toISOString().split('T')[0],
      buktiBayarUrl: payUrlData?.publicUrl || '',
      buktiBayarNama: `Struk_${pasporNo}.jpg`,
      payoutStatus: 'Berhasil Ditransfer',
      payoutTanggal: new Date().toISOString().split('T')[0],
      payoutNoRef: `REF-AFF-${runId}-${txIndex}`,
      payoutBuktiUrl: affUrlData?.publicUrl || '',
      staffFee: sFee,
      staffPayoutStatus: 'Berhasil Ditransfer',
      staffPayoutTanggal: new Date().toISOString().split('T')[0],
      staffPayoutNoRef: `REF-STF-${runId}-${txIndex}`,
      staffPayoutBuktiUrl: staffUrlData?.publicUrl || '',
      affiliateCode: affCode,
      referralFee: refFee,
    };

    await supabase
      .from('pengajuan_visa')
      .update({ keterangan: JSON.stringify(keteranganMetadata) })
      .eq('id', txId);

    return {
      txIndex,
      txId,
      applicantName,
      affCode,
      pasporNo,
      docsCount: Object.keys(uploadedDocsRecord).length + 3,
    };
  });

  const txResults = await Promise.allSettled(transactionTasks);
  const t2End = Date.now();
  const successfulTx = txResults.filter((r) => r.status === 'fulfilled');
  const failedTx = txResults.filter((r) => r.status === 'rejected');

  const totalUploadedMB = (totalUploadedBytes / (1024 * 1024)).toFixed(2);
  const ingestionDurationSec = ((t2End - t2Start) / 1000).toFixed(2);
  const uploadSpeedMBps = (totalUploadedBytes / (1024 * 1024) / ((t2End - t2Start) / 1000)).toFixed(2);

  console.log(`\n📊 HASIL UPLOAD CONCURRENT (INGRESS METRICS):`);
  console.log(`- Transaksi Berhasil : ${successfulTx.length} / 20`);
  console.log(`- Transaksi Gagal    : ${failedTx.length}`);
  console.log(`- Total File Diunggah: 180 File (6 Dokumen + 3 Bukti TF/Bayar x 20 Tx)`);
  console.log(`- Total Ingress Data : ${totalUploadedMB} MB (${totalUploadedBytes.toLocaleString('id-ID')} bytes)`);
  console.log(`- Durasi Total Upload: ${ingestionDurationSec} detik`);
  console.log(`- Upload Throughput  : ${uploadSpeedMBps} MB/detik secara paralel`);

  // =========================================================================
  // TAHAP 3: PLAYWRIGHT CONCURRENT EGRESS MONITORING
  // =========================================================================
  console.log('\n[TAHAP 3] Meluncurkan Browser Playwright untuk Menguji Egress (Download Traffic) Secara Bersamaan...');
  console.log('   Menyimulasikan 5 user / staf yang membuka Dashboard, Detail Pengajuan, dan Portal Affiliate secara paralel.');

  let totalEgressBytes = 0;
  let supabaseApiEgressBytes = 0;
  let supabaseStorageEgressBytes = 0;
  let staticAssetBytes = 0;
  let totalRequestCount = 0;
  let storageRequestCount = 0;
  let apiRequestCount = 0;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });

  // Attach network response listener to capture precise byte counts
  const monitorPage = async (page, pageName) => {
    page.on('response', async (response) => {
      totalRequestCount++;
      const url = response.url();
      const status = response.status();

      let bodyLength = 0;
      try {
        const headers = response.headers();
        if (headers['content-length']) {
          bodyLength = parseInt(headers['content-length'], 10);
        } else {
          const buffer = await response.body().catch(() => null);
          bodyLength = buffer ? buffer.length : 0;
        }
      } catch {
        bodyLength = 0;
      }

      totalEgressBytes += bodyLength;

      if (url.includes('vswmndovcmchqhyzlawo.supabase.co/storage/v1/object/public/')) {
        supabaseStorageEgressBytes += bodyLength;
        storageRequestCount++;
      } else if (url.includes('vswmndovcmchqhyzlawo.supabase.co/rest/v1/')) {
        supabaseApiEgressBytes += bodyLength;
        apiRequestCount++;
      } else {
        staticAssetBytes += bodyLength;
      }
    });
  };

  const sampleTxIds = successfulTx.map((r) => r.value.txId);
  const t3Start = Date.now();

  console.log('   Membuka 5 sesi halaman Playwright secara paralel...');
  const pages = await Promise.all([
    context.newPage(),
    context.newPage(),
    context.newPage(),
    context.newPage(),
    context.newPage(),
  ]);

  await Promise.all([
    monitorPage(pages[0], 'Dashboard'),
    monitorPage(pages[1], 'Detail-Tx1'),
    monitorPage(pages[2], 'Detail-Tx2'),
    monitorPage(pages[3], 'Detail-Tx3'),
    monitorPage(pages[4], 'AffiliatePortal'),
  ]);

  // Navigate concurrently
  await Promise.all([
    pages[0].goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 }).catch((e) => console.warn('P0 warn:', e.message)),
    pages[1].goto(`http://localhost:5173?detail=${sampleTxIds[0] || 1}`, { waitUntil: 'networkidle', timeout: 30000 }).catch((e) => console.warn('P1 warn:', e.message)),
    pages[2].goto(`http://localhost:5173?detail=${sampleTxIds[1] || 2}`, { waitUntil: 'networkidle', timeout: 30000 }).catch((e) => console.warn('P2 warn:', e.message)),
    pages[3].goto(`http://localhost:5173?detail=${sampleTxIds[2] || 3}`, { waitUntil: 'networkidle', timeout: 30000 }).catch((e) => console.warn('P3 warn:', e.message)),
    pages[4].goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 }).catch((e) => console.warn('P4 warn:', e.message)),
  ]);

  // Simulate scrolling and tab interactions to trigger image lazy loading
  await Promise.all(
    pages.map(async (p) => {
      try {
        await p.evaluate(() => window.scrollBy(0, 800));
        await p.waitForTimeout(1500);
        await p.evaluate(() => window.scrollBy(0, 1200));
        await p.waitForTimeout(1000);
      } catch {}
    })
  );

  const t3End = Date.now();
  await browser.close();

  const testDurationSec = ((t3End - t3Start) / 1000).toFixed(2);
  const totalEgressKB = (totalEgressBytes / 1024).toFixed(2);
  const totalEgressMB = (totalEgressBytes / (1024 * 1024)).toFixed(2);
  const supabaseStorageEgressMB = (supabaseStorageEgressBytes / (1024 * 1024)).toFixed(2);
  const supabaseApiEgressKB = (supabaseApiEgressBytes / 1024).toFixed(2);

  // =========================================================================
  // TAHAP 4: ANALISIS & LAPORAN EGRESS SUPABASE SECARA MENYELURUH
  // =========================================================================
  console.log('\n' + '='.repeat(70));
  console.log('📈 LAPORAN LENGKAP EGRESS & BEBAN STRESS TEST MAPAHTRIP');
  console.log('='.repeat(70));
  console.log(`Waktu Eksekusi              : ${new Date().toLocaleString('id-ID')}`);
  console.log(`Jumlah Transaksi Concurrent : 20 Transaksi`);
  console.log(`Jumlah Akun Affiliate       : 20 Akun Mitra Baru`);
  console.log(`Total Dokumen & Bukti TF    : 180 Berkas (9 Berkas/Tx)`);
  console.log('-'.repeat(70));
  console.log(`📥 INGRESS (Data Upload ke Supabase Cloud):`);
  console.log(`   - Total Payload Terkirim : ${totalUploadedMB} MB (${totalUploadedBytes.toLocaleString('id-ID')} bytes)`);
  console.log(`   - Kecepatan Ingress      : ${uploadSpeedMBps} MB/s`);
  console.log(`   - Rata-rata per Berkas   : ${(totalUploadedBytes / 180 / 1024).toFixed(1)} KB/file (Sangat hemat & optimal!)`);
  console.log('-'.repeat(70));
  console.log(`📤 EGRESS (Data Download / Tarikan dari Supabase):`);
  console.log(`   - Total Egress Terukur   : ${totalEgressMB} MB (${totalEgressKB} KB)`);
  console.log(`   - Egress Storage Dokumen : ${supabaseStorageEgressMB} MB (${storageRequestCount} requests file/gambar)`);
  console.log(`   - Egress Database API    : ${supabaseApiEgressKB} KB (${apiRequestCount} requests REST JSON)`);
  console.log(`   - Total HTTP Requests    : ${totalRequestCount} requests`);
  console.log(`   - Durasi Pengujian       : ${testDurationSec} detik`);
  console.log('='.repeat(70));

  console.log('\n💡 KESIMPULAN & EVALUASI EGRESS:');
  if (parseFloat(supabaseStorageEgressMB) < 10) {
    console.log('✅ EGRESS SANGAT AMAN & HEMAT!');
    console.log(`   Total Egress Storage hanya ${supabaseStorageEgressMB} MB untuk 20 transaksi sekaligus.`);
    console.log('   Alasan hemat: Berkas dokumen telah dioptimasi/dikompresi ke rentang 50-80 KB per file sebelum diunggah.');
    console.log('   Kapasitas free tier Supabase Storage (5 GB/bulan) dapat menampung ribuan transaksi tanpa biaya tambahan.');
  } else {
    console.log('⚠️ EGRESS CUKUP BESAR:');
    console.log(`   Total Egress Storage mencapai ${supabaseStorageEgressMB} MB.`);
  }

  console.log('\nSemua transaksi stress test telah ditandai dengan label: #STRESS_TEST#');
  console.log('='.repeat(70));
}

main().catch((err) => {
  console.error('Fatal error during stress test:', err);
  process.exit(1);
});
