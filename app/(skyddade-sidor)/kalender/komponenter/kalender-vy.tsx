// /app/(skyddade-sidor)/kalender/komponenter/kalender-vy.tsx
'use client';

import React, { useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import { CalendarApi } from '@fullcalendar/core';
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


  const handleDateClick = (info: any) => { /* ... */ const clickedDate = new Date(info.date); onDateClick(clickedDate); };
  const handleEventClick = (info: any) => { /* ... */ const eventId = parseInt(info.event.id); if (!isNaN(eventId)) { onEventClick(eventId); } };
  const handleEventDrop = async (dropInfo: any) => { /* ... */ const eventId = dropInfo.event.id; const newStart = dropInfo.event.start; const newEnd = dropInfo.event.end || newStart; const success = await onEventChange(eventId, newStart, newEnd); if (!success) { dropInfo.revert(); } };
  const handleEventResize = async (resizeInfo: any) => { /* ... */ const eventId = resizeInfo.event.id; const newStart = resizeInfo.event.start; const newEnd = resizeInfo.event.end; const success = await onEventChange(eventId, newStart, newEnd); if (!success) { resizeInfo.revert(); } };

  if (loading) { /* ... */ return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin mr-2" /><span>Laddar kalender...</span></div>; }

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
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        nowIndicator={true}
        selectable={true}
        selectMirror={true}
        editable={true} 
        eventDrop={handleEventDrop}     
        eventResize={handleEventResize} 
        dayMaxEvents={true}
        weekends={true}
        allDaySlot={true}
        slotMinTime="07:00:00"
        slotMaxTime="18:00:00"
        height="100%"
        expandRows={true}
        eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
      />
    </div>
  );
}