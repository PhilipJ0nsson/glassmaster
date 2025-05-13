// File: /Users/nav/Projects/glassmaestro/glassmaster/app/(skyddade-sidor)/prislista/komponenter/pris-dialog.tsx
'use client';

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription, // Importera DialogDescription
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
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { PrislistaData } from "../page";
import { Loader2, Trash } from "lucide-react"; // Importera Loader2 och Trash
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

const prisSchema = z.object({
  namn: z.string().min(1, "Namn måste anges"),
  prisExklMoms: z
    .string()
    .min(1, "Pris måste anges")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
      message: "Pris måste vara ett positivt nummer",
    }),
  momssats: z
    .string()
    .min(1, "Momssats måste anges")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
      message: "Momssats måste vara ett positivt nummer",
    }),
  prissattningTyp: z.enum(['ST', 'M', 'M2', 'TIM']).default('ST'),
  kategori: z.string().optional(),
  artikelnummer: z.string().optional(),
});

type PrisFormValues = z.infer<typeof prisSchema>;

interface PrisDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onPrisSaved: () => void;
  defaultValues?: PrislistaData; // Gör optional för att hantera både create och edit
  isEditing?: boolean;
}

export default function PrisDialog({
  isOpen,
  onOpenChange,
  onPrisSaved,
  defaultValues,
  isEditing = false,
}: PrisDialogProps) {
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false); // För radering
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // För bekräftelsedialog
  const [prisInklMoms, setPrisInklMoms] = useState<string>("");

  const initialValues: PrisFormValues = {
    namn: "",
    prisExklMoms: "",
    momssats: "25",
    prissattningTyp: "ST",
    kategori: "",
    artikelnummer: "",
  };

  const form = useForm<PrisFormValues>({
    resolver: zodResolver(prisSchema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    if (isOpen) { // Återställ endast om dialogen är öppen
        if (defaultValues && isEditing) {
            form.reset({
                namn: defaultValues.namn,
                prisExklMoms: defaultValues.prisExklMoms.toString(),
                momssats: defaultValues.momssats.toString(),
                prissattningTyp: defaultValues.prissattningTyp || "ST",
                kategori: defaultValues.kategori || "",
                artikelnummer: defaultValues.artikelnummer || "",
            });
        } else {
            form.reset(initialValues); // Reset till initialValues om det är ny post eller ingen defaultValues
        }
    }
  }, [defaultValues, isOpen, form, isEditing]);

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (
        (name === "prisExklMoms" || name === "momssats" || name === undefined) &&
        value.prisExklMoms &&
        value.momssats
      ) {
        const prisExkl = parseFloat(value.prisExklMoms as string);
        const momssats = parseFloat(value.momssats as string);

        if (!isNaN(prisExkl) && !isNaN(momssats)) {
          const prisInkl = prisExkl * (1 + momssats / 100);
          setPrisInklMoms(prisInkl.toFixed(2));
        } else {
          setPrisInklMoms("");
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  const onSubmit = async (data: PrisFormValues) => {
    try {
      setLoading(true);
      
      const payload = {
        ...data,
        // Konvertera till nummer här om det behövs av API:et
        prisExklMoms: parseFloat(data.prisExklMoms),
        momssats: parseFloat(data.momssats),
      };

      const url = isEditing && defaultValues 
        ? `/api/prislista/${defaultValues.id}` 
        : '/api/prislista';
      
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Något gick fel");
      }

      toast.success(
        isEditing 
          ? "Prisposten har uppdaterats" 
          : "Ny prispost har sparats"
      );
      
      onPrisSaved(); // Anropa onPrisSaved för att stänga dialog och uppdatera listan
    } catch (error: any) {
      console.error("Fel vid sparande av prispost:", error);
      toast.error(error.message || "Kunde inte spara prisposten");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing || !defaultValues) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/prislista/${defaultValues.id}?permanent=true`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Kunde inte radera prisposten.');
      }
      toast.success('Prisposten har raderats.');
      onPrisSaved(); // Close dialog and refresh list
    } catch (error: any) {
      toast.error(error.message || 'Kunde inte radera prisposten');
      console.error('Fel vid radering av prispost:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle>
                {isEditing ? "Redigera prispost" : "Lägg till ny prispost"}
              </DialogTitle>
              <DialogDescription>
                {isEditing ? "Uppdatera prisuppgifter nedan." : "Fyll i information för den nya prisposten."}
              </DialogDescription>
            </div>
            {isEditing && defaultValues && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={isDeleting}
                aria-label="Radera prispost"
              >
                {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash className="h-5 w-5" />}
              </Button>
            )}
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="namn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Namn på vara/tjänst *</FormLabel>
                  <FormControl>
                    <Input placeholder="T.ex. Glasruta 60x80" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="prisExklMoms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pris (exkl. moms) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="momssats"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Momssats (%) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="25"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="prissattningTyp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prissättningstyp *</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value} // Använd value istället för defaultValue för kontrollerad komponent
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Välj prissättningstyp" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ST">Styckpris</SelectItem>
                      <SelectItem value="M">Meterpris</SelectItem>
                      <SelectItem value="M2">Kvadratmeterpris</SelectItem>
                      <SelectItem value="TIM">Timpris</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>
              <FormLabel>Pris (inkl. moms)</FormLabel>
              <Input
                type="text"
                value={prisInklMoms ? `${prisInklMoms} kr` : ""}
                readOnly
                disabled
                className="bg-gray-100"
              />
            </div>
            <FormField
              control={form.control}
              name="kategori"
              render={({ field }) => {
                const [isCustomCategory, setIsCustomCategory] = useState(false);
                const [availableKategorier, setAvailableKategorier] = useState<string[]>([]);
                const [loadingKategorier, setLoadingKategorier] = useState(false);
                
                useEffect(() => {
                  const fetchKategorier = async () => {
                    setLoadingKategorier(true);
                    try {
                      const response = await fetch('/api/prislista?pageSize=0'); // Hämta alla för kategorilista
                      if (!response.ok) throw new Error("Kunde inte hämta kategorier");
                      const data = await response.json();
                      setAvailableKategorier(data.kategorier || []);
                      
                      if (field.value && !data.kategorier.includes(field.value) && field.value !== '__NONE__') {
                        setIsCustomCategory(true);
                      } else {
                        setIsCustomCategory(false);
                      }
                    } catch (error) {
                      console.error('Fel vid hämtning av kategorier:', error);
                    } finally {
                      setLoadingKategorier(false);
                    }
                  };
                  
                  if(isOpen) fetchKategorier(); // Hämta bara när dialogen är öppen
                }, [isOpen, field.value]); // Kör om när field.value ändras för att hantera extern återställning
                
                return (
                  <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    {!isCustomCategory ? (
                        <Select 
                          onValueChange={(value) => {
                            if (value === '__NEW__') {
                              setIsCustomCategory(true);
                              field.onChange(''); // Rensa fältet för ny kategori
                            } else if (value === '__NONE__') {
                              field.onChange(''); // Sätt till tom sträng för "Ingen kategori"
                            } else {
                              field.onChange(value);
                            }
                          }}
                          value={field.value || '__NONE__'} // Sätt __NONE__ om värdet är tomt
                          disabled={loadingKategorier}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Välj kategori" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {loadingKategorier ? (
                              <div className="p-2 text-center">Laddar kategorier...</div>
                            ) : (
                              <>
                                <SelectItem value="__NONE__">Ingen kategori</SelectItem>
                                {availableKategorier.map((kategori) => (
                                  <SelectItem key={kategori} value={kategori}>
                                    {kategori}
                                  </SelectItem>
                                ))}
                                <SelectItem value="__NEW__">+ Lägg till ny kategori</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                    ) : (
                      <div className="flex space-x-2">
                        <FormControl>
                          <Input
                            placeholder="Ange ny kategori"
                            {...field}
                            value={field.value || ""} // Säkerställ att värdet inte är null/undefined
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsCustomCategory(false);
                            field.onChange(''); // Rensa fältet när man avbryter
                          }}
                        >
                          Avbryt
                        </Button>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <FormField
              control={form.control}
              name="artikelnummer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Artikelnummer</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="T.ex. GR-6080"
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
                onClick={() => onOpenChange(false)} // Anropa onOpenChange för att stänga
                disabled={loading || isDeleting}
              >
                Avbryt
              </Button>
              <Button type="submit" disabled={loading || isDeleting}>
                {loading
                  ? "Sparar..."
                  : isEditing
                  ? "Spara ändringar"
                  : "Spara prispost"}
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
              Vill du verkligen radera prisposten <span className="font-semibold">{defaultValues?.namn}</span>?
              Denna åtgärd kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/50"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Radera"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}