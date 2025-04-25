'use client';

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
import { KundTyp } from "@prisma/client";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const privatpersonSchema = z.object({
  fornamn: z.string().min(1, "Förnamn måste anges"),
  efternamn: z.string().min(1, "Efternamn måste anges"),
  personnummer: z.string().optional(),
});

const foretagSchema = z.object({
  foretagsnamn: z.string().min(1, "Företagsnamn måste anges"),
  organisationsnummer: z.string().optional(),
  kontaktpersonFornamn: z.string().optional(),
  kontaktpersonEfternamn: z.string().optional(),
  fakturaadress: z.string().optional(),
});

const baseKundSchema = z.object({
  kundTyp: z.enum([KundTyp.PRIVAT, KundTyp.FORETAG]),
  telefonnummer: z.string().min(1, "Telefonnummer måste anges"),
  epost: z.string().email("Ogiltig e-postadress").optional().or(z.literal("")),
  adress: z.string().min(1, "Adress måste anges"),
  kommentarer: z.string().optional().or(z.literal("")),
});

// Dynamiskt schema baserat på kundtyp
const redigeraKundSchema = z.discriminatedUnion("kundTyp", [
  // Schema för privatperson
  baseKundSchema.extend({
    kundTyp: z.literal(KundTyp.PRIVAT),
  }).extend(privatpersonSchema.shape),
  
  // Schema för företag
  baseKundSchema.extend({
    kundTyp: z.literal(KundTyp.FORETAG),
  }).extend(foretagSchema.shape),
]);

type RedigeraKundFormValues = z.infer<typeof redigeraKundSchema>;

