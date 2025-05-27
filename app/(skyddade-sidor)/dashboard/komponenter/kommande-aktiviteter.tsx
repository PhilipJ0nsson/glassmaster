// File: app/(skyddade-sidor)/dashboard/komponenter/kommande-aktiviteter.tsx
// Fullständig kod
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react'; 
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { KalenderHandelse } from '@/app/(skyddade-sidor)/kalender/page'; 
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CalendarDays, Clock, User, Briefcase, MapPin, Phone, ExternalLink, Info, CheckCircle2, Construction, ClipboardCheck, CalendarPlus } from 'lucide-react'; 
import { format, parseISO, isSameDay } from 'date-fns';
import { sv } from 'date-fns/locale';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area'; 
import { MotesTyp, ArbetsorderStatus, Arbetsorder as PrismaArbetsorder, AnvandareRoll } from '@prisma/client'; 
import { useRouter } from 'next/navigation';

interface KalenderEventData extends KalenderHandelse {}

interface ObokadArbetsorderData extends Pick<PrismaArbetsorder, 'id' | 'referensMärkning' | 'material' | 'status' | 'kundId' | 'ansvarigTeknikerId'> {
    kund: {
        id: number;
        adress: string;
        telefonnummer: string;
        privatperson?: { fornamn: string; efternamn: string } | null;
        foretag?: { foretagsnamn: string } | null;
    };
}

interface AnstalldForKommande {
  id: number;
  fornamn: string;
  efternamn: string;
}
interface KommandeAktiviteterProps {
  onActivityHandled: () => void; 
  anstallda: AnstalldForKommande[]; 
  loadingAnstallda: boolean; 
}

const getArbetsorderDisplayTitle = (arbetsorder: KalenderEventData['arbetsorder'] | ObokadArbetsorderData, eventTitel?: string | null): string => {
    if (!arbetsorder) return eventTitel || ''; 
    
    let aoInfo = `AO #${arbetsorder.id}`;
    if (arbetsorder.referensMärkning) {
        aoInfo += `: ${arbetsorder.referensMärkning}`;
    } else if ('material' in arbetsorder && arbetsorder.material) {
         aoInfo += `: ${arbetsorder.material.substring(0, 30)}${arbetsorder.material.length > 30 ? '...' : ''}`;
    }
    
    if (eventTitel) {
        return `${eventTitel} (kopplad till ${aoInfo})`;
    }
    return aoInfo;
};

