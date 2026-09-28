alter table public.transactions add column if not exists voided_at timestamptz;
alter table public.transactions add column if not exists voided_by uuid references public.users(id);
alter table public.stock_adjustments alter column old_stock type numeric(12,2);
alter table public.stock_adjustments alter column new_stock type numeric(12,2);
alter table public.stock_adjustments alter column difference type numeric(12,2);
update public.ingredients set current_stock = 0 where current_stock is null;
alter table public.ingredients alter column current_stock set not null;
alter table public.ingredients add constraint ingredients_current_stock_nonnegative check (current_stock >= 0);
update public.ingredients set yield_quantity = 1 where yield_quantity is null or yield_quantity <= 0;
alter table public.ingredients alter column yield_quantity set not null;
alter table public.ingredients add constraint ingredients_yield_positive check (yield_quantity > 0);
alter table public.products add constraint products_stock_nonnegative check (stock >= 0);
alter table public.products add constraint products_price_nonnegative check (price >= 0);
alter table public.product_ingredients add constraint product_ingredients_quantity_positive check (quantity > 0);

create table if not exists public.sale_stock_usage (
  id uuid primary key default uuid_generate_v4(),
  transaction_item_id uuid not null references public.transaction_items(id) on delete cascade,
  product_id uuid references public.products(id) on delete restrict,
  ingredient_id uuid references public.ingredients(id) on delete restrict,
  quantity numeric(12,2) not null check (quantity > 0),
  check ((product_id is null) <> (ingredient_id is null))
);
create index if not exists sale_stock_usage_item_idx on public.sale_stock_usage(transaction_item_id);
alter table public.sale_stock_usage enable row level security;
revoke all on public.sale_stock_usage from public, anon, authenticated;
grant all on public.sale_stock_usage to service_role;
alter table public.transactions drop constraint if exists transactions_payment_status_check;
alter table public.transactions add constraint transactions_payment_status_check check (payment_status in ('paid','unpaid','void'));

create or replace function public.pos_quote_json(p_items jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_item record;
declare v_product public.products%rowtype;
declare v_items jsonb := '[]'::jsonb;
declare v_subtotal numeric := 0;
declare v_tax_rate numeric;
declare v_count int := 0;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 100 then
    raise exception 'Keranjang tidak valid';
  end if;
  select tax_rate into v_tax_rate from public.store_settings order by created_at limit 1;
  if v_tax_rate is null or v_tax_rate < 0 or v_tax_rate > 100 then raise exception 'Tarif pajak tidak valid'; end if;
  for v_item in select product_id, sum(quantity)::integer as quantity from jsonb_to_recordset(p_items)
    as x(product_id uuid, quantity integer) group by product_id order by product_id loop
    v_count := v_count + 1;
    if v_item.product_id is null or v_item.quantity is null or v_item.quantity < 1 or v_item.quantity > 10000 then raise exception 'Jumlah produk tidak valid'; end if;
    select * into v_product from public.products where id = v_item.product_id;
    if not found then raise exception 'Produk tidak tersedia'; end if;
    v_subtotal := v_subtotal + v_product.price * v_item.quantity;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'productId', v_product.id, 'name', v_product.name, 'quantity', v_item.quantity, 'price', v_product.price));
  end loop;
  if v_count = 0 then raise exception 'Keranjang kosong'; end if;
  return jsonb_build_object('items',v_items,'subtotal',v_subtotal,'taxRate',v_tax_rate,
    'tax',round(v_subtotal * v_tax_rate / 100,2),'total',v_subtotal + round(v_subtotal * v_tax_rate / 100,2));
end $$;

create or replace function public.pos_quote(p_items jsonb)
returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare v_quote jsonb;
begin
  v_quote := public.pos_quote_json(p_items);
  return v_quote || jsonb_build_object('hash', encode(extensions.digest(v_quote::text,'sha256'),'hex'));
end $$;

