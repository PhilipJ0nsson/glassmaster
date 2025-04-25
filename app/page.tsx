'use client';

import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Image
              src="/window.svg"
              alt="Glasmästarappen Logo"
              width={40}
              height={40}
            />
            <span className="text-2xl font-bold">Glasmästarappen</span>
          </div>
          <nav className="flex gap-4">
            <Link href="/login">
              <Button variant="outline">Logga in</Button>
            </Link>
          </nav>
        </div>
      </header>
      
      <main className="flex-1">
        <section className="container mx-auto py-20 px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Komplett system för glasmästare
          </h1>
          <p className="text-xl mb-12 max-w-3xl mx-auto text-gray-600">
            Hantera kunder, arbetsordrar, prislistor och kalender i ett och samma system.
          </p>
          <Link href="/login">
            <Button size="lg">Kom igång</Button>
          </Link>
        </section>

        <section className="container mx-auto py-20 px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="border rounded-lg p-6 text-center">
              <h2 className="text-2xl font-bold mb-4">Allt på ett ställe</h2>
              <p className="text-gray-600">
                Samla all information om dina kunder och arbetsuppdrag.
              </p>
            </div>
            <div className="border rounded-lg p-6 text-center">
              <h2 className="text-2xl font-bold mb-4">Enkel planering</h2>
              <p className="text-gray-600">
                Planera arbetsordrar och se din kalender tydligt.
              </p>
            </div>
            <div className="border rounded-lg p-6 text-center">
              <h2 className="text-2xl font-bold mb-4">Komplett översikt</h2>
              <p className="text-gray-600">
                Få rapporter och statistik över verksamheten.
              </p>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-gray-500">
          <p>© {new Date().getFullYear()} Glasmästarappen. Alla rättigheter förbehållna.</p>
        </div>
      </footer>
    </div>
  );
}