-- Read-only readiness check after applying 202609290002_ingredient_stock_approval.sql.
select
  to_regclass('public.ingredient_stock_requests') is not null as requests_table_ready,
  to_regprocedure('public.pos_request_ingredient_stock(uuid,uuid,uuid,numeric,text,uuid)') is not null
    as cashier_request_function_ready,
  to_regprocedure('public.pos_review_ingredient_stock_request(uuid,uuid,text,text)') is not null
    as super_admin_review_function_ready;

select status, count(*) as requests
from public.ingredient_stock_requests
group by status
order by status;
