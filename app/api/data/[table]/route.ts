import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/server/session';

const adminColumns: Record<string, string> = {
  store_settings: '*', users: 'id,full_name,role', shifts: '*', categories: '*', units: '*',
  products: '*,categories(id,name),units(id,name),product_ingredients(ingredient_id,quantity)',
  customer_areas: '*', customers: '*,customer_areas(name)',
  transactions: '*,customers(name,address,phone),transaction_items(id,product_id,quantity,price,cost_price,products(id,name,units(name)))',
  transaction_items: '*,products(id,name,units(name)),transactions(id,created_at,customers(name))',
  suppliers: '*', purchases: '*,suppliers(name),purchase_items(product_id,ingredient_id,qty,buy_price)',
  purchase_items: '*,products(id,name,units(name)),ingredients(id,name,unit),purchases(id,created_at,suppliers(name))',
  stock_adjustments: '*,products(id,name,units(name)),ingredients(id,name,unit,yield_unit)',
  ingredients: '*', product_ingredients: '*', expenses: '*',
  sale_stock_usage: 'id,product_id,ingredient_id,quantity,transaction_items(id,transaction_id,transactions(id,created_at,payment_status))',
};
const managerWritable = new Set([
  'store_settings','categories','units','suppliers','customers','customer_areas',
]);
const cashierColumns: Record<string, string> = {
  store_settings: 'store_name,address,tax_rate,wa_report_template',
  categories: 'id,name', units: 'id,name',
  products: 'id,name,price,stock,category_id,unit_id,categories(name),units(name),product_ingredients(ingredient_id,quantity)',
  ingredients: 'id,name,unit,yield_unit,yield_quantity,current_stock,min_stock_alert',
  product_ingredients: 'product_id,ingredient_id,quantity',
  shifts: 'id,cashier_id,start_time,end_time,starting_cash,ending_cash,status',
  transactions: 'id,shift_id,total,subtotal,tax,payment_method,payment_status,created_at',
  expenses: 'id,shift_id,cashier_id,amount,description,created_at',
};

async function handle(request: NextRequest, context: { params: Promise<{ table: string }> }) {
  const { table } = await context.params;
  if (!Object.hasOwn(adminColumns, table)) return NextResponse.json({ message: 'Tabel tidak dikenal' }, { status: 404 });
  try {
    const actor = await requireRole(['cashier','manager','super_admin']);
    const method = request.method;
    const read = method === 'GET' || method === 'HEAD';
    if (!read && request.headers.get('origin') !== request.nextUrl.origin)
      return NextResponse.json({ message: 'Asal permintaan tidak diizinkan' }, { status: 403 });
    if (!read && !managerWritable.has(table)) return NextResponse.json({ message: 'Operasi ini harus melalui aksi server' }, { status: 403 });
    if (!read && actor.role === 'cashier') return NextResponse.json({ message: 'Akses ditolak' }, { status: 403 });
    if (table === 'store_settings' && !read && method !== 'PATCH')
      return NextResponse.json({ message: 'Pengaturan hanya dapat diperbarui' }, { status: 403 });
    if (actor.role === 'cashier' && !cashierColumns[table])
      return NextResponse.json({ message: 'Akses ditolak' }, { status: 403 });

    const params = new URL(request.url).searchParams;
    const allowedFilters = new Set([
      'id','name','role','category_id','unit_id','product_id','ingredient_id','supplier_id',
      'purchase_id','transaction_id','shift_id','cashier_id','customer_id','status',
      'payment_status','payment_method','created_at','updated_at','start_time','end_time',
      'order_type','amount','price','stock','order','limit','offset','select',
    ]);
    for (const key of Array.from(params.keys())) {
      if (!allowedFilters.has(key) || (table === 'users' && !['id','role','order','limit','offset','select'].includes(key)))
        return NextResponse.json({ message: 'Filter tidak diizinkan' }, { status: 403 });
    }
    const order = params.get('order');
    if (order && !/^[a-z_]+\.(asc|desc)(\.nulls(first|last))?$/.test(order))
      return NextResponse.json({ message: 'Urutan tidak diizinkan' }, { status: 403 });
    let body: string | undefined;
    if (table === 'store_settings' && method === 'PATCH') {
      if (!/^eq\.[0-9a-f-]{36}$/.test(params.get('id') ?? ''))
        return NextResponse.json({ message: 'ID pengaturan wajib' }, { status: 400 });
      const submitted: unknown = await request.json();
      if (!submitted || typeof submitted !== 'object' || Array.isArray(submitted))
        return NextResponse.json({ message: 'Pengaturan tidak valid' }, { status: 400 });
      const fields = submitted as Record<string, unknown>;
      const allowed = new Set(['store_name','address','tax_rate','service_charge','wa_report_template','updated_at']);
      if (Object.keys(fields).some(key => !allowed.has(key)) ||
        typeof fields.store_name !== 'string' || !fields.store_name.trim() || fields.store_name.length > 255 ||
        typeof fields.tax_rate !== 'number' || !Number.isFinite(fields.tax_rate) || fields.tax_rate < 0 || fields.tax_rate > 100 ||
        typeof fields.service_charge !== 'number' || !Number.isFinite(fields.service_charge) || fields.service_charge < 0 || fields.service_charge > 100 ||
        (fields.address != null && typeof fields.address !== 'string') ||
        (fields.wa_report_template != null && typeof fields.wa_report_template !== 'string'))
        return NextResponse.json({ message: 'Nilai pengaturan tidak valid' }, { status: 400 });
      body = JSON.stringify({ store_name: fields.store_name.trim(), address: fields.address ?? null,
        tax_rate: fields.tax_rate, service_charge: fields.service_charge,
        wa_report_template: fields.wa_report_template ?? null, updated_at: new Date().toISOString() });
    }
    params.set('select', actor.role === 'cashier' ? cashierColumns[table] : adminColumns[table]);
    if (actor.role === 'cashier' && ['shifts','transactions','expenses'].includes(table)) {
      const shiftIds = table === 'shifts' ? '' : await ownShiftIds(actor.userId);
      params.set(table === 'shifts' ? 'cashier_id' : 'shift_id',
        table === 'shifts' ? `eq.${actor.userId}` : shiftIds ? `in.(${shiftIds})` : 'eq.00000000-0000-0000-0000-000000000000');
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) throw new Error('Konfigurasi server belum lengkap');
    const forwardedHeaders = new Headers();
    for (const name of ['accept','content-type','prefer','range','range-unit']) {
      const value = request.headers.get(name);
      if (value) forwardedHeaders.set(name, value);
    }
    forwardedHeaders.set('apikey', key);
    forwardedHeaders.set('authorization', `Bearer ${key}`);
    const response = await fetch(`${url}/rest/v1/${table}?${params.toString()}`, {
      method, headers: forwardedHeaders,
      body: read ? undefined : body ?? await request.text(), cache: 'no-store',
    });
    const resultHeaders = new Headers();
    for (const name of ['content-type','content-range','range-unit','preference-applied']) {
      const value = response.headers.get(name);
      if (value) resultHeaders.set(name, value);
    }
    resultHeaders.set('cache-control', 'no-store');
    return new Response(method === 'HEAD' ? null : await response.text(), { status: response.status, headers: resultHeaders });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Gagal memuat data' }, { status: 401 });
  }
}

async function ownShiftIds(userId: string) {
  const { db } = await import('@/lib/server/db');
  const { data, error } = await db().from('shifts').select('id').eq('cashier_id', userId);
  if (error) throw error;
  return (data ?? []).map(row => row.id).join(',');
}

export const GET = handle;
export const HEAD = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
