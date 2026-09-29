import { redirect } from 'next/navigation';
import { session } from '@/lib/server/session';
import StockRequestsClient from './StockRequestsClient';

export default async function StockRequestsPage() {
  const actor = await session();
  if (!actor) redirect('/admin/login');
  if (actor.mustChangePin) redirect('/change-pin');
  if (actor.role !== 'super_admin') redirect('/admin');
  return <StockRequestsClient />;
}
