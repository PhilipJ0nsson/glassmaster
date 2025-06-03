// File: app/(skyddade-sidor)/dashboard/komponenter/min-historik.tsx
// Mode: Modifying
// Change: Tekniker ser nu samma "actionable" items som Admin/AL, men bara för sina egna jobb och utan action-knappar.
// Reasoning: To give Tekniker insight into the next steps for their completed work, without giving them admin actions.
// --- start diff ---
// File: app/(skyddade-sidor)/dashboard/komponenter/min-historik.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { KalenderHandelse } from '@/app/(skyddade-sidor)/kalender/page'; 
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'; 
import { Button } from '@/components/ui/button'; 
import { Loader2, History, Clock, User, Briefcase, MapPin, ExternalLink, FileText, FileUp, Edit, CheckSquare, Square, Info } from 'lucide-react'; 
import { format, parseISO, subDays } from 'date-fns'; 
import { sv } from 'date-fns/locale';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MotesTyp, ArbetsorderStatus, AnvandareRoll } from '@prisma/client'; 
import { useRouter } from 'next/navigation'; 

interface HistorikEventForDisplay extends KalenderHandelse {
    __actionType?: 'matning_klar' | 'fakturering_vantar';
}

const getDisplayTitleForHistorik = (event: HistorikEventForDisplay, role: AnvandareRoll | undefined): string => {
    const arbetsorder = event.arbetsorder;
    let displayTitle = event.titel || '';

    if (arbetsorder) {
        let aoInfo = `AO #${arbetsorder.id}`;
        if (arbetsorder.referensMärkning) {
            aoInfo += `: ${arbetsorder.referensMärkning}`;
        } else if (arbetsorder.material) {
            aoInfo += `: ${arbetsorder.material.substring(0,30)}${arbetsorder.material.length > 30 ? '...' : ''}`;
        }

        // Samma logik för att visa __actionType för alla roller nu
        if (event.__actionType === 'matning_klar') {
            displayTitle = `${aoInfo} - Mätning utförd, väntar på offert/order`;
        } else if (event.__actionType === 'fakturering_vantar') {
            displayTitle = `${aoInfo} - Slutförd, väntar på fakturering`;
        } else { 
            // Fallback om __actionType inte är satt (bör inte hända för AO-relaterade events i denna lista)
            // eller om det är en tekniker och vi inte vill visa den interna texten
            const grundTitel = event.titel || aoInfo;
            displayTitle = event.titel && arbetsorder ? `${event.titel} (${aoInfo})` : grundTitel;
        }
    } else { // Händelser utan arbetsorder (kommer inte visas i denna listan längre)
        const kundNamn = getKundNamnHistorik(event.kund);
        displayTitle = event.titel || (getMotesTypTextHistorik(event.motestyp) + (kundNamn ? ` - ${kundNamn}` : ''));
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
        [ArbetsorderStatus.MATNING]: 'Mätning', 
        [ArbetsorderStatus.OFFERT]: 'Offert', 
        [ArbetsorderStatus.AKTIV]: 'Aktiv', 
        [ArbetsorderStatus.SLUTFORD]: 'Slutförd',
        [ArbetsorderStatus.FAKTURERAD]: 'Fakturerad',
        [ArbetsorderStatus.AVBRUTEN]: 'Avbruten',
    };
    return statusMap[status as ArbetsorderStatus] || status.toString();
};

const formatDateHistorik = (dateStr: string) => {
  return format(parseISO(dateStr), 'PPP', { locale: sv }); 
};

const getKundNamnHistorik = (kund: HistorikEventForDisplay['kund']) => {
  if (!kund) return '';
  if (kund.privatperson) return `${kund.privatperson.fornamn} ${kund.privatperson.efternamn}`;
  if (kund.foretag) return kund.foretag.foretagsnamn;
  return '';
};


