// File: app/(skyddade-sidor)/dashboard/page.tsx
// Fullständig kod med hämtning av anställda för KommandeAktiviteter.
'use client';

import { useSession } from 'next-auth/react';
import KommandeAktiviteter from './komponenter/kommande-aktiviteter';
import TillgangligaMatningar from './komponenter/tillgangliga-matningar';
import MinHistorik from './komponenter/min-historik';
import { AnvandareRoll } from '@prisma/client';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

interface AnstalldForDashboard {
  id: number;
  fornamn: string;
  efternamn: string;
}

export default function Dashboard() {
  const { data: session } = useSession();
  const [anstallda, setAnstallda] = useState<AnstalldForDashboard[]>([]);
  const [loadingAnstallda, setLoadingAnstallda] = useState(true);


  const isAdmin = session?.user?.role === AnvandareRoll.ADMIN;
  const isArbetsledare = session?.user?.role === AnvandareRoll.ARBETSLEDARE;
  const isTekniker = session?.user?.role === AnvandareRoll.TEKNIKER;

  const showTillgangligaMatningar = isTekniker || isArbetsledare || isAdmin;

  const [refreshDashboardKey, setRefreshDashboardKey] = useState(0);

  const handleDataRefreshNeeded = useCallback(() => {
    setRefreshDashboardKey(prevKey => prevKey + 1);
  }, []);

  useEffect(() => {
    const fetchAnstallda = async () => {
      setLoadingAnstallda(true);
      try {
        const response = await fetch('/api/anvandare');
        if (!response.ok) {
          throw new Error('Kunde inte hämta anställda');
        }
        const data = await response.json();
        setAnstallda(data.anvandare || []);
      } catch (error) {
        console.error("Fel vid hämtning av anställda för dashboard:", error);
        toast.error("Kunde inte ladda listan över anställda.");
      } finally {
        setLoadingAnstallda(false);
      }
    };
    if (session?.user && (isAdmin || isArbetsledare)) {
        fetchAnstallda();
    } else {
        setLoadingAnstallda(false);
    }
  }, [session, isAdmin, isArbetsledare]);


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Välkommen {session?.user?.name || "Användare"}!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-6 gap-y-8">
        {/* Kommande Aktiviteter tar upp en kolumn */}
        <KommandeAktiviteter
          key={`kommande-${refreshDashboardKey}`}
          onActivityHandled={handleDataRefreshNeeded}
          anstallda={anstallda}
          loadingAnstallda={loadingAnstallda}
        />

        {/* Tillgängliga Mätningar tar upp en kolumn (om den visas) */}
        {showTillgangligaMatningar && (
          <TillgangligaMatningar
            key={`tillgangliga-${refreshDashboardKey}`}
            onMatningTilldelad={handleDataRefreshNeeded}
          />
        )}

        {/* Min Historik tar upp en kolumn */}
        {/* 
          Om showTillgangligaMatningar är false, kommer MinHistorik att bli det andra elementet
          i gridet. På lg-skärmar kommer den då att uppta den andra av tre kolumner,
          och den tredje kolumnen blir tom. Detta är standardbeteendet för grid.
          Om du vill att de två återstående elementen ska dela på utrymmet (t.ex. 50% var),
          behöver du mer dynamisk logik för grid-kolumnerna eller använda flexbox.
          Denna lösning uppfyller "på rad i sidled".
        */}
        <MinHistorik key={`historik-${refreshDashboardKey}`} />
      </div>
    </div>
  );
}