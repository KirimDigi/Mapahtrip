async function runAudit(mainPage) {
  const browser = mainPage.context().browser();
  const BASE_URL = 'http://localhost:5173';

  const accounts = [
    { type: 'mitra', code: 'MPH343HI', pass: 'MitraMPH343HI!', name: 'LPK Hibiki' },
    { type: 'mitra', code: 'MPH458RI', pass: 'MitraMPH458RI!', name: 'Rizky Muhammad E' },
    { type: 'mitra', code: 'MPH630AL', pass: 'MitraMPH630AL!', name: 'Albert Lazuardy' },
    { type: 'mitra', code: 'MPH965RE', pass: 'MitraMPH965RE!', name: 'Rizki Reihan Febriansyah' },
    { type: 'mitra', code: 'MPH555DE', pass: 'MitraMPH555DE!', name: 'Derryl' },
    { type: 'mitra', code: 'MPH314NA', pass: 'MitraMPH314NA!', name: 'LPK Navi Japan' },
    { type: 'mitra', code: 'MPH123AL', pass: 'MitraMPH123AL!', name: 'Alan Fauzy' },
    { type: 'mitra', code: 'MPH805HE', pass: 'MitraMPH805HE!', name: 'Heru Ferdita Kifli' },
    { type: 'mitra', code: 'MPH885SI', pass: 'MitraMPH885SI!', name: 'Silvieyana Rahman' },
    { type: 'mitra', code: 'MPH486AD', pass: 'MitraMPH486AD!', name: 'Ade Hidayanti A' },
    { type: 'mitra', code: 'MPH240AK', pass: 'MitraMPH240AK!', name: 'Ami Kamila' },
    { type: 'mitra', code: 'MPH550CA', pass: 'MitraMPH550CA!', name: 'Cahyadi' },
    { type: 'mitra', code: 'MPH537VE', pass: 'MitraMPH537VE!', name: 'Verry Wulandari' },
    { type: 'mitra', code: 'MPH199GI', pass: 'MitraMPH199GI!', name: 'Gilang' },
    { type: 'mitra', code: 'MPH196YO', pass: 'MitraMPH196YO!', name: 'Yova Mustafa G' },
    { type: 'mitra', code: 'MPH212YO', pass: 'MitraMPH212YO!', name: 'Yolanda Putri Nuraina' },
    { type: 'mitra', code: 'MPH362NU', pass: 'MitraMPH362NU!', name: 'Nurul Fardilah' },
    { type: 'mitra', code: 'MPH182RI', pass: 'MitraMPH182RI!', name: 'Rizkita Amanda' },
    { type: 'mitra', code: 'MPH985PP', pass: 'MitraMPH985PP!', name: 'Pput Yulianti' },
    { type: 'mitra', code: 'MPH678RI', pass: 'MitraMPH678RI!', name: 'Rifki' },
    { type: 'mitra', code: 'MPH673YA', pass: 'MitraMPH673YA!', name: 'Yayan Sopian' },
    { type: 'mitra', code: 'MPH123FA', pass: 'MitraMPH123FA!', name: 'Fachri Ardiansyah' },
    { type: 'mitra', code: 'MPH913DE', pass: 'MitraMPH913DE!', name: 'Dede Rizki Salsa' },
    { type: 'mitra', code: 'MPH028MS', pass: 'MitraMPH028MS!', name: 'M Saeful Anam' },
    { type: 'owner', code: 'owner@mapahtrip.id', pass: 'MapahTrip#2026', name: 'Owner MapahTrip' }
  ];

  let totalSupabaseRequests = 0;
  let totalEgressBytes = 0;
  let idlePollingCount = 0;
  const results = [];

  // Jalankan dalam 5 batch konkurensi paralel (5 user aktif per batch)
  const batchSize = 5;
  for (let i = 0; i < accounts.length; i += batchSize) {
    const batch = accounts.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (acc, idx) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      let pageSupabaseReqs = 0;
      let pageEgressBytes = 0;
      let postLoadReqs = 0;
      let isLoaded = false;

      page.on('response', async (res) => {
        const url = res.url();
        if (url.includes('supabase.co')) {
          pageSupabaseReqs++;
          totalSupabaseRequests++;
          if (isLoaded) {
            postLoadReqs++;
            idlePollingCount++;
          }
          try {
            const buf = await res.body();
            const bytes = buf.length;
            pageEgressBytes += bytes;
            totalEgressBytes += bytes;
          } catch {
            const cl = res.headers()['content-length'];
            if (cl) {
              const bytes = parseInt(cl, 10);
              pageEgressBytes += bytes;
              totalEgressBytes += bytes;
            }
          }
        }
      });

      try {
        if (acc.type === 'mitra') {
          // 1. Kunjungi Halaman Login Mitra
          await page.goto(`${BASE_URL}/affiliate#affiliate-login`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(300);

          // 2. Isi Form Login
          const emailInput = page.locator('input[type="email"], input[placeholder*="email" i], input[placeholder*="kode" i]').first();
          const passInput = page.locator('input[type="password"]').first();
          
          if (await emailInput.count() > 0 && await passInput.count() > 0) {
            await emailInput.fill(acc.code);
            await passInput.fill(acc.pass);
            await page.click('button:has-text("Masuk ke Akun")');
            await page.waitForTimeout(800);
          }

          // 3. Lakukan interaksi transaksi / pencarian
          const searchInput = page.locator('input[placeholder*="Cari nama pemohon"]').first();
          if (await searchInput.count() > 0) {
            await searchInput.fill('a');
            await page.waitForTimeout(300);
            await searchInput.fill('');
          }
        } else {
          // Akun Owner: Test transaksi form & pencarian payout
          await page.goto(`${BASE_URL}/owner#owner`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(500);

          // Uji Buka Form Pendaftaran
          const btnNew = page.locator('button:has-text("+ Pemohon"), button.header-new-btn').first();
          if (await btnNew.count() > 0) {
            await btnNew.click();
            await page.waitForTimeout(400);

            // Isi input dummy
            const nameInput = page.locator('#new-modal-nama-pemohon, input[placeholder*="nama lengkap" i]').first();
            if (await nameInput.count() > 0) {
              await nameInput.fill('Tester Konkurensi Egress');
            }
            // Tutup modal agar tidak mengotori DB
            const closeBtn = page.locator('button:has-text("✕")').first();
            if (await closeBtn.count() > 0) {
              await closeBtn.click();
              await page.waitForTimeout(300);
            }
          }
        }

        // 4. Verifikasi Kebocoran Polling saat IDLE (tunggu 2 detik tanpa aksi)
        isLoaded = true;
        await page.waitForTimeout(2000);

        results.push({
          account: acc.name,
          code: acc.code,
          status: 'SUCCESS',
          supabaseRequests: pageSupabaseReqs,
          egressKB: (pageEgressBytes / 1024).toFixed(2),
          postLoadReqs: postLoadReqs
        });
      } catch (err) {
        results.push({
          account: acc.name,
          code: acc.code,
          status: 'ERROR: ' + err.message,
          supabaseRequests: pageSupabaseReqs,
          egressKB: (pageEgressBytes / 1024).toFixed(2),
          postLoadReqs: postLoadReqs
        });
      } finally {
        await context.close();
      }
    }));
  }

  // Visual Screenshot Bukti Uji Coba Konkurensi
  await mainPage.screenshot({ path: 'public/audit-concurrency-evidence.png' });

  return {
    totalAccounts: accounts.length,
    successCount: results.filter(r => r.status === 'SUCCESS').length,
    totalSupabaseRequests,
    totalEgressKB: (totalEgressBytes / 1024).toFixed(2),
    totalEgressMB: (totalEgressBytes / (1024 * 1024)).toFixed(3),
    avgEgressPerAccountKB: (totalEgressBytes / 1024 / accounts.length).toFixed(2),
    idlePollingCount,
    isLeakDetected: idlePollingCount > 0,
    details: results
  };
}
