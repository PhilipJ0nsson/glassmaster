// File: components/app-navigation-content.tsx
// Fullständig kod med Alternativ 1 för footer (separata menyobjekt)

'use client';

import { AnvandareRoll } from '@prisma/client';
import {
  Calendar,
  CreditCard,
  LayoutDashboard,
  List,
  LogOut,
  Settings,
  Users,
  // ChevronDown // Behövs inte här längre
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  SidebarHeader, 
  SidebarContent, 
  SidebarFooter, 
  SidebarGroup, 
  // SidebarGroupLabel, // Används inte direkt här
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  useSidebar 
} from '@/components/ui/sidebar'; 
// import { UserCircle } from 'lucide-react'; // Kan användas för avatar om man vill

const menuItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard, 
    roles: [AnvandareRoll.ADMIN, AnvandareRoll.ARBETSLEDARE, AnvandareRoll.TEKNIKER],
  },
  {
    title: 'Kalender',
    href: '/kalender',
    icon: Calendar,
    roles: [AnvandareRoll.ADMIN, AnvandareRoll.ARBETSLEDARE, AnvandareRoll.TEKNIKER],
  },
  {
    title: 'Arbetsordrar',
    href: '/arbetsordrar',
    icon: List,
    roles: [AnvandareRoll.ADMIN, AnvandareRoll.ARBETSLEDARE, AnvandareRoll.TEKNIKER],
  },
  {
    title: 'Kunder',
    href: '/kunder',
    icon: Users,
    roles: [AnvandareRoll.ADMIN, AnvandareRoll.ARBETSLEDARE],
  },
  {
    title: 'Prislista',
    href: '/prislista',
    icon: CreditCard,
    roles: [AnvandareRoll.ADMIN, AnvandareRoll.ARBETSLEDARE],
  },
  {
    title: 'Inställningar',
    href: '/installningar',
    icon: Settings,
    roles: [AnvandareRoll.ADMIN],
  },
];

export function AppNavigationContent() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role as AnvandareRoll || AnvandareRoll.TEKNIKER;
  const { state: sidebarState } = useSidebar(); 

  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <>
      <SidebarHeader className="border-b h-14 flex items-center px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="relative h-8 w-8">
            <Image
              src="/window.svg"
              alt="Glasmästarappen"
              fill
              className="object-contain"
            />
          </div>
          {sidebarState === 'expanded' && (
            <span className="text-lg font-bold text-sidebar-foreground">Glasmästaren</span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="flex-1 overflow-y-auto p-4">
        <SidebarGroup>
          <SidebarMenu>
            {filteredMenuItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const IconComponent = item.icon;
            
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive} 
                    tooltip={sidebarState === 'collapsed' ? item.title : undefined}
                  >
                    <Link href={item.href}>
                      <IconComponent className="size-5" />
                      {sidebarState === 'expanded' && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-2 space-y-1">
        {/* Användarinfo som ett icke-klickbart item om sidomenyn är expanderad */}
        {sidebarState === 'expanded' && session?.user && (
          <SidebarMenuItem>
            {/* Detta är inte en knapp, bara en div för information */}
            <div className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-default">
              {/* Optional: Lägg till en användarikon/avatar här om du vill */}
              {/* <UserCircle className="size-5 text-sidebar-foreground flex-shrink-0" /> */}
              <div className="flex flex-col items-start text-left overflow-hidden">
                <span className="font-medium text-sidebar-foreground truncate" title={session.user.name || undefined}>
                  {session.user.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {userRole === AnvandareRoll.ADMIN ? 'Administratör'
                    : userRole === AnvandareRoll.ARBETSLEDARE ? 'Arbetsledare'
                    : 'Tekniker'}
                </span>
              </div>
            </div>
          </SidebarMenuItem>
        )}

        {/* Logga ut-knapp */}
        <SidebarMenuItem>
          <SidebarMenuButton 
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full" // Tar full bredd av menyalternativet
            tooltip={sidebarState === 'collapsed' ? (session?.user?.name ? `${session.user.name} - Logga ut` : "Logga ut") : undefined}
            // När kollapsad och ingen användare, visa bara "Logga ut". Annars visa namn + "Logga ut"
          >
            <LogOut className="size-5" />
            {sidebarState === 'expanded' && <span>Logga ut</span>}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarFooter>
    </>
  );
}