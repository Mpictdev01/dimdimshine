import { redirect } from 'next/navigation';

export default function Home() {
  // Arahkan halaman utama langsung ke halaman POS
  redirect('/pos');
}
