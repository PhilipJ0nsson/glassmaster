'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnvandareRoll } from "@prisma/client";
import { Shield, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import AnvandareLista from "./komponenter/anvandare-lista";

export default function InstallningarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Omdirigera till dashboard om användaren inte är admin
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== AnvandareRoll.ADMIN) {
      toast.error('Du har inte behörighet till denna sida');
      router.push('/dashboard');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return <div className="flex justify-center items-center h-full">Laddar...</div>;
  }

  if (status === 'authenticated' && session?.user?.role !== AnvandareRoll.ADMIN) {
    return null; // Visar ingenting medan omdirigering sker
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1">Inställningar</h1>
        <p className="text-muted-foreground">
          Hantera systemets inställningar och användare
        </p>
      </div>

      <Tabs defaultValue="anvandare">
        <TabsList>
          <TabsTrigger value="anvandare" className="flex items-center">
            <Users className="w-4 h-4 mr-2" />
            Användare
          </TabsTrigger>
          <TabsTrigger value="behorigheter" className="flex items-center">
            <Shield className="w-4 h-4 mr-2" />
            Behörigheter
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="anvandare" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Användarhantering</CardTitle>
            </CardHeader>
            <CardContent>
              <AnvandareLista />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="behorigheter" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Behörigheter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Administratör</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Full tillgång till alla funktioner i systemet</li>
                    <li>Hantera användare (skapa, redigera, aktivera/inaktivera)</li>
                    <li>Hantera behörigheter</li>
                    <li>Tillgång till alla rapporter och statistik</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Arbetsledare</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Hantera arbetsordrar (skapa, redigera, ta bort)</li>
                    <li>Hantera kunder (skapa, redigera, ta bort)</li>
                    <li>Hantera prislistor (skapa, redigera, ta bort)</li>
                    <li>Hantera kalender och schemaläggning</li>
                    <li>Se andra tekniker och deras scheman</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Tekniker</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Se egna arbetsordrar</li>
                    <li>Uppdatera status på egna arbetsordrar</li>
                    <li>Se eget schema i kalendern</li>
                    <li>Se kunduppgifter (men inte ändra)</li>
                    <li>Se prislista (men inte ändra)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}