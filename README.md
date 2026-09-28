# DIMDIM SHINE POS

Aplikasi POS dan backoffice berbasis Next.js 16.2.4, React 19, dan Supabase PostgreSQL. Dokumen ini menjelaskan kondisi kode setelah migrasi September 2026. Beberapa fitur yang masih terlihat di source belum tersambung ke menu atau tidak didukung oleh alur penjualan baru; baca audit sebelum mengubahnya.

## Mulai dari sini

| Kebutuhan | Dokumen |
| --- | --- |
| Arsitektur dan seluruh route | [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) |
| Skema, fungsi, izin, snapshot data | [DATABASE_REFERENCE.md](DATABASE_REFERENCE.md) |
| Temuan pascamigrasi dan bukti | [POST_MIGRATION_AUDIT.md](POST_MIGRATION_AUDIT.md) |
| Prioritas perbaikan/pengembangan | [IMPROVEMENT_SUGGESTIONS.md](IMPROVEMENT_SUGGESTIONS.md) |
| Urutan implementasi dan matriks uji admin | [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) |
| Langkah pengguna sesuai fitur aktif | [APP_TUTORIAL.md](APP_TUTORIAL.md) |
| Staging, cutover, dan rollback aman | [CUTOVER_RUNBOOK.md](CUTOVER_RUNBOOK.md) |

## Menjalankan secara lokal

Siapkan `.env.local` dengan `NEXT_PUBLIC_SUPABASE_URL` dan `SUPABASE_SECRET_KEY` untuk proyek **staging**. Secret hanya boleh dipakai server. `MAINTENANCE_MODE=true` dapat menghentikan akses aplikasi selama pemeliharaan. Jangan gunakan secret produksi untuk pengembangan atau commit `.env.local`.

```bash
npm ci
npm run dev
npx tsc --noEmit
npm run lint
npm run build
```

Route utama: `/pos/shift` untuk login dan buka shift, `/pos` untuk kasir, `/admin/login` untuk admin. Browser memperoleh data melalui proxy internal `/api/data/[table]`; operasi kritis memakai Server Actions dan fungsi database `pos_*`.

## Tampilan dan identitas

Tema aplikasi memakai palet gelap dan merah dengan permukaan claymorphism. Gaya bersama ada di `app/globals.css` melalui kelas `clay-app`, `clay-shell`, `clay-surface`, `clay-header`, dan `clay-sidebar`; halaman lama yang masih memakai utility Tailwind terang dipetakan ke tema baru di sana. Logo sumber berada di `public/poslogo.png`, dipakai oleh header, login, manifest PWA, dan ikon aplikasi `app/icon.png`. Saat mengubah warna, periksa juga kontras formulir, tabel, modal, serta hasil cetak struk dan faktur.

## Status verifikasi 28 September 2026

- TypeScript lulus. Lint seluruh repo gagal: 106 error, 15 warning.
- `npm run build` lulus saat dijalankan di luar sandbox audit; percobaan awal di sandbox terhenti pada `spawn EPERM`. Ini memverifikasi build kode lokal, bukan perilaku deployment berautentikasi.
- Database diperiksa baca saja; konektor tidak menampilkan riwayat migrasi, meskipun skema dan fungsi hasil migrasi ada.
- Penjualan aktif saat ini tunai atau QRIS. Route dan perhitungan piutang telah dihapus dari kode; kolom historis tetap ada di database. Pelanggan pada checkout dan pengiriman belum tersambung. Verifikasi mutasi admin di staging masih diperlukan; lihat [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).
