// File: /Users/nav/Projects/glassmaestro/glassmaster/app/(skyddade-sidor)/kunder/komponenter/kund-dialog.tsx
'use client';

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { KundTyp, AnvandareRoll } from "@prisma/client"; 
import { useSession } from "next-auth/react";      
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, Trash } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { KundData } from "../page"; 


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
  id: z.number().optional(), 
  kundTyp: z.enum([KundTyp.PRIVAT, KundTyp.FORETAG]),
  telefonnummer: z.string().min(1, "Telefonnummer måste anges"),
  epost: z.string().email("Ogiltig e-postadress").optional().or(z.literal("")),
  adress: z.string().min(1, "Adress måste anges"),
  kommentarer: z.string().optional().or(z.literal("")),
});

const kundSchema = z.discriminatedUnion("kundTyp", [
  baseKundSchema.extend({
    kundTyp: z.literal(KundTyp.PRIVAT),
    ...privatpersonSchema.shape, // Slå ihop shape direkt här
  }),
  baseKundSchema.extend({
    kundTyp: z.literal(KundTyp.FORETAG),
    ...foretagSchema.shape, // Slå ihop shape direkt här
  }),
]);

type KundFormValues = z.infer<typeof kundSchema>;

// Definiera separata typer för varje del av discriminated union för enklare hantering
type PrivatKundFormValues = Extract<KundFormValues, { kundTyp: 'PRIVAT' }>;
type ForetagKundFormValues = Extract<KundFormValues, { kundTyp: 'FORETAG' }>;


interface KundDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onKundSaved: () => void;
  defaultValues?: Partial<KundFormValues> | KundData | null; 
  isEditing?: boolean;
}

