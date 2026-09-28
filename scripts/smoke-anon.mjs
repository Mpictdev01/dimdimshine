const base = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;
if (!base || !key) {
  console.error('Set SUPABASE_URL dan SUPABASE_ANON_KEY untuk staging/produksi.');
  process.exit(2);
}

const tables = [
  'store_settings','users','shifts','categories','units','products',
  'customer_areas','customers','transactions','transaction_items',
  'suppliers','purchases','purchase_items','stock_adjustments',
  'ingredients','product_ingredients','expenses','sale_stock_usage',
].map(table => ({ table, field: 'id', value: '00000000-0000-0000-0000-000000000000' }));
tables.push(
  { table: 'pos_sessions', field: 'token_hash', value: '0'.repeat(64) },
  { table: 'pos_login_failures', field: 'id', value: '-1' },
);
const headers = { apikey: key, Authorization: `Bearer ${key}` };
let failures = 0;
for (const { table, field, value } of tables) {
  const url = `${base}/rest/v1/${table}?${field}=eq.${value}&select=${field}`;
  const read = await fetch(url, { method: 'HEAD', headers, cache: 'no-store' });
  // This filter cannot match any real row, so the write probe never changes data.
  const write = await fetch(url, { method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ [field]: value }), cache: 'no-store' });
  const denied = status => [401,403,404].includes(status);
  const okay = denied(read.status) && denied(write.status);
  console.log(`${okay ? 'OK' : 'FAIL'} ${table}: read ${read.status}, write ${write.status}`);
  if (!okay) failures++;
}
process.exit(failures ? 1 : 0);
