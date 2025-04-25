'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession } from 'next-auth/react';

export default function Dashboard() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Välkommen {session?.user?.name}
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Arbetsordrar</CardTitle>
            <CardDescription>Hantera dina arbetsordrar</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Snabbåtkomst till arbetsordrar kommer här</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Kunder</CardTitle>
            <CardDescription>Hantera kunder</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Snabbåtkomst till kunder kommer här</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Kalender</CardTitle>
            <CardDescription>Se ditt schema</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Kommande händelser visas här</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}