const getMotesTypText = (motestyp: MotesTyp | undefined) => {
  if (!motestyp) return "Okänd händelse";
  switch (motestyp) {
    case MotesTyp.ARBETSORDER: return "Arbetsorder"; 
    case MotesTyp.MOTE: return "Möte";
    case MotesTyp.SEMESTER: return "Semester";
    case MotesTyp.ANNAT: return "Annat";
    default: return "Okänd typ";
  }
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

const formatDateRange = (startStr: string, endStr: string) => {
  const startDate = parseISO(startStr);
  const endDate = parseISO(endStr);
  const datePart = format(startDate, 'PPP', { locale: sv }); 
  const startTime = format(startDate, 'HH:mm');
  const endTime = format(endDate, 'HH:mm');
  if (isSameDay(startDate, endDate)) {
    return `${datePart}, ${startTime} - ${endTime}`;
  } else {
    const endDatePart = format(endDate, 'PPP', { locale: sv });
    return `${datePart}, ${startTime} - ${endDatePart}, ${endTime}`;
  }
};

const getKundNamn = (kund: KalenderEventData['kund'] | ObokadArbetsorderData['kund'] | null | undefined) => {
  if (!kund) return 'Ingen kund';
  if ('privatperson' in kund && kund.privatperson) return `${kund.privatperson.fornamn} ${kund.privatperson.efternamn}`;
  if ('foretag' in kund && kund.foretag) return kund.foretag.foretagsnamn;
  if (kund && 'id' in kund) return `Kund #${kund.id}`;
  return 'Kundinformation saknas';
};


export default function KommandeAktiviteter({ onActivityHandled, anstallda, loadingAnstallda }: KommandeAktiviteterProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [bokadeAktiviteter, setBokadeAktiviteter] = useState<KalenderEventData[]>([]);
  const [obokadeOrdrar, setObokadeOrdrar] = useState<ObokadArbetsorderData[]>([]);
  const [loadingBokade, setLoadingBokade] = useState(true);
  const [loadingObokade, setLoadingObokade] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);

  const isAdminOrArbetsledare = useMemo(() => 
    session?.user?.role === AnvandareRoll.ADMIN || session?.user?.role === AnvandareRoll.ARBETSLEDARE,
  [session]);

  const fetchBokadeAktiviteter = useCallback(async () => { 
    setLoadingBokade(true);
    setError(null);
    try {
      let url = '/api/kalender?historik=false'; // fetchHistorik=false är redan satt
      if (session?.user?.id && !isAdminOrArbetsledare) { 
        url += `&forAnvandareId=${session.user.id}`;
      }
      // För Admin/AL hämtas alla kommande (API:et filtrerar bort de som är kopplade till slutförda/fakturerade/avbrutna AO)
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Kunde inte hämta bokade aktiviteter' }));
        throw new Error(errorData.error || 'Kunde inte hämta bokade aktiviteter');
      }
      const data = await response.json();
      setBokadeAktiviteter(data);
    } catch (err: any) {
      console.error("Fel vid hämtning av bokade aktiviteter:", err);
      setError(prevError => prevError || err.message || 'Ett fel uppstod vid hämtning av bokade aktiviteter.');
    } finally {
      setLoadingBokade(false);
    }
  }, [session, isAdminOrArbetsledare]);

  const fetchObokadeJobb = useCallback(async () => {
    setLoadingObokade(true);
    setError(null);
    try {
      let url = '/api/arbetsordrar?';
      
      // Statusar som räknas som "aktiva" jobb som kan behöva bokas
      const teknikerRelevantaStatusar = `${ArbetsorderStatus.MATNING},${ArbetsorderStatus.AKTIV}`;
      // Admin/AL kan vilja se även de som är i offertstadiet som "obokade" ifall de behöver följas upp eller bokas för produktion
      const adminRelevantaStatusar = `${ArbetsorderStatus.MATNING},${ArbetsorderStatus.OFFERT},${ArbetsorderStatus.AKTIV}`;

      if (session?.user?.id && !isAdminOrArbetsledare) { // Tekniker
        url += `ansvarigForObokadeId=${session.user.id}&status=${teknikerRelevantaStatusar}`;
      } else if (isAdminOrArbetsledare) { // Admin/Arbetsledare
        url += `allAssignedButUnbooked=true&status=${adminRelevantaStatusar}`;
      } else { 
        setObokadeOrdrar([]);
        setLoadingObokade(false);
        return;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Kunde inte hämta obokade ordrar' }));
        throw new Error(errorData.error || 'Kunde inte hämta obokade ordrar');
      }
      const data = await response.json();
      setObokadeOrdrar(data.arbetsordrar || []);
    } catch (err: any) {
      console.error("Fel vid hämtning av obokade ordrar:", err);
      setError(prevError => prevError || err.message || 'Ett fel uppstod vid hämtning av obokade ordrar.');
    } finally {
      setLoadingObokade(false);
    }
  }, [session, isAdminOrArbetsledare]);


  useEffect(() => {
    if (session && session.user && session.user.id) {
      setError(null); 
      fetchBokadeAktiviteter(); 
      fetchObokadeJobb();
    } else if (session === null) { 
      setLoadingBokade(false);
      setLoadingObokade(false);
      setBokadeAktiviteter([]);
      setObokadeOrdrar([]);
    }
  }, [session, fetchBokadeAktiviteter, fetchObokadeJobb, onActivityHandled]); 

  const handleStatusUpdate = async (arbetsorderId: number, nyStatus: ArbetsorderStatus, successMessage: string) => {
    setUpdatingStatusId(arbetsorderId);
    try {
      const response = await fetch(`/api/arbetsordrar/${arbetsorderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nyStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Kunde inte uppdatera status till ${getArbetsorderStatusText(nyStatus)}`);
      }
      
      toast.success(successMessage);
      onActivityHandled(); 

    } catch (error: any) {
      toast.error(error.message);
      console.error("Fel vid statusuppdatering:", error);
    } finally {
      setUpdatingStatusId(null);
    }
  };
  
  const handleBokaTidClick = (arbetsorderId: number) => {
    const ao = obokadeOrdrar.find(o => o.id === arbetsorderId);
    const ansvarigForAO = ao?.ansvarigTeknikerId?.toString();
    const ansvarigAttForifylla = ansvarigForAO || session?.user?.id;

    router.push(`/kalender?nyHandelseForAO=${arbetsorderId}${ansvarigAttForifylla ? `&ansvarig=${ansvarigAttForifylla}` : ''}`);
    toast.info("Förifyller ny kalenderhändelse...");
  };

  const isLoading = loadingBokade || loadingObokade || loadingAnstallda;

  const faktiskaObokadeOrdrar = useMemo(() => {
    return obokadeOrdrar.filter(obokadAo => {
      // En AO är "obokad" om det INTE finns en bokad aktivitet för just den AO:n
      // där den som är ansvarig för AO:n också är ansvarig för kalenderhändelsen
      // OCH kalenderhändelsen är i framtiden.
      const isBookedForItsAssignedTechnicianAndUpcoming = bokadeAktiviteter.some(
        bokadEvent => {
            const eventSlutDatum = parseISO(bokadEvent.slutDatumTid);
            const today = new Date(); // Jämför med nuvarande tidpunkt
            // today.setHours(0,0,0,0); // Om man bara vill kolla datum, inte tid

            return bokadEvent.arbetsorderId === obokadAo.id &&
                   bokadEvent.ansvarigId === obokadAo.ansvarigTeknikerId &&
                   eventSlutDatum >= today; // Händelsen ska inte ha passerat
        }
      );
      // En tekniker ska inte se "obokade" jobb som är i offertstadiet
      if (!isAdminOrArbetsledare && obokadAo.status === ArbetsorderStatus.OFFERT) {
          return false;
      }
      return !isBookedForItsAssignedTechnicianAndUpcoming;
    });
  }, [obokadeOrdrar, bokadeAktiviteter, isAdminOrArbetsledare]);

  const cardTitle = isAdminOrArbetsledare ? "Alla Aktiviteter & Jobb" : "Dina Aktiviteter & Jobb";

  if (isLoading && bokadeAktiviteter.length === 0 && faktiskaObokadeOrdrar.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center"><CalendarDays className="mr-2 h-5 w-5" /> {cardTitle}</CardTitle></CardHeader>
        <CardContent className="h-72 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /><p className="ml-2 text-muted-foreground">Laddar...</p>
        </CardContent>
      </Card>
    );
  }

  if (error && bokadeAktiviteter.length === 0 && faktiskaObokadeOrdrar.length === 0) {
     return (
      <Card>
        <CardHeader><CardTitle className="flex items-center"><CalendarDays className="mr-2 h-5 w-5" /> {cardTitle}</CardTitle></CardHeader>
        <CardContent className="h-72 flex items-center justify-center text-destructive"><p>{error}</p></CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center"><CalendarDays className="mr-2 h-5 w-5" /> {cardTitle}</CardTitle></CardHeader>
      <CardContent>
        {(bokadeAktiviteter.length === 0 && faktiskaObokadeOrdrar.length === 0) ? (
          <p className="text-muted-foreground">Du har inga kommande aktiviteter eller obokade jobb som matchar din roll/filter.</p>
        ) : (
          <ScrollArea className="h-[calc(24rem+10rem)]"> 
            <div className="space-y-4 pr-3">
              {/* Först, renderera bokade aktiviteter */}
              {bokadeAktiviteter.map((akt) => {
                const arbetsorder = akt.arbetsorder;
                let actionButton = null;
                let displayTitle = arbetsorder 
                                   ? getArbetsorderDisplayTitle(arbetsorder, akt.titel) 
                                   : akt.titel || getMotesTypText(akt.motestyp);
                
                const canTakeAction = session?.user?.id === akt.ansvarigId.toString() || isAdminOrArbetsledare;

                if (arbetsorder && canTakeAction) {
                  if (arbetsorder.status === ArbetsorderStatus.MATNING) {
                    actionButton = ( <Button size="sm" variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-400 dark:text-blue-300 dark:hover:bg-blue-900/50 dark:hover:text-blue-200" onClick={() => handleStatusUpdate(arbetsorder.id, ArbetsorderStatus.OFFERT, `Mätning för AO #${arbetsorder.id} markerad som utförd.`)} disabled={updatingStatusId === arbetsorder.id} > {updatingStatusId === arbetsorder.id ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ClipboardCheck className="mr-1.5 h-4 w-4" />} Mätning Utförd </Button> );
                  } else if (arbetsorder.status === ArbetsorderStatus.AKTIV) {
                    actionButton = ( <Button size="sm" variant="outline" className="border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700 dark:border-green-400 dark:text-green-300 dark:hover:bg-green-900/50 dark:hover:text-green-200" onClick={() => handleStatusUpdate(arbetsorder.id, ArbetsorderStatus.SLUTFORD, `Arbetsorder #${arbetsorder.id} markerad som slutförd.`)} disabled={updatingStatusId === arbetsorder.id} > {updatingStatusId === arbetsorder.id ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />} Slutför Order </Button> );
                  }
                }

                return (
                  <div key={`kal-${akt.id}`} className="p-4 border rounded-lg shadow-sm bg-card hover:shadow-md transition-shadow">
                    <h3 className="font-semibold text-md mb-1">
                      {displayTitle}
                      {arbetsorder && ( <span className={`ml-2 text-xs font-normal px-1.5 py-0.5 rounded-full border ${ arbetsorder.status === ArbetsorderStatus.MATNING ? 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-800/30 dark:text-orange-300 dark:border-orange-700' : arbetsorder.status === ArbetsorderStatus.OFFERT ? 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-800/30 dark:text-yellow-300 dark:border-yellow-700' : 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-800/30 dark:text-blue-300 dark:border-blue-700'}`}>{getArbetsorderStatusText(arbetsorder.status as ArbetsorderStatus)}</span> )}
                      {isAdminOrArbetsledare && akt.ansvarig && session?.user?.id !== akt.ansvarigId.toString() && (
                        <span className="ml-2 text-xs italic text-muted-foreground">(Ansvarig: {akt.ansvarig.fornamn} {akt.ansvarig.efternamn})</span>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground flex items-center mb-2"> <Clock className="mr-1.5 h-4 w-4" /> {formatDateRange(akt.datumTid, akt.slutDatumTid)} </p>
                    {akt.kund && ( <div className="mt-2 pt-2 border-t border-dashed dark:border-slate-700"> <p className="text-sm flex items-center mt-1"> <User className="mr-1.5 h-4 w-4 text-primary" /> <Link href={`/kunder/${akt.kund.id}`} className="hover:underline text-primary font-medium">{getKundNamn(akt.kund)}</Link> </p> {akt.kund.telefonnummer && ( <p className="text-xs text-muted-foreground flex items-center mt-1"><Phone className="mr-1.5 h-3 w-3" /> {akt.kund.telefonnummer}</p> )} {akt.kund.adress && ( <p className="text-xs text-muted-foreground flex items-center mt-1"><MapPin className="mr-1.5 h-3 w-3" /> {akt.kund.adress}</p> )} </div> )}
                    {akt.beskrivning && !arbetsorder && ( <p className="text-xs text-muted-foreground mt-1 flex items-start"><Info className="mr-1.5 h-3 w-3 mt-0.5 flex-shrink-0" /> <span>{akt.beskrivning}</span></p> )}
                    {(arbetsorder || actionButton) && ( <div className="mt-3 flex flex-wrap gap-2 justify-end items-center"> {arbetsorder && ( <Link href={`/arbetsordrar/${arbetsorder.id}`}><Button size="sm" variant="ghost" className="text-muted-foreground hover:text-primary">Visa Order <ExternalLink className="ml-1.5 h-3.5 w-3.5" /></Button></Link> )} {actionButton} </div> )}
                  </div>
                );
              })}

              {faktiskaObokadeOrdrar.length > 0 && bokadeAktiviteter.length > 0 && (
                <div className="my-6 border-t pt-6">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3 text-center">
                        {isAdminOrArbetsledare ? "Alla Tilldelade, Obokade Jobb" : "Dina Obokade Tilldelade Jobb"}
                    </h4>
                </div>
              )}
              {faktiskaObokadeOrdrar.map((ao) => (
                <div key={`ao-${ao.id}`} className="p-4 border rounded-lg shadow-sm bg-amber-50 dark:bg-amber-900/30 hover:shadow-md transition-shadow">
                   <h3 className="font-semibold text-md mb-1">
                     {getArbetsorderDisplayTitle(ao)}
                     <span className={`ml-2 text-xs font-normal px-1.5 py-0.5 rounded-full border ${ ao.status === ArbetsorderStatus.MATNING ? 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-800/30 dark:text-orange-300 dark:border-orange-700' : ao.status === ArbetsorderStatus.OFFERT ? 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-800/30 dark:text-yellow-300 dark:border-yellow-700' : 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-800/30 dark:text-blue-300 dark:border-blue-700'}`}>{getArbetsorderStatusText(ao.status)}</span>
                     {isAdminOrArbetsledare && ao.ansvarigTeknikerId && (
                        <span className="ml-2 text-xs italic text-muted-foreground">
                            (Tilldelad: { anstallda.find((a: AnstalldForKommande) => a.id === ao.ansvarigTeknikerId)?.fornamn } { anstallda.find((a: AnstalldForKommande) => a.id === ao.ansvarigTeknikerId)?.efternamn || `Tekniker #${ao.ansvarigTeknikerId}`})
                        </span>
                     )}
                   </h3>
                    <div className="mt-2 pt-2 border-t border-dashed dark:border-slate-700">
                        <p className="text-sm flex items-center mt-1"> <User className="mr-1.5 h-4 w-4 text-primary" /> <Link href={`/kunder/${ao.kund.id}`} className="hover:underline text-primary font-medium">{getKundNamn(ao.kund)}</Link> </p>
                        {ao.kund.telefonnummer && ( <p className="text-xs text-muted-foreground flex items-center mt-1"><Phone className="mr-1.5 h-3 w-3" /> {ao.kund.telefonnummer}</p> )}
                        {ao.kund.adress && ( <p className="text-xs text-muted-foreground flex items-center mt-1"><MapPin className="mr-1.5 h-3 w-3" /> {ao.kund.adress}</p> )}
                    </div>
                     <div className="mt-3 flex flex-wrap gap-2 justify-end items-center">
                        <Link href={`/arbetsordrar/${ao.id}`}>
                            <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-primary">
                            Visa Order <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                            </Button>
                        </Link>
                        <Button size="sm" variant="default" onClick={() => handleBokaTidClick(ao.id)}>
                           <CalendarPlus className="mr-1.5 h-4 w-4" /> Boka tid
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