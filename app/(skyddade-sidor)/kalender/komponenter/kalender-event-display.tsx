// /app/(skyddade-sidor)/kalender/komponenter/kalender-event-display.tsx
'use client';

import { Button } from "@/components/ui/button";
import { KalenderHandelse } from "../page"; 
import { MotesTyp, ArbetsorderStatus } from "@prisma/client";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
// Säkerställ att Mail och Tag är med här:
import { Calendar, Clock, User, Users, Briefcase, Info, Edit, Trash, Link as LinkIcon, MapPin, Building, UserCircle, Phone, Mail, Tag } from "lucide-react"; 
import Link from "next/link";

// ... (resten av koden är densamma som i föregående svar) ...

interface KalenderEventDisplayProps {
  event: KalenderHandelse;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const formatEventDateTime = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const formattedStartDate = format(startDate, "PPP", { locale: sv });
  const formattedStartTime = format(startDate, "HH:mm", { locale: sv });
  const formattedEndTime = format(endDate, "HH:mm", { locale: sv });

  if (format(startDate, "yyyy-MM-dd") === format(endDate, "yyyy-MM-dd")) {
    return `${formattedStartDate}, ${formattedStartTime} - ${formattedEndTime}`;
  }
  return `${formattedStartDate}, ${formattedStartTime} - ${format(endDate, "PPP HH:mm", { locale: sv })}`;
};

const getMotesTypText = (motestyp: MotesTyp) => {
  switch (motestyp) {
    case MotesTyp.ARBETSORDER: return "Arbetsorder";
    case MotesTyp.MOTE: return "Möte";
    case MotesTyp.SEMESTER: return "Semester";
    case MotesTyp.ANNAT: return "Annat";
    default: return "Okänd typ";
  }
};

const getArbetsorderStatusText = (status?: ArbetsorderStatus) => {
    if (!status) return "-";
    const map = { 
        [ArbetsorderStatus.OFFERT]: 'Offert', 
        [ArbetsorderStatus.AKTIV]: 'Aktiv', 
        [ArbetsorderStatus.SLUTFORD]: 'Slutförd', 
        [ArbetsorderStatus.FAKTURERAD]: 'Fakturerad', 
        [ArbetsorderStatus.AVBRUTEN]: 'Avbruten' 
    };
    return map[status] || status.toString();
};


export default function KalenderEventDisplay({ event, onEdit, onDelete, onClose }: KalenderEventDisplayProps) {
  
  const InfoRow = ({ icon: Icon, label, value, isLink = false, href }: { icon: React.ElementType, label: string, value?: string | React.ReactNode | null, isLink?: boolean, href?: string }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3 py-2">
        <Icon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          {isLink && href ? (
            <Link href={href} className="font-medium text-primary hover:underline break-words">
                {value}
            </Link>
          ) : (
            <p className="font-medium text-gray-800 dark:text-gray-100 break-words">{value}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-1 sm:p-2 space-y-5">
      <section className="space-y-3">
        <InfoRow icon={Calendar} label="Datum & Tid" value={formatEventDateTime(event.datumTid, event.slutDatumTid)} />
        <InfoRow icon={Info} label="Typ av händelse" value={getMotesTypText(event.motestyp)} />
        {event.beskrivning && <InfoRow icon={Info} label="Beskrivning" value={event.beskrivning} />}
        <InfoRow 
            icon={User} 
            label="Ansvarig" 
            value={event.ansvarig ? `${event.ansvarig.fornamn} ${event.ansvarig.efternamn}` : 'Okänd'} 
        />
        {event.medarbetare && event.medarbetare.length > 0 && (
          <InfoRow 
            icon={Users} 
            label="Övriga medarbetare" 
            value={event.medarbetare.map(m => `${m.anvandare.fornamn} ${m.anvandare.efternamn}`).join(', ')} 
          />
        )}
      </section>

      {(event.kund || event.arbetsorder) && (
        <hr className="my-4 border-gray-200 dark:border-gray-700" />
      )}

      {event.kund && (
        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 flex items-center">
            {event.kund.kundTyp === "PRIVAT" ? <UserCircle className="mr-2 h-4 w-4"/> : <Building className="mr-2 h-4 w-4"/>}
            Kundinformation
          </h4>
          <InfoRow 
            icon={User} 
            label="Namn" 
            value={event.kund.privatperson ? `${event.kund.privatperson.fornamn} ${event.kund.privatperson.efternamn}` : event.kund.foretag?.foretagsnamn}
            isLink
            href={`/kunder/${event.kund.id}`}
          />
          {event.kund.telefonnummer && <InfoRow icon={Phone} label="Telefon" value={event.kund.telefonnummer} isLink href={`tel:${event.kund.telefonnummer}`}/>}
          {event.kund.epost && <InfoRow icon={Mail} label="E-post" value={event.kund.epost} isLink href={`mailto:${event.kund.epost}`}/>}
          {event.kund.adress && <InfoRow icon={MapPin} label="Adress" value={event.kund.adress}/>}
        </section>
      )}

      {event.arbetsorder && (
        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 flex items-center">
            <Briefcase className="mr-2 h-4 w-4"/>
            Arbetsorderinformation
          </h4>
          <InfoRow 
            icon={LinkIcon} 
            label="Arbetsorder ID" 
            value={`#${event.arbetsorder.id}`}
            isLink
            href={`/arbetsordrar/${event.arbetsorder.id}`}
          />
          <InfoRow icon={Info} label="Status" value={getArbetsorderStatusText(event.arbetsorder.status as ArbetsorderStatus)} />
          {event.arbetsorder.referensMärkning && <InfoRow icon={Tag} label="Referens/Märkning" value={event.arbetsorder.referensMärkning} />}
        </section>
      )}

      <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
        <Button onClick={onEdit}>
          <Edit className="mr-2 h-4 w-4"/> Redigera händelse
        </Button>
      </div>
    </div>
  );
}