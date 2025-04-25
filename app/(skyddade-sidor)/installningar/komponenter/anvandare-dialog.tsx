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
import { AnvandareRoll } from "@prisma/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

interface AnvandareData {
  id: number;
  fornamn: string;
  efternamn: string;
  epost: string;
  telefonnummer: string | null;
  roll: AnvandareRoll;
  aktiv: boolean;
  anvandarnamn: string;
  skapadDatum: string;
  uppdateradDatum: string;
}

interface AnvandareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anvandare: AnvandareData | null;
  onClose: (refresh?: boolean) => void;
}

const anvandareSchema = z.object({
  fornamn: z.string().min(1, { message: "Förnamn är obligatoriskt" }),
  efternamn: z.string().min(1, { message: "Efternamn är obligatoriskt" }),
  epost: z.string().email({ message: "Ogiltig e-postadress" }),
  telefonnummer: z.string().optional(),
  roll: z.nativeEnum(AnvandareRoll),
  anvandarnamn: z.string().min(3, { message: "Användarnamn måste vara minst 3 tecken" }),
  losenord: z.string().optional(),
});

type AnvandareFormValues = z.infer<typeof anvandareSchema>;

export default function AnvandareDialog({
  open,
  onOpenChange,
  anvandare,
  onClose,
}: AnvandareDialogProps) {
  const isEditing = !!anvandare;

  // Definera validering baserat på om det är redigering eller ny användare
  const schema = isEditing
    ? anvandareSchema // Vid redigering är lösenord valfritt
    : anvandareSchema.extend({
        losenord: z.string().min(6, { message: "Lösenord måste vara minst 6 tecken" }),
      });

  const form = useForm<AnvandareFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fornamn: "",
      efternamn: "",
      epost: "",
      telefonnummer: "",
      roll: AnvandareRoll.TEKNIKER,
      anvandarnamn: "",
      losenord: "",
    },
  });

  // Uppdatera formuläret när användaren ändras
  useEffect(() => {
    if (anvandare) {
      const { fornamn, efternamn, epost, telefonnummer, roll, anvandarnamn } = anvandare;
      form.reset({
        fornamn,
        efternamn,
        epost,
        telefonnummer: telefonnummer || "",
        roll,
        anvandarnamn,
        losenord: "", // Återställ lösenordet vid redigering
      });
    } else {
      form.reset({
        fornamn: "",
        efternamn: "",
        epost: "",
        telefonnummer: "",
        roll: AnvandareRoll.TEKNIKER,
        anvandarnamn: "",
        losenord: "",
      });
    }
  }, [anvandare, form]);

  const onSubmit = async (data: AnvandareFormValues) => {
    try {
      // Ta bort lösenord om det är tomt vid redigering
      if (isEditing && !data.losenord) {
        delete data.losenord;
      }

      // Skapa eller uppdatera användare
      const url = isEditing ? `/api/anvandare/${anvandare.id}` : '/api/anvandare';
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Något gick fel');
      }
      
      toast.success(
        isEditing ? 'Användaren har uppdaterats' : 'Ny användare har skapats'
      );
      
      onClose(true); // Stäng dialogen och uppdatera användarlistan
    } catch (error: any) {
      toast.error(error.message || 'Något gick fel');
      console.error('Fel vid hantering av användare:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Redigera användare' : 'Skapa ny användare'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Uppdatera användaruppgifter nedan.'
              : 'Fyll i information för att skapa en ny användare.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fornamn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Förnamn</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Förnamn" />
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
                    <FormLabel>Efternamn</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Efternamn" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="epost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-post</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="E-post" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="telefonnummer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefonnummer</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Telefonnummer" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="roll"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Roll</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Välj roll" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={AnvandareRoll.ADMIN}>Administratör</SelectItem>
                      <SelectItem value={AnvandareRoll.ARBETSLEDARE}>Arbetsledare</SelectItem>
                      <SelectItem value={AnvandareRoll.TEKNIKER}>Tekniker</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="anvandarnamn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Användarnamn</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Användarnamn" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="losenord"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {isEditing ? 'Lösenord (lämna tomt för att behålla befintligt)' : 'Lösenord'}
                  </FormLabel>
                  <FormControl>
                    <Input {...field} type="password" placeholder="Lösenord" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onClose()}
                className="mt-4"
              >
                Avbryt
              </Button>
              <Button type="submit" className="mt-4" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sparar...
                  </>
                ) : (
                  isEditing ? 'Spara ändringar' : 'Skapa användare'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}