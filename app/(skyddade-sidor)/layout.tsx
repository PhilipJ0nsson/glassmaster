// File: app/(skyddade-sidor)/layout.tsx
// Mode: Modifying
// Change: Simplifying the main content wrapper to rely on the shadcn/ui Sidebar's internal "gap" mechanism for layout adjustment.
// Reasoning: The shadcn/ui Sidebar component handles the main content offset by rendering a "gap" div.
// --- start diff ---
// app/(skyddade-sidor)/layout.tsx
'use client';

import { CollapsibleAppSidebar } from '@/components/collapsible-app-sidebar'; 
import { SidebarProvider, SidebarTrigger, useSidebar } from '@/components/ui/sidebar'; 
import { AnvandareRoll } from '@prisma/client';
import { ChevronsLeftIcon, ChevronsRightIcon } from 'lucide-react'; 
import { useSession } from 'next-auth/react';
import { redirect, usePathname } from 'next/navigation'; 
import { ReactNode, useEffect, useState } from 'react'; 
import { cn } from '@/lib/utils'; 

interface SkyddadeLayoutProps {
  children: ReactNode;
}

// Denna wrapper är inte längre nödvändig på samma sätt för att justera marginaler,
// men kan behållas för att gruppera trigger och children.
function MainContentWrapper({ children }: { children: ReactNode }) {
  const { state: sidebarState } = useSidebar();

  return (
    <main 
      className={cn(
        "flex-1 h-full overflow-y-auto bg-gray-50 dark:bg-background"
        // Ingen explicit margin-left behövs här, "sidebar-gap" ska hantera det.
      )}
    >
      <div className="p-4 md:p-8">
        <div className="mb-4">
           <SidebarTrigger className="data-[state=open]:bg-muted border rounded-md p-2 hover:bg-accent">
            {sidebarState === 'expanded' ? <ChevronsLeftIcon className="size-5" /> : <ChevronsRightIcon className="size-5" />}
            <span className="sr-only">{sidebarState === 'expanded' ? 'Minimera sidomeny' : 'Expandera sidomeny'}</span>
          </SidebarTrigger>
        </div>
        {children}
      </div>
    </main>
  );
}

export default function SkyddadeLayout({ children }: SkyddadeLayoutProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname(); 
  const [isClient, setIsClient] = useState(false); 

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => { 
    if (status === 'authenticated' && session?.user?.role !== AnvandareRoll.ADMIN && typeof window !== 'undefined' && window.location.pathname.startsWith('/installningar')) {
      redirect('/dashboard');
    }
  }, [session, status]);

  if (status === 'loading' || !isClient) return <div className="flex h-screen w-full items-center justify-center"><p>Laddar...</p></div>;
  if (status === 'unauthenticated') redirect('/login');
  
  return (
    <SidebarProvider 
      // `style` prop här för att sätta --sidebar-width etc. är bra om du vill
      // överstyrda standardvärdena från components/ui/sidebar.tsx.
      // Om du är nöjd med SIDEBAR_WIDTH etc. i den filen, behövs inte style här.
      // defaultOpen kan styras via cookie om så önskas, enligt shadcn-dokumentationen.
    >
      {/* 
        Denna div är `sidebar-wrapper` från SidebarProvider.
        Den har `display: flex`. 
        Inuti den kommer <CollapsibleAppSidebar /> (som renderar <Sidebar />)
        och <MainContentWrapper /> (som renderar <main />).
      */}
      <CollapsibleAppSidebar /> 
      <MainContentWrapper>{children}</MainContentWrapper>
    </SidebarProvider>
  );
}
// --- end diff ---