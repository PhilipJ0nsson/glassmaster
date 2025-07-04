// File: app/(skyddade-sidor)/dashboard/komponenter/tillgangliga-matningar.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react'; // useCallback och useMemo var inte använda, kan tas bort om de inte behövs senare
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Arbetsorder, ArbetsorderStatus, AnvandareRoll } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Ruler, User, MapPin, CalendarPlus, Phone as PhoneIcon } from 'lucide-react';
import Link from 'next/link';
// ScrollArea borttagen
import { useRouter } from 'next/navigation';

interface KundForMatning {
    id: number;
    privatperson?: { fornamn: string; efternamn: string } | null;
    foretag?: { foretagsnamn: string } | null;
    adress: string;
    telefonnummer: string;
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
        title += `: ${ao.material.substring(0, 20)}${ao.material.length > 20 ? '...' : ''}`;
    }
    return title;
};

const getArbetsorderStatusText = (status: ArbetsorderStatus | undefined | string): string => {
    if (!status) return "Okänd Status";
    const statusMap: Record<ArbetsorderStatus, string> = {
        [ArbetsorderStatus.MATNING]: 'Mätning',
        [ArbetsorderStatus.OFFERT]: 'Offert',
        [ArbetsorderStatus.AKTIV]: 'Aktiv',
        [ArbetsorderStatus.SLUTFORD]: 'Slutförd',
        [ArbetsorderStatus.FAKTURERAD]: 'Fakturerad',
        [ArbetsorderStatus.AVBRUTEN]: 'Avbruten',
    };
    return statusMap[status as ArbetsorderStatus] || status.toString();
};

export default function TillgangligaMatningar({ onMatningTilldelad }: TillgangligaMatningarProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [matningar, setMatningar] = useState<ArbetsorderForMatning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, [session, onMatningTilldelad]);

  const handleBokaMatning = (arbetsorderId: number) => {
    if (!session?.user?.id) {
      toast.error("Kan inte boka mätning, användarsession saknas.");
      return;
    }
    router.push(`/kalender?nyHandelseForAO=${arbetsorderId}&ansvarig=${session.user.id}`);
    toast.info("Förifyller ny kalenderhändelse för mätningen...");
  };

  if (session && session.user && !(session.user.role === AnvandareRoll.TEKNIKER || session.user.role === AnvandareRoll.ARBETSLEDARE || session.user.role === AnvandareRoll.ADMIN)) {
    return null;
  }

  if (loading && matningar.length === 0 && !error) { // Ändrat från bara `loading`
     return (
      <Card> {/* className="flex flex-col" borttagen */}
        <CardHeader><CardTitle className="flex items-center"><Ruler className="mr-2 h-5 w-5" /> Tillgängliga Mätningar</CardTitle></CardHeader>
        <CardContent className="h-60 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /><p className="ml-2 text-muted-foreground">Laddar...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) { // Lade till denna för att hantera felvisning
    return (
     <Card> {/* className="flex flex-col" borttagen */}
       <CardHeader><CardTitle className="flex items-center"><Ruler className="mr-2 h-5 w-5" /> Tillgängliga Mätningar</CardTitle></CardHeader>
       <CardContent className="h-60 flex items-center justify-center text-destructive"><p>{error}</p></CardContent>
     </Card>
   );
 }

  return (
    <Card> {/* className="flex flex-col" borttagen */}
      <CardHeader><CardTitle className="flex items-center"><Ruler className="mr-2 h-5 w-5" /> Tillgängliga Mätningar</CardTitle></CardHeader>
      <CardContent> {/* className="flex-1 overflow-hidden" borttagen */}
        {matningar.length === 0 && !loading ? (
          <p className="text-muted-foreground py-4 text-center">Det finns inga otilldelade mätningar just nu.</p>
        ) : (
          <div className="space-y-3"> {/* pr-3 borttagen, ScrollArea borttagen */}
            {matningar.map((ao) => (
              <div key={ao.id} className="p-3 sm:p-4 border rounded-lg shadow-sm bg-card hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:flex-wrap justify-between items-start sm:items-center gap-2">
                  <div className="flex-grow min-w-0">
                    <h4 className="font-semibold text-md mb-0.5 truncate">
                      {getArbetsorderDisplayTitleForMatning(ao)}
                      <span className={`ml-2 text-xs font-normal px-1.5 py-0.5 rounded-full border whitespace-nowrap bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-800/30 dark:text-orange-300 dark:border-orange-700`}>
                          {getArbetsorderStatusText(ao.status)}
                      </span>
                    </h4>
                    <p className="text-xs italic text-muted-foreground mb-1">(Ingen ansvarig)</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0"> {/* Ändrad från flex-col sm:flex-row och tog bort w-full/sm:w-auto samt flex-shrink-0 */}
                      <Link href={`/arbetsordrar/${ao.id}`} passHref>
                          <Button size="sm" variant="outline" className="text-primary border-primary/50 hover:bg-primary/10 whitespace-nowrap">
                              Visa Order
                          </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="default"
                        // className="w-full sm:w-auto" // Borttagen för att låta den anpassa sig
                        onClick={() => handleBokaMatning(ao.id)}
                      >
                        <CalendarPlus className="mr-1.5 h-4 w-4 flex-shrink-0" />
                        <span className="truncate">Boka Mätning</span>
                      </Button>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-dashed dark:border-slate-700">
                  <p className="text-sm flex items-center mt-1">
                    <User className="mr-1.5 h-4 w-4 text-primary" />
                    <Link href={`/kunder/${ao.kund.id}`} className="hover:underline text-primary font-medium">
                      {ao.kund.privatperson ? `${ao.kund.privatperson.fornamn} ${ao.kund.privatperson.efternamn}` : (ao.kund.foretag?.foretagsnamn || `Kund #${ao.kundId}`)}
                    </Link>
                  </p>
                  {ao.kund.telefonnummer && (
                    <p className="text-xs text-muted-foreground flex items-center mt-1">
                      <PhoneIcon className="mr-1.5 h-3 w-3" /> {ao.kund.telefonnummer}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground flex items-center mt-1">
                    <MapPin className="mr-1.5 h-3 w-3" /> {ao.kund.adress}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}