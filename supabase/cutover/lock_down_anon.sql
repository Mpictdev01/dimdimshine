-- RUN ONLY AFTER the new application passes staging and is promoted during maintenance.
-- Legacy shift closure preserves unknown ending cash as NULL.
update public.shifts set status = 'closed', end_time = now(),
  migration_reason = 'Migrasi: shift lama tanpa rekonsiliasi', updated_at = now()
where status = 'open' and end_time is null;
create unique index if not exists shifts_one_open_per_cashier on public.shifts(cashier_id) where status = 'open';

alter table public.users drop column if exists pin;

do $$
declare t text;
declare policy_name text;
begin
  foreach t in array array[
    'store_settings','users','shifts','categories','units','products',
    'customer_areas','customers','transactions','transaction_items',
    'suppliers','purchases','purchase_items','stock_adjustments',
    'ingredients','product_ingredients','expenses','sale_stock_usage'
  ] loop
    for policy_name in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', policy_name, t);
    end loop;
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
    if has_table_privilege('anon', format('public.%I', t), 'SELECT')
      or has_table_privilege('anon', format('public.%I', t), 'INSERT')
      or has_table_privilege('anon', format('public.%I', t), 'UPDATE')
      or has_table_privilege('anon', format('public.%I', t), 'DELETE') then
      raise exception 'Anon masih memiliki akses ke %', t;
    end if;
  end loop;
end $$;

revoke usage on schema public from anon, authenticated;
grant usage on schema public to service_role;
