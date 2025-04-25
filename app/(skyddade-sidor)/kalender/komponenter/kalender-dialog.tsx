'use client';

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { MotesTyp } from "@prisma/client";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const kalenderSchema = z.object({
  titel: z.string().optional(),
  beskrivning: z.string().optional(),
  datumTid: z.string().min(1, "Välj ett startdatum och tid"),
  slutDatumTid: z.string().min(1, "Välj ett slutdatum och tid"),
  motestyp: z.enum([
    MotesTyp.ARBETSORDER,
    MotesTyp.MOTE,
    MotesTyp.SEMESTER,
    MotesTyp.ANNAT,
  ]),
  ansvarigId: z.string().min(1, "Välj en ansvarig person"),
  kundId: z.string(),  // Accepterar "ingen" eller ett faktiskt ID
  arbetsorderId: z.string(),  // Accepterar "ingen" eller ett faktiskt ID
  medarbetareIds: z.array(z.string()).optional(), // Medarbetare (optional)
});

type KalenderFormValues = z.infer<typeof kalenderSchema>;

interface KalenderDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onEventCreated: () => void;
  date: Date | null;
  anstallda: Array<{
    id: number;
    fornamn: string;
    efternamn: string;
  }>;
  eventId?: number | null; // Ny prop för redigering
}

