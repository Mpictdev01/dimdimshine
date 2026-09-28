-- Apply on staging first. Keep the old application in maintenance mode during cutover.
create extension if not exists pgcrypto with schema extensions;

-- Credentials must become private before hashes are materialized. Run this
-- migration in production only after maintenance mode begins.
drop policy if exists "Allow anon full access on users" on public.users;
revoke all on table public.users from anon, authenticated;
alter table public.store_settings alter column tax_rate set default 0;
alter table public.store_settings alter column tax_rate set not null;
alter table public.store_settings alter column service_charge set not null;
alter table public.store_settings add constraint store_settings_tax_rate_valid check (tax_rate between 0 and 100);
alter table public.store_settings add constraint store_settings_service_charge_valid check (service_charge between 0 and 100);

alter table public.users add column if not exists pin_hash text;
alter table public.users add column if not exists must_change_pin boolean not null default true;
alter table public.users add column if not exists legacy_pin_expires_at timestamptz;
alter table public.users add column if not exists is_active boolean not null default true;
alter table public.users alter column pin drop not null;
alter table public.users drop constraint if exists users_pin_key;

-- Cashiers get 48 hours to replace their old PIN. Admin accounts are deliberately
-- locked until their new PIN is assigned during cutover.
update public.users
set pin_hash = extensions.crypt(pin, extensions.gen_salt('bf', 12)),
    legacy_pin_expires_at = now() + interval '48 hours',
    must_change_pin = true
where role = 'cashier' and pin is not null and pin_hash is null;

update public.users
set pin_hash = null, legacy_pin_expires_at = null, must_change_pin = true
where role in ('manager', 'super_admin') and pin is not null;