export default function MinHistorik() {
  const { data: session } = useSession();
  const router = useRouter(); 
  const [allFetchedHistoryEvents, setAllFetchedHistoryEvents] = useState<KalenderHandelse[]>([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // showAllMyHistoryForTekniker tas bort, då tekniker nu ser samma typ av lista som admin/AL

  const userRole = session?.user?.role;
  const userId = session?.user?.id ? parseInt(session.user.id) : null;

  const isAdminOrArbetsledare = useMemo(() =>
    userRole === AnvandareRoll.ADMIN || userRole === AnvandareRoll.ARBETSLEDARE,
  [userRole]);

  const fetchRelevantHistory = useCallback(async () => {
    if (!userId) { // Kräver inloggad användare
        setLoading(false);
        setAllFetchedHistoryEvents([]);
        return;
    }
    setLoading(true);
    setError(null);
    try {
      // Vi behöver fortfarande hämta en bred uppsättning för att kunna filtrera korrekt i frontend
      let url = `/api/kalender?historik=true&visaHanterade=true`; 
      
      // Om det är en tekniker, filtrera på deras ID i API:et direkt för att minska datamängden.
      // Admin/AL får allt (eller så kan man lägga till ett &allaAnvandare=true för dem om API:et stödjer det).
      if (userRole === AnvandareRoll.TEKNIKER) {
        url += `&forAnvandareId=${userId}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Kunde inte hämta historikdata' }));
        throw new Error(errorData.error || 'Kunde inte hämta historikdata');
      }
      const data: KalenderHandelse[] = await response.json();
      setAllFetchedHistoryEvents(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ett fel uppstod.');
    } finally {
      setLoading(false);
    }
  }, [userId, userRole]); 

  useEffect(() => {
    fetchRelevantHistory();
  }, [fetchRelevantHistory]);

  const displayedHistory: HistorikEventForDisplay[] = useMemo(() => {
    const actionableItemsMap = new Map<number, HistorikEventForDisplay>();

    for (const event of allFetchedHistoryEvents) {
        const ao = event.arbetsorder;

        if (ao && ao.id) {
            // Om det är en tekniker, säkerställ att det är deras eget jobb
            if (userRole === AnvandareRoll.TEKNIKER) {
                const isOwnEvent = event.ansvarigId === userId || 
                                   (event.medarbetare && event.medarbetare.some(m => m.anvandare.id === userId));
                if (!isOwnEvent) continue; // Hoppa över om det inte är teknikerns jobb
            }

            let currentActionType: HistorikEventForDisplay['__actionType'] | undefined = undefined;
            if (ao.status === ArbetsorderStatus.MATNING && event.hanteradAvAdmin) {
                currentActionType = 'matning_klar';
            } else if (ao.status === ArbetsorderStatus.SLUTFORD) {
                currentActionType = 'fakturering_vantar';
            }

            if (currentActionType) {
                const eventForDisplay: HistorikEventForDisplay = { ...event, __actionType: currentActionType };
                const existingItem = actionableItemsMap.get(ao.id);
                if (!existingItem || 
                    (eventForDisplay.__actionType === 'fakturering_vantar' && existingItem.__actionType === 'matning_klar') ||
                    (eventForDisplay.__actionType === existingItem.__actionType && new Date(eventForDisplay.slutDatumTid) > new Date(existingItem.slutDatumTid))
                   ) {
                    actionableItemsMap.set(ao.id, eventForDisplay);
                }
            }
        }
    }
    
    return Array.from(actionableItemsMap.values())
                .sort((a, b) => new Date(b.slutDatumTid).getTime() - new Date(a.slutDatumTid).getTime());
  }, [allFetchedHistoryEvents, userRole, userId]);


  const cardTitle = isAdminOrArbetsledare ? "Åtgärder Väntar" : "Status Pågående Jobb"; // Anpassa titel för tekniker

  if (loading && displayedHistory.length === 0 && !error) {
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
        {/* Ingen filterknapp behövs längre här för detta syfte */}
      </CardHeader>
      <CardContent>
        {(!loading && displayedHistory.length === 0 && !error) ? ( 
          <p className="text-muted-foreground py-4 text-center">
            {isAdminOrArbetsledare ? "Inga omedelbara åtgärder att hantera." : "Inga pågående jobb med väntande åtgärder."}
          </p>
        ) : (
          <ScrollArea className="h-80"> 
            <div className="space-y-3 pr-3">
              {displayedHistory.map((event) => { 
                const arbetsorder = event.arbetsorder; 
                if (!arbetsorder) return null; // Ska inte hända med nuvarande logik

                const displayEventTitle = getDisplayTitleForHistorik(event, userRole);
                
                let actionButton = null;
                // Action-knappar visas bara för Admin/Arbetsledare
                if (isAdminOrArbetsledare) {
                    if (event.__actionType === 'matning_klar') {
                        actionButton = ( <Button variant="outline" size="sm" className="text-xs h-7 px-2 border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-700/30" onClick={() => router.push(`/arbetsordrar/${arbetsorder.id}`)}> <FileText className="h-3 w-3 mr-1" /> Skapa Offert/Order </Button> );
                    } else if (event.__actionType === 'fakturering_vantar') { 
                        actionButton = ( <Button variant="outline" size="sm" className="text-xs h-7 px-2 border-green-500 text-green-600 hover:bg-green-50 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-700/30" onClick={() => router.push(`/arbetsordrar/${arbetsorder.id}`)}> <FileUp className="h-3 w-3 mr-1" /> Fakturera </Button> );
                    }
                }

                return (
                  <div key={`hist-action-${event.id}`} 
                    className={`p-3 border rounded-md bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors`}>
                    <div className="flex justify-between items-start gap-2">
                        <div className="flex-grow">
                            <h4 className="font-medium text-sm text-foreground">
                                {displayEventTitle}
                                {/* Visa ansvarig om det är admin/AL och inte deras eget event */}
                                {isAdminOrArbetsledare && event.ansvarig && event.ansvarigId !== userId && (
                                     <span className="ml-2 text-xs italic text-muted-foreground">(Ansvarig: {event.ansvarig.fornamn} {event.ansvarig.efternamn})</span>
                                )}
                            </h4>
                            <p className="text-xs text-muted-foreground flex items-center">
                                <Clock className="mr-1.5 h-3 w-3" /> 
                                {formatDateHistorik(event.slutDatumTid)}
                                <span className="mx-1">•</span>
                                {getArbetsorderStatusTextHistorik(arbetsorder.status as ArbetsorderStatus)}
                                {event.__actionType === 'matning_klar' && 
                                  <span className="mx-1 text-blue-600 dark:text-blue-400">• Mätning Klar</span>}
                            </p>
                        </div>
                        <div className="flex flex-col items-end space-y-1 flex-shrink-0">
                            <Link href={`/arbetsordrar/${arbetsorder.id}`} passHref>
                                <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-muted-foreground hover:text-primary">
                                    Visa Order <ExternalLink className="ml-1.5 h-3 w-3" />
                                </Button>
                            </Link>
                            {actionButton}
                        </div>
                    </div>
                    {/* Beskrivning kan vara relevant även för admin/AL om de vill se teknikerns anteckning */}
                    {event.beskrivning && ( 
                        <p className="text-xs text-muted-foreground mt-1 pt-1 border-t border-dashed border-slate-200 dark:border-slate-700 flex items-start">
                            <Info className="h-3 w-3 mr-1.5 mt-0.5 shrink-0"/> {event.beskrivning}
                        </p>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
      {displayedHistory.length > 0 && ( 
        <CardFooter className="text-xs text-muted-foreground pt-3 mt-auto"> 
            Visar {displayedHistory.length} {isAdminOrArbetsledare ? `åtgärdspunkt${displayedHistory.length === 1 ? '' : 'er'}` : `pågående jobb med väntande åtgärder`}.
        </CardFooter>
      )}
    </Card>
  );
}
// --- end diff ---