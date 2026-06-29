-- Eksekusi skrip ini di SQL Editor pada Dashboard Supabase Anda
-- Untuk menambahkan fitur Janji Bayar (Jatuh Tempo)

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS due_date DATE;
