// /app/(skyddade-sidor)/kalender/page.tsx
'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MotesTyp, ArbetsorderStatus } from '@prisma/client';
import { format as formatDateFn, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useEffect, useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import KalenderVy from "./komponenter/kalender-vy";
import KalenderPanelContent from "./komponenter/kalender-dialog"; 
import KalenderEventDisplay from "./komponenter/kalender-event-display";
import { CalendarApi } from '@fullcalendar/core';

export interface KalenderHandelse { 
  id: number;
  titel: string | null;
  beskrivning: string | null;
  datumTid: string; 
  slutDatumTid: string; 
  motestyp: MotesTyp;
  arbetsorderId: number | null;
  kundId: number | null;
  ansvarigId: number;
  kund?: { 
    id: number; 
    kundTyp: string; 
    telefonnummer: string;
    adress: string;     
    epost?: string | null; // Lade till epost här också
    privatperson?: { fornamn: string; efternamn: string; } | null; 
    foretag?: { foretagsnamn: string; } | null; 
  } | null;
  arbetsorder?: { 
    id: number; 
    status: string; 
    referensMärkning?: string | null; // Lade till för display
  } | null;
  ansvarig: { id: number; fornamn: string; efternamn: string; };
  medarbetare?: { anvandare: { id: number; fornamn: string; efternamn: string; } }[];
}
export interface KalenderEvent { 
  id: string; 
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  extendedProps: {
    originalEventId: number; 
    motestyp: MotesTyp;
    beskrivning: string | null;
    kund: string | null; // Säkerställ att denna typ matchar vad getKundNamn returnerar
    arbetsorderId: number | null;
    ansvarig: string; 
    ansvarigId: number;
    medarbetare: { id: number; namn: string; }[];
    currentUserIsResponsible: boolean;
  };
  backgroundColor: string; // Ska alltid vara en sträng
  borderColor: string;   // Ska alltid vara en sträng
  textColor?: string;
  borderStyle?: string;
}

export default function KalenderPage() {
  const [events, setEvents] = useState<KalenderEvent[]>([]);
  const [originalEventsData, setOriginalEventsData] = useState<KalenderHandelse[]>([]);
  const [loading, setLoading] = useState(true);
  const [ansvarigFilter, setAnsvarigFilter] = useState<number | null>(null);
  const [anstallda, setAnstallda] = useState<Array<{id: number; fornamn: string; efternamn: string;}>>([]);
  
  const [isKalenderDialogOpen, setIsKalenderDialogOpen] = useState(false);
  const [selectedEventForDialog, setSelectedEventForDialog] = useState<KalenderHandelse | null>(null);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit' | 'create'>('create');
  const [selectedInitialDate, setSelectedInitialDate] = useState<Date | null>(null);

  const calendarApiRef = useRef<CalendarApi | null>(null);

  useEffect(() => {
    fetchAnstallda();
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [ansvarigFilter]);

  const fetchAnstallda = async () => { try { const response = await fetch('/api/anvandare'); if (!response.ok) throw new Error('Kunde inte hämta anställda'); const data = await response.json(); setAnstallda(data.anvandare || []); } catch (error) { console.error(error); toast.error('Kunde inte hämta anställda'); } };
  
  // Korrigerad: getKundNamn returnerar string | null
  const getKundNamn = (kund: KalenderHandelse['kund']): string | null => { 
    if (!kund) return null; 
    if (kund.privatperson) return `${kund.privatperson.fornamn} ${kund.privatperson.efternamn}`; 
    if (kund.foretag) return kund.foretag.foretagsnamn; 
    return null; // Returnera null om inget namn kan hittas
  };

  // Korrigerad: getBackgroundColor returnerar alltid en string
  const getBackgroundColor = (motestyp: MotesTyp): string => { 
    switch (motestyp) { 
      case MotesTyp.ARBETSORDER: return '#3b82f6'; 
      case MotesTyp.MOTE: return '#10b981'; 
      case MotesTyp.SEMESTER: return '#f59e0b'; 
      case MotesTyp.ANNAT: return '#6b7280'; 
      default: return '#6b7280'; // Fallback-färg
    } 
  };

  const fetchEvents = async () => { 
    setLoading(true); 
    try { 
      let url = '/api/kalender'; 
      if (ansvarigFilter) {
        url += `?ansvarigId=${ansvarigFilter}`;
      }
      const response = await fetch(url); 
      if (!response.ok) throw new Error('Kunde inte hämta kalenderhändelser'); 
      const data: KalenderHandelse[] = await response.json(); 
      setOriginalEventsData(data); 
      
      const mappedEvents = data.map(handelse => { 
        const kundNamn = getKundNamn(handelse.kund); // Är nu string | null
        const datumTid = parseISO(handelse.datumTid); 
        const slutDatum = parseISO(handelse.slutDatumTid); 
        const medarbetare = handelse.medarbetare ? handelse.medarbetare.map(m => ({ id: m.anvandare.id, namn: `${m.anvandare.fornamn} ${m.anvandare.efternamn}` })) : []; 
        const currentUserIdAsNumber = ansvarigFilter ? Number(ansvarigFilter) : 0; 
        const isResponsible = currentUserIdAsNumber > 0 && handelse.ansvarigId === currentUserIdAsNumber; 
        const isMedarbetare = currentUserIdAsNumber > 0 && medarbetare.some(m => Number(m.id) === currentUserIdAsNumber); 
        
        let eventTitle = handelse.titel || ""; 
        if (!eventTitle) { 
          if (handelse.arbetsorderId) { 
            eventTitle = `Arbetsorder #${handelse.arbetsorderId}${kundNamn ? ` - ${kundNamn}` : ''}`; 
          } else if (handelse.motestyp === MotesTyp.MOTE && kundNamn) { // Hantera null för kundNamn
            eventTitle = `Möte - ${kundNamn}`; 
          } else if (handelse.motestyp === MotesTyp.MOTE) {
            eventTitle = 'Möte';
          } else { 
            eventTitle = handelse.motestyp.charAt(0) + handelse.motestyp.slice(1).toLowerCase(); 
          } 
        } 
        
        const bgColor = getBackgroundColor(handelse.motestyp); // Är nu alltid string

        return { 
          id: handelse.id.toString(), 
          title: eventTitle, 
          start: datumTid, 
          end: slutDatum, 
          extendedProps: { 
            originalEventId: handelse.id, 
            motestyp: handelse.motestyp, 
            beskrivning: handelse.beskrivning, 
            kund: kundNamn, // Detta är nu string | null, matchar KalenderEvent.extendedProps.kund
            arbetsorderId: handelse.arbetsorderId, 
            ansvarig: `${handelse.ansvarig.fornamn} ${handelse.ansvarig.efternamn}`, 
            ansvarigId: handelse.ansvarig.id, 
            medarbetare, 
            currentUserIsResponsible: isResponsible 
          }, 
          backgroundColor: bgColor, 
          borderColor: bgColor, // Använd samma färg för border
          textColor: 'white', 
          borderStyle: isMedarbetare && !isResponsible ? 'dashed' : 'solid', 
        }; 
      }); 
      setEvents(mappedEvents); 
    } catch (error) { 
      console.error(error); 
      toast.error('Kunde inte hämta kalenderhändelser'); 
    } finally { 
      setLoading(false); 
    } 
  };

  const handleEventChange = async (eventIdString: string, newStart: Date, newEnd: Date): Promise<boolean> => { 
    const eventIdNum = parseInt(eventIdString); 
    const originalEventData = originalEventsData.find(e => e.id === eventIdNum); 
    if (!originalEventData) { 
      toast.error("Kunde inte hitta originaldata."); 
      return false; 
    } 
    const payload = { 
      titel: originalEventData.titel, 
      datumTid: newStart.toISOString(), 
      slutDatumTid: newEnd.toISOString(), 
      motestyp: originalEventData.motestyp, 
      ansvarigId: originalEventData.ansvarigId, 
      kundId: originalEventData.kundId, 
      arbetsorderId: originalEventData.arbetsorderId, 
      beskrivning: originalEventData.beskrivning, 
      medarbetareIds: originalEventData.medarbetare ? originalEventData.medarbetare.map(m => m.anvandare.id) : [], 
    }; 
    try { 
      const response = await fetch(`/api/kalender/${eventIdNum}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload), 
      }); 
      if (!response.ok) { 
        const errorData = await response.json(); 
        toast.error(`Fel: ${errorData.error || 'Okänt fel'}`); 
        return false; 
      } 
      toast.success('Händelsen uppdaterad!'); 
      fetchEvents(); 
      return true; 
    } catch (error) { 
      toast.error('Nätverksfel.'); 
      console.error(error); 
      return false; 
    } 
  };

  const openDialogForNewEvent = (date: Date) => { 
    setSelectedInitialDate(date);
    setSelectedEventForDialog(null);
    setDialogMode('create');
    setIsKalenderDialogOpen(true);
  };

  const openDialogForViewEvent = (eventId: number) => { 
    const eventData = originalEventsData.find(e => e.id === eventId);
    if (eventData) {
      setSelectedEventForDialog(eventData);
      setSelectedInitialDate(parseISO(eventData.datumTid));
      setDialogMode('view');
      setIsKalenderDialogOpen(true);
    }
  };

  const switchToEditMode = () => {
    if (selectedEventForDialog) {
      setDialogMode('edit');
    }
  };
  
  const closeAndResetDialog = () => {
    setIsKalenderDialogOpen(false);
    setSelectedEventForDialog(null);
    setSelectedInitialDate(null);
  };

  const handleEventCreatedOrUpdated = () => { 
    fetchEvents(); 
    closeAndResetDialog();
  };

  const handleDeleteEvent = async () => {
    if (!selectedEventForDialog) return;
    // Bekräftelsedialog kan läggas till här om så önskas
    if (!confirm(`Är du säker på att du vill ta bort "${selectedEventForDialog.titel || 'denna händelse'}"?`)) {
        return;
    }
    try {
        const response = await fetch(`/api/kalender/${selectedEventForDialog.id}`, { method: "DELETE" });
        if (!response.ok) {
            const errorData = await response.json();
            toast.error(errorData.error || "Kunde inte ta bort händelsen.");
            throw new Error(errorData.error || "Kunde inte ta bort händelsen.");
        }
        toast.success("Händelsen borttagen");
        handleEventCreatedOrUpdated(); // Stänger dialog och uppdaterar listan
    } catch (error) {
        console.error("Fel vid borttagning av händelse:", error);
        // Toast visas redan i try-blocket om det är ett API-fel
    }
  };

  const handleCalendarApiReady = useCallback((api: CalendarApi) => {
    calendarApiRef.current = api;
  }, []);


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div> <h1 className="text-3xl font-bold tracking-tight mb-1">Kalender</h1> <p className="text-muted-foreground"> Planera arbetsordrar och möten </p> </div> <div className="flex gap-2"> <div className="relative"> <select className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 pr-8 h-9 text-sm" value={ansvarigFilter?.toString() || ""} onChange={(e) => setAnsvarigFilter(e.target.value ? parseInt(e.target.value) : null)} > <option value="">Alla tekniker</option> {anstallda.map((anstalld) => ( <option key={anstalld.id} value={anstalld.id.toString()}> {anstalld.fornamn} {anstalld.efternamn} </option> ))} </select> </div> </div>
      </div>
      <div className="bg-white rounded-md border p-4">
        <div className="flex mb-4 gap-4 flex-wrap"> <div className="flex items-center"> <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div> <span className="text-xs">Arbetsorder</span> </div> <div className="flex items-center"> <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></div> <span className="text-xs">Möte</span> </div> <div className="flex items-center"> <div className="w-3 h-3 rounded-full bg-amber-500 mr-2"></div> <span className="text-xs">Semester</span> </div> <div className="flex items-center"> <div className="w-3 h-3 rounded-full bg-gray-500 mr-2"></div> <span className="text-xs">Annat</span> </div> </div>
        <KalenderVy 
          events={events} 
          loading={loading} 
          onDateClick={openDialogForNewEvent}
          onEventClick={openDialogForViewEvent}
          onEventChange={handleEventChange}
          onCalendarApiReady={handleCalendarApiReady}
          locale={sv}
          ansvarigFilter={ansvarigFilter}
          buttonText={{ today: 'Idag', month: 'Månad', week: 'Vecka', day: 'Dag', list: 'Lista' }}
        />
      </div>

      <Dialog open={isKalenderDialogOpen} onOpenChange={(open) => {
        if (!open) closeAndResetDialog(); // Använd den nya funktionen för att stänga och återställa
        else setIsKalenderDialogOpen(open);
      }}>
        <DialogContent className="min-w-[clamp(300px,50vw,700px)] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>
              {dialogMode === 'create' && 'Lägg till kalenderhändelse'}
              {dialogMode === 'view' && (selectedEventForDialog?.titel || `Händelse #${selectedEventForDialog?.id}`)}
              {dialogMode === 'edit' && `Redigera: ${selectedEventForDialog?.titel || `Händelse #${selectedEventForDialog?.id}`}`}
            </DialogTitle>
            {dialogMode === 'view' && selectedEventForDialog?.beskrivning && (
                <DialogDescription className="pt-1">{selectedEventForDialog.beskrivning.substring(0,100)}{selectedEventForDialog.beskrivning.length > 100 ? "..." : ""}</DialogDescription>
            )}
          </DialogHeader>
          <div className="flex-grow overflow-y-auto p-4">
            {dialogMode === 'create' && (
              <KalenderPanelContent 
                initialDate={selectedInitialDate} 
                anstallda={anstallda} 
                onEventCreated={handleEventCreatedOrUpdated} 
                onPanelClose={closeAndResetDialog} 
                eventId={null} 
              />
            )}
            {dialogMode === 'edit' && selectedEventForDialog && (
              <KalenderPanelContent 
                initialDate={selectedInitialDate} 
                anstallda={anstallda} 
                onEventCreated={handleEventCreatedOrUpdated} 
                onPanelClose={() => setDialogMode('view')} 
                eventId={selectedEventForDialog.id} 
              />
            )}
            {dialogMode === 'view' && selectedEventForDialog && (
              <KalenderEventDisplay 
                event={selectedEventForDialog}
                onEdit={switchToEditMode}
                onDelete={handleDeleteEvent}
                onClose={closeAndResetDialog}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}