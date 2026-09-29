-- Cashiers may request ingredient stock. Only an active super admin can approve it.
-- Quantities and units are snapshotted so later ingredient edits do not change
-- the amount approved. No stock changes while a request is pending or rejected.
create table public.ingredient_stock_requests (
  id uuid primary key default gen_random_uuid(),
  request_key uuid not null unique,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  requested_by uuid not null references public.users(id) on delete restrict,
  shift_id uuid not null references public.shifts(id) on delete restrict,
  quantity_purchase numeric(12,2) not null check (quantity_purchase > 0 and quantity_purchase <= 100000),
  unit_snapshot text not null,
  yield_quantity_snapshot numeric(12,2) not null check (yield_quantity_snapshot > 0),
  yield_unit_snapshot text not null,
  quantity_stock numeric(12,2) not null check (quantity_stock > 0),
  note text not null check (char_length(btrim(note)) between 3 and 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.users(id) on delete restrict,
  review_note text check (review_note is null or char_length(review_note) <= 500),
  stock_before numeric(12,2),
  stock_after numeric(12,2),
  constraint ingredient_stock_request_review_consistent check (
    (status = 'pending' and reviewed_at is null and reviewed_by is null
      and stock_before is null and stock_after is null)
    or (status = 'rejected' and reviewed_at is not null and reviewed_by is not null
      and char_length(btrim(coalesce(review_note, ''))) between 3 and 500
      and stock_before is null and stock_after is null)
    or (status = 'approved' and reviewed_at is not null and reviewed_by is not null
      and stock_before is not null and stock_after is not null)
  )
);

create index ingredient_stock_requests_status_time_idx
  on public.ingredient_stock_requests(status, requested_at desc);
create index ingredient_stock_requests_requester_time_idx
  on public.ingredient_stock_requests(requested_by, requested_at desc);
create index ingredient_stock_requests_ingredient_idx
  on public.ingredient_stock_requests(ingredient_id);
create index ingredient_stock_requests_shift_idx
  on public.ingredient_stock_requests(shift_id);
create index ingredient_stock_requests_reviewer_idx
  on public.ingredient_stock_requests(reviewed_by)
  where reviewed_by is not null;
create index ingredient_stock_requests_reviewed_time_idx
  on public.ingredient_stock_requests(reviewed_at desc)
  where status <> 'pending';

alter table public.ingredient_stock_requests enable row level security;
revoke all on public.ingredient_stock_requests from public, anon, authenticated;
grant select, insert, update on public.ingredient_stock_requests to service_role;

create or replace function public.pos_request_ingredient_stock(
  p_actor_id uuid,
  p_shift_id uuid,
  p_ingredient_id uuid,
  p_quantity_purchase numeric,
  p_note text,
  p_request_key uuid
)
returns public.ingredient_stock_requests
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_role text;
  v_shift_status text;
  v_ingredient public.ingredients%rowtype;
  v_request public.ingredient_stock_requests%rowtype;
  v_stock_delta numeric(12,2);
  v_note text := btrim(coalesce(p_note, ''));
begin
  select role into v_role from public.users
  where id = p_actor_id and is_active = true for share;
  if not found or v_role is distinct from 'cashier' then
    raise exception 'Hanya kasir aktif yang dapat mengajukan stok bahan';
  end if;

  select status into v_shift_status from public.shifts
  where id = p_shift_id and cashier_id = p_actor_id for share;
  if not found or v_shift_status is distinct from 'open' then
    raise exception 'Buka shift sebelum mengajukan stok bahan';
  end if;

  if p_request_key is null or p_quantity_purchase is null
    or p_quantity_purchase <= 0 or p_quantity_purchase > 100000
    or p_quantity_purchase <> round(p_quantity_purchase, 2)
    or char_length(v_note) not between 3 and 500 then
    raise exception 'Jumlah atau catatan permintaan stok tidak valid';
  end if;

  select * into v_ingredient from public.ingredients
  where id = p_ingredient_id for share;
  if not found or v_ingredient.yield_quantity is null
    or v_ingredient.yield_quantity <= 0 then
    raise exception 'Bahan baku tidak tersedia';
  end if;

  v_stock_delta := round(p_quantity_purchase * v_ingredient.yield_quantity, 2);
  if v_stock_delta <= 0 then
    raise exception 'Jumlah terlalu kecil untuk satuan stok bahan';
  end if;

  insert into public.ingredient_stock_requests (
    request_key, ingredient_id, requested_by, shift_id,
    quantity_purchase, unit_snapshot, yield_quantity_snapshot,
    yield_unit_snapshot, quantity_stock, note
  ) values (
    p_request_key, p_ingredient_id, p_actor_id, p_shift_id,
    p_quantity_purchase, coalesce(nullif(btrim(v_ingredient.unit), ''), 'unit'),
    v_ingredient.yield_quantity,
    coalesce(nullif(btrim(v_ingredient.yield_unit), ''),
      nullif(btrim(v_ingredient.unit), ''), 'unit'),
    v_stock_delta, v_note
  ) on conflict (request_key) do nothing
  returning * into v_request;

  if v_request.id is null then
    select * into v_request from public.ingredient_stock_requests
    where request_key = p_request_key;
    if v_request.requested_by is distinct from p_actor_id
      or v_request.shift_id is distinct from p_shift_id
      or v_request.ingredient_id is distinct from p_ingredient_id
      or v_request.quantity_purchase is distinct from p_quantity_purchase
      or v_request.note is distinct from v_note then
      raise exception 'Kunci permintaan sudah digunakan untuk data lain';
    end if;
  end if;
  return v_request;
end $$;

create or replace function public.pos_review_ingredient_stock_request(
  p_request_id uuid,
  p_actor_id uuid,
  p_decision text,
  p_review_note text
)
returns public.ingredient_stock_requests
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_role text;
  v_request public.ingredient_stock_requests%rowtype;
  v_before numeric(12,2);
  v_after numeric(12,2);
  v_current_unit text;
  v_note text := nullif(btrim(coalesce(p_review_note, '')), '');
begin
  select role into v_role from public.users
  where id = p_actor_id and is_active = true for share;
  if not found or v_role is distinct from 'super_admin' then
    raise exception 'Hanya super admin aktif yang dapat memutuskan permintaan stok';
  end if;
  if p_decision not in ('approved', 'rejected') or p_decision is null
    or char_length(coalesce(v_note, '')) > 500
    or (p_decision = 'rejected' and char_length(coalesce(v_note, '')) < 3) then
    raise exception 'Keputusan atau catatan penolakan tidak valid';
  end if;

  select * into v_request from public.ingredient_stock_requests
  where id = p_request_id for update;
  if not found then raise exception 'Permintaan stok tidak ditemukan'; end if;
  if v_request.status <> 'pending' then
    raise exception 'Permintaan stok sudah diputuskan';
  end if;

  if p_decision = 'approved' then
    select current_stock,
      coalesce(nullif(btrim(yield_unit), ''), nullif(btrim(unit), ''), 'unit')
      into v_before, v_current_unit from public.ingredients
    where id = v_request.ingredient_id for update;
    if not found then raise exception 'Bahan baku tidak tersedia'; end if;
    if v_current_unit is distinct from v_request.yield_unit_snapshot then
      raise exception 'Satuan hasil bahan berubah. Tolak permintaan ini dan minta kasir mengajukan ulang';
    end if;
    update public.ingredients
    set current_stock = current_stock + v_request.quantity_stock,
        updated_at = now()
    where id = v_request.ingredient_id
    returning current_stock into v_after;
  end if;

  update public.ingredient_stock_requests
  set status = p_decision, reviewed_at = now(), reviewed_by = p_actor_id,
      review_note = v_note, stock_before = v_before, stock_after = v_after
  where id = p_request_id
  returning * into v_request;
  return v_request;
end $$;

revoke all on function public.pos_request_ingredient_stock(uuid,uuid,uuid,numeric,text,uuid)
  from public, anon, authenticated;
revoke all on function public.pos_review_ingredient_stock_request(uuid,uuid,text,text)
  from public, anon, authenticated;
grant execute on function public.pos_request_ingredient_stock(uuid,uuid,uuid,numeric,text,uuid)
  to service_role;
grant execute on function public.pos_review_ingredient_stock_request(uuid,uuid,text,text)
  to service_role;
