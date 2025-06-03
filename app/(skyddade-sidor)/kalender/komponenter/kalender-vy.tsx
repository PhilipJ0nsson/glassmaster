// /app/(skyddade-sidor)/kalender/komponenter/kalender-vy.tsx
'use client';

import React, { useRef, useEffect, ComponentProps } from 'react'; // Importera ComponentProps
import FullCalendar from '@fullcalendar/react';
// Ta bort DateClickArg från denna import om den orsakar felet
import { CalendarApi, DateSelectArg, EventClickArg } from '@fullcalendar/core'; 
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Loader2 } from 'lucide-react';
import { Locale } from 'date-fns';
import { KalenderEvent } from '../page'; 

// Inferera DateClickArg typen från FullCalendar component props
type FullCalendarDateClickCallback = ComponentProps<typeof FullCalendar>['dateClick'];
type InferredDateClickArg = FullCalendarDateClickCallback extends ((arg: infer A) => void) | undefined ? A : never;


interface KalenderVyProps {
  events: KalenderEvent[];
  loading: boolean;
  onDateClick: (date: Date, allDay: boolean) => void; 
  onSelectDates: (start: Date, end: Date, allDay: boolean) => void;
  onEventClick: (clickInfo: EventClickArg) => void; 
  onEventChange: (eventId: string, newStart: Date, newEnd: Date) => Promise<boolean>;
  onCalendarApiReady: (api: CalendarApi) => void;
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
  onSelectDates,
  onEventClick, 
  onEventChange,
  onCalendarApiReady,
  locale,
  ansvarigFilter,
  buttonText
}: KalenderVyProps) {
  
  const calendarComponentRef = useRef<FullCalendar>(null);

  useEffect(() => {
    if (calendarComponentRef.current) {
      const api = calendarComponentRef.current.getApi();
      onCalendarApiReady(api);
    }
  }, [onCalendarApiReady]);

  // Använd den infererade typen här
  const handleDateClickInternal = (clickInfo: InferredDateClickArg) => { 
    // Säkerställ att clickInfo inte är undefined (även om det är osannolikt här)
    if (!clickInfo) return;

    const clickedDate = new Date(clickInfo.date);
    onDateClick(clickedDate, clickInfo.allDay); 
  };

  const handleDatesSelectedInternal = (selectionInfo: DateSelectArg) => {
    onSelectDates(selectionInfo.start, selectionInfo.end, selectionInfo.allDay);
    if (calendarComponentRef.current) { 
        calendarComponentRef.current.getApi().unselect();
    }
  };

  const handleEventClickInternal = (clickInfo: EventClickArg) => {
    onEventClick(clickInfo); 
  };
  
  const handleEventDropInternal = async (dropInfo: any) => { 
    const eventId = dropInfo.event.id;
    const newStart = dropInfo.event.start;
    const newEnd = dropInfo.event.end || newStart; 
    const success = await onEventChange(eventId, newStart, newEnd);
    if (!success) {
      dropInfo.revert();
    }
  };
  
  const handleEventResizeInternal = async (resizeInfo: any) => { 
    const eventId = resizeInfo.event.id;
    const newStart = resizeInfo.event.start;
    const newEnd = resizeInfo.event.end;
    const success = await onEventChange(eventId, newStart, newEnd);
    if (!success) {
      resizeInfo.revert();
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin mr-2" /><span>Laddar kalender...</span></div>;
  }

  return (
    <div className="flex-1 h-[700px]">
      <FullCalendar
        ref={calendarComponentRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
        events={events}
        locale={locale.code}
        buttonText={buttonText}
        dateClick={handleDateClickInternal} 
        select={handleDatesSelectedInternal} 
        eventClick={handleEventClickInternal} 
        nowIndicator={true}
        selectable={true} 
        selectMirror={true}
        editable={true} 
        eventDrop={handleEventDropInternal}     
        eventResize={handleEventResizeInternal} 
        dayMaxEvents={true}
        weekends={true}
        allDaySlot={true}
        slotMinTime="07:00:00"
        slotMaxTime="18:00:00"
        height="100%"
        expandRows={true}
        eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
        selectOverlap={false} 
        longPressDelay={250} 
      />
    </div>
  );
}