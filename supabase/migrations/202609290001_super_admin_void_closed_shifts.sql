-- A closed shift remains auditable, but its sales can be voided by a super admin.
-- Manager access stays limited to open shifts. The operation and stock changes
-- remain atomic; historical sales without complete stock usage need a manual
-- stock review and must be voided with p_restore_stock = false.
create or replace function public.pos_void_sale(
  p_tx_id uuid,
  p_actor_id uuid,
  p_restore_stock boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tx public.transactions%rowtype;
  v_shift_id uuid;
  v_shift_status text;
  v_actor_role text;
begin
  select role into v_actor_role
  from public.users
  where id = p_actor_id and is_active = true
  for share;
  if v_actor_role is null or v_actor_role not in ('manager', 'super_admin') then
    raise exception 'Hanya admin aktif yang dapat membatalkan transaksi';
  end if;

  select shift_id into v_shift_id
  from public.transactions
  where id = p_tx_id;
  if not found then raise exception 'Transaksi tidak ditemukan'; end if;
  if v_shift_id is null then
    raise exception 'Transaksi tanpa shift memerlukan pemeriksaan manual';
  end if;

  select status into v_shift_status
  from public.shifts
  where id = v_shift_id
  for update;
  if not found then raise exception 'Shift transaksi tidak ditemukan'; end if;
  if v_actor_role <> 'super_admin' and v_shift_status is distinct from 'open' then
    raise exception 'Hanya super admin yang dapat membatalkan transaksi dari shift tertutup';
  end if;

  select * into v_tx
  from public.transactions
  where id = p_tx_id
  for update;
  if not found then raise exception 'Transaksi tidak ditemukan'; end if;
  if v_tx.shift_id is distinct from v_shift_id then
    raise exception 'Shift transaksi berubah; coba lagi';
  end if;
  if v_tx.payment_status = 'void' then return; end if;

  if p_restore_stock then
    -- Every item must have stock usage, otherwise a partial restore is unsafe.
    if exists (
      select 1 from public.transaction_items ti
      where ti.transaction_id = p_tx_id
        and not exists (
          select 1 from public.sale_stock_usage su
          where su.transaction_item_id = ti.id
        )
    ) or exists (
      select 1 from public.sale_stock_usage su
      join public.transaction_items ti on ti.id = su.transaction_item_id
      where ti.transaction_id = p_tx_id
        and su.product_id is null and su.ingredient_id is null
    ) then
      raise exception 'Riwayat stok tidak lengkap. Batalkan tanpa mengembalikan stok lalu periksa stok manual';
    end if;

    perform 1 from public.products
    where id in (
      select product_id from public.transaction_items
      where transaction_id = p_tx_id
    )
    order by id for update;
    perform 1 from public.ingredients
    where id in (
      select su.ingredient_id from public.sale_stock_usage su
      join public.transaction_items ti on ti.id = su.transaction_item_id
      where ti.transaction_id = p_tx_id and su.ingredient_id is not null
    )
    order by id for update;

    update public.ingredients i
    set current_stock = i.current_stock + restored.qty, updated_at = now()
    from (
      select su.ingredient_id, sum(su.quantity) qty
      from public.sale_stock_usage su
      join public.transaction_items ti on ti.id = su.transaction_item_id
      where ti.transaction_id = p_tx_id and su.ingredient_id is not null
      group by su.ingredient_id
    ) restored
    where i.id = restored.ingredient_id;

    update public.products p
    set stock = p.stock + restored.qty, updated_at = now()
    from (
      select su.product_id, sum(su.quantity) qty
      from public.sale_stock_usage su
      join public.transaction_items ti on ti.id = su.transaction_item_id
      where ti.transaction_id = p_tx_id and su.product_id is not null
      group by su.product_id
    ) restored
    where p.id = restored.product_id;
  end if;

  update public.transactions
  set payment_status = 'void', voided_at = now(), voided_by = p_actor_id,
      updated_at = now()
  where id = p_tx_id;
end $$;

revoke all on function public.pos_void_sale(uuid,uuid,boolean)
  from public, anon, authenticated;
grant execute on function public.pos_void_sale(uuid,uuid,boolean)
  to service_role;