create table if not exists public.pos_sessions (
  token_hash text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists pos_sessions_user_id_idx on public.pos_sessions(user_id);

create table if not exists public.pos_login_failures (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists pos_login_failures_user_time_idx on public.pos_login_failures(user_id, created_at);
create index if not exists pos_login_failures_ip_time_idx on public.pos_login_failures(ip_hash, created_at);

alter table public.pos_sessions enable row level security;
alter table public.pos_login_failures enable row level security;
revoke all on public.pos_sessions, public.pos_login_failures from public, anon, authenticated;
grant all on public.pos_sessions, public.pos_login_failures to service_role;

create or replace function public.pos_login(
  p_user_id uuid, p_pin text, p_ip_hash text, p_token_hash text
) returns table(user_id uuid, full_name text, role text, must_change_pin boolean, expires_at timestamptz)
language plpgsql security definer set search_path = public, extensions as $$
declare v_user public.users%rowtype;
declare v_expiry timestamptz;
begin
  if p_pin !~ '^[0-9]{4,8}$' or length(p_ip_hash) <> 64 or length(p_token_hash) <> 64 then
    return;
  end if;
  -- Serialize attempts for this account and IP so simultaneous guesses share the limit.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  perform pg_advisory_xact_lock(hashtextextended(p_ip_hash, 1));
  select * into v_user from public.users where id = p_user_id for update;
  if not found or not v_user.is_active then return; end if;
  if (select count(*) from public.pos_login_failures f where f.user_id = p_user_id and f.created_at > now() - interval '15 minutes') >= 5
     or (select count(*) from public.pos_login_failures f where f.ip_hash = p_ip_hash and f.created_at > now() - interval '15 minutes') >= 20 then
    return;
  end if;
  if v_user.pin_hash is null or extensions.crypt(p_pin, v_user.pin_hash) <> v_user.pin_hash
     or (v_user.legacy_pin_expires_at is not null and v_user.legacy_pin_expires_at < now()) then
    insert into public.pos_login_failures(user_id, ip_hash) values (p_user_id, p_ip_hash);
    return;
  end if;
  delete from public.pos_login_failures f where f.user_id = p_user_id;
  v_expiry := now() + case when v_user.role = 'cashier' then interval '12 hours' else interval '8 hours' end;
  insert into public.pos_sessions(token_hash, user_id, expires_at) values (p_token_hash, p_user_id, v_expiry);
  return query select v_user.id, v_user.full_name::text, v_user.role::text, v_user.must_change_pin, v_expiry;
end $$;

create or replace function public.pos_change_pin(p_user_id uuid, p_new_pin text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_new_pin !~ '^[0-9]{6,8}$' then raise exception 'PIN harus 6–8 digit'; end if;
  update public.users set pin_hash = extensions.crypt(p_new_pin, extensions.gen_salt('bf', 12)),
    must_change_pin = false, legacy_pin_expires_at = null, updated_at = now()
  where id = p_user_id;
  if not found then raise exception 'Akun tidak ditemukan'; end if;
  update public.pos_sessions set revoked_at = now() where user_id = p_user_id and revoked_at is null;
end $$;

-- Assign fresh 6–8 digit admin PINs through the Supabase SQL editor at cutover:
-- select public.pos_change_pin('<admin-user-uuid>', '<new-pin>');
-- Never save those PINs in a migration or deployment variable.

revoke all on function public.pos_login(uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.pos_change_pin(uuid,text) from public, anon, authenticated;
grant execute on function public.pos_login(uuid,text,text,text) to service_role;
grant execute on function public.pos_change_pin(uuid,text) to service_role;

alter table public.shifts add column if not exists expected_cash numeric(12,2);
alter table public.shifts add column if not exists cash_difference numeric(12,2);
alter table public.shifts add column if not exists migration_reason text;

alter table public.transactions drop constraint if exists transactions_order_type_check;
alter table public.transactions add constraint transactions_order_type_check check (order_type in ('sale','delivery','pickup'));
alter table public.transactions alter column order_type set default 'sale';
alter table public.transactions add column if not exists idempotency_key uuid;
alter table public.transactions add column if not exists idempotency_request_hash text;
create unique index if not exists transactions_idempotency_key_idx on public.transactions(idempotency_key) where idempotency_key is not null;

create or replace function public.pos_open_shift(p_user_id uuid, p_starting_cash numeric)
returns public.shifts language plpgsql security definer set search_path = public as $$
declare v_shift public.shifts;
begin
  if p_starting_cash is null or p_starting_cash < 0 then raise exception 'Kas awal tidak valid'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 3));
  if exists (select 1 from public.shifts where cashier_id = p_user_id and status = 'open') then
    raise exception 'Masih ada shift aktif';
  end if;
  insert into public.shifts(cashier_id, starting_cash, status) values (p_user_id, p_starting_cash, 'open') returning * into v_shift;
  return v_shift;
end $$;

create or replace function public.pos_close_shift(p_user_id uuid, p_shift_id uuid, p_physical_cash numeric)
returns public.shifts language plpgsql security definer set search_path = public as $$
declare v_shift public.shifts;
declare v_cash_sales numeric;
declare v_expenses numeric;
declare v_expected numeric;
begin
  if p_physical_cash is null or p_physical_cash < 0 then raise exception 'Kas fisik tidak valid'; end if;
  select * into v_shift from public.shifts where id = p_shift_id and cashier_id = p_user_id and status = 'open' for update;
  if not found then raise exception 'Shift aktif tidak ditemukan'; end if;
  select coalesce(sum(total),0) into v_cash_sales from public.transactions
    where shift_id = p_shift_id and payment_method = 'cash' and payment_status = 'paid';
  select coalesce(sum(amount),0) into v_expenses from public.expenses where shift_id = p_shift_id;
  v_expected := v_shift.starting_cash + v_cash_sales - v_expenses;
  update public.shifts set ending_cash = p_physical_cash, expected_cash = v_expected,
    cash_difference = p_physical_cash - v_expected, end_time = now(), status = 'closed', updated_at = now()
  where id = p_shift_id returning * into v_shift;
  return v_shift;
end $$;

revoke all on function public.pos_open_shift(uuid,numeric) from public, anon, authenticated;
revoke all on function public.pos_close_shift(uuid,uuid,numeric) from public, anon, authenticated;
grant execute on function public.pos_open_shift(uuid,numeric) to service_role;
grant execute on function public.pos_close_shift(uuid,uuid,numeric) to service_role;

create or replace function public.pos_save_user(p_id uuid, p_name text, p_role text, p_pin text)
returns table(id uuid, full_name text, role text) language plpgsql security definer set search_path = public, extensions as $$
declare v_old_role text;
declare v_id uuid;
begin
  if nullif(trim(p_name),'') is null or length(trim(p_name)) > 255 then raise exception 'Nama tidak valid'; end if;
  if p_role not in ('cashier','manager','super_admin') then raise exception 'Role tidak valid'; end if;
  if p_pin is not null and p_pin !~ '^[0-9]{6,8}$' then raise exception 'PIN harus 6–8 digit'; end if;
  if p_id is null then
    if p_pin is null then raise exception 'PIN wajib untuk akun baru'; end if;
    insert into public.users(full_name, role, pin_hash, must_change_pin, is_active)
      values(trim(p_name), p_role, extensions.crypt(p_pin, extensions.gen_salt('bf',12)), false, true)
      returning users.id into v_id;
  else
    select users.role into v_old_role from public.users where users.id = p_id for update;
    if not found then raise exception 'Akun tidak ditemukan'; end if;
    if v_old_role = 'super_admin' and p_role <> 'super_admin' then raise exception 'Super Admin tidak dapat diturunkan'; end if;
    update public.users set full_name = trim(p_name), role = p_role, updated_at = now(),
      pin_hash = case when p_pin is null then pin_hash else extensions.crypt(p_pin, extensions.gen_salt('bf',12)) end,
      must_change_pin = case when p_pin is null then must_change_pin else false end,
      legacy_pin_expires_at = case when p_pin is null then legacy_pin_expires_at else null end
      where users.id = p_id;
    if v_old_role <> p_role or p_pin is not null then
      update public.pos_sessions set revoked_at = now() where user_id = p_id and revoked_at is null;
    end if;
    v_id := p_id;
  end if;
  return query select users.id, users.full_name::text, users.role::text from public.users where users.id = v_id;
end $$;

create or replace function public.pos_deactivate_user(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.users where id = p_id and role = 'super_admin') then raise exception 'Super Admin tidak dapat dinonaktifkan'; end if;
  update public.users set is_active = false, updated_at = now() where id = p_id;
  if not found then raise exception 'Akun tidak ditemukan'; end if;
  update public.pos_sessions set revoked_at = now() where user_id = p_id and revoked_at is null;
end $$;

revoke all on function public.pos_save_user(uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.pos_deactivate_user(uuid) from public, anon, authenticated;
grant execute on function public.pos_save_user(uuid,text,text,text) to service_role;
grant execute on function public.pos_deactivate_user(uuid) to service_role;