export function KundDialog({
  isOpen,
  onOpenChange,
  onKundSaved,
  defaultValues,
  isEditing = false,
}: KundDialogProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const getInitialFormValues = (): KundFormValues => {
    const base = {
      id: undefined, // Nollställ id för nya kunder
      telefonnummer: "",
      epost: "",
      adress: "",
      kommentarer: "",
    };

    if (defaultValues && isEditing) {
        const dv = defaultValues as KundData; 
        if (dv.kundTyp === KundTyp.PRIVAT && dv.privatperson) {
            return {
                ...base,
                id: dv.id,
                kundTyp: dv.kundTyp,
                telefonnummer: dv.telefonnummer,
                epost: dv.epost || "",
                adress: dv.adress,
                kommentarer: dv.kommentarer || "",
                fornamn: dv.privatperson.fornamn,
                efternamn: dv.privatperson.efternamn,
                personnummer: dv.privatperson.personnummer || "",
            };
        } else if (dv.kundTyp === KundTyp.FORETAG && dv.foretag) {
            return {
                ...base,
                id: dv.id,
                kundTyp: dv.kundTyp,
                telefonnummer: dv.telefonnummer,
                epost: dv.epost || "",
                adress: dv.adress,
                kommentarer: dv.kommentarer || "",
                foretagsnamn: dv.foretag.foretagsnamn,
                organisationsnummer: dv.foretag.organisationsnummer || "",
                kontaktpersonFornamn: dv.foretag.kontaktpersonFornamn || "",
                kontaktpersonEfternamn: dv.foretag.kontaktpersonEfternamn || "",
                fakturaadress: dv.foretag.fakturaadress || "",
            };
        }
    }
    // Standard för ny kund (Privat)
    return {
      ...base,
      kundTyp: KundTyp.PRIVAT,
      fornamn: "",
      efternamn: "",
      personnummer: "",
    } as PrivatKundFormValues; // Type assertion för default
  };
  
  const form = useForm<KundFormValues>({
    resolver: zodResolver(kundSchema),
    defaultValues: getInitialFormValues(),
  });
  
  useEffect(() => {
    if (isOpen) {
      form.reset(getInitialFormValues());
    }
  }, [isOpen, defaultValues, isEditing]); // form är inte nödvändig som dependency här


  const kundTyp = form.watch("kundTyp");

  const onSubmit = async (data: KundFormValues) => {
    try {
      setLoading(true);
      const url = isEditing && data.id ? `/api/kunder/${data.id}` : "/api/kunder";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Något gick fel");
      }

      toast.success(isEditing ? "Kunden har uppdaterats" : "Kunden har sparats");
      onKundSaved();
    } catch (error: any) {
      console.error(`Fel vid ${isEditing ? 'uppdatering' : 'sparande'} av kund:`, error);
      toast.error(error.message || `Kunde inte ${isEditing ? 'uppdatera' : 'spara'} kunden`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing || !defaultValues || !('id' in defaultValues) || !defaultValues.id) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/kunder/${defaultValues.id}?permanent=true`, { // permanent=true förtydligar, även om API:et inte använder det
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Kunde inte radera kunden.');
      }
      toast.success('Kunden har raderats.');
      onKundSaved(); 
    } catch (error: any) {
      toast.error(error.message || 'Kunde inte radera kunden');
      console.error('Fel vid radering av kund:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };
  
  const canDelete = (session?.user?.role === AnvandareRoll.ADMIN || session?.user?.role === AnvandareRoll.ARBETSLEDARE) && isEditing;


  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle>{isEditing ? "Redigera kund" : "Lägg till ny kund"}</DialogTitle>
              <DialogDescription>
                {isEditing ? "Uppdatera kundens uppgifter." : "Fyll i information för den nya kunden."}
              </DialogDescription>
            </div>
            {canDelete && defaultValues && 'id' in defaultValues && ( // Se till att defaultValues har id
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={isDeleting}
                aria-label="Radera kund"
              >
                {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash className="h-5 w-5" />}
              </Button>
            )}
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="kundTyp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kundtyp</FormLabel>
                    <Select
                      onValueChange={(value: string) => {
                        const newKundTyp = value as KundTyp;
                        field.onChange(newKundTyp);
                        const currentValues = form.getValues();
                        
                        // Skapa en bas för återställning
                        const resetBase: Partial<KundFormValues> = {
                            id: currentValues.id,
                            telefonnummer: currentValues.telefonnummer,
                            epost: currentValues.epost,
                            adress: currentValues.adress,
                            kommentarer: currentValues.kommentarer,
                        };

                        if (newKundTyp === KundTyp.PRIVAT) {
                            form.reset({
                                ...resetBase,
                                kundTyp: KundTyp.PRIVAT,
                                fornamn: (currentValues as Partial<PrivatKundFormValues>).fornamn || "",
                                efternamn: (currentValues as Partial<PrivatKundFormValues>).efternamn || "",
                                personnummer: (currentValues as Partial<PrivatKundFormValues>).personnummer || "",
                            } as PrivatKundFormValues);
                        } else {
                            form.reset({
                                ...resetBase,
                                kundTyp: KundTyp.FORETAG,
                                foretagsnamn: (currentValues as Partial<ForetagKundFormValues>).foretagsnamn || "",
                                organisationsnummer: (currentValues as Partial<ForetagKundFormValues>).organisationsnummer || "",
                                kontaktpersonFornamn: (currentValues as Partial<ForetagKundFormValues>).kontaktpersonFornamn || "",
                                kontaktpersonEfternamn: (currentValues as Partial<ForetagKundFormValues>).kontaktpersonEfternamn || "",
                                fakturaadress: (currentValues as Partial<ForetagKundFormValues>).fakturaadress || "",
                            } as ForetagKundFormValues);
                        }
                      }}
                      value={field.value} 
                      disabled={isEditing} 
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
              <FormField
                control={form.control}
                name="epost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-post</FormLabel>
                    <FormControl>
                      <Input placeholder="E-post" type="email" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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

            {kundTyp === KundTyp.PRIVAT && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <h3 className="text-lg font-semibold col-span-full">
                  Uppgifter för privatperson
                </h3>
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
                <FormField
                  control={form.control}
                  name="personnummer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Personnummer</FormLabel>
                      <FormControl>
                        <Input placeholder="Personnummer" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {kundTyp === KundTyp.FORETAG && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <h3 className="text-lg font-semibold col-span-full">
                  Uppgifter för företag
                </h3>
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
                <FormField
                  control={form.control}
                  name="fakturaadress"
                  render={({ field }) => (
                    <FormItem className="col-span-full">
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
                disabled={loading || isDeleting}
              >
                Avbryt
              </Button>
              <Button type="submit" disabled={loading || isDeleting}>
                {loading ? "Sparar..." : (isEditing ? "Spara ändringar" : "Spara kund")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Är du säker?</AlertDialogTitle>
            <AlertDialogDescription>
              Vill du verkligen radera kunden <span className="font-semibold">
                {defaultValues && 'kundTyp' in defaultValues && defaultValues.kundTyp === KundTyp.PRIVAT && 'fornamn' in defaultValues && defaultValues.fornamn && 'efternamn' in defaultValues && defaultValues.efternamn ? `${defaultValues.fornamn} ${defaultValues.efternamn}` : 
                 defaultValues && 'kundTyp' in defaultValues && defaultValues.kundTyp === KundTyp.FORETAG && 'foretagsnamn' in defaultValues && defaultValues.foretagsnamn ? defaultValues.foretagsnamn : 
                 (defaultValues && 'id' in defaultValues && defaultValues.id ? `Kund #${defaultValues.id}`: 'denna kund')}
              </span>? Denna åtgärd kan inte ångras och raderar kunden permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/50"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Radera permanent"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}