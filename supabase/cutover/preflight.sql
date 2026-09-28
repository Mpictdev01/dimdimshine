-- Read-only checks. All invalid_* counts must be zero before migration 002.
select count(*) as settings_rows from public.store_settings; -- Must be exactly one.
select count(*) as invalid_settings from public.store_settings
where tax_rate is null or tax_rate < 0 or tax_rate > 100
  or service_charge is null or service_charge < 0 or service_charge > 100;
select
  (select count(*) from public.ingredients where current_stock < 0) as invalid_ingredient_stock,
  (select count(*) from public.ingredients where yield_quantity <= 0) as invalid_yield,
  (select count(*) from public.products where stock < 0) as invalid_product_stock,
  (select count(*) from public.products where price < 0) as invalid_product_price,
  (select count(*) from public.product_ingredients where quantity <= 0) as invalid_recipe_quantity;

select role, count(*) from public.users group by role order by role;
select count(*) as open_legacy_shifts from public.shifts where status = 'open';
select t.id, t.created_at, t.total from public.transactions t
where t.payment_status = 'paid' and not exists (
  select 1 from public.transaction_items ti where ti.transaction_id = t.id
);

-- After the cutover script, these must be zero:
-- select count(*) from public.shifts where status = 'open' and migration_reason is null;
