'use client';

import { Button } from "@/components/ui/button";
import { MotesTyp } from '@prisma/client';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useEffect, useState } from "react";
import { toast } from "sonner";
import KalenderVy from "./komponenter/kalender-vy";
import KalenderDialog from "./komponenter/kalender-dialog";

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
    privatperson?: {
      fornamn: string;
      efternamn: string;
    } | null;
    foretag?: {
      foretagsnamn: string;
    } | null;
  } | null;
  arbetsorder?: {
    id: number;
    status: string;
  } | null;
  ansvarig: {
    id: number;
    fornamn: string;
    efternamn: string;
  };
  medarbetare?: {
    anvandare: {
      id: number;
      fornamn: string;
      efternamn: string;
    }
  }[];
}

export interface KalenderEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  extendedProps: {
    motestyp: MotesTyp;
    beskrivning: string | null;
    kund: string | null;
    arbetsorderId: number | null;
    ansvarig: string;
    ansvarigId: number;
    medarbetare: {
      id: number;
      namn: string;
    }[];
    currentUserIsResponsible: boolean; // Om inloggad användare är ansvarig
  };
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string; // Textfärg för att indikera ansvarig vs medarbetare
  borderStyle?: string; // Border-stil för att indikera ansvarig vs medarbetare
}

export default function KalenderPage() {
  const [events, setEvents] = useState<KalenderEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [datum, setDatum] = useState<Date | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [ansvarigFilter, setAnsvarigFilter] = useState<number | null>(null);
  const [anstallda, setAnstallda] = useState<any[]>([]);
  
  useEffect(() => {
    fetchAnstallda();
    fetchEvents();
  }, [ansvarigFilter]);

  const fetchAnstallda = async () => {
    try {
      const response = await fetch('/api/anvandare');
      if (!response.ok) {
        throw new Error('Kunde inte hämta anställda');
      }
      const data = await response.json();
      setAnstallda(data.anvandare);
    } catch (error) {
      console.error('Fel vid hämtning av anställda:', error);
      toast.error('Kunde inte hämta anställda');
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      let url = '/api/kalender';
      
      if (ansvarigFilter) {
        url += `?ansvarigId=${ansvarigFilter}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Kunde inte hämta kalenderhändelser');
      }
      
      const data: KalenderHandelse[] = await response.json();
      
      // Konvertera till FullCalendar events
      const mappedEvents = data.map(handelse => {
        const kundNamn = getKundNamn(handelse.kund);
        const datumTid = new Date(handelse.datumTid);
        const slutDatum = new Date(handelse.slutDatumTid);
        
        const backgroundColor = getBackgroundColor(handelse.motestyp);
        
        // Extrahera medarbetare om de finns
        const medarbetare = handelse.medarbetare 
          ? handelse.medarbetare.map(m => ({
              id: m.anvandare.id,
              namn: `${m.anvandare.fornamn} ${m.anvandare.efternamn}`
            }))
          : [];
          
        // Kolla om inloggad/vald användare är ansvarig eller medarbetare
        const currentUserIdAsNumber = ansvarigFilter ? Number(ansvarigFilter) : 0;
        const isResponsible = currentUserIdAsNumber > 0 ? 
            handelse.ansvarigId === currentUserIdAsNumber : false;
        
        const isMedarbetare = currentUserIdAsNumber > 0 && medarbetare.length > 0 ? 
            medarbetare.some(m => Number(m.id) === currentUserIdAsNumber) : false;
        
        // Använd olika stil för ansvarig vs medarbetare, men håll texten läsbar
        // Vi använder en lätt border istället för textfärg för att indikera medarbetare
        const textColor = 'inherit'; // Alla texter ska vara läsbara
        const borderStyle = isMedarbetare && !isResponsible ? 'dashed' : 'solid';
        
        return {
          id: handelse.id.toString(),
          title: handelse.titel || 
                 (handelse.arbetsorderId 
                  ? `Arbetsorder #${handelse.arbetsorderId}${kundNamn ? ` - ${kundNamn}` : ''}` 
                  : (handelse.motestyp === MotesTyp.MOTE 
                     ? `Möte${kundNamn ? ` - ${kundNamn}` : ''}` 
                     : handelse.motestyp)),
          start: datumTid,
          end: slutDatum,
          extendedProps: {
            motestyp: handelse.motestyp,
            beskrivning: handelse.beskrivning,
            kund: kundNamn,
            arbetsorderId: handelse.arbetsorderId,
            ansvarig: `${handelse.ansvarig.fornamn} ${handelse.ansvarig.efternamn}`,
            ansvarigId: handelse.ansvarig.id,
            medarbetare,
            currentUserIsResponsible: isResponsible
          },
          backgroundColor,
          borderColor: backgroundColor,
          textColor,
          borderStyle
        };
      });
      
      setEvents(mappedEvents);
    } catch (error) {
      console.error('Fel vid hämtning av kalenderhändelser:', error);
      toast.error('Kunde inte hämta kalenderhändelser');
    } finally {
      setLoading(false);
    }
  };

  const getKundNamn = (kund: KalenderHandelse['kund']) => {
    if (!kund) return null;
    
    if (kund.privatperson) {
      return `${kund.privatperson.fornamn} ${kund.privatperson.efternamn}`;
    } else if (kund.foretag) {
      return kund.foretag.foretagsnamn;
    }
    
    return null;
  };

  const getBackgroundColor = (motestyp: MotesTyp) => {
    switch (motestyp) {
      case MotesTyp.ARBETSORDER:
        return '#3b82f6'; // blue-500
      case MotesTyp.MOTE:
        return '#10b981'; // emerald-500
      case MotesTyp.SEMESTER:
        return '#f59e0b'; // amber-500
      case MotesTyp.ANNAT:
        return '#6b7280'; // gray-500
      default:
        return '#6b7280'; // gray-500
    }
  };

  const handleDateClick = (date: Date) => {
    setDatum(date);
    setSelectedEventId(null);
    setIsDialogOpen(true);
  };

  const handleEventClick = (eventId: number) => {
    setSelectedEventId(eventId);
    setIsDialogOpen(true);
  };

  const handleEventCreated = () => {
    fetchEvents();
    setIsDialogOpen(false);
    setSelectedEventId(null);
  };

  const handleAnsvarigFilterChange = (id: number | null) => {
    setAnsvarigFilter(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Kalender</h1>
          <p className="text-muted-foreground">
            Planera arbetsordrar och möten
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <select 
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 pr-8"
              value={ansvarigFilter?.toString() || ""}
              onChange={(e) => handleAnsvarigFilterChange(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">Alla tekniker</option>
              {anstallda.map((anstalld) => (
                <option key={anstalld.id} value={anstalld.id}>
                  {anstalld.fornamn} {anstalld.efternamn}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-md border p-4">
        <div className="flex mb-4 gap-4 flex-wrap">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
            <span>Arbetsorder</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></div>
            <span>Möte</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-amber-500 mr-2"></div>
            <span>Semester</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-gray-500 mr-2"></div>
            <span>Annat</span>
          </div>
        </div>
        
        <KalenderVy 
          events={events} 
          loading={loading} 
          onDateClick={handleDateClick}
          onEventClick={handleEventClick}
          locale={sv}
          ansvarigFilter={ansvarigFilter}
          buttonText={{
            today: 'Idag',
            month: 'Månad',
            week: 'Vecka',
            day: 'Dag',
            list: 'Lista'
          }}
        />
      </div>
      
      <KalenderDialog 
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onEventCreated={handleEventCreated}
        date={datum}
        anstallda={anstallda}
        eventId={selectedEventId}
      />
    </div>
  );
}