create or replace function public.pos_create_sale(
  p_user_id uuid, p_shift_id uuid, p_items jsonb, p_payment_method text,
  p_qris_confirmed boolean, p_quote_hash text, p_idempotency_key uuid
) returns public.transactions language plpgsql security definer set search_path = public, extensions as $$
declare v_shift public.shifts%rowtype;
declare v_tx public.transactions%rowtype;
declare v_quote jsonb;
declare v_request_hash text;
declare v_product record;
declare v_ingredient record;
declare v_item record;
declare v_cost numeric;
declare v_tx_item_id uuid;
begin
  if p_idempotency_key is null or p_payment_method not in ('cash','qris') then raise exception 'Pembayaran tidak valid'; end if;
  if p_payment_method = 'qris' and not coalesce(p_qris_confirmed,false) then raise exception 'Konfirmasi penerimaan QRIS wajib'; end if;
  v_request_hash := encode(extensions.digest(jsonb_build_object(
    'items',p_items,'payment',p_payment_method,'quote',p_quote_hash
  )::text,'sha256'),'hex');
  select * into v_shift from public.shifts where id = p_shift_id and cashier_id = p_user_id and status = 'open' for update;
  if not found then raise exception 'Shift aktif tidak ditemukan'; end if;
  select * into v_tx from public.transactions where idempotency_key = p_idempotency_key;
  if found then
    if v_tx.shift_id <> p_shift_id or v_tx.idempotency_request_hash is distinct from v_request_hash
      then raise exception 'Kunci transaksi sudah digunakan untuk pesanan lain'; end if;
    return v_tx;
  end if;
  -- Lock every affected row in a stable order before checking stock.
  perform 1 from public.products where id in (
    select product_id from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer)
  ) order by id for update;
  perform 1 from public.ingredients where id in (
    select distinct pi.ingredient_id from public.product_ingredients pi
      where pi.product_id in (select product_id from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer))
  ) order by id for update;
  perform 1 from public.store_settings order by created_at limit 1 for share;
  v_quote := public.pos_quote_json(p_items);
  if encode(extensions.digest(v_quote::text,'sha256'),'hex') <> p_quote_hash then raise exception 'QUOTE_CHANGED'; end if;
  for v_ingredient in
    select i.id, i.current_stock, sum(x.quantity * pi.quantity) as needed
    from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer)
    join public.product_ingredients pi on pi.product_id = x.product_id
    join public.ingredients i on i.id = pi.ingredient_id
    group by i.id, i.current_stock order by i.id
  loop
    if v_ingredient.current_stock is null or v_ingredient.current_stock < v_ingredient.needed then raise exception 'Stok bahan baku tidak cukup'; end if;
  end loop;
  for v_product in
    select p.id, p.stock, sum(x.quantity) as needed
    from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer)
    join public.products p on p.id = x.product_id
    where not exists(select 1 from public.product_ingredients pi where pi.product_id = p.id)
    group by p.id, p.stock order by p.id
  loop
    if v_product.stock < v_product.needed then raise exception 'Stok produk tidak cukup'; end if;
  end loop;
  insert into public.transactions(shift_id,cashier_id,customer_id,order_type,subtotal,tax,total,
    payment_method,payment_status,due_date,idempotency_key,idempotency_request_hash)
    values(p_shift_id,p_user_id,null,'sale',(v_quote->>'subtotal')::numeric,(v_quote->>'tax')::numeric,
      (v_quote->>'total')::numeric,p_payment_method,'paid',null,p_idempotency_key,v_request_hash) returning * into v_tx;
  for v_item in select * from jsonb_to_recordset(v_quote->'items')
    as x("productId" uuid, name text, quantity integer, price numeric) loop
    select coalesce(sum(pi.quantity * i.cost_price),p.cost_price) into v_cost
    from public.products p left join public.product_ingredients pi on pi.product_id = p.id
      left join public.ingredients i on i.id = pi.ingredient_id
    where p.id = v_item."productId" group by p.cost_price;
    insert into public.transaction_items(transaction_id,product_id,quantity,price,cost_price)
      values(v_tx.id,v_item."productId",v_item.quantity,v_item.price,coalesce(v_cost,0)) returning id into v_tx_item_id;
    if exists(select 1 from public.product_ingredients where product_id = v_item."productId") then
      insert into public.sale_stock_usage(transaction_item_id,ingredient_id,quantity)
        select v_tx_item_id,pi.ingredient_id,v_item.quantity * pi.quantity
        from public.product_ingredients pi where pi.product_id = v_item."productId";
    else
      insert into public.sale_stock_usage(transaction_item_id,product_id,quantity)
        values(v_tx_item_id,v_item."productId",v_item.quantity);
    end if;
  end loop;
  update public.ingredients i set current_stock = i.current_stock - used.needed, updated_at = now()
    from (select pi.ingredient_id, sum(x.quantity * pi.quantity) as needed
      from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer)
      join public.product_ingredients pi on pi.product_id = x.product_id group by pi.ingredient_id) used
    where i.id = used.ingredient_id;
  update public.products p set stock = p.stock - used.needed, updated_at = now()
    from (select x.product_id, sum(x.quantity) as needed
      from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer)
      where not exists(select 1 from public.product_ingredients pi where pi.product_id = x.product_id)
      group by x.product_id) used where p.id = used.product_id;
  return v_tx;
