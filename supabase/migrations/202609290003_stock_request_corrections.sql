-- Apply after 202609290002_ingredient_stock_approval.sql.
-- A hidden request remains in the database so an approved stock addition
-- still has an audit trail. Decision corrections write compensating movements.
begin;

alter table public.ingredient_stock_requests
  add column deleted_at timestamptz,
  add column deleted_by uuid references public.users(id) on delete restrict,
  add constraint ingredient_stock_request_deletion_consistent check (
    (deleted_at is null and deleted_by is null)
    or (deleted_at is not null and deleted_by is not null)
  );

create index ingredient_stock_requests_visible_pending_idx
  on public.ingredient_stock_requests(status, requested_at)
  where deleted_at is null and status = 'pending';
create index ingredient_stock_requests_visible_reviewed_idx
  on public.ingredient_stock_requests(reviewed_at desc)
  where deleted_at is null and status <> 'pending';
create index ingredient_stock_requests_visible_requester_idx
  on public.ingredient_stock_requests(requested_by, requested_at desc)
  where deleted_at is null;

create table public.ingredient_stock_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.ingredient_stock_requests(id) on delete restrict,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  actor_id uuid not null references public.users(id) on delete restrict,
  event_type text not null check (event_type in ('decision', 'hidden')),
  previous_status text not null check (previous_status in ('pending', 'approved', 'rejected')),
  new_status text not null check (new_status in ('pending', 'approved', 'rejected')),
  stock_delta numeric(12,2) not null default 0,
  stock_before numeric(12,2),
  stock_after numeric(12,2),
  note text,
  created_at timestamptz not null default now()
);

create index ingredient_stock_request_events_time_idx
  on public.ingredient_stock_request_events(created_at desc);
create index ingredient_stock_request_events_request_idx
  on public.ingredient_stock_request_events(request_id, created_at desc);

alter table public.ingredient_stock_request_events enable row level security;
revoke all on public.ingredient_stock_request_events from public, anon, authenticated;
grant select, insert on public.ingredient_stock_request_events to service_role;

-- Preserve decisions made before this migration as opening audit events.
insert into public.ingredient_stock_request_events (
  request_id, ingredient_id, actor_id, event_type, previous_status,
  new_status, stock_delta, stock_before, stock_after, note, created_at
)
select id, ingredient_id, reviewed_by, 'decision', 'pending', status,
  case when status = 'approved' then quantity_stock else 0 end,
  stock_before, stock_after, review_note, reviewed_at
from public.ingredient_stock_requests
where status <> 'pending';

create function public.pos_log_ingredient_stock_request_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_delta numeric(12,2) := 0;
  v_after numeric(12,2);
begin
  if old.deleted_at is not null and
    (new.status is distinct from old.status or new.deleted_at is distinct from old.deleted_at) then
    raise exception 'Riwayat pengajuan yang sudah dihapus tidak dapat diubah';
  end if;

  if new.status is distinct from old.status then
    if old.status = 'approved' then v_delta := -old.quantity_stock; end if;
    if new.status = 'approved' then v_delta := v_delta + new.quantity_stock; end if;
    if v_delta <> 0 then
      select current_stock into v_after from public.ingredients where id = new.ingredient_id;
      if not found then raise exception 'Bahan baku tidak tersedia'; end if;
    end if;
    insert into public.ingredient_stock_request_events (
      request_id, ingredient_id, actor_id, event_type, previous_status,
      new_status, stock_delta, stock_before, stock_after, note
    ) values (
      new.id, new.ingredient_id, new.reviewed_by, 'decision', old.status,
      new.status, v_delta,
      case when v_delta <> 0 then v_after - v_delta else null end,
      v_after, new.review_note
    );
  end if;

  if old.deleted_at is null and new.deleted_at is not null then
    insert into public.ingredient_stock_request_events (
      request_id, ingredient_id, actor_id, event_type, previous_status,
      new_status, stock_delta, note, created_at
    ) values (
      new.id, new.ingredient_id, new.deleted_by, 'hidden', old.status,
      new.status, 0, 'Riwayat disembunyikan oleh super admin', new.deleted_at
    );
  end if;
  return new;
end $$;

create trigger ingredient_stock_request_audit_trigger
after update of status, deleted_at on public.ingredient_stock_requests
for each row execute function public.pos_log_ingredient_stock_request_change();

