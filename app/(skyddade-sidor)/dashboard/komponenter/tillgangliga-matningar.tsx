// File: app/(skyddade-sidor)/dashboard/komponenter/tillgangliga-matningar.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Arbetsorder, ArbetsorderStatus, AnvandareRoll } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Ruler, User, MapPin, Briefcase } from 'lucide-react'; 
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
// import { useRouter } from 'next/navigation'; // Behövs inte om onMatningTilldelad används

interface KundForMatning {
    id: number;
    privatperson?: { fornamn: string; efternamn: string } | null;
    foretag?: { foretagsnamn: string } | null;
    adress: string;
}
interface ArbetsorderForMatning extends Pick<Arbetsorder, 'id' | 'referensMärkning' | 'material' | 'status' | 'kundId'> {
    kund: KundForMatning;
}

interface TillgangligaMatningarProps {
  onMatningTilldelad: () => void; 
}

const getArbetsorderDisplayTitleForMatning = (ao: ArbetsorderForMatning): string => {
    let title = `AO #${ao.id}`;
    if (ao.referensMärkning) {
        title += `: ${ao.referensMärkning}`;
    }
    else if (ao.material) {
        title += `: ${ao.material.substring(0, 30)}${ao.material.length > 30 ? '...' : ''}`;
    }
    return title;
};

export default function TillgangligaMatningar({ onMatningTilldelad }: TillgangligaMatningarProps) {
  const { data: session } = useSession();
  // const router = useRouter(); // Tas bort
  const [matningar, setMatningar] = useState<ArbetsorderForMatning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<number | null>(null);

  useEffect(() => {
    const fetchTillgangligaMatningar = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/arbetsordrar?otilldeladMatning=true`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Kunde inte hämta tillgängliga mätningar' }));
          throw new Error(errorData.error || 'Kunde inte hämta tillgängliga mätningar');
        }
        const data = await response.json();
        setMatningar(data.arbetsordrar || []); 
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Ett fel uppstod.');
        // toast.error(err.message || 'Kunde inte ladda tillgängliga mätningar.'); // Kan tas bort
      } finally {
        setLoading(false);
      }
    };
    
    if (session && session.user && (session.user.role === AnvandareRoll.TEKNIKER || session.user.role === AnvandareRoll.ARBETSLEDARE || session.user.role === AnvandareRoll.ADMIN)) {
        fetchTillgangligaMatningar();
    } else if (session === null) { 
        setLoading(false);
        setMatningar([]);
    } else if (session && session.user) { 
        setLoading(false);
        setMatningar([]); 
    }
  }, [session]); // Kommer också att köras om när key-prop i dashboard/page.tsx ändras

  const handleTaMatning = async (arbetsorderId: number) => {
    if (!session?.user?.id) {
      toast.error("Kan inte tilldela mätning, användarsession saknas.");
      return;
    }
    setAssigningId(arbetsorderId);
    try {
      const response = await fetch(`/api/arbetsordrar/${arbetsorderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ansvarigTeknikerId: session.user.id }), // Endast skicka ansvarigTeknikerId
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Kunde inte tilldela mätningen.");
      }
      
      toast.success(`Mätning för AO #${arbetsorderId} har tilldelats dig.`);
      onMatningTilldelad(); // Signalera till föräldern
      
      toast.info("Kom ihåg att boka in en tid i kalendern för mätningen!");
    } catch (error: any) {
      toast.error(error.message);
      console.error("Fel vid tilldelning av mätning:", error);
    } finally {
      setAssigningId(null);
    }
  };
  
  // ... (JSX förblir densamma som i ditt senaste fullständiga kodblock för denna fil)
  if (session && session.user && !(session.user.role === AnvandareRoll.TEKNIKER || session.user.role === AnvandareRoll.ARBETSLEDARE || session.user.role === AnvandareRoll.ADMIN)) {
    return null; 
  }

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center"><Ruler className="mr-2 h-5 w-5" /> Tillgängliga Mätningar</CardTitle></CardHeader>
        <CardContent className="h-60 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /><p className="ml-2 text-muted-foreground">Laddar...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center"><Ruler className="mr-2 h-5 w-5" /> Tillgängliga Mätningar</CardTitle></CardHeader>
        <CardContent className="h-60 flex items-center justify-center text-destructive"><p>{error}</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center"><Ruler className="mr-2 h-5 w-5" /> Tillgängliga Mätningar</CardTitle></CardHeader>
      <CardContent>
        {matningar.length === 0 ? (
          <p className="text-muted-foreground">Det finns inga otilldelade mätningar just nu.</p>
        ) : (
          <ScrollArea className="h-72"> 
            <div className="space-y-3 pr-3">
              {matningar.map((ao) => (
                <div key={ao.id} className="p-3 border rounded-md bg-card">
                  <Link href={`/arbetsordrar/${ao.id}`} className="block hover:bg-muted/50 -m-3 p-3 rounded-md">
                    <h4 className="font-semibold text-sm">
                        {getArbetsorderDisplayTitleForMatning(ao)}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                        Kund: {ao.kund.privatperson ? `${ao.kund.privatperson.fornamn} ${ao.kund.privatperson.efternamn}` : ao.kund.foretag?.foretagsnamn || `Kund #${ao.kundId}`}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center mt-0.5">
                        <MapPin className="mr-1.5 h-3 w-3" /> {ao.kund.adress}
                    </p>
                  </Link>
                  <div className="mt-2 pt-2 border-t flex justify-end">
                    <Button 
                      size="sm" 
                      variant="default"
                      onClick={() => handleTaMatning(ao.id)}
                      disabled={assigningId === ao.id}
                    >
                      {assigningId === ao.id ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Briefcase className="mr-1.5 h-4 w-4" />}
                      Ta Mätning
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}