export default function RedigeraKundPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sparar, setSparar] = useState(false);

  // Skapa ett initialt formulärvärde baserat på kundtyp
  const getDefaultValues = (kundTyp: KundTyp) => {
    // Grundläggande fält som finns för båda typerna
    const baseValues = {
      kundTyp,
      telefonnummer: "",
      epost: "",
      adress: "",
      kommentarer: "",
    };

    // Lägg till specifika fält baserat på kundtyp
    if (kundTyp === KundTyp.PRIVAT) {
      return {
        ...baseValues,
        fornamn: "",
        efternamn: "",
        personnummer: "",
      };
    } else {
      return {
        ...baseValues,
        foretagsnamn: "",
        organisationsnummer: "",
        kontaktpersonFornamn: "",
        kontaktpersonEfternamn: "",
        fakturaadress: "",
      };
    }
  };

  const form = useForm<RedigeraKundFormValues>({
    resolver: zodResolver(redigeraKundSchema),
    // Börja med PRIVAT som standard, vi kommer att uppdatera detta när vi hämtar kunddatan
    defaultValues: getDefaultValues(KundTyp.PRIVAT)
  });

  // Få aktuell kundtyp
  const kundTyp = form.watch("kundTyp");

  useEffect(() => {
    const fetchKund = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/kunder/${params.id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            toast.error("Kunden hittades inte");
            router.push("/kunder");
            return;
          }
          throw new Error('Kunde inte hämta kund');
        }
        
        const data = await response.json();
        
        // Istället för att bygga ett enda objekt, sätt värdena direkt
        form.setValue("kundTyp", data.kundTyp);
        form.setValue("telefonnummer", data.telefonnummer);
        form.setValue("epost", data.epost || "");
        form.setValue("adress", data.adress);
        form.setValue("kommentarer", data.kommentarer || "");

        // Lägg till fält baserat på kundtyp
        if (data.kundTyp === KundTyp.PRIVAT && data.privatperson) {
          form.setValue("fornamn", data.privatperson.fornamn);
          form.setValue("efternamn", data.privatperson.efternamn);
          form.setValue("personnummer", data.privatperson.personnummer || "");
        } else if (data.kundTyp === KundTyp.FORETAG && data.foretag) {
          form.setValue("foretagsnamn", data.foretag.foretagsnamn);
          form.setValue("organisationsnummer", data.foretag.organisationsnummer || "");
          form.setValue("kontaktpersonFornamn", data.foretag.kontaktpersonFornamn || "");
          form.setValue("kontaktpersonEfternamn", data.foretag.kontaktpersonEfternamn || "");
          form.setValue("fakturaadress", data.foretag.fakturaadress || "");
        }

        // Ta bort denna loop eftersom vi nu sätter värdena direkt

      } catch (error) {
        console.error('Fel vid hämtning av kund:', error);
        toast.error('Kunde inte hämta kund');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchKund();
    }
  }, [params.id, router, form]);

  const onSubmit = async (data: RedigeraKundFormValues) => {
    try {
      setSparar(true);
      const response = await fetch(`/api/kunder/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Något gick fel");
      }

      toast.success("Kunden har uppdaterats");
      router.push(`/kunder/${params.id}`);
    } catch (error) {
      console.error("Fel vid uppdatering av kund:", error);
      toast.error("Kunde inte uppdatera kunden");
    } finally {
      setSparar(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <p>Laddar kunduppgifter...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center space-x-4">
        <Link href={`/kunder/${params.id}`}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Redigera kund</h1>
          <p className="text-muted-foreground">
            Uppdatera kundens uppgifter
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-white rounded-lg border">
            <h2 className="text-xl font-semibold col-span-full">Grundläggande information</h2>
            
            {/* Kundtyp (visas men kan inte ändras) */}
            <FormField
              control={form.control}
              name="kundTyp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kundtyp</FormLabel>
                  <FormControl>
                    <Input 
                      value={field.value === KundTyp.PRIVAT ? 'Privatperson' : 'Företag'} 
                      disabled 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Telefonnummer */}
            <FormField
              control={form.control}
              name="telefonnummer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefonnummer *</FormLabel>
                  <FormControl>
                    <Input placeholder="Telefonnummer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* E-post */}
            <FormField
              control={form.control}
              name="epost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-post</FormLabel>
                  <FormControl>
                    <Input placeholder="E-post" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Adress */}
            <FormField
              control={form.control}
              name="adress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adress *</FormLabel>
                  <FormControl>
                    <Input placeholder="Adress" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Kommentarer */}
            <FormField
              control={form.control}
              name="kommentarer"
              render={({ field }) => (
                <FormItem className="col-span-full">
                  <FormLabel>Kommentarer</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Kommentarer/Anteckningar"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Fält för privatperson */}
          {kundTyp === KundTyp.PRIVAT && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-white rounded-lg border">
              <h2 className="text-xl font-semibold col-span-full">
                Uppgifter för privatperson
              </h2>

              {/* Förnamn */}
              <FormField
                control={form.control}
                name="fornamn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Förnamn *</FormLabel>
                    <FormControl>
                      <Input placeholder="Förnamn" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Efternamn */}
              <FormField
                control={form.control}
                name="efternamn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Efternamn *</FormLabel>
                    <FormControl>
                      <Input placeholder="Efternamn" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Personnummer */}
              <FormField
                control={form.control}
                name="personnummer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Personnummer</FormLabel>
                    <FormControl>
                      <Input placeholder="Personnummer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Fält för företag */}
          {kundTyp === KundTyp.FORETAG && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-white rounded-lg border">
              <h2 className="text-xl font-semibold col-span-full">
                Uppgifter för företag
              </h2>

              {/* Företagsnamn */}
              <FormField
                control={form.control}
                name="foretagsnamn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Företagsnamn *</FormLabel>
                    <FormControl>
                      <Input placeholder="Företagsnamn" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Organisationsnummer */}
              <FormField
                control={form.control}
                name="organisationsnummer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organisationsnummer</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Organisationsnummer"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Kontaktperson förnamn */}
              <FormField
                control={form.control}
                name="kontaktpersonFornamn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kontaktperson förnamn</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Förnamn"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Kontaktperson efternamn */}
              <FormField
                control={form.control}
                name="kontaktpersonEfternamn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kontaktperson efternamn</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Efternamn"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Fakturaadress */}
              <FormField
                control={form.control}
                name="fakturaadress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fakturaadress</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Fakturaadress (om annan än besöksadress)"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* OBS: Referens/Märkning har flyttats till Arbetsorder */}
            </div>
          )}

          <div className="flex justify-end gap-4">
            <Link href={`/kunder/${params.id}`}>
              <Button type="button" variant="outline">
                Avbryt
              </Button>
            </Link>
            <Button type="submit" disabled={sparar}>
              {sparar ? "Sparar..." : "Spara ändringar"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}