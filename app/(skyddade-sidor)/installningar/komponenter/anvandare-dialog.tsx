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
import { Loader2, Trash } from "lucide-react"; // Importera Trash
import { useSession } from "next-auth/react";   // Importera useSession
import { useEffect, useState } from "react";    // Importera useState
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // Importera AlertDialog

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
  const { data: session } = useSession(); // Hämta session
  const isEditing = !!anvandare;
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);


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
    if (open) { // Återställ endast om dialogen är öppen
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
    }
  }, [anvandare, form, open]);

  const onSubmit = async (data: AnvandareFormValues) => {
    try {
      // Ta bort lösenord om det är tomt vid redigering
      const payload = { ...data };
      if (isEditing && !payload.losenord) {
        delete payload.losenord;
      }

      // Skapa eller uppdatera användare
      const url = isEditing ? `/api/anvandare/${anvandare!.id}` : '/api/anvandare';
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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

  const handleDeleteUser = async () => {
    if (!isEditing || !anvandare) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/anvandare/${anvandare.id}?permanent=true`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Kunde inte radera användaren.');
      }
      toast.success('Användaren har raderats permanent.');
      onClose(true); // Close dialog and refresh list
    } catch (error: any) {
      toast.error(error.message);
      console.error('Fel vid radering av användare:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false); // Stäng bekräftelsedialogen oavsett resultat
    }
  };

  const isAdmin = session?.user?.role === AnvandareRoll.ADMIN;
  // Förhindra admin från att radera sig själv, och endast visa knappen om admin
  const canDelete = isAdmin && isEditing && anvandare?.id !== parseInt(session?.user?.id || "0");
  // Admin kan ändra roller för andra, men inte sin egen. Andra kan inte ändra roller.
  const canChangeRole = isAdmin && (!isEditing || (isEditing && anvandare?.id !== parseInt(session?.user?.id || "0")));

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) onClose(); // Anropa onClose när dialogen stängs
        else onOpenChange(isOpen);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex justify-between items-start"> {/* Flex container for title and trash icon */}
              <div>
                <DialogTitle>
                  {isEditing ? 'Redigera användare' : 'Skapa ny användare'}
                </DialogTitle>
                <DialogDescription>
                  {isEditing
                    ? 'Uppdatera användaruppgifter nedan.'
                    : 'Fyll i information för att skapa en ny användare.'}
                </DialogDescription>
              </div>
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive" // Specificera hover textfärg
                  disabled={isDeleting}
                  aria-label="Radera användare"
                >
                  {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash className="h-5 w-5" />}
                </Button>
              )}
            </div>
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
                      <Input {...field} placeholder="Telefonnummer" value={field.value || ''} />
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
                      value={field.value}
                      disabled={!canChangeRole && isEditing} // Kan endast ändras av admin för andra, eller vid skapande
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Välj roll" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {/* Admin kan sätta alla roller */}
                        {isAdmin && <SelectItem value={AnvandareRoll.ADMIN}>Administratör</SelectItem>}
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
                      {isEditing ? 'Nytt lösenord (lämna tomt för att behålla)' : 'Lösenord'}
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
                  onClick={() => onClose()} // Använd onClose direkt här
                  className="mt-4"
                  disabled={form.formState.isSubmitting || isDeleting}
                >
                  Avbryt
                </Button>
                <Button type="submit" className="mt-4" disabled={form.formState.isSubmitting || isDeleting}>
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

      {/* Confirmation Dialog for Deletion */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Är du säker?</AlertDialogTitle>
            <AlertDialogDescription>
              Vill du verkligen radera användaren <span className="font-semibold">{anvandare?.fornamn} {anvandare?.efternamn} ({anvandare?.anvandarnamn})</span> permanent?
              Denna åtgärd kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
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