end $$;

create or replace function public.pos_void_sale(p_tx_id uuid, p_actor_id uuid, p_restore_stock boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_tx public.transactions%rowtype;
declare v_shift_id uuid;
begin
  select shift_id into v_shift_id from public.transactions where id = p_tx_id;
  if v_shift_id is null then raise exception 'Transaksi tanpa shift memerlukan pemeriksaan manual'; end if;
  perform 1 from public.shifts where id = v_shift_id and status = 'open' for update;
  if not found then raise exception 'Shift sudah ditutup; pembatalan perlu pemeriksaan manual'; end if;
  select * into v_tx from public.transactions where id = p_tx_id for update;
  if not found then raise exception 'Transaksi tidak ditemukan'; end if;
  if v_tx.payment_status = 'void' then return; end if;
  if p_restore_stock then
    perform 1 from public.products where id in (select product_id from public.transaction_items where transaction_id = p_tx_id) order by id for update;
    if exists(select 1 from public.transaction_items ti where ti.transaction_id = p_tx_id)
      and not exists(select 1 from public.sale_stock_usage su join public.transaction_items ti on ti.id = su.transaction_item_id where ti.transaction_id = p_tx_id) then
      raise exception 'Riwayat stok lama perlu pemeriksaan manual sebelum pemulihan';
    end if;
    perform 1 from public.ingredients where id in (
      select su.ingredient_id from public.sale_stock_usage su join public.transaction_items ti on ti.id = su.transaction_item_id
      where ti.transaction_id = p_tx_id and su.ingredient_id is not null
    ) order by id for update;
    update public.ingredients i set current_stock = i.current_stock + restored.qty, updated_at = now()
      from (select su.ingredient_id, sum(su.quantity) qty from public.sale_stock_usage su
        join public.transaction_items ti on ti.id = su.transaction_item_id
        where ti.transaction_id = p_tx_id and su.ingredient_id is not null group by su.ingredient_id) restored
      where i.id = restored.ingredient_id;
    update public.products p set stock = p.stock + restored.qty, updated_at = now()
      from (select su.product_id, sum(su.quantity) qty from public.sale_stock_usage su
        join public.transaction_items ti on ti.id = su.transaction_item_id
        where ti.transaction_id = p_tx_id and su.product_id is not null group by su.product_id) restored where p.id = restored.product_id;
  end if;
  update public.transactions set payment_status = 'void', voided_at = now(), voided_by = p_actor_id, updated_at = now() where id = p_tx_id;
end $$;

revoke all on function public.pos_quote_json(jsonb) from public, anon, authenticated;
revoke all on function public.pos_quote(jsonb) from public, anon, authenticated;
revoke all on function public.pos_create_sale(uuid,uuid,jsonb,text,boolean,text,uuid) from public, anon, authenticated;
revoke all on function public.pos_void_sale(uuid,uuid,boolean) from public, anon, authenticated;
grant execute on function public.pos_quote_json(jsonb) to service_role;
grant execute on function public.pos_quote(jsonb) to service_role;
grant execute on function public.pos_create_sale(uuid,uuid,jsonb,text,boolean,text,uuid) to service_role;
grant execute on function public.pos_void_sale(uuid,uuid,boolean) to service_role;

create or replace function public.pos_create_purchase(p_supplier_id uuid, p_items jsonb, p_note text)
returns public.purchases language plpgsql security definer set search_path = public as $$
declare v_purchase public.purchases%rowtype;
declare v_item record;
declare v_yield numeric;
declare v_total numeric := 0;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 100 then raise exception 'Daftar pembelian tidak valid'; end if;
  if not exists(select 1 from public.suppliers where id = p_supplier_id) then raise exception 'Supplier tidak ditemukan'; end if;
  for v_item in select * from jsonb_to_recordset(p_items)
    as x(type text, product_id uuid, ingredient_id uuid, qty integer, buy_price numeric) loop
    if v_item.qty is null or v_item.qty < 1 or v_item.buy_price is null or v_item.buy_price < 0
      or (v_item.type = 'product' and v_item.product_id is null)
      or (v_item.type = 'ingredient' and v_item.ingredient_id is null)
      or v_item.type not in ('product','ingredient') then raise exception 'Item pembelian tidak valid'; end if;
    v_total := v_total + v_item.qty * v_item.buy_price;
  end loop;
  perform 1 from public.products where id in (
    select product_id from jsonb_to_recordset(p_items) as x(type text, product_id uuid, ingredient_id uuid, qty integer, buy_price numeric)
  ) order by id for update;
  perform 1 from public.ingredients where id in (
    select ingredient_id from jsonb_to_recordset(p_items) as x(type text, product_id uuid, ingredient_id uuid, qty integer, buy_price numeric)
  ) order by id for update;
  insert into public.purchases(supplier_id,total_amount,note) values(p_supplier_id,v_total,p_note) returning * into v_purchase;
  for v_item in select * from jsonb_to_recordset(p_items)
    as x(type text, product_id uuid, ingredient_id uuid, qty integer, buy_price numeric) loop
    if v_item.type = 'product' then
      if not exists(select 1 from public.products where id = v_item.product_id) then raise exception 'Produk tidak ditemukan'; end if;
      if exists(select 1 from public.product_ingredients where product_id = v_item.product_id) then raise exception 'Pembelian produk dengan resep harus dicatat sebagai bahan baku'; end if;
      insert into public.purchase_items(purchase_id,product_id,qty,buy_price)
        values(v_purchase.id,v_item.product_id,v_item.qty,v_item.buy_price);
      update public.products set stock = stock + v_item.qty, cost_price = v_item.buy_price, updated_at = now()
        where id = v_item.product_id;
    else
      select yield_quantity into v_yield from public.ingredients where id = v_item.ingredient_id;
      if not found or v_yield is null or v_yield <= 0 then raise exception 'Konversi bahan baku tidak valid'; end if;
      insert into public.purchase_items(purchase_id,ingredient_id,qty,buy_price)
        values(v_purchase.id,v_item.ingredient_id,v_item.qty,v_item.buy_price);
      update public.ingredients set current_stock = current_stock + v_item.qty * v_yield,
        cost_price = v_item.buy_price / v_yield, updated_at = now() where id = v_item.ingredient_id;
    end if;
  end loop;
  return v_purchase;
end $$;

create or replace function public.pos_adjust_stock(p_target_id uuid, p_type text, p_new_stock numeric, p_reason text, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare v_old numeric;
declare v_yield numeric;
begin
  if p_new_stock is null or p_new_stock < 0 or nullif(trim(p_reason),'') is null then raise exception 'Penyesuaian tidak valid'; end if;
  if p_type = 'product' then
    if p_new_stock <> trunc(p_new_stock) then raise exception 'Stok produk harus bilangan bulat'; end if;
    if exists(select 1 from public.product_ingredients where product_id = p_target_id) then raise exception 'Stok produk resep dihitung dari bahan baku'; end if;
    select stock into v_old from public.products where id = p_target_id for update;
    if not found then raise exception 'Produk tidak ditemukan'; end if;
    insert into public.stock_adjustments(product_id,old_stock,new_stock,difference,reason,note)
      values(p_target_id,v_old,p_new_stock,p_new_stock-v_old,p_reason,p_note);
    update public.products set stock = p_new_stock, updated_at = now() where id = p_target_id;
  elsif p_type = 'ingredient' then
    select current_stock, yield_quantity into v_old, v_yield from public.ingredients where id = p_target_id for update;
    if not found or v_yield is null or v_yield <= 0 then raise exception 'Bahan baku tidak valid'; end if;
    v_old := v_old / v_yield;
    insert into public.stock_adjustments(ingredient_id,old_stock,new_stock,difference,reason,note)
      values(p_target_id,v_old,p_new_stock,p_new_stock-v_old,p_reason,p_note);
    update public.ingredients set current_stock = p_new_stock * v_yield, updated_at = now() where id = p_target_id;
  else raise exception 'Jenis penyesuaian tidak valid'; end if;
end $$;

create or replace function public.pos_delete_adjustments(p_ids uuid[], p_revert boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_adj public.stock_adjustments%rowtype;
declare v_yield numeric;
begin
  if array_length(p_ids,1) is null or array_length(p_ids,1) > 100 then raise exception 'Daftar penyesuaian tidak valid'; end if;
  for v_adj in select * from public.stock_adjustments where id = any(p_ids) order by id for update loop
    if p_revert then
      if v_adj.product_id is not null then
        update public.products set stock = stock - v_adj.difference, updated_at = now()
          where id = v_adj.product_id and stock - v_adj.difference >= 0;
        if not found then raise exception 'Stok produk tidak cukup untuk pembalikan'; end if;
      elsif v_adj.ingredient_id is not null then
        select yield_quantity into v_yield from public.ingredients where id = v_adj.ingredient_id;
        update public.ingredients set current_stock = current_stock - v_adj.difference * v_yield, updated_at = now()
          where id = v_adj.ingredient_id and current_stock - v_adj.difference * v_yield >= 0;
        if not found then raise exception 'Stok bahan baku tidak cukup untuk pembalikan'; end if;
      end if;
    end if;
  end loop;
  delete from public.stock_adjustments where id = any(p_ids);
end $$;

revoke all on function public.pos_create_purchase(uuid,jsonb,text) from public, anon, authenticated;
revoke all on function public.pos_adjust_stock(uuid,text,numeric,text,text) from public, anon, authenticated;
revoke all on function public.pos_delete_adjustments(uuid[],boolean) from public, anon, authenticated;
grant execute on function public.pos_create_purchase(uuid,jsonb,text) to service_role;
grant execute on function public.pos_adjust_stock(uuid,text,numeric,text,text) to service_role;
grant execute on function public.pos_delete_adjustments(uuid[],boolean) to service_role;

create or replace function public.pos_create_expense(p_user_id uuid, p_shift_id uuid, p_amount numeric, p_description text)
returns public.expenses language plpgsql security definer set search_path = public as $$
declare v_expense public.expenses%rowtype;
begin
  if p_amount is null or p_amount <= 0 or nullif(trim(p_description),'') is null then raise exception 'Pengeluaran tidak valid'; end if;
  perform 1 from public.shifts where id = p_shift_id and cashier_id = p_user_id and status = 'open' for update;
  if not found then raise exception 'Shift aktif tidak ditemukan'; end if;
  insert into public.expenses(shift_id,cashier_id,amount,description)
    values(p_shift_id,p_user_id,p_amount,trim(p_description)) returning * into v_expense;
  return v_expense;
end $$;

create or replace function public.pos_delete_expense(p_actor_id uuid, p_expense_id uuid, p_is_admin boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_expense public.expenses%rowtype;
begin
  select * into v_expense from public.expenses where id = p_expense_id;
  if not found then raise exception 'Pengeluaran tidak ditemukan'; end if;
  perform 1 from public.shifts where id = v_expense.shift_id and status = 'open' for update;
  if not found then raise exception 'Shift sudah ditutup'; end if;
  if not p_is_admin and v_expense.cashier_id <> p_actor_id then raise exception 'Akses ditolak'; end if;
  delete from public.expenses where id = p_expense_id;
end $$;

revoke all on function public.pos_create_expense(uuid,uuid,numeric,text) from public, anon, authenticated;
revoke all on function public.pos_delete_expense(uuid,uuid,boolean) from public, anon, authenticated;
grant execute on function public.pos_create_expense(uuid,uuid,numeric,text) to service_role;
grant execute on function public.pos_delete_expense(uuid,uuid,boolean) to service_role;

create or replace function public.pos_save_product(
  p_id uuid, p_name text, p_category_id uuid, p_unit_id uuid, p_price numeric, p_parts jsonb
) returns public.products language plpgsql security definer set search_path = public as $$
declare v_product public.products%rowtype;
declare v_part record;
declare v_cost numeric := 0;
begin
  if nullif(trim(p_name),'') is null or p_price is null or p_price < 0
    or jsonb_typeof(p_parts) <> 'array' or jsonb_array_length(p_parts) > 100 then raise exception 'Produk tidak valid'; end if;
  if p_id is null then
    insert into public.products(name,category_id,unit_id,price,cost_price,stock)
      values(trim(p_name),p_category_id,p_unit_id,p_price,0,0) returning * into v_product;
  else
    select * into v_product from public.products where id = p_id for update;
    if not found then raise exception 'Produk tidak ditemukan'; end if;
    update public.products set name = trim(p_name), category_id = p_category_id,
      unit_id = p_unit_id, price = p_price, updated_at = now() where id = p_id;
  end if;
  for v_part in select ingredient_id, sum(quantity) quantity from jsonb_to_recordset(p_parts)
    as x(ingredient_id uuid, quantity numeric) group by ingredient_id order by ingredient_id loop
    if v_part.ingredient_id is null or v_part.quantity is null or v_part.quantity <= 0 then raise exception 'Resep tidak valid'; end if;
    perform 1 from public.ingredients where id = v_part.ingredient_id;
    if not found then raise exception 'Bahan baku tidak ditemukan'; end if;
  end loop;
  delete from public.product_ingredients where product_id = v_product.id;
  insert into public.product_ingredients(product_id,ingredient_id,quantity)
    select v_product.id, ingredient_id, sum(quantity) from jsonb_to_recordset(p_parts)
      as x(ingredient_id uuid, quantity numeric) group by ingredient_id;
  select coalesce(sum(pi.quantity * i.cost_price),0) into v_cost from public.product_ingredients pi
    join public.ingredients i on i.id = pi.ingredient_id where pi.product_id = v_product.id;
  if jsonb_array_length(p_parts) > 0 then
    update public.products set cost_price = v_cost where id = v_product.id;
  end if;
  select * into v_product from public.products where id = v_product.id;
  return v_product;
end $$;

revoke all on function public.pos_save_product(uuid,text,uuid,uuid,numeric,jsonb) from public, anon, authenticated;
grant execute on function public.pos_save_product(uuid,text,uuid,uuid,numeric,jsonb) to service_role;

create or replace function public.pos_save_ingredient(
  p_id uuid, p_name text, p_unit text, p_min_alert numeric,
  p_yield_quantity numeric, p_yield_unit text, p_cost_price numeric
) returns public.ingredients language plpgsql security definer set search_path = public as $$
declare v_ingredient public.ingredients%rowtype;
begin
  if nullif(trim(p_name),'') is null or p_min_alert < 0 or p_cost_price < 0
    or p_yield_quantity <= 0 then raise exception 'Bahan baku tidak valid'; end if;
  if p_id is null then
    insert into public.ingredients(name,unit,min_stock_alert,yield_quantity,yield_unit,cost_price,current_stock)
      values(trim(p_name),p_unit,p_min_alert,p_yield_quantity,p_yield_unit,p_cost_price,0)
      returning * into v_ingredient;
  else
    select * into v_ingredient from public.ingredients where id = p_id for update;
    if not found then raise exception 'Bahan baku tidak ditemukan'; end if;
    update public.ingredients set name = trim(p_name), unit = p_unit, min_stock_alert = p_min_alert,
      yield_quantity = p_yield_quantity, yield_unit = p_yield_unit, cost_price = p_cost_price,
      current_stock = current_stock / greatest(coalesce(v_ingredient.yield_quantity,1),0.000001) * p_yield_quantity,
      updated_at = now() where id = p_id returning * into v_ingredient;
  end if;
  return v_ingredient;
end $$;

create or replace function public.pos_delete_products(p_ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if array_length(p_ids,1) is null or array_length(p_ids,1) > 100 then raise exception 'Daftar produk tidak valid'; end if;
  perform 1 from public.products where id = any(p_ids) order by id for update;
  if exists(select 1 from public.transaction_items where product_id = any(p_ids))
    or exists(select 1 from public.purchase_items where product_id = any(p_ids))
    or exists(select 1 from public.stock_adjustments where product_id = any(p_ids)) then
    raise exception 'Produk memiliki riwayat dan tidak dapat dihapus';
  end if;
  delete from public.products where id = any(p_ids);
end $$;

create or replace function public.pos_delete_ingredient(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform 1 from public.ingredients where id = p_id for update;
  if exists(select 1 from public.product_ingredients where ingredient_id = p_id)
    or exists(select 1 from public.purchase_items where ingredient_id = p_id)
    or exists(select 1 from public.stock_adjustments where ingredient_id = p_id) then
    raise exception 'Bahan baku memiliki riwayat atau masih digunakan';
  end if;
  delete from public.ingredients where id = p_id;
end $$;

revoke all on function public.pos_save_ingredient(uuid,text,text,numeric,numeric,text,numeric) from public, anon, authenticated;
revoke all on function public.pos_delete_products(uuid[]) from public, anon, authenticated;
revoke all on function public.pos_delete_ingredient(uuid) from public, anon, authenticated;
grant execute on function public.pos_save_ingredient(uuid,text,text,numeric,numeric,text,numeric) to service_role;
grant execute on function public.pos_delete_products(uuid[]) to service_role;
grant execute on function public.pos_delete_ingredient(uuid) to service_role;
