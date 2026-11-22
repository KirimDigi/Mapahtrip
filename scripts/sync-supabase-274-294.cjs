const { createClient } = require('@supabase/supabase-js');
const { REAL_SPREADSHEET_PENGAJUAN, REAL_SPREADSHEET_AFFILIATES } = require('../src/data/spreadsheetData.ts');

const SUPABASE_URL = 'https://vswmndovcmchqhyzlawo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzd21uZG92Y21jaHFoeXpsYXdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwODg0MDksImV4cCI6MjEwNzY2NDQwOX0.79-tEuh-1M3MeJaBnIIbVtrFwUfKK_I-VmC-zm_fQhQ';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log('=== Step 1: Sync new Affiliates to Supabase ===');
  const targetAffiliates = ['MPH962HM', 'MPH712IR'];
  for (const code of targetAffiliates) {
    const aff = REAL_SPREADSHEET_AFFILIATES.find(a => a.affiliateCode === code);
    if (!aff) {
      console.warn(`Affiliate ${code} not found in REAL_SPREADSHEET_AFFILIATES`);
      continue;
    }
    const { data: existing } = await supabase
      .from('mitra_affiliate')
      .select('id, kode_referral')
      .eq('kode_referral', code)
      .maybeSingle();

    if (existing) {
      console.log(`Affiliate ${code} already exists (ID: ${existing.id})`);
    } else {
      const { data: inserted, error: affErr } = await supabase
        .from('mitra_affiliate')
        .insert({
          nama: aff.nama,
          email: aff.email || `${code.toLowerCase()}@mapahtrip.id`,
          password: `Mitra${code}!`,
          no_wa: aff.noWa || '',
          no_ktp: '3201000000000000',
          status_mitra: aff.statusMitra || 'Umum',
          lembaga_lpk: aff.lembaga || 'Mitra Independen',
          alamat: aff.alamat || 'Indonesia',
          provinsi: aff.provinsi || 'Indonesia',
          akun_ig: aff.akunIg || '-',
          follower_ig: aff.followerIg || '-',
          kode_referral: code,
          nama_bank: aff.namaBank || null,
          nomor_rekening: aff.nomorRekening || null,
          atas_nama: aff.atasNamaRekening || null,
          is_profile_complete: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (affErr) {
        console.error(`Failed to insert affiliate ${code}:`, affErr);
      } else {
        console.log(`Successfully inserted affiliate ${code} (ID: ${inserted.id})`);
      }
    }
  }

  console.log('\n=== Step 2: Sync records 274 to 294 to pengajuan_visa ===');
  const recordsToSync = REAL_SPREADSHEET_PENGAJUAN.filter(p => {
    const num = Number(p.id);
    return num >= 274 && num <= 294;
  });

  console.log(`Found ${recordsToSync.length} records to sync (No. 274 - 294).`);

  for (const p of recordsToSync) {
    const noUrut = Number(p.id);
    const { data: existing } = await supabase
      .from('pengajuan_visa')
      .select('id, no_urut, nama')
      .eq('no_urut', noUrut)
      .maybeSingle();

    if (existing) {
      console.log(`Record No. ${noUrut} (${p.namaPemohon}) already exists (ID: ${existing.id}). Skipping.`);
      continue;
    }

    const isWaiver = (p.program || '').toLowerCase().includes('waiver');
    const keteranganObj = {
      note: p.catatan || 'Pendaftaran via Spreadsheet MapahTrip (Data_Apply)',
      uploadedDocs: {},
      staffFee: p.staffFee || 0,
      referralFee: p.referralFee || 0,
      staffPayoutStatus: 'Berhasil Ditransfer',
      statusPembayaran: p.statusPembayaran || 'Lunas',
      metodePembayaran: p.metodePembayaran || 'Transfer BCA',
      tglBayarPemohon: p.tglBayarPemohon || p.tglBerkasMasuk || '',
    };

    const rowPayload = {
      no_urut: noUrut,
      nama: p.namaPemohon,
      program: p.program,
      paket: p.paket || 'Reguler',
      konsjen: p.konsjen || 'Jakarta',
      staff_pic: isWaiver ? '' : (p.staffPic || ''),
      status: p.status,
      keterangan: JSON.stringify(keteranganObj),
      form_visa: Boolean(p.berkas?.formVisa),
      ktp: Boolean(p.berkas?.ktp),
      ektln: Boolean(p.berkas?.ektln),
      coe: Boolean(p.berkas?.coe),
      foto: Boolean(p.berkas?.foto),
      tgl_sampai: p.tglBerkasMasuk || null,
      tgl_proses: p.tglApply || null,
      tgl_selesai: p.tglSelesai || (p.status === 'Selesai' ? p.tglEstimasiSelesai : null),
      tgl_kirim: p.tglKirim || (p.status === 'Selesai' ? p.tglEstimasiSelesai : null),
      resi_pengiriman: p.noResi || (p.status === 'Selesai' ? 'Handover Langsung' : null),
      jadwal_terbang: null,
      domisili_ktp: null,
      no_wa: p.noTelp || null,
      no_paspor: p.noPaspor || null,
      code_referral: p.affiliateCode || 'MAPAHTRIP',
      nominal_dibayar: p.dibayarPemohon || 0,
      nominal_keluar: p.nominalKeluar || 0,
      cashback: p.cashback || 0,
      fee_bersih: p.feeBersih || 0,
      payment_status: true,
      created_at: `${p.tglBerkasMasuk || '2026-11-14'}T08:00:00.000Z`,
      updated_at: `${p.tglBerkasMasuk || '2026-11-14'}T08:00:00.000Z`,
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('pengajuan_visa')
      .insert(rowPayload)
      .select('id, no_urut, nama')
      .single();

    if (insertErr) {
      console.error(`Failed to insert No. ${noUrut} (${p.namaPemohon}):`, insertErr);
    } else {
      console.log(`Inserted No. ${noUrut} (${inserted.nama}) -> ID: ${inserted.id}`);
    }
  }

  console.log('\n=== Sync completed! Checking final count ===');
  const { count } = await supabase
    .from('pengajuan_visa')
    .select('*', { count: 'exact', head: true });
  console.log('Total pengajuan_visa rows in Supabase now:', count);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
