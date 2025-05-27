// File: app/(skyddade-sidor)/dashboard/komponenter/min-historik.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { KalenderHandelse } from '@/app/(skyddade-sidor)/kalender/page'; 
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'; 
import { Button } from '@/components/ui/button'; 
import { Loader2, History, Clock, User, Briefcase, MapPin, ExternalLink, CheckSquare, Square, FileText, FileUp } from 'lucide-react'; 
import { format, parseISO } from 'date-fns'; 
import { sv } from 'date-fns/locale';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MotesTyp, ArbetsorderStatus, AnvandareRoll } from '@prisma/client'; 
import { useRouter } from 'next/navigation'; // Importera useRouter

interface HistorikEvent extends KalenderHandelse {
    hanteradAvAdmin?: boolean; 
}

const getDisplayTitleForHistorik = (event: HistorikEvent): string => {
    const arbetsorder = event.arbetsorder;
    let displayTitle = event.titel || ''; 

    if (arbetsorder) {
        let aoInfo = `AO #${arbetsorder.id}`;
        if (arbetsorder.referensMärkning) {
            aoInfo += `: ${arbetsorder.referensMärkning}`;
        }
        if (event.titel) {
            displayTitle = `${event.titel} (kopplad till ${aoInfo})`;
        } else {
            displayTitle = aoInfo;
        }
    } else if (event.titel) { 
        const kundNamn = getKundNamnHistorik(event.kund);
        displayTitle = kundNamn ? `${event.titel} - ${kundNamn}` : event.titel;
    } else { 
        const kundNamn = getKundNamnHistorik(event.kund);
        displayTitle = getMotesTypTextHistorik(event.motestyp) + (kundNamn ? ` - ${kundNamn}` : '');
    }
    return displayTitle;
};

const getMotesTypTextHistorik = (motestyp: MotesTyp | undefined) => {
  if (!motestyp) return "Händelse";
  switch (motestyp) {
    case MotesTyp.ARBETSORDER: return "Arbetsorder-aktivitet"; 
    case MotesTyp.MOTE: return "Möte";
    case MotesTyp.SEMESTER: return "Semester";
    case MotesTyp.ANNAT: return "Annat";
    default: return "Händelse";
  }
};

const getArbetsorderStatusTextHistorik = (status: ArbetsorderStatus | undefined | string): string => {
    if (!status) return ""; 
    const statusMap: Record<ArbetsorderStatus, string> = {
        [ArbetsorderStatus.MATNING]: 'Mätning Utförd', 
        [ArbetsorderStatus.OFFERT]: 'Offert Skapad', 
        [ArbetsorderStatus.AKTIV]: 'Arbete Påbörjat/Hanterat', 
        [ArbetsorderStatus.SLUTFORD]: 'Slutförd',
        [ArbetsorderStatus.FAKTURERAD]: 'Fakturerad',
        [ArbetsorderStatus.AVBRUTEN]: 'Avbruten',
    };
    return statusMap[status as ArbetsorderStatus] || status.toString();
};

const formatDateHistorik = (dateStr: string) => {
  return format(parseISO(dateStr), 'PPP', { locale: sv }); 
};

const getKundNamnHistorik = (kund: HistorikEvent['kund']) => {
  if (!kund) return '';
  if (kund.privatperson) return `${kund.privatperson.fornamn} ${kund.privatperson.efternamn}`;
  if (kund.foretag) return kund.foretag.foretagsnamn;
  return '';
};

