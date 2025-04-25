'use client';

import { Sidebar } from '@/components/sidebar';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

interface SkyddadeLayoutProps {
  children: ReactNode;
}

export default function SkyddadeLayout({ children }: SkyddadeLayoutProps) {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Laddar...</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    redirect('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}