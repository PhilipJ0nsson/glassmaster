// File: app/(skyddade-sidor)/dashboard/komponenter/min-historik.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { KalenderHandelse } from '@/app/(skyddade-sidor)/kalender/page';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, History, Clock, User, Briefcase, MapPin, FileText, FileUp, Info } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';
import Link from 'next/link';
// ScrollArea borttagen
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
            aoInfo += `: ${arbetsorder.material.substring(0,20)}${arbetsorder.material.length > 20 ? '...' : ''}`;
        }

        if (event.__actionType === 'matning_klar') {
            displayTitle = `${aoInfo} - Mätning utförd`;
        } else if (event.__actionType === 'fakturering_vantar') {
            displayTitle = `${aoInfo} - Slutförd`;
        } else {
            const grundTitel = event.titel || aoInfo;
            displayTitle = event.titel && arbetsorder ? `${event.titel} (${aoInfo})` : grundTitel;
        }
    } else {
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
  if (kund.foretag && kund.foretag.foretagsnamn) return kund.foretag.foretagsnamn;
  return '';
};

export default function MinHistorik() {
  const { data: session } = useSession();
  const router = useRouter();
  const [allFetchedHistoryEvents, setAllFetchedHistoryEvents] = useState<KalenderHandelse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userRole = session?.user?.role;
  const userId = session?.user?.id ? parseInt(session.user.id) : null;

  const isAdminOrArbetsledare = useMemo(() =>
    userRole === AnvandareRoll.ADMIN || userRole === AnvandareRoll.ARBETSLEDARE,
  [userRole]);

  const fetchRelevantHistory = useCallback(async () => {
    if (!userId) {
        setLoading(false);
        setAllFetchedHistoryEvents([]);
        return;
    }
    setLoading(true);
    setError(null);
    try {
      let url = `/api/kalender?historik=true&visaHanterade=true`;
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
            if (userRole === AnvandareRoll.TEKNIKER) {
                const isOwnEvent = event.ansvarigId === userId ||
                                   (event.medarbetare && event.medarbetare.some(m => m.anvandare.id === userId));
                if (!isOwnEvent) continue;
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

  const cardTitle = isAdminOrArbetsledare ? "Åtgärder Väntar" : "Status Pågående Jobb";

  if (loading && displayedHistory.length === 0 && !error) {
     return (
      <Card> {/* className="flex flex-col" borttagen, Card hanterar oftast detta själv */}
        <CardHeader><CardTitle className="flex items-center"><History className="mr-2 h-5 w-5" /> {cardTitle}</CardTitle></CardHeader>
        <CardContent className="h-60 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /><p className="ml-2 text-muted-foreground">Laddar historik...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card> {/* className="flex flex-col" borttagen */}
        <CardHeader><CardTitle className="flex items-center"><History className="mr-2 h-5 w-5" /> {cardTitle}</CardTitle></CardHeader>
        <CardContent className="h-60 flex items-center justify-center text-destructive"><p>{error}</p></CardContent>
      </Card>
    );
  }

  return (
    <Card> {/* className="flex flex-col" borttagen */}
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center"><History className="mr-2 h-5 w-5" /> {cardTitle}</CardTitle>
      </CardHeader>
      <CardContent> {/* className="flex-1 overflow-hidden" borttagen */}
        {(!loading && displayedHistory.length === 0 && !error) ? (
          <p className="text-muted-foreground py-4 text-center">
            {isAdminOrArbetsledare ? "Inga omedelbara åtgärder att hantera." : "Inga pågående jobb med väntande åtgärder."}
          </p>
        ) : (
          <div className="space-y-3"> {/* pr-3 borttagen, ScrollArea borttagen */}
            {displayedHistory.map((event) => {
              const arbetsorder = event.arbetsorder;
              if (!arbetsorder) return null;
              const displayEventTitle = getDisplayTitleForHistorik(event, userRole);
              let actionButton = null;
              if (isAdminOrArbetsledare) {
                  if (event.__actionType === 'matning_klar') {
                      actionButton = (
                          <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 px-2 border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-700/30 whitespace-nowrap"
                              onClick={() => router.push(`/arbetsordrar/${arbetsorder.id}`)}
                          >
                              <FileText className="h-3 w-3 mr-1.5 flex-shrink-0" />
                              <span className="truncate">Ny Offert/Order</span>
                          </Button>
                      );
                  } else if (event.__actionType === 'fakturering_vantar') {
                      actionButton = (
                          <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 px-2 border-green-500 text-green-600 hover:bg-green-50 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-700/30 whitespace-nowrap"
                              onClick={() => router.push(`/arbetsordrar/${arbetsorder.id}`)}
                          >
                              <FileUp className="h-3 w-3 mr-1.5 flex-shrink-0" />
                              <span className="truncate">Fakturera</span>
                          </Button>
                      );
                  }
              }

              return (
                <div key={`hist-action-${event.id}`}
                  className={`p-3 sm:p-4 border rounded-md bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors`}>
                  <div className="flex flex-col sm:flex-row sm:flex-wrap justify-between items-start sm:items-center gap-2">
                      <div className="flex-grow min-w-0">
                          <h4 className="font-medium text-sm text-foreground truncate">
                              {displayEventTitle}
                          </h4>
                           {isAdminOrArbetsledare && event.ansvarig && event.ansvarigId !== userId && (
                               <p className="text-xs italic text-muted-foreground mt-0.5">
                                   (Ansvarig: {event.ansvarig.fornamn} {event.ansvarig.efternamn})
                               </p>
                          )}
                          <p className="text-xs text-muted-foreground flex items-center flex-wrap mt-1">
                              <Clock className="mr-1.5 h-3 w-3 flex-shrink-0" />
                              {formatDateHistorik(event.slutDatumTid)}
                              <span className="mx-1">•</span>
                              {getArbetsorderStatusTextHistorik(arbetsorder.status as ArbetsorderStatus)}
                              {event.__actionType === 'matning_klar' &&
                                <span className="mx-1 text-blue-600 dark:text-blue-400 whitespace-nowrap">• Mätning Klar</span>}
                              {event.__actionType === 'fakturering_vantar' &&
                                <span className="mx-1 text-green-600 dark:text-green-400 whitespace-nowrap">• Väntar Faktura</span>}
                          </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2 sm:mt-0"> {/* Ändrad från flex-col sm:flex-row och tog bort w-full/sm:w-auto samt flex-shrink-0 */}
                          <Link href={`/arbetsordrar/${arbetsorder.id}`} passHref>
                              <Button variant="outline" size="sm" className="text-xs h-7 px-2 text-primary border-primary/50 hover:bg-primary/10 whitespace-nowrap">
                                  Visa Order
                              </Button>
                          </Link>
                          {actionButton}
                      </div>
                  </div>
                  {event.beskrivning && (
                      <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-dashed border-slate-200 dark:border-slate-700 flex items-start">
                          <Info className="h-3 w-3 mr-1.5 mt-0.5 shrink-0"/> {event.beskrivning}
                      </p>
                  )}
                </div>
              );
            })}
          </div>
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