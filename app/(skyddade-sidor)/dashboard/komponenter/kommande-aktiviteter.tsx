// File: app/(skyddade-sidor)/dashboard/komponenter/kommande-aktiviteter.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { KalenderHandelse } from '@/app/(skyddade-sidor)/kalender/page';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CalendarDays, Clock, User, Briefcase, MapPin, Phone, Info, CheckCircle2, Construction, ClipboardCheck, CalendarPlus, UserX } from 'lucide-react';
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
    ansvarigTekniker?: {
        id: number;
        fornamn: string;
        efternamn: string;
    } | null;
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
         aoInfo += `: ${arbetsorder.material.substring(0, 25)}${arbetsorder.material.length > 25 ? '...' : ''}`;
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
  if ('foretag' in kund && kund.foretag && kund.foretag.foretagsnamn) return kund.foretag.foretagsnamn;
  if (kund && 'id' in kund) return `Kund #${kund.id}`;
  return 'Kundinformation saknas';
};


export default function KommandeAktiviteter({ onActivityHandled, anstallda, loadingAnstallda }: KommandeAktiviteterProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [bokadeAktiviteter, setBokadeAktiviteter] = useState<KalenderEventData[]>([]);
  const [obokadeJobbMedAnsvarig, setObokadeJobbMedAnsvarig] = useState<ObokadArbetsorderData[]>([]);
  const [otilldeladeAktivaJobb, setOtilldeladeAktivaJobb] = useState<ObokadArbetsorderData[]>([]);
  const [loadingBokade, setLoadingBokade] = useState(true);
  const [loadingObokadeMedAnsvarig, setLoadingObokadeMedAnsvarig] = useState(true);
  const [loadingOtilldeladeAktiva, setLoadingOtilldeladeAktiva] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
  const [handlingEventId, setHandlingEventId] = useState<number | null>(null);

  const isAdminOrArbetsledare = useMemo(() =>
    session?.user?.role === AnvandareRoll.ADMIN || session?.user?.role === AnvandareRoll.ARBETSLEDARE,
  [session]);

  const fetchBokadeAktiviteter = useCallback(async () => {
    setLoadingBokade(true);
    setError(null);
    try {
      let url = '/api/kalender?historik=false';
      if (session?.user?.id && !isAdminOrArbetsledare) {
        url += `&forAnvandareId=${session.user.id}`;
      }
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

  const fetchObokadeJobbTilldelade = useCallback(async () => {
    setLoadingObokadeMedAnsvarig(true);
    setError(null);
    try {
      let url = '/api/arbetsordrar?';
      const statusFilter = `${ArbetsorderStatus.MATNING},${ArbetsorderStatus.AKTIV}`;

      if (session?.user?.id && !isAdminOrArbetsledare) {
        url += `ansvarigForObokadeId=${session.user.id}&status=${statusFilter}`;
      } else if (isAdminOrArbetsledare) {
        url += `allAssignedButUnbooked=true&status=${statusFilter}`;
      } else {
        setObokadeJobbMedAnsvarig([]);
        setLoadingObokadeMedAnsvarig(false);
        return;
      }
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Kunde inte hämta obokade tilldelade ordrar' }));
        throw new Error(errorData.error || 'Kunde inte hämta obokade tilldelade ordrar');
      }
      const data = await response.json();
      setObokadeJobbMedAnsvarig(data.arbetsordrar || []);
    } catch (err: any) {
      console.error("Fel vid hämtning av obokade tilldelade ordrar:", err);
      setError(prevError => prevError || err.message || 'Ett fel uppstod vid hämtning av obokade tilldelade ordrar.');
    } finally {
      setLoadingObokadeMedAnsvarig(false);
    }
  }, [session, isAdminOrArbetsledare]);

  const fetchOtilldeladeAktivaJobb = useCallback(async () => {
    if (!isAdminOrArbetsledare) {
        setOtilldeladeAktivaJobb([]);
        setLoadingOtilldeladeAktiva(false);
        return;
    }
    setLoadingOtilldeladeAktiva(true);
    setError(null);
    try {
        const url = '/api/arbetsordrar?otilldeladeAktiva=true';
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Kunde inte hämta otilldelade aktiva jobb' }));
            throw new Error(errorData.error || 'Kunde inte hämta otilldelade aktiva jobb');
        }
        const data = await response.json();
        setOtilldeladeAktivaJobb(data.arbetsordrar || []);
    } catch (err: any) {
        console.error("Fel vid hämtning av otilldelade aktiva jobb:", err);
        setError(prevError => prevError || err.message || 'Ett fel uppstod vid hämtning av otilldelade aktiva jobb.');
    } finally {
      setLoadingOtilldeladeAktiva(false);
    }
  }, [isAdminOrArbetsledare]);

  useEffect(() => {
    if (session && session.user && session.user.id) {
      setError(null);
      fetchBokadeAktiviteter();
      fetchObokadeJobbTilldelade();
      if (isAdminOrArbetsledare) {
        fetchOtilldeladeAktivaJobb();
      }
    } else if (session === null) {
      setLoadingBokade(false);
      setLoadingObokadeMedAnsvarig(false);
      setLoadingOtilldeladeAktiva(false);
      setBokadeAktiviteter([]);
      setObokadeJobbMedAnsvarig([]);
      setOtilldeladeAktivaJobb([]);
    }
  }, [session, fetchBokadeAktiviteter, fetchObokadeJobbTilldelade, fetchOtilldeladeAktivaJobb, isAdminOrArbetsledare, onActivityHandled]);

  const handleArbetsorderStatusUpdate = async (arbetsorderId: number, nyStatus: ArbetsorderStatus, successMessage: string) => {
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

  const handleMarkKalenderEventAsHandled = async (kalenderEventId: number, arbetsorderIdForMsg: number | null) => {
    setHandlingEventId(kalenderEventId);
    const previousBokadeAktiviteter = [...bokadeAktiviteter];
    setBokadeAktiviteter(prev => prev.filter(akt => akt.id !== kalenderEventId));
    try {
      const response = await fetch(`/api/kalender/${kalenderEventId}/hantera`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json();
        setBokadeAktiviteter(previousBokadeAktiviteter);
        throw new Error(errorData.error || `Kunde inte markera mätningen som utförd.`);
      }
      toast.success(`Mätning ${arbetsorderIdForMsg ? `för AO #${arbetsorderIdForMsg} ` : ''}markerad som utförd.`);
      onActivityHandled();
    } catch (error: any) {
      toast.error(error.message);
      console.error("Fel vid markering av mätning som utförd:", error);
      const stillExists = bokadeAktiviteter.some(akt => akt.id === kalenderEventId);
      if (!stillExists) {
        setBokadeAktiviteter(previousBokadeAktiviteter);
      }
    } finally {
      setHandlingEventId(null);
    }
  };

  const handleBokaTidClick = (arbetsorderId: number, ansvarigId?: number | string | null) => {
    let ao: ObokadArbetsorderData | undefined;
    let ansvarigForAO: string | undefined;

    if (ansvarigId) {
        ansvarigForAO = ansvarigId.toString();
    } else {
        ao = obokadeJobbMedAnsvarig.find(o => o.id === arbetsorderId) || otilldeladeAktivaJobb.find(o => o.id === arbetsorderId);
        ansvarigForAO = ao?.ansvarigTeknikerId?.toString();
    }
    const ansvarigAttForifylla = ansvarigForAO || session?.user?.id?.toString();
    router.push(`/kalender?nyHandelseForAO=${arbetsorderId}${ansvarigAttForifylla ? `&ansvarig=${ansvarigAttForifylla}` : ''}`);
    toast.info("Förifyller ny kalenderhändelse...");
  };

  const isLoading = loadingBokade || loadingObokadeMedAnsvarig || loadingAnstallda || (isAdminOrArbetsledare && loadingOtilldeladeAktiva);
  const harIngaDataAttVisa = bokadeAktiviteter.length === 0 && obokadeJobbMedAnsvarig.length === 0 && (!isAdminOrArbetsledare || otilldeladeAktivaJobb.length === 0);
  const cardTitle = isAdminOrArbetsledare ? "Alla Aktiviteter & Jobb" : "Dina Aktiviteter & Jobb";

  if (isLoading && harIngaDataAttVisa) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center"><CalendarDays className="mr-2 h-5 w-5" /> {cardTitle}</CardTitle></CardHeader>
        <CardContent className="h-72 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /><p className="ml-2 text-muted-foreground">Laddar...</p>
        </CardContent>
      </Card>
    );
  }

  if (error && harIngaDataAttVisa) {
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
        {(harIngaDataAttVisa && !isLoading) ? (
          <p className="text-muted-foreground py-4 text-center">Du har inga kommande aktiviteter eller obokade jobb som matchar din roll/filter.</p>
        ) : (
          <ScrollArea className="h-[calc(24rem+10rem)]">
            <div className="space-y-4 pr-3">
              {/* 1. Bokade Aktiviteter */}
              {bokadeAktiviteter.map((akt) => {
                const arbetsorder = akt.arbetsorder;
                let actionButton = null;
                let displayTitle = arbetsorder
                                   ? getArbetsorderDisplayTitle(arbetsorder, akt.titel)
                                   : akt.titel || getMotesTypText(akt.motestyp);
                const canTakeAction = session?.user?.id === akt.ansvarigId.toString() || isAdminOrArbetsledare;

                if (arbetsorder && canTakeAction) {
                    if (arbetsorder.status === ArbetsorderStatus.MATNING) {
                        actionButton = ( <Button size="sm" variant="outline" className="w-full sm:w-auto border-blue-500 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-400 dark:text-blue-300 dark:hover:bg-blue-900/50 dark:hover:text-blue-200 whitespace-nowrap" onClick={() => handleMarkKalenderEventAsHandled(akt.id, arbetsorder.id)} disabled={handlingEventId === akt.id} > {handlingEventId === akt.id ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ClipboardCheck className="mr-1.5 h-4 w-4 flex-shrink-0" />} <span className="truncate">Mätning Utförd</span> </Button> );
                      } else if (arbetsorder.status === ArbetsorderStatus.AKTIV) {
                        actionButton = ( <Button size="sm" variant="outline" className="w-full sm:w-auto border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700 dark:border-green-400 dark:text-green-300 dark:hover:bg-green-900/50 dark:hover:text-green-200 whitespace-nowrap" onClick={() => handleArbetsorderStatusUpdate(arbetsorder.id, ArbetsorderStatus.SLUTFORD, `Arbetsorder #${arbetsorder.id} markerad som slutförd.`)} disabled={updatingStatusId === arbetsorder.id} > {updatingStatusId === arbetsorder.id ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4 flex-shrink-0" />} <span className="truncate">Slutför Order</span> </Button> );
                      }
                }

                return (
                  <div key={`kal-${akt.id}`} className="p-3 sm:p-4 border rounded-lg shadow-sm bg-card hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div className="flex-grow min-w-0">
                            <h4 className="font-semibold text-md mb-0.5 truncate">
                                {displayTitle}
                                {arbetsorder && ( <span className={`ml-2 text-xs font-normal px-1.5 py-0.5 rounded-full border whitespace-nowrap ${ arbetsorder.status === ArbetsorderStatus.MATNING ? 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-800/30 dark:text-orange-300 dark:border-orange-700' : arbetsorder.status === ArbetsorderStatus.OFFERT ? 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-800/30 dark:text-yellow-300 dark:border-yellow-700' : 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-800/30 dark:text-blue-300 dark:border-blue-700'}`}>{getArbetsorderStatusText(arbetsorder.status as ArbetsorderStatus)}</span> )}
                            </h4>
                            {isAdminOrArbetsledare && akt.ansvarig && session?.user?.id !== akt.ansvarigId.toString() && (
                                <p className="text-xs italic text-muted-foreground mb-1">(Ansvarig: {akt.ansvarig.fornamn} {akt.ansvarig.efternamn})</p>
                            )}
                            <p className="text-sm text-muted-foreground flex items-center flex-wrap"> <Clock className="mr-1.5 h-4 w-4 flex-shrink-0" /> {formatDateRange(akt.datumTid, akt.slutDatumTid)} </p>
                        </div>
                        {(arbetsorder || actionButton) && (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2 sm:mt-0 w-full sm:w-auto flex-shrink-0">
                            {arbetsorder && (
                            <Link href={`/arbetsordrar/${arbetsorder.id}`} passHref className="w-full sm:w-auto">
                                <Button size="sm" variant="outline" className="w-full sm:w-auto text-primary border-primary/50 hover:bg-primary/10 whitespace-nowrap">
                                Visa Order
                                </Button>
                            </Link>
                            )}
                            {actionButton}
                        </div>
                        )}
                    </div>
                    {akt.kund && ( <div className="mt-2 pt-2 border-t border-dashed dark:border-slate-700"> <p className="text-sm flex items-center mt-1"> <User className="mr-1.5 h-4 w-4 text-primary" /> <Link href={`/kunder/${akt.kund.id}`} className="hover:underline text-primary font-medium">{getKundNamn(akt.kund)}</Link> </p> {akt.kund.telefonnummer && ( <p className="text-xs text-muted-foreground flex items-center mt-1"><Phone className="mr-1.5 h-3 w-3" /> {akt.kund.telefonnummer}</p> )} {akt.kund.adress && ( <p className="text-xs text-muted-foreground flex items-center mt-1"><MapPin className="mr-1.5 h-3 w-3" /> {akt.kund.adress}</p> )} </div> )}
                    {akt.beskrivning && !arbetsorder && ( <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-dashed dark:border-slate-700 flex items-start"><Info className="mr-1.5 h-3 w-3 mt-0.5 flex-shrink-0" /> <span>{akt.beskrivning}</span></p> )}
                  </div>
                );
              })}

              {/* 2. Obokade Jobb MED Ansvarig */}
              {obokadeJobbMedAnsvarig.length > 0 && ( <div className="my-6 border-t pt-6"> <h4 className="text-sm font-medium text-muted-foreground mb-3 text-center"> {isAdminOrArbetsledare ? "Tilldelade Obokade Jobb" : "Dina Obokade Tilldelade Jobb"} </h4> </div> )}
              {obokadeJobbMedAnsvarig.map((ao) => (
                <div key={`obokad-tilldelad-${ao.id}`} className="p-3 sm:p-4 border rounded-lg shadow-sm bg-amber-50 dark:bg-amber-900/30 hover:shadow-md transition-shadow">
                   <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div className="flex-grow min-w-0">
                            <h4 className="font-semibold text-md mb-0.5 truncate">
                            {getArbetsorderDisplayTitle(ao)}
                            <span className={`ml-2 text-xs font-normal px-1.5 py-0.5 rounded-full border whitespace-nowrap ${ ao.status === ArbetsorderStatus.MATNING ? 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-800/30 dark:text-orange-300 dark:border-orange-700' : ao.status === ArbetsorderStatus.OFFERT ? 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-800/30 dark:text-yellow-300 dark:border-yellow-700' : 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-800/30 dark:text-blue-300 dark:border-blue-700'}`}>{getArbetsorderStatusText(ao.status)}</span>
                            </h4>
                            {isAdminOrArbetsledare && ao.ansvarigTeknikerId && ao.ansvarigTekniker && (
                                <p className="text-xs italic text-muted-foreground mb-1">
                                    (Tilldelad: { ao.ansvarigTekniker.fornamn } { ao.ansvarigTekniker.efternamn })
                                </p>
                            )}
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2 sm:mt-0 w-full sm:w-auto flex-shrink-0">
                            <Link href={`/arbetsordrar/${ao.id}`} passHref className="w-full sm:w-auto">
                                <Button size="sm" variant="outline" className="w-full sm:w-auto text-primary border-primary/50 hover:bg-primary/10 whitespace-nowrap">
                                Visa Order
                                </Button>
                            </Link>
                            <Button size="sm" variant="default" className="w-full sm:w-auto whitespace-nowrap" onClick={() => handleBokaTidClick(ao.id, ao.ansvarigTeknikerId)}>
                                <CalendarPlus className="mr-1.5 h-4 w-4 flex-shrink-0" /> <span className="truncate">Boka tid</span>
                            </Button>
                        </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-dashed dark:border-slate-700">
                        <p className="text-sm flex items-center mt-1"> <User className="mr-1.5 h-4 w-4 text-primary" /> <Link href={`/kunder/${ao.kund.id}`} className="hover:underline text-primary font-medium">{getKundNamn(ao.kund)}</Link> </p>
                        {ao.kund.telefonnummer && ( <p className="text-xs text-muted-foreground flex items-center mt-1"><Phone className="mr-1.5 h-3 w-3" /> {ao.kund.telefonnummer}</p> )}
                        {ao.kund.adress && ( <p className="text-xs text-muted-foreground flex items-center mt-1"><MapPin className="mr-1.5 h-3 w-3" /> {ao.kund.adress}</p> )}
                    </div>
                </div>
              ))}

              {/* 3. Otilldelade Aktiva Jobb (endast Admin/AL) */}
              {isAdminOrArbetsledare && otilldeladeAktivaJobb.length > 0 && ( <div className="my-6 border-t pt-6"> <h4 className="text-sm font-medium text-muted-foreground mb-3 text-center flex items-center justify-center"> <UserX className="mr-2 h-4 w-4 text-destructive" /> Otilldelade Aktiva Jobb </h4> </div> )}
              {isAdminOrArbetsledare && otilldeladeAktivaJobb.map((ao) => (
                <div key={`otilldelad-aktiv-${ao.id}`} className="p-3 sm:p-4 border rounded-lg shadow-sm bg-red-50 dark:bg-red-900/20 hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div className="flex-grow min-w-0">
                            <h4 className="font-semibold text-md mb-0.5 truncate">
                                {getArbetsorderDisplayTitle(ao)}
                                <span className={`ml-2 text-xs font-normal px-1.5 py-0.5 rounded-full border whitespace-nowrap bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-800/30 dark:text-blue-300 dark:border-blue-700`}>{getArbetsorderStatusText(ao.status)}</span>
                                <span className="ml-2 text-xs italic text-destructive/80">(Ingen ansvarig)</span>
                            </h4>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2 sm:mt-0 w-full sm:w-auto flex-shrink-0">
                            <Link href={`/arbetsordrar/${ao.id}`} passHref className="w-full sm:w-auto">
                            <Button size="sm" variant="outline" className="w-full sm:w-auto text-primary border-primary/50 hover:bg-primary/10 whitespace-nowrap">
                                Visa Order
                            </Button>
                            </Link>
                            <Button size="sm" variant="outline" className="w-full sm:w-auto border-destructive/50 text-destructive/90 hover:bg-destructive/10 hover:text-destructive whitespace-nowrap" onClick={() => router.push(`/arbetsordrar/${ao.id}/redigera`)}>
                               <UserX className="mr-1.5 h-4 w-4 flex-shrink-0" /> <span className="truncate">Tilldela Ansvarig</span>
                            </Button>
                            <Button size="sm" variant="default" className="w-full sm:w-auto whitespace-nowrap" onClick={() => handleBokaTidClick(ao.id, null)}>
                              <CalendarPlus className="mr-1.5 h-4 w-4 flex-shrink-0" /> <span className="truncate">Boka tid</span>
                            </Button>
                        </div>
                    </div>
                  <div className="mt-2 pt-2 border-t border-dashed dark:border-slate-700">
                    <p className="text-sm flex items-center mt-1"> <User className="mr-1.5 h-4 w-4 text-primary" /> <Link href={`/kunder/${ao.kund.id}`} className="hover:underline text-primary font-medium">{getKundNamn(ao.kund)}</Link> </p>
                    {ao.kund.telefonnummer && ( <p className="text-xs text-muted-foreground flex items-center mt-1"><Phone className="mr-1.5 h-3 w-3" /> {ao.kund.telefonnummer}</p> )}
                    {ao.kund.adress && ( <p className="text-xs text-muted-foreground flex items-center mt-1"><MapPin className="mr-1.5 h-3 w-3" /> {ao.kund.adress}</p> )}
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