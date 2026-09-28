# Runbook migrasi dan pemulihan DIMDIM SHINE

Diperbarui 28 September 2026. Ini catatan kondisi teramati dan prosedur untuk **perubahan berikutnya**. Jangan menjalankan ulang migrasi atau skrip cutover pada produksi hanya karena berkasnya tersedia. Semua query audit pada dokumen ini baca saja; operasi perbaikan harus disiapkan dan diuji di staging terlebih dahulu.

## Kondisi teramati

- Skema live memiliki `pos_sessions`, `pos_login_failures`, `sale_stock_usage`, kolom keamanan/rekonsiliasi, indeks satu shift open per kasir, dan 19 fungsi `pos_*`. `pos_login` live memakai perbaikan alias user dari `fix_login_ambiguous.sql`.
- PIN plaintext `users.pin` telah dihapus. Semua tabel operasional `public` memiliki RLS; anon tidak mempunyai hak SELECT; fungsi `pos_*` tidak dapat dipanggil anon/authenticated langsung.
- Konektor daftar migrasi mengembalikan kosong dan `supabase_migrations.schema_migrations` tidak ada. Karena itu penerapan SQL teramati melalui skema, bukan catatan migrasi resmi.
- 24 shift lama ditutup dengan `migration_reason` tanpa kas akhir. Saat audit seluruh 31 shift closed dan 4 sesi masih valid. Satu transaksi paid tanpa item memerlukan review manual.
- `npx tsc --noEmit` dan `npm run build` lulus; lint gagal 106 error dan 15 warning. Percobaan build awal dalam sandbox terhenti pada `spawn EPERM`, lalu build berhasil di luar sandbox. Status deployment nyata dan backup yang dapat dipulihkan belum diverifikasi pada pemeriksaan ini.

## Sebelum perubahan berikutnya

1. Pastikan proyek staging terpisah dan gunakan data uji atau data yang disamarkan. Catat versi kode/deployment serta skema live yang akan diubah.
2. Ambil backup sesuai prosedur operasional dan **uji pemulihannya di staging**. Catat waktu, ukuran, dan orang yang memverifikasi. Jangan menganggap backup valid hanya karena file dibuat.
3. Jalankan `supabase/cutover/preflight.sql` secara baca saja pada staging dan produksi untuk membandingkan integritas. Satu transaksi paid tanpa item yang sudah diketahui jangan diperbaiki otomatis.
4. Siapkan migrasi baru dan prosedur rollback yang mempertahankan data. Periksa fungsi, grant, RLS, proxy `/api/data`, Server Actions, dan UI bersama sama.
5. Uji role kasir, manager, super admin; login/PIN, expiry, shift, tunai/QRIS, quote berubah, stok kurang, klik ganda, pembelian, adjustment, void, laporan, dan worker PWA.
6. Hijaukan typecheck, lint, dan build di CI. Build lokal yang berhasil tetap belum cukup untuk menyatakan alur deployment siap.

## Saat rilis

1. Jadwalkan jeda transaksi dan aktifkan `MAINTENANCE_MODE=true` sebelum DDL atau perubahan izin yang memutus kontrak kode lama. Pastikan seluruh terminal/PWA mengetahui jeda.
2. Terapkan hanya migrasi yang direncanakan pada proyek yang benar dan catat hasilnya. Jangan mengulang `202609260001_secure_access.sql`, `202609260002_atomic_operations.sql`, `lock_down_anon.sql`, atau `fix_login_ambiguous.sql` tanpa analisis khusus.
3. Deploy kode yang cocok dengan skema, lalu jalankan smoke test staging/produksi yang tidak menulis data sebelum membuka transaksi. Uji penjualan nyata hanya bila ada otorisasi operasional dan rencana pembatalan.
4. Verifikasi anon tetap ditolak. `npm run smoke:anon` memerlukan URL dan anon key dalam lingkungan shell; ia memakai HEAD dan PATCH pada ID mustahil. Jangan tampilkan key pada log.
5. Setelah alur kritis lulus, nonaktifkan maintenance mode dan pantau error login, proxy 403, quote, stok, dan shift. Jika gagal, pertahankan jeda; jangan membuka policy anon sebagai jalan pintas.

## Pemeriksaan baca saja

```sql
select status, count(*) from public.shifts group by status;
select count(*) from public.pos_sessions
where revoked_at is null and expires_at > now();
select t.id, t.created_at, t.total from public.transactions t
where t.payment_status = 'paid'
  and not exists (
    select 1 from public.transaction_items ti where ti.transaction_id = t.id
  );
select schemaname, tablename, policyname from pg_policies
where schemaname = 'public';
```

Jangan membaca nilai `pin_hash`, `token_hash`, atau secret. Untuk detail skema dan status data, lihat [DATABASE_REFERENCE.md](DATABASE_REFERENCE.md); untuk bug aplikasi, lihat [POST_MIGRATION_AUDIT.md](POST_MIGRATION_AUDIT.md).
