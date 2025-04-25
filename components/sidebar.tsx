'use client';

import { Button } from '@/components/ui/button';
import { AnvandareRoll } from '@prisma/client';
import {
  Calendar,
  CreditCard,
  LayoutDashboard,
  List,
  LogOut,
  Settings,
  Users,
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menuItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
    roles: [AnvandareRoll.ADMIN, AnvandareRoll.ARBETSLEDARE, AnvandareRoll.TEKNIKER],
  },
  {
    title: 'Kalender',
    href: '/kalender',
    icon: <Calendar className="h-5 w-5" />,
    roles: [AnvandareRoll.ADMIN, AnvandareRoll.ARBETSLEDARE, AnvandareRoll.TEKNIKER],
  },
  {
    title: 'Arbetsordrar',
    href: '/arbetsordrar',
    icon: <List className="h-5 w-5" />,
    roles: [AnvandareRoll.ADMIN, AnvandareRoll.ARBETSLEDARE, AnvandareRoll.TEKNIKER],
  },
  {
    title: 'Kunder',
    href: '/kunder',
    icon: <Users className="h-5 w-5" />,
    roles: [AnvandareRoll.ADMIN, AnvandareRoll.ARBETSLEDARE],
  },
  {
    title: 'Prislista',
    href: '/prislista',
    icon: <CreditCard className="h-5 w-5" />,
    roles: [AnvandareRoll.ADMIN, AnvandareRoll.ARBETSLEDARE],
  },
  {
    title: 'Inställningar',
    href: '/installningar',
    icon: <Settings className="h-5 w-5" />,
    roles: [AnvandareRoll.ADMIN],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role as AnvandareRoll || AnvandareRoll.TEKNIKER;

  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <div className="flex h-full w-64 flex-col border-r bg-white">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="relative h-8 w-8">
            <Image
              src="/window.svg"
              alt="Glasmästarappen"
              fill
              className="object-contain"
            />
          </div>
          <span className="text-lg font-bold">Glasmästarappen</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <nav className="space-y-1">
          {filteredMenuItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            
            return (
              <Link key={item.title} href={item.href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                >
                  {item.icon}
                  <span className="ml-3">{item.title}</span>
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{session?.user?.name}</p>
            <p className="text-xs text-gray-500">
              {userRole === AnvandareRoll.ADMIN
                ? 'Administratör'
                : userRole === AnvandareRoll.ARBETSLEDARE
                ? 'Arbetsledare'
                : 'Tekniker'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}