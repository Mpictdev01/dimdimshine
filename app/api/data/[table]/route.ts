import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/server/session';

const adminColumns: Record<string, string> = {
  store_settings: '*', users: 'id,full_name,role', shifts: '*', categories: '*', units: '*',
  products: '*,categories(id,name),units(id,name),product_ingredients(ingredient_id,quantity)',
  customer_areas: '*', customers: '*,customer_areas(name)',
  transactions: '*,shifts(status),customers(name,address,phone),transaction_items(id,product_id,quantity,price,cost_price,products(id,name,units(name)))',
  transaction_items: '*,products(id,name,units(name)),transactions(id,created_at,customers(name))',
  suppliers: '*', purchases: '*,suppliers(name),purchase_items(product_id,ingredient_id,qty,buy_price)',
  purchase_items: '*,products(id,name,units(name)),ingredients(id,name,unit),purchases(id,created_at,suppliers(name))',
  stock_adjustments: '*,products(id,name,units(name)),ingredients(id,name,unit,yield_unit)',
  ingredients: '*', product_ingredients: '*', expenses: '*',
  sale_stock_usage: 'id,product_id,ingredient_id,quantity,transaction_items(id,transaction_id,transactions(id,created_at,payment_status))',
};
const cashierColumns: Record<string, string> = {
  store_settings: 'store_name,address,tax_rate,wa_report_template',
  categories: 'id,name', units: 'id,name',
  products: 'id,name,price,stock,category_id,unit_id,categories(name),units(name),product_ingredients(ingredient_id,quantity)',
  ingredients: 'id,name,unit,yield_unit,yield_quantity,current_stock,min_stock_alert',
  product_ingredients: 'product_id,ingredient_id,quantity',
  shifts: 'id,cashier_id,start_time,end_time,status',
  transactions: 'id,shift_id,total,subtotal,tax,payment_method,payment_status,created_at',
  expenses: 'id,shift_id,cashier_id,amount,description,created_at',
};

async function handle(request: NextRequest, context: { params: Promise<{ table: string }> }) {
  const { table } = await context.params;
  if (!Object.hasOwn(adminColumns, table)) return NextResponse.json({ message: 'Tabel tidak dikenal' }, { status: 404 });
  const method = request.method;
  if (method !== 'GET' && method !== 'HEAD')
    return NextResponse.json({ message: 'Operasi ini harus melalui aksi server' }, { status: 405 });
  try {
    const actor = await requireRole(['cashier','manager','super_admin']);
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
    params.set('select', actor.role === 'cashier' ? cashierColumns[table] : adminColumns[table]);
    if (actor.role === 'cashier' && ['shifts','transactions','expenses'].includes(table)) {
      if (table === 'shifts') {
        params.set('cashier_id', `eq.${actor.userId}`);
      } else {
        const requestedShift = params.get('shift_id');
        if (requestedShift) {
          const shiftId = /^eq\.([0-9a-f-]{36})$/.exec(requestedShift)?.[1];
          if (!shiftId || !(await ownsShift(actor.userId, shiftId)))
            return NextResponse.json({ message: 'Shift tidak diizinkan' }, { status: 403 });
          params.set('shift_id', `eq.${shiftId}`);
        } else {
          const shiftIds = await ownShiftIds(actor.userId);
          params.set('shift_id', shiftIds ? `in.(${shiftIds})` : 'eq.00000000-0000-0000-0000-000000000000');
        }
      }
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
      cache: 'no-store',
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

async function ownsShift(userId: string, shiftId: string) {
  const { db } = await import('@/lib/server/db');
  const { data, error } = await db().from('shifts').select('id')
    .eq('id', shiftId).eq('cashier_id', userId).maybeSingle();
  if (error) throw error;
  return !!data;
}

export const GET = handle;
export const HEAD = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
