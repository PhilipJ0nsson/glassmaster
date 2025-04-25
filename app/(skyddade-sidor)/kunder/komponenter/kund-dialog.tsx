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
import { useState } from "react";
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
const kundSchema = z.discriminatedUnion("kundTyp", [
  // Schema för privatperson
  baseKundSchema.extend({
    kundTyp: z.literal(KundTyp.PRIVAT),
  }).extend(privatpersonSchema.shape),
  
  // Schema för företag
  baseKundSchema.extend({
    kundTyp: z.literal(KundTyp.FORETAG),
  }).extend(foretagSchema.shape),
]);

type KundFormValues = z.infer<typeof kundSchema>;

interface KundDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onKundSaved: () => void;
  defaultValues?: Partial<KundFormValues>;
}

export function KundDialog({
  isOpen,
  onOpenChange,
  onKundSaved,
  defaultValues,
}: KundDialogProps) {
  const [loading, setLoading] = useState(false);

  // Funktion för att skapa standardvärden baserat på kundtyp
  const getDefaultValues = (): Partial<KundFormValues> => {
    // Om vi har defaultValues, använd dem
    if (defaultValues) return defaultValues;
    
    // Utan defaultValues använder vi PRIVAT som standard
    const kundTyp = KundTyp.PRIVAT;
    
    // Gemensamma fält för alla kundtyper
    const baseValues = {
      kundTyp,
      telefonnummer: "",
      epost: "",
      adress: "",
      kommentarer: "",
    };
    
    // För PRIVAT (vår standard) returnera privatperson-fält
    return {
      ...baseValues,
      fornamn: "",
      efternamn: "",
      personnummer: "",
    };
  };
  
  // Standardvärden för formuläret
  const initialValues = getDefaultValues();

  const form = useForm<KundFormValues>({
    resolver: zodResolver(kundSchema),
    defaultValues: initialValues,
  });

  // Få aktuell kundtyp
  const kundTyp = form.watch("kundTyp");

  const onSubmit = async (data: KundFormValues) => {
    try {
      setLoading(true);
      const response = await fetch("/api/kunder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Något gick fel");
      }

      toast.success("Kunden har sparats");
      form.reset();
      onKundSaved();
    } catch (error) {
      console.error("Fel vid sparande av kund:", error);
      toast.error("Kunde inte spara kunden");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lägg till ny kund</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Kundtyp */}
              <FormField
                control={form.control}
                name="kundTyp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kundtyp</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Rensa relevanta fält när kundtyp ändras
                        if (value === KundTyp.PRIVAT) {
                          form.setValue("foretagsnamn", "");
                          form.setValue("organisationsnummer", "");
                          form.setValue("kontaktpersonFornamn", "");
                          form.setValue("kontaktpersonEfternamn", "");
                          form.setValue("fakturaadress", "");
                        } else {
                          form.setValue("fornamn", "");
                          form.setValue("efternamn", "");
                          form.setValue("personnummer", "");
                        }
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Välj kundtyp" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={KundTyp.PRIVAT}>
                          Privatperson
                        </SelectItem>
                        <SelectItem value={KundTyp.FORETAG}>Företag</SelectItem>
                      </SelectContent>
                    </Select>
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
            </div>

            {/* Fält för privatperson */}
            {kundTyp === KundTyp.PRIVAT && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <h3 className="text-lg font-semibold col-span-full">
                  Uppgifter för privatperson
                </h3>

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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <h3 className="text-lg font-semibold col-span-full">
                  Uppgifter för företag
                </h3>

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

              </div>
            )}

            {/* Kommentarer */}
            <FormField
              control={form.control}
              name="kommentarer"
              render={({ field }) => (
                <FormItem>
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

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Avbryt
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Sparar..." : "Spara kund"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}