export default function MinHistorik() {
  const { data: session } = useSession();
  const router = useRouter(); // Initiera useRouter
  const [historik, setHistorik] = useState<HistorikEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingHandledId, setMarkingHandledId] = useState<number | null>(null);
  const [showHandled, setShowHandled] = useState(false);

  const isAdminOrArbetsledare = useMemo(() =>
    session?.user?.role === AnvandareRoll.ADMIN || session?.user?.role === AnvandareRoll.ARBETSLEDARE,
  [session]);

  const fetchMinHistorik = useCallback(async (visaHanterade: boolean) => {
    if (!session?.user?.id) return;
    setLoading(true);
    setError(null);
    try {
      let url = `/api/kalender?historik=true&visaHanterade=${visaHanterade}`;
      if (!isAdminOrArbetsledare) { 
        url += `&forAnvandareId=${session.user.id}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Kunde inte hämta historik' }));
        throw new Error(errorData.error || 'Kunde inte hämta historik');
      }
      const data = await response.json();
      setHistorik(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ett fel uppstod.');
    } finally {
      setLoading(false);
    }
  }, [session, isAdminOrArbetsledare]); 

  useEffect(() => {
    if (session && session.user && session.user.id) {
      fetchMinHistorik(showHandled);
    } else if (session === null) {
      setLoading(false);
      setHistorik([]);
    }
  }, [session, showHandled, fetchMinHistorik]);

  const handleMarkAsHandledAndNavigate = async (kalenderId: number, arbetsorderId: number | null | undefined) => {
    setMarkingHandledId(kalenderId);
    try {
      const response = await fetch(`/api/kalender/${kalenderId}/hantera`, { method: 'PUT' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Kunde inte markera som hanterad.");
      }
      toast.success("Händelse markerad som hanterad.");
      if (arbetsorderId) {
        router.push(`/arbetsordrar/${arbetsorderId}`);
      }
      fetchMinHistorik(showHandled); 
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setMarkingHandledId(null);
    }
  };
  
  const canManageHistory = isAdminOrArbetsledare;
  const cardTitle = isAdminOrArbetsledare ? "All Historik" : "Min Historik";

  if (loading && historik.length === 0) {
     return (
      <Card>
        <CardHeader><CardTitle className="flex items-center"><History className="mr-2 h-5 w-5" /> {cardTitle}</CardTitle></CardHeader>
        <CardContent className="h-60 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /><p className="ml-2 text-muted-foreground">Laddar historik...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center"><History className="mr-2 h-5 w-5" /> {cardTitle}</CardTitle></CardHeader>
        <CardContent className="h-60 flex items-center justify-center text-destructive"><p>{error}</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center"><History className="mr-2 h-5 w-5" /> {cardTitle}</CardTitle>
        {canManageHistory && (
            <Button variant="outline" size="sm" onClick={() => setShowHandled(!showHandled)} className="text-xs h-8">
                {showHandled ? <Square className="mr-1.5 h-3.5 w-3.5"/> : <CheckSquare className="mr-1.5 h-3.5 w-3.5"/>}
                {showHandled ? "Dölj hanterade" : "Visa hanterade"}
            </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading && historik.length > 0 && (
            <div className="py-4 text-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" /></div>
        )}
        {!loading && historik.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center">
            {showHandled ? "Ingen hanterad historik att visa." : (isAdminOrArbetsledare ? "Ingen ohanterad historik." : "Du har ingen ohanterad historik.")}
          </p>
        ) : (
          <ScrollArea className="h-80"> 
            <div className="space-y-3 pr-3">
              {historik.map((event) => {
                const arbetsorder = event.arbetsorder;
                const displayEventTitle = getDisplayTitleForHistorik(event);
                
                let actionButton = null;
                if (canManageHistory && !event.hanteradAvAdmin && arbetsorder) {
                  if (arbetsorder.status === ArbetsorderStatus.OFFERT) {
                    actionButton = (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs h-7 px-2 border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-700/30"
                        onClick={() => handleMarkAsHandledAndNavigate(event.id, arbetsorder.id)}
                        disabled={markingHandledId === event.id}
                      >
                        {markingHandledId === event.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                        <span className="ml-1">Hantera Offert</span>
                      </Button>
                    );
                  } else if (arbetsorder.status === ArbetsorderStatus.SLUTFORD) {
                    actionButton = (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs h-7 px-2 border-green-500 text-green-600 hover:bg-green-50 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-700/30"
                        onClick={() => handleMarkAsHandledAndNavigate(event.id, arbetsorder.id)}
                        disabled={markingHandledId === event.id}
                      >
                        {markingHandledId === event.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileUp className="h-3 w-3" />}
                        <span className="ml-1">Fakturera</span>
                      </Button>
                    );
                  } else if (arbetsorder.status !== ArbetsorderStatus.FAKTURERAD && arbetsorder.status !== ArbetsorderStatus.AVBRUTEN) {
                    // Generell "Markera som hanterad" för andra fall om det skulle behövas
                     actionButton = (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs h-7 px-2 border-gray-500 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700/30"
                        onClick={() => handleMarkAsHandledAndNavigate(event.id, arbetsorder.id)}
                        disabled={markingHandledId === event.id}
                      >
                        {markingHandledId === event.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckSquare className="h-3 w-3" />}
                        <span className="ml-1">Hanterad</span>
                      </Button>
                    );
                  }
                }


                return (
                  <div key={event.id} className={`p-3 border rounded-md transition-colors ${event.hanteradAvAdmin ? 'bg-slate-100 dark:bg-slate-800 opacity-70 hover:opacity-100' : 'bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                    <div className="flex justify-between items-start gap-2">
                        <div className="flex-grow">
                            <h4 className="font-medium text-sm text-foreground">
                                {displayEventTitle}
                                {isAdminOrArbetsledare && event.ansvarig && session?.user?.id !== event.ansvarigId.toString() && (
                                    <span className="ml-2 text-xs italic text-muted-foreground">(Ansvarig: {event.ansvarig.fornamn} {event.ansvarig.efternamn})</span>
                                )}
                            </h4>
                            <p className="text-xs text-muted-foreground flex items-center">
                                <Clock className="mr-1.5 h-3 w-3" /> 
                                {formatDateHistorik(event.slutDatumTid)}
                                {arbetsorder && arbetsorder.status && <span className="mx-1">•</span>} 
                                {arbetsorder && arbetsorder.status && getArbetsorderStatusTextHistorik(arbetsorder.status as ArbetsorderStatus)}
                            </p>
                        </div>
                        <div className="flex flex-col items-end space-y-1 flex-shrink-0">
                            {arbetsorder && (
                                <Link href={`/arbetsordrar/${arbetsorder.id}`} passHref>
                                    <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-muted-foreground hover:text-primary">
                                        Visa Order <ExternalLink className="ml-1.5 h-3 w-3" />
                                    </Button>
                                </Link>
                            )}
                            {actionButton}
                        </div>
                    </div>
                    {event.beskrivning && (
                        <p className="text-xs text-muted-foreground mt-1 pt-1 border-t border-dashed border-slate-200 dark:border-slate-700">{event.beskrivning}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
      {historik.length > 0 && (
        <CardFooter className="text-xs text-muted-foreground pt-3 mt-auto"> 
            Visar {historik.length === 50 && showHandled ? 'de första 50' : historik.length === 50 && !showHandled ? 'de första 50 ohanterade' : historik.length} historikposterna.
        </CardFooter>
      )}
    </Card>
  );
}