export default function KalenderDialog({
  isOpen,
  onOpenChange,
  onEventCreated,
  date,
  anstallda,
  eventId = null,
}: KalenderDialogProps) {
  const [loading, setLoading] = useState(false);
  const [kunder, setKunder] = useState<any[]>([]);
  const [arbetsordrar, setArbetsordrar] = useState<any[]>([]);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<KalenderFormValues>({
    resolver: zodResolver(kalenderSchema),
    defaultValues: {
      titel: "",
      beskrivning: "",
      datumTid: date
        ? format(date, "yyyy-MM-dd'T'HH:mm")
        : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      slutDatumTid: date
        ? format(date, "yyyy-MM-dd'T'HH:mm")
        : format(new Date(new Date().getTime() + 60*60*1000), "yyyy-MM-dd'T'HH:mm"), // Default end time: 1 hour later
      motestyp: MotesTyp.MOTE,
      ansvarigId: "",
      kundId: "ingen",
      arbetsorderId: "ingen",
      medarbetareIds: [],
    },
  });

  // Hämta aktuellt motestyp-värde från formuläret för villkorlig rendering
  const motestyp = form.watch("motestyp");

  useEffect(() => {
    if (isOpen && date && !eventId) {
      const startDateTime = format(date, "yyyy-MM-dd'T'HH:mm");
      form.setValue("datumTid", startDateTime);
      
      // Sätt slutdatum till samma datum men +1 timme
      const endDate = new Date(date);
      endDate.setHours(endDate.getHours() + 1);
      form.setValue("slutDatumTid", format(endDate, "yyyy-MM-dd'T'HH:mm"));
    }
  }, [isOpen, date, form, eventId]);

  useEffect(() => {
    if (isOpen) {
      fetchKunder();
      fetchArbetsordrar();
      
      // Om vi har ett eventId, hämta händelsen för redigering
      if (eventId) {
        fetchEvent(eventId);
      } else {
        // Återställ formuläret om vi inte redigerar
        form.reset({
          titel: "",
          beskrivning: "",
          datumTid: date
            ? format(date, "yyyy-MM-dd'T'HH:mm")
            : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
          slutDatumTid: date
            ? format(date, "yyyy-MM-dd'T'HH:mm")
            : format(new Date(new Date().getTime() + 60*60*1000), "yyyy-MM-dd'T'HH:mm"),
          motestyp: MotesTyp.MOTE,
          ansvarigId: "",
          kundId: "ingen",
          arbetsorderId: "ingen",
          medarbetareIds: [],
        });
      }
    }
  }, [isOpen, eventId, date, form]);

  const fetchEvent = async (id: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/kalender/${id}`);
      
      if (!response.ok) {
        throw new Error('Kunde inte hämta kalenderhändelse');
      }
      
      const event = await response.json();
      
      // Formatera datum och tid
      const startDateTime = format(new Date(event.datumTid), "yyyy-MM-dd'T'HH:mm");
      const endDateTime = format(new Date(event.slutDatumTid), "yyyy-MM-dd'T'HH:mm");
      
      // Extrahera medarbetare
      const medarbetareIds = event.medarbetare
        ? event.medarbetare.map((m: {anvandare: {id: number}}) => m.anvandare.id.toString())
        : [];
      
      // Uppdatera formuläret med händelsens data
      form.reset({
        titel: event.titel || "",
        beskrivning: event.beskrivning || "",
        datumTid: startDateTime,
        slutDatumTid: endDateTime,
        motestyp: event.motestyp,
        ansvarigId: event.ansvarigId.toString(),
        kundId: event.kundId ? event.kundId.toString() : "ingen",
        arbetsorderId: event.arbetsorderId ? event.arbetsorderId.toString() : "ingen",
        medarbetareIds,
      });
    } catch (error) {
      console.error('Fel vid hämtning av kalenderhändelse:', error);
      toast.error('Kunde inte hämta kalenderhändelsen');
    } finally {
      setLoading(false);
    }
  };

  const fetchKunder = async () => {
    try {
      const response = await fetch("/api/kunder");
      if (!response.ok) {
        throw new Error("Kunde inte hämta kunder");
      }
      const data = await response.json();
      setKunder(data.kunder);
    } catch (error) {
      console.error("Fel vid hämtning av kunder:", error);
      toast.error("Kunde inte hämta kunder");
    }
  };

  const fetchArbetsordrar = async () => {
    try {
      // Hämta bekräftade och pågående arbetsordrar med full kundinfo
      const response = await fetch("/api/arbetsordrar?status=BEKRAFTAD,PAGAENDE");
      if (!response.ok) {
        throw new Error("Kunde inte hämta arbetsordrar");
      }
      const data = await response.json();
      setArbetsordrar(data.arbetsordrar || []);
    } catch (error) {
      console.error("Fel vid hämtning av arbetsordrar:", error);
      // Ignorera fel eftersom arbetsordrar kanske inte är implementerade än
    }
  };

  const getKundNamn = (kund: any) => {
    if (kund.privatperson) {
      return `${kund.privatperson.fornamn} ${kund.privatperson.efternamn}`;
    } else if (kund.foretag) {
      return kund.foretag.foretagsnamn;
    }
    return "Okänd kund";
  };

  const onSubmit = async (data: KalenderFormValues) => {
    try {
      setLoading(true);

      // Konvertera medarbetare-ID till nummer
      const medarbetareIds = (data.medarbetareIds || [])
        .filter(id => id !== data.ansvarigId) // Exkludera ansvarigId från medarbetare
        .map(id => parseInt(id));
      
      const payload = {
        ...data,
        ansvarigId: parseInt(data.ansvarigId),
        kundId: data.kundId && data.kundId !== "ingen" ? parseInt(data.kundId) : null,
        arbetsorderId: data.arbetsorderId && data.arbetsorderId !== "ingen" ? parseInt(data.arbetsorderId) : null,
        medarbetareIds,
      };

      // Om vi har ett eventId, uppdatera händelsen, annars skapa en ny
      const url = eventId ? `/api/kalender/${eventId}` : "/api/kalender";
      const method = eventId ? "PUT" : "POST";

      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Något gick fel");
      }

      toast.success(eventId ? "Händelsen har uppdaterats" : "Händelsen har sparats");
      form.reset();
      onEventCreated();
    } catch (error: any) {
      console.error("Fel vid sparande av händelse:", error);
      toast.error(error.message || "Kunde inte spara händelsen");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!eventId) return;
    
    try {
      setDeleting(true);
      
      const response = await fetch(`/api/kalender/${eventId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Något gick fel");
      }
      
      toast.success("Händelsen har tagits bort");
      onEventCreated();
    } catch (error: any) {
      console.error("Fel vid borttagning av händelse:", error);
      toast.error(error.message || "Kunde inte ta bort händelsen");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{eventId ? "Redigera kalenderhändelse" : "Lägg till kalenderhändelse"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Typ av händelse */}
            <FormField
              control={form.control}
              name="motestyp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Typ av händelse *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Välj typ" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={MotesTyp.ARBETSORDER}>
                        Arbetsorder
                      </SelectItem>
                      <SelectItem value={MotesTyp.MOTE}>Möte</SelectItem>
                      <SelectItem value={MotesTyp.SEMESTER}>Semester</SelectItem>
                      <SelectItem value={MotesTyp.ANNAT}>Annat</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Titel - visas alltid */}
            <FormField
              control={form.control}
              name="titel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titel</FormLabel>
                  <FormControl>
                    <Input placeholder="Ange titel" {...field} />
                  </FormControl>
                  <FormDescription>
                    Frivilligt. Ange en tydlig titel för händelsen.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Beskrivning - visas alltid */}
            <FormField
              control={form.control}
              name="beskrivning"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beskrivning</FormLabel>
                  <FormControl>
                    <Input placeholder="Ange beskrivning" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Start datum och tid - visas alltid */}
            <FormField
              control={form.control}
              name="datumTid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Startdatum och tid *</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Slut datum och tid - visas alltid */}
            <FormField
              control={form.control}
              name="slutDatumTid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slutdatum och tid *</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormDescription>
                    För semester eller tidsintervall, välj när händelsen slutar
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Ansvarig - visas alltid */}
            <FormField
              control={form.control}
              name="ansvarigId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ansvarig *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Välj ansvarig" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {anstallda.map((anstalld) => (
                        <SelectItem
                          key={anstalld.id}
                          value={anstalld.id.toString()}
                        >
                          {anstalld.fornamn} {anstalld.efternamn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Medarbetare - visas alltid */}
            <FormField
              control={form.control}
              name="medarbetareIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medarbetare</FormLabel>
                  <div className="flex flex-wrap gap-2 border rounded-md p-2">
                    {anstallda
                      .filter(anstalld => anstalld.id.toString() !== form.getValues("ansvarigId"))
                      .map((anstalld) => (
                        <div key={anstalld.id} className="flex items-center">
                          <input 
                            type="checkbox" 
                            id={`medarbetare-${anstalld.id}`}
                            className="mr-1"
                            checked={field.value?.includes(anstalld.id.toString())}
                            onChange={(e) => {
                              const value = anstalld.id.toString();
                              const currentValues = field.value || [];
                              
                              if (e.target.checked) {
                                field.onChange([...currentValues, value]);
                              } else {
                                field.onChange(
                                  currentValues.filter(v => v !== value)
                                );
                              }
                            }}
                          />
                          <label htmlFor={`medarbetare-${anstalld.id}`} className="text-sm">
                            {anstalld.fornamn} {anstalld.efternamn}
                          </label>
                        </div>
                      ))}
                  </div>
                  <FormDescription>
                    Frivilligt. Välj eventuella medarbetare som ska delta.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Kund - visas bara om händelsen är arbetsorder eller möte */}
            {(motestyp === MotesTyp.ARBETSORDER || motestyp === MotesTyp.MOTE) && (
              <FormField
                control={form.control}
                name="kundId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kund</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Välj kund" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ingen">Ingen kund</SelectItem>
                        {kunder.map((kund) => (
                          <SelectItem key={kund.id} value={kund.id.toString()}>
                            {getKundNamn(kund)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Arbetsorder - visas bara om händelsen är en arbetsorder */}
            {motestyp === MotesTyp.ARBETSORDER && (
              <FormField
                control={form.control}
                name="arbetsorderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Arbetsorder</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        // När arbetsordern ändras, kontrollera om vi ska hämta kunden
                        if (value !== "ingen") {
                          const selectedArbetsorder = arbetsordrar.find(ao => ao.id.toString() === value);
                          if (selectedArbetsorder && selectedArbetsorder.kundId) {
                            form.setValue("kundId", selectedArbetsorder.kundId.toString());
                          }
                        }
                        field.onChange(value);
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Välj arbetsorder" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ingen">Ingen arbetsorder</SelectItem>
                        {arbetsordrar.map((ao) => (
                          <SelectItem key={ao.id} value={ao.id.toString()}>
                            #{ao.id} - {ao.beskrivning || "Arbetsorder"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Frivilligt. Koppla händelsen till en arbetsorder.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="pt-4 flex justify-between">
              <div className="flex gap-2">
                {eventId && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={loading || deleting}
                  >
                    {deleting ? "Tar bort..." : "Ta bort"}
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading || deleting}
                >
                  Avbryt
                </Button>
                <Button type="submit" disabled={loading || deleting}>
                  {loading ? "Sparar..." : "Spara"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}