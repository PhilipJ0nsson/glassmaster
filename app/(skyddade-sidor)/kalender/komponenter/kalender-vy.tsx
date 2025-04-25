'use client';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Loader2 } from 'lucide-react';
import { Locale } from 'date-fns';
import { KalenderEvent } from '../page';

interface KalenderVyProps {
  events: KalenderEvent[];
  loading: boolean;
  onDateClick: (date: Date) => void;
  onEventClick: (eventId: number) => void;
  locale: Locale;
  ansvarigFilter: number | null;
  buttonText: {
    today: string;
    month: string;
    week: string;
    day: string;
    list: string;
  };
}

export default function KalenderVy({
  events,
  loading,
  onDateClick,
  onEventClick,
  locale,
  ansvarigFilter,
  buttonText
}: KalenderVyProps) {
  
  const handleDateClick = (info: any) => {
    // Skapa en ny Date från datumet
    const clickedDate = new Date(info.date);
    onDateClick(clickedDate);
  };

  const handleEventClick = (info: any) => {
    // Anropa förälderns onEventClick callback med händelsens ID
    const eventId = parseInt(info.event.id);
    if (!isNaN(eventId)) {
      onEventClick(eventId);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>Laddar kalender...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 h-[700px]">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        events={events}
        locale={locale.code}
        buttonText={buttonText}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        nowIndicator={true}
        selectable={true}
        selectMirror={true}
        editable={false}
        dayMaxEvents={true}
        weekends={true}
        allDaySlot={true}
        slotMinTime="07:00:00"
        slotMaxTime="18:00:00"
        height="100%"
        expandRows={true}
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          meridiem: false
        }}
        eventDidMount={(info) => {
          // Skapa tooltips for hover
          const tooltip = document.createElement('div');
          tooltip.classList.add('event-tooltip');
          tooltip.style.position = 'absolute';
          tooltip.style.zIndex = '10000';
          tooltip.style.backgroundColor = 'white';
          tooltip.style.border = '1px solid #ddd';
          tooltip.style.borderRadius = '4px';
          tooltip.style.padding = '8px';
          tooltip.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
          tooltip.style.display = 'none';
          tooltip.style.maxWidth = '300px';
          
          // Skapa innehåll för tooltip
          const event = info.event;
          const props = event.extendedProps;
          
          let content = `<div class="font-bold mb-1">${event.title}</div>`;
          
          if (props.beskrivning) {
            content += `<div class="mb-1">${props.beskrivning}</div>`;
          }
          
          // Ta bort "Du är ansvarig/medarbetare" text (ej nödvändig eftersom det framgår från övrig information)
          
          content += `<div class="text-sm text-gray-500 mb-1">Ansvarig: ${props.ansvarig}</div>`;
          
          if (props.kund) {
            content += `<div class="text-sm text-gray-500 mb-1">Kund: ${props.kund}</div>`;
          }
          
          if (props.arbetsorderId) {
            content += `<div class="text-sm text-gray-500 mb-1">Arbetsorder: #${props.arbetsorderId}</div>`;
          }
          
          if (props.medarbetare && props.medarbetare.length > 0) {
            content += `<div class="text-sm text-gray-500 mb-1">Medarbetare: ${props.medarbetare.map((m: {id: number; namn: string}) => m.namn).join(', ')}</div>`;
          }
          
          tooltip.innerHTML = content;
          document.body.appendChild(tooltip);
          
          // Visa tooltip vid musöver
          info.el.addEventListener('mouseover', () => {
            const rect = info.el.getBoundingClientRect();
            tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
            tooltip.style.left = `${rect.left + window.scrollX}px`;
            tooltip.style.display = 'block';
          });
          
          // Dölj tooltip vid musut
          info.el.addEventListener('mouseout', () => {
            tooltip.style.display = 'none';
          });
          
          // Ta bort tooltip när händelsen avmonteras
          return () => {
            document.body.removeChild(tooltip);
          };
        }}
      />
    </div>
  );
}