revoke all on function public.pos_log_ingredient_stock_request_change()
  from public, anon, authenticated;
grant execute on function public.pos_log_ingredient_stock_request_change()
  to service_role;

create function public.pos_amend_ingredient_stock_request(
  p_request_id uuid,
  p_actor_id uuid,
  p_expected_status text,
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
    raise exception 'Hanya super admin aktif yang dapat mengubah keputusan stok';
  end if;
  if p_expected_status is null or p_expected_status not in ('approved', 'rejected')
    or p_decision is null or p_decision not in ('approved', 'rejected')
    or char_length(coalesce(v_note, '')) > 500
    or (p_decision = 'rejected' and char_length(coalesce(v_note, '')) < 3) then
    raise exception 'Keputusan atau catatan penolakan tidak valid';
  end if;

  select * into v_request from public.ingredient_stock_requests
  where id = p_request_id for update;
  if not found then raise exception 'Permintaan stok tidak ditemukan'; end if;
  if v_request.deleted_at is not null then
    raise exception 'Riwayat pengajuan sudah dihapus';
  end if;
  if v_request.status = 'pending' then
    raise exception 'Permintaan ini belum diputuskan. Gunakan persetujuan biasa';
  end if;
  if v_request.status is distinct from p_expected_status then
    raise exception 'Status permintaan sudah berubah. Muat ulang sebelum mengoreksi keputusan';
  end if;
  if v_request.status = p_decision then
    raise exception 'Keputusan sudah sama dengan status saat ini';
  end if;

  select current_stock,
    coalesce(nullif(btrim(yield_unit), ''), nullif(btrim(unit), ''), 'unit')
    into v_before, v_current_unit from public.ingredients
  where id = v_request.ingredient_id for update;
  if not found then raise exception 'Bahan baku tidak tersedia'; end if;
  if v_current_unit is distinct from v_request.yield_unit_snapshot then
    raise exception 'Satuan bahan berubah. Periksa stok secara manual sebelum mengoreksi keputusan';
  end if;

  if p_decision = 'approved' then
    update public.ingredients
    set current_stock = current_stock + v_request.quantity_stock, updated_at = now()
    where id = v_request.ingredient_id
    returning current_stock into v_after;
  else
    if v_before < v_request.quantity_stock then
      raise exception 'Stok saat ini tidak cukup untuk membatalkan persetujuan. Periksa pemakaian stok terlebih dahulu';
    end if;
    update public.ingredients
    set current_stock = current_stock - v_request.quantity_stock, updated_at = now()
    where id = v_request.ingredient_id
    returning current_stock into v_after;
  end if;

  update public.ingredient_stock_requests
  set status = p_decision, reviewed_at = now(), reviewed_by = p_actor_id,
      review_note = v_note,
      stock_before = case when p_decision = 'approved' then v_before else null end,
      stock_after = case when p_decision = 'approved' then v_after else null end
  where id = p_request_id
  returning * into v_request;
  return v_request;
end $$;

create function public.pos_hide_ingredient_stock_request(
  p_request_id uuid,
  p_actor_id uuid
)
returns public.ingredient_stock_requests
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_role text;
  v_request public.ingredient_stock_requests%rowtype;
begin
  select role into v_role from public.users
  where id = p_actor_id and is_active = true for share;
  if not found or v_role is distinct from 'super_admin' then
    raise exception 'Hanya super admin aktif yang dapat menghapus riwayat pengajuan stok';
  end if;

  select * into v_request from public.ingredient_stock_requests
  where id = p_request_id for update;
  if not found then raise exception 'Permintaan stok tidak ditemukan'; end if;
  if v_request.deleted_at is not null then return v_request; end if;

  update public.ingredient_stock_requests
  set deleted_at = now(), deleted_by = p_actor_id
  where id = p_request_id
  returning * into v_request;
  return v_request;
end $$;

revoke all on function public.pos_amend_ingredient_stock_request(uuid,uuid,text,text,text)
  from public, anon, authenticated;
revoke all on function public.pos_hide_ingredient_stock_request(uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.pos_amend_ingredient_stock_request(uuid,uuid,text,text,text)
  to service_role;
grant execute on function public.pos_hide_ingredient_stock_request(uuid,uuid)
  to service_